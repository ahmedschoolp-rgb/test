'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plus, FileText, Clock, Eye, Pencil, Trash2, MoreVertical } from 'lucide-react';
import styles from './Exams.module.css';
import Link from 'next/link';
import insforge from '@/lib/insforge';

export default function ExamsPage() {
  const [exams, setExams]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    insforge.auth.getCurrentUser().then(({ data: ud }) => {
      if (ud?.user) {
        insforge.database
          .from('exams')
          .select('id, title, status, time_limit, created_at')
          .eq('teacher_id', ud.user.id)
          .order('created_at', { ascending: false })
          .then(({ data }) => {
            setExams(data || []);
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });
  }, []);

  const deleteExam = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الامتحان؟')) return;
    await insforge.database.from('exams').delete().eq('id', id);
    setExams((prev) => prev.filter((e) => e.id !== id));
  };

  const statusMap = (s: string) =>
    s === 'published' ? { label: 'منشور', bg: '#dbeafe', color: '#1e40af' } :
    s === 'draft'     ? { label: 'مسودة', bg: '#fef9c3', color: '#854d0e' } :
                        { label: 'مكتمل', bg: '#dcfce7', color: '#166534' };

  return (
    <div className={styles.container} dir="rtl">
      <div className={styles.header}>
        <div>
          <h1>الامتحانات</h1>
          <p>أنشئ وأدر جميع امتحاناتك من هنا.</p>
        </div>
        <Link href="/dashboard/teacher/exams/new">
          <Button><Plus size={18} /> إنشاء امتحان جديد</Button>
        </Link>
      </div>

      {loading ? (
        <div className={styles.loading}><div className={styles.spinner} /></div>
      ) : exams.length === 0 ? (
        <div className={styles.empty}>
          <FileText size={52} color="#94a3b8" />
          <h3>لا توجد امتحانات بعد</h3>
          <p>اضغط على "إنشاء امتحان جديد" للبدء</p>
          <Link href="/dashboard/teacher/exams/new">
            <Button><Plus size={16} /> إنشاء امتحان</Button>
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {exams.map((exam) => {
            const st = statusMap(exam.status);
            return (
              <Card key={exam.id} className={styles.card}>
                <CardContent className={styles.cardBody}>
                  <div className={styles.top}>
                    <span className={styles.badge} style={{ background: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                  </div>
                  <h3 className={styles.title}>{exam.title}</h3>
                  <div className={styles.meta}>
                    <span><Clock size={13} /> {exam.time_limit} دقيقة</span>
                    <span>{new Date(exam.created_at).toLocaleDateString('ar-EG')}</span>
                  </div>
                  <div className={styles.actions}>
                    <Link href={`/dashboard/teacher/exams/${exam.id}/results`}>
                      <Button variant="outline" size="sm"><Eye size={14} /> النتائج</Button>
                    </Link>
                    <Link href={`/dashboard/teacher/exams/${exam.id}/edit`}>
                      <Button variant="ghost" size="sm"><Pencil size={14} /> تعديل</Button>
                    </Link>
                    <button onClick={() => deleteExam(exam.id)} className={styles.deleteBtn} title="حذف">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
