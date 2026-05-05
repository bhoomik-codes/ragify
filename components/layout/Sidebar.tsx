'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Settings, Menu, X, LogOut, BarChart3, UserCircle } from 'lucide-react';
import { signOut } from 'next-auth/react';
import styles from './Sidebar.module.css';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Analytics', href: '/analytics', icon: BarChart3 },
    { label: 'Profile', href: '/settings/profile', icon: UserCircle },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <>
      <button 
        className={styles.mobileHamburger} 
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle Menu"
      >
        <Menu size={20} />
      </button>

      {mobileMenuOpen && (
        <div className={styles.overlay} onClick={() => setMobileMenuOpen(false)} />
      )}

      <aside className={`${styles.sidebar} ${mobileMenuOpen ? styles.open : ''}`}>
        <div className={styles.header}>
        <div className={styles.logo}>
          <img src="/ragify_logo.svg" alt="Ragify Logo" width={24} height={24} style={{ marginRight: '8px' }} />
          Ragify
        </div>
          <button 
            className={styles.closeBtn} 
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close Menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/settings' && pathname?.startsWith(item.href));
            return (
              <Link 
                key={item.href} 
                href={item.href} 
                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon size={20} className={styles.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.footer}>
          <button 
            className={styles.logoutBtn} 
            onClick={() => signOut({ callbackUrl: '/login' })}
            aria-label="Sign Out"
          >
            <LogOut size={20} className={styles.icon} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
