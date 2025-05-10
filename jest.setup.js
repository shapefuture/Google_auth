// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/extend-expect';

// Mock fetch globally
global.fetch = jest.fn();

// Mock console methods
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;
const originalConsoleDebug = console.debug;

// Setup mocks for console methods with test environment specific behavior
beforeAll(() => {
  // Suppress console during tests but still collect calls for assertions
  console.error = jest.fn();
  console.warn = jest.fn();
  console.log = jest.fn();
  console.info = jest.fn();
  console.debug = jest.fn();
  
  // Mock window.matchMedia which is not available in Jest environment
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
  
  // Mock IntersectionObserver
  class MockIntersectionObserver {
    constructor(callback) {
      this.callback = callback;
      this.observables = [];
    }
    
    observe(element) {
      this.observables.push(element);
    }
    
    unobserve(element) {
      this.observables = this.observables.filter(obs => obs !== element);
    }
    
    disconnect() {
      this.observables = [];
    }
    
    // Helper method to simulate intersection
    simulateIntersection(isIntersecting) {
      const entries = this.observables.map(element => ({
        isIntersecting,
        target: element,
        boundingClientRect: element.getBoundingClientRect(),
        intersectionRatio: isIntersecting ? 1 : 0,
        intersectionRect: isIntersecting ? element.getBoundingClientRect() : null,
        rootBounds: null,
        time: Date.now(),
      }));
      
      this.callback(entries, this);
    }
  }
  
  global.IntersectionObserver = MockIntersectionObserver;
  
  // Mock window.scrollTo
  window.scrollTo = jest.fn();
  
  // Mock window.ResizeObserver
  class MockResizeObserver {
    constructor(callback) {
      this.callback = callback;
      this.observables = [];
    }
    
    observe(element) {
      this.observables.push(element);
    }
    
    unobserve(element) {
      this.observables = this.observables.filter(obs => obs !== element);
    }
    
    disconnect() {
      this.observables = [];
    }
  }
  
  global.ResizeObserver = MockResizeObserver;
});

// Restore original console methods after tests
afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.log = originalConsoleLog;
  console.info = originalConsoleInfo;
  console.debug = originalConsoleDebug;
});

// Clear mocks between tests
afterEach(() => {
  jest.clearAllMocks();
});

// Setup global environment variables for tests
process.env = {
  ...process.env,
  NEXT_PUBLIC_APP_ENV: 'test',
  NODE_ENV: 'test',
};