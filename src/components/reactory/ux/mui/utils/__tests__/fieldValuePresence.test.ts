import { fieldHasValue } from '../fieldValuePresence';

describe('fieldHasValue', () => {
  it('treats null and undefined as empty', () => {
    expect(fieldHasValue(null)).toBe(false);
    expect(fieldHasValue(undefined)).toBe(false);
  });

  it('treats blank strings as empty and content strings as present', () => {
    expect(fieldHasValue('')).toBe(false);
    expect(fieldHasValue('   ')).toBe(false);
    expect(fieldHasValue('2000')).toBe(true);
  });

  it('treats every finite number as present, including zero and negatives', () => {
    // Regression: lodash `isEmpty` returns true for every primitive number,
    // so `isEmpty(2000)` and `isEmpty(0)` are both true. That made a filled
    // numeric field look empty and rendered the label over the value.
    expect(fieldHasValue(2000)).toBe(true);
    expect(fieldHasValue(0)).toBe(true);
    expect(fieldHasValue(-5)).toBe(true);
    expect(fieldHasValue(2000.5)).toBe(true);
  });

  it('treats NaN as empty because the number widget maps it to undefined', () => {
    expect(fieldHasValue(Number.NaN)).toBe(false);
  });

  it('treats booleans as present so a false value is not mistaken for empty', () => {
    // `isEmpty(false)` is true, same trap as numbers.
    expect(fieldHasValue(false)).toBe(true);
    expect(fieldHasValue(true)).toBe(true);
  });

  it('treats empty collections as empty and populated ones as present', () => {
    expect(fieldHasValue([])).toBe(false);
    expect(fieldHasValue({})).toBe(false);
    expect(fieldHasValue([1])).toBe(true);
    expect(fieldHasValue({ a: 1 })).toBe(true);
  });

  it('treats a valid Date as present and an invalid Date as empty', () => {
    expect(fieldHasValue(new Date('2026-01-01T00:00:00Z'))).toBe(true);
    expect(fieldHasValue(new Date('nonsense'))).toBe(false);
  });
});
