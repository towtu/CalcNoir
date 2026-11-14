#!/usr/bin/env python3
"""Check archive contents and write honest artifact metadata without external packages."""
import hashlib
import json
import sys
import zipfile
from pathlib import Path

directory = Path(sys.argv[1]).resolve()
variant = sys.argv[2]
target = sys.argv[3] if len(sys.argv) > 3 else "all"
if variant not in ("preview", "release") or target not in ("all", "apk", "aab"):
    raise SystemExit("Usage: verify-android-artifacts.py DIRECTORY preview|release [all|apk|aab]")
# Clear stale success before any archive inspection; failures must never leave a green manifest.
manifest_path = directory / f"manifest-{variant}.json"
manifest_path.write_text(json.dumps({"app": "CalcNoir", "variant": variant,
                                    "signature_verified": False, "play_upload_ready": False,
                                    "artifacts": [], "note": "Archive verification has not completed."}, indent=2) + '\n')
results = []
for suffix in (("apk", "aab") if target == "all" else (target,)):
    path = directory / f"calcnoir-{variant}.{suffix}"
    if not path.exists():
        raise SystemExit(f"Expected artifact is missing: {path.name}")
    with zipfile.ZipFile(path) as archive:
        if len(archive.namelist()) != len(set(archive.namelist())):
            raise SystemExit(f'{path.name} contains duplicate ZIP entries.')
        corrupt = archive.testzip()
        if corrupt:
            raise SystemExit(f"Corrupt archive entry: {corrupt}")
        prefix = "base/" if suffix == "aab" else ""
        entry = prefix + "assets/index.android.bundle"
        if entry not in archive.namelist() or archive.getinfo(entry).file_size < 10000:
            raise SystemExit(f"{path.name} has no complete bundled JavaScript. Do not distribute it.")
        architectures = sorted({name[len(prefix):].split('/')[1] for name in archive.namelist()
                                if name.startswith(prefix + "lib/") and name.split('/')[-1] in ('libhermes.so', 'libhermesvm.so')})
        if not architectures:
            raise SystemExit(f"{path.name} has no Hermes native runtime.")
        for architecture in architectures:
            module = prefix + f"lib/{architecture}/libappmodules.so"
            if module not in archive.namelist() or b'CalcNoirNotebookSpec_ModuleProvider' not in archive.read(module):
                raise SystemExit(f"{path.name} is missing the notebook database provider for {architecture}. Reconfigure the app native build before distributing it.")
        with path.open('rb') as source:
            checksum = hashlib.file_digest(source, 'sha256').hexdigest()
        results.append({"file": path.name, "bytes": path.stat().st_size,
                        "sha256": checksum,
                        "architectures": architectures, "bundled_javascript": True, "database_module": True})
if not results:
    raise SystemExit("No Android artifacts found.")
manifest = {"app": "CalcNoir", "version": "1.0.0", "variant": variant,
            "expected_signing": "Android debug certificate; local testing only" if variant == "preview" else "Configured external release key; verify certificate before upload",
            "signature_verified": False,
            "play_upload_ready": False, "artifacts": results,
            "note": "Preview builds must not be uploaded to Google Play. Release upload also requires the developer account and signing/certificate review."}
(directory / f"manifest-{variant}.json").write_text(json.dumps(manifest, indent=2) + '\n')
for result in results:
    print(f"Verified {result['file']}: bundled JS, Hermes ({', '.join(result['architectures'])}), SHA-256 {result['sha256']}")
