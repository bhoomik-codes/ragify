import React from 'react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import styles from './ProfilePage.module.css';
import { UserCircle, Clock, Lock, Star, LogOut, BarChart2 } from 'lucide-react';
import Link from 'next/link';
import { ProfileIdentity } from './ProfileIdentity';

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const dbUser = await db.user.findUnique({ where: { id: session.user.id } });
  if (!dbUser) {
    redirect('/login');
  }

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-8">
      <h1 className="text-2xl font-semibold mb-6 text-foreground">Profile Settings</h1>
      
      <div className={styles.shell}>
        <nav className={styles.nav}>
          <a href="#profile" className={`${styles.navItem} ${styles.active}`}>
            <UserCircle className={styles.navIcon} />
            <span>Profile</span>
          </a>
          <a href="#activity" className={styles.navItem}>
            <Clock className={styles.navIcon} />
            <span>Activity</span>
          </a>
          
          <div className={styles.navSep} />
          
          <a href="#usage" className={styles.navItem}>
            <BarChart2 className={styles.navIcon} />
            <span>Usage & limits</span>
          </a>
          <a href="#security" className={styles.navItem}>
            <Lock className={styles.navIcon} />
            <span>Security</span>
          </a>
          <a href="#preferences" className={styles.navItem}>
            <Star className={styles.navIcon} />
            <span>Preferences</span>
          </a>
          
          <div className={styles.navSep} />
          
          <Link href="/api/auth/signout" className={styles.navItem}>
            <LogOut className={styles.navIcon} />
            <span>Sign out</span>
          </Link>
        </nav>
        
        <main className={styles.content}>
          <div id="profile" className={styles.section}>
            <h3 className={styles.secLabel}>Profile identity</h3>
            <ProfileIdentity user={dbUser!} />
          </div>
        </main>
      </div>
    </div>
  );
}
