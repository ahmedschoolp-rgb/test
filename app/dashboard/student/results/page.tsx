'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Trophy, Clock, FileText, CheckCircle, XCircle } from 'lucide-react';
import insforge from '@/lib/insforge';
import Link from 'next/link';

export default function StudentResultsPage() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: ud } = await insforge.auth.getCurrentUser();
      if (!ud?.user) return;

      const { data } = await insforge.database
        .from('results')
        .select('id, score, submitted_at, tab_switches, answers, exams(id, title, time_limit)')
        .eq('student_id', ud.user.id)
        .order('submitted_at', { ascending: false });

      setResults(data || []);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }} dir="rtl">
      <div>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.75rem', fontWeight: 700 }}>نتائجي</h1>
        <p style={{ color: '#64748b', marginTop: '0.25rem' }}>سجل امتحاناتك ونتائجك.</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : results.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '4rem 2rem', border: '2px dashed #e2e8f0', borderRadius: 12, textAlign: 'center', color: '#94a3b8' }}>
          <Trophy size={52} color="#94a3b8" />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>لم تؤدِ أي امتحان بعد</h3>
          <p style={{ fontSize: '0.875rem' }}>ادخل على الرئيسية وابدأ أول امتحان لك</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {results.map(r => {
            const exam = r.exams as any;
            const score = r.score !== null ? Math.round(r.score) : null;
            return (
              <Card key={r.id} style={{ border: 'none', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                <CardContent style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                      <FileText size={20} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, marginBottom: '0.2rem' }}>{exam?.title || 'امتحان'}</p>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Clock size={12} />
                        {new Date(r.submitted_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}
                        {r.tab_switches > 0 && <span style={{ marginRight: '0.5rem', color: '#f59e0b' }}>• {r.tab_switches} تبديل صفحة</span>}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {score !== null ? (
                      <span style={{
                        padding: '0.35rem 1rem', borderRadius: 20, fontWeight: 700, fontSize: '0.95rem',
                        background: score >= 70 ? '#dcfce7' : score >= 50 ? '#fef9c3' : '#fee2e2',
                        color: score >= 70 ? '#166534' : score >= 50 ? '#854d0e' : '#991b1b',
                      }}>
                        {score}%
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>قيد المراجعة</span>
                    )}

                    <Link href={`/dashboard/student/results/${r.id}`}>
                      <Button variant="outline" size="sm">مراجعة الأخطاء</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
