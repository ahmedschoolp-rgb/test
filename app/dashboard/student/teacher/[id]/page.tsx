'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  BookOpen, Clock, Users, Star, ArrowRight,
  UserPlus, UserCheck, Trophy, FileText
} from 'lucide-react';
import styles from './TeacherProfile.module.css';
import Link from 'next/link';
import insforge from '@/lib/insforge';
import { getUserProfile } from '@/lib/profile';
import { useRouter } from 'next/navigation';

interface Exam {
  id: string;
  title: string;
  description: string;
  time_limit: number;
  created_at: string;
}

export default function TeacherProfilePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const teacherId = params.id;

  const [teacherName, setTeacherName] = useState('');
  const [exams, setExams] = useState<Exam[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [myRating, setMyRating] = useState<number | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    const load = async () => {
      // Current user
      const { data: ud } = await insforge.auth.getCurrentUser();
      if (!ud?.user) { router.push('/login'); return; }
      setUserId(ud.user.id);

      // Teacher profile
      const profile = await getUserProfile(teacherId);
      setTeacherName(profile.name || 'معلم');

      // Teacher's published exams
      const { data: examsData } = await insforge.database
        .from('exams')
        .select('id, title, description, time_limit, created_at')
        .eq('teacher_id', teacherId)
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      setExams(examsData || []);

      // Student count (followers)
      const { data: followersData } = await insforge.database
        .from('teacher_students')
        .select('student_id')
        .eq('teacher_id', teacherId);
      setStudentCount((followersData || []).length);

      // Am I following?
      const isAlreadyFollowing = (followersData || []).some(
        (f: any) => f.student_id === ud?.user?.id
      );
      setIsFollowing(isAlreadyFollowing);

      // Ratings
      const { data: ratingsData } = await insforge.database
        .from('teacher_ratings')
        .select('rating, student_id')
        .eq('teacher_id', teacherId);
      const ratings = (ratingsData || []).map((r: any) => r.rating);
      setAvgRating(ratings.length > 0 ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : 0);
      setRatingCount(ratings.length);
      const myR = (ratingsData || []).find((r: any) => r.student_id === ud?.user?.id);
      if (myR) setMyRating(myR.rating);

      setLoading(false);
    };
    load();
  }, [teacherId]);

  const toggleFollow = async () => {
    setFollowLoading(true);
    if (isFollowing) {
      await insforge.database
        .from('teacher_students')
        .delete()
        .eq('teacher_id', teacherId)
        .eq('student_id', userId);
      setIsFollowing(false);
      setStudentCount(c => c - 1);
    } else {
      await insforge.database
        .from('teacher_students')
        .insert([{ teacher_id: teacherId, student_id: userId }]);
      setIsFollowing(true);
      setStudentCount(c => c + 1);
    }
    setFollowLoading(false);
  };

  const rate = async (n: number) => {
    if (!userId) return;
    await insforge.database
      .from('teacher_ratings')
      .upsert([{ teacher_id: teacherId, student_id: userId, rating: n }])
      .select();
    setMyRating(n);
    // Recalculate average locally
    const newCount = myRating === null ? ratingCount + 1 : ratingCount;
    const oldTotal = avgRating * ratingCount;
    const newTotal = myRating === null ? oldTotal + n : oldTotal - (myRating) + n;
    setAvgRating(newTotal / newCount);
    setRatingCount(newCount);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div className={styles.spinner} />
      </div>
    );
  }

  return (
    <div className={styles.container} dir="rtl">
      {/* Back */}
      <button className={styles.backBtn} onClick={() => router.back()}>
        <ArrowRight size={18} /> العودة
      </button>

      {/* Teacher Header Card */}
      <Card className={styles.heroCard}>
        <CardContent className={styles.heroBody}>
          <div className={styles.heroLeft}>
            <div className={styles.bigAvatar}>{teacherName[0]}</div>
            <div>
              <h1 className={styles.heroName}>{teacherName}</h1>
              {/* Stars */}
              <div className={styles.starsRow}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n}
                    className={`${styles.star} ${n <= (myRating || 0) ? styles.starFilled : n <= Math.round(avgRating) ? styles.starAvg : ''}`}
                    onClick={() => rate(n)} title={`${n} نجوم`}>★</button>
                ))}
                <span className={styles.ratingText}>
                  {ratingCount > 0 ? `${avgRating.toFixed(1)} (${ratingCount} تقييم)` : 'لم يُقيَّم بعد'}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.heroRight}>
            {/* Stats */}
            <div className={styles.statRow}>
              <div className={styles.statBox}>
                <FileText size={20} color="#2563eb" />
                <span className={styles.statNum}>{exams.length}</span>
                <span className={styles.statLbl}>امتحان</span>
              </div>
              <div className={styles.statBox}>
                <Users size={20} color="#10b981" />
                <span className={styles.statNum}>{studentCount}</span>
                <span className={styles.statLbl}>طالب</span>
              </div>
              <div className={styles.statBox}>
                <Trophy size={20} color="#f59e0b" />
                <span className={styles.statNum}>{avgRating > 0 ? avgRating.toFixed(1) : '—'}</span>
                <span className={styles.statLbl}>تقييم</span>
              </div>
            </div>

            {/* Follow Button */}
            <Button
              onClick={toggleFollow}
              loading={followLoading}
              variant={isFollowing ? 'outline' : 'primary'}
              className={styles.followBtn}
            >
              {!followLoading && (
                isFollowing
                  ? <><UserCheck size={18} /> أنت طالب عنده</>
                  : <><UserPlus size={18} /> إضافة كمعلمي</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Exams list */}
      <div>
        <h2 className={styles.sectionTitle}>الامتحانات المتاحة</h2>
        {exams.length === 0 ? (
          <div className={styles.empty}>
            <BookOpen size={48} color="#94a3b8" />
            <p>لا توجد امتحانات منشورة بعد</p>
          </div>
        ) : (
          <div className={styles.examGrid}>
            {exams.map(exam => (
              <Card key={exam.id} className={styles.examCard}>
                <CardContent className={styles.examBody}>
                  <div className={styles.examIcon}><BookOpen size={22} /></div>
                  <div className={styles.examInfo}>
                    <h3>{exam.title}</h3>
                    {exam.description && <p className={styles.examDesc}>{exam.description}</p>}
                    <div className={styles.examMeta}>
                      <span><Clock size={13} /> {exam.time_limit} دقيقة</span>
                      <span>{new Date(exam.created_at).toLocaleDateString('ar-EG')}</span>
                    </div>
                  </div>
                  <Link href={`/dashboard/student/take/${exam.id}`}>
                    <Button size="sm">ابدأ الامتحان</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
