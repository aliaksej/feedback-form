import Container from '@mui/material/Container';
import CssBaseline from '@mui/material/CssBaseline';
import Typography from '@mui/material/Typography';
import type { AppConfig } from './config';
import { FeedbackForm } from './FeedbackForm';

export function App({ config }: { config: AppConfig }) {
  return (
    <>
      <CssBaseline />
      <Container component="main" maxWidth="sm" sx={{ py: 6 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Feedback
        </Typography>
        <FeedbackForm apiUrl={config.apiUrl} />
      </Container>
    </>
  );
}
