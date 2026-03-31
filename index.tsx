
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

type ErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

class AppErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Beklenmeyen bir hata olustu.',
    };
  }

  componentDidCatch(error: Error) {
    console.error('Application crashed:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f8fafc',
            color: '#0f172a',
            fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
            padding: '24px',
          }}
        >
          <div style={{ maxWidth: 640, width: '100%', background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 10px 30px rgba(15,23,42,0.08)' }}>
            <h1 style={{ margin: 0, marginBottom: 8, fontSize: 20 }}>Uygulama acilirken hata olustu</h1>
            <p style={{ margin: 0, marginBottom: 12, lineHeight: 1.5 }}>
              Lutfen sayfayi yenileyin. Sorun devam ederse geliştirici araclarindaki Console ve Network ekranini kontrol edin.
            </p>
            <pre
              style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: 12,
                background: '#f1f5f9',
                borderRadius: 8,
                padding: 12,
              }}
            >
              {this.state.message}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);
