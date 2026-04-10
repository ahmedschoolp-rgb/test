'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BookOpen, Clock, Star, Users, Search, GraduationCap } from 'lucide-react';
import styles from './Student.module.css';
import Link from 'next/link';
import insforge from '@/lib/insforge';
import { getUserProfile } from '@/lib/profile';

interface TeacherCard {
  id: string;
  name: string;
  avatarUrl?: string;
  examCount: number;
  studentCount: number;
  avgRating: number;
  ratingCount: number;
  exams: { id: string; title: string; time_limit: number }[];
}

export default function StudentDashboard() {
  const [userName,  setUserName]  = useState('');
  const [teachers,  setTeachers]  = useState<TeacherCard[]>([]);
  const [myResults, setMyResults] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [userId,    setUserId]    = useState('');
  const [ratingMap, setRatingMap] = useState<Record<string, number>>({});

  useEffect(() => {
    const load = async () => {
      // Current user
      const { data: ud } = await insforge.auth.getCurrentUser();
      if (ud?.user) {
        // Read name from profiles table
        const profile = await getUserProfile(ud.user.id);
        setUserName(profile.name || ud.user.email?.split('@')[0] || 'طالب');
        setUserId(ud.user.id);

        // My past results
        const { data: resData } = await insforge.database
          .from('results')
          .select('id, exam_id, score, submitted_at, exams(title)')
          .eq('student_id', ud.user.id)
          .order('submitted_at', { ascending: false })
          .limit(5);
        setMyResults(resData || []);

        // My ratings (to show which teachers I've rated)
        const { data: myRatings } = await insforge.database
          .from('teacher_ratings')
          .select('teacher_id, rating')
          .eq('student_id', ud.user.id);

        const rm: Record<string, number> = {};
        (myRatings || []).forEach((r: any) => { rm[r.teacher_id] = r.rating; });
        setRatingMap(rm);
      }

      // Fetch teacher profiles (role = 'teacher')
      const { data: teacherProfiles } = await insforge.database
        .from('profiles')
        .select('id, name, avatar_url')
        .eq('role', 'teacher');

      if (!teacherProfiles || teacherProfiles.length === 0) {
        setTeachers([]);
        setLoading(false);
        return;
      }

      // For each teacher, fetch their published exams + ratings
      const teacherCards: TeacherCard[] = await Promise.all(
        (teacherProfiles as any[]).map(async (t) => {
          const { data: exams } = await insforge.database
            .from('exams')
            .select('id, title, time_limit')
            .eq('teacher_id', t.id)
            .eq('status', 'published');

          const examIds = (exams || []).map((e: any) => e.id);

          // Count unique students who submitted results for this teacher's exams
          let studentCount = 0;
          if (examIds.length > 0) {
            const { data: resultsData } = await insforge.database
              .from('results')
              .select('student_id')
              .in('exam_id', examIds);
            const unique = new Set((resultsData || []).map((r: any) => r.student_id));
            studentCount = unique.size;
          }

          // Avg rating
          const { data: ratingsData } = await insforge.database
            .from('teacher_ratings')
            .select('rating')
            .eq('teacher_id', t.id);
          const ratings = (ratingsData || []).map((r: any) => r.rating);
          const avgRating = ratings.length > 0
            ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length
            : 0;

          return {
            id:           t.id,
            name:         t.name || 'معلم',
            avatarUrl:    t.avatar_url,
            examCount:    (exams || []).length,
            studentCount,
            avgRating,
            ratingCount:  ratings.length,
            exams:        exams || [],
          };
        })
      );

      setTeachers(teacherCards.filter(t => t.examCount > 0));
      setLoading(false);
    };

    load();
  }, []);

  const rateTeacher = async (teacherId: string, rating: number) => {
    if (!userId) return;
    await insforge.database
      .from('teacher_ratings')
      .upsert([{ teacher_id: teacherId, student_id: userId, rating }])
      .select();
    setRatingMap(prev => ({ ...prev, [teacherId]: rating }));
  };

  const filtered = teachers.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const StarRating = ({ teacherId, avgRating, myRating }: { teacherId: string; avgRating: number; myRating?: number }) => (
    <div className={styles.stars}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          className={`${styles.star} ${n <= (myRating || 0) ? styles.starFilled : n <= Math.round(avgRating) ? styles.starAvg : ''}`}
          onClick={() => rateTeacher(teacherId, n)}
          title={`تقييم ${n} نجوم`}
        >★</button>
      ))}
    </div>
  );

  return (
    <div className={styles.container} dir="rtl">
      <div className={styles.header}>
        <div>
          <h1>{userName ? <>مرحباً، <span>{userName}</span> 👋</> : 'لوحة الطالب'}</h1>
          <p>اكتشف امتحانات المعلمين وابدأ تقييمك الآن</p>
        </div>
        {myResults.length > 0 && (
          <div className={styles.myStats}>
            <span>✅ أديت {myResults.length} امتحان</span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className={styles.searchBar}>
        <Search size={16} />
        <input placeholder="ابحث عن معلم..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className={styles.layout}>
        {/* Teachers list */}
        <div className={styles.main}>
          {loading ? (
            <div className={styles.loading}><div className={styles.spinner} /></div>
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>
              <GraduationCap size={52} color="#94a3b8" />
              <h3>لا يوجد معلمون بعد</h3>
              <p>انتظر حتى ينشر المعلمون امتحاناتهم</p>
            </div>
          ) : (
            <div className={styles.teacherGrid}>
              {filtered.map(teacher => (
                <Card key={teacher.id} className={styles.teacherCard}>
                  <CardContent className={styles.teacherBody}>
                    {/* Header - Make it clickable to go to teacher profile */}
                    <div className={styles.teacherHeaderWrap}>
                      <Link href={`/dashboard/student/teacher/${teacher.id}`} className={styles.teacherHeaderLink}>
                        <div className={styles.teacherHeader}>
                          <div className={styles.teacherAvatar}>
                            {teacher.avatarUrl ? (
                              <img src={teacher.avatarUrl} alt={teacher.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              teacher.name[0]
                            )}
                          </div>
                          <div>
                            <h3 className={styles.teacherName}>{teacher.name}</h3>
                            <div className={styles.ratingTextClickable}>عرض الصفحة الشخصية ←</div>
                          </div>
                        </div>
                      </Link>
                      
                      <div className={styles.teacherHeaderRight}>
                         <StarRating
                            teacherId={teacher.id}
                            avgRating={teacher.avgRating}
                            myRating={ratingMap[teacher.id]}
                          />
                          {teacher.ratingCount > 0 && (
                            <p className={styles.ratingText}>
                              {teacher.avgRating.toFixed(1)} ⭐ ({teacher.ratingCount} تقييم)
                            </p>
                          )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className={styles.teacherStats}>
                      <div className={styles.statItem}>
                        <BookOpen size={16} color="#2563eb" />
                        <span>{teacher.examCount} امتحان</span>
                      </div>
                      <div className={styles.statItem}>
                        <Users size={16} color="#10b981" />
                        <span>{teacher.studentCount} طالب</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* My results */}
        <aside className={styles.sidebar}>
          <h2 className={styles.sideTitle}>آخر نتائجي</h2>
          {myResults.length === 0 ? (
            <p className={styles.emptyText}>لم تؤدِ أي امتحان بعد</p>
          ) : (
            <div className={styles.resultList}>
              {myResults.map(r => (
                <div key={r.id} className={styles.resultItem}>
                  <div>
                    <p className={styles.resultTitle}>{(r.exams as any)?.title || 'امتحان'}</p>
                    <p className={styles.resultDate}>{new Date(r.submitted_at).toLocaleDateString('ar-EG')}</p>
                  </div>
                  {r.score !== null && (
                    <span className={styles.score}>{Math.round(r.score)}%</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
