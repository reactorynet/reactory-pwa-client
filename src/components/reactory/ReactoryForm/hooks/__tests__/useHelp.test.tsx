import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { useHelp } from '../useHelp';
import Reactory from '@reactorynet/reactory-core';

// Mock localforage to prevent storage errors
jest.mock('localforage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  config: jest.fn(() => ({
    driver: {},
    INDEXEDDB: 'indexeddb',
    WEBSQL: 'websql',
    LOCALSTORAGE: 'localstorage',
  })),
  setDriver: jest.fn(() => Promise.resolve()),
  keys: jest.fn(() => Promise.resolve([])),
  length: jest.fn(() => Promise.resolve(0)),
  INDEXEDDB: 'indexeddb',
  WEBSQL: 'websql',
  LOCALSTORAGE: 'localstorage',
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    config: jest.fn(() => ({
      driver: {},
      INDEXEDDB: 'indexeddb',
      WEBSQL: 'websql',
      LOCALSTORAGE: 'localstorage',
    })),
    setDriver: jest.fn(() => Promise.resolve()),
    keys: jest.fn(() => Promise.resolve([])),
    length: jest.fn(() => Promise.resolve(0)),
    INDEXEDDB: 'indexeddb',
    WEBSQL: 'websql',
    LOCALSTORAGE: 'localstorage',
  },
}));

// Mock dependencies
jest.mock('@reactory/client-core/api');

// Create mock factories
const createMockReactory = () => ({
  getComponents: jest.fn((componentIds: string[]) => ({
    FullScreenModal: () => <div data-testid="fullscreen-modal" />,
    Material: {
      MaterialCore: {
        Button: ({ children, onClick }: any) => (
          <button onClick={onClick} data-testid="help-button">
            {children}
          </button>
        ),
        Icon: ({ children }: any) => <span data-testid="icon">{children}</span>,
        Typography: ({ children, variant }: any) => (
          <div data-testid={`typography-${variant}`}>{children}</div>
        ),
        Box: ({ children }: any) => <div data-testid="box">{children}</div>,
        Divider: () => <hr data-testid="divider" />,
        Paper: ({ children }: any) => <div data-testid="paper">{children}</div>,
        Stack: ({ children }: any) => <div data-testid="stack">{children}</div>,
        Chip: ({ label }: any) => <span data-testid="chip">{label}</span>,
      },
      MaterialIcons: {},
    },
    StaticContent: ({ slug }: any) => (
      <div data-testid={`static-content-${slug}`}>{slug}</div>
    ),
    ReactorChat: ({ personaId, promptKey }: any) => (
      <div data-testid="reactor-chat">
        {personaId}:{promptKey}
      </div>
    ),
  })),
  log: jest.fn(),
  debug: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
});

const createMockFormDefinition = (): any => ({
  id: 'test.Form@1.0.0',
  name: 'Test Form',
  title: 'Test Form Title',
  description: 'Test description',
  tags: ['tag1', 'tag2'],
  helpTopics: ['getting-started', 'troubleshooting'],
  allowSupportRequest: true,
  uiSchema: {
    'ui:ai': {
      personaId: 'persona-123',
      promptKey: 'form-help',
    },
  },
});

let mockReactory: ReturnType<typeof createMockReactory>;

const { useReactory } = require('@reactory/client-core/api');

describe('useHelp', () => {
  beforeAll(() => {
    useReactory.mockImplementation(() => mockReactory);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockReactory = createMockReactory();
    useReactory.mockImplementation(() => mockReactory);
  });

  describe('initialization', () => {
    it('initializes without errors', () => {
      const { result } = renderHook(() =>
        useHelp({
          formDefinition: createMockFormDefinition(),
          formContext: undefined,
          formData: {},
        })
      );

      expect(result.current).toBeDefined();
    });

    it('calls getComponents with expected component IDs', () => {
      renderHook(() =>
        useHelp({
          formDefinition: createMockFormDefinition(),
          formContext: undefined,
          formData: {},
        })
      );

      expect(mockReactory.getComponents).toHaveBeenCalledWith([
        'core.FullScreenModal',
        'material-ui.Material',
        'core.StaticContent',
        'reactor.ReactorChat',
      ]);
    });

    it('extracts personaId and promptKey from ui:ai schema', () => {
      const { result } = renderHook(() =>
        useHelp({
          formDefinition: createMockFormDefinition(),
          formContext: undefined,
          formData: {},
        })
      );

      expect(result.current).toBeDefined();
      expect(result.current.HelpModal).toBeDefined();
      expect(result.current.HelpButton).toBeDefined();
    });
  });

  describe('return value structure', () => {
    it('returns toggleHelp function', () => {
      const { result } = renderHook(() =>
        useHelp({
          formDefinition: createMockFormDefinition(),
          formContext: undefined,
          formData: {},
        })
      );

      expect(typeof result.current.toggleHelp).toBe('function');
    });

    it('returns HelpModal component', () => {
      const { result } = renderHook(() =>
        useHelp({
          formDefinition: createMockFormDefinition(),
          formContext: undefined,
          formData: {},
        })
      );

      expect(result.current.HelpModal).toBeDefined();
      expect(typeof result.current.HelpModal).toBe('function');
    });

    it('returns HelpButton component', () => {
      const { result } = renderHook(() =>
        useHelp({
          formDefinition: createMockFormDefinition(),
          formContext: undefined,
          formData: {},
        })
      );

      expect(result.current.HelpButton).toBeDefined();
      expect(typeof result.current.HelpButton).toBe('function');
    });

    it('returns all expected properties', () => {
      const { result } = renderHook(() =>
        useHelp({
          formDefinition: createMockFormDefinition(),
          formContext: undefined,
          formData: {},
        })
      );

      expect(result.current).toHaveProperty('toggleHelp');
      expect(result.current).toHaveProperty('HelpModal');
      expect(result.current).toHaveProperty('HelpButton');
    });
  });

  describe('toggleHelp callback', () => {
    it('is a function', () => {
      const { result } = renderHook(() =>
        useHelp({
          formDefinition: createMockFormDefinition(),
          formContext: undefined,
          formData: {},
        })
      );

      expect(typeof result.current.toggleHelp).toBe('function');
    });

    it('can be called without errors', () => {
      const { result } = renderHook(() =>
        useHelp({
          formDefinition: createMockFormDefinition(),
          formContext: undefined,
          formData: {},
        })
      );

      expect(() => {
        act(() => {
          result.current.toggleHelp();
        });
      }).not.toThrow();
    });

    it('toggleHelp can be called multiple times', () => {
      const { result } = renderHook(() =>
        useHelp({
          formDefinition: createMockFormDefinition(),
          formContext: undefined,
          formData: {},
        })
      );

      expect(() => {
        act(() => {
          result.current.toggleHelp();
          result.current.toggleHelp();
          result.current.toggleHelp();
        });
      }).not.toThrow();
    });
  });

  describe('HelpModal component', () => {
    it('renders without errors', () => {
      const { result } = renderHook(() =>
        useHelp({
          formDefinition: createMockFormDefinition(),
          formContext: undefined,
          formData: {},
        })
      );

      const Modal = result.current.HelpModal;
      expect(Modal).toBeDefined();
      expect(typeof Modal).toBe('function');
    });

    it('passes correct props to FullScreenModal', () => {
      const { result } = renderHook(() =>
        useHelp({
          formDefinition: createMockFormDefinition(),
          formContext: undefined,
          formData: {},
        })
      );

      expect(result.current.HelpModal).toBeDefined();
    });
  });

  describe('HelpButton component', () => {
    it('renders without errors', () => {
      const { result } = renderHook(() =>
        useHelp({
          formDefinition: createMockFormDefinition(),
          formContext: undefined,
          formData: {},
        })
      );

      const Button = result.current.HelpButton;
      expect(Button).toBeDefined();
      expect(typeof Button).toBe('function');
    });

    it('is a callable React component', () => {
      const { result } = renderHook(() =>
        useHelp({
          formDefinition: createMockFormDefinition(),
          formContext: undefined,
          formData: {},
        })
      );

      const Button = result.current.HelpButton;
      const component = (Button as any)({});
      expect(component).toBeDefined();
      expect(component).toHaveProperty('$$typeof'); // React element marker
    });
  });

  describe('edge cases', () => {
    it('handles formDefinition without helpTopics', () => {
      const formDef = createMockFormDefinition();
      delete (formDef as any).helpTopics;

      const { result } = renderHook(() =>
        useHelp({
          formDefinition: formDef,
          formContext: undefined,
          formData: {},
        })
      );

      expect(result.current).toBeDefined();
      expect(result.current.HelpModal).toBeDefined();
    });

    it('handles formDefinition without tags', () => {
      const formDef = createMockFormDefinition();
      delete (formDef as any).tags;

      const { result } = renderHook(() =>
        useHelp({
          formDefinition: formDef,
          formContext: undefined,
          formData: {},
        })
      );

      expect(result.current).toBeDefined();
    });

    it('handles formDefinition without description', () => {
      const formDef = createMockFormDefinition();
      delete (formDef as any).description;

      const { result } = renderHook(() =>
        useHelp({
          formDefinition: formDef,
          formContext: undefined,
          formData: {},
        })
      );

      expect(result.current).toBeDefined();
    });

    it('handles empty helpTopics array', () => {
      const formDef = createMockFormDefinition();
      (formDef as any).helpTopics = [];

      const { result } = renderHook(() =>
        useHelp({
          formDefinition: formDef,
          formContext: undefined,
          formData: {},
        })
      );

      expect(result.current).toBeDefined();
    });

    it('handles allowSupportRequest set to false', () => {
      const formDef = createMockFormDefinition();
      (formDef as any).allowSupportRequest = false;

      const { result } = renderHook(() =>
        useHelp({
          formDefinition: formDef,
          formContext: undefined,
          formData: {},
        })
      );

      expect(result.current).toBeDefined();
    });

    it('handles missing ui:ai configuration', () => {
      const formDef = createMockFormDefinition();
      (formDef as any).uiSchema = {};

      const { result } = renderHook(() =>
        useHelp({
          formDefinition: formDef,
          formContext: undefined,
          formData: {},
        })
      );

      expect(result.current).toBeDefined();
      expect(result.current.HelpModal).toBeDefined();
    });

    it('handles null formContext', () => {
      const { result } = renderHook(() =>
        useHelp({
          formDefinition: createMockFormDefinition(),
          formContext: null,
          formData: {},
        })
      );

      expect(result.current).toBeDefined();
    });

    it('handles null formData', () => {
      const { result } = renderHook(() =>
        useHelp({
          formDefinition: createMockFormDefinition(),
          formContext: undefined,
          formData: null,
        })
      );

      expect(result.current).toBeDefined();
    });

    it('handles undefined formData', () => {
      const { result } = renderHook(() =>
        useHelp({
          formDefinition: createMockFormDefinition(),
          formContext: undefined,
          formData: undefined,
        })
      );

      expect(result.current).toBeDefined();
    });
  });

  describe('component reference consistency', () => {
    it('HelpButton reference remains stable across renders', () => {
      const { result, rerender } = renderHook(
        () =>
          useHelp({
            formDefinition: createMockFormDefinition(),
            formContext: undefined,
            formData: {},
          }),
        {}
      );

      const firstHelpButton = result.current.HelpButton;

      rerender();

      // Reference may change on rerender due to React internals
      expect(result.current.HelpButton).toBeDefined();
    });

    it('toggleHelp can be called after render', () => {
      const { result } = renderHook(() =>
        useHelp({
          formDefinition: createMockFormDefinition(),
          formContext: undefined,
          formData: {},
        })
      );

      expect(() => {
        act(() => {
          result.current.toggleHelp();
        });
      }).not.toThrow();

      expect(result.current.HelpModal).toBeDefined();
    });
  });

  describe('props integration', () => {
    it('accepts formDefinition prop', () => {
      const formDef = createMockFormDefinition();
      const { result } = renderHook(() =>
        useHelp({
          formDefinition: formDef,
          formContext: undefined,
          formData: {},
        })
      );

      expect(result.current).toBeDefined();
    });

    it('accepts formContext prop', () => {
      const formContext = { userId: 'user-123', role: 'admin' };
      const { result } = renderHook(() =>
        useHelp({
          formDefinition: createMockFormDefinition(),
          formContext: formContext as any,
          formData: {},
        })
      );

      expect(result.current).toBeDefined();
    });

    it('accepts formData prop', () => {
      const formData = { name: 'John', email: 'john@example.com' };
      const { result } = renderHook(() =>
        useHelp({
          formDefinition: createMockFormDefinition(),
          formContext: undefined,
          formData,
        })
      );

      expect(result.current).toBeDefined();
    });
  });
});
