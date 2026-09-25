import { beforeEach, describe, expect, it, vi } from 'vitest';
import { S3Client } from '@aws-sdk/client-s3';
import { createHandler, loadConfig } from './index';
import * as storage from './storage';

vi.mock('./storage');

const handler = createHandler({ bucket: 'bkt', key: 'feedback/f.parquet' }, new S3Client({}));

beforeEach(() => vi.resetAllMocks());

describe('handler', () => {
  it('stores valid feedback and returns 201 with an id', async () => {
    vi.mocked(storage.upsertRow).mockResolvedValue();
    const res = await handler({ body: JSON.stringify({ message: ' hello ' }) });

    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).id).toEqual(expect.any(String));
    expect(vi.mocked(storage.upsertRow).mock.calls[0].slice(1, 3)).toEqual([
      'bkt',
      'feedback/f.parquet',
    ]);
    expect(vi.mocked(storage.upsertRow).mock.calls[0][3].message).toBe('hello');
  });

  it('decodes base64 bodies', async () => {
    vi.mocked(storage.upsertRow).mockResolvedValue();
    const body = Buffer.from(JSON.stringify({ message: 'hi' })).toString('base64');
    expect((await handler({ body, isBase64Encoded: true })).statusCode).toBe(201);
  });

  it.each([
    ['missing body', undefined],
    ['malformed JSON', '{nope'],
    ['empty message', JSON.stringify({ message: '  ' })],
    ['unknown field', JSON.stringify({ message: 'a', extra: 1 })],
    ['too long', JSON.stringify({ message: 'a'.repeat(2001) })],
  ])('rejects %s with 400', async (_name, body) => {
    expect((await handler({ body })).statusCode).toBe(400);
    expect(storage.upsertRow).not.toHaveBeenCalled();
  });

  it('returns 500 without leaking details when storage fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(storage.upsertRow).mockRejectedValue(new Error('secret detail'));
    const res = await handler({ body: JSON.stringify({ message: 'hi' }) });
    expect(res.statusCode).toBe(500);
    expect(res.body).not.toContain('secret');
  });
});

describe('loadConfig', () => {
  it('reads bucket and key from env', () => {
    expect(loadConfig({ BUCKET_NAME: 'b', OBJECT_KEY: 'k' })).toEqual({ bucket: 'b', key: 'k' });
  });
  it('throws when env is missing', () => {
    expect(() => loadConfig({ BUCKET_NAME: 'b' })).toThrow(/OBJECT_KEY/);
  });
});
