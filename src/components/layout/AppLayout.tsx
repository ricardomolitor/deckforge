'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Zap, Menu, X, LogOut, ChevronDown, Sun, Moon } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useTheme } from '@/components/providers/ThemeProvider';

interface AppLayoutProps {
  children: React.ReactNode;
}

interface CockpitInfo {
  configured: boolean;
  license: { id: string; name: string };
  namespace: { id: string; name: string };
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { href: '/forge', label: 'Forge', icon: Zap, primary: true },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [cockpitInfo, setCockpitInfo] = useState<CockpitInfo | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch cockpit license/namespace info
  useEffect(() => {
    fetch('/api/cockpit/info')
      .then((r) => r.json())
      .then(setCockpitInfo)
      .catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userName = session?.user?.name || '';
  const userEmail = session?.user?.email || '';
  const initials = userName ? getInitials(userName) : userEmail?.substring(0, 2).toUpperCase() || '?';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm transition-colors duration-200">
        <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-purple-600 text-white font-bold text-sm">
                D
              </div>
              <span className="hidden text-lg font-semibold text-gray-900 dark:text-white sm:block">
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
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Theme Toggle + User Menu + Mobile button */}
          <div className="flex items-center gap-3">
            {/* Theme toggle button */}
            <button
              onClick={toggleTheme}
              className="rounded-lg p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
              aria-label={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>

            {/* User dropdown (SDA-style) */}
            {session?.user && (
              <div className="relative hidden sm:block" ref={menuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white text-xs font-bold">
                    {initials}
                  </div>
                  <div className="hidden lg:block text-left">
                    <div className="text-sm font-medium text-gray-900 dark:text-white max-w-[160px] truncate">
                      {userName || userEmail}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 max-w-[160px] truncate">
                      {userEmail}
                    </div>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-72 rounded-xl bg-[#363636] border border-[#4a4a4a] shadow-2xl overflow-hidden z-50 animate-fade-in">
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-[#4a4a4a]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white text-sm font-bold shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white truncate">
                            {userName}
                          </div>
                          <div className="text-xs text-gray-400 truncate">
                            {userEmail}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Cockpit info */}
                    {cockpitInfo?.configured && (
                      <div className="px-4 py-3 border-b border-[#4a4a4a]">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs text-gray-400">Licença</span>
                          <span className="text-sm font-semibold text-white">
                            {cockpitInfo.license.name}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-400">Namespace</span>
                          <span className="text-sm font-semibold text-white">
                            {cockpitInfo.namespace.name}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Sign out */}
                    <button
                      onClick={() => signOut({ callbackUrl: '/login' })}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-[#4a4a4a] transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sair
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden rounded-md p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 md:hidden">
            <nav className="flex flex-col px-4 py-2">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
              {session?.user && (
                <>
                  {/* Mobile theme toggle */}
                  <button
                    onClick={toggleTheme}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
                  </button>
                  {cockpitInfo?.configured && (
                    <div className="px-3 py-2 text-xs text-gray-400 border-t border-gray-100 dark:border-gray-700 mt-1 pt-2">
                      <span>Licença: <strong className="text-gray-600 dark:text-gray-300">{cockpitInfo.license.name}</strong></span>
                      <span className="mx-2">·</span>
                      <span>Namespace: <strong className="text-gray-600 dark:text-gray-300">{cockpitInfo.namespace.name}</strong></span>
                    </div>
                  )}
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Sair ({userName || userEmail})
                  </button>
                </>
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
