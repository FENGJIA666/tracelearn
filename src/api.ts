import {portable} from './environment';
import {portableApi} from './portable-api';
export async function api(path:string,body?:unknown,signal?:AbortSignal){if(portable)return portableApi(path,body,signal);const res=await fetch('/api'+path,{method:body?'POST':'GET',headers:body instanceof FormData?{}:{'Content-Type':'application/json'},body:body?(body instanceof FormData?body:JSON.stringify(body)):undefined,signal});if(!res.ok){const j=await res.json();throw new Error(j.error||'Request failed');}return res.json();}
