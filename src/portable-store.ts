import {questions, sections, type Course} from '../content/course';
import data from './generated/review-data.json';

export type PortableAttempt = {
  id: string; questionId: string; concept: string; kind: string; prompt: string; options: string[];
  chosen: number; correct: number; isCorrect: boolean; confidence: 'unsure'|'somewhat'|'sure';
  explanation: string; misconception: string; sourceIds: string[]; sourceHash: string; createdAt: string;
};
export const portableCourse: Course = {
  id: 'database-foundations', title: 'Database foundations', subtitle: 'Trace the source. Test the idea again.',
  hash: data.courseHash, builtin: true, sections, createdAt: '2026-09-14T00:00:00.000Z'
};
export function gradePortable(body: unknown): PortableAttempt {
  const b = body as {questionId?: string; chosen?: number; confidence?: PortableAttempt['confidence']};
  const q = questions.find(q => q.id === b?.questionId);
  if (!q || !Number.isInteger(b.chosen) || b.chosen! < 0 || b.chosen! > 3 || !['unsure','somewhat','sure'].includes(b.confidence!)) {
    throw new Error('Please choose a valid question, answer and confidence.');
  }
  return {
    id: crypto.randomUUID(), questionId: q.id, concept: q.concept, kind: q.kind, prompt: q.prompt, options: q.options,
    chosen: b.chosen!, correct: q.correct, isCorrect: b.chosen === q.correct, confidence: b.confidence!,
    explanation: q.explanation, misconception: q.misconceptions[b.chosen!] || '', sourceIds: q.sourceIds,
    sourceHash: portableCourse.hash, createdAt: new Date().toISOString()
  };
}
export function readPortableAttempts(raw: string | null): PortableAttempt[] {
  try {
    const parsed: unknown = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(a => a && questions.some(q => q.id === a.questionId) &&
      typeof a.id === 'string' && typeof a.createdAt === 'string' &&
      Number.isInteger(a.chosen) && a.chosen >= 0 && a.chosen <= 3 &&
      ['unsure','somewhat','sure'].includes(a.confidence)).map(a => {
        const graded = gradePortable(a);
        return {...graded, id: a.id, createdAt: a.createdAt};
      });
  } catch { return []; }
}
export function portableReport(attempts: PortableAttempt[]): string {
  return ['# TraceLearn - Portable practice record', '', `Source SHA-256: ${portableCourse.hash}`,
    'This record contains your real local practice attempts. It is not a validated measure of mastery or learning gains.',
    'Portable mode performs deterministic grading. Evidence separates the current configuration comparison from the original experiment; all AI outputs there are saved records, not live inference.',
    '', ...attempts.flatMap((a, i) => [`## ${i + 1}. ${a.concept} / ${a.kind}`, a.prompt,
      `Chosen: ${a.options[a.chosen]}`, `Correct answer: ${a.options[a.correct]}`,
      `Result: ${a.isCorrect ? 'Correct' : 'Needs review'}; confidence: ${a.confidence}`,
      a.explanation, `Sources: ${a.sourceIds.join(', ')}`, `Time: ${a.createdAt}`, ''])].join('\n');
}
