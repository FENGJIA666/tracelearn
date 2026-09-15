export type ReviewQuestion = {id: string; concept: string; kind: string; pairedId?: string};
export type ReviewAttempt = {questionId: string; isCorrect: boolean; confidence: string};
export type ReviewItem = {questionId: string; concept: string; reason: 'confident-mistake' | 'revisit' | 'transfer'; priority: number};

// Uses the latest attempt on each question. This is a transparent study heuristic,
// not a mastery score, a diagnosis, or a claim that the learner improved.
export function reviewPlan(questions: ReviewQuestion[], attempts: ReviewAttempt[]): ReviewItem[] {
  const latest = new Map(attempts.map(a => [a.questionId, a]));
  const result: ReviewItem[] = [];
  for (const q of questions.filter(q => q.kind !== 'transfer')) {
    const initial = latest.get(q.id);
    const transfer = q.pairedId ? latest.get(q.pairedId) : undefined;
    const wrong = [[q.id, initial], [q.pairedId, transfer]] as const;
    const mistakes = wrong.filter(([id, a]) => id && a && !a.isCorrect)
      .sort((a, b) => Number(b[1]?.confidence === 'sure') - Number(a[1]?.confidence === 'sure'));
    if (mistakes.length) {
      const [id, attempt] = mistakes[0];
      const confident = attempt?.confidence === 'sure';
      result.push({questionId: id!, concept: q.concept, reason: confident ? 'confident-mistake' : 'revisit', priority: confident ? 0 : 1});
    } else if (initial && q.pairedId && !transfer) {
      result.push({questionId: q.pairedId, concept: q.concept, reason: 'transfer', priority: 2});
    }
  }
  return result.sort((a, b) => a.priority - b.priority);
}
