#!/usr/bin/env python3
"""Verify packaged signatures with SDK/JDK tools and bind the result to artifact hashes."""
import hashlib
import json
import os
import re
import subprocess
import sys
from pathlib import Path

folder, variant, target, sdk, jdk = sys.argv[1:]
folder, sdk, jdk = Path(folder), Path(sdk), Path(jdk)
manifest_path = folder / f'manifest-{variant}.json'
manifest = json.loads(manifest_path.read_text())
if variant not in ('preview', 'release') or target not in ('all', 'apk', 'aab'):
    raise SystemExit('Choose preview|release and all|apk|aab.')
# Clear old success before checking; a rejected recheck must not retain a green manifest.
manifest['signature_verified'] = False
for item in manifest['artifacts']:
    item.pop('signature', None)
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
environment = dict(os.environ, JAVA_HOME=str(jdk), PATH=str(jdk / 'bin') + os.pathsep + os.environ.get('PATH', ''))
signers = []
checked = set()

def run(command):
    result = subprocess.run([str(part) for part in command], capture_output=True, text=True, env=environment, timeout=120)
    if result.returncode:
        raise SystemExit('Signature verification rejected the artifact:\n' + result.stdout + result.stderr)
    return result.stdout + result.stderr

for artifact in manifest['artifacts']:
    suffix = Path(artifact['file']).suffix[1:]
    if suffix not in ('apk', 'aab') or artifact['file'] != f'calcnoir-{variant}.{suffix}':
        raise SystemExit('Unexpected artifact filename in manifest.')
    if target != 'all' and suffix != target:
        continue
    if suffix in checked:
        raise SystemExit('Duplicate artifact in manifest.')
    checked.add(suffix)
    path = folder / artifact['file']
    with path.open('rb') as source:
        if hashlib.file_digest(source, 'sha256').hexdigest() != artifact['sha256']:
            raise SystemExit(f'Artifact changed before signature verification: {path.name}')
    if suffix == 'apk':
        tools = sorted(sdk.glob('build-tools/*/apksigner'), key=lambda item: tuple(int(part) for part in re.findall(r'\d+', item.parent.name)))
        if not tools:
            raise SystemExit('Android build-tools apksigner was not found.')
        output = run([tools[-1], 'verify', '--verbose', '--print-certs', path])
        if len(re.findall(r'certificate SHA-256 digest: ([a-fA-F0-9]+)', output)) != 1:
            raise SystemExit('Expected exactly one APK signing identity.')
        fingerprint = re.search(r'certificate SHA-256 digest: ([a-fA-F0-9]+)', output)
    else:
        output = run([jdk / 'bin/jarsigner', '-verify', path])
        if 'jar verified.' not in output:
            raise SystemExit(f'JAR signature did not verify: {path.name}')
        certificate = run([jdk / 'bin/keytool', '-printcert', '-jarfile', path])
        output += '\n' + certificate
        fingerprint = re.search(r'SHA256:\s*([a-fA-F0-9:]+)', certificate)
    if not fingerprint:
        raise SystemExit(f'Could not read signer identity: {path.name}')
    digest = fingerprint.group(1).replace(':', '').lower()
    if suffix == 'aab':
        coverage = run([jdk / 'bin/java', '-Xmx256m', '--source', '17',
                        Path(__file__).with_name('VerifySignedJar.java'), path, digest])
        output += '\n' + coverage
    signers.append(digest)
    evidence = f'calcnoir-{variant}-{suffix}-signature.txt'
    (folder / evidence).write_text(output)
    artifact['signature'] = {'verified': True, 'certificate_sha256': digest, 'evidence': evidence}
    print(f'Signature verified: {path.name}; certificate SHA-256 {digest}')
expected = {'apk', 'aab'} if target == 'all' else {target}
if checked != expected or not signers or len(set(signers)) != 1:
    raise SystemExit('Artifacts are missing signatures or use different signing identities.')
manifest['signature_verified'] = True
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
