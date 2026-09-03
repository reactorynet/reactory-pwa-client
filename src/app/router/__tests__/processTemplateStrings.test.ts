import { processTemplateStrings } from '../processTemplateStrings';
import { createMockReactory } from './testUtils';

describe('processTemplateStrings', () => {
  const reactory = createMockReactory();
  const context = { route: { id: '42' }, query: { q: 'abc' } };

  it('replaces template tokens in strings', () => {
    expect(processTemplateStrings('id=${route.id}', reactory, context)).toBe('id=42');
  });

  it('applies ::toInt, ::toString, ::toBoolean and ::toDate transforms', () => {
    expect(processTemplateStrings('${route.id}::toInt', reactory, context)).toBe(42);
    expect(processTemplateStrings('${route.id}::toString', reactory, context)).toBe('42');
    expect(processTemplateStrings('${route.id}::toBoolean', reactory, context)).toBe(true);
    expect(processTemplateStrings('${route.id}::toDate', reactory, context)).toBeInstanceOf(Date);
    expect(processTemplateStrings('${route.id}::noop', reactory, context)).toBe('42');
  });

  it('walks arrays and objects', () => {
    const result = processTemplateStrings(
      { ids: ['${route.id}::toInt'], nested: { q: '${query.q}' } },
      reactory,
      context,
    ) as { ids: number[]; nested: { q: string } };
    expect(result.ids).toEqual([42]);
    expect(result.nested.q).toBe('abc');
  });

  it('returns primitives unchanged', () => {
    expect(processTemplateStrings(7, reactory, context)).toBe(7);
    expect(processTemplateStrings(null, reactory, context)).toBeNull();
  });

  it('falls back to the original string when templating throws', () => {
    reactory.utils.template = () => () => {
      throw new Error('bad template');
    };
    expect(processTemplateStrings('${broken}', reactory, context)).toBe('${broken}');
  });
});
