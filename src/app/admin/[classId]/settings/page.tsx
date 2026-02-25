'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getClassSettings, setClassSettings, subscribeClassSettings } from '@/lib/db';
import { isFirebaseConfigured } from '@/lib/firebase';
import type { TeacherSettings } from '@/lib/types';

export default function AdminSettingsPage() {
  const params = useParams();
  const classId = (params?.classId as string) ?? 'default';
  const [settings, setSettings] = useState<TeacherSettings | null>(null);
  const [rows, setRows] = useState(4);
  const [cols, setCols] = useState(6);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    const unsub = subscribeClassSettings(classId, (next) => {
      if (next) {
        setSettings(next);
        setRows(next.rows);
        setCols(next.cols);
      }
    });
    return () => unsub();
  }, [classId]);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    getClassSettings(classId).then((s) => {
      if (s) {
        setSettings(s);
        setRows(s.rows);
        setCols(s.cols);
      }
    }).catch(() => setError('설정을 불러올 수 없습니다. Firebase 연결을 확인해 주세요.'));
  }, [classId]);

  const handleSave = async () => {
    setError(null);
    setSuccess(false);
    if (!isFirebaseConfigured()) {
      setError(
        'Firebase 환경 변수가 없습니다. .env.local(로컬) 또는 Netlify 환경 변수에 NEXT_PUBLIC_FIREBASE_* 값을 설정해 주세요.'
      );
      return;
    }
    setSaving(true);
    try {
      await setClassSettings(classId, { rows, cols });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : '저장에 실패했습니다.';
      setError(
        message.includes('환경 변수')
          ? message
          : '저장할 수 없습니다. 네트워크 연결과 Firebase 환경 변수(.env.local 또는 Netlify)를 확인해 주세요.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">자리 배치 설정</h1>

      {!isFirebaseConfigured() && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 p-4 text-sm">
          Firebase가 설정되지 않았습니다. 저장하려면 프로젝트 루트에 <code className="bg-amber-100 px-1 rounded">.env.local</code>을 만들고{' '}
          <code className="bg-amber-100 px-1 rounded">.env.example</code>의 변수들을 채워 주세요.
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 p-4 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 text-green-800 p-4 text-sm">
          저장되었습니다.
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">행 수</label>
            <input
              type="number"
              min={1}
              max={20}
              value={rows}
              onChange={(e) => setRows(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">열 수</label>
            <input
              type="number"
              min={1}
              max={20}
              value={cols}
              onChange={(e) => setCols(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2 rounded-lg bg-slate-800 text-white font-medium hover:bg-slate-700 disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
