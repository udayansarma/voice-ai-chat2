import React from 'react';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetErrorBoundary }) => (
  <div role="alert" style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
    <h2>Something went wrong</h2>
    <pre style={{ color: 'red', whiteSpace: 'pre-wrap' }}>{error.message}</pre>
    <button onClick={resetErrorBoundary}>Try again</button>
  </div>
);

export default ErrorFallback;
