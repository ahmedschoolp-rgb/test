'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Plus, Trash2, Settings2, Save, Layout, HelpCircle, CheckCircle, AlertCircle, Download, FileSpreadsheet, ChevronDown } from 'lucide-react';
import styles from './NewExam.module.css';
import * as XLSX from 'xlsx';
import { useRouter } from 'next/navigation';
import insforge from '@/lib/insforge';

type QType = 'MCQ' | 'TF' | 'Matching' | 'Translation' | 'Essay';

interface Question {
  id: string;
  type: QType;
  text: string;
  points: number;
  // MCQ
  options: string[];
  correctMCQ: number | null;
  // TF
  correctTF: 'true' | 'false' | null;
  // Matching
  matchLeft: string[];
  matchRight: string[];
  // Translation / Essay
  modelAnswer: string;
}

const mkQ = (type: QType): Question => ({
  id: Math.random().toString(36).slice(2),
  type,
  text: '',
  points: 1,
  options: type === 'MCQ' ? ['', '', '', ''] : [],
  correctMCQ: null,
  correctTF: null,
  matchLeft: ['', ''],
  matchRight: ['', ''],
  modelAnswer: '',
});

export default function NewExamPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'details' | 'questions' | 'settings'>('details');
  const [qs, setQs]   = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [showExcelMenu, setShowExcelMenu] = useState(false);

  const [exam, setExam] = useState({
    title: '', description: '',
    timeLimit: 60, attempts: 1,
    randomize: false, fullscreen: false, preventTab: false,
  });

  // ===== helpers to update a question field =====
  const upd = (id: string, patch: Partial<Question>) =>
    setQs(prev => prev.map(q => q.id === id ? { ...q, ...patch } : q));

  const setOption = (id: string, i: number, val: string) =>
    setQs(prev => prev.map(q => {
      if (q.id !== id) return q;
      const opts = [...q.options]; opts[i] = val; return { ...q, options: opts };
    }));

  const setMatch = (id: string, side: 'Left' | 'Right', i: number, val: string) =>
    setQs(prev => prev.map(q => {
      if (q.id !== id) return q;
      const arr = [...(side === 'Left' ? q.matchLeft : q.matchRight)];
      arr[i] = val;
      return side === 'Left' ? { ...q, matchLeft: arr } : { ...q, matchRight: arr };
    }));

  const addMatchPair = (id: string) =>
    setQs(prev => prev.map(q =>
      q.id === id ? { ...q, matchLeft: [...q.matchLeft, ''], matchRight: [...q.matchRight, ''] } : q
    ));

  // ===== Save to InsForge =====
  const saveExam = async (status: 'draft' | 'published') => {
    if (!exam.title.trim()) {
      setMsg({ type: 'err', text: 'يرجى إدخال عنوان الامتحان أولاً.' });
      setTab('details');
      return;
    }
    setSaving(true); setMsg(null);
    try {
      const { data: userData } = await insforge.auth.getCurrentUser();
      const teacherId = userData?.user?.id;

      // Create exam
      const { data: examRow, error: examErr } = await insforge.database
        .from('exams')
        .insert([{
          teacher_id:         teacherId,
          title:              exam.title,
          description:        exam.description,
          time_limit:         exam.timeLimit,
          attempts:           exam.attempts,
          randomize:          exam.randomize,
          fullscreen:         exam.fullscreen,
          prevent_tab_switch: exam.preventTab,
          status,
        }])
        .select('id')
        .single();

      if (examErr) throw examErr;

      // Insert questions
      if (qs.length > 0) {
        const qRows = qs.map((q, i) => ({
          exam_id:      examRow.id,
          type:         q.type,
          text:         q.text,
          points:       q.points,
          order_index:  i,
          options: q.type === 'MCQ'      ? q.options :
                   q.type === 'TF'       ? ['صح', 'خطأ'] :
                   q.type === 'Matching' ? q.matchLeft : null,
          correct_answer:
            q.type === 'MCQ'       ? q.correctMCQ :
            q.type === 'TF'        ? q.correctTF :
            q.type === 'Matching'  ? q.matchRight :
            q.type !== 'Essay'     ? q.modelAnswer : null,
        }));
        await insforge.database.from('questions').insert(qRows);
      }

      setMsg({ type: 'ok', text: status === 'published' ? 'تم نشر الامتحان بنجاح! ✅' : 'تم الحفظ كمسودة.' });
      setTimeout(() => router.push('/dashboard/teacher/exams'), 1500);
    } catch (e: any) {
      setMsg({ type: 'err', text: 'حدث خطأ: ' + (e?.message || 'يرجى المحاولة مرة أخرى.') });
    } finally {
      setSaving(false);
    }
  };

  // ===== Excel Import/Export =====
  const downloadTemplate = () => {
    const data = [
      { 'Type': 'mcq', 'Content': 'ما هي عاصمة مصر؟', 'خيار 1': 'القاهرة', 'خيار 2': 'الإسكندرية', 'خيار 3': 'طنطا', 'خيار 4': 'المنصورة', 'الإجابة الصحيحة': 'القاهرة' },
      { 'Type': 'tf', 'Content': 'الشمس تشرق من الغرب', 'خيار 1': 'صح', 'خيار 2': 'خطأ', 'خيار 3': '', 'خيار 4': '', 'الإجابة الصحيحة': 'خططأ' },
      { 'Type': 'translate', 'Content': 'I love programming', 'خيار 1': '', 'خيار 2': '', 'خيار 3': '', 'خيار 4': '', 'الإجابة الصحيحة': 'أنا أحب البرمجة' },
      { 'Type': 'essay', 'Content': 'تحدث عن أهمية التعليم', 'خيار 1': '', 'خيار 2': '', 'خيار 3': '', 'خيار 4': '', 'الإجابة الصحيحة': '' },
      { 'Type': 'match', 'Content': 'Apple', 'خيار 1': '', 'خيار 2': '', 'خيار 3': '', 'خيار 4': '', 'الإجابة الصحيحة': 'تفاحة' },
      { 'Type': 'match', 'Content': 'Orange', 'خيار 1': '', 'خيار 2': '', 'خيار 3': '', 'خيار 4': '', 'الإجابة الصحيحة': 'برتقالة' },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Questions Template");
    XLSX.writeFile(wb, "exam_template.xlsx");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        const newQuestions: Question[] = [];
        let currentMatchingQuestion: Question | null = null;

        data.forEach((row) => {
          const typeStr = (row.Type || '').toLowerCase().trim();
          const content = String(row.Content || row['السؤال/النص'] || '');
          const options = [row['خيار 1'], row['خيار 2'], row['خيار 3'], row['خيار 4']]
            .filter(x => x !== undefined && x !== null && x !== '')
            .map(String);
          const correctAnswer = String(row['الإجابة الصحيحة'] || '');

          if (typeStr === 'match') {
            if (!currentMatchingQuestion) {
              currentMatchingQuestion = {
                ...mkQ('Matching'),
                text: 'صل من العمود (أ) ما يناسبه من العمود (ب)',
                matchLeft: [content],
                matchRight: [correctAnswer],
              };
              newQuestions.push(currentMatchingQuestion);
            } else {
              currentMatchingQuestion.matchLeft.push(content);
              currentMatchingQuestion.matchRight.push(correctAnswer);
            }
          } else {
            currentMatchingQuestion = null; // reset grouping

            if (typeStr === 'mcq') {
              if (options.length < 2) {
                console.warn(`MCQ question "${content}" has less than 2 options.`);
                return;
              }
              const correctIdx = options.findIndex(o => o.trim() === correctAnswer.trim());
              newQuestions.push({
                ...mkQ('MCQ'),
                text: content,
                options: options,
                correctMCQ: correctIdx !== -1 ? correctIdx : 0
              });
            } else if (typeStr === 'tf') {
              newQuestions.push({
                ...mkQ('TF'),
                text: content,
                correctTF: correctAnswer === 'صح' || correctAnswer.toLowerCase() === 'true' ? 'true' : 'false'
              });
            } else if (typeStr === 'translate') {
              newQuestions.push({
                ...mkQ('Translation'),
                text: content,
                modelAnswer: correctAnswer
              });
            } else if (typeStr === 'essay') {
              newQuestions.push({
                ...mkQ('Essay'),
                text: content
              });
            }
          }
        });

        if (newQuestions.length > 0) {
          setQs(prev => [...prev, ...newQuestions]);
          setMsg({ type: 'ok', text: `تم استيراد ${newQuestions.length} سؤال بنجاح.` });
        } else {
          setMsg({ type: 'err', text: 'لم يتم العثور على أسئلة صالحة في الملف.' });
        }
      } catch (err) {
        setMsg({ type: 'err', text: 'خطأ في قراءة ملف الإكسيل.' });
      }
      e.target.value = '';
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className={styles.container} dir="rtl">
      <div className={styles.header}>
        <div>
          <h1>إنشاء امتحان جديد</h1>
          <p>صمم تقييمك بأنواع أسئلة مختلفة.</p>
        </div>
        <div className={styles.actions}>
          <Button variant="outline" onClick={() => saveExam('draft')} loading={saving}>حفظ كمسودة</Button>
          <Button onClick={() => saveExam('published')} loading={saving}><Save size={16} /> نشر الامتحان</Button>
        </div>
      </div>

      {msg && (
        <div className={msg.type === 'ok' ? styles.successMsg : styles.errorMsg}>
          {msg.type === 'ok' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {msg.text}
        </div>
      )}

      {/* ===== Tabs ===== */}
      <div className={styles.tabs}>
        {(['details','questions','settings'] as const).map(t => (
          <button key={t} className={tab === t ? styles.tabActive : styles.tabBtn} onClick={() => setTab(t)}>
            {t === 'details'   && <><Layout size={16}/> التفاصيل</>}
            {t === 'questions' && <><HelpCircle size={16}/> الأسئلة ({qs.length})</>}
            {t === 'settings'  && <><Settings2 size={16}/> الإعدادات</>}
          </button>
        ))}
      </div>

      {/* ===== Details ===== */}
      {tab === 'details' && (
        <Card><CardContent className={styles.formGrid}>
          <div className={styles.fieldFull}>
            <label>عنوان الامتحان *</label>
            <input placeholder="مثال: اختبار رياضيات الفصل الأول" value={exam.title}
              onChange={e => setExam({ ...exam, title: e.target.value })} />
          </div>
          <div className={styles.fieldFull}>
            <label>الوصف / التعليمات</label>
            <textarea rows={4} placeholder="اكتب تعليمات الامتحان للطلاب..." value={exam.description}
              onChange={e => setExam({ ...exam, description: e.target.value })} />
          </div>
          <div className={styles.field}>
            <label>مدة الامتحان (دقيقة)</label>
            <input type="number" min={1} value={exam.timeLimit}
              onChange={e => setExam({ ...exam, timeLimit: +e.target.value })} />
          </div>
          <div className={styles.field}>
            <label>عدد المحاولات المسموح</label>
            <input type="number" min={1} value={exam.attempts}
              onChange={e => setExam({ ...exam, attempts: +e.target.value })} />
          </div>
        </CardContent></Card>
      )}

      {/* ===== Questions ===== */}
      {tab === 'questions' && (
        <div className={styles.qLayout}>
          <aside className={styles.qSidebar}>
            <div className={styles.excelActions}>
              <button 
                className={styles.dropdownToggle} 
                onClick={() => setShowExcelMenu(!showExcelMenu)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <FileSpreadsheet size={16} />
                  <span>إدارة ملف الإكسيل</span>
                </div>
                <ChevronDown size={14} style={{ transform: showExcelMenu ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
              </button>
              
              {showExcelMenu && (
                <div className={styles.dropdownContent}>
                  <button className={styles.menuItem} onClick={() => { downloadTemplate(); setShowExcelMenu(false); }}>
                    <Download size={14} /> تحميل قالب الإكسيل الفارغ
                  </button>
                  <div className={styles.menuItemWrapper}>
                    <button className={styles.menuItem}>
                      <Plus size={14} /> استيراد الأسئلة من ملف
                    </button>
                    <input type="file" accept=".xlsx, .xls" onChange={(e) => { handleImportExcel(e); setShowExcelMenu(false); }} className={styles.fileInput} />
                  </div>
                </div>
              )}
            </div>

            <h3 style={{ marginTop: '1rem' }}>إضافة سؤال يدوي</h3>
            {(['MCQ','TF','Matching','Translation','Essay'] as QType[]).map(t => (
              <button key={t} className={styles.addBtn} onClick={() => setQs(p => [...p, mkQ(t)])}>
                <Plus size={14} />
                {t === 'MCQ'         ? 'اختيار من متعدد' :
                 t === 'TF'          ? 'صح / خطأ' :
                 t === 'Matching'    ? 'توصيل' :
                 t === 'Translation' ? 'ترجمة' : 'مقالي'}
              </button>
            ))}
          </aside>

          <div className={styles.qList}>
            {qs.length === 0 && (
              <div className={styles.emptyQ}>
                <HelpCircle size={44} color="#94a3b8" />
                <p>اختر نوع السؤال من القائمة لإضافته</p>
              </div>
            )}
            {qs.map((q, idx) => (
              <Card key={q.id} className={styles.qCard}>
                <CardHeader className={styles.qHead}>
                  <span className={styles.qBadge}>
                    {q.type === 'MCQ' ? 'اختيار من متعدد' : q.type === 'TF' ? 'صح / خطأ' :
                     q.type === 'Matching' ? 'توصيل' : q.type === 'Translation' ? 'ترجمة' : 'مقالي'}
                    {' '}— سؤال {idx + 1}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <label style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      نقاط:
                      <input type="number" min={1} className={styles.pointInput} value={q.points}
                        onChange={e => upd(q.id, { points: +e.target.value })} />
                    </label>
                    <button className={styles.delBtn} onClick={() => setQs(p => p.filter(x => x.id !== q.id))}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className={styles.qBody}>
                  <textarea className={styles.qText} rows={2} placeholder="اكتب السؤال هنا..."
                    value={q.text} onChange={e => upd(q.id, { text: e.target.value })} />

                  {/* MCQ */}
                  {q.type === 'MCQ' && (
                    <div className={styles.mcq}>
                      <p className={styles.hint}>اختر الإجابة الصحيحة بالضغط على الدائرة</p>
                      {q.options.map((opt, i) => (
                        <div key={i} className={`${styles.optRow} ${q.correctMCQ === i ? styles.optCorrect : ''}`}>
                          <button type="button" className={styles.radioBtn}
                            onClick={() => upd(q.id, { correctMCQ: i })}>
                            {q.correctMCQ === i ? '✓' : (i + 1)}
                          </button>
                          <input placeholder={`الخيار ${i + 1}`} value={opt}
                            onChange={e => setOption(q.id, i, e.target.value)} />
                        </div>
                      ))}
                      <button className={styles.addPairBtn}
                        onClick={() => setQs(p => p.map(x => x.id === q.id ? { ...x, options: [...x.options, ''] } : x))}>
                        <Plus size={13} /> إضافة خيار
                      </button>
                    </div>
                  )}

                  {/* True / False */}
                  {q.type === 'TF' && (
                    <div className={styles.tf}>
                      <p className={styles.hint}>اختر الإجابة الصحيحة:</p>
                      <div className={styles.tfButtons}>
                        <button type="button"
                          className={`${styles.tfBtn} ${q.correctTF === 'true' ? styles.tfCorrect : ''}`}
                          onClick={() => upd(q.id, { correctTF: 'true' })}>
                          ✓ صح
                        </button>
                        <button type="button"
                          className={`${styles.tfBtn} ${q.correctTF === 'false' ? styles.tfWrong : ''}`}
                          onClick={() => upd(q.id, { correctTF: 'false' })}>
                          ✗ خطأ
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Matching */}
                  {q.type === 'Matching' && (
                    <div className={styles.matching}>
                      <p className={styles.hint}>اكتب الأزواج — العمود الأيمن يقابل العمود الأيسر بالترتيب</p>
                      {q.matchLeft.map((_, i) => (
                        <div key={i} className={styles.matchRow}>
                          <input placeholder={`العنصر أ${i + 1}`} value={q.matchLeft[i]}
                            onChange={e => setMatch(q.id, 'Left', i, e.target.value)} />
                          <span className={styles.arrow}>↔</span>
                          <input placeholder={`العنصر ب${i + 1}`} value={q.matchRight[i]}
                            onChange={e => setMatch(q.id, 'Right', i, e.target.value)} />
                        </div>
                      ))}
                      <button className={styles.addPairBtn} onClick={() => addMatchPair(q.id)}>
                        <Plus size={13} /> إضافة زوج
                      </button>
                    </div>
                  )}

                  {/* Translation */}
                  {q.type === 'Translation' && (
                    <div className={styles.essay}>
                      <label className={styles.hint}>النص المطلوب ترجمته / الإجابة النموذجية</label>
                      <textarea rows={3} placeholder="اكتب الإجابة النموذجية هنا..."
                        value={q.modelAnswer} onChange={e => upd(q.id, { modelAnswer: e.target.value })} />
                    </div>
                  )}

                  {/* Essay */}
                  {q.type === 'Essay' && (
                    <div className={styles.essay}>
                      <label className={styles.hint}>نقاط الإجابة المثلى (اختياري)</label>
                      <textarea rows={3} placeholder="اكتب نقاط التقييم..."
                        value={q.modelAnswer} onChange={e => upd(q.id, { modelAnswer: e.target.value })} />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ===== Settings ===== */}
      {tab === 'settings' && (
        <Card><CardContent className={styles.settingsList}>
          {[
            { key: 'randomize', label: 'ترتيب عشوائي للأسئلة', sub: 'خلط ترتيب الأسئلة لكل طالب' },
            { key: 'fullscreen', label: 'وضع ملء الشاشة (إجباري)', sub: 'إجبار الطلاب على البقاء في وضع ملء الشاشة' },
            { key: 'preventTab', label: 'منع تبديل الصفحات', sub: 'تسجيل أو تحذير عند مغادرة صفحة الامتحان' },
          ].map(s => (
            <div key={s.key} className={styles.settingRow}>
              <div>
                <p className={styles.settingLabel}>{s.label}</p>
                <p className={styles.settingHint}>{s.sub}</p>
              </div>
              <button
                type="button"
                className={`${styles.toggle} ${(exam as any)[s.key] ? styles.toggleOn : ''}`}
                onClick={() => setExam(p => ({ ...p, [s.key]: !(p as any)[s.key] }))}
              >
                <span className={styles.toggleThumb} />
              </button>
            </div>
          ))}
        </CardContent></Card>
      )}
    </div>
  );
}
