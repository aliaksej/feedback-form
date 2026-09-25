export interface FeedbackPayload {
  message: string;
}

export async function sendFeedback(
  apiUrl: string,
  payload: FeedbackPayload,
): Promise<void> {
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`);
  }
}
