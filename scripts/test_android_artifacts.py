import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import zipfile

SCRIPT = Path(__file__).with_name('verify-android-artifacts.py')
ABIS = ('arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64')

class NativeDatabaseArtifactTests(unittest.TestCase):
    def fixture(self, directory, suffix, missing=None, symbol=True):
        prefix = 'base/' if suffix == 'aab' else ''
        with zipfile.ZipFile(Path(directory) / ('calcnoir-preview.' + suffix), 'w') as archive:
            archive.writestr(prefix + 'assets/index.android.bundle', b'x' * 10001)
            for abi in ABIS:
                archive.writestr(prefix + 'lib/' + abi + '/libhermesvm.so', b'fixture')
                if abi != missing:
                    archive.writestr(prefix + 'lib/' + abi + '/libappmodules.so', b'CalcNoirNotebookSpec_ModuleProvider' if symbol else b'old-module')
    def run_gate(self, directory, suffix):
        return subprocess.run([sys.executable, str(SCRIPT), directory, 'preview', suffix], capture_output=True, text=True)
    def test_all_runtime_architectures_require_the_database_provider(self):
        for suffix in ('apk', 'aab'):
            with self.subTest(suffix=suffix), tempfile.TemporaryDirectory() as directory:
                self.fixture(directory, suffix)
                result = self.run_gate(directory, suffix)
                self.assertEqual(result.returncode, 0, result.stderr)
                manifest = json.loads((Path(directory) / 'manifest-preview.json').read_text())
                self.assertTrue(manifest['artifacts'][0]['database_module'])
                self.assertFalse(manifest['signature_verified'])
    def test_a_missing_provider_in_one_abi_rejects_the_archive(self):
        for suffix in ('apk', 'aab'):
            with self.subTest(suffix=suffix), tempfile.TemporaryDirectory() as directory:
                self.fixture(directory, suffix, missing='arm64-v8a')
                self.assertNotEqual(self.run_gate(directory, suffix).returncode, 0)
    def test_an_old_module_without_the_database_symbol_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            self.fixture(directory, 'apk', symbol=False)
            self.assertNotEqual(self.run_gate(directory, 'apk').returncode, 0)
    def test_failed_archive_check_clears_a_stale_success_manifest(self):
        with tempfile.TemporaryDirectory() as directory:
            self.fixture(directory, 'aab', missing='x86')
            path = Path(directory) / 'manifest-preview.json'
            path.write_text(json.dumps({'signature_verified': True, 'artifacts': [{'signature': {'verified': True}}]}))
            self.run_gate(directory, 'aab')
            self.assertFalse(json.loads(path.read_text())['signature_verified'])

if __name__ == '__main__':
    unittest.main()
