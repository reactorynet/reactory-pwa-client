/**
 * Tests for the useSchema hook.
 * Verifies schema retrieval, resolution, and transformation logic.
 */
import { renderHook } from '@testing-library/react-hooks';
import { useSchema } from '../useSchema';
import { createMockReactorySDK } from '../../__tests__/mockReactory';
import { DefaultLoadingSchema } from '../../constants';

// Mock dependencies
const mockReactory = createMockReactorySDK();

jest.mock('@reactory/client-core/api', () => ({
  useReactory: () => mockReactory,
}));

describe('useSchema', () => {
  const defaultFQN = 'test.TestForm@1.0.0';
  const defaultSIGN = 'test.TestForm@1.0.0:test-instance';

  beforeEach(() => {
    jest.clearAllMocks();
    // Set default mock return value for form() to return undefined
    mockReactory.form.mockReturnValue(undefined);
  });

  describe('schema resolution', () => {
    it('returns provided initial schema when available', () => {
      const initialSchema = { type: 'object', properties: { name: { type: 'string' } } };
      
      const { result } = renderHook(() =>
        useSchema({
          schema: initialSchema as any,
          formId: undefined,
          uiSchemaActiveMenuItem: undefined,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        })
      );

      expect(result.current.schema).toEqual(initialSchema);
    });

    it('returns form definition schema when formId is provided', () => {
      const formSchema = { type: 'object', properties: { email: { type: 'string' } } };
      mockReactory.form.mockReturnValue({
        schema: formSchema,
        __complete__: true,
      });

      const { result } = renderHook(() =>
        useSchema({
          formId: 'test.TestForm@1.0.0',
          schema: undefined,
          uiSchemaActiveMenuItem: undefined,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        })
      );

      expect(result.current.schema).toEqual(formSchema);
    });

    it('prefers form definition schema over initial schema', () => {
      const initialSchema = { type: 'object', properties: { name: { type: 'string' } } };
      const formSchema = { type: 'object', properties: { email: { type: 'string' } } };
      
      mockReactory.form.mockReturnValue({
        schema: formSchema,
        __complete__: true,
      });

      const { result } = renderHook(() =>
        useSchema({
          schema: initialSchema as any,
          formId: 'test.TestForm@1.0.0',
          uiSchemaActiveMenuItem: undefined,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        })
      );

      expect(result.current.schema).toEqual(formSchema);
    });

    it('returns DefaultLoadingSchema when no schema provided', () => {
      mockReactory.form.mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useSchema({
          formId: 'test.TestForm@1.0.0',
          schema: undefined,
          uiSchemaActiveMenuItem: undefined,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        })
      );

      expect(result.current.schema).toEqual(DefaultLoadingSchema);
    });
  });

  describe('busy state', () => {
    it('sets busy to false when form definition is complete', () => {
      mockReactory.form.mockReturnValue({
        schema: {},
        __complete__: true,
      });

      const { result } = renderHook(() =>
        useSchema({
          formId: 'test.TestForm@1.0.0',
          schema: undefined,
          uiSchemaActiveMenuItem: undefined,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        })
      );

      expect(result.current.busy).toBe(false);
    });

    it('sets busy to true when form definition is not complete', () => {
      mockReactory.form.mockReturnValue({
        schema: {},
        __complete__: false,
      });

      const { result } = renderHook(() =>
        useSchema({
          formId: 'test.TestForm@1.0.0',
          schema: undefined,
          uiSchemaActiveMenuItem: undefined,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        })
      );

      expect(result.current.busy).toBe(true);
    });

    it('sets busy to false when form definition is undefined', () => {
      mockReactory.form.mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useSchema({
          formId: 'test.TestForm@1.0.0',
          schema: undefined,
          uiSchemaActiveMenuItem: undefined,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        })
      );

      expect(result.current.busy).toBe(false);
    });

    it('sets busy to true when form definition __complete__ is falsy', () => {
      mockReactory.form.mockReturnValue({
        schema: {},
        __complete__: false,
      });

      const { result } = renderHook(() =>
        useSchema({
          formId: 'test.TestForm@1.0.0',
          schema: undefined,
          uiSchemaActiveMenuItem: undefined,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        })
      );

      expect(result.current.busy).toBe(true);
    });
  });

  describe('UI schema transformation - merge strategy', () => {
    it('merges uiSchemaActiveMenuItem schema into base schema at top level', () => {
      const baseSchema = {
        type: 'object',
        title: 'Base Form',
        properties: { name: { type: 'string' }, email: { type: 'string' } },
      };

      const menuSchema = {
        title: 'Updated Form',
        description: 'New description',
      };

      const { result } = renderHook(() =>
        useSchema({
          schema: baseSchema as any,
          formId: undefined,
          uiSchemaActiveMenuItem: {
            schema: menuSchema as any,
            schemaMergeStragegy: 'merge',
          } as any,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        })
      );

      expect((result.current.schema as any).type).toBe('object');
      expect((result.current.schema as any).title).toBe('Updated Form');
      expect((result.current.schema as any).description).toBe('New description');
      expect((result.current.schema as any).properties).toEqual(baseSchema.properties);
    });

    it('applies merge strategy when schemaMergeStragegy is "merge"', () => {
      const baseSchema = { type: 'object', minProperties: 1, title: 'Base' };
      const menuSchema = { minProperties: 2, title: 'Updated' };

      const { result } = renderHook(() =>
        useSchema({
          schema: baseSchema as any,
          formId: undefined,
          uiSchemaActiveMenuItem: {
            schema: menuSchema as any,
            schemaMergeStragegy: 'merge',
          } as any,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        })
      );

      const schema = result.current.schema as any;
      expect(schema.minProperties).toBe(2);
      expect(schema.title).toBe('Updated');
      expect(schema.type).toBe('object');
    });

    it('defaults to merge strategy when schemaMergeStragegy is not specified', () => {
      const baseSchema = { type: 'object', title: 'Base' };
      const menuSchema = { title: 'Menu', minLength: 3 };

      const { result } = renderHook(() =>
        useSchema({
          schema: baseSchema as any,
          formId: undefined,
          uiSchemaActiveMenuItem: {
            schema: menuSchema as any,
            // schemaMergeStragegy not specified - defaults to 'merge'
          } as any,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        })
      );

      const schema = result.current.schema as any;
      expect(schema.title).toBe('Menu');
      expect(schema.minLength).toBe(3);
      expect(schema.type).toBe('object');
    });
  });

  describe('UI schema transformation - replace strategy', () => {
    it('replaces base schema with uiSchemaActiveMenuItem schema', () => {
      const baseSchema = { type: 'object', properties: { name: { type: 'string' } } };
      const menuSchema = { type: 'object', properties: { email: { type: 'string' } } };

      const { result } = renderHook(() =>
        useSchema({
          schema: baseSchema as any,
          formId: undefined,
          uiSchemaActiveMenuItem: {
            schema: menuSchema as any,
            schemaMergeStragegy: 'replace',
          } as any,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        })
      );

      expect(result.current.schema).toEqual(menuSchema);
      expect((result.current.schema as any).properties).not.toHaveProperty('name');
      expect((result.current.schema as any).properties).toHaveProperty('email');
    });

    it('completely replaces when strategy is "replace"', () => {
      const baseSchema = { type: 'object', title: 'Base', description: 'Base form' };
      const menuSchema = { type: 'object', title: 'Menu', examples: [{}] };

      const { result } = renderHook(() =>
        useSchema({
          schema: baseSchema as any,
          formId: undefined,
          uiSchemaActiveMenuItem: {
            schema: menuSchema as any,
            schemaMergeStragegy: 'replace',
          } as any,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        })
      );

      expect(result.current.schema).toEqual(menuSchema);
    });
  });

  describe('UI schema transformation - remove strategy', () => {
    it('removes top-level properties specified in uiSchemaActiveMenuItem schema', () => {
      const baseSchema = {
        type: 'object',
        title: 'Base',
        name: { type: 'string' },
        email: { type: 'string' },
        age: { type: 'number' },
      };

      const menuSchema = {
        email: {},
        age: {},
      };

      const { result } = renderHook(() =>
        useSchema({
          schema: baseSchema as any,
          formId: undefined,
          uiSchemaActiveMenuItem: {
            schema: menuSchema as any,
            schemaMergeStragegy: 'remove',
          } as any,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        })
      );

      const schema = result.current.schema as any;
      expect(schema).toHaveProperty('type');
      expect(schema).toHaveProperty('title');
      expect(schema).toHaveProperty('name');
      expect(schema).not.toHaveProperty('email');
      expect(schema).not.toHaveProperty('age');
    });

    it('keeps properties not listed in removal schema', () => {
      const baseSchema = {
        type: 'object',
        title: 'Form',
        description: 'Test',
        a: { type: 'string' },
        b: { type: 'string' },
        c: { type: 'string' },
      };

      const menuSchema = {
        b: {},
      };

      const { result } = renderHook(() =>
        useSchema({
          schema: baseSchema as any,
          formId: undefined,
          uiSchemaActiveMenuItem: {
            schema: menuSchema as any,
            schemaMergeStragegy: 'remove',
          } as any,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        })
      );

      const schema = result.current.schema as any;
      expect(schema).toHaveProperty('a');
      expect(schema).not.toHaveProperty('b');
      expect(schema).toHaveProperty('c');
      expect(schema.type).toBe('object');
      expect(schema.title).toBe('Form');
    });

    it('preserves non-removed fields when removing', () => {
      const baseSchema = {
        type: 'object',
        title: 'Original Title',
        required: ['name'],
        unwantedField: 'remove this',
      };

      const menuSchema = {
        unwantedField: {},
      };

      const { result } = renderHook(() =>
        useSchema({
          schema: baseSchema as any,
          formId: undefined,
          uiSchemaActiveMenuItem: {
            schema: menuSchema as any,
            schemaMergeStragegy: 'remove',
          } as any,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        })
      );

      const schema = result.current.schema as any;
      expect(schema.type).toBe('object');
      expect(schema.title).toBe('Original Title');
      expect(schema.required).toEqual(['name']);
      expect(schema).not.toHaveProperty('unwantedField');
    });
  });

  describe('no uiSchemaActiveMenuItem', () => {
    it('returns base schema when no uiSchemaActiveMenuItem provided', () => {
      const baseSchema = { type: 'object', properties: { name: { type: 'string' } } };

      const { result } = renderHook(() =>
        useSchema({
          schema: baseSchema as any,
          formId: undefined,
          uiSchemaActiveMenuItem: undefined,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        })
      );

      expect(result.current.schema).toEqual(baseSchema);
    });

    it('ignores undefined schema in uiSchemaActiveMenuItem', () => {
      const baseSchema = { type: 'object', properties: { name: { type: 'string' } } };

      const { result } = renderHook(() =>
        useSchema({
          schema: baseSchema as any,
          formId: undefined,
          uiSchemaActiveMenuItem: {
            schema: undefined,
            schemaMergeStragegy: 'merge',
          } as any,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        })
      );

      expect(result.current.schema).toEqual(baseSchema);
    });

    it('ignores null schema in uiSchemaActiveMenuItem', () => {
      const baseSchema = { type: 'object', properties: { name: { type: 'string' } } };

      const { result } = renderHook(() =>
        useSchema({
          schema: baseSchema as any,
          formId: undefined,
          uiSchemaActiveMenuItem: {
            schema: null as any,
            schemaMergeStragegy: 'merge',
          } as any,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        })
      );

      expect(result.current.schema).toEqual(baseSchema);
    });
  });

  describe('form ID changes', () => {
    it('updates schema when formId changes', () => {
      const schema1 = { type: 'object', properties: { name: { type: 'string' } } };
      const schema2 = { type: 'object', properties: { email: { type: 'string' } } };

      mockReactory.form.mockReturnValue({
        schema: schema1,
        __complete__: true,
      });

      const { result, rerender } = renderHook(
        ({ formId }) =>
          useSchema({
            formId,
            schema: undefined,
            uiSchemaActiveMenuItem: undefined,
            FQN: defaultFQN,
            SIGN: defaultSIGN,
          }),
        {
          initialProps: { formId: 'test.Form1@1.0.0' },
        }
      );

      expect(result.current.schema).toEqual(schema1);

      // Update mock for second form
      mockReactory.form.mockReturnValue({
        schema: schema2,
        __complete__: true,
      });

      rerender({ formId: 'test.Form2@1.0.0' });

      expect(result.current.schema).toEqual(schema2);
    });

    it('calls reactory.form() when formId changes', () => {
      mockReactory.form.mockReturnValue({ schema: {}, __complete__: true });

      const { rerender } = renderHook(
        ({ formId }) =>
          useSchema({
            formId,
            schema: undefined,
            uiSchemaActiveMenuItem: undefined,
            FQN: defaultFQN,
            SIGN: defaultSIGN,
          }),
        {
          initialProps: { formId: 'test.Form1@1.0.0' },
        }
      );

      const callCountBefore = mockReactory.form.mock.calls.length;

      rerender({ formId: 'test.Form2@1.0.0' });

      const callCountAfter = mockReactory.form.mock.calls.length;
      expect(callCountAfter).toBeGreaterThan(callCountBefore);
    });
  });

  describe('edge cases', () => {
    it('handles empty schema object', () => {
      const { result } = renderHook(() =>
        useSchema({
          schema: {} as any,
          formId: undefined,
          uiSchemaActiveMenuItem: undefined,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        })
      );

      expect(result.current.schema).toEqual({});
      expect(result.current.busy).toBe(false);
    });

    it('performs shallow merge strategy (not deep)', () => {
      const baseSchema = {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string' },
            },
          },
          age: { type: 'number' },
        },
      };

      const menuSchema = {
        properties: {
          user: {
            properties: {
              phone: { type: 'string' },
            },
          },
        },
      };

      const { result } = renderHook(() =>
        useSchema({
          schema: baseSchema as any,
          formId: undefined,
          uiSchemaActiveMenuItem: {
            schema: menuSchema as any,
            schemaMergeStragegy: 'merge',
          } as any,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        })
      );

      const schema = result.current.schema as any;
      // Shallow merge replaces the entire properties object with the menu's properties
      expect(schema.properties.user.properties).toHaveProperty('phone');
      // name and email are lost due to shallow merge
      expect(schema.properties.user.properties).not.toHaveProperty('name');
      expect(schema.properties.user.properties).not.toHaveProperty('email');
      // age is lost because properties was completely replaced
      expect(schema).not.toHaveProperty('age');
    });

    it('handles multiple removal at top level', () => {
      const baseSchema = {
        type: 'object',
        a: { type: 'string' },
        b: { type: 'string' },
        c: { type: 'string' },
        d: { type: 'string' },
      };

      const menuSchema = {
        a: {},
        c: {},
      };

      const { result } = renderHook(() =>
        useSchema({
          schema: baseSchema as any,
          formId: undefined,
          uiSchemaActiveMenuItem: {
            schema: menuSchema as any,
            schemaMergeStragegy: 'remove',
          } as any,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        })
      );

      const schema = result.current.schema as any;
      expect(schema).not.toHaveProperty('a');
      expect(schema).toHaveProperty('b');
      expect(schema).not.toHaveProperty('c');
      expect(schema).toHaveProperty('d');
      expect(schema.type).toBe('object');
    });

    it('returns DefaultLoadingSchema as fallback for undefined schema', () => {
      mockReactory.form.mockReturnValue(null);

      const { result } = renderHook(() =>
        useSchema({
          schema: undefined,
          formId: 'non.existent@1.0.0',
          uiSchemaActiveMenuItem: undefined,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        })
      );

      expect(result.current.schema).toEqual(DefaultLoadingSchema);
    });
  });

  describe('return value structure', () => {
    it('returns object with schema and busy properties', () => {
      const { result } = renderHook(() =>
        useSchema({
          schema: {} as any,
          formId: undefined,
          uiSchemaActiveMenuItem: undefined,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        })
      );

      expect(result.current).toHaveProperty('schema');
      expect(result.current).toHaveProperty('busy');
      expect(Object.keys(result.current)).toHaveLength(2);
    });

    it('schema property is an object', () => {
      const { result } = renderHook(() =>
        useSchema({
          schema: { type: 'object' } as any,
          formId: undefined,
          uiSchemaActiveMenuItem: undefined,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        })
      );

      expect(typeof result.current.schema).toBe('object');
    });

    it('busy property is a boolean', () => {
      const { result } = renderHook(() =>
        useSchema({
          schema: {} as any,
          formId: undefined,
          uiSchemaActiveMenuItem: undefined,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        })
      );

      expect(typeof result.current.busy).toBe('boolean');
    });
  });
});
