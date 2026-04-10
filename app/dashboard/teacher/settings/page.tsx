'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { User, Lock, Bell, Save, AlertCircle, CheckCircle } from 'lucide-react';
import insforge from '@/lib/insforge';
import { getUserProfile } from '@/lib/profile';
import styles from './Settings.module.css';

export default function SettingsPage() {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [avatar, setAvatar]     = useState<string | undefined>(undefined);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw]       = useState('');

  // Notification toggles — state only (no backend for now)
  const [notifSubmit, setNotifSubmit]  = useState(false);
  const [notifDigest, setNotifDigest]  = useState(false);

  const [saving, setSaving]     = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [msg, setMsg]           = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [pwMsg, setPwMsg]       = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Load real user data
  useEffect(() => {
    insforge.auth.getCurrentUser().then(async ({ data }) => {
      if (data?.user) {
        setEmail(data.user.email || '');
        // Read from profiles table directly
        const profile = await getUserProfile(data.user.id);
        setName(profile.name);
        setAvatar(profile.avatar_url);
      }
    });
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setMsg({ type: 'err', text: 'حجم الصورة كبير جداً (الأقصى 2MB)' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      // Save to profiles table via database upsert
      const { data: userData } = await insforge.auth.getCurrentUser();
      if (!userData?.user?.id) throw new Error('no user');
      
      const { error } = await insforge.database
        .from('profiles')
        .upsert([{ id: userData.user.id, name, avatar_url: avatar, role: 'teacher' }])
        .select();
        
      if (error) throw error;
      setMsg({ type: 'ok', text: 'تم حفظ الملف الشخصي بنجاح!' });
    } catch (err: any) {
      setMsg({ type: 'err', text: 'حدث خطأ: ' + (err?.message || 'يرجى المحاولة مرة أخرى.') });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 6) {
      setPwMsg({ type: 'err', text: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.' });
      return;
    }
    setPwLoading(true);
    setPwMsg(null);
    try {
      // InsForge password reset via code flow
      await insforge.auth.sendResetPasswordEmail({ email });
      setPwMsg({ type: 'ok', text: 'تم إرسال رابط تغيير كلمة المرور إلى بريدك الإلكتروني.' });
      setCurrentPw('');
      setNewPw('');
    } catch {
      setPwMsg({ type: 'err', text: 'حدث خطأ. يرجى المحاولة مرة أخرى.' });
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className={styles.container} dir="rtl">
      <div>
        <h1 className={styles.title}>الإعدادات</h1>
        <p className={styles.sub}>إدارة بيانات حسابك وتفضيلاتك.</p>
      </div>

      <div className={styles.grid}>
        {/* === الملف الشخصي === */}
        <Card>
          <CardContent className={styles.section}>
            <h2 className={styles.sectionTitle}><User size={18} /> الملف الشخصي</h2>
            {msg && (
              <div className={msg.type === 'ok' ? styles.successMsg : styles.errorMsg}>
                {msg.type === 'ok' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                {msg.text}
              </div>
            )}
            <form onSubmit={saveProfile} className={styles.form}>
              <div className={styles.avatarPicker}>
                <div className={styles.avatarPreview}>
                  {avatar ? (
                    <img src={avatar} alt="Avatar" />
                  ) : (
                    <div className={styles.avatarPlaceholder}>{name[0] || '?'}</div>
                  )}
                  <label className={styles.avatarLabel}>
                    تغيير الصورة
                    <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>

              <div className={styles.field}>
                <label>الاسم الكامل</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="اسمك بالكامل" />
              </div>
              <div className={styles.field}>
                <label>البريد الإلكتروني</label>
                <input type="email" value={email} disabled className={styles.disabled} />
                <span className={styles.hint}>لا يمكن تغيير البريد الإلكتروني</span>
              </div>
              <Button type="submit" loading={saving}>
                {!saving && <><Save size={15} /> حفظ التغييرات</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* === الإشعارات === */}
        <Card>
          <CardContent className={styles.section}>
            <h2 className={styles.sectionTitle}><Bell size={18} /> الإشعارات</h2>
            <div className={styles.toggleList}>
              <div className={styles.toggleRow}>
                <div>
                  <p className={styles.toggleTitle}>إشعارات تسليم الامتحانات</p>
                  <p className={styles.toggleSub}>احصل على إشعار عند تسليم طالب للامتحان</p>
                </div>
                <button
                  type="button"
                  className={`${styles.toggle} ${notifSubmit ? styles.toggleOn : ''}`}
                  onClick={() => setNotifSubmit(v => !v)}
                  aria-label="تبديل الإشعار"
                >
                  <span className={styles.toggleThumb} />
                </button>
              </div>
              <div className={styles.toggleRow}>
                <div>
                  <p className={styles.toggleTitle}>ملخص يومي بالبريد</p>
                  <p className={styles.toggleSub}>استلم ملخصاً يومياً عن نشاط الطلاب</p>
                </div>
                <button
                  type="button"
                  className={`${styles.toggle} ${notifDigest ? styles.toggleOn : ''}`}
                  onClick={() => setNotifDigest(v => !v)}
                  aria-label="تبديل الملخص اليومي"
                >
                  <span className={styles.toggleThumb} />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* === الأمان === */}
        <Card>
          <CardContent className={styles.section}>
            <h2 className={styles.sectionTitle}><Lock size={18} /> الأمان</h2>
            {pwMsg && (
              <div className={pwMsg.type === 'ok' ? styles.successMsg : styles.errorMsg}>
                {pwMsg.type === 'ok' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                {pwMsg.text}
              </div>
            )}
            <form onSubmit={changePassword} className={styles.form}>
              <p className={styles.hint} style={{ marginBottom: '0.5rem' }}>
                سيتم إرسال رابط تغيير كلمة المرور إلى <strong>{email}</strong>
              </p>
              <Button type="submit" loading={pwLoading} variant="outline">
                {!pwLoading && 'إرسال رابط تغيير كلمة المرور'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
