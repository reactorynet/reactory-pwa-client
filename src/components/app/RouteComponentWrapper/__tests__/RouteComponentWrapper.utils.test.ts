/**
 * RouteComponentWrapper Utils Tests
 */

import { applyTransform, processTemplate, processComponentProps } from '../RouteComponentWrapper.utils';

describe('RouteComponentWrapper utils', () => {
  describe('applyTransform', () => {
    it('should convert to integer', () => {
      expect(applyTransform('123', 'toInt')).toBe(123);
    });

    it('should convert to string', () => {
      expect(applyTransform(123, 'toString')).toBe('123');
    });

    it('should convert to date', () => {
      const dateStr = '2023-01-01';
      const result = applyTransform(dateStr, 'toDate');
      expect(result).toBeInstanceOf(Date);
    });

    it('should convert to boolean', () => {
      expect(applyTransform('true', 'toBoolean')).toBe(true);
      expect(applyTransform('', 'toBoolean')).toBe(false);
    });

    it('should return value for unknown transform', () => {
      expect(applyTransform('test', 'unknown')).toBe('test');
    });
  });

  describe('processTemplate', () => {
    const mockReactory = {
      utils: {
        template: jest.fn((str) => (context) => str.replace(/\$\{(\w+\.\w+)\}/g, (_, key) => {
          const [obj, prop] = key.split('.');
          return context[obj]?.[prop] || '';
        }))
      }
    };

    it('should process simple template', () => {
      const result = processTemplate(
        '${route.id}',
        { id: '123' },
        {},
        mockReactory as any
      );
      expect(result).toBe('123');
    });

    it('should process template with transform', () => {
      const result = processTemplate(
        '${route.id}::toInt',
        { id: '123' },
        {},
        mockReactory as any
      );
      expect(result).toBe(123);
    });
  });

  describe('processComponentProps', () => {
    const mockReactory = {
      utils: {
        template: jest.fn((str) => () => 'processed')
      },
      warning: jest.fn()
    };

    it('should process props with templates', () => {
      const props = {
        id: '${route.id}',
        name: 'static'
      };

      const result = processComponentProps(
        props,
        { id: '123' },
        {},
        mockReactory as any
      );

      expect(result.id).toBe('processed');
      expect(result.name).toBe('static');
    });

    it('should handle errors gracefully', () => {
      const mockReactoryWithError = {
        utils: {
          template: jest.fn(() => {
            throw new Error('Template error');
          })
        },
        warning: jest.fn()
      };

      const props = {
        id: '${route.id}'
      };

      const result = processComponentProps(
        props,
        {},
        {},
        mockReactoryWithError as any
      );

      expect(result.id).toBe('${route.id}');
      expect(mockReactoryWithError.warning).toHaveBeenCalled();
    });
  });
});
