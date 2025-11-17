#!/usr/bin/env node

// Phase 2.2 Data Management Implementation Test Runner
// Tests the actual implementation of data management hooks

// Mock browser APIs for Node.js environment
global.localStorage = {
  getItem: (key) => null,
  setItem: (key, value) => {},
  removeItem: (key) => {},
  clear: () => {}
};

global.sessionStorage = {
  getItem: (key) => null,
  setItem: (key, value) => {},
  removeItem: (key) => {},
  clear: () => {}
};

global.performance = {
  now: () => Date.now(),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024, // 100MB
    jsHeapSizeLimit: 200 * 1024 * 1024 // 200MB
  }
};

// Mock React for testing
global.React = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  memo: (component) => component,
  lazy: (loader) => loader,
  Suspense: ({ children }) => ({ type: 'Suspense', children }),
  useEffect: (fn, deps) => fn(),
  useState: (initial) => [initial, () => {}],
  useCallback: (fn, deps) => fn,
  useMemo: (fn, deps) => fn(),
  useRef: (initial) => ({ current: initial })
};

global.ReactDOM = {
  render: (element, container) => ({ element, container }),
  createPortal: (children, container) => ({ children, container })
};

// Mock console for better test output
const originalConsole = console;
global.console = {
  log: (...args) => originalConsole.log(...args),
  error: (...args) => originalConsole.error(...args),
  warn: (...args) => originalConsole.warn(...args),
  assert: (condition, message) => {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }
};

// Mock setTimeout for testing
global.setTimeout = (fn, delay) => {
  // For testing, execute after a minimal delay to simulate timing
  const timerId = Math.random();
  process.nextTick(() => {
    fn();
  });
  return timerId; // Mock timer ID
};

// Mock fetch for GraphQL testing
global.fetch = async (url, options) => {
  return {
    ok: true,
    json: async () => ({
      data: {
        form: {
          id: 'test-form-1',
          fields: [
            { id: 'name', value: 'John Doe', type: 'text' },
            { id: 'email', value: 'john@example.com', type: 'email' }
          ],
          metadata: {
            version: '1.0',
            lastModified: Date.now()
          }
        }
      }
    })
  };
};

// Mock IntersectionObserver for lazy loading tests
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }
  
  observe() {
    // Simulate intersection
    this.callback([{ isIntersecting: true }]);
  }
  
  unobserve() {}
  disconnect() {}
};

// Mock navigator for Node.js environment
global.navigator = {
  onLine: true
};

console.log('🚀 Phase 2.2 Data Management Implementation Test Runner');
console.log('📅 Started:', new Date().toISOString());
console.log('🔧 Environment: Node.js with mocked browser APIs\n');

// Import and run tests
try {
  // Import the test file
  const testModule = require('./phase2DataManagementImplementationTests.js');
  
  // Run the main test suite
  if (testModule.runDataManagementImplementationTests) {
    testModule.runDataManagementImplementationTests();
  } else {
    console.log('⚠️  Test module not found or invalid');
  }
  
} catch (error) {
  console.error('❌ Test runner failed:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}

console.log('\n🏁 Test runner completed');
console.log('📅 Finished:', new Date().toISOString()); 