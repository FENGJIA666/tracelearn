import {useState} from 'react';
import {ArrowRight, X} from 'lucide-react';
import {preferences} from './environment';

export function QuickRoute({zh,onPractice,onLab,onTransfer,onNotebook}:{zh:boolean;onPractice:()=>void;onLab:()=>void;onTransfer:()=>void;onNotebook:()=>void}) {
  const [open,setOpen]=useState(preferences.get('quick-route')!=='hidden');
  function toggle(value:boolean){setOpen(value);preferences.set('quick-route',value?'open':'hidden')}
  if(!open)return <button className="text-button quick-route-toggle" onClick={()=>toggle(true)}>{zh?'显示快速体验路线':'Show the quick tour'}<ArrowRight size={13}/></button>;
  return <section className="judge-route" aria-label={zh?'快速体验':'Quick tour'}>
    <div className="row"><h2>{zh?'先用一个例子体验完整过程':'Start with one example. Follow the whole loop.'}</h2><button className="text-button" aria-label={zh?'隐藏快速体验':'Hide quick tour'} onClick={()=>toggle(false)}><X size={15}/></button></div>
    <p>{zh?'NULL 为什么被排除？先作答，再改变条件，最后独立复测。所有步骤都可以直接打开。':'Why was NULL excluded? Answer, change the condition, then try a fresh question. Open any step below.'}</p>
    <div className="route-actions">{[[zh?'1 · 预测答案':'1 · Predict',onPractice],[zh?'2 · 改条件验证':'2 · Experiment',onLab],[zh?'3 · 迁移复测':'3 · Transfer',onTransfer],[zh?'4 · 记录与导出':'4 · Reflect & export',onNotebook]].map(([label,action])=><button key={String(label)} onClick={action as ()=>void}>{String(label)}<ArrowRight size={13}/></button>)}</div>
  </section>;
}
