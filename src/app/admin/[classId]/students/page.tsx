'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  getStudents,
  getClassSettings,
  upsertStudents,
  subscribeStudents,
} from '@/lib/db';
import type { Student, TeacherSettings } from '@/lib/types';

function parseCSV(text: string): { name: string; studentId: string; row: number; col: number }[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const result: { name: string; studentId: string; row: number; col: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split(',').map((p) => p.trim());
    const name = parts[0] ?? '';
    const studentId = parts[1] ?? String(i + 1);
    const row = parseInt(parts[2] ?? '0', 10) || 0;
    const col = parseInt(parts[3] ?? '0', 10) || 0;
    if (name) result.push({ name, studentId, row, col });
  }
  return result;
}

export default function AdminStudentsPage() {
  const params = useParams();
  const classId = (params?.classId as string) ?? 'default';
  const [students, setStudents] = useState<Student[]>([]);
  const [settings, setSettings] = useState<TeacherSettings | null>(null);
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [row, setRow] = useState(0);
  const [col, setCol] = useState(0);
  const [csvText, setCsvText] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getClassSettings(classId).then(setSettings);
  }, [classId]);

  useEffect(() => {
    const unsub = subscribeStudents(classId, setStudents);
    return () => unsub();
  }, [classId]);

  const rows = settings?.rows ?? 4;
  const cols = settings?.cols ?? 6;

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const list = [
        ...students.filter((s) => s.studentId !== studentId),
        {
          name: name.trim(),
          studentId: studentId.trim() || `s${Date.now()}`,
          seat: { row, col },
          seated: false,
          quizTimeSeconds: null,
        },
      ];
      await upsertStudents(
        classId,
        list.map((s) => ({
          id: (s as Student).id,
          name: s.name,
          studentId: s.studentId,
          seat: s.seat,
          seated: s.seated,
          quizTimeSeconds: s.quizTimeSeconds,
        }))
      );
      setName('');
      setStudentId('');
      setRow(0);
      setCol(0);
      setMessage('추가되었습니다.');
    } catch (e) {
      setMessage('저장 실패: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  };

  const handleCsvUpload = async () => {
    const parsed = parseCSV(csvText);
    if (parsed.length === 0) {
      setMessage('CSV 형식: 이름,학번,행,열 (한 줄에 한 명)');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const existing = await getStudents(classId);
      const byKey = new Map(existing.map((s) => [s.studentId, s]));
      for (const p of parsed) {
        byKey.set(p.studentId, {
          id: byKey.get(p.studentId)?.id ?? p.studentId,
          name: p.name,
          studentId: p.studentId,
          seat: { row: p.row, col: p.col },
          seated: byKey.get(p.studentId)?.seated ?? false,
          quizTimeSeconds: byKey.get(p.studentId)?.quizTimeSeconds ?? null,
        });
      }
      await upsertStudents(
        classId,
        Array.from(byKey.values()).map((s) => ({
          id: s.id,
          name: s.name,
          studentId: s.studentId,
          seat: s.seat,
          seated: s.seated,
          quizTimeSeconds: s.quizTimeSeconds,
        }))
      );
      setCsvText('');
      setMessage(`${parsed.length}명 반영되었습니다.`);
    } catch (e) {
      setMessage('업로드 실패: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">학생 및 자리 매핑</h1>

      {message && (
        <div className="p-3 rounded-lg bg-slate-100 text-slate-700 text-sm">{message}</div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-800 mb-3">한 명씩 추가</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-sm text-slate-600 mb-1">이름</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2"
              placeholder="홍길동"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">학번</label>
            <input
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2"
              placeholder="1"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">행 (0~{rows - 1})</label>
            <input
              type="number"
              min={0}
              max={rows - 1}
              value={row}
              onChange={(e) => setRow(Number(e.target.value))}
              className="w-full rounded border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">열 (0~{cols - 1})</label>
            <input
              type="number"
              min={0}
              max={cols - 1}
              value={col}
              onChange={(e) => setCol(Number(e.target.value))}
              className="w-full rounded border border-slate-300 px-3 py-2"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={saving}
            className="py-2 rounded-lg bg-slate-800 text-white font-medium hover:bg-slate-700 disabled:opacity-50"
          >
            추가
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-800 mb-3">CSV / 엑셀 붙여넣기</h2>
        <p className="text-sm text-slate-500 mb-2">
          형식: 이름, 학번, 행, 열 (한 줄에 한 명). 예: 홍길동,1,0,0
        </p>
        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          rows={6}
          className="w-full rounded border border-slate-300 px-3 py-2 font-mono text-sm"
          placeholder="홍길동,1,0,0&#10;김철수,2,0,1"
        />
        <button
          onClick={handleCsvUpload}
          disabled={saving}
          className="mt-2 py-2 px-4 rounded-lg bg-slate-800 text-white font-medium hover:bg-slate-700 disabled:opacity-50"
        >
          반영
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-800 mb-3">등록된 학생 ({students.length}명)</h2>
        <ul className="space-y-1 text-sm">
          {students.map((s) => (
            <li key={s.id}>
              {s.name} · 학번 {s.studentId} · 자리 ({s.seat.row}, {s.seat.col})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
