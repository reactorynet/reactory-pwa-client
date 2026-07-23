import {
  cleanRestCall,
  parseBodyValue,
  bodyToText,
  splitOptions,
  mergeOptions,
} from './restConfig';

describe('parseBodyValue / bodyToText', () => {
  it('parses JSON bodies to objects and keeps templates as strings', () => {
    expect(parseBodyValue('{ "a": 1 }')).toEqual({ a: 1 });
    expect(parseBodyValue('${formData.payload}')).toBe('${formData.payload}');
    expect(parseBodyValue('   ')).toBeUndefined();
  });

  it('round-trips a value to text', () => {
    expect(bodyToText({ a: 1 })).toBe('{\n  "a": 1\n}');
    expect(bodyToText('template')).toBe('template');
    expect(bodyToText(undefined)).toBe('');
  });
});

describe('splitOptions / mergeOptions', () => {
  it('splits headers/body from the remaining option keys', () => {
    const { headers, body, other } = splitOptions({
      headers: { Authorization: 'Bearer x' },
      body: { a: 1 },
      credentials: 'include',
    });
    expect(headers).toEqual({ Authorization: 'Bearer x' });
    expect(body).toEqual({ a: 1 });
    expect(other).toEqual({ credentials: 'include' });
  });

  it('merges parts back, dropping empty headers/body', () => {
    expect(mergeOptions({}, undefined, { credentials: 'include' })).toEqual({ credentials: 'include' });
    expect(mergeOptions({ A: '1' }, { x: 1 }, {})).toEqual({ headers: { A: '1' }, body: { x: 1 } });
    expect(mergeOptions({}, '', {})).toEqual({});
  });
});

describe('cleanRestCall', () => {
  it('keeps url/method/options and prunes empty fields', () => {
    const cleaned = cleanRestCall({
      url: '/api/thing',
      method: 'POST',
      provider: '',
      runat: 'client',
      optionsProvider: '',
      options: { headers: { A: '1' }, body: '', extra: 'keep' },
    });
    expect(cleaned).toEqual({
      url: '/api/thing',
      method: 'POST',
      runat: 'client',
      options: { headers: { A: '1' }, extra: 'keep' },
    });
  });

  it('always returns a valid shape (url, method, options object)', () => {
    expect(cleanRestCall({})).toEqual({ url: '', method: 'GET', options: {} });
  });
});
