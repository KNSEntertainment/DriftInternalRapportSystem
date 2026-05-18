'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, LogIn } from 'lucide-react';
import Link from 'next/link';

export function Header() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="bg-gray-900 text-white border-b border-gray-800">
            <div className='flex items-center justify-between container p-2'>
                {/* Logo */}
                <div className="flex-shrink-0 flex items-center">
                  <Link href="/dashboard" className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">DR</span>
                    </div>
                    <span className="text-xl font-semibold text-gray-200">DriftRapport</span>
                  </Link>
                </div>
                <div className="flex gap-2 items-center text-xs text-gray-300">
                  {user ? (
                    <>
                      <span className="text-xs text-gray-300">{user.email}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSignOut}
                        className="flex items-center cursor-pointer space-x-1 border-gray-600 text-gray-300 bg-red-600 hover:bg-red-700 hover:border-red-700 hover:text-white transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logg ut</span>
                      </Button>
                    </>
                  ) : (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="flex items-center cursor-pointer space-x-1 border-gray-600 text-gray-300 bg-blue-600 hover:bg-blue-700 hover:border-blue-700 hover:text-white transition-colors"
                    >
                      <Link href="/login">
                        <LogIn className="w-4 h-4" />
                        <span>Logg inn</span>
                      </Link>
                    </Button>
                  )}
                </div>
            </div>
    </header>
  );
}
