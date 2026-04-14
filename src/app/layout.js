import './globals.css';
import { Toaster } from 'react-hot-toast';
import { ClerkProvider } from '@clerk/nextjs';
import { Manrope, Space_Grotesk, JetBrains_Mono } from 'next/font/google';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-body',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata = {
  title: 'S3 Manager - Cloud Storage Browser',
  description: 'A modern web interface to browse, upload, preview, and manage files in your Amazon S3 buckets.',
  keywords: 'S3, AWS, file manager, cloud storage, upload',
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${manrope.variable} ${spaceGrotesk.variable} ${jetBrainsMono.variable}`}>
        <body suppressHydrationWarning>
          {children}
          <Toaster
            position="bottom-center"
            toastOptions={{
              duration: 3500,
              style: {
                background: '#15223a',
                color: '#e6edf8',
                border: '1px solid rgba(84, 108, 151, 0.35)',
                borderRadius: '12px',
                fontSize: '0.875rem',
                boxShadow: '0 10px 30px rgba(5, 9, 20, 0.45)',
              },
              success: {
                iconTheme: { primary: '#22c55e', secondary: '#15223a' },
              },
              error: {
                iconTheme: { primary: '#ef4444', secondary: '#15223a' },
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
