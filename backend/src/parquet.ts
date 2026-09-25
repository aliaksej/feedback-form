import { parquetReadObjects } from 'hyparquet';
import { parquetWriteBuffer } from 'hyparquet-writer';

export interface FeedbackRow {
  id: string;
  createdAt: Date;
  message: string;
}

export function encodeRows(rows: FeedbackRow[]): Uint8Array {
  const buffer = parquetWriteBuffer({
    columnData: [
      { name: 'id', type: 'STRING', data: rows.map((r) => r.id) },
      { name: 'created_at', type: 'TIMESTAMP', data: rows.map((r) => r.createdAt) },
      { name: 'message', type: 'STRING', data: rows.map((r) => r.message) },
    ],
  });
  return new Uint8Array(buffer);
}

export async function decodeRows(bytes: Uint8Array): Promise<FeedbackRow[]> {
  const file = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const records = await parquetReadObjects({ file });
  return records.map((r) => ({
    id: String(r.id),
    createdAt: r.created_at as Date,
    message: String(r.message),
  }));
}
