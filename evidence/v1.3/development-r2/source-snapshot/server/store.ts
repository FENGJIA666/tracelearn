import Database from 'better-sqlite3';
import {mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {sections,questions,type Course,type Question} from '../content/course.ts';
export const dataDir=process.env.TRACELEARN_DATA||'.local'; mkdirSync(dataDir,{recursive:true});
export const db=new Database(`${dataDir}/tracelearn.sqlite`);
db.pragma('journal_mode = WAL');
db.exec(`CREATE TABLE IF NOT EXISTS courses(id TEXT PRIMARY KEY, data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS questions(id TEXT PRIMARY KEY,data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS attempts(id INTEGER PRIMARY KEY AUTOINCREMENT,courseId TEXT NOT NULL,data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS chats(id INTEGER PRIMARY KEY AUTOINCREMENT,courseId TEXT NOT NULL,data TEXT NOT NULL);`);
export const hash=(s:string|Buffer)=>createHash('sha256').update(s).digest('hex');
export function saveCourse(c:Course){db.prepare('INSERT OR REPLACE INTO courses VALUES (?,?)').run(c.id,JSON.stringify(c));}
export function getCourse(id:string):Course|undefined{const r=db.prepare('SELECT data FROM courses WHERE id=?').get(id) as {data:string}|undefined; return r?JSON.parse(r.data):undefined;}
export function getCourses():Course[]{return (db.prepare('SELECT data FROM courses ORDER BY rowid').all() as {data:string}[]).map(r=>JSON.parse(r.data));}
export function saveQuestion(q:Question){db.prepare('INSERT OR REPLACE INTO questions VALUES (?,?)').run(q.id,JSON.stringify(q));}
export function getQuestion(id:string):Question|undefined{const r=db.prepare('SELECT data FROM questions WHERE id=?').get(id) as {data:string}|undefined;return r?JSON.parse(r.data):undefined;}
export function listQuestions(id:string){return (db.prepare('SELECT data FROM questions').all() as {data:string}[]).map(r=>JSON.parse(r.data) as Question).filter(q=>q.courseId===id);}
export const publicQuestion=(q:Question)=>({id:q.id,courseId:q.courseId,concept:q.concept,kind:q.kind,prompt:q.prompt,promptZh:q.promptZh,options:q.options,optionsZh:q.optionsZh,pairedId:q.pairedId});
export const publicCourse=(c:Course)=>({...c,sections:c.sections.map(({vector,...s})=>s)});
export function history(id:string){return {attempts:(db.prepare('SELECT data FROM attempts WHERE courseId=? ORDER BY id').all(id) as {data:string}[]).map(r=>JSON.parse(r.data)),chats:(db.prepare('SELECT data FROM chats WHERE courseId=? ORDER BY id').all(id) as {data:string}[]).map(r=>JSON.parse(r.data))};}
if(!getCourse('database-foundations'))saveCourse({id:'database-foundations',title:'Database foundations',subtitle:'From confident guesses to grounded understanding.',builtin:true,createdAt:new Date().toISOString(),hash:hash(JSON.stringify(sections)),sections});
for(const q of questions)saveQuestion(q);
