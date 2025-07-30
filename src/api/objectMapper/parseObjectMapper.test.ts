/**
 * Test file for parseObjectMapperFunction
 * 
 * This file demonstrates and validates all the mapping scenarios mentioned in the user's request:
 * - String mappings with transforms
 * - Object mappings with transforms
 * - Array mappings with mixed content
 * - Complex nested scenarios
 */

import { parseObjectMapperFunction } from './parseObjectMapper';
import Reactory from '@reactory/reactory-core';

// Jest types
declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeEach: any;
declare const jest: any;

// Mock Reactory API for testing
const mockReactoryApi = {
  $func: {
    customTransform: (value: any) => value * 2,
  },
  getComponent: jest.fn().mockReturnValue(undefined),
} as any as Reactory.Client.IReactoryApi;

describe('parseObjectMapperFunction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('String mappings with transforms', () => {
    it('should handle simple string mappings', () => {
      const input: any = {
        'id': 'property.id::toInt',
      };

      const result = parseObjectMapperFunction(input, mockReactoryApi);

      expect(result['id']).toBeDefined();
      expect(typeof result['id']).toBe('object');
      expect((result['id'] as any).key).toBe('property.id');
      expect(typeof (result['id'] as any).transform).toBe('function');
    });

    it('should handle string mappings without transforms', () => {
      const input: any = {
        'name': 'property.name',
      };

      const result = parseObjectMapperFunction(input, mockReactoryApi);

      expect(result['name']).toBe('property.name');
    });
  });

  describe('Object mappings', () => {
    it('should handle object mappings with string transforms', () => {
      const input: any = {
        'anotherProp.property.date': { 
          key: 'property.timestamp', 
          transform: 'timestamp' 
        },
      };

      const result = parseObjectMapperFunction(input, mockReactoryApi);

      expect(result['anotherProp.property.date']).toBeDefined();
      expect(typeof result['anotherProp.property.date']).toBe('object');
      expect((result['anotherProp.property.date'] as any).key).toBe('property.timestamp');
      expect(typeof (result['anotherProp.property.date'] as any).transform).toBe('function');
    });
  });

  describe('Array mappings with mixed content', () => {
    it('should handle array with string and object mappings', () => {
      const input: any = {
        'property.id': [
          'property.id::toInt', 
          { key: 'property.id2', transform: 'toInt' }
        ],
      };

      const result = parseObjectMapperFunction(input, mockReactoryApi);

      expect(Array.isArray(result['property.id'])).toBe(true);
      expect(result['property.id']).toHaveLength(2);
      
      // First item should be a string mapping with transform
      expect(typeof result['property.id'][0]).toBe('object');
      expect((result['property.id'][0] as any).key).toBe('property.id');
      expect(typeof (result['property.id'][0] as any).transform).toBe('function');
      
      // Second item should be an object mapping
      expect(typeof result['property.id'][1]).toBe('object');
      expect((result['property.id'][1] as any).key).toBe('property.id2');
      expect(typeof (result['property.id'][1] as any).transform).toBe('function');
    });
  });

  describe('Complex scenarios from user request', () => {
    it('should handle the complete example from user request', () => {
      const input: any = {
        'id': 'property.id::toInt',
        'property.id': ['property.id::toInt', { key: 'property.id2', transform: 'toInt' }],
        'anotherProp.property.date': { key: 'property.timestamp', transform: 'timestamp' },
        'someComplexObject': [
          { key: 'property.category', transform: 'core.CategoryMapperFunction@1.0.0' },
        ],
      };

      const result = parseObjectMapperFunction(input, mockReactoryApi);

      // Verify all keys are present
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('property.id');
      expect(result).toHaveProperty('anotherProp.property.date');
      expect(result).toHaveProperty('someComplexObject');

      // Verify types and structures
      expect(typeof result['id']).toBe('object');
      expect(Array.isArray(result['property.id'])).toBe(true);
      expect(typeof result['anotherProp.property.date']).toBe('object');
      expect(Array.isArray(result['someComplexObject'])).toBe(true);
    });
  });

  describe('Transform function behavior', () => {
    it('should create working transform functions for built-in transforms', () => {
      const input: any = {
        'number': 'property.value::toInt',
        'string': 'property.text::toString',
        'boolean': 'property.flag::toBoolean',
        'date': 'property.timestamp::toDate',
      };

      const result = parseObjectMapperFunction(input, mockReactoryApi);

      // Test the transform functions
      const numberTransform = (result['number'] as any).transform;
      const stringTransform = (result['string'] as any).transform;
      const booleanTransform = (result['boolean'] as any).transform;
      const dateTransform = (result['date'] as any).transform;

      expect(numberTransform('123', {}, {}, 'test')).toBe(123);
      expect(stringTransform(456, {}, {}, 'test')).toBe('456');
      expect(booleanTransform('true', {}, {}, 'test')).toBe(true);
      expect(dateTransform('2023-01-01', {}, {}, 'test')).toBeInstanceOf(Date);
    });
  });
}); 