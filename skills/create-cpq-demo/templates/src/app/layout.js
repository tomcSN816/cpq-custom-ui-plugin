import './globals.css';

export const metadata = {
  title: 'CPQ Demo',
  description: 'Product configurator demo',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
