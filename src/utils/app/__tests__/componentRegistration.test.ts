/**
 * Component Registration Utility Tests
 */

import { registerComponent, registerComponents, ComponentDefinition } from '../componentRegistration';

describe('componentRegistration utilities', () => {
  // Mock Reactory SDK
  const mockReactory = {
    registerComponent: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should register a single component', () => {
    const componentDef: ComponentDefinition = {
      nameSpace: 'test',
      name: 'TestComponent',
      component: () => null
    };

    registerComponent(mockReactory as any, componentDef);

    expect(mockReactory.registerComponent).toHaveBeenCalledWith(
      'test',
      'TestComponent',
      '1.0.0',
      componentDef.component,
      [],
      ['*'],
      false
    );
  });

  it('should register multiple components', () => {
    const componentDefs: ComponentDefinition[] = [
      {
        nameSpace: 'test',
        name: 'Component1',
        component: () => null
      },
      {
        nameSpace: 'test',
        name: 'Component2',
        component: () => null
      }
    ];

    registerComponents(mockReactory as any, componentDefs);

    expect(mockReactory.registerComponent).toHaveBeenCalledTimes(2);
  });

  it('should use custom values when provided', () => {
    const componentDef: ComponentDefinition = {
      nameSpace: 'custom',
      name: 'CustomComponent',
      version: '2.0.0',
      component: () => null,
      tags: ['tag1'],
      roles: ['admin'],
      wrapWithApi: true
    };

    registerComponent(mockReactory as any, componentDef);

    expect(mockReactory.registerComponent).toHaveBeenCalledWith(
      'custom',
      'CustomComponent',
      '2.0.0',
      componentDef.component,
      ['tag1'],
      ['admin'],
      true
    );
  });
});
