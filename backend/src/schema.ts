import { z } from 'zod';

export const MAX_MESSAGE_LENGTH = 2000;

/** Request body. Must stay in sync with the frontend's FeedbackPayload. */
export const feedbackSchema = z
  .object({ message: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH) })
  .strict();

export type FeedbackPayload = z.infer<typeof feedbackSchema>;
