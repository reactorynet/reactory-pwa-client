/**
 * Environment Utility Tests
 */

import * as envUtils from '../environment';

describe('environment utilities', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should get environment variable with default', () => {
    expect(envUtils.getEnvVar('NON_EXISTENT', 'default')).toBe('default');
  });

  it('should detect development mode', () => {
    process.env.NODE_ENV = 'development';
    expect(envUtils.isDevelopment()).toBe(true);
    expect(envUtils.isProduction()).toBe(false);
    expect(envUtils.isTest()).toBe(false);
  });

  it('should detect production mode', () => {
    process.env.NODE_ENV = 'production';
    expect(envUtils.isProduction()).toBe(true);
    expect(envUtils.isDevelopment()).toBe(false);
    expect(envUtils.isTest()).toBe(false);
  });

  it('should detect test mode', () => {
    process.env.NODE_ENV = 'test';
    expect(envUtils.isTest()).toBe(true);
    expect(envUtils.isDevelopment()).toBe(false);
    expect(envUtils.isProduction()).toBe(false);
  });

  it('should get client configuration from environment', () => {
    process.env.REACT_APP_CLIENT_KEY = 'test-key';
    process.env.REACT_APP_CLIENT_PASSWORD = 'test-password';
    process.env.REACT_APP_API_ENDPOINT = 'https://api.test.com';

    expect(envUtils.getClientKey()).toBe('test-key');
    expect(envUtils.getClientPassword()).toBe('test-password');
    expect(envUtils.getApiEndpoint()).toBe('https://api.test.com');
  });
});
