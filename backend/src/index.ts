import { randomUUID } from 'node:crypto';
import { S3Client } from '@aws-sdk/client-s3';
import { feedbackSchema, MAX_MESSAGE_LENGTH } from './schema';
import { upsertRow } from './storage';

/** Subset of the Lambda Function URL / API Gateway v2 event we use. */
export interface HttpEvent {
  body?: string | null;
  isBase64Encoded?: boolean;
}

export interface HttpResult {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export interface Config {
  bucket: string;
  /** Object key of the Parquet file, taken from the environment. */
  key: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const bucket = env.BUCKET_NAME;
  const key = env.OBJECT_KEY;
  if (!bucket || !key) {
    throw new Error('BUCKET_NAME and OBJECT_KEY environment variables are required');
  }
  return { bucket, key };
}

const json = (statusCode: number, body: unknown): HttpResult => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export function createHandler(config: Config, s3: S3Client) {
  return async (event: HttpEvent): Promise<HttpResult> => {
    let raw = event.body ?? '';
    if (event.isBase64Encoded) raw = Buffer.from(raw, 'base64').toString('utf8');
    if (raw.length > MAX_MESSAGE_LENGTH * 4 + 100) {
      return json(413, { error: 'Payload too large' });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return json(400, { error: 'Body must be valid JSON' });
    }
    const result = feedbackSchema.safeParse(parsed);
    if (!result.success) {
      return json(400, { error: 'Invalid feedback', issues: result.error.issues });
    }

    const id = randomUUID();
    try {
      await upsertRow(s3, config.bucket, config.key, {
        id,
        createdAt: new Date(),
        message: result.data.message,
      });
    } catch (err) {
      console.error('Failed to store feedback', { id, err });
      return json(500, { error: 'Failed to store feedback' });
    }
    return json(201, { id });
  };
}

// Created once per cold start; fails fast if the environment is misconfigured.
let cached: ReturnType<typeof createHandler> | undefined;
export const handler = async (event: HttpEvent) =>
  (cached ??= createHandler(loadConfig(), new S3Client({})))(event);
