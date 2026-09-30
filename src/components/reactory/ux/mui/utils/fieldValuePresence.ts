import { isEmpty } from 'lodash';

/**
 * Reports whether a form field currently holds a value the user has entered.
 *
 * This is the single source of truth for the "is this field filled?" question
 * that drives two tightly-coupled MUI behaviours on an `outlined` field:
 *
 *   1. the field label is lifted (shrunk) into the notch MUI cuts in the
 *      fieldset border, and
 *   2. the notch itself is cut (the `notched` prop on `OutlinedInput`).
 *
 * If those two disagree - label resting while the border is notched, or vice
 * versa - the label renders straight over the value. Deriving both from this
 * helper keeps them in step.
 *
 * `lodash.isEmpty` must NOT be used directly for this: it only inspects the own
 * enumerable keys of collections, so it reports `true` for **every** primitive
 * number and boolean (both `isEmpty(2000)` and `isEmpty(0)` are `true`). Using
 * it made a filled numeric field look empty, which is exactly how the label
 * ended up drawn on top of the value.
 *
 * Rules:
 *  - `null` / `undefined`              -> empty
 *  - `""` or whitespace-only string    -> empty
 *  - `NaN` / invalid `Date`            -> empty
 *  - empty array / object / map / set  -> empty
 *  - `0`, `false`, any other scalar    -> present
 */
export const fieldHasValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (typeof value === 'number') return Number.isNaN(value) === false;
  if (typeof value === 'boolean') return true;
  if (value instanceof Date) return Number.isNaN(value.getTime()) === false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return isEmpty(value) === false;
  return true;
};

export default fieldHasValue;
