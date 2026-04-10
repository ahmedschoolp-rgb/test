'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { User, Lock, Save, AlertCircle, CheckCircle } from 'lucide-react';
import insforge from '@/lib/insforge';
import { getUserProfile } from '@/lib/profile';
import styles from '../../teacher/settings/Settings.module.css';

export default function StudentSettingsPage() {
  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [avatar,  setAvatar]  = useState<string | undefined>(undefined);
  const [saving,  setSaving]  = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [msg,     setMsg]     = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [pwMsg,   setPwMsg]   = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    insforge.auth.getCurrentUser().then(async ({ data }) => {
      if (data?.user) {
        setEmail(data.user.email || '');
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
    setSaving(true); setMsg(null);
    try {
      const { data: ud } = await insforge.auth.getCurrentUser();
      if (!ud?.user?.id) throw new Error('no user');
      const { error } = await insforge.database
        .from('profiles')
        .update({ name, avatar_url: avatar })
        .eq('id', ud.user.id);
      if (error) throw error;
      setMsg({ type: 'ok', text: 'تم حفظ الملف الشخصي بنجاح!' });
    } catch (err: any) {
      setMsg({ type: 'err', text: 'حدث خطأ: ' + (err?.message || 'يرجى المحاولة مرة أخرى.') });
    } finally { setSaving(false); }
  };

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwLoading(true); setPwMsg(null);
    try {
      await insforge.auth.sendResetPasswordEmail({ email });
      setPwMsg({ type: 'ok', text: 'تم إرسال رابط تغيير كلمة المرور إلى بريدك الإلكتروني.' });
    } catch {
      setPwMsg({ type: 'err', text: 'حدث خطأ. يرجى المحاولة مرة أخرى.' });
    } finally { setPwLoading(false); }
  };

  return (
    <div className={styles.container} dir="rtl">
      <div>
        <h1 className={styles.title}>الإعدادات</h1>
        <p className={styles.sub}>إدارة بيانات حسابك كطالب.</p>
      </div>

      <div className={styles.grid}>
        <Card>
          <CardContent className={styles.section}>
            <h2 className={styles.sectionTitle}><User size={18} /> الملف الشخصي</h2>
            {msg && (
              <div className={msg.type === 'ok' ? styles.successMsg : styles.errorMsg}>
                {msg.type === 'ok' ? <CheckCircle size={15} /> : <AlertCircle size={15} />} {msg.text}
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
                {avatar && (
                  <button type="button" onClick={() => setAvatar(undefined)} className={styles.removeAvatarBtn}>
                    حذف الصورة
                  </button>
                )}
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

        <Card>
          <CardContent className={styles.section}>
            <h2 className={styles.sectionTitle}><Lock size={18} /> الأمان</h2>
            {pwMsg && (
              <div className={pwMsg.type === 'ok' ? styles.successMsg : styles.errorMsg}>
                {pwMsg.type === 'ok' ? <CheckCircle size={15} /> : <AlertCircle size={15} />} {pwMsg.text}
              </div>
            )}
            <form onSubmit={sendReset} className={styles.form}>
              <p className={styles.hint}>سيتم إرسال رابط تغيير كلمة المرور إلى <strong>{email}</strong></p>
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
