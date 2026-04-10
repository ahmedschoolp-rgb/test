'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { BarChart3, TrendingUp, Users, CheckCircle, XCircle } from 'lucide-react';
import insforge from '@/lib/insforge';
import Link from 'next/link';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalExams: 0,
    totalResults: 0,
    avgScore: 0,
    passRate: 0,
  });
  const [examsStats, setExamsStats] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: ud } = await insforge.auth.getCurrentUser();
      if (!ud?.user) return;

      // 1. Fetch Teacher's Exams
      const { data: myExams } = await insforge.database
        .from('exams')
        .select('id, title')
        .eq('teacher_id', ud.user.id)
        .eq('status', 'published');

      if (!myExams || myExams.length === 0) {
        setLoading(false);
        return;
      }

      const examIds = myExams.map(e => e.id);

      // 2. Fetch all Results for these exams
      const { data: results } = await insforge.database
        .from('results')
        .select('id, exam_id, score')
        .in('exam_id', examIds);

      const allResults = results || [];
      const totalResults = allResults.length;

      let totalScore = 0;
      let passedCount = 0;

      allResults.forEach(r => {
        if (r.score !== null) {
          totalScore += r.score;
          if (r.score >= 50) passedCount++;
        }
      });

      const avgScore = totalResults > 0 ? (totalScore / totalResults) : 0;
      const passRate = totalResults > 0 ? (passedCount / totalResults) * 100 : 0;

      setStats({
        totalExams: myExams.length,
        totalResults,
        avgScore: Math.round(avgScore),
        passRate: Math.round(passRate),
      });

      // 3. Exam specific stats
      const exStats = myExams.map(ex => {
        const exResults = allResults.filter(r => r.exam_id === ex.id);
        const exTotal = exResults.length;
        let exScore = 0;
        let exPass = 0;
        exResults.forEach(r => {
          if (r.score !== null) {
            exScore += r.score;
            if (r.score >= 50) exPass++;
          }
        });

        return {
          id: ex.id,
          title: ex.title,
          total: exTotal,
          avg: exTotal > 0 ? Math.round(exScore / exTotal) : 0,
          passRate: exTotal > 0 ? Math.round((exPass / exTotal) * 100) : 0,
        };
      });

      setExamsStats(exStats.filter(e => e.total > 0)); // Only exams that have submissions
      setLoading(false);
    };

    load();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ width: 40, height: 40, border: '4px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ direction: 'rtl', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <div>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.75rem', fontWeight: 700 }}>التحليلات</h1>
        <p style={{ color: '#64748b', marginTop: '0.25rem' }}>تحليل أداء طلابك عبر جميع الامتحانات المنشورة.</p>
      </div>

      {stats.totalResults === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
          padding: '5rem 2rem', textAlign: 'center',
          border: '2px dashed #e2e8f0', borderRadius: '12px', color: '#94a3b8'
        }}>
          <BarChart3 size={52} color="#94a3b8" />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>لا توجد بيانات بعد</h3>
          <p style={{ fontSize: '0.875rem' }}>
            ستظهر التحليلات هنا بعد أن يؤدي الطلاب امتحاناتك.
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <Card>
              <CardContent style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: 48, height: 48, borderRadius: '12px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={24} />
                </div>
                <div>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>إجمالي التسليمات</p>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.totalResults}</h3>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: 48, height: 48, borderRadius: '12px', background: '#fef9c3', color: '#ca8a04', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={24} />
                </div>
                <div>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>متوسط الدرجات (عام)</p>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.avgScore}%</h3>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: 48, height: 48, borderRadius: '12px', background: '#dcfce7', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle size={24} />
                </div>
                <div>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>معدل النجاح</p>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.passRate}%</h3>
                </div>
              </CardContent>
            </Card>
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '2rem', marginBottom: '1rem' }}>أداء الامتحانات التفصيلي</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {examsStats.map((ex, i) => (
              <Link href={`/dashboard/teacher/analytics/${ex.id}`} key={i} style={{ textDecoration: 'none' }}>
                <div
                  style={{ transition: 'transform 0.2s', cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <Card>
                    {/* باقي الكود اللي جوه الكارد زي ما هو */}
                    <CardContent style={{ padding: '1.5rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>{ex.title} </h3>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                        <span style={{ color: '#64748b' }}>إجمالي التسليمات:</span>
                        <span style={{ fontWeight: 700, color: '#1e293b' }}>{ex.total}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                        <span style={{ color: '#64748b' }}>الدرجة المتوسطة:</span>
                        <span style={{ fontWeight: 700, color: ex.avg >= 70 ? '#166534' : ex.avg >= 50 ? '#ca8a04' : '#dc2626' }}>{ex.avg}%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span style={{ color: '#64748b' }}>معدل النجاح:</span>
                        <span style={{ fontWeight: 700, color: '#1e293b' }}>{ex.passRate}%</span>
                      </div>

                      <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', marginTop: '1.5rem', overflow: 'hidden' }}>
                        <div style={{ width: `${ex.avg}%`, height: '100%', background: ex.avg >= 70 ? '#22c55e' : ex.avg >= 50 ? '#eab308' : '#ef4444' }} />
                      </div>

                      <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#2563eb', fontWeight: 600, textAlign: 'center' }}>انقر لعرض التحليل التفصيلي للأسئلة ←</p>
                    </CardContent>
                  </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
