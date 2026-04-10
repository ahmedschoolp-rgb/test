'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Plus, Trash2, Settings2, Save, Layout, HelpCircle, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import styles from '../../new/NewExam.module.css';
import { useRouter } from 'next/navigation';
import insforge from '@/lib/insforge';

type QType = 'MCQ' | 'TF' | 'Matching' | 'Translation' | 'Essay';

interface Question {
  id: string;
  type: QType;
  text: string;
  points: number;
  options: string[];
  correctMCQ: number | null;
  correctTF: 'true' | 'false' | null;
  matchLeft: string[];
  matchRight: string[];
  modelAnswer: string;
}

const mkQ = (type: QType): Question => ({
  id: Math.random().toString(36).slice(2),
  type, text: '', points: 1,
  options: type === 'MCQ' ? ['', '', '', ''] : [],
  correctMCQ: null, correctTF: null,
  matchLeft: ['', ''], matchRight: ['', ''],
  modelAnswer: '',
});

export default function EditExamPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [tab, setTab] = useState<'details' | 'questions' | 'settings'>('details');
  const [qs, setQs]   = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg]       = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [exam, setExam] = useState({
    title: '', description: '',
    timeLimit: 60, attempts: 1,
    randomize: false, fullscreen: false, preventTab: false,
  });

  useEffect(() => {
    const load = async () => {
      const { data: ex } = await insforge.database.from('exams').select('*').eq('id', params.id).single();
      if (!ex) { setLoading(false); return; }

      setExam({
        title: ex.title || '',
        description: ex.description || '',
        timeLimit: ex.time_limit || 60,
        attempts: ex.attempts || 1,
        randomize: ex.randomize || false,
        fullscreen: ex.fullscreen || false,
        preventTab: ex.prevent_tab_switch || false,
      });

      const { data: questions } = await insforge.database.from('questions').select('*').eq('exam_id', params.id).order('order_index', { ascending: true });
      if (questions) {
        const loadedQs: Question[] = questions.map(q => ({
          id: Math.random().toString(36).slice(2), // assign mostly new temporary IDs for editing
          type: q.type, text: q.text, points: q.points,
          options: q.type === 'MCQ' ? q.options : [],
          correctMCQ: q.type === 'MCQ' ? q.correct_answer : null,
          correctTF: q.type === 'TF' ? q.correct_answer : null,
          matchLeft: q.type === 'Matching' ? q.options : ['', ''],
          matchRight: q.type === 'Matching' ? q.correct_answer : ['', ''],
          modelAnswer: (q.type !== 'MCQ' && q.type !== 'TF' && q.type !== 'Matching') ? q.correct_answer : '',
        }));
        setQs(loadedQs);
      }
      setLoading(false);
    };
    load();
  }, [params.id]);

  const upd = (id: string, patch: Partial<Question>) => setQs(prev => prev.map(q => q.id === id ? { ...q, ...patch } : q));
  const setOption = (id: string, i: number, val: string) => setQs(prev => prev.map(q => { if (q.id !== id) return q; const opts = [...q.options]; opts[i] = val; return { ...q, options: opts }; }));
  const setMatch = (id: string, side: 'Left' | 'Right', i: number, val: string) => setQs(prev => prev.map(q => { if (q.id !== id) return q; const arr = [...(side === 'Left' ? q.matchLeft : q.matchRight)]; arr[i] = val; return side === 'Left' ? { ...q, matchLeft: arr } : { ...q, matchRight: arr }; }));
  const addMatchPair = (id: string) => setQs(prev => prev.map(q => q.id === id ? { ...q, matchLeft: [...q.matchLeft, ''], matchRight: [...q.matchRight, ''] } : q));

  const saveExam = async (status: 'draft' | 'published') => {
    if (!exam.title.trim()) { setMsg({ type: 'err', text: 'يرجى إدخال عنوان الامتحان أولاً.' }); setTab('details'); return; }
    setSaving(true); setMsg(null);
    try {
      const { error: examErr } = await insforge.database.from('exams').update({
        title:              exam.title,
        description:        exam.description,
        time_limit:         exam.timeLimit,
        attempts:           exam.attempts,
        randomize:          exam.randomize,
        fullscreen:         exam.fullscreen,
        prevent_tab_switch: exam.preventTab,
        status,
      }).eq('id', params.id);

      if (examErr) throw examErr;

      // Wipe old questions and insert new ones to avoid tracking IDs
      await insforge.database.from('questions').delete().eq('exam_id', params.id);

      if (qs.length > 0) {
        const qRows = qs.map((q, i) => ({
          exam_id:      params.id,
          type:         q.type,
          text:         q.text,
          points:       q.points,
          order_index:  i,
          options: q.type === 'MCQ' ? q.options : q.type === 'TF' ? ['صح', 'خطأ'] : q.type === 'Matching' ? q.matchLeft : null,
          correct_answer: q.type === 'MCQ' ? q.correctMCQ : q.type === 'TF' ? q.correctTF : q.type === 'Matching' ? q.matchRight : q.type !== 'Essay' ? q.modelAnswer : null,
        }));
        await insforge.database.from('questions').insert(qRows);
      }

      setMsg({ type: 'ok', text: 'تم تحديث الامتحان بنجاح! ✅' });
      setTimeout(() => router.push('/dashboard/teacher/exams'), 1500);
    } catch (e: any) { setMsg({ type: 'err', text: 'حدث خطأ: ' + (e?.message || 'يرجى المحاولة مرة أخرى.') }); } finally { setSaving(false); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className={styles.spinner} /></div>;

  return (
    <div className={styles.container} dir="rtl">
      <button className={styles.backBtn} onClick={() => router.back()}><ArrowRight size={18} /> العودة</button>
      <div className={styles.header}>
        <div><h1>تعديل الامتحان</h1><p>قم بتحديث أسئلة وتفاصيل التقييم.</p></div>
        <div className={styles.actions}>
          <Button variant="outline" onClick={() => saveExam('draft')} loading={saving}>حفظ كمسودة</Button>
          <Button onClick={() => saveExam('published')} loading={saving}><Save size={16} /> نشر التعديلات</Button>
        </div>
      </div>
      {msg && <div className={msg.type === 'ok' ? styles.successMsg : styles.errorMsg}>{msg.type === 'ok' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}{msg.text}</div>}

      <div className={styles.tabs}>
        {(['details','questions','settings'] as const).map(t => (
          <button key={t} className={tab === t ? styles.tabActive : styles.tabBtn} onClick={() => setTab(t)}>
            {t === 'details' && <><Layout size={16}/> التفاصيل</>}{t === 'questions' && <><HelpCircle size={16}/> الأسئلة ({qs.length})</>}{t === 'settings' && <><Settings2 size={16}/> الإعدادات</>}
          </button>
        ))}
      </div>

      {tab === 'details' && (
        <Card><CardContent className={styles.formGrid}>
          <div className={styles.fieldFull}><label>عنوان الامتحان *</label><input value={exam.title} onChange={e => setExam({ ...exam, title: e.target.value })} /></div>
          <div className={styles.fieldFull}><label>الوصف / التعليمات</label><textarea rows={4} value={exam.description} onChange={e => setExam({ ...exam, description: e.target.value })} /></div>
          <div className={styles.field}><label>مدة الامتحان (دقيقة)</label><input type="number" min={1} value={exam.timeLimit} onChange={e => setExam({ ...exam, timeLimit: +e.target.value })} /></div>
          <div className={styles.field}><label>عدد المحاولات المسموح</label><input type="number" min={1} value={exam.attempts} onChange={e => setExam({ ...exam, attempts: +e.target.value })} /></div>
        </CardContent></Card>
      )}

      {tab === 'questions' && (
        <div className={styles.qLayout}>
          <aside className={styles.qSidebar}>
            <h3>نوع السؤال</h3>
            {(['MCQ','TF','Matching','Translation','Essay'] as QType[]).map(t => (
              <button key={t} className={styles.addBtn} onClick={() => setQs(p => [...p, mkQ(t)])}><Plus size={14} /> {t === 'MCQ' ? 'اختيار من متعدد' : t === 'TF' ? 'صح / خطأ' : t === 'Matching' ? 'توصيل' : t === 'Translation' ? 'ترجمة' : 'مقالي'}</button>
            ))}
          </aside>
          <div className={styles.qList}>
            {qs.length === 0 && <div className={styles.emptyQ}><HelpCircle size={44} color="#94a3b8" /><p>اختر نوع السؤال من القائمة لإضافته</p></div>}
            {qs.map((q, idx) => (
              <Card key={q.id} className={styles.qCard}>
                <CardHeader className={styles.qHead}>
                  <span className={styles.qBadge}>{q.type === 'MCQ' ? 'اختيار من متعدد' : q.type === 'TF' ? 'صح / خطأ' : q.type === 'Matching' ? 'توصيل' : q.type === 'Translation' ? 'ترجمة' : 'مقالي'} — سؤال {idx + 1}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><label style={{ fontSize: '0.8rem', color: '#64748b' }}>نقاط:<input type="number" min={1} className={styles.pointInput} value={q.points} onChange={e => upd(q.id, { points: +e.target.value })} /></label><button className={styles.delBtn} onClick={() => setQs(p => p.filter(x => x.id !== q.id))}><Trash2 size={15} /></button></div>
                </CardHeader>
                <CardContent className={styles.qBody}>
                  <textarea className={styles.qText} rows={2} placeholder="اكتب السؤال هنا..." value={q.text} onChange={e => upd(q.id, { text: e.target.value })} />
                  {q.type === 'MCQ' && (
                    <div className={styles.mcq}><p className={styles.hint}>اختر الإجابة الصحيحة بالضغط على الدائرة</p>
                      {q.options.map((opt, i) => (<div key={i} className={`${styles.optRow} ${q.correctMCQ === i ? styles.optCorrect : ''}`}><button type="button" className={styles.radioBtn} onClick={() => upd(q.id, { correctMCQ: i })}>{q.correctMCQ === i ? '✓' : (i + 1)}</button><input placeholder={`الخيار ${i + 1}`} value={opt} onChange={e => setOption(q.id, i, e.target.value)} /></div>))}
                      <button className={styles.addPairBtn} onClick={() => setQs(p => p.map(x => x.id === q.id ? { ...x, options: [...x.options, ''] } : x))}><Plus size={13} /> إضافة خيار</button>
                    </div>
                  )}
                  {q.type === 'TF' && (
                    <div className={styles.tf}><p className={styles.hint}>اختر الإجابة الصحيحة:</p><div className={styles.tfButtons}><button type="button" className={`${styles.tfBtn} ${q.correctTF === 'true' ? styles.tfCorrect : ''}`} onClick={() => upd(q.id, { correctTF: 'true' })}>✓ صح</button><button type="button" className={`${styles.tfBtn} ${q.correctTF === 'false' ? styles.tfWrong : ''}`} onClick={() => upd(q.id, { correctTF: 'false' })}>✗ خطأ</button></div></div>
                  )}
                  {q.type === 'Matching' && (
                    <div className={styles.matching}><p className={styles.hint}>اكتب الأزواج — الأيمن يقابل الأيسر</p>
                      {q.matchLeft.map((_, i) => (<div key={i} className={styles.matchRow}><input placeholder={`أ${i + 1}`} value={q.matchLeft[i]} onChange={e => setMatch(q.id, 'Left', i, e.target.value)} /><span className={styles.arrow}>↔</span><input placeholder={`ب${i + 1}`} value={q.matchRight[i]} onChange={e => setMatch(q.id, 'Right', i, e.target.value)} /></div>))}
                      <button className={styles.addPairBtn} onClick={() => addMatchPair(q.id)}><Plus size={13} /> إضافة زوج</button>
                    </div>
                  )}
                  {(q.type === 'Translation' || q.type === 'Essay') && <div className={styles.essay}><label className={styles.hint}>الإجابة النموذجية (اختياري)</label><textarea rows={3} value={q.modelAnswer} onChange={e => upd(q.id, { modelAnswer: e.target.value })} /></div>}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <Card><CardContent className={styles.settingsList}>
          {[{ key: 'randomize', label: 'ترتيب عشوائي للأسئلة', sub: 'مسودة' },{ key: 'fullscreen', label: 'ملء الشاشة', sub: 'إجباري' },{ key: 'preventTab', label: 'منع التبديل', sub: 'تحذير' }].map(s => (
            <div key={s.key} className={styles.settingRow}><div><p className={styles.settingLabel}>{s.label}</p><p className={styles.settingHint}>{s.sub}</p></div><button type="button" className={`${styles.toggle} ${(exam as any)[s.key] ? styles.toggleOn : ''}`} onClick={() => setExam(p => ({ ...p, [s.key]: !(p as any)[s.key] }))}><span className={styles.toggleThumb} /></button></div>
          ))}
        </CardContent></Card>
      )}
    </div>
  );
}
