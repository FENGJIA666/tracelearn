"""Render the current report from complete saved evidence, never rerun or rescore it."""
from pathlib import Path
import hashlib, html, json, math, statistics
from datetime import datetime
from zoneinfo import ZoneInfo
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle, PageBreak
from PIL import Image as PILImage

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'submission'
manifest = json.loads((ROOT / 'evidence/v1.3/final-manifest.json').read_text())
assert manifest['version'] == '1.3.0'

def load_run(name):
    spec = manifest[name]
    directory = ROOT / spec['directory']
    raw = (directory / 'raw-results.jsonl').read_bytes()
    review_bytes = (directory / 'semantic-review.json').read_bytes()
    assert hashlib.sha256(raw).hexdigest() == spec['rawSha256']
    assert hashlib.sha256(review_bytes).hexdigest() == spec['semanticReviewSha256']
    records = [json.loads(line) for line in raw.splitlines() if line.strip()]
    review = json.loads(review_bytes)
    assert len(records) == 80 and len(review['entries']) == 80
    assert len({(r['caseId'], r['mode']) for r in records}) == 80
    assert {r['split'] for r in records} == {name}
    assert {(e['caseId'], e['variant']) for e in review['entries']} == {(r['caseId'], r['mode']) for r in records}
    assert review['independentHumanReview'] is False
    return records, review['entries']

runs = {name: load_run(name) for name in ('development', 'holdout')}
INK = colors.HexColor('#234237'); MUTED = colors.HexColor('#687b6d'); LINE = colors.HexColor('#dce3d2')
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='TitleTL',fontName='Times-Roman',fontSize=31,leading=35,textColor=INK,spaceAfter=15))
styles.add(ParagraphStyle(name='HeadingTL',fontName='Helvetica-Bold',fontSize=15,leading=20,textColor=INK,spaceBefore=12,spaceAfter=9,keepWithNext=True))
styles.add(ParagraphStyle(name='BodyTL',fontName='Helvetica',fontSize=10,leading=14.5,textColor=INK,spaceAfter=9))
styles.add(ParagraphStyle(name='SmallTL',fontName='Helvetica',fontSize=8,leading=11,textColor=MUTED,spaceAfter=7))
styles.add(ParagraphStyle(name='CodeTL',fontName='Courier',fontSize=8,leading=11,textColor=INK,spaceAfter=8))
story=[]
def p(text, style='BodyTL'): story.append(Paragraph(text,styles[style]))
def h(text): p(text,'HeadingTL')
def page(): story.append(PageBreak())
def photo(name,width=499):
    path=OUT/name
    if not path.exists(): raise FileNotFoundError(path)
    with PILImage.open(path) as im: height=width*im.height/im.width
    if height>320: width*=320/height; height=320
    story.append(Image(str(path),width=width,height=height,hAlign='LEFT'));story.append(Spacer(1,9))
def table(rows,widths):
    t=Table([[Paragraph(html.escape(str(v)),styles['SmallTL']) for v in row] for row in rows],colWidths=widths,repeatRows=1)
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#e4ecda')),('VALIGN',(0,0),(-1,-1),'TOP'),('BOTTOMPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),8),('LINEBELOW',(0,0),(-1,0),1,LINE),('LINEBELOW',(0,1),(-1,-1),.4,LINE)]))
    story.append(t);story.append(Spacer(1,10))
def footer(canvas,doc):
    canvas.setStrokeColor(LINE);canvas.line(48,42,547,42)
    canvas.setFillColor(MUTED);canvas.setFont('Helvetica',8)
    canvas.drawString(48,29,'TraceLearn / Technical & Evaluation Report / v1.3.0')
    canvas.drawRightString(547,29,str(doc.page))
def metrics(split):
    records, reviews = runs[split]
    rows=[['Saved technical result','Previous configuration','Current configuration']]
    groups={mode:[r for r in reviews if r['variant']==mode] for mode in ('frozen-grounded','supported')}
    for label,fn in [
        ('Strict task correctness',lambda r: f"{sum(e['taskCorrect'] for e in r)}/{len(r)}"),
        ('Unsupported accepted outputs',lambda r: f"{sum(e['unsupportedAccepted'] is True for e in r)}/{sum(e['disposition'].startswith('delivered-') for e in r)} confirmed" + (f"; {sum(e['unsupportedAccepted'] is None for e in r)} unresolved" if any(e['unsupportedAccepted'] is None for e in r) else '')),
        ('Unresolved semantic judgments',lambda r: str(sum('needs-adjudication' in e['failureFlags'] for e in r))),
        ('No delivered answer or refusal',lambda r: f"{sum(not e['disposition'].startswith('delivered-') for e in r)}/{len(r)}"),
        ('Citation validity among delivered answers',lambda r: f"{sum(e['evidenceValid'] is True for e in r if e['disposition']=='delivered-answer')}/{sum(e['disposition']=='delivered-answer' for e in r)}")]:
        rows.append([label,*[fn(groups[m]) for m in groups]])
    times={mode:sorted(r['wallMs'] for r in records if r['mode']==mode) for mode in groups}
    rows.append(['Median wall time',*[f'{statistics.median(v)/1000:.2f} s' for v in times.values()]])
    rows.append(['95th percentile wall time',*[f'{v[math.ceil(.95*len(v))-1]/1000:.2f} s' for v in times.values()]])
    return rows

m=manifest['model']; checks=manifest['verification']
p('TRACELEARN / ML EMPOWERMENT BUILD CHALLENGE 3.0','SmallTL')
p('Learning that can<br/>show its work.','TitleTL')
p('A private local learning workspace connecting source evidence, editable concept experiments and fresh transfer practice.')
photo('13-supported-answer.jpg')
p('Version 1.3.0. The actual application displays one accepted conclusion with up to two exact source excerpts. This screenshot is scripted software acceptance, not a study participant.','SmallTL')
p('This report describes a working application and author-created technical evaluations. It makes no claim of improved grades, validated mastery, independent human assessment, user adoption or competition ranking.','SmallTL')
p('Source and downloads: <link href="https://github.com/FENGJIA666/tracelearn/releases/tag/v1.3.0">github.com/FENGJIA666/tracelearn / v1.3.0</link>','SmallTL')

page();h('1. A learning loop, not just an explanation')
p('Fluent text can feel familiar without demonstrating that a learner can use a concept. TraceLearn asks a prediction, grades against an original fixed answer key, links the relevant source passage, and offers a fresh transfer question. A wrong option suggests a possible misconception; it does not diagnose a person or establish durable learning.')
p('The first scenario is SQL NULL: predict which rows survive value &lt;&gt; 100, inspect TRUE/FALSE/UNKNOWN, change the condition to include missing values, then answer a related question independently. The Counterexample Lab also computes attribute closure and checks candidate-key minimality under explicitly shown dependencies.')
photo('11-key-minimality.jpg')
p('Counterexample Lab from the previous verified release; the underlying SQL and closure computations are preserved in v1.3. Navigation now matches the selected concept and restores its source on refresh.','SmallTL')
table([['Three-minute judge route','Action'],['Predict','Choose an answer and confidence; open the referenced passage.'],['Change the conditions','Edit SQL values or key attributes; compare the computed trace with your prediction.'],['Transfer','Open the concept-matched fresh question, without revealing an earlier answer.'],['Reflect','Reopen saved local answers and their evidence; export quiz and AI history.']],[140,359])

page();h('2. Current implementation')
table([['Layer','Implementation'],['Interface','React + TypeScript; English/Chinese controls; desktop and narrow layouts; cancellation and recovery.'],['Local service and storage','Node.js / Express on 127.0.0.1; SQLite source hashes, vectors, questions, attempts and chats.'],['Documents','Text PDF, UTF-8 Markdown and TXT; 10 MB per file. PDF: 50 pages; Markdown/TXT: 175,000 UTF-16 code units. Exact source IDs, locations and file SHA-256.'],['Retrieval','Top five passages ranked by 0.75 cosine similarity + 0.25 token overlap, with local embeddings.'],['Runtime models',f"{m['name']} for answers and cloze distractors; {m['embeddingName']} for embeddings. Ollama {m['ollamaVersion']}."],['Answer configuration',f"Temperature 0, seed 42, context {m['options']['num_ctx']}, output cap {m['options']['num_predict']}; think:false and truncate:false. Exact parameters and model digests accompany the source."],['Practice','20 original passages, 10 diagnostic/transfer pairs; fixed grading. Imported-note practice uses source-derived cloze answers.']],[126,373])
h('One-conclusion evidence pipeline')
p('The server enumerates literal excerpts with original UTF-16 offsets. The model selects at most two excerpt IDs for one concise conclusion; it cannot write the quotation text. The server resolves IDs, checks schema and exact location, then makes a separate call to the same local model to assess answerability, every clause and source attribution, its own citations and coverage of applicable conditions. Only the accepted conclusion forms the final answer.')
p('The app distinguishes an accepted answer, source insufficiency and an unverified response. A second draft/review attempt is allowed: at most four model calls and 180 seconds across retrieval and generation. Long input must fail explicitly instead of silently losing context. These controls improve inspectability; the same model can still make correlated drafting and review mistakes.')

page();h('3. Source recall and local operation')
p('For imported notes, a deterministic planner selects an unused source sentence and an exact phrase as the answer. The local model supplies three distractors; the keyed option must reconstruct the original sentence. Duplicate wording and the explicit SQL non-NULL alias family are rejected, with at most one dedicated quality repair after the two-call base generator. This remains verbatim source recall, not a validated semantic discrimination or transfer assessment.')
p('The learning notebook reopens saved question/claim/citation records without rerunning inference. Older records retain their original quote-only check status. Exports preserve each claim-to-quote relationship and distinguish an unsuccessful check from a finding of source insufficiency.')
h('Run it locally')
p('npm run setup<br/>npm start<br/>http://127.0.0.1:4317','CodeTL')
p(f"Node.js 22.13+ and Ollama 0.34.0+ are required; setup checks the Ollama minimum for tested chat truncate:false behavior. Initial downloads of the two application models total approximately {m['downloadBytes']/1e9:.2f} GB, plus packages. No API key, paid inference service, user account, CDN, external font or hosted model is required. Once installed, inference and study material remain on the computer. Exact tested model digests are checked by setup; weights are downloaded separately. Reproducing the frozen comparison additionally needs ollama pull qwen3:4b (about 2.5 GB), not required for normal application use.")
p('The Mac launcher rebuilds this copy and compares installation/build identity before reusing a server. It selects another local port for a different copy or stale build. Portable practice separately provides the original course, deterministic experiments, recorded evidence and exports without installing Node.js or models; live AI and importing require the full application.')
h('Measured runtime boundary')
offline=checks['offline']
p(f"On Apple M4 Pro with 24 GB memory, a process policy denying outbound network except localhost allowed real inference. After restarting Ollama, the measured request took {offline['coldMs']/1000:.2f} s; the warm repeat took {offline['warmMs']/1000:.2f} s. The cold request used fresh isolated storage with no cached passage vectors; the warm request repeated it after the first completed request. Ollama reported {offline['allocatedBytes']/1e9:.2f} GB allocated across the loaded production models; this is a snapshot, not peak whole-system memory.")
p('This verifies the app and model process boundary after installation; it does not claim that the whole computer or browser network was disconnected. macOS is the tested platform; Windows/Linux and direct file:// automation remain unverified. Portable static HTTP operation was checked.','SmallTL')

page();h('4. New evaluation: freeze before opening the holdout')
p('Version 1.3 adds 80 original cases based on four small fictional source documents: database rules, library policy, laboratory procedure and a shuttle timetable. Each 40-case split contains 16 source-answerable questions, 12 unanswerable questions and 12 contradicted-premise questions, with 20 English and 20 Chinese prompts. Developer and holdout questions share documents and themes; this is not generalization to unseen domains.')
p('The dataset author prepared and locked both splits. The root implementation process did not open the sealed holdout before freezing the selected pipeline, model identities, explicit options, runner and scoring protocol. The runner rejects mismatched configurations before opening a holdout path. Agents share a filesystem, so this is procedural isolation rather than cryptographic blinding. The scoring agent also authored the dataset: review is not independent or blinded.')
p('The comparator is the previous production grounded-answer configuration, using Qwen3-4B and its original quote validator. The current configuration changes the model and answer pipeline. Both use the same source material, questions and hybrid retriever. Results compare complete configurations; they do not isolate the effect of model weights or the review call. The older full-source-versus-retrieval experiment remains separate.')
p('Strict task correctness requires a complete source-consistent answer and valid evidence, or a justified refusal under the saved protocol. No-answer errors and unverified outputs stay in the denominator. Correct numbers paired with unsupported claims or wrong citations do not count as fully correct. Runtime self-review labels are not the scoring authority.')
h('Held-out results: 40 questions, 80 requests')
table(metrics('holdout'),[225,137,137])
p('Percentile uses the nearest-rank method. Times include retrieval and retries; model loading and other local work can affect latency. Unresolved judgments remain incorrect in strict totals; an unresolved unsupported-claim judgment is shown separately instead of counted as a confirmed error or as zero. Small samples do not establish educational effectiveness.','SmallTL')

page();h('5. Inspect every accepted answer and failure')
photo('14-current-evidence.jpg')
p('The recorded-evidence view displays the question, reference, both final outputs, actual selected quotations, full retrieved inputs and saved Codex-assisted scoring reasons. It is explicitly labeled as a recorded run, not live AI.','SmallTL')
h('Development results: 40 questions, 80 requests')
table(metrics('development'),[225,137,137])
p('Development prefixes and targeted probes were used to change the implementation and select the local model. They remain in evidence/v1.3, including unsuccessful attempts. They are not new test sets or independent repeated trials. Only the recorded final development configuration and the one-shot held-out comparison appear in the tables above.')

page();h('6. Verification and remaining limitations')
table([['Boundary','Current evidence'],['Automated checks',f"{checks['automatedTestCount']} tests passed; {checks['httpChecks']} additional isolated HTTP checks. Final production and portable builds completed."],['Actual browser',checks['browserSummary']],['Controlled UI',checks['controlledUiSummary']],['Local AI',checks['localAiSummary']],['Network boundary',checks['offlineSummary']],['Packaging',checks['packageSummary']]],[132,367])
p('The original SQL simulator has 1,600 row-result comparisons against SQLite. Candidate-key results were checked for every subset of both example schemas against a separately implemented finite-relation oracle. These are independent computational checks of bounded code, not independent human evaluation of learning.')
h('What this evidence does not establish')
p('Exact source selection prevents invented quote text but cannot prove an interpretation. Same-model review may accept an incorrect claim or reject a correct one. Retrieval can omit needed passages. Source recall can still contain semantically weak distractors beyond the explicit alias checks. Prompt-injection resistance is bounded by representative tests, not a universal guarantee.')
p('OCR, arbitrary SQL execution, multi-user accounts and public inference hosting are outside scope. PDF reading order can be imperfect. Fixed practice correctness is not psychometric mastery. There were no consented student participants, delayed retention measurements or measured grade gains. No contest score or rank has been observed.')
h('A preserved historical baseline')
p('The original v1.0 experiment contains 80 cases and 160 requests comparing full-source input with hybrid retrieval under the same Qwen3-4B pipeline. Its data, original course and server/ai.ts remain unchanged. Versions 1.1/1.2 added portable access and deterministic experiments without rewriting those scores. Historical measurements are never presented as current-model evidence.')

page();h('7. Contribution, licenses and sources')
p('Codex substantially assisted with product design, implementation, original teaching and evaluation content, debugging, visual work, testing, release preparation and documentation. Local Qwen models produce runtime responses. Dataset author and semantic reviewer are the same Codex-assisted process; this is explicitly not independent human validation. The organizer has not provided separate approval of AI-assisted code authorship; no such permission is claimed.')
p('Original application code and course materials are MIT-licensed. Qwen model weights use Apache-2.0 and are obtained separately. Exact locked dependency notices and model links appear in THIRD-PARTY-NOTICES.md. Study material is stored locally; no personal runtime database or user credentials are included in the package.')
h('Reproduce and audit')
p('evaluation-v13/ contains locked sources, cases and the scoring protocol. Each final run retains raw JSONL, HTTP model requests/responses, source snapshots, timings, model options and per-output judgments. The final manifest binds the files by SHA-256. Model-produced review rationales and Codex-assisted evaluation judgments are stored separately.','SmallTL')

h('Primary technical references')
for label,url in [
 ('Ollama model and model-weight license',f"https://ollama.com/library/{m['name']}"),
 ('Local embedding model','https://ollama.com/library/qwen3-embedding:0.6b'),
 ('Ollama 0.34 request and truncation handling','https://github.com/ollama/ollama/blob/v0.34.0/server/routes.go'),
 ('SQL comparison predicates','https://www.postgresql.org/docs/current/functions-comparison.html'),
 ('SQL aggregate functions','https://www.postgresql.org/docs/current/functions-aggregate.html'),
 ('SQL table expressions and outer joins','https://www.postgresql.org/docs/current/queries-table-expressions.html'),
 ('Competition rules','https://ml-build-challenge-3.devpost.com/rules'),
 ('Public submission','https://devpost.com/software/tracelearn-learning-that-can-show-its-work')]:
 p(f'{html.escape(label)}: <link href="{html.escape(url)}">{html.escape(url)}</link>','SmallTL')
h('Current provenance')
p('The complete release links source code, a portable practice file, this report, model settings, raw evaluations and reproducible acceptance records. The submitted project is updated in place; final submission state is verified separately from local preparation.')
p('Report generated from saved evidence on '+datetime.now(ZoneInfo('Asia/Singapore')).strftime('%d %B %Y, %H:%M SGT')+'.','SmallTL')
SimpleDocTemplate(str(OUT/'TraceLearn-Technical-Report.pdf'),pagesize=(595.28,841.89),leftMargin=48,rightMargin=48,topMargin=48,bottomMargin=58,title='TraceLearn - Technical and Evaluation Report v1.3.0',author='TraceLearn contributor').build(story,onFirstPage=footer,onLaterPages=footer)
print('Report generated from complete hashed evidence.')
