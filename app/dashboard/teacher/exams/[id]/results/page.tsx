'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Clock, Search, AlertTriangle, FileText, CheckCircle, XCircle } from 'lucide-react';
import insforge from '@/lib/insforge';
import { useRouter } from 'next/navigation';

export default function ExamResultsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [results, setResults] = useState<any[]>([]);
  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const load = async () => {
      // Get exam info
      const { data: examData } = await insforge.database
        .from('exams')
        .select('title, attempts')
        .eq('id', params.id)
        .single();
      
      setExam(examData);

      // Get questions to show details
      const { data: qData } = await insforge.database
        .from('questions')
        .select('*')
        .eq('exam_id', params.id)
        .order('order_index', { ascending: true });
      setQuestions(qData || []);

      // Get results for this exam
      const { data: resultsData } = await insforge.database
        .from('results')
        .select('id, student_id, score, tab_switches, answers, submitted_at')
        .eq('exam_id', params.id)
        .order('score', { ascending: false });

      if (!resultsData || resultsData.length === 0) {
        setResults([]);
        setLoading(false);
        return;
      }

      const studentIds = resultsData.map(r => r.student_id);

      const { data: profiles } = await insforge.database
        .from('profiles')
        .select('id, name')
        .in('id', studentIds);

      const combinedResults = resultsData.map(r => {
        const studentProfile = profiles?.find(p => p.id === r.student_id);
        return {
          ...r,
          studentName: studentProfile?.name || 'طالب غير معروف',
        };
      });

      setResults(combinedResults);
      setLoading(false);
    };
    load();
  }, [params.id]);

  const filtered = results.filter(r => (r.studentName || '').includes(search));

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ width: 40, height: 40, border: '4px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }} dir="rtl">
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <button 
            onClick={() => router.back()} 
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
            ← العودة للامتحانات
          </button>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
            نتائج: {exam?.title || 'الامتحان'}
          </h1>
          <p style={{ color: '#64748b', marginTop: '0.25rem' }}>إجمالي التسليمات: {results.length}</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#fff', border: '1px solid #e2e8f0', padding: '0.7rem 1.1rem', borderRadius: '10px' }}>
        <Search size={16} color="#94a3b8" />
        <input
          type="text"
          placeholder="البحث باسم الطالب..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ border: 'none', width: '100%', fontSize: '0.9rem', background: 'transparent', outline: 'none' }}
        />
      </div>

      {results.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '5rem 2rem', border: '2px dashed #e2e8f0', borderRadius: '12px', color: '#94a3b8', textAlign: 'center' }}>
          <FileText size={52} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>لا يوجد أي تسليمات بعد</h3>
          <p>لم يقم أي طالب بالانتهاء من هذا الامتحان.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filtered.map(r => (
             <Card key={r.id} style={{ border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
               <CardContent style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                 
                 <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {r.studentName[0] || '?'}
                    </div>
                    <div>
                      <h4 style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a' }}>{r.studentName}</h4>
                      <p style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                        <Clock size={12} /> {new Date(r.submitted_at).toLocaleString('ar-EG')}
                      </p>
                    </div>
                 </div>

                 <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    {r.tab_switches > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#ef4444', backgroundColor: '#fef2f2', padding: '0.4rem 0.75rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
                        <AlertTriangle size={14} /> تبديل صفحات: {r.tab_switches}
                      </div>
                    )}
                    
                    <div style={{ 
                      padding: '0.5rem 1.25rem', 
                      borderRadius: '20px', 
                      fontWeight: 800, 
                      fontSize: '1.1rem',
                      background: r.score >= 70 ? '#dcfce7' : r.score >= 50 ? '#fef9c3' : '#fee2e2',
                      color: r.score >= 70 ? '#166534' : r.score >= 50 ? '#854d0e' : '#991b1b',
                     }}>
                      {r.score !== null ? `${Math.round(r.score)}%` : 'تحت المراجعة'}
                    </div>

                    <Button onClick={() => setExpanded(p => ({ ...p, [r.id]: !p[r.id] }))} variant="outline" size="sm">
                       {expanded[r.id] ? 'إخفاء التفاصيل' : 'عرض الإجابات'}
                    </Button>
                 </div>

               </CardContent>

               {/* Expanded Details */}
               {expanded[r.id] && (
                 <div style={{ padding: '1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h5 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>إجابات الطالب والتصحيح:</h5>
                    {questions.map((q, i) => {
                      const myAns = r.answers?.[q.id];
                      let isCorrect = false;
                      if (q.type === 'MCQ' || q.type === 'TF') {
                        isCorrect = String(myAns) === String(q.correct_answer);
                      }

                      return (
                        <div key={q.id} style={{ background: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ fontWeight: 700 }}>سؤال {i + 1}</span>
                            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{q.points} نقطة</span>
                          </div>
                          <p style={{ marginBottom: '1rem', color: '#1e293b' }}>{q.text}</p>
                          
                          <div style={{ background: '#f1f5f9', padding: '0.75rem', borderRadius: '6px', marginBottom: '0.75rem' }}>
                            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>إجابة الطالب:</span>
                            <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>
                              {q.type === 'MCQ' && q.options && myAns !== undefined ? q.options[myAns] : 
                               q.type === 'TF' ? (myAns === 'true' ? 'صح' : myAns === 'false' ? 'خطأ' : 'لم يُجب') :
                               (myAns || 'لم يُجب')}
                            </div>
                          </div>

                          {(q.type === 'MCQ' || q.type === 'TF') && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: isCorrect ? '#166534' : '#991b1b', fontSize: '0.9rem' }}>
                              {isCorrect ? <CheckCircle size={16} /> : <XCircle size={16} />}
                              {isCorrect ? 'إجابة صحيحة' : 'إجابة خاطئة'}
                              
                              {!isCorrect && (
                                <span style={{ color: '#64748b', fontWeight: 400, marginRight: 'auto' }}>
                                  الصح: {q.type === 'MCQ' ? q.options?.[q.correct_answer] : q.correct_answer === 'true' ? 'صح' : 'خطأ'}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                 </div>
               )}

             </Card>
          ))}
        </div>
      )}

    </div>
  );
}
