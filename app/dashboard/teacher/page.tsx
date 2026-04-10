'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plus, Users, FileText, TrendingUp, Clock, GraduationCap } from 'lucide-react';
import styles from './Teacher.module.css';
import Link from 'next/link';
import insforge from '@/lib/insforge';
import { getUserProfile } from '@/lib/profile';

export default function TeacherDashboard() {
  const [userName, setUserName]   = useState('');
  const [exams, setExams]         = useState<any[]>([]);
  const [examCount, setExamCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: ud } = await insforge.auth.getCurrentUser();
      if (ud?.user) {
        // Load name from profiles table
        const profile = await getUserProfile(ud.user.id);
        setUserName(profile.name || ud.user.email?.split('@')[0] || 'معلم');

        const { data, count: examsTotal } = await insforge.database
          .from('exams')
          .select('id, title, status, created_at', { count: 'exact' })
          .eq('teacher_id', ud.user.id)
          .order('created_at', { ascending: false })
          .limit(4);

        if (data) {
          setExams(data);
          setExamCount(examsTotal || data.length);
        }

        // Fetch students count
        const { count: followersCount } = await insforge.database
          .from('teacher_students')
          .select('*', { count: 'exact', head: true })
          .eq('teacher_id', ud.user.id);
          
        setStudentCount(followersCount || 0);
      }
      setLoading(false);
    };
    load();
  }, []);

  const statusLabel = (s: string) =>
    s === 'published' ? { label: 'منشور',  bg: '#dbeafe', color: '#1e40af' } :
    s === 'draft'     ? { label: 'مسودة',  bg: '#fef9c3', color: '#854d0e' } :
                        { label: 'مكتمل', bg: '#dcfce7', color: '#166534' };

  const stats = [
    { label: 'امتحاناتي', value: loading ? '—' : String(examCount), icon: FileText,   color: '#3b82f6' },
    { label: 'الطلاب',    value: loading ? '—' : String(studentCount), icon: Users,      color: '#10b981' },
    { label: 'متوسط الدرجات', value: '—',                              icon: TrendingUp, color: '#f59e0b' },
    { label: 'مراجعات',   value: '0',                                  icon: Clock,      color: '#8b5cf6' },
  ];

  return (
    <div className={styles.container} dir="rtl">
      <div className={styles.header}>
        <div>
          <h1 className={styles.greeting}>
            {userName ? <>مرحباً، <span>{userName}</span> 👋</> : 'لوحة تحكم المعلم'}
          </h1>
          <p className={styles.sub}>إليك ملخص نشاطك على المنصة اليوم.</p>
        </div>
        <Link href="/dashboard/teacher/exams/new">
          <Button><Plus size={18} /> إنشاء امتحان</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        {stats.map((s, i) => (
          <Card key={i} className={styles.statCard}>
            <CardContent className={styles.statContent}>
              <div className={styles.statIcon} style={{ background: `${s.color}18`, color: s.color }}>
                <s.icon size={22} />
              </div>
              <div>
                <p className={styles.statLabel}>{s.label}</p>
                <h3 className={styles.statValue}>{s.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent exams */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>آخر الامتحانات</h2>
          <Link href="/dashboard/teacher/exams">
            <Button variant="ghost" size="sm">عرض الكل</Button>
          </Link>
        </div>

        {loading ? (
          <div className={styles.loading}><div className={styles.spinner} /></div>
        ) : exams.length === 0 ? (
          <div className={styles.empty}>
            <GraduationCap size={48} />
            <h3>لا توجد امتحانات بعد</h3>
            <p>ابدأ بإنشاء أول امتحان وشاركه مع طلابك</p>
            <Link href="/dashboard/teacher/exams/new">
              <Button><Plus size={16} /> إنشاء امتحان الآن</Button>
            </Link>
          </div>
        ) : (
          <div className={styles.examList}>
            {exams.map((exam) => {
              const st = statusLabel(exam.status);
              return (
                <Link href={`/dashboard/teacher/exams/${exam.id}/results`} key={exam.id} style={{ textDecoration: 'none' }}>
                  <Card className={styles.examCard}>
                    <CardContent className={styles.examRow}>
                      <div>
                        <h4 style={{ color: '#0f172a' }}>{exam.title}</h4>
                        <p>{new Date(exam.created_at).toLocaleDateString('ar-EG')}</p>
                      </div>
                      <span className={styles.badge} style={{ background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
