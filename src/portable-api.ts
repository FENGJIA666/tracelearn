import {questions} from '../content/course';
import {preferences} from './environment';
import {gradePortable, portableCourse, portableReport, readPortableAttempts} from './portable-store';

const history = () => ({attempts: readPortableAttempts(preferences.get('attempts')), chats: []});
export async function portableApi(path: string, body?: unknown, signal?: AbortSignal) {
  signal?.throwIfAborted();
  if (path === '/status') return {ready: false, mode: 'portable-practice'};
  if (path === '/courses') return [portableCourse];
  if (path === `/courses/${portableCourse.id}/questions`) return questions.map(({correct,explanation,misconceptions,sourceIds,...q}) => q);
  if (path === `/courses/${portableCourse.id}/history`) return history();
  if (path === '/attempt') {
    const attempt = gradePortable(body);
    preferences.set('attempts', JSON.stringify([...history().attempts, attempt]));
    return attempt;
  }
  throw new Error('This operation needs the full local app. Portable practice makes no AI or network requests.');
}
export function downloadPortableReport() {
  const url = URL.createObjectURL(new Blob([portableReport(history().attempts)], {type: 'text/markdown;charset=utf-8'}));
  const a = document.createElement('a'); a.href = url; a.download = 'TraceLearn-portable-learning-report.md';
  a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
