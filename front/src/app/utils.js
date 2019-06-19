/** utils.js
 *  code sraps, front-end helper
 * 
 *  helper functions, but currently uncalled / dead
 * 
 *  functions:
 *  - generatecomb = generates combinatinos of m and n and returns an array,
 *    applying some filter
 * 
 *  called by:
 *    1. TemplateForm.js (not used) *     
 */

export const generateComb = (m, n) => {
  'use strict';
  const comb = (m, n) => combinations(m, enumFromTo(0, n - 1));
  const combinations = (k, xs) =>
    sort(filter(xs => k === xs.length, subsequences(xs)));
  const cons = (x, xs) => [x].concat(xs);
  const enumFromTo = (m, n) =>
    Array.from({
      length: Math.floor(n - m) + 1
    }, (_, i) => m + i);
  const filter = (f, xs) => xs.filter(f);
  const foldr = (f, a, xs) => xs.reduceRight(f, a);
  const isNull = xs => (xs instanceof Array) ? xs.length < 1 : undefined;
  const sort = xs => xs.sort();
  const stringChars = s => s.split('');
  const subsequences = xs => {
    const nonEmptySubsequences = xxs => {
      if (isNull(xxs)) return [];
      const [x, xs] = uncons(xxs);
      const f = (r, ys) => cons(ys, cons(cons(x, ys), r));
      return cons([x], foldr(f, [], nonEmptySubsequences(xs)));
    };
    return nonEmptySubsequences(
      (typeof xs === 'string' ? stringChars(xs) : xs)
    );
  };
  const uncons = xs => xs.length ? [xs[0], xs.slice(1)] : undefined;
  return comb(m, n)
};