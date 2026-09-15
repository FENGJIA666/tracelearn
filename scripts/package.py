"""Package a completed v1.3 release; fail before writing on incomplete evidence.

Use --check-only to validate the evidence and public-file inventory without
creating an archive or changing MANIFEST.sha256. This is a release gate, not a
semantic scorer or a general secret scanner.
"""
from pathlib import Path, PurePosixPath
import argparse
import hashlib
import json
import os
import re
import stat
import tempfile
import zipfile

VERSION = '1.3.0'
MODES = {'frozen-grounded', 'supported'}
SKIP_DIRS = {'node_modules', '.local', 'dist', '.git', 'pdf-render', '__pycache__'}
SKIP_NAMES = {'desktop-ai-viewport.png', 'responsive-1024.png', 'cover-layout.pdf',
              'probe-generation.ts', 'quality-probe.ts', '.DS_Store', 'MANIFEST.sha256'}
ALLOWED_LOGS = {'unit-tests.log', 'build.log'}
PRIVATE_NAMES = {'credentials', 'credentials.json', 'credentials.yaml', 'credentials.yml',
                 'secrets.json', 'secrets.yaml', 'secrets.yml', 'token.json', 'tokens.json', 'auth.json', 'service-account.json',
                 'service_account.json', 'id_rsa', 'id_dsa', 'id_ecdsa', 'id_ed25519',
                 '.npmrc', '.pypirc', '.netrc'}
PRIVATE_DIRS = {'.ssh', '.aws', '.azure', '.gnupg'}
PRIVATE_SUFFIXES = {'.pem', '.key', '.p12', '.pfx', '.keystore', '.sqlite', '.sqlite3', '.db'}
HASH = re.compile(r'^[0-9a-f]{64}$')


class ReleaseError(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise ReleaseError(message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def safe_path(root, relative):
    """Reject traversal and symlinks before opening a release-controlled path."""
    require(isinstance(relative, str) and relative, 'Release path must be nonempty text.')
    rel = PurePosixPath(relative)
    require(not rel.is_absolute() and '..' not in rel.parts and '\\' not in relative
            and not any(ord(char) < 32 for char in relative),
            f'Unsafe release path: {relative}')
    path = root
    for part in rel.parts:
        path = path / part
        require(not path.is_symlink(), f'Symlink cannot be packaged: {relative}')
    require(path.resolve().is_relative_to(root), f'Path leaves project: {relative}')
    return path


def read_bytes(root, relative):
    path = safe_path(root, relative)
    require(path.is_file(), f'Required release file is missing: {relative}')
    return path.read_bytes()


def read_json(root, relative):
    try:
        return json.loads(read_bytes(root, relative))
    except (UnicodeError, json.JSONDecodeError) as error:
        raise ReleaseError(f'Invalid release JSON: {relative}') from error


def expected_hash(value, label):
    require(isinstance(value, str) and HASH.fullmatch(value), f'Missing or invalid SHA-256: {label}')
    return value


def validate_release(root):
    """Validate release authority before reading final case/output contents."""
    root = Path(root).resolve()
    manifest = read_json(root, 'evidence/v1.3/final-manifest.json')
    require(isinstance(manifest, dict) and manifest.get('version') == VERSION,
            f'Final manifest must identify version {VERSION}.')
    verification = manifest.get('verification')
    require(isinstance(verification, dict) and verification.get('completed') is True,
            'Final verification is incomplete: verification.completed must be true.')
    freeze_bytes = read_bytes(root, 'evidence/v1.3/freeze.json')
    require(sha(freeze_bytes) == expected_hash(manifest.get('freezeSha256'), 'freezeSha256'),
            'Final freeze SHA-256 does not match the manifest.')
    try:
        freeze = json.loads(freeze_bytes)
    except (UnicodeError, json.JSONDecodeError) as error:
        raise ReleaseError('Invalid freeze JSON.') from error
    require(isinstance(freeze, dict) and freeze.get('state') == 'frozen', 'Final pipeline is not frozen.')
    pipelines = freeze.get('pipelines', {})
    require(isinstance(pipelines, dict) and MODES <= pipelines.keys(), 'Freeze is missing a comparison pipeline.')
    for mode in sorted(MODES):
        pipeline = pipelines[mode]
        require(isinstance(pipeline, dict), f'Invalid frozen pipeline: {mode}')
        expected_hash(pipeline.get('hash'), f'{mode} pipeline')
        files = pipeline.get('files')
        require(isinstance(files, dict) and files, f'Frozen source list is empty: {mode}')
        for relative, digest in files.items():
            require(sha(read_bytes(root, relative)) == expected_hash(digest, relative),
                    f'Packaged source differs from the freeze: {relative}')

    coverage = {}
    for split in ('development', 'holdout'):
        spec = manifest.get(split)
        require(isinstance(spec, dict), f'Missing final {split} specification.')
        directory = spec.get('directory')
        require(isinstance(directory, str) and directory.startswith('evidence/v1.3/'),
                f'Final {split} directory must be inside evidence/v1.3/.')
        safe_path(root, directory)
        raw_bytes = read_bytes(root, directory + '/raw-results.jsonl')
        review_bytes = read_bytes(root, directory + '/semantic-review.json')
        require(sha(raw_bytes) == expected_hash(spec.get('rawSha256'), f'{split} raw'),
                f'Final {split} raw SHA-256 mismatch.')
        require(sha(review_bytes) == expected_hash(spec.get('semanticReviewSha256'), f'{split} review'),
                f'Final {split} review SHA-256 mismatch.')
        try:
            # Match prepare-v13-review.ts: UTF-8 lines, no terminator, CR removed.
            lines = [line.rstrip('\r') for line in raw_bytes.decode('utf-8').split('\n') if line.rstrip('\r')]
            records = [json.loads(line) for line in lines]
            review = json.loads(review_bytes)
        except (UnicodeError, json.JSONDecodeError) as error:
            raise ReleaseError(f'Invalid final {split} raw/review data.') from error
        require(len(records) == 80, f'Final {split} requires exactly 80 raw records; found {len(records)}.')
        require(isinstance(review, dict) and review.get('independentHumanReview') is False,
                f'Final {split} must preserve the non-independent review disclosure.')
        entries = review.get('entries')
        require(isinstance(entries, list) and len(entries) == 80,
                f'Final {split} requires exactly 80 saved reviews.')
        scored = {}
        for entry in entries:
            require(isinstance(entry, dict), f'Invalid {split} review entry.')
            key = (entry.get('caseId'), entry.get('variant'))
            require(all(isinstance(value, str) for value in key) and key not in scored,
                    f'Duplicate or invalid {split} saved review identity.')
            scored[key] = entry
        pairs = set()
        for line, record in zip(lines, records):
            require(isinstance(record, dict), f'Invalid {split} raw record.')
            case = record.get('case')
            require(record.get('split') == split and isinstance(case, dict) and case.get('split') == split,
                    f'Wrong split in final {split} raw record.')
            case_id, mode = record.get('caseId'), record.get('mode')
            require(isinstance(case_id, str) and case_id and isinstance(mode, str) and mode in MODES,
                    f'Invalid case/mode in final {split} raw record.')
            key = (case_id, mode)
            require(key not in pairs, f'Duplicate final {split} raw identity: {case_id}/{mode}')
            pairs.add(key)
            require(record.get('pipelineHash') == pipelines[mode]['hash'],
                    f'Final {split} record is not from the frozen pipeline: {case_id}/{mode}')
            entry = scored.get(key)
            require(entry is not None, f'Missing {split} review for {case_id}/{mode}')
            require(entry.get('rawOutputSha256') == sha(line.encode('utf-8')),
                    f'Stale raw-line hash in {split} review: {case_id}/{mode}')
            identity = entry.get('runIdentity')
            require(isinstance(identity, dict) and all(
                isinstance(record.get(field), str) and record[field] and identity.get(field) == record[field]
                for field in ('key', 'pipelineHash', 'materialHash', 'configurationHash')),
                f'Stale run identity in {split} review: {case_id}/{mode}')
            require(isinstance(entry.get('taskCorrect'), bool) and isinstance(entry.get('failureFlags'), list)
                    and isinstance(entry.get('rationale'), str) and entry['rationale'].strip(),
                    f'Incomplete semantic judgment in {split}: {case_id}/{mode}')
        cases = {case_id for case_id, _ in pairs}
        require(len(cases) == 40 and pairs == {(case_id, mode) for case_id in cases for mode in MODES}
                and set(scored) == pairs, f'Final {split} must contain 40 cases in both configurations.')
        coverage[split] = {'cases': 40, 'rawRecords': 80, 'savedReviews': 80}
    return coverage


def check_public_name(relative):
    name = relative.name.lower()
    require(not any(part.lower() in PRIVATE_DIRS for part in relative.parts),
            f'Private configuration directory cannot be packaged: {relative}')
    require(not name.startswith('.env') and name not in PRIVATE_NAMES
            and relative.suffix.lower() not in PRIVATE_SUFFIXES
            and not re.match(r'(?:client_secret|service[-_]account|credentials)[-_.].*\.json$', name)
            and not re.search(r'\.(?:sqlite3?|db)(?:-(?:wal|shm|journal))$', name),
            f'Possible credential or runtime database cannot be packaged: {relative}')


def collect_files(root):
    root = Path(root).resolve()
    files = []
    for directory, dirs, names in os.walk(root, followlinks=False):
        here = Path(directory)
        kept = []
        for name in sorted(dirs):
            if name in SKIP_DIRS:
                continue
            rel = (here / name).relative_to(root)
            safe_path(root, rel.as_posix())
            check_public_name(rel)
            kept.append(name)
        dirs[:] = kept
        for name in sorted(names):
            if name in SKIP_NAMES or (Path(name).suffix == '.log' and name not in ALLOWED_LOGS):
                continue
            rel = (here / name).relative_to(root)
            path = safe_path(root, rel.as_posix())
            check_public_name(rel)
            require(stat.S_ISREG(path.lstat().st_mode), f'Non-regular file cannot be packaged: {rel}')
            files.append(path)
    return sorted(files)


def file_digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def build_package(root, out, check_only=False):
    root = Path(root).resolve()
    out = Path(out).absolute()
    coverage = validate_release(root)
    files = collect_files(root)
    summary = {'version': VERSION, 'coverage': coverage, 'publicFiles': len(files), 'checkOnly': check_only}
    if check_only:
        return summary
    require(not out.resolve().is_relative_to(root), 'Archive destination must be outside the source directory.')
    require(not out.is_symlink(), 'Archive destination must not be a symlink.')
    require(not (root / 'MANIFEST.sha256').is_symlink(), 'MANIFEST.sha256 must not be a symlink.')
    # Hash once for the manifest, then hash the exact bytes streamed into the ZIP.
    # A changed file aborts the staged archive without touching an existing release.
    digests = {path: file_digest(path) for path in files}
    manifest = ''.join(f'{digests[path]}  {path.relative_to(root).as_posix()}\n' for path in files).encode('utf-8')
    archive_fd, archive_name = tempfile.mkstemp(prefix='.tracelearn-package-', suffix='.zip', dir=out.parent)
    os.close(archive_fd)
    manifest_name = None
    try:
        with zipfile.ZipFile(archive_name, 'w', zipfile.ZIP_DEFLATED, compresslevel=8) as archive:
            for path in files:
                rel = path.relative_to(root).as_posix()
                safe_path(root, rel)
                digest = hashlib.sha256()
                info = zipfile.ZipInfo.from_file(path, 'TraceLearn/' + rel)
                info.compress_type = zipfile.ZIP_DEFLATED
                with path.open('rb') as source, archive.open(info, 'w') as target:
                    for chunk in iter(lambda: source.read(1024 * 1024), b''):
                        digest.update(chunk)
                        target.write(chunk)
                require(digest.hexdigest() == digests[path], f'File changed while packaging: {rel}')
            archive.writestr('TraceLearn/MANIFEST.sha256', manifest)
        # Evidence must still describe the same completed release after collection.
        validate_release(root)
        require(collect_files(root) == files, 'Public file inventory changed while packaging.')
        for relative in ('evidence/v1.3/final-manifest.json', 'evidence/v1.3/freeze.json'):
            require(file_digest(root / relative) == digests[root / relative], f'Release authority changed: {relative}')
        manifest_fd, manifest_name = tempfile.mkstemp(prefix='.tracelearn-manifest-', dir=root)
        with os.fdopen(manifest_fd, 'wb') as stream:
            stream.write(manifest)
        os.replace(archive_name, out)
        os.replace(manifest_name, root / 'MANIFEST.sha256')
        summary.update({'archive': str(out), 'bytes': out.stat().st_size,
                        'files': len(files) + 1, 'sha256': file_digest(out)})
        return summary
    finally:
        for temporary in (archive_name, manifest_name):
            if temporary and Path(temporary).exists():
                Path(temporary).unlink()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check-only', action='store_true', help='Validate without writing a ZIP or MANIFEST.sha256.')
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    try:
        print(json.dumps(build_package(root, root.parent / f'TraceLearn-Complete-v{VERSION}.zip', args.check_only), indent=2))
    except (ReleaseError, OSError) as error:
        parser.exit(1, f'Release not packaged: {error}\n')


if __name__ == '__main__':
    main()
