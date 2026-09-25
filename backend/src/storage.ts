import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { decodeRows, encodeRows, type FeedbackRow } from './parquet';

const MAX_ATTEMPTS = 5;

function isConflict(err: unknown): boolean {
  return (
    err instanceof S3ServiceException &&
    (err.$metadata.httpStatusCode === 412 || err.$metadata.httpStatusCode === 409)
  );
}

function isMissing(err: unknown): boolean {
  return err instanceof S3ServiceException && err.name === 'NoSuchKey';
}

/**
 * Create the Parquet file at `bucket/key` with `row`, or append `row` to it if
 * it already exists. S3 has no append, so this is read-modify-write guarded by
 * conditional writes (If-Match / If-None-Match) and retried when a concurrent
 * invocation changed the file in between.
 */
export async function upsertRow(
  s3: S3Client,
  bucket: string,
  key: string,
  row: FeedbackRow,
): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    let rows: FeedbackRow[] = [];
    let etag: string | undefined;
    try {
      const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      rows = await decodeRows(await res.Body!.transformToByteArray());
      etag = res.ETag;
    } catch (err) {
      if (!isMissing(err)) throw err;
    }

    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: encodeRows([...rows, row]),
          ContentType: 'application/vnd.apache.parquet',
          ...(etag ? { IfMatch: etag } : { IfNoneMatch: '*' }),
        }),
      );
      return;
    } catch (err) {
      if (!isConflict(err) || attempt >= MAX_ATTEMPTS) throw err;
    }
  }
}
