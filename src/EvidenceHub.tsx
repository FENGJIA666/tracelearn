import {CurrentEvidence,type CurrentEvidenceData} from './CurrentEvidence';
import {EvidenceLab} from './EvidenceLab';

export type EvidenceExperiment='current'|'original';
export function EvidenceHub({data,onSource,zh,version,onVersionChange}:{data:CurrentEvidenceData;onSource:(id:string)=>void;zh:boolean;version:EvidenceExperiment;onVersionChange:(version:EvidenceExperiment)=>void}){
 return <div className="evidence-hub">
  <div className="evidence-shortcuts" role="group" aria-label={zh?'实验版本':'Experiment version'}>
   <button aria-pressed={version==='current'} onClick={()=>onVersionChange('current')}>{zh?'当前配置 · 新评测':'Current configuration · new evaluation'}</button>
   <button aria-pressed={version==='original'} onClick={()=>onVersionChange('original')}>{zh?'原始实验 · 历史记录':'Original experiment · historical'}</button>
  </div>
  {version==='current'?<CurrentEvidence data={data} zh={zh}/>:<EvidenceLab onSource={onSource} zh={zh}/>}
 </div>;
}
