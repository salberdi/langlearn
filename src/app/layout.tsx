import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import AuthButton from '@/components/ui/AuthButton';
import './globals.css';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'LangLearn',
  description: 'Learn languages by reading books',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#2563eb',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} font-sans antialiased bg-gray-50 text-gray-900`}>
        <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <a href="/" className="text-lg font-semibold">LangLearn</a>
            <div className="flex items-center gap-4 text-sm">
              <a href="/upload" className="text-blue-600 hover:text-blue-800">Upload</a>
              <a href="/study" className="text-blue-600 hover:text-blue-800">Study</a>
              <a href="/review" className="text-blue-600 hover:text-blue-800">Review</a>
              <AuthButton />
            </div>
          </div>
        </nav>
        <main className="max-w-3xl mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
