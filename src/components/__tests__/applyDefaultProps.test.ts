import { applyDefaultProps } from '../applyDefaultProps';

describe('applyDefaultProps', () => {
  it('fills only props that are undefined, like React defaultProps', () => {
    const props = { a: undefined, b: null, c: false, d: 0, e: 'set' } as Record<string, unknown>;
    const defaults = { a: 1, b: 2, c: true, d: 4, e: 'default', f: 'added' };
    expect(applyDefaultProps(props, defaults)).toEqual({ a: 1, b: null, c: false, d: 0, e: 'set', f: 'added' });
  });

  it('does not mutate the props object', () => {
    const props = { a: undefined } as { a?: number };
    applyDefaultProps(props, { a: 1 });
    expect(props.a).toBeUndefined();
  });
});
