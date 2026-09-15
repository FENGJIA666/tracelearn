"""Check the package release gate using only synthetic data in temporary folders.

Run with Python 3.11+: python3 scripts/package-guard-check.py
This creates one temporary fixture archive, never a real release ZIP, and does
not read the project's development/holdout output or call any model/server.
"""
import importlib.util, json, tempfile, unittest, zipfile
from pathlib import Path
from unittest.mock import patch

project = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('release_package', project / 'scripts/package.py')
pkg = importlib.util.module_from_spec(spec); spec.loader.exec_module(pkg)

class PackageGuardTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.base = Path(self.temp.name).resolve(); self.root = self.base / 'project'; self.root.mkdir()
        self.out = self.base / 'release.zip'
        self.put('server/frozen.ts', 'export const fixture = true;\n')
        self.put('README.md', 'Public synthetic package fixture.\n')
        self.put('evaluation/raw-results.jsonl', 'Historical synthetic record, must be retained.\n')
        self.put('.local/tracelearn.sqlite', 'Private synthetic database, must be excluded.\n')
        self.put('.local/.env', 'SYNTHETIC_VALUE=excluded\n')
        self.freeze = {'state':'frozen', 'pipelines':{m:{'hash':pkg.sha(m.encode()), 'files':{'server/frozen.ts':pkg.sha((self.root/'server/frozen.ts').read_bytes())}} for m in pkg.MODES}}
        self.putjson('evidence/v1.3/freeze.json', self.freeze)
        self.manifest = {'version':'1.3.0','verification':{'completed':True},'freezeSha256':pkg.sha((self.root/'evidence/v1.3/freeze.json').read_bytes())}
        self.runs = {}
        for split in ('development','holdout'):
            rows=[]; entries=[]
            for i in range(40):
                for mode in sorted(pkg.MODES):
                    record={'caseId':f'{split}-{i:02}', 'mode':mode, 'split':split,'case':{'split':split}, 'key':f'{split}-{i:02}|{mode}', 'pipelineHash':self.freeze['pipelines'][mode]['hash'], 'materialHash':pkg.sha(b'material'), 'configurationHash':pkg.sha(b'configuration')}
                    line=json.dumps(record,separators=(',',':'))
                    rows.append(line)
                    entries.append({'caseId':record['caseId'],'variant':mode,'rawOutputSha256':pkg.sha(line.encode()),'runIdentity':{k:record[k] for k in ('key','pipelineHash','materialHash','configurationHash')}, 'taskCorrect':False,'failureFlags':['synthetic-fixture'],'rationale':'Synthetic structural test; not a model score.'})
            self.runs[split]={'rows':rows,'review':{'independentHumanReview':False,'entries':entries}}
            self.save_run(split)
        self.save_manifest()
    def tearDown(self): self.temp.cleanup()
    def put(self, rel, text):
        p=self.root/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text)
    def putjson(self, rel, value): self.put(rel,json.dumps(value,indent=2)+'\n')
    def save_manifest(self): self.putjson('evidence/v1.3/final-manifest.json',self.manifest)
    def save_run(self, split):
        directory=f'evidence/v1.3/{split}-fixture';run=self.runs[split]
        self.put(directory+'/raw-results.jsonl','\n'.join(run['rows'])+'\n')
        self.putjson(directory+'/semantic-review.json',run['review'])
        self.manifest[split]={'directory':directory,'rawSha256':pkg.sha((self.root/directory/'raw-results.jsonl').read_bytes()),'semanticReviewSha256':pkg.sha((self.root/directory/'semantic-review.json').read_bytes())}
    def rejected(self, pattern):
        self.put('MANIFEST.sha256','PREVIOUS_MANIFEST\n');self.out.write_bytes(b'PREVIOUS_ARCHIVE')
        with self.assertRaisesRegex(pkg.ReleaseError,pattern): pkg.build_package(self.root,self.out)
        self.assertEqual((self.root/'MANIFEST.sha256').read_text(),'PREVIOUS_MANIFEST\n')
        self.assertEqual(self.out.read_bytes(),b'PREVIOUS_ARCHIVE')
    def test_check_only_has_no_writes_and_retains_history(self):
        result=pkg.build_package(self.root,self.out,True)
        self.assertEqual(result['coverage']['holdout']['savedReviews'],80)
        self.assertFalse(self.out.exists()); self.assertFalse((self.root/'MANIFEST.sha256').exists())
        names={p.relative_to(self.root).as_posix() for p in pkg.collect_files(self.root)}
        self.assertIn('evaluation/raw-results.jsonl',names)
        self.assertFalse(any(x.startswith('.local/') for x in names))
    def test_temporary_package_manifest_matches_every_archive_entry(self):
        result=pkg.build_package(self.root,self.out)
        self.assertEqual(result['sha256'],pkg.sha(self.out.read_bytes()))
        with zipfile.ZipFile(self.out) as z:
            manifest=z.read('TraceLearn/MANIFEST.sha256').decode()
            self.assertEqual(manifest,(self.root/'MANIFEST.sha256').read_text())
            for line in manifest.splitlines():
                digest,relative=line.split('  ',1);self.assertEqual(digest,pkg.sha(z.read('TraceLearn/'+relative)))
            self.assertEqual(len(z.namelist()),result['files'])
    def test_missing_manifest_stops_before_raw_reads(self):
        (self.root/'evidence/v1.3/final-manifest.json').unlink()
        with patch.object(pkg,'read_bytes',wraps=pkg.read_bytes) as reader:
            self.rejected('Required release file is missing')
            self.assertFalse(any('raw-results' in str(call.args) for call in reader.call_args_list))
    def test_incomplete_verification_stops_before_case_reads(self):
        self.manifest['verification']['completed']=False;self.save_manifest()
        with patch.object(pkg,'read_bytes',wraps=pkg.read_bytes) as reader:
            self.rejected('verification.completed')
            self.assertFalse(any('raw-results' in str(call.args) for call in reader.call_args_list))
    def test_freeze_hash_mismatch(self):
        self.manifest['freezeSha256']='0'*64;self.save_manifest();self.rejected('freeze SHA')
    def test_frozen_runtime_file_changed(self):
        self.put('server/frozen.ts','changed');self.rejected('source differs')
    def test_raw_hash_mismatch(self):
        self.manifest['holdout']['rawSha256']='0'*64;self.save_manifest();self.rejected('raw SHA')
    def test_incomplete_raw_even_with_matching_manifest_hash(self):
        self.runs['holdout']['rows'].pop();self.save_run('holdout');self.save_manifest();self.rejected('exactly 80 raw')
    def test_incomplete_reviews_even_with_matching_manifest_hash(self):
        self.runs['holdout']['review']['entries'].pop();self.save_run('holdout');self.save_manifest();self.rejected('exactly 80 saved')
    def test_stale_review_line_hash(self):
        self.runs['development']['review']['entries'][0]['rawOutputSha256']='0'*64
        self.save_run('development');self.save_manifest();self.rejected('Stale raw-line hash')
    def test_stale_review_run_identity(self):
        self.runs['development']['review']['entries'][0]['runIdentity']['configurationHash']='0'*64
        self.save_run('development');self.save_manifest();self.rejected('Stale run identity')
    def test_duplicate_case_mode_cannot_replace_coverage(self):
        self.runs['holdout']['rows'][1]=self.runs['holdout']['rows'][0]
        self.save_run('holdout');self.save_manifest();self.rejected('Duplicate final holdout raw')
    def test_included_file_and_directory_symlinks_rejected(self):
        for name in ('leak.txt','leak-dir'):
            with self.subTest(name=name):
                target=self.base/'outside';target.mkdir(exist_ok=True)
                link=self.root/name;link.symlink_to(target if name.endswith('dir') else self.root/'README.md')
                self.rejected('Symlink');link.unlink()
    def test_manifest_directory_symlink_rejected_before_read(self):
        target=self.root/'evidence/v1.3/holdout-fixture'; link=self.root/'evidence/v1.3/alias';link.symlink_to(target)
        self.manifest['holdout']['directory']='evidence/v1.3/alias';self.save_manifest();self.rejected('Symlink')
    def test_credential_and_database_names_rejected(self):
        for name in ('.env','.env.production','credentials.json','client_secret_demo.json','private.key','tracelearn.sqlite','tracelearn.sqlite-wal','state.db-shm'):
            with self.subTest(name=name):
                self.put(name,'SYNTHETIC_ONLY');self.rejected('credential or runtime database');(self.root/name).unlink()
    def test_source_mutation_aborts_staged_zip_and_preserves_previous_files(self):
        self.put('MANIFEST.sha256','PREVIOUS_MANIFEST\n');self.out.write_bytes(b'PREVIOUS_ARCHIVE')
        original=zipfile.ZipFile.open; changed=False
        def mutate(archive,name,mode='r',*args,**kwargs):
            nonlocal changed
            if mode=='w' and getattr(name,'filename','')=='TraceLearn/README.md' and not changed:
                changed=True;self.put('README.md','Changed during archive write.\n')
            return original(archive,name,mode,*args,**kwargs)
        with patch.object(zipfile.ZipFile,'open',mutate): self.rejected('File changed while packaging')
        self.assertFalse(list(self.base.glob('.tracelearn-package-*')))
        self.assertFalse(list(self.root.glob('.tracelearn-manifest-*')))

if __name__=='__main__': unittest.main(verbosity=2)
