'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import styles from '../login/Auth.module.css';
import { GraduationCap, BookOpen, UserPlus, AlertCircle, CheckCircle, Mail } from 'lucide-react';
import Link from 'next/link';
import insforge from '@/lib/insforge';

type Step = 'form' | 'verify' | 'done';

export default function SignupPage() {
  const [role, setRole] = useState<'teacher' | 'student'>('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [verifyMethod, setVerifyMethod] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [signedUpUserId, setSignedUpUserId] = useState<string | null>(null); // store from signUp

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await insforge.auth.signUp({
        email,
        password,
        name,
        redirectTo: `${window.location.origin}/login`,
      });

      if (authError) {
        if (authError.message?.includes('already') || authError.statusCode === 409) {
          setError('هذا البريد الإلكتروني مسجل بالفعل. جرب تسجيل الدخول.');
        } else {
          setError(authError.message || 'حدث خطأ أثناء إنشاء الحساب.');
        }
        return;
      }

      // Store user ID for later use in OTP step
      if (data?.user?.id) setSignedUpUserId(data.user.id);

      if (data?.requireEmailVerification) {
        setVerifyMethod((data as any).verifyEmailMethod || 'code');
        setStep('verify');
      } else if (data?.accessToken) {
        // No verification needed — save profile and redirect
        const uid = data?.user?.id;
        if (uid) {
          await insforge.database
            .from('profiles')
            .upsert([{ id: uid, name, role }])
            .select();
        }
        window.location.href = `/dashboard/${role}`;
      }

    } catch (err: any) {
      setError('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: verifyError } = await insforge.auth.verifyEmail({
        email,
        otp,
      });

      if (verifyError) {
        setError('الرمز غير صحيح أو منتهي الصلاحية. يرجى المحاولة مرة أخرى.');
        return;
      }

      // Get user ID: from signUp response (stored), or from verifyEmail response, or from getCurrentUser
      const uid =
        signedUpUserId ||
        data?.user?.id ||
        (await insforge.auth.getCurrentUser()).data?.user?.id;

      if (!uid) {
        setError('تعذر التعرف على الحساب. يرجى تسجيل الدخول يدوياً.');
        return;
      }

      // Save name and role to profiles table
      const { error: profileErr } = await insforge.database
        .from('profiles')
        .upsert([{ id: uid, name, role }])
        .select();

      if (profileErr) {
        // Non-fatal: still redirect, but warn
        console.error('Profile save error:', profileErr);
      }

      setStep('done');
      setTimeout(() => {
        window.location.href = `/dashboard/${role}`;
      }, 2000);

    } catch (err: any) {
      setError('حدث خطأ في التحقق: ' + (err?.message || 'يرجى المحاولة مرة أخرى.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authContainer} dir="rtl">
      <div className={styles.authVisual}>
        <div className={styles.visualContent}>
          <GraduationCap size={64} className={styles.logo} />
          <h1>انضم إلينا اليوم</h1>
          <p>ابدأ رحلتك التعليمية مع أفضل منصة لإدارة الامتحانات.</p>
        </div>
      </div>

      <div className={styles.authForm}>
        <Card className={styles.formCard}>
          <CardHeader>
            <CardTitle>
              {step === 'form' && 'إنشاء حساب جديد'}
              {step === 'verify' && 'تأكيد البريد الإلكتروني'}
              {step === 'done' && '🎉 تم إنشاء الحساب!'}
            </CardTitle>
            <p className={styles.subtitle}>
              {step === 'form' && 'أدخل بياناتك لإنشاء حسابك'}
              {step === 'verify' && `تم إرسال رمز تحقق إلى ${email}`}
              {step === 'done' && 'جاري تحويلك للوحة التحكم...'}
            </p>
          </CardHeader>
          <CardContent>

            {/* ===================== خطوة 1: النموذج ===================== */}
            {step === 'form' && (
              <>
                <div className={styles.roleToggle}>
                  <button className={role === 'student' ? styles.activeRole : ''} onClick={() => setRole('student')}>
                    <BookOpen size={18} /> طالب
                  </button>
                  <button className={role === 'teacher' ? styles.activeRole : ''} onClick={() => setRole('teacher')}>
                    <GraduationCap size={18} /> معلم
                  </button>
                </div>

                {error && <div className={styles.errorBox}><AlertCircle size={16} /> {error}</div>}

                <form onSubmit={handleSignup} className={styles.form}>
                  <div className={styles.inputGroup}>
                    <label>الاسم الكامل</label>
                    <input type="text" placeholder="أدخل اسمك بالكامل" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>البريد الإلكتروني</label>
                    <input type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>كلمة المرور (6 أحرف على الأقل)</label>
                    <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
                  </div>
                  <Button type="submit" className={styles.submitBtn} loading={loading}>
                    {!loading && <>إنشاء الحساب <UserPlus size={18} style={{ marginRight: '8px' }} /></>}
                  </Button>
                </form>

                <p className={styles.footerText}>
                  لديك حساب بالفعل؟ <Link href="/login">تسجيل الدخول</Link>
                </p>
              </>
            )}

            {/* ===================== خطوة 2: التحقق بالرمز ===================== */}
            {step === 'verify' && verifyMethod === 'code' && (
              <>
                {error && <div className={styles.errorBox}><AlertCircle size={16} /> {error}</div>}
                <div className={styles.otpSection}>
                  <Mail size={40} color="var(--primary)" />
                  <h3>أدخل رمز التحقق</h3>
                  <p>تم إرسال رمز مكون من 6 أرقام إلى بريدك الإلكتروني</p>
                </div>
                <form onSubmit={handleVerifyOtp} className={styles.form} style={{ marginTop: '1.5rem' }}>
                  <div className={styles.inputGroup}>
                    <label>رمز التحقق</label>
                    <input type="text" className={styles.otpInput} placeholder="000000" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} required />
                  </div>
                  <Button type="submit" className={styles.submitBtn} loading={loading}>
                    {!loading && 'تحقق من الرمز'}
                  </Button>
                </form>
              </>
            )}

            {/* رسالة في حال التحقق عبر رابط */}
            {step === 'verify' && verifyMethod === 'link' && (
              <div className={styles.otpSection}>
                <Mail size={48} color="var(--primary)" />
                <h3>تحقق من بريدك الإلكتروني</h3>
                <p>أرسلنا لك رابط تأكيد على <strong>{email}</strong>. اضغط عليه لتفعيل حسابك ثم ارجع لتسجيل الدخول.</p>
                <Link href="/login">
                  <Button variant="outline" className={styles.submitBtn}>العودة لتسجيل الدخول</Button>
                </Link>
              </div>
            )}

            {/* ===================== خطوة 3: تم ===================== */}
            {step === 'done' && (
              <div className={styles.successBox} style={{ fontSize: '1rem', padding: '1.5rem', justifyContent: 'center', flexDirection: 'column', gap: '0.75rem' }}>
                <CheckCircle size={32} />
                <span>تم إنشاء حسابك وتأكيده بنجاح!</span>
                <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>جاري التحويل للوحة التحكم...</span>
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
