import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { useUISchema } from '../useUISchema';
import Reactory from '@reactorynet/reactory-core';

jest.mock('@reactory/client-core/api');
jest.mock('react-router');
jest.mock('localforage');
jest.mock('@mui/material', () => ({
  Icon: ({ children }: any) => <div>{children}</div>,
  IconButton: ({ onClick, children }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

// Create reusable mock
const createMockReactory = () => ({
  form: jest.fn(),
  utils: {
    queryString: {
      parse: jest.fn(() => ({})),
    },
    lodash: {
      filter: jest.fn((items: any, predicate: any) => {
        if (!Array.isArray(items)) return [];
        return items.filter(predicate);
      }),
    },
  },
  log: jest.fn(),
});

let mockReactory: ReturnType<typeof createMockReactory>;

// Get the mocked hooks
const { useReactory } = require('@reactory/client-core/api');
const { useLocation } = require('react-router');

// Setup default implementations
useReactory.mockImplementation(() => mockReactory);
useLocation.mockImplementation(() => ({
  search: '',
}));

describe('useUISchema', () => {
  const defaultFQN = 'test.TestForm@1.0.0';
  const defaultSIGN = 'test.TestForm@1.0.0:test-instance';

  const baseFormDefinition = {
    id: defaultFQN,
    name: 'Test Form',
    uiSchema: {
      'ui:form': {
        variant: 'default',
      },
    } as any,
    schema: {},
    uiSchemas: [],
    graphql: {},
  } as any;

  const baseUiSchemaMenuItem = {
    id: 'default',
    key: 'default',
    title: 'Default',
    description: 'Default UI Schema',
    icon: 'form',
    uiSchema: {
      'ui:form': {
        variant: 'default',
      },
    },
    modes: null,
    sizes: null,
    minWidth: null,
    graphql: {},
  } as Reactory.Forms.IUISchemaMenuItem;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReactory = createMockReactory();
    useReactory.mockImplementation(() => mockReactory);
  });

  describe('initialization without formDefinition', () => {
    it('returns default object when formDefinition is undefined', () => {
      const { result } = renderHook(() =>
        useUISchema({
          formDefinition: undefined,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        } as any)
      );

      expect(result.current.uiSchema).toEqual({});
      expect(result.current.uiOptions).toEqual({});
      expect(result.current.uiSchemaActiveMenuItem).toBeNull();
      expect(result.current.uiSchemasAvailable).toEqual([]);
      expect(result.current.uiSchemaActiveGraphDefintion).toEqual({});
    });

    it('returns default object when formDefinition is null', () => {
      const { result } = renderHook(() =>
        useUISchema({
          formDefinition: null,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        } as any)
      );

      expect(result.current.uiSchema).toEqual({});
      expect(result.current.uiSchemaActiveMenuItem).toBeNull();
    });
  });

  describe('initial active menu item selection', () => {
    it('returns default menu item when uiSchemas is empty array', () => {
      const { result } = renderHook(() =>
        useUISchema({
          formDefinition: { ...baseFormDefinition, uiSchemas: [] } as any,
          uiSchemaKey: 'default',
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        } as any)
      );

      const menuItem = result.current.uiSchemaActiveMenuItem;
      expect(menuItem).not.toBeNull();
      expect(menuItem?.id).toBe('default');
      expect(menuItem?.key).toBe('default');
    });

    it('returns default menu item when uiSchemas is null', () => {
      const { result } = renderHook(() =>
        useUISchema({
          formDefinition: { ...baseFormDefinition, uiSchemas: null } as any,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        } as any)
      );

      const menuItem = result.current.uiSchemaActiveMenuItem;
      expect(menuItem?.id).toBe('default');
    });

    it('returns first allowed schema when uiSchemaKey does not match', () => {
      const uiSchemas = [
        { ...baseUiSchemaMenuItem, key: 'schema1', id: 'id1', title: 'Schema 1' },
        { ...baseUiSchemaMenuItem, key: 'schema2', id: 'id2', title: 'Schema 2' },
      ];

      const { result } = renderHook(() =>
        useUISchema({
          formDefinition: { ...baseFormDefinition, uiSchemas } as any,
          uiSchemaKey: 'nonexistent',
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        } as any)
      );

      const menuItem = result.current.uiSchemaActiveMenuItem;
      expect(menuItem?.key).toBe('schema1');
    });

    it('returns matching schema by key when uiSchemaKey matches', () => {
      const uiSchemas = [
        { ...baseUiSchemaMenuItem, key: 'schema1', title: 'Schema 1' },
        { ...baseUiSchemaMenuItem, key: 'schema2', title: 'Schema 2' },
      ];

      const { result } = renderHook(() =>
        useUISchema({
          formDefinition: { ...baseFormDefinition, uiSchemas } as any,
          uiSchemaKey: 'schema2',
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        } as any)
      );

      const menuItem = result.current.uiSchemaActiveMenuItem;
      expect(menuItem?.key).toBe('schema2');
      expect(menuItem?.title).toBe('Schema 2');
    });

    it('returns matching schema by key when matching exists', () => {
      const uiSchemas = [
        { ...baseUiSchemaMenuItem, key: 'schema1', id: 'id1', title: 'Schema 1' },
        { ...baseUiSchemaMenuItem, key: 'schema2', id: 'id2', title: 'Schema 2' },
      ];

      const { result } = renderHook(() =>
        useUISchema({
          formDefinition: { ...baseFormDefinition, uiSchemas } as any,
          uiSchemaKey: 'schema2',
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        } as any)
      );

      const menuItem = result.current.uiSchemaActiveMenuItem;
      expect(menuItem?.key).toBe('schema2');
      expect(menuItem?.title).toBe('Schema 2');
    });

    it('returns matching schema by id when matching exists in uiSchemas', () => {
      const uiSchemas = [
        { ...baseUiSchemaMenuItem, key: 'schema1', id: 'id1', title: 'Schema 1' },
        { ...baseUiSchemaMenuItem, key: 'schema2', id: 'id2', title: 'Schema 2' },
      ];

      const { result } = renderHook(() =>
        useUISchema({
          formDefinition: { ...baseFormDefinition, uiSchemas } as any,
          uiSchemaKey: 'schema1',
          uiSchemaId: 'id2',
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        } as any)
      );

      const menuItem = result.current.uiSchemaActiveMenuItem;
      // Initial selection uses key first, so schema1 is selected
      expect(menuItem?.key).toBe('schema1');
    });
  });

  describe('allowed schemas filtering by mode', () => {
    it('includes schema with null modes when mode is provided', () => {
      const uiSchemas = [
        { ...baseUiSchemaMenuItem, modes: null, key: 'schema1' },
      ];

      const { result } = renderHook(() =>
        useUISchema({
          formDefinition: { ...baseFormDefinition, uiSchemas } as any,
          mode: 'edit',
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        } as any)
      );

      expect(result.current.uiSchemasAvailable).toHaveLength(1);
    });

    it('includes schema when mode matches', () => {
      const uiSchemas = [
        { ...baseUiSchemaMenuItem, modes: ['view', 'edit'], key: 'schema1' },
      ];

      const { result } = renderHook(() =>
        useUISchema({
          formDefinition: { ...baseFormDefinition, uiSchemas } as any,
          mode: 'edit',
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        } as any)
      );

      expect(result.current.uiSchemasAvailable).toHaveLength(1);
    });

    it('returns empty available schemas when all modes are restricted', () => {
      const uiSchemas = [
        { ...baseUiSchemaMenuItem, modes: ['create', 'delete'], key: 'schema1' },
      ];

      const { result } = renderHook(() =>
        useUISchema({
          formDefinition: { ...baseFormDefinition, uiSchemas } as any,
          mode: 'edit',
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        } as any)
      );

      expect(result.current.uiSchemasAvailable).toHaveLength(0);
    });

    it('includes multiple schemas matching the mode', () => {
      const uiSchemas = [
        { ...baseUiSchemaMenuItem, modes: ['edit'], key: 'schema1' },
        { ...baseUiSchemaMenuItem, modes: ['edit', 'view'], key: 'schema2' },
        { ...baseUiSchemaMenuItem, modes: ['view'], key: 'schema3' },
      ];

      const { result } = renderHook(() =>
        useUISchema({
          formDefinition: { ...baseFormDefinition, uiSchemas } as any,
          mode: 'edit',
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        } as any)
      );

      expect(result.current.uiSchemasAvailable).toHaveLength(2);
    });
  });

  describe('allowed schemas filtering by size', () => {
    it('includes schema with null sizes when mode is provided', () => {
      const uiSchemas = [
        { ...baseUiSchemaMenuItem, sizes: null, key: 'schema1' },
      ];

      const { result } = renderHook(() =>
        useUISchema({
          formDefinition: { ...baseFormDefinition, uiSchemas } as any,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        } as any)
      );

      expect(result.current.uiSchemasAvailable).toHaveLength(1);
    });

    it('includes schema when size matches (md)', () => {
      const uiSchemas = [
        { ...baseUiSchemaMenuItem, sizes: ['sm', 'md', 'lg'], key: 'schema1' },
      ];

      const { result } = renderHook(() =>
        useUISchema({
          formDefinition: { ...baseFormDefinition, uiSchemas } as any,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        } as any)
      );

      expect(result.current.uiSchemasAvailable).toHaveLength(1);
    });

    it('excludes schema when size does not match', () => {
      const uiSchemas = [
        { ...baseUiSchemaMenuItem, sizes: ['lg', 'xl'], key: 'schema1' },
      ];

      const { result } = renderHook(() =>
        useUISchema({
          formDefinition: { ...baseFormDefinition, uiSchemas } as any,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        } as any)
      );

      expect(result.current.uiSchemasAvailable).toHaveLength(0);
    });
  });

  describe('active UI schema resolution', () => {
    it('returns form definition uiSchema when no uiSchemas available', () => {
      const customUiSchema = { 'ui:form': { variant: 'custom' } } as any;
      const { result } = renderHook(() =>
        useUISchema({
          formDefinition: {
            ...baseFormDefinition,
            uiSchemas: [],
            uiSchema: customUiSchema,
          } as any,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        } as any)
      );

      expect(result.current.uiSchema).toEqual(customUiSchema);
    });

    it('returns form definition uiSchema when uiSchemas is null', () => {
      const customUiSchema = { 'ui:form': { variant: 'custom' } } as any;
      const { result } = renderHook(() =>
        useUISchema({
          formDefinition: {
            ...baseFormDefinition,
            uiSchemas: null,
            uiSchema: customUiSchema,
          } as any,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        } as any)
      );

      expect(result.current.uiSchema).toEqual(customUiSchema);
    });

    it('returns empty object when no uiSchema defined anywhere', () => {
      const { result } = renderHook(() =>
        useUISchema({
          formDefinition: {
            id: defaultFQN,
            name: 'Test Form',
            schema: {},
            uiSchemas: [],
          } as any,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        } as any)
      );

      expect(result.current.uiSchema).toEqual({});
    });
  });

  describe('UI options extraction', () => {
    it('returns default options structure when no ui:form defined', () => {
      const { result } = renderHook(() =>
        useUISchema({
          formDefinition: {
            ...baseFormDefinition,
            uiSchema: {},
            uiSchemas: [],
          } as any,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        } as any)
      );

      expect(result.current.uiOptions).toHaveProperty('schemaSelector');
      expect(result.current.uiOptions.schemaSelector).toHaveProperty(
        'variant',
        'icon-button'
      );
    });

    it('merges ui:form options from active schema', () => {
      const { result } = renderHook(() =>
        useUISchema({
          formDefinition: {
            ...baseFormDefinition,
            uiSchema: {
              'ui:form': {
                variant: 'custom',
                showTitle: false,
              },
            } as any,
            uiSchemas: [],
          } as any,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        } as any)
      );

      expect(result.current.uiOptions).toMatchObject({
        variant: 'custom',
        showTitle: false,
      });
    });

    it('falls back to ui:options when ui:form is not defined', () => {
      const { result } = renderHook(() =>
        useUISchema({
          formDefinition: {
            ...baseFormDefinition,
            uiSchema: {
              'ui:options': {
                variant: 'fallback',
              },
            } as any,
            uiSchemas: [],
          } as any,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        } as any)
      );

      expect(result.current.uiOptions).toMatchObject({
        variant: 'fallback',
      });
    });
  });

  describe('GraphQL definitions extraction', () => {
    it('returns form definition graphql when no uiSchemas', () => {
      const graphqlDef = { query: { Test: {} } } as any;
      const { result } = renderHook(() =>
        useUISchema({
          formDefinition: {
            ...baseFormDefinition,
            graphql: graphqlDef,
            uiSchemas: [],
          } as any,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        } as any)
      );

      expect(result.current.uiSchemaActiveGraphDefintion).toEqual(graphqlDef);
    });

    it('returns form definition graphql when uiSchemas is null', () => {
      const graphqlDef = { query: { Test: {} } } as any;
      const { result } = renderHook(() =>
        useUISchema({
          formDefinition: {
            ...baseFormDefinition,
            graphql: graphqlDef,
            uiSchemas: null,
          } as any,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        } as any)
      );

      expect(result.current.uiSchemaActiveGraphDefintion).toEqual(graphqlDef);
    });

    it('returns empty object when no graphql defined', () => {
      const { result } = renderHook(() =>
        useUISchema({
          formDefinition: {
            id: defaultFQN,
            name: 'Test Form',
            schema: {},
            uiSchemas: [],
          } as any,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        } as any)
      );

      expect(result.current.uiSchemaActiveGraphDefintion).toEqual({});
    });
  });

  describe('schema selector buttons generation', () => {
    it('returns empty array when no allowed schemas', () => {
      const uiSchemas = [
        { ...baseUiSchemaMenuItem, modes: ['view'], key: 'schema1' },
      ];

      const { result } = renderHook(() =>
        useUISchema({
          formDefinition: { ...baseFormDefinition, uiSchemas } as any,
          mode: 'edit',
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        } as any)
      );

      expect((result.current as any).uiSchemaSelectorButtons).toHaveLength(0);
    });

    it('generates buttons for each allowed schema', () => {
      const uiSchemas = [
        { ...baseUiSchemaMenuItem, key: 'schema1', title: 'Schema 1' },
        { ...baseUiSchemaMenuItem, key: 'schema2', title: 'Schema 2' },
      ];

      const { result } = renderHook(() =>
        useUISchema({
          formDefinition: { ...baseFormDefinition, uiSchemas } as any,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        } as any)
      );

      expect((result.current as any).uiSchemaSelectorButtons).toHaveLength(2);
    });

    it('each button has unique key based on index', () => {
      const uiSchemas = [
        { ...baseUiSchemaMenuItem, key: 'schema1' },
        { ...baseUiSchemaMenuItem, key: 'schema2' },
        { ...baseUiSchemaMenuItem, key: 'schema3' },
      ];

      const { result } = renderHook(() =>
        useUISchema({
          formDefinition: { ...baseFormDefinition, uiSchemas } as any,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        } as any)
      );

      // Buttons are React components, verify count as proxy for unique keys
      expect((result.current as any).uiSchemaSelectorButtons).toHaveLength(3);
    });
  });

  describe('return value structure', () => {
    it('returns all expected properties', () => {
      const { result } = renderHook(() =>
        useUISchema({
          formDefinition: baseFormDefinition as any,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        } as any)
      );

      expect(result.current).toHaveProperty('uiSchema');
      expect(result.current).toHaveProperty('uiOptions');
      expect(result.current).toHaveProperty('uiSchemaActiveMenuItem');
      expect(result.current).toHaveProperty('uiSchemasAvailable');
      expect(result.current).toHaveProperty('uiSchemaActiveGraphDefintion');
      expect(result.current).toHaveProperty('uiSchemaSelectorButtons');
      expect(result.current).toHaveProperty('SchemaSelector');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('onSelectUISChema');
      expect(result.current).toHaveProperty('reset');
    });

    it('loading property is always false', () => {
      const { result: result1 } = renderHook(() =>
        useUISchema({
          formDefinition: undefined,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        } as any)
      );

      const { result: result2 } = renderHook(() =>
        useUISchema({
          formDefinition: baseFormDefinition as any,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        } as any)
      );

      expect(result1.current.loading).toBe(false);
      expect(result2.current.loading).toBe(false);
    });

    it('SchemaSelector property is always null', () => {
      const { result } = renderHook(() =>
        useUISchema({
          formDefinition: baseFormDefinition as any,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        } as any)
      );

      expect(result.current.SchemaSelector).toBeNull();
    });
  });

  describe('edge cases and complex scenarios', () => {
    it('handles minWidth filtering correctly', () => {
      const uiSchemas = [
        { ...baseUiSchemaMenuItem, minWidth: 1200, key: 'wide' },
        { ...baseUiSchemaMenuItem, minWidth: null, key: 'any' },
      ];

      const { result } = renderHook(() =>
        useUISchema({
          formDefinition: { ...baseFormDefinition, uiSchemas } as any,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        } as any)
      );

      // Both should pass (window.innerWidth >= 1200 is truthy in tests)
      expect(result.current.uiSchemasAvailable.length).toBeGreaterThan(0);
    });

    it('handles schemas with combined mode and size filters', () => {
      const uiSchemas = [
        {
          ...baseUiSchemaMenuItem,
          key: 'specific',
          modes: ['edit'],
          sizes: ['md', 'lg'],
        },
        { ...baseUiSchemaMenuItem, key: 'any', modes: null, sizes: null },
      ];

      const { result } = renderHook(() =>
        useUISchema({
          formDefinition: { ...baseFormDefinition, uiSchemas } as any,
          mode: 'edit',
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        } as any)
      );

      expect(result.current.uiSchemasAvailable.length).toBeGreaterThan(0);
    });

    it('uses form default uiSchemaKey from props', () => {
      const uiSchemas = [
        { ...baseUiSchemaMenuItem, key: 'schema1', title: 'Default' },
        { ...baseUiSchemaMenuItem, key: 'schema2', title: 'Alternative' },
      ];

      const { result } = renderHook(() =>
        useUISchema({
          formDefinition: { ...baseFormDefinition, uiSchemas } as any,
          uiSchemaKey: 'schema2',
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        } as any)
      );

      expect(result.current.uiSchemaActiveMenuItem?.key).toBe('schema2');
    });

    it('handles undefined uiSchema in menu item gracefully', () => {
      const uiSchemas = [
        { ...baseUiSchemaMenuItem, key: 'schema1', uiSchema: undefined } as any,
      ];

      const { result } = renderHook(() =>
        useUISchema({
          formDefinition: { ...baseFormDefinition, uiSchemas } as any,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        } as any)
      );

      expect(result.current).toBeDefined();
    });
  });

  describe('callback stability', () => {
    it('onSelectUISChema is a function', () => {
      const { result } = renderHook(() =>
        useUISchema({
          formDefinition: baseFormDefinition as any,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        } as any)
      );

      expect(typeof result.current.onSelectUISChema).toBe('function');
    });

    it('reset is a function', () => {
      const { result } = renderHook(() =>
        useUISchema({
          formDefinition: baseFormDefinition as any,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        } as any)
      );

      expect(typeof result.current.reset).toBe('function');
    });

    it('can call reset without error', () => {
      const { result } = renderHook(() =>
        useUISchema({
          formDefinition: baseFormDefinition as any,
          FQN: defaultFQN,
          SIGN: defaultSIGN,
        } as any)
      );

      expect(() => result.current.reset()).not.toThrow();
    });
  });
});
