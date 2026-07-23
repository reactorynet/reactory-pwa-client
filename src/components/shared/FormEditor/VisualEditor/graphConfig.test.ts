import {
  isSimpleObjectMap,
  objectMapToRows,
  rowsToObjectMap,
  pruneEmpty,
  cleanGraphElement,
} from './graphConfig';

describe('objectMap <-> rows', () => {
  it('detects simple (string-valued) maps', () => {
    expect(isSimpleObjectMap({ 'formData.id': 'id' })).toBe(true);
    expect(isSimpleObjectMap({})).toBe(true);
    expect(isSimpleObjectMap(undefined)).toBe(true);
    // transform entry → not simple, must use JSON mode
    expect(isSimpleObjectMap({ a: { key: 'b', transform: 'fn' } })).toBe(false);
    // array (multi-target) entry → not simple
    expect(isSimpleObjectMap({ a: ['b', 'c'] })).toBe(false);
  });

  it('round-trips a simple map through rows', () => {
    const map = { 'formData.id': 'id', 'formContext.mode': 'mode' };
    const rows = objectMapToRows(map);
    expect(rows).toEqual([
      { source: 'formData.id', target: 'id' },
      { source: 'formContext.mode', target: 'mode' },
    ]);
    expect(rowsToObjectMap(rows)).toEqual(map);
  });

  it('ignores non-string entries when producing rows', () => {
    const rows = objectMapToRows({ a: 'b', c: { key: 'x', transform: 'fn' } });
    expect(rows).toEqual([{ source: 'a', target: 'b' }]);
  });

  it('drops rows with an empty source when rebuilding the map', () => {
    expect(rowsToObjectMap([{ source: '', target: 'x' }, { source: 'a', target: 'b' }])).toEqual({ a: 'b' });
  });
});

describe('pruneEmpty', () => {
  it('removes empty strings, nulls, empty objects and arrays but keeps false/0', () => {
    expect(pruneEmpty({
      a: '',
      b: null,
      c: {},
      d: [],
      e: false,
      f: 0,
      g: 'keep',
      h: { nested: '', ok: 1 },
      i: ['', 'x'],
    })).toEqual({ e: false, f: 0, g: 'keep', h: { ok: 1 }, i: ['x'] });
  });

  it('collapses an entirely-empty object to undefined', () => {
    expect(pruneEmpty({ a: '', b: { c: null } })).toBeUndefined();
  });
});

describe('cleanGraphElement', () => {
  it('keeps name/text and prunes empty optional fields', () => {
    const cleaned = cleanGraphElement({
      name: 'loadUser',
      text: 'query { user { id } }',
      queryMessage: '',
      variables: { 'formData.id': 'id' },
      resultMap: {},
      options: { fetchPolicy: '' },
      autoQuery: true,
      throttle: 0,
    });
    expect(cleaned).toEqual({
      name: 'loadUser',
      text: 'query { user { id } }',
      variables: { 'formData.id': 'id' },
      autoQuery: true,
      throttle: 0,
    });
  });

  it('always returns a name and text even when missing', () => {
    expect(cleanGraphElement({})).toEqual({ name: '', text: '' });
  });
});
