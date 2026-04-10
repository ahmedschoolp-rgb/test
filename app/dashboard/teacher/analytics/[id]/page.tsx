'use client';

import React, { useEffect, useState } from 'react';
import insforge from '@/lib/insforge';
import { Card, CardContent } from '@/components/ui/Card';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle, TrendingDown, Users, TrendingUp, AlertTriangle } from 'lucide-react';

export default function ExamAnalyticsDetails({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [questionsStats, setQuestionsStats] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      // 1. Fetch Exam details & Questions
      const { data: examData } = await insforge.database.from('exams').select('title').eq('id', params.id).single();
      const { data: questions } = await insforge.database.from('questions').select('*').eq('exam_id', params.id).order('order_index', { ascending: true });
      
      setExam(examData);

      // 2. Fetch Results
      const { data: results } = await insforge.database.from('results').select('score, answers, tab_switches').eq('exam_id', params.id);
      
      if (!results || results.length === 0) {
        setStats(null);
        setLoading(false);
        return;
      }

      const total = results.length;
      let totalScore = 0;
      let passed = 0;
      let totalSwitches = 0;

      results.forEach(r => {
        if (r.score !== null) {
          totalScore += r.score;
          if (r.score >= 50) passed++;
        }
        totalSwitches += r.tab_switches || 0;
      });

      setStats({
        total,
        avgScore: Math.round(totalScore / total),
        passRate: Math.round((passed / total) * 100),
        avgSwitches: (totalSwitches / total).toFixed(1),
      });

      // 3. Calculate question difficulty (which questions had most wrong answers)
      if (questions) {
        const qStats = questions.map((q, i) => {
          let correctCount = 0;
          let gradedCount = 0;

          if (q.type === 'MCQ' || q.type === 'TF') {
            results.forEach(r => {
              if (r.answers && r.answers[q.id] !== undefined) {
                gradedCount++;
                if (String(r.answers[q.id]) === String(q.correct_answer)) {
                  correctCount++;
                }
              }
            });
          }

          const correctPercent = gradedCount > 0 ? Math.round((correctCount / gradedCount) * 100) : 0;
          
          return {
            ...q,
            index: i + 1,
            correctPercent,
            gradedCount,
            isGradable: q.type === 'MCQ' || q.type === 'TF'
          };
        });

        setQuestionsStats(qStats.filter(q => q.isGradable).sort((a, b) => a.correctPercent - b.correctPercent));
      }

      setLoading(false);
    };

    load();
  }, [params.id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ width: 40, height: 40, border: '4px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={{ direction: 'rtl', textAlign: 'center', marginTop: '4rem' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', marginBottom: '1rem', fontWeight: 600 }}>← العودة</button>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>لا توجد بيانات كافية</h2>
        <p style={{ color: '#64748b' }}>لم يقم أي طالب بتسليم هذا الامتحان حتى الآن.</p>
      </div>
    );
  }

  return (
    <div style={{ direction: 'rtl', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <button 
          onClick={() => router.back()} 
          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
          <ArrowRight size={18} /> العودة للتحليلات العامة
        </button>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>تحليلات: {exam?.title}</h1>
        <p style={{ color: '#64748b', marginTop: '0.25rem' }}>نظرة متعمقة على أداء الطلاب في هذا الامتحان.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <Card>
          <CardContent style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: '12px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={24} /></div>
            <div>
              <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>التسليمات</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.total}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: '12px', background: '#fef9c3', color: '#ca8a04', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrendingUp size={24} /></div>
            <div>
              <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>متوسط الدرجات</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.avgScore}%</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: '12px', background: '#dcfce7', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle size={24} /></div>
            <div>
              <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>معدل النجاح</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.passRate}%</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: '12px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><AlertTriangle size={24} /></div>
            <div>
              <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>متوسط التبديلات</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.avgSwitches}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>تحليل صعوبة الأسئلة</h2>
        <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>الأسئلة مرتبة من الأصعب (أقل نسبة نجاح) إلى الأسهل.</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {questionsStats.map(q => (
            <div key={q.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700 }}>سؤال {q.index}</span>
                <span style={{ fontWeight: 800, color: q.correctPercent >= 70 ? '#166534' : q.correctPercent >= 50 ? '#ca8a04' : '#dc2626' }}>
                  {q.correctPercent}% أجابوا بشكل صحيح
                </span>
              </div>
              <p style={{ color: '#1e293b', marginBottom: '1rem' }}>{q.text}</p>
              
              <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${q.correctPercent}%`, height: '100%', background: q.correctPercent >= 70 ? '#22c55e' : q.correctPercent >= 50 ? '#eab308' : '#ef4444' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
