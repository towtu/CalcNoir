"""Exercise the actual shell launch flow with tiny stand-in SDK executables."""
import os
import json
from pathlib import Path
import signal
import subprocess
import tempfile
import unittest


SCRIPTS = Path(__file__).resolve().parent


class AndroidLaunchOrderTest(unittest.TestCase):
    def test_compilation_finishes_before_emulator_and_install(self):
        self.run_launch(metro_ready=True)

    def test_missing_metro_does_not_open_emulator_or_install(self):
        self.run_launch(metro_ready=False)

    def test_custom_metro_port_reaches_the_native_build(self):
        self.run_launch(metro_ready=True, port=8090)

    def run_launch(self, metro_ready, port=8081):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'scripts').mkdir()
            selected = Path(os.environ.get('ANDROID_DEV_UNDER_TEST', SCRIPTS / 'android-dev.sh'))
            (root / 'scripts/android-dev.sh').write_text(selected.read_text())
            (root / 'scripts/android-launch.sh').write_text((SCRIPTS / 'android-launch.sh').read_text())
            # All invoked tools are fixtures; no real build or emulator is started.
            (root / 'scripts/android-resource-guard.py').write_text(
                'import os,sys\na=sys.argv[sys.argv.index("--")+1:]\nos.execvp(a[0],a)\n')
            stub_header = '''#!/usr/bin/python3
import os,signal,sys,time,json
from pathlib import Path
root=Path(os.environ['AE_TEST_ROOT'])
def event(value):
    with (root/'events').open('a') as log: log.write(value+'\\n')
'''
            (root / 'scripts/android-metro.py').write_text(
                stub_header + '''
if sys.argv[1:2]==['--print-port']:
    args=sys.argv[1:]
    print(args[args.index('--port')+1] if '--port' in args else '8081'); sys.exit(0)
event('device_metro' if sys.argv[1:2]==['--device'] else 'metro')
''' + 'sys.exit(' + ('0' if metro_ready else '1') + ')\n')

            def executable(relative, body):
                file = root / relative
                file.parent.mkdir(parents=True, exist_ok=True)
                file.write_text(stub_header + body)
                file.chmod(0o755)

            executable('jdk/bin/java', 'sys.exit(0)\n')
            executable('sdk/platform-tools/adb', '''
if sys.argv[1]=='devices':
    print('List of devices attached')
    if (root/'emulator-pid').exists(): print('fixture-device\\tdevice')
elif 'sys.boot_completed' in sys.argv: print('1')
elif 'ro.product.cpu.abi' in sys.argv: print('x86_64')
''')
            executable('android/gradlew', "event('compile')\n(root/'gradle-args').write_text(json.dumps(sys.argv[1:]))\n")
            executable('sdk/emulator/emulator', '''
if '-list-avds' in sys.argv:
    print('Fixture_AVD'); sys.exit(0)
event('emulator')
(root/'emulator-pid').write_text(str(os.getpid()))
signal.pause()
''')
            executable('node_modules/.bin/react-native', '''
event('install')
''')
            environment = {**os.environ, 'AE_TEST_ROOT': str(root),
                           'JAVA_HOME': str(root / 'jdk'), 'ANDROID_HOME': str(root / 'sdk')}
            try:
                result = subprocess.run(['bash', str(root / 'scripts/android-dev.sh'), '--port', str(port)],
                                        env=environment, text=True, capture_output=True, timeout=15)
                if not metro_ready:
                    self.assertNotEqual(result.returncode, 0)
                    self.assertEqual((root / 'events').read_text().splitlines(), ['compile', 'metro'])
                    self.assertFalse((root / 'emulator-pid').exists())
                    return
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual((root / 'events').read_text().splitlines(),
                                 ['compile', 'metro', 'emulator', 'device_metro', 'install'])
                self.assertIn(f'-PreactNativeDevServerPort={port}', json.loads((root/'gradle-args').read_text()))
                emulator_pid = int((root / 'emulator-pid').read_text())
                os.kill(emulator_pid, 0)
                self.assertEqual(os.getsid(emulator_pid), emulator_pid,
                                 'GUI must have its own session after the CLI exits')
            finally:
                if (root / 'emulator-pid').exists():
                    try:
                        os.kill(int((root / 'emulator-pid').read_text()), signal.SIGTERM)
                    except ProcessLookupError:
                        pass


if __name__ == '__main__':
    unittest.main()
