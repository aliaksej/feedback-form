import { useState, type FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { sendFeedback } from './api/feedback';

type Status = 'idle' | 'submitting' | 'success' | 'error';

export const MAX_LENGTH = 2000;

export function FeedbackForm({ apiUrl }: { apiUrl: string }) {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const trimmed = message.trim();
  const submitting = status === 'submitting';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!trimmed || submitting) return;
    setStatus('submitting');
    try {
      await sendFeedback(apiUrl, { message: trimmed });
      setMessage('');
      setStatus('success');
    } catch {
      setStatus('error'); // keep the message so the user can retry
    }
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <TextField
        id="feedback-message"
        label="Your feedback"
        value={message}
        multiline
        minRows={6}
        fullWidth
        helperText={`${message.length}/${MAX_LENGTH}`}
        slotProps={{ htmlInput: { maxLength: MAX_LENGTH } }}
        onChange={(e) => {
          setMessage(e.target.value);
          if (status !== 'submitting') setStatus('idle');
        }}
      />
      <Button
        type="submit"
        variant="contained"
        disabled={!trimmed || submitting}
        sx={{ alignSelf: 'flex-end' }}
      >
        {submitting ? 'Sending…' : 'Send feedback'}
      </Button>
      <div aria-live="polite">
        {status === 'success' && (
          <Alert severity="success">Thank you for your feedback!</Alert>
        )}
        {status === 'error' && (
          <Alert severity="error">Something went wrong. Please try again.</Alert>
        )}
      </div>
    </Box>
  );
}
