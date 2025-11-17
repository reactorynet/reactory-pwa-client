/**
 * Phase 2.1: Rendering Performance Optimization Test Runner
 * 
 * This runner executes the Phase 2.1 rendering performance tests
 * in a Node.js environment with proper mocking.
 */

// Mock browser APIs for Node.js environment
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {}
};

global.sessionStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {}
};

global.performance = {
  now: () => Date.now(),
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 4000000
  }
};

global.React = {
  memo: (component) => component,
  lazy: (loader) => ({ $$typeof: Symbol.for('react.lazy'), loader }),
  useCallback: (fn) => fn,
  useMemo: (fn) => fn()
};

global.ReactDOM = {
  render: () => {},
  createPortal: () => {}
};

global.console = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  assert: (condition, message) => {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }
};

// Import and run tests
const { runAllPhase2RenderingTests } = require('./phase2RenderingTests.js');

console.log('🚀 Starting Phase 2.1 Rendering Performance Test Runner...');
console.log('==============================================');

try {
  runAllPhase2RenderingTests();
  console.log('==============================================');
  console.log('🎉 Phase 2.1 Test Runner Completed Successfully!');
  console.log('✅ Ready to implement rendering performance optimizations');
} catch (error) {
  console.error('❌ Phase 2.1 Test Runner Failed:', error);
  process.exit(1);
} 