import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from 'react-error-boundary';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

function Fallback({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) {
  return (
    <div role="alert" style={{ padding: '20px', textAlign: 'center', color: 'white', backgroundColor: 'rgba(0,0,0,0.8)', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <h2>Something went wrong:</h2>
      <pre style={{ color: 'red', marginBottom: '20px', maxWidth: '80%', overflowX: 'auto' }}>{error.message}</pre>
      <button 
        onClick={resetErrorBoundary}
        style={{padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#3b82f6', color: 'white', cursor: 'pointer'}}
      >
        Try again
      </button>
    </div>
  );
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary
      FallbackComponent={Fallback}
      onReset={() => {
        // Reset the state of your app so the error doesn't happen again
        console.log("Error boundary reset.");
      }}
    >
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);