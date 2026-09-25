import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { FeedbackForm } from './FeedbackForm';
import * as api from './api/feedback';

vi.mock('./api/feedback');

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

const setup = () => {
  render(<FeedbackForm apiUrl="http://api" />);
  return {
    box: screen.getByLabelText('Your feedback'),
    button: screen.getByRole('button', { name: 'Send feedback' }),
  };
};

describe('FeedbackForm', () => {
  it('disables the button while the message is empty', async () => {
    const { box, button } = setup();
    expect(button).toBeDisabled();
    await userEvent.type(box, '   ');
    expect(button).toBeDisabled();
  });

  it('sends the trimmed message and clears the form on success', async () => {
    vi.mocked(api.sendFeedback).mockResolvedValue();
    const { box, button } = setup();
    await userEvent.type(box, ' great site ');
    await userEvent.click(button);

    expect(api.sendFeedback).toHaveBeenCalledWith('http://api', {
      message: 'great site',
    });
    expect(await screen.findByText(/thank you/i)).toBeInTheDocument();
    expect(box).toHaveValue('');
  });

  it('shows an error and keeps the input on failure', async () => {
    vi.mocked(api.sendFeedback).mockRejectedValue(new Error('boom'));
    const { box, button } = setup();
    await userEvent.type(box, 'hello');
    await userEvent.click(button);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(box).toHaveValue('hello');
    expect(button).toBeEnabled();
  });
});
