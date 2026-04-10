'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Users, Search, GraduationCap } from 'lucide-react';
import styles from './Students.module.css';
import insforge from '@/lib/insforge';

interface Student {
  id: string;
  name: string;
  joinDate: string;
}

export default function StudentsPage() {
  const [search,    setSearch]    = useState('');
  const [students,  setStudents]  = useState<Student[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: ud } = await insforge.auth.getCurrentUser();
      if (!ud?.user) return;

      // Fetch students following this teacher
      const { data } = await insforge.database
        .from('teacher_students')
        .select('student_id, created_at')
        .eq('teacher_id', ud.user.id);

      if (!data || data.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      const studentIds = data.map(d => d.student_id);

      // Fetch profiles manually
      const { data: profiles } = await insforge.database
        .from('profiles')
        .select('id, name')
        .in('id', studentIds);

      const loaded = data.map((row: any) => {
        const p = profiles?.find(pr => pr.id === row.student_id);
        return {
          id: row.student_id,
          name: p?.name || 'طالب غير معروف',
          joinDate: row.created_at,
        };
      });

      setStudents(loaded);
      setLoading(false);
    };

    load();
  }, []);

  const filtered = students.filter(s => s.name.includes(search));

  return (
    <div className={styles.container} dir="rtl">
      <header className={styles.header}>
        <div>
          <h1>الطلاب</h1>
          <p>قائمة الطلاب المشتركين والمتابعين لك.</p>
        </div>
      </header>

      <div className={styles.searchBar}>
        <Search size={16} />
        <input
          type="text"
          placeholder="البحث باسم الطالب..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className={styles.spinner} />
        </div>
      ) : students.length === 0 ? (
        <div className={styles.empty}>
          <Users size={52} color="#94a3b8" />
          <h3>لا يوجد طلاب بعد</h3>
          <p>سيظهر الطلاب هنا عندما يضيفونك كمعلم لهم.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map(student => (
            <Card key={student.id} className={styles.card}>
              <CardContent className={styles.cardBody}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                   <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <GraduationCap size={20} />
                   </div>
                   <div>
                     <p style={{ fontWeight: 700, fontSize: '1rem' }}>{student.name}</p>
                     <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                       إنضم في: {new Date(student.joinDate).toLocaleDateString('ar-EG')}
                     </p>
                   </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
