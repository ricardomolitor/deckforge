import type { Metadata } from 'next';
import AuthProvider from '@/components/providers/AuthProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'DeckForge — Apresentações Matadoras',
  description: 'Plataforma inteligente para criar apresentações matadoras para workshops, treinamentos, vendas, propostas e muito mais.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-gray-50 antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
