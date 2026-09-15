import test from 'node:test';
import assert from 'node:assert/strict';
import {availableCourseId, createRequestScope} from '../src/request-scope.ts';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return {promise, resolve, reject};
}

test('an older completion cannot replace a new course response even if transport ignores abort', async () => {
  const scope = createRequestScope();
  const slow = deferred<string>();
  const fast = deferred<string>();
  let shown = '';
  const first = scope.begin();
  const firstDone = slow.promise.then(value => { if (first.isCurrent()) shown = value; });
  const second = scope.begin();
  const secondDone = fast.promise.then(value => { if (second.isCurrent()) shown = value; });
  assert.equal(first.signal.aborted, true);
  fast.resolve('course B'); await secondDone;
  slow.resolve('course A'); await firstDone;
  assert.equal(shown, 'course B');
});

test('cancelled request errors and cleanup cannot clear a newer request busy state', async () => {
  const scope = createRequestScope();
  const oldResponse = deferred<string>();
  const first = scope.begin();
  let busy = true;
  let error = '';
  const oldDone = oldResponse.promise.catch(cause => {
    if (first.isCurrent()) error = cause.message;
  }).finally(() => { if (first.isCurrent()) busy = false; });
  scope.cancel();
  const second = scope.begin();
  oldResponse.reject(new Error('old abort')); await oldDone;
  assert.equal(error, ''); assert.equal(busy, true); assert.equal(second.isCurrent(), true);
  scope.cancel();
  assert.equal(second.signal.aborted, true); assert.equal(second.isCurrent(), false);
});

test('navigation invalidates an already-resolved grading or generation callback', async () => {
  const scope = createRequestScope();
  const request = scope.begin();
  let committed = false;
  const callback = Promise.resolve('saved response').then(() => {
    if (request.isCurrent()) committed = true;
  });
  scope.cancel();
  await callback;
  assert.equal(committed, false);
});

test('remembered missing courses recover to the built-in course without losing a valid selection', () => {
  const courses = [{id: 'imported'}, {id: 'database-foundations', builtin: true}];
  assert.equal(availableCourseId('deleted-import', courses), 'database-foundations');
  assert.equal(availableCourseId('imported', courses), 'imported');
  assert.equal(availableCourseId('missing', [{id: 'only'}]), 'only');
  assert.equal(availableCourseId('missing', []), '');
});
