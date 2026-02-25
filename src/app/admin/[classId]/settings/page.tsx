'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getClassSettings, setClassSettings, subscribeClassSettings } from '@/lib/db';
import type { TeacherSettings } from '@/lib/types';

export default function AdminSettingsPage() {
  const params = useParams();
  const classId = (params?.classId as string) ?? 'default';
  const [settings, setSettings] = useState<TeacherSettings | null>(null);
  const [rows, setRows] = useState(4);
  const [cols, setCols] = useState(6);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
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
    getClassSettings(classId).then((s) => {
      if (s) {
        setSettings(s);
        setRows(s.rows);
        setCols(s.cols);
      }
    });
  }, [classId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setClassSettings(classId, { rows, cols });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">자리 배치 설정</h1>
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
