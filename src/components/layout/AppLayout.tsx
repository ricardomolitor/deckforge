'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Zap, Menu, X, LogOut, User } from 'lucide-react';
import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';

interface AppLayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { href: '/forge', label: 'Forge', icon: Zap, primary: true },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
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
            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      item.primary
                        ? 'bg-gradient-to-r from-brand-600 to-purple-600 text-white hover:from-brand-700 hover:to-purple-700 shadow-sm'
                        : isActive
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: User Menu + Mobile button */}
          <div className="flex items-center gap-3">
            {/* User info */}
            {session?.user && (
              <div className="hidden sm:flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt=""
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </div>
                <span className="text-sm text-gray-600 max-w-[150px] truncate">
                  {session.user.name || session.user.email}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="ml-1 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-500 transition-colors"
                  title="Sair"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden rounded-md p-2 text-gray-600 hover:bg-gray-100"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="border-t border-gray-200 bg-white md:hidden">
            <nav className="flex flex-col px-4 py-2">
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
              {session?.user && (
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sair ({session.user.name || session.user.email})
                </button>
              )}
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
