import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { loadConfig } from './config';
import { App } from './App';

const root = createRoot(document.getElementById('root')!);

loadConfig()
  .then((config) => {
    root.render(
      <StrictMode>
        <App config={config} />
      </StrictMode>,
    );
  })
  .catch((err: Error) => {
    root.render(<p role="alert">{err.message}</p>);
  });
