import './globals.css';
import { ThemeProvider } from '@/contexts/ThemeContext';

export const metadata = {
  title: 'Princex Markets Analysis',
  description: 'Precision signals for Deriv Rise/Fall trading',
  manifest: '/manifest.json',
  themeColor: '#0a0a0a',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Princex' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className="min-h-screen">
        <ThemeProvider>{children}</ThemeProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.log('Service worker registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
