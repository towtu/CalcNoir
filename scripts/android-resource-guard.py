#!/usr/bin/env python3
"""Run a local Android job in a bounded user scope; never fall back unbounded."""
import fcntl
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import time
import uuid


PROJECT_ROOT = Path(__file__).resolve().parent.parent
LOCK_PATH = PROJECT_ROOT / '.cache/android-resource.lock'
REPORT_PATH = PROJECT_ROOT / '.cache/android-resource-last.json'
RAM_LIMIT_MIB = 4608
RESERVE_MIB = 2048
TIMEOUT_SECONDS = 45 * 60


def in_universal_guard():
    """Reuse a real global scope instead of moving a child into a sibling unit."""
    try:
        path = next(line[3:] for line in Path('/proc/self/cgroup').read_text().splitlines()
                    if line.startswith('0::'))
        if '/androidbuildguard.slice/androidguardjob-' not in path:
            return False
        group = Path('/sys/fs/cgroup' + path)
        quota, period = map(int, (group / 'cpu.max').read_text().split())
        return (0 < int((group / 'memory.max').read_text()) <= RAM_LIMIT_MIB * 1024**2
                and 0 <= int((group / 'memory.swap.max').read_text()) <= 256 * 1024**2
                and period > 0 and 0 < quota <= 4 * period)
    except (OSError, ValueError, StopIteration):
        return False


def read_memory():
    values = {}
    for line in Path('/proc/meminfo').read_text().splitlines():
        key, value = line.split(':', 1)
        values[key] = int(value.split()[0]) // 1024
    return values['MemAvailable'], values['SwapTotal'], values['SwapFree']


def preflight_error(memory, disk_free_mib):
    available, swap_total, swap_free = memory
    if available < RAM_LIMIT_MIB + RESERVE_MIB:
        return (f'Android job not started: {available / 1024:.1f} GiB RAM available; '
                f'{(RAM_LIMIT_MIB + RESERVE_MIB) / 1024:.1f} GiB required. '
                'Close an unused app and retry; no apps were closed automatically.')
    if swap_total and swap_free < 1024:
        return 'Android job not started: less than 1 GiB swap remains. Close unused apps first.'
    if disk_free_mib < 8192:
        return 'Android job not started: less than 8 GiB disk space remains.'
    return None


def under_pressure(memory):
    available, swap_total, swap_free = memory
    return available < 1536 or (swap_total > 0 and swap_free < 512)


def scope_command(unit, command, emulator=False):
    return [
        'systemd-run', '--user', '--scope', '--quiet', '--collect', f'--unit={unit}',
        '-p', 'MemoryHigh=4096M', '-p', f'MemoryMax={RAM_LIMIT_MIB}M',
        '-p', 'MemorySwapMax=256M', '-p', f'CPUQuota={400 if emulator else 200}%', '-p', 'TasksMax=512',
        '--', *command,
    ]


def stop_scope(unit):
    try:
        stopped = subprocess.run(['systemctl', '--user', 'stop', unit],
                                 capture_output=True, timeout=8, check=False)
        if stopped.returncode == 0:
            return
    except subprocess.TimeoutExpired:
        pass
    subprocess.run(['systemctl', '--user', 'kill', '--signal=KILL', unit],
                   capture_output=True, timeout=5, check=False)


def run(command, emulator=False):
    if not command:
        print('Usage: android-resource-guard.py -- COMMAND [ARGS...]', file=sys.stderr)
        return 2
    if in_universal_guard():
        status = subprocess.call(command)
        return status if status >= 0 else 128 - status
    error = preflight_error(read_memory(), shutil.disk_usage(PROJECT_ROOT).free // 1024**2)
    if error:
        print(error, file=sys.stderr)
        return 75
    LOCK_PATH.parent.mkdir(parents=True, exist_ok=True)
    with LOCK_PATH.open('a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            print('Another CalcNoir Android job is running. Wait for it to finish.', file=sys.stderr)
            return 75
        if not shutil.which('systemd-run') or not shutil.which('systemctl'):
            print('User systemd resource controls are required; refusing an unbounded build.', file=sys.stderr)
            return 69
        unit = f'calcnoir-android-{os.getpid()}-{uuid.uuid4().hex[:8]}.scope'
        print(f'Android safeguard: RAM 4.5 GiB, swap 256 MiB, {4 if emulator else 2} CPU cores; {unit}', flush=True)
        started = time.monotonic()
        pressure_samples = 0
        peak_bytes = 0
        memory_events = {}
        cgroup = None
        reason = 'command exited'
        job = None
        code = 1
        previous_handlers = {}

        def interrupted(signum, _frame):
            raise KeyboardInterrupt(signum)

        try:
            for sig in (signal.SIGINT, signal.SIGTERM, signal.SIGHUP):
                previous_handlers[sig] = signal.signal(sig, interrupted)
            job = subprocess.Popen(scope_command(unit, command, emulator))
            while job.poll() is None:
                if cgroup is None:
                    found = subprocess.run(['systemctl', '--user', 'show', unit,
                                            '--property=ControlGroup', '--value'],
                                           capture_output=True, text=True, timeout=3, check=False)
                    if found.returncode == 0 and found.stdout.strip().startswith('/'):
                        cgroup = Path('/sys/fs/cgroup' + found.stdout.strip())
                if cgroup is not None:
                    try:
                        peak_bytes = max(peak_bytes, int((cgroup / 'memory.peak').read_text()))
                        memory_events = {key: int(value) for key, value in
                                         (line.split() for line in (cgroup / 'memory.events').read_text().splitlines())}
                    except FileNotFoundError:
                        pass  # A completed scope may already have been collected.
                pressure_samples = pressure_samples + 1 if under_pressure(read_memory()) else 0
                if pressure_samples >= 3 or time.monotonic() - started > TIMEOUT_SECONDS:
                    reason = 'host memory pressure' if pressure_samples >= 3 else '45 minute time limit'
                    print(f'Stopping only this Android job: {reason}.', file=sys.stderr)
                    stop_scope(unit)
                    code = 75 if pressure_samples >= 3 else 124
                    break
                time.sleep(1)
            else:
                code = job.returncode
            if code != 0:
                stop_scope(unit)
                print('Android job stopped/failed within its limits. See the build error above.', file=sys.stderr)
        except KeyboardInterrupt as error:
            reason = 'interrupted'
            code = 128 + (error.args[0] if error.args else signal.SIGINT)
            stop_scope(unit)
        except (OSError, subprocess.TimeoutExpired) as error:
            reason = type(error).__name__
            print(f'Android safeguard failed ({reason}); refusing to continue unbounded.', file=sys.stderr)
            stop_scope(unit)
        finally:
            if job is not None:
                try:
                    job.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    job.kill()
                    job.wait(timeout=5)
            for sig, handler in previous_handlers.items():
                signal.signal(sig, handler)
            report = {'unit': unit, 'exit_code': code, 'reason': reason,
                      'duration_seconds': round(time.monotonic() - started, 1),
                      'sampled_peak_mib': round(peak_bytes / 1024**2, 1),
                      'sampled_memory_events': memory_events,
                      'ram_limit_mib': RAM_LIMIT_MIB}
            temporary = REPORT_PATH.with_suffix('.tmp')
            temporary.write_text(json.dumps(report, indent=2) + '\n')
            temporary.replace(REPORT_PATH)
        return code if code >= 0 else 128 - code


if __name__ == '__main__':
    arguments = sys.argv[1:]
    emulator_profile = arguments[:1] == ['--emulator']
    if emulator_profile:
        arguments = arguments[1:]
    sys.exit(run(arguments[1:] if arguments[:1] == ['--'] else arguments, emulator_profile))
