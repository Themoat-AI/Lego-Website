import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BrickBuddy League',
  description: 'A playful LEGO org builder for kids and parents'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
