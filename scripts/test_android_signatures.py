"""Exercise real JDK signature checks with tiny archives and the public debug key."""
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
import warnings
import zipfile


SCRIPTS = Path(__file__).resolve().parent
PROJECT = SCRIPTS.parent
PAYLOAD = 'base/assets/payload.txt'
CONTENT = b'A small signed fixture.\n'


class AndroidSignaturesTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        java = shutil.which('java')
        candidates = [Path(os.environ.get('JAVA_HOME', '/missing-java-home')),
                      Path(java).resolve().parent.parent if java else Path('/missing-java'),
                      Path('/home/kobinggg/.local/opt/calculix-android/jdk-17.0.21+9')]
        cls.jdk = next((candidate for candidate in candidates
                        if all((candidate / 'bin' / tool).is_file()
                               for tool in ('java', 'javac', 'jarsigner', 'keytool'))), None)
        if cls.jdk is None:
            raise unittest.SkipTest('Set JAVA_HOME to a complete JDK 17+ to run signature checks.')
        cls.temporary = tempfile.TemporaryDirectory(prefix='android-signatures-test-')
        cls.addClassCleanup(cls.temporary.cleanup)
        cls.root = Path(cls.temporary.name)
        cls.environment = {**os.environ, 'JAVA_HOME': str(cls.jdk), 'LC_ALL': 'C'}
        cls.run_command([cls.jdk / 'bin/javac', '-J-Xmx128m', '-J-XX:ActiveProcessorCount=2',
                         '--release', '17', '-d', cls.root, SCRIPTS / 'VerifySignedJar.java'])
        unsigned = cls.root / 'unsigned.aab'
        cls.signed = cls.root / 'signed.aab'
        with zipfile.ZipFile(unsigned, 'w') as archive:
            archive.writestr(PAYLOAD, CONTENT)
        # This is the repository's conventional public Android debug identity only.
        cls.run_command([cls.jdk / 'bin/jarsigner', '-J-Xmx128m', '-J-XX:ActiveProcessorCount=2',
                         '-keystore', PROJECT / 'android/app/debug.keystore',
                         '-storepass', 'android', '-keypass', 'android',
                         '-signedjar', cls.signed, unsigned, 'androiddebugkey'])
        certificate = cls.run_command([cls.jdk / 'bin/keytool', '-J-Xmx128m',
                                       '-J-XX:ActiveProcessorCount=2', '-J-Duser.language=en',
                                       '-printcert', '-jarfile', cls.signed])
        match = re.search(r'SHA256:\s*([a-fA-F0-9:]+)', certificate.stdout)
        if match is None:
            raise AssertionError('Could not read the public fixture certificate fingerprint.')
        cls.fingerprint = match.group(1).replace(':', '').lower()

    @classmethod
    def run_command(cls, command, check=True):
        result = subprocess.run([str(part) for part in command], env=cls.environment,
                                capture_output=True, text=True, timeout=20)
        if check and result.returncode != 0:
            raise AssertionError(f'Test command failed: {Path(command[0]).name}\n{result.stderr}')
        return result

    def setUp(self):
        self.case = self.root / self.id().split('.')[-1]
        self.case.mkdir()
        self.archive = self.case / 'calcnoir-preview.aab'
        shutil.copyfile(self.signed, self.archive)

    def verify(self, fingerprint=None):
        return self.run_command([self.jdk / 'bin/java', '-Xmx128m',
                                 '-XX:ActiveProcessorCount=2', '-cp', self.root,
                                 'VerifySignedJar', self.archive,
                                 fingerprint or self.fingerprint], check=False)

    def append(self, name, content=b'Unsigned addition.\n'):
        with zipfile.ZipFile(self.archive, 'a') as archive:
            archive.writestr(name, content)

    def assert_rejected(self, fragment, fingerprint=None):
        result = self.verify(fingerprint)
        self.assertNotEqual(result.returncode, 0, 'Tampered archive was accepted.')
        self.assertIn(fragment, result.stderr)

    def test_valid_signed_payload_is_accepted(self):
        result = self.verify()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('All 1 JAR payload entries are signed', result.stdout)

    def test_appended_unsigned_payload_is_rejected(self):
        self.append('base/assets/unsigned.txt')
        self.assert_rejected('Unsigned or multiply signed JAR payload: base/assets/unsigned.txt')

    def test_changed_signed_payload_is_rejected(self):
        replacement = self.case / 'changed.aab'
        with zipfile.ZipFile(self.archive) as original, zipfile.ZipFile(replacement, 'w') as changed:
            for entry in original.infolist():
                changed.writestr(entry, b'Modified after signing.\n' if entry.filename == PAYLOAD
                                 else original.read(entry))
        replacement.replace(self.archive)
        self.assert_rejected('digest error')

    def test_unsigned_nested_meta_inf_signature_filename_is_rejected(self):
        self.append('META-INF/nested/UNSIGNED.SF')
        self.assert_rejected('Unsigned or multiply signed JAR payload: META-INF/nested/UNSIGNED.SF')

    def test_duplicate_zip_names_are_rejected(self):
        with warnings.catch_warnings():
            warnings.simplefilter('ignore', UserWarning)
            self.append(PAYLOAD, CONTENT)
        self.assert_rejected('Duplicate JAR entry.')

    def test_unexpected_signing_certificate_is_rejected(self):
        self.assert_rejected('JAR payload uses a different signing identity.', '0' * 64)

    def pipeline(self):
        manifest = {'signature_verified': True, 'artifacts': [{
            'file': self.archive.name,
            'sha256': hashlib.sha256(self.archive.read_bytes()).hexdigest(),
            'signature': {'verified': True}}]}
        path = self.case / 'manifest-preview.json'
        path.write_text(json.dumps(manifest))
        result = self.run_command([sys.executable, SCRIPTS / 'verify-android-signatures.py',
                                   self.case, 'preview', 'aab', self.case / 'unused-sdk',
                                   self.jdk], check=False)
        return result, json.loads(path.read_text())

    def test_signature_pipeline_accepts_valid_fixture(self):
        result, manifest = self.pipeline()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(manifest['signature_verified'])
        self.assertTrue(manifest['artifacts'][0]['signature']['verified'])

    def test_signature_pipeline_clears_old_success_on_rejection(self):
        self.append('base/assets/unsigned.txt')
        result, manifest = self.pipeline()
        self.assertNotEqual(result.returncode, 0, 'Pipeline accepted unsigned payload.')
        self.assertFalse(manifest['signature_verified'])
        self.assertNotIn('signature', manifest['artifacts'][0])


if __name__ == '__main__':
    unittest.main()
