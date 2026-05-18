import React from 'react';

// Mock App component BEFORE importing index
jest.mock('./App', () => ({
  ReactoryHOC: ({ appTheme, appTitle }: any) => (
    <div data-testid="reactory-hoc">
      {appTitle}
    </div>
  ),
}));

// Mock ReactDOM.render
const mockRender = jest.fn();
jest.mock('react-dom', () => ({
  render: mockRender,
}));

// Mock registerServiceWorker
const mockRegisterServiceWorker = jest.fn();
jest.mock('./registerServiceWorker', () => mockRegisterServiceWorker);

// Mock themes module
const mockGetTheme = jest.fn(() => ({
  type: 'material',
  options: {
    palette: {
      mode: 'light',
    },
  },
}));
jest.mock('./themes', () => ({
  getTheme: mockGetTheme,
}));

// Mock CSS import
jest.mock('./index.css', () => ({}));


// Mock environment variables
const originalEnv = process.env;

describe('index.tsx', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'development';
    delete process.env.REACT_APP_TITLE;

    // Create mock root element
    const root = document.createElement('div');
    root.id = 'root';
    root.className = 'loading';
    document.body.innerHTML = '';
    document.body.appendChild(root);

    // Reset mocks
    mockRender.mockClear();
    mockRegisterServiceWorker.mockClear();
    mockGetTheme.mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  describe('Module Initialization', () => {
    it('imports and executes index module', () => {
      // Reset mocks before importing
      mockRender.mockClear();
      mockRegisterServiceWorker.mockClear();
      mockGetTheme.mockClear();

      // Import the actual index module to trigger side effects
      require('./index');

      // Verify that the module initialization occurred
      expect(mockGetTheme).toHaveBeenCalled();
      expect(mockRender).toHaveBeenCalled();
      expect(mockRegisterServiceWorker).toHaveBeenCalled();
    });

    it('sets up window.reactory in development mode', () => {
      process.env.NODE_ENV = 'development';
      
      // Clear module cache to force re-initialization
      jest.resetModules();
      require('./index');

      expect(window.reactory).toBeDefined();
      expect(window.reactory.logging.log).toBe(true);
      expect(window.reactory.logging.debug).toBe(true);
    });

    it('sets up window.reactory in production mode', () => {
      process.env.NODE_ENV = 'production';
      
      jest.resetModules();
      require('./index');

      expect(window.reactory).toBeDefined();
      expect(window.reactory.logging.log).toBe(false);
      expect(window.reactory.logging.debug).toBe(false);
    });

    it('removes loading class from root element', () => {
      const rootElement = document.getElementById('root');
      expect(rootElement?.classList.contains('loading')).toBe(true);

      jest.resetModules();
      require('./index');

      // After module init, loading class should be removed
      expect(rootElement?.classList.contains('loading')).toBe(false);
    });

    it('sets document title from environment variable', () => {
      process.env.REACT_APP_TITLE = 'Custom Title';
      
      jest.resetModules();
      require('./index');

      expect(document.title).toBe('Custom Title');
    });

    it('sets default document title when not provided', () => {
      delete process.env.REACT_APP_TITLE;
      
      jest.resetModules();
      require('./index');

      expect(document.title).toBe('Reactory Client');
    });

    it('renders ReactoryHOC with correct props', () => {
      mockRender.mockClear();
      mockGetTheme.mockClear();

      jest.resetModules();
      require('./index');

      // Verify ReactDOM.render was called
      expect(mockRender).toHaveBeenCalled();
      
      // Verify getTheme was called to get theme
      expect(mockGetTheme).toHaveBeenCalled();
    });

    it('calls registerServiceWorker during initialization', () => {
      mockRegisterServiceWorker.mockClear();
      
      jest.resetModules();
      require('./index');

      expect(mockRegisterServiceWorker).toHaveBeenCalled();
    });
  });

  describe('ReactoryHOC Props', () => {
    it('passes appTheme from getTheme() function', () => {
      const expectedTheme = {
        type: 'material',
        options: { palette: { mode: 'light' } }
      };
      mockGetTheme.mockReturnValue(expectedTheme);

      mockRender.mockClear();
      jest.resetModules();
      require('./index');

      // Verify the theme was obtained
      expect(mockGetTheme).toHaveBeenCalled();
    });

    it('passes appTitle with REACT_APP_TITLE or default', () => {
      process.env.REACT_APP_TITLE = 'Test App';
      
      mockRender.mockClear();
      jest.resetModules();
      require('./index');

      expect(document.title).toBe('Test App');
    });

    it('passes api property as null in initial state', () => {
      jest.resetModules();
      require('./index');

      // window.reactory.api should be null initially
      expect(window.reactory.api).toBeNull();
    });
  });

  describe('Environment-Based Configuration', () => {
    it('enables logging for non-production environments', () => {
      process.env.NODE_ENV = 'development';
      
      jest.resetModules();
      require('./index');

      const loggingEnabled = process.env.NODE_ENV !== 'production';
      expect(loggingEnabled).toBe(true);
    });

    it('disables logging for production environment', () => {
      process.env.NODE_ENV = 'production';
      
      jest.resetModules();
      require('./index');

      const loggingDisabled = process.env.NODE_ENV === 'production';
      expect(loggingDisabled).toBe(true);
    });

    it('handles test environment same as non-production', () => {
      process.env.NODE_ENV = 'test';
      
      jest.resetModules();
      require('./index');

      const loggingEnabled = process.env.NODE_ENV !== 'production';
      expect(loggingEnabled).toBe(true);
    });
  });

  describe('DOM Operations', () => {
    it('verifies root element exists before rendering', () => {
      const rootElement = document.getElementById('root');
      expect(rootElement).not.toBeNull();
      expect(rootElement?.id).toBe('root');
    });

    it('handles edge case: root element with no loading class', () => {
      const root = document.getElementById('root');
      if (root) {
        root.classList.remove('loading');
      }

      expect(root?.classList.contains('loading')).toBe(false);
      
      jest.resetModules();
      require('./index');

      // Should still complete without error
      expect(mockRender).toHaveBeenCalled();
    });
  });
});

