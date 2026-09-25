import { describe, expect, it } from 'vitest';
import { decodeRows, encodeRows } from './parquet';

describe('parquet', () => {
  it('round-trips rows', async () => {
    const rows = [
      { id: 'a', createdAt: new Date('2026-01-02T03:04:05.000Z'), message: 'hi' },
      { id: 'b', createdAt: new Date('2026-01-03T00:00:00.000Z'), message: 'привет' },
    ];
    expect(await decodeRows(encodeRows(rows))).toEqual(rows);
  });
});
