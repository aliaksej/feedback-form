import { describe, expect, it } from 'vitest';
import { resolveConfig } from './config';

describe('resolveConfig', () => {
  it('prefers runtime config over build-time env', () => {
    const env = { VITE_API_URL: 'http://env' } as ImportMetaEnv;
    expect(resolveConfig({ apiUrl: 'http://runtime' }, env).apiUrl).toBe(
      'http://runtime',
    );
  });

  it('falls back to build-time env when runtime value is empty', () => {
    const env = { VITE_API_URL: 'http://env' } as ImportMetaEnv;
    expect(resolveConfig({ apiUrl: '' }, env).apiUrl).toBe('http://env');
    expect(resolveConfig(null, env).apiUrl).toBe('http://env');
  });

  it('throws when nothing is configured', () => {
    expect(() => resolveConfig(null, {} as ImportMetaEnv)).toThrow(/apiUrl/);
  });
});
