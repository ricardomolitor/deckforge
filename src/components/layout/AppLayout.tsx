'use client';

import { useStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  BookOpen,
  LayoutTemplate,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Presentation,
  Zap,
  History,
} from 'lucide-react';
import { useState } from 'react';

interface AppLayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { href: '/forge', label: 'Forge', icon: Zap, primary: true },
  { href: '/workshops', label: 'Projetos', icon: History },
  { href: '/templates', label: 'Templates', icon: LayoutTemplate },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const { isAuthenticated, currentUser, logout } = useStore();
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-purple-600 text-white font-bold text-sm">
                D
              </div>
              <span className="hidden text-lg font-semibold text-gray-900 sm:block">
                DeckForge
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1" aria-label="Navegação principal">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-ring ${
                    (item as any).primary
                      ? 'bg-gradient-to-r from-brand-600 to-purple-600 text-white hover:from-brand-700 hover:to-purple-700 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right: User menu */}
          <div className="flex items-center gap-4">
            {/* User dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 focus-ring"
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-xs font-semibold">
                  {currentUser?.name?.charAt(0) || 'U'}
                </div>
                <span className="hidden sm:block">{currentUser?.name || 'Usuário'}</span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 z-40 mt-2 w-56 rounded-md border border-gray-200 bg-white py-1 shadow-lg animate-fade-in">
                    <div className="border-b border-gray-100 px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">
                        {currentUser?.name}
                      </p>
                      <p className="text-xs text-gray-500">{currentUser?.email}</p>
                    </div>
                    <Link
                      href="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Settings className="h-4 w-4" />
                      Configurações
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Sair
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden rounded-md p-2 text-gray-600 hover:bg-gray-100 focus-ring"
              aria-label="Abrir menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="border-t border-gray-200 bg-white md:hidden animate-fade-in">
            <nav className="flex flex-col px-4 py-2" aria-label="Navegação mobile">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
