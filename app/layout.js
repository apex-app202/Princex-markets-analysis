import './globals.css';

export const metadata = {
  title: 'Princex Markets Analysis',
  description: 'Precision signals for Deriv Rise/Fall trading',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-[#0a0a0a] text-white min-h-screen">{children}</body>
    </html>
  );
}
