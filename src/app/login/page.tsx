'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

// ─── Logo Component (DeckForge branded) ──────────────────────

function DeckForgeLogo() {
  return (
    <svg
      width="56"
      height="56"
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow-lg"
    >
      {/* Anvil / Forge shape */}
      <rect x="8" y="28" width="40" height="6" rx="2" fill="url(#grad1)" />
      <rect x="14" y="20" width="28" height="10" rx="3" fill="url(#grad2)" />
      <rect x="20" y="34" width="16" height="8" rx="2" fill="#374151" />
      {/* Spark */}
      <circle cx="18" cy="16" r="3" fill="#F59E0B" opacity="0.9" />
      <circle cx="28" cy="10" r="2.5" fill="#EF4444" opacity="0.8" />
      <circle cx="38" cy="14" r="2" fill="#F97316" opacity="0.7" />
      {/* Glow lines */}
      <line x1="18" y1="13" x2="16" y2="8" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <line x1="28" y1="7.5" x2="28" y2="3" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <line x1="38" y1="12" x2="40" y2="7" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <defs>
        <linearGradient id="grad1" x1="8" y1="28" x2="48" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F97316" />
          <stop offset="1" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id="grad2" x1="14" y1="20" x2="42" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FB923C" />
          <stop offset="1" stopColor="#FBBF24" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ─── Login Content (needs Suspense for useSearchParams) ──────

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  const errorMessages: Record<string, string> = {
    OAuthSignin: 'Erro ao iniciar login. Tente novamente.',
    OAuthCallback: 'Erro no retorno do Microsoft. Tente novamente.',
    OAuthAccountNotLinked: 'Este email já está vinculado a outra conta.',
    AccessDenied: 'Acesso negado. Você não tem permissão para acessar o DeckForge.',
    Verification: 'Token expirado. Faça login novamente.',
    Default: 'Ocorreu um erro inesperado. Tente novamente.',
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#2a2a2a]">
      {/* Background subtle pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(251,146,60,0.05),transparent_70%)]" />

      {/* Logo + Brand */}
      <div className="relative z-10 flex flex-col items-center mb-10">
        <DeckForgeLogo />
        <h1 className="mt-4 text-3xl font-bold tracking-tight">
          <span className="text-orange-400">Deck</span>
          <span className="text-amber-400">Forge</span>
        </h1>
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-sm mx-4">
        <div className="bg-[#363636] rounded-xl border border-[#4a4a4a] shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-white text-center mb-2">
            Bem-vindo ao DeckForge
          </h2>
          <p className="text-sm text-gray-400 text-center mb-8">
            Faça login usando sua conta Microsoft
          </p>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
              {errorMessages[error] || errorMessages.Default}
            </div>
          )}

          {/* Microsoft Sign In Button */}
          <button
            onClick={() => signIn('azure-ad', { callbackUrl })}
            className="w-full py-3.5 px-4 rounded-lg border-2 border-orange-500/60 bg-transparent text-orange-400 font-semibold text-lg hover:bg-orange-500/10 hover:border-orange-400 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-[#363636]"
          >
            Entrar
          </button>
        </div>
      </div>

      {/* Footer */}
      <p className="relative z-10 mt-8 text-xs text-gray-500">
        DeckForge AI Platform — Powered by 7 Agents
      </p>
    </div>
  );
}

// ─── Login Page ──────────────────────────────────────────────

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#2a2a2a]">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-400 border-t-transparent" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
