import test from 'node:test';
import assert from 'node:assert/strict';
import {aiReportLines} from '../server/report.ts';
const base={question:'Question',answer:'No explanation accepted.',model:'local',elapsedMs:1,insufficient:true,citations:[]};
test('export separates failed checks from source absence and preserves legacy status',()=>{
 const unverified=aiReportLines({...base,support:{outcome:'unverified',disclosure:'Automated only.',claims:[]}}).join('\n');
 assert.match(unverified,/source sufficiency was not established/);
 assert.doesNotMatch(unverified,/insufficient evidence: true/);
 const missing=aiReportLines({...base,support:{outcome:'insufficient',disclosure:'Automated only.',claims:[]}}).join('\n');
 assert.match(missing,/judged insufficient by the local model/);
 assert.match(aiReportLines(base).join('\n'),/Legacy model insufficient flag: true/);
});
