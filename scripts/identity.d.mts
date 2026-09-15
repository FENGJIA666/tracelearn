export type InstallationIdentity={app:string;version:string;installation:string;build:string};
export function installationIdentity(root?:string):InstallationIdentity;
export function sameIdentity(actual:unknown,expected:InstallationIdentity):boolean;
export function probeIdentity(port:number,timeoutMs?:number):Promise<unknown>;
export function isPortFree(port:number):Promise<boolean>;
export function selectInstallationPort(expected:InstallationIdentity,options?:{start?:number;count?:number;probe?:(port:number)=>Promise<unknown>;free?:(port:number)=>Promise<boolean>}):Promise<{mode:'reuse'|'start';port:number}>;
