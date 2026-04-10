'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Clock, AlertTriangle, ChevronRight, ChevronLeft, Maximize2, CheckCircle } from 'lucide-react';
import styles from './ExamTaking.module.css';
import insforge from '@/lib/insforge';
import { useRouter } from 'next/navigation';

interface Question {
  id: string;
  type: string;
  text: string;
  points: number;
  options: string[] | null;
  correct_answer: any;
}

interface Exam {
  id: string;
  title: string;
  time_limit: number;
  attempts: number;
  fullscreen: boolean;
  prevent_tab_switch: boolean;
  show_results: boolean;
}

export default function TakeExamPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const [exam,            setExam]           = useState<Exam | null>(null);
  const [questions,       setQuestions]      = useState<Question[]>([]);
  const [loading,         setLoading]        = useState(true);
  const [error,           setError]          = useState('');
  const [currentQ,        setCurrentQ]       = useState(0);
  const [answers,         setAnswers]        = useState<Record<string, any>>({});
  const [timeLeft,        setTimeLeft]       = useState(3600);
  const [tabSwitches,     setTabSwitches]    = useState(0);
  const [isFullscreen,    setIsFullscreen]   = useState(false);
  const [submitted,       setSubmitted]      = useState(false);
  const [submitting,      setSubmitting]     = useState(false);
  const [finalScore,      setFinalScore]     = useState<number | null>(null);
  const [userId,          setUserId]         = useState<string>('');

  // ===== Load exam + questions =====
  useEffect(() => {
    const load = async () => {
      const { data: ud } = await insforge.auth.getCurrentUser();
      if (ud?.user) setUserId(ud.user.id);

      const { data: examData, error: examErr } = await insforge.database
        .from('exams')
        .select('id, title, time_limit, attempts, fullscreen, prevent_tab_switch')
        .eq('id', params.id)
        .single();

      if (examErr || !examData) {
        setError('لم يتم العثور على الامتحان أو ليس لديك صلاحية الوصول إليه.');
        setLoading(false);
        return;
      }

      // Check max attempts
      if (ud?.user) {
        const { data: pastResults } = await insforge.database
          .from('results')
          .select('id')
          .eq('exam_id', params.id)
          .eq('student_id', ud.user.id);
          
        if (pastResults && pastResults.length >= (examData as any).attempts) {
          setError(`لقد استنفدت عدد المحاولات المسموح بها لهذا الامتحان (${(examData as any).attempts} محاولات).`);
          setLoading(false);
          return;
        }
      }

      setExam(examData as Exam);
      setTimeLeft((examData as Exam).time_limit * 60);

      const { data: qData } = await insforge.database
        .from('questions')
        .select('id, type, text, points, options, correct_answer')
        .eq('exam_id', params.id)
        .order('order_index', { ascending: true });

      setQuestions(qData || []);
      setLoading(false);
    };
    load();
  }, [params.id]);

  // ===== Timer =====
  useEffect(() => {
    if (!exam || submitted || loading) return;
    if (timeLeft <= 0) { handleSubmit(); return; }
    const t = setInterval(() => setTimeLeft(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft, exam, submitted, loading]);

  // ===== Tab switch detection =====
  useEffect(() => {
    if (!exam?.prevent_tab_switch) return;
    const handler = () => {
      if (document.hidden) {
        setTabSwitches(p => p + 1);
        alert('⚠️ تحذير: تم تسجيل تبديل الصفحة. استمرار هذا السلوك قد يؤدي إلى تسليم الامتحان تلقائياً.');
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [exam]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ===== Auto-score MCQ/TF questions =====
  const calcScore = (qs: Question[], ans: Record<string, any>) => {
    let earned = 0;
    let total  = 0;
    qs.forEach(q => {
      total += q.points;
      if (q.type === 'MCQ' || q.type === 'TF') {
        const correct = q.correct_answer;
        const given   = ans[q.id];
        if (given !== undefined && String(given) === String(correct)) {
          earned += q.points;
        }
      }
      // Essay / Translation / Matching graded manually → no auto-score
    });
    return total > 0 ? Math.round((earned / total) * 100) : null;
  };

  // ===== Submit =====
  const handleSubmit = async () => {
    if (submitting || submitted) return;
    setSubmitting(true);

    const score = calcScore(questions, answers);
    setFinalScore(score);

    try {
      const { error: insertErr } = await insforge.database.from('results').insert([{
        exam_id:      params.id,
        student_id:   userId,
        answers:      answers,
        score:        score,
        tab_switches: tabSwitches,
      }]);
      if (insertErr) {
        console.error('Insert error:', insertErr);
        alert('لم يتم حفظ النتيجة! خطأ: ' + insertErr.message);
      }
    } catch (e: any) {
      console.error('Failed to save result exception:', e);
      alert('لم يتم حفظ النتيجة لأسباب تقنية: ' + e.message);
    }

    setSubmitted(true);
    setSubmitting(false);
  };

  // ===== States =====
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div className={styles.spinner} />
          <p style={{ marginTop: '1rem' }}>جاري تحميل الامتحان...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '4rem', textAlign: 'center' }} dir="rtl">
        <AlertTriangle size={52} color="#dc2626" />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>خطأ في تحميل الامتحان</h2>
        <p style={{ color: '#64748b' }}>{error}</p>
        <Button onClick={() => router.push('/dashboard/student')}>العودة للرئيسية</Button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '4rem', textAlign: 'center' }} dir="rtl">
        <h2>هذا الامتحان لا يحتوي على أسئلة بعد.</h2>
        <Button onClick={() => router.push('/dashboard/student')}>العودة</Button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '2rem' }} dir="rtl">
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <Card style={{ textAlign: 'center', padding: '2rem', marginBottom: '2rem' }}>
            <CheckCircle size={64} color="#10b981" style={{ margin: '0 auto 1rem' }} />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>تم تسليم الامتحان بنجاح!</h1>
            
            {finalScore !== null ? (
              <>
                <p style={{ color: '#64748b' }}>نتيجتك الأولية (للأسئلة الموضوعية)</p>
                <div className={styles.scoreBig} style={{
                  color: finalScore >= 70 ? '#166534' : finalScore >= 50 ? '#854d0e' : '#991b1b',
                  background: finalScore >= 70 ? '#dcfce7' : finalScore >= 50 ? '#fef9c3' : '#fee2e2',
                }}>
                  {finalScore}%
                </div>
              </>
            ) : (
              <p style={{ color: '#64748b', marginBottom: '2rem' }}>سيتم مراجعة إجاباتك وإخطارك بالنتيجة قريباً.</p>
            )}
            
            <Button onClick={() => router.push('/dashboard/student')}>العودة للوحة التحكم</Button>
          </Card>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', color: '#0f172a' }}>مراجعة الإجابات</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {questions.map((q, i) => {
              const myAns = answers[q.id];
              let isCorrect = false;
              let isGradable = false;

              if (q.type === 'MCQ' || q.type === 'TF') {
                isGradable = true;
                isCorrect = String(myAns) === String(q.correct_answer);
              }

              return (
                <Card key={q.id}>
                  <CardContent style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                       <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>سؤال {i + 1}</span>
                       <span style={{ fontWeight: 600, color: '#64748b' }}>{q.points} نقاط</span>
                    </div>
                    <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>{q.text}</p>
                    
                    <div style={{ background: '#f1f5f9', padding: '1rem', borderRadius: '8px', marginBottom: '0.5rem' }}>
                      <span style={{ color: '#64748b', fontSize: '0.9rem' }}>إجابتك:</span>
                      <div style={{ fontWeight: 600, marginTop: '0.25rem' }}>
                        {q.type === 'MCQ' && q.options && myAns !== undefined ? q.options[myAns] : 
                         q.type === 'TF' ? (myAns === 'true' ? 'صح' : myAns === 'false' ? 'خطأ' : 'لم تُجب') :
                         q.type === 'Matching' ? (Array.isArray(myAns) ? myAns.join(' | ') : 'لم تُجب') :
                         (myAns || 'لم تُجب')}
                      </div>
                    </div>

                    {isGradable && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, marginTop: '1rem', color: isCorrect ? '#166534' : '#991b1b' }}>
                        {isCorrect ? '✅ إجابة صحيحة' : '❌ إجابة خاطئة'}
                        {!isCorrect && q.correct_answer !== undefined && (
                          <span style={{ color: '#64748b', fontWeight: 400, marginRight: '1rem' }}>
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
      </div>
    );
  }

  const q = questions[currentQ];

  return (
    <div className={styles.examLayout} ref={containerRef} dir="rtl">
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.examInfo}>
          <h2>{exam?.title}</h2>
          <span className={styles.qCounter}>سؤال {currentQ + 1} من {questions.length}</span>
        </div>
        <div className={styles.proctorInfo}>
          <div className={`${styles.timer} ${timeLeft < 300 ? styles.timerWarning : ''}`}>
            <Clock size={18} /> {formatTime(timeLeft)}
          </div>
          {tabSwitches > 0 && (
            <div className={styles.warning}>
              <AlertTriangle size={16} /> {tabSwitches} تحذير
            </div>
          )}
          <Button variant="outline" size="sm" onClick={toggleFullscreen}>
            <Maximize2 size={15} /> {isFullscreen ? 'خروج' : 'ملء الشاشة'}
          </Button>
        </div>
      </header>

      <div className={styles.content}>
        {/* Question */}
        <div className={styles.questionContainer}>
          <Card className={styles.qCard}>
            <CardContent>
              <div className={styles.qMeta}>
                <span className={styles.qType}>
                  {q.type === 'MCQ' ? 'اختيار من متعدد' :
                   q.type === 'TF'  ? 'صح / خطأ' :
                   q.type === 'Matching' ? 'توصيل' :
                   q.type === 'Translation' ? 'ترجمة' : 'مقالي'}
                </span>
                <span className={styles.qPoints}>{q.points} نقطة</span>
              </div>
              <h3 className={styles.questionText}>{q.text}</h3>

              <div className={styles.answerArea}>
                {/* MCQ */}
                {q.type === 'MCQ' && q.options && (
                  <div className={styles.optionsList}>
                    {q.options.map((opt, i) => (
                      <label key={i} className={`${styles.optionLabel} ${answers[q.id] === i ? styles.optionSelected : ''}`}>
                        <input type="radio" name={`q-${q.id}`}
                          checked={answers[q.id] === i}
                          onChange={() => setAnswers({ ...answers, [q.id]: i })} />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* TF */}
                {q.type === 'TF' && (
                  <div className={styles.tfRow}>
                    {['true', 'false'].map(val => (
                      <button key={val} type="button"
                        className={`${styles.tfBtn} ${answers[q.id] === val ? (val === 'true' ? styles.tfTrue : styles.tfFalse) : ''}`}
                        onClick={() => setAnswers({ ...answers, [q.id]: val })}>
                        {val === 'true' ? '✓ صح' : '✗ خطأ'}
                      </button>
                    ))}
                  </div>
                )}

                {/* Matching */}
                {q.type === 'Matching' && q.options && (
                  <div className={styles.matchingGrid}>
                    <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                      اختر الإجابة المناسبة لكل عنصر:
                    </p>
                    {q.options.map((item, i) => (
                      <div key={i} className={styles.matchRow}>
                        <span className={styles.matchItem}>{item}</span>
                        <span>↔</span>
                        <input
                          placeholder="اكتب الإجابة..."
                          value={(answers[q.id] || [])[i] || ''}
                          onChange={e => {
                            const arr = [...(answers[q.id] || new Array(q.options!.length).fill(''))];
                            arr[i] = e.target.value;
                            setAnswers({ ...answers, [q.id]: arr });
                          }}
                          className={styles.matchInput}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Essay / Translation */}
                {(q.type === 'Essay' || q.type === 'Translation') && (
                  <textarea className={styles.essayInput} rows={8}
                    placeholder={q.type === 'Translation' ? 'اكتب ترجمتك هنا...' : 'اكتب إجابتك هنا...'}
                    value={answers[q.id] || ''}
                    onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })} />
                )}
              </div>
            </CardContent>
          </Card>

          <footer className={styles.footer}>
            <Button variant="outline" disabled={currentQ === 0}
              onClick={() => setCurrentQ(p => p - 1)}>
              <ChevronRight size={18} /> السابق
            </Button>
            {currentQ === questions.length - 1 ? (
              <Button onClick={handleSubmit} loading={submitting}>
                {!submitting && 'تسليم الامتحان'}
              </Button>
            ) : (
              <Button onClick={() => setCurrentQ(p => p + 1)}>
                التالي <ChevronLeft size={18} />
              </Button>
            )}
          </footer>
        </div>

        {/* Navigation sidebar */}
        <aside className={styles.navBar}>
          <h3>التنقل السريع</h3>
          <div className={styles.qGrid}>
            {questions.map((_, i) => (
              <button key={i}
                className={currentQ === i ? styles.activeNav : answers[questions[i].id] !== undefined ? styles.answeredNav : styles.navBtn}
                onClick={() => setCurrentQ(i)}>
                {i + 1}
              </button>
            ))}
          </div>
          <div className={styles.legend}>
            <div className={styles.legendItem}><span className={styles.activeNav} style={{ width: 14, height: 14, display: 'inline-block', borderRadius: 4 }} /> الحالي</div>
            <div className={styles.legendItem}><span className={styles.answeredNav} style={{ width: 14, height: 14, display: 'inline-block', borderRadius: 4 }} /> تم الإجابة</div>
          </div>
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
            <Button variant="outline" style={{ width: '100%' }} onClick={handleSubmit} loading={submitting}>
              {!submitting && 'تسليم الامتحان'}
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
