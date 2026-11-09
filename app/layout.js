import './globals.css';

export const metadata = {
  title: 'GFI Talent | Hiring Workspace',
  description: 'An evidence-led candidate screening workspace for Growth For Impact. Explore transparent LCA and UI/UX rankings, inspect resume evidence and review screening decisions.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f7f8fb',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
