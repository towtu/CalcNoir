#!/usr/bin/env python3
"""Check and warm local Metro before opening the guarded Android emulator."""
import os
import signal
import shutil
import subprocess
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, ProxyHandler, build_opener


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, response, code, message, headers, url):
        raise HTTPError(url, code, 'Metro redirects are not allowed.', headers, response)


def port_for(arguments, environment):
    value = environment.get('RCT_METRO_PORT', '8081')
    for index, argument in enumerate(arguments):
        if argument == '--port':
            if index + 1 >= len(arguments):
                raise ValueError('--port requires a number.')
            value = arguments[index + 1]
        elif argument.startswith('--port='):
            value = argument.split('=', 1)[1]
    if not str(value).isascii() or not str(value).isdigit() or not 1 <= int(value) <= 65535:
        raise ValueError('Metro port must be a number from 1 to 65535.')
    return int(value)


def check(port, opener=None, clock=time.monotonic, max_bytes=64 * 1024 * 1024):
    opener = opener or build_opener(ProxyHandler({}), NoRedirect())
    base = f'http://127.0.0.1:{port}'
    try:
        with opener.open(base + '/status', timeout=5) as response:
            if response.read(128) != b'packager-status:running':
                raise RuntimeError('The local port is not serving Metro. Start npm start in another terminal.')
    except (OSError, URLError) as error:
        raise RuntimeError('Metro is unavailable. Run npm start in another calcnoir terminal, then retry.') from error
    print('Metro is ready; preparing the Android bundle before emulator startup.', flush=True)
    started = clock()
    size = 0
    try:
        url = base + '/index.bundle?platform=android&dev=true&minify=false&modulesOnly=false&runModule=true'
        with opener.open(url, timeout=120) as response:
            while True:
                if clock() - started >= 120:
                    raise RuntimeError('Metro bundle preparation timed out. Check the npm start terminal and retry.')
                block = response.read(65536)
                if not block:
                    break
                size += len(block)
                if size > max_bytes:
                    raise RuntimeError('Metro bundle exceeded the development size limit.')
        if size == 0:
            raise RuntimeError('Metro returned an empty Android bundle.')
    except (OSError, URLError) as error:
        raise RuntimeError('Metro could not prepare the Android bundle. Check the npm start terminal and retry.') from error


def check_device(port, serial, runner=subprocess.run, clock=time.monotonic, pause=time.sleep):
    adb = shutil.which('adb') or 'adb'
    device = [adb, '-s', serial]
    emulator = runner([*device, 'shell', 'getprop', 'ro.kernel.qemu'],
                      capture_output=True, text=True, timeout=5)
    host = '10.0.2.2' if emulator.stdout.strip() == '1' else 'localhost'
    # Both host and port are fixed/validated; no user text is interpolated into shell code.
    request = ("printf 'GET /status HTTP/1.0\\r\\nHost: localhost\\r\\n"
               "Connection: close\\r\\n\\r\\n' | toybox nc -w 3 " + host + ' ' + str(port))
    started = clock()
    while clock() - started < 60:
        try:
            result = runner([*device, 'shell', request], capture_output=True,
                            text=True, timeout=8)
            if result.returncode == 0 and 'packager-status:running' in result.stdout:
                print('Android can reach Metro; opening the development app.', flush=True)
                return
        except subprocess.TimeoutExpired:
            pass  # Cold boot can finish before guest networking is ready.
        pause(1)
    raise RuntimeError('The Android device cannot reach Metro yet. Keep npm start running, check the device connection and retry.')


if __name__ == '__main__':
    def deadline(_signum, _frame):
        raise RuntimeError('Metro preparation timed out. Check the npm start terminal and retry.')

    # Enforce a wall-clock bound even if a socket keeps delivering partial data.
    signal.signal(signal.SIGALRM, deadline)
    signal.alarm(125)
    try:
        arguments = sys.argv[1:]
        port = port_for(arguments, os.environ)
        if arguments[:1] == ['--print-port']:
            print(port)
        elif arguments[:1] == ['--device']:
            if len(arguments) < 2:
                raise ValueError('A device serial is required.')
            check_device(port, arguments[1])
        else:
            check(port)
    except (RuntimeError, ValueError, OSError, subprocess.TimeoutExpired) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
    finally:
        signal.alarm(0)
