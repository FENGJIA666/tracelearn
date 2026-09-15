import {useState} from 'react';
import {MessageSquareText} from 'lucide-react';
import {SupportAnswer} from './SupportAnswer';
export function AnswerHistory({chats,zh,onSource}:{chats:any[];zh:boolean;onSource:(id:string)=>void}){
 const [visible,setVisible]=useState(10);
 if(!chats.length)return null;
 const newest=[...chats].reverse();
 return <section className="answer-history"><div className="row"><h3><MessageSquareText size={17}/>{zh?'已保存的本地问答':'Saved local answers'}</h3><span className="badge">{chats.length}</span></div><p className="fineprint">{zh?'重新打开问题和证据，无需再次运行模型。旧版本的回答保留其原有检查状态。':'Reopen the question and its evidence without running the model again. Older answers keep their original check status.'}</p>{newest.slice(0,visible).map((chat,index)=><details key={`${chat.createdAt}-${index}`} className="saved-answer"><summary><span>{chat.question}</span><small>{new Date(chat.createdAt).toLocaleString(zh?'zh-CN':'en-GB',{dateStyle:'medium',timeStyle:'short'})}</small></summary><SupportAnswer result={chat} zh={zh} onSource={onSource}/></details>)}{visible<chats.length&&<button className="secondary" onClick={()=>setVisible(value=>value+10)}>{zh?'查看更早的问答':'Show earlier answers'}</button>}</section>;
}
