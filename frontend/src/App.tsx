import type { AppConfig } from './config';

export function App({ config }: { config: AppConfig }) {
  return (
    <main>
      <h1>Feedback</h1>
      <p>Submitting to {config.apiUrl}</p>
    </main>
  );
}
