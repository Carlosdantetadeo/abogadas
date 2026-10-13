import './globals.css';

export const metadata = {
  metadataBase: new URL(process.env.SAPP_SITE_ORIGIN || 'http://localhost:3000'),
  title: {
    default: 'Sociedad de Abogadas del Perú',
    template: '%s | Sociedad de Abogadas del Perú',
  },
  description: 'Una comunidad que impulsa el liderazgo de las abogadas del Perú.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es-PE">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Source+Sans+3:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="icon" href="/assets/logo.jpg" type="image/jpeg" />
      </head>
      <body>{children}</body>
    </html>
  );
}
