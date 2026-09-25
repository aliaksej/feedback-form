import { beforeEach, describe, expect, it } from 'vitest';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { decodeRows, encodeRows, type FeedbackRow } from './parquet';
import { upsertRow } from './storage';

const s3Mock = mockClient(S3Client);
const s3 = new S3Client({});

const row = (id: string): FeedbackRow => ({
  id,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  message: `msg ${id}`,
});

const s3Error = (name: string, status: number) =>
  new S3ServiceException({ name, $fault: 'client', $metadata: { httpStatusCode: status } });

const existing = (rows: FeedbackRow[], ETag: string) =>
  ({
    ETag,
    Body: { transformToByteArray: async () => encodeRows(rows) },
  }) as never;

beforeEach(() => s3Mock.reset());

describe('upsertRow', () => {
  it('creates the file when it does not exist', async () => {
    s3Mock.on(GetObjectCommand).rejects(s3Error('NoSuchKey', 404));
    s3Mock.on(PutObjectCommand).resolves({});

    await upsertRow(s3, 'bkt', 'feedback/f.parquet', row('1'));

    const put = s3Mock.commandCalls(PutObjectCommand)[0].args[0].input;
    expect(put).toMatchObject({ Bucket: 'bkt', Key: 'feedback/f.parquet', IfNoneMatch: '*' });
    expect(await decodeRows(put.Body as Uint8Array)).toEqual([row('1')]);
  });

  it('appends to an existing file using its ETag', async () => {
    s3Mock.on(GetObjectCommand).resolves(existing([row('1')], '"e1"'));
    s3Mock.on(PutObjectCommand).resolves({});

    await upsertRow(s3, 'bkt', 'k', row('2'));

    const put = s3Mock.commandCalls(PutObjectCommand)[0].args[0].input;
    expect(put.IfMatch).toBe('"e1"');
    expect(await decodeRows(put.Body as Uint8Array)).toEqual([row('1'), row('2')]);
  });

  it('retries with fresh data after a concurrent write', async () => {
    s3Mock
      .on(GetObjectCommand)
      .resolvesOnce(existing([row('1')], '"e1"'))
      .resolvesOnce(existing([row('1'), row('x')], '"e2"'));
    s3Mock
      .on(PutObjectCommand)
      .rejectsOnce(s3Error('PreconditionFailed', 412))
      .resolves({});

    await upsertRow(s3, 'bkt', 'k', row('2'));

    const puts = s3Mock.commandCalls(PutObjectCommand);
    expect(puts).toHaveLength(2);
    expect(puts[1].args[0].input.IfMatch).toBe('"e2"');
    expect(await decodeRows(puts[1].args[0].input.Body as Uint8Array)).toEqual([
      row('1'),
      row('x'),
      row('2'),
    ]);
  });

  it('gives up after repeated conflicts', async () => {
    s3Mock.on(GetObjectCommand).resolves(existing([], '"e"'));
    s3Mock.on(PutObjectCommand).rejects(s3Error('PreconditionFailed', 412));
    await expect(upsertRow(s3, 'bkt', 'k', row('1'))).rejects.toThrow();
    expect(s3Mock.commandCalls(PutObjectCommand)).toHaveLength(5);
  });

  it('does not treat other errors as a missing file', async () => {
    s3Mock.on(GetObjectCommand).rejects(s3Error('AccessDenied', 403));
    await expect(upsertRow(s3, 'bkt', 'k', row('1'))).rejects.toThrow();
    expect(s3Mock.commandCalls(PutObjectCommand)).toHaveLength(0);
  });
});
