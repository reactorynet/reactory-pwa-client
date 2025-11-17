// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated
    removeListener: () => {}, // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  }),
});

// Mock requestAnimationFrame
global.requestAnimationFrame = (callback: FrameRequestCallback) => {
  const id = setTimeout(callback, 0);
  return id as unknown as number;
};
global.cancelAnimationFrame = (id: number) => clearTimeout(id as unknown as NodeJS.Timeout);

// Mock process for browser environment
if (typeof global.process === 'undefined') {
  global.process = {
    env: {
      NODE_ENV: 'development',
      REACT_APP_TITLE: 'Reactory Client',
    },
  } as any;
} 