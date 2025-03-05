/*
 * Reusable navigation link component with active state styling
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
}

export const NavLink = ({ href, children }: NavLinkProps) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link 
      href={href} 
      className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base transition-colors ${
        isActive 
          ? 'text-primary font-medium' 
          : 'text-secondary hover:text-primary'
      }`}
    >
      {children}
    </Link>
  );
}; 