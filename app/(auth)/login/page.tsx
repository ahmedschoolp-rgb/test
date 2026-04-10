'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import styles from './Auth.module.css';
import { GraduationCap, BookOpen, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import insforge from '@/lib/insforge';
import { getUserProfile } from '@/lib/profile';

export default function LoginPage() {
  const [role, setRole] = useState<'teacher' | 'student'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await insforge.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        if (authError.statusCode === 403) {
          setError('البريد الإلكتروني غير مفعّل. يرجى مراجعة بريدك ورمز التحقق.');
        } else {
          setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
        }
        return;
      }

      // Read role from profiles table (source of truth)
      const userId = data?.user?.id;
      let userRole = 'teacher';
      if (userId) {
        const profile = await getUserProfile(userId);
        userRole = profile.role;
      }

      window.location.href = `/dashboard/${userRole}`;

    } catch (err: any) {
      setError('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authContainer} dir="rtl">
      <div className={styles.authVisual}>
        <div className={styles.visualContent}>
          <GraduationCap size={64} className={styles.logo} />
          <h1>إيدو إكزام إيليت</h1>
          <p>مستقبل التقييم التعليمي بين يديك. منصة متطورة لإدارة الامتحانات بكل سهولة وأمان.</p>
        </div>
      </div>
      
      <div className={styles.authForm}>
        <Card className={styles.formCard}>
          <CardHeader>
            <CardTitle>مرحباً بك مجدداً</CardTitle>
            <p className={styles.subtitle}>أدخل بياناتك للوصول إلى لوحة التحكم الخاصة بك</p>
          </CardHeader>
          <CardContent>
            <div className={styles.roleToggle}>
              <button 
                className={role === 'student' ? styles.activeRole : ''} 
                onClick={() => setRole('student')}
              >
                <BookOpen size={18} /> طالب
              </button>
              <button 
                className={role === 'teacher' ? styles.activeRole : ''} 
                onClick={() => setRole('teacher')}
              >
                <GraduationCap size={18} /> معلم
              </button>
            </div>

            {error && (
              <div className={styles.errorBox}>
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <form onSubmit={handleLogin} className={styles.form}>
              <div className={styles.inputGroup}>
                <label>البريد الإلكتروني</label>
                <input 
                  type="email" 
                  placeholder="name@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
              <div className={styles.inputGroup}>
                <label>كلمة المرور</label>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
              <Button type="submit" className={styles.submitBtn} loading={loading}>
                {!loading && <>تسجيل الدخول <ArrowLeft size={18} style={{ marginRight: '8px' }} /></>}
              </Button>
            </form>

            <p className={styles.footerText}>
              ليس لديك حساب؟ <Link href="/signup">إنشاء حساب جديد</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
