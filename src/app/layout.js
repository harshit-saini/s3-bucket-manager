import './globals.css';
import { Toaster } from 'react-hot-toast';
import { ClerkProvider } from '@clerk/nextjs';

export const metadata = {
  title: 'S3 Manager — Cloud Storage Browser',
  description: 'A modern web interface to browse, upload, preview, and manage files in your Amazon S3 buckets.',
  keywords: 'S3, AWS, file manager, cloud storage, upload',
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body suppressHydrationWarning>
          {children}
          <Toaster
            position="bottom-center"
            toastOptions={{
              duration: 3500,
              style: {
                background: '#1e2642',
                color: '#f1f5f9',
                border: '1px solid rgba(99, 122, 180, 0.15)',
                borderRadius: '10px',
                fontSize: '0.875rem',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
              },
              success: {
                iconTheme: { primary: '#22c55e', secondary: '#1e2642' },
              },
              error: {
                iconTheme: { primary: '#ef4444', secondary: '#1e2642' },
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
