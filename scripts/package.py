from pathlib import Path
import zipfile,hashlib,json
root=Path(__file__).resolve().parent.parent
out=root.parent/'TraceLearn-Complete-v1.2.0.zip'
skip_dirs={'node_modules','.local','dist','.git','pdf-render','__pycache__'}
skip_names={'desktop-ai-viewport.png','responsive-1024.png','cover-layout.pdf','probe-generation.ts','quality-probe.ts'}
allowed_logs={'unit-tests.log','build.log'}
files=[]
for p in sorted(root.rglob('*')):
 rel=p.relative_to(root)
 if not p.is_file() or any(x in skip_dirs for x in rel.parts) or p.name in skip_names or p.name=='.DS_Store':continue
 if p.suffix=='.log' and p.name not in allowed_logs:continue
 if p.name=='MANIFEST.sha256':continue
 files.append(p)
manifest='\n'.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.relative_to(root).as_posix() for p in files)+'\n'
(root/'MANIFEST.sha256').write_text(manifest)
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=8) as z:
 for p in files+[root/'MANIFEST.sha256']:z.write(p,'TraceLearn/'+p.relative_to(root).as_posix())
print(json.dumps({'archive':str(out),'bytes':out.stat().st_size,'files':len(files)+1,'sha256':hashlib.sha256(out.read_bytes()).hexdigest()},indent=2))
