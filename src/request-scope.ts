export type ScopedRequest = {signal: AbortSignal; isCurrent: () => boolean};

// Aborting transport is not enough: an already-resolved request can still finish
// its callbacks. The generation check also rejects those late completions.
export function createRequestScope() {
  let generation = 0;
  let controller: AbortController | undefined;
  return {
    begin(): ScopedRequest {
      controller?.abort();
      const current = ++generation;
      const next = new AbortController();
      controller = next;
      return {signal: next.signal, isCurrent: () => generation === current && !next.signal.aborted};
    },
    cancel() {
      generation++;
      controller?.abort();
      controller = undefined;
    }
  };
}

export function availableCourseId(requested: string, courses: {id: string; builtin?: boolean}[]): string {
  return courses.some(course => course.id === requested) ? requested :
    courses.find(course => course.builtin)?.id ?? courses[0]?.id ?? '';
}
