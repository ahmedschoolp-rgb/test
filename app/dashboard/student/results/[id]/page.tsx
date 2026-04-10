'use client';

import React, { useEffect, useState } from 'react';
import insforge from '@/lib/insforge';
import { Card, CardContent } from '@/components/ui/Card';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function StudentResultDetails({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [result, setResult] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // Fetch the specific result
      const { data: resData } = await insforge.database
        .from('results')
        .select('id, exam_id, score, answers, submitted_at, exams(title, time_limit)')
        .eq('id', params.id)
        .single();
      
      if (!resData) {
        setLoading(false);
        return;
      }
      setResult(resData);

      // Fetch the questions for this exam
      const { data: qData } = await insforge.database
        .from('questions')
        .select('*')
        .eq('exam_id', resData.exam_id)
        .order('order_index', { ascending: true });
        
      setQuestions(qData || []);
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

  if (!result) {
    return <div style={{ textAlign: 'center', marginTop: '4rem' }} dir="rtl">حدث خطأ أثناء تحميل النتيجة.</div>;
  }

  return (
    <div style={{ direction: 'rtl', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <button 
          onClick={() => router.back()} 
          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
          <ArrowRight size={18} /> العودة للنتائج
        </button>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>مراجعة إجابات: {(result.exams as any)?.title}</h1>
        <p style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem' }}>
          <Clock size={14} /> تم التسليم في: {new Date(result.submitted_at).toLocaleString('ar-EG')}
        </p>
      </div>

      <Card style={{ textAlign: 'center', padding: '1.5rem', border: '2px solid #e2e8f0', background: '#f8fafc' }}>
        <p style={{ color: '#64748b', fontWeight: 600, marginBottom: '0.5rem' }}>نتيجتك النهائية</p>
        <div style={{
          display: 'inline-block',
          padding: '0.5rem 2rem', 
          borderRadius: '30px', 
          fontWeight: 800, 
          fontSize: '1.5rem',
          background: result.score >= 70 ? '#dcfce7' : result.score >= 50 ? '#fef9c3' : '#fee2e2',
          color: result.score >= 70 ? '#166534' : result.score >= 50 ? '#854d0e' : '#991b1b',
        }}>
          {result.score !== null ? `${Math.round(result.score)}%` : 'تحت المراجعة'}
        </div>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {questions.map((q, i) => {
          const myAns = result.answers?.[q.id];
          let isCorrect = false;
          let showGrading = false;

          if (q.type === 'MCQ' || q.type === 'TF') {
            showGrading = true;
            isCorrect = String(myAns) === String(q.correct_answer);
          }

          return (
            <Card key={q.id}>
              <CardContent style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>سؤال {i + 1}</span>
                  <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{q.points} نقطة</span>
                </div>
                <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem', color: '#1e293b' }}>{q.text}</p>
                
                <div style={{ background: '#f1f5f9', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>إجابتك:</span>
                  <div style={{ fontWeight: 700, marginTop: '0.4rem', fontSize: '1rem' }}>
                    {q.type === 'MCQ' && q.options && myAns !== undefined ? q.options[myAns] : 
                     q.type === 'TF' ? (myAns === 'true' ? 'صح' : myAns === 'false' ? 'خطأ' : 'لم تُجب') :
                     (myAns || 'لم تُجب')}
                  </div>
                </div>

                {showGrading && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1rem', color: isCorrect ? '#166534' : '#991b1b' }}>
                    {isCorrect ? <CheckCircle size={20} /> : <XCircle size={20} />}
                    {isCorrect ? 'إجابة صحيحة' : 'إجابة خاطئة'}
                    
                    {!isCorrect && (
                      <span style={{ color: '#64748b', fontWeight: 500, marginRight: '1rem' }}>
                        (الإجابة الصحيحة: {q.type === 'MCQ' ? q.options?.[q.correct_answer] : q.correct_answer === 'true' ? 'صح' : 'خطأ'})
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
