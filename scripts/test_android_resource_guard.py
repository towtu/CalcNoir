"""Small, deterministic checks for the Android launcher's host safeguards."""
import importlib.util
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch


GUARD = Path(__file__).with_name('android-resource-guard.py')


class ResourceGuardTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.guard = None
        if GUARD.exists():
            spec = importlib.util.spec_from_file_location('android_resource_guard', GUARD)
            cls.guard = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(cls.guard)

    def require_guard(self):
        self.assertIsNotNone(self.guard, 'Android commands have no host resource guard')
        return self.guard

    def test_low_ram_refuses_to_start_any_command(self):
        guard = self.require_guard()
        with patch.object(guard, 'read_memory', return_value=(3000, 7800, 7800)), \
                patch.object(guard.subprocess, 'Popen') as launch:
            self.assertEqual(guard.run(['/usr/bin/true']), 75)
            launch.assert_not_called()

    def test_full_swap_and_low_disk_refuse_start(self):
        guard = self.require_guard()
        self.assertIn('swap', guard.preflight_error((9000, 7800, 500), 20 * 1024).lower())
        self.assertIn('disk', guard.preflight_error((9000, 7800, 7800), 1000).lower())
        self.assertIsNone(guard.preflight_error((9000, 0, 0), 20 * 1024))

    def test_another_build_holds_the_lock(self):
        guard = self.require_guard()
        import fcntl
        with tempfile.TemporaryDirectory() as directory:
            lock = Path(directory) / 'job.lock'
            with lock.open('w') as held:
                fcntl.flock(held, fcntl.LOCK_EX | fcntl.LOCK_NB)
                with patch.object(guard, 'LOCK_PATH', lock), \
                        patch.object(guard, 'read_memory', return_value=(9000, 0, 0)), \
                        patch.object(guard.shutil, 'disk_usage', return_value=SimpleNamespace(free=30 * 1024**3)), \
                        patch.object(guard.subprocess, 'Popen') as launch:
                    self.assertEqual(guard.run(['/usr/bin/true']), 75)
                    launch.assert_not_called()

    def test_child_is_a_capped_scope_and_arguments_are_literal(self):
        guard = self.require_guard()
        command = guard.scope_command('calcnoir-test.scope', ['/usr/bin/printf', '%s', '$(touch BAD); x'])
        self.assertIn('MemoryMax=4608M', command)
        self.assertIn('MemorySwapMax=256M', command)
        self.assertIn('CPUQuota=200%', command)
        self.assertEqual(command[-4:], ['--', '/usr/bin/printf', '%s', '$(touch BAD); x'])
        emulator_command = guard.scope_command('calcnoir-test.scope', ['/usr/bin/true'], emulator=True)
        self.assertIn('CPUQuota=400%', emulator_command)
        self.assertIn('MemoryMax=4608M', emulator_command)

    def test_pressure_stops_only_our_unit(self):
        guard = self.require_guard()
        with patch.object(guard.subprocess, 'run') as stop:
            stop.return_value.returncode = 0
            guard.stop_scope('calcnoir-android-123-test.scope')
            self.assertEqual(stop.call_args.args[0], [
                'systemctl', '--user', 'stop', 'calcnoir-android-123-test.scope'])
        self.assertTrue(guard.under_pressure((1400, 7800, 7800)))
        self.assertTrue(guard.under_pressure((4000, 7800, 400)))
        self.assertFalse(guard.under_pressure((4000, 0, 0)))

    def test_sustained_pressure_cancels_the_job(self):
        guard = self.require_guard()
        with tempfile.TemporaryDirectory() as directory, \
                patch.object(guard, 'LOCK_PATH', Path(directory) / 'job.lock'), \
                patch.object(guard, 'REPORT_PATH', Path(directory) / 'report.json'), \
                patch.object(guard, 'read_memory', side_effect=[(9000, 0, 0)] + [(1000, 0, 0)] * 3), \
                patch.object(guard.shutil, 'disk_usage', return_value=SimpleNamespace(free=30 * 1024**3)), \
                patch.object(guard.subprocess, 'Popen') as launch, \
                patch.object(guard.subprocess, 'run') as show, \
                patch.object(guard, 'stop_scope') as stop, \
                patch.object(guard.time, 'sleep'):
            launch.return_value.poll.return_value = None
            show.return_value.returncode = 1
            self.assertEqual(guard.run(['/usr/bin/sleep', '60']), 75)
            self.assertTrue(stop.called)
            self.assertTrue(stop.call_args.args[0].startswith('calcnoir-android-'))

    def test_global_scope_reuse_preserves_signal_exit_status(self):
        guard = self.require_guard()
        with patch.object(guard, 'in_universal_guard', return_value=True), \
                patch.object(guard.subprocess, 'call', return_value=-9), \
                patch.object(guard, 'read_memory') as preflight:
            self.assertEqual(guard.run(['/usr/bin/true']), 137)
            preflight.assert_not_called()

    def test_build_failure_is_not_reported_as_success(self):
        guard = self.require_guard()
        with tempfile.TemporaryDirectory() as directory, \
                patch.object(guard, 'LOCK_PATH', Path(directory) / 'job.lock'), \
                patch.object(guard, 'REPORT_PATH', Path(directory) / 'report.json'), \
                patch.object(guard, 'read_memory', return_value=(9000, 0, 0)), \
                patch.object(guard.shutil, 'disk_usage', return_value=SimpleNamespace(free=30 * 1024**3)), \
                patch.object(guard.subprocess, 'Popen') as launch, \
                patch.object(guard, 'stop_scope'):
            launch.return_value.poll.return_value = 17
            launch.return_value.returncode = 17
            self.assertEqual(guard.run(['/usr/bin/false']), 17)


if __name__ == '__main__':
    unittest.main()
