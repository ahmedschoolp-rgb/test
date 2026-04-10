'use client';

import React, { useEffect, useState } from 'react';
import { LayoutDashboard, FileText, Users, BarChart3, Settings, LogOut, Search, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import styles from './Dashboard.module.css';
import insforge from '@/lib/insforge';
import { getUserProfile } from '@/lib/profile';

const teacherNav = [
  { icon: LayoutDashboard, label: 'لوحة التحكم', href: '/dashboard/teacher' },
  { icon: FileText,        label: 'الامتحانات',  href: '/dashboard/teacher/exams' },
  { icon: Users,           label: 'الطلاب',      href: '/dashboard/teacher/students' },
  { icon: BarChart3,       label: 'التحليلات',   href: '/dashboard/teacher/analytics' },
  { icon: Settings,        label: 'الإعدادات',   href: '/dashboard/teacher/settings' },
];

const studentNav = [
  { icon: LayoutDashboard, label: 'الرئيسية',    href: '/dashboard/student' },
  { icon: FileText,        label: 'نتائجي',      href: '/dashboard/student/results' },
  { icon: Settings,        label: 'الإعدادات',   href: '/dashboard/student/settings' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  const [userName,    setUserName]    = useState('');
  const [userEmail,   setUserEmail]   = useState('');
  const [role,        setRole]        = useState<'teacher' | 'student' | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: ud } = await insforge.auth.getCurrentUser();
      if (!ud?.user) { router.push('/login'); return; }

      setUserEmail(ud.user.email || '');

      // Read role + name from our profiles table
      const profile = await getUserProfile(ud.user.id);
      const userRole = profile.role;
      const uName = profile.name || ud.user.email?.split('@')[0] || 'المستخدم';

      setRole(userRole);
      setUserName(uName);

      // Redirect to correct dashboard if on wrong one
      const isTeacherPath = pathname.startsWith('/dashboard/teacher');
      const isStudentPath = pathname.startsWith('/dashboard/student');

      if (userRole === 'student' && (pathname === '/dashboard' || isTeacherPath)) {
        router.replace('/dashboard/student');
      } else if (userRole === 'teacher' && (pathname === '/dashboard' || isStudentPath)) {
        router.replace('/dashboard/teacher');
      }
    };

    init();
  }, []);

  const handleLogout = async () => {
    await insforge.auth.signOut();
    router.push('/login');
  };

  const navItems = role === 'student' ? studentNav : teacherNav;
  const initial  = userName ? userName[0] : '؟';

  return (
    <div className={styles.layout} dir="rtl">
      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />}

      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={sidebarOpen ? styles.sidebarHeaderOpen : styles.sidebarHeader}>
          <div className={styles.brand}>
            <div className={styles.logoIcon}>E</div>
            <span>إيدو إكزام</span>
          </div>
          <button className={styles.closeBtn} onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Role badge */}
        <div className={styles.roleBadge}>
          {role === 'teacher' ? '🎓 حساب معلم' : '📚 حساب طالب'}
        </div>

        <nav className={styles.nav}>
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={pathname === item.href || pathname.startsWith(item.href + '/') ? styles.navActive : styles.navItem}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userCard}>
            <div className={styles.avatarSm}>{initial}</div>
            <div style={{ minWidth: 0 }}>
              <p className={styles.userName}>{userName}</p>
              <p className={styles.userRole}>{role === 'teacher' ? 'معلم' : 'طالب'}</p>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <LogOut size={18} /><span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <button className={styles.menuBtn} onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <div className={styles.search}>
            <Search size={16} />
            <input type="text" placeholder="بحث..." />
          </div>
          <div className={styles.topRight}>
            <div className={styles.avatarTop} title={userEmail}>{initial}</div>
          </div>
        </header>

        <section className={styles.content}>{children}</section>
      </main>
    </div>
  );
}
