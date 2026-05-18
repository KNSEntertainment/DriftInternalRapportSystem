'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/ui/header';
import { Navbar } from '@/components/ui/navbar';

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname();
  const hideNavbar = pathname === '/login';

  return (
    <>
      <Header />
      {!hideNavbar && <Navbar />}
      <main id="main-content" className="flex-1">
        {children}
      </main>
    </>
  );
}
