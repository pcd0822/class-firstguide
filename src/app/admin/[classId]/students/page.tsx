'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  getStudents,
  getClassSettings,
  upsertStudents,
  subscribeStudents,
  updateStudentSeat,
} from '@/lib/db';
import { isFirebaseConfigured } from '@/lib/firebase';
import type { Student, TeacherSettings } from '@/lib/types';

const UNASSIGNED = { row: -1, col: -1 };

function isUnassigned(seat: { row: number; col: number }) {
  return seat.row < 0 || seat.col < 0;
}

function parseCSV(text: string): { name: string; studentId: string; row: number; col: number }[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const result: { name: string; studentId: string; row: number; col: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split(',').map((p) => p.trim());
    const name = parts[0] ?? '';
    const studentId = parts[1] ?? String(i + 1);
    const row = parts[2] !== undefined && parts[2] !== '' ? parseInt(parts[2], 10) : -1;
    const col = parts[3] !== undefined && parts[3] !== '' ? parseInt(parts[3], 10) : -1;
    if (name) result.push({ name, studentId, row: isNaN(row) ? -1 : row, col: isNaN(col) ? -1 : col });
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
  const [csvText, setCsvText] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [draggingStudent, setDraggingStudent] = useState<Student | null>(null);
  const [dragOverSeat, setDragOverSeat] = useState<{ row: number; col: number } | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    getClassSettings(classId).then(setSettings);
  }, [classId]);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    const unsub = subscribeStudents(classId, setStudents);
    return () => unsub();
  }, [classId]);

  const rows = settings?.rows ?? 4;
  const cols = settings?.cols ?? 6;
  const unassignedStudents = students.filter((s: Student) => isUnassigned(s.seat));
  const getStudentAt = useCallback(
    (row: number, col: number) =>
      students.find((s: Student) => s.seat.row === row && s.seat.col === col),
    [students]
  );

  const handleAddOnly = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const newId = studentId.trim() || `s${Date.now()}`;
      const existing = students.find((s: Student) => s.studentId === newId);
      const list: Student[] = existing
        ? students.map((s: Student) =>
            s.id === existing.id
              ? { ...s, name: name.trim(), seat: UNASSIGNED }
              : s
          )
        : [
            ...students,
            {
              id: newId,
              name: name.trim(),
              studentId: newId,
              seat: UNASSIGNED,
              seated: false,
              quizTimeSeconds: null,
            },
          ];
      await upsertStudents(
        classId,
        list.map((s) => ({
          id: s.id,
          name: s.name,
          studentId: s.studentId,
          seat: s.seat,
          seated: s.seated,
          quizTimeSeconds: s.quizTimeSeconds,
        }))
      );
      setName('');
      setStudentId('');
      setMessage('추가되었습니다. 미배정 목록에서 좌석으로 드래그하세요.');
    } catch (e) {
      setMessage('저장 실패: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  };

  const handleCsvUpload = async () => {
    const parsed = parseCSV(csvText);
    if (parsed.length === 0) {
      setMessage('CSV 형식: 이름,학번[,행,열]. 행/열 생략 시 미배정.');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const existing = await getStudents(classId);
      const byKey = new Map(existing.map((s) => [s.studentId, s]));
      for (const p of parsed) {
        const row = p.row >= 0 ? p.row : -1;
        const col = p.col >= 0 ? p.col : -1;
        byKey.set(p.studentId, {
          id: byKey.get(p.studentId)?.id ?? p.studentId,
          name: p.name,
          studentId: p.studentId,
          seat: { row, col },
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

  const handleDropOnSeat = async (row: number, col: number) => {
    if (!draggingStudent) return;
    setDragOverSeat(null);
    setDraggingStudent(null);
    const previous = getStudentAt(row, col);
    setSaving(true);
    setMessage(null);
    try {
      await updateStudentSeat(classId, draggingStudent.id, { row, col });
      if (previous && previous.id !== draggingStudent.id) {
        await updateStudentSeat(classId, previous.id, UNASSIGNED);
      }
      setMessage(`${draggingStudent.name} → ${row + 1}행 ${col + 1}열`);
    } catch (e) {
      setMessage('자리 저장 실패: ' + (e instanceof Error ? e.message : String(e)));
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
        <h2 className="font-semibold text-slate-800 mb-3">학생 등록</h2>
        <p className="text-sm text-slate-500 mb-3">
          이름과 학번만 입력한 뒤 추가하면, 아래 미배정 목록에 뜹니다. 해당 이름을 좌석 그리드로 드래그해서 배치하세요.
        </p>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-sm text-slate-600 mb-1">이름</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-40 rounded border border-slate-300 px-3 py-2"
              placeholder="홍길동"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">학번</label>
            <input
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-24 rounded border border-slate-300 px-3 py-2"
              placeholder="1"
            />
          </div>
          <button
            onClick={handleAddOnly}
            disabled={saving}
            className="py-2 px-4 rounded-lg bg-slate-800 text-white font-medium hover:bg-slate-700 disabled:opacity-50"
          >
            추가
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-800 mb-3">CSV 붙여넣기</h2>
        <p className="text-sm text-slate-500 mb-2">
          형식: 이름, 학번 [, 행, 열]. 행·열을 넣으면 해당 자리에 배정되고, 생략하면 미배정입니다.
        </p>
        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          rows={4}
          className="w-full rounded border border-slate-300 px-3 py-2 font-mono text-sm"
          placeholder="홍길동,1&#10;김철수,2,0,1"
        />
        <button
          onClick={handleCsvUpload}
          disabled={saving}
          className="mt-2 py-2 px-4 rounded-lg bg-slate-800 text-white font-medium hover:bg-slate-700 disabled:opacity-50"
        >
          반영
        </button>
      </div>

      <div className="grid lg:grid-cols-[auto_1fr] gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-800 mb-3">미배정 학생</h2>
          <p className="text-sm text-slate-500 mb-3">아래 이름을 좌석 그리드로 드래그하세요.</p>
          <ul className="space-y-2 min-w-[10rem]">
            {unassignedStudents.length === 0 ? (
              <li className="text-slate-400 text-sm">없음</li>
            ) : (
              unassignedStudents.map((s: Student) => (
                <li
                  key={s.id}
                  draggable
                  onDragStart={(e) => {
                    setDraggingStudent(s);
                    e.dataTransfer.setData('text/plain', s.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnd={() => setDraggingStudent(null)}
                  className="px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 cursor-grab active:cursor-grabbing hover:bg-slate-200 text-sm font-medium"
                >
                  {s.name} <span className="text-slate-500">({s.studentId})</span>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-x-auto">
          <h2 className="font-semibold text-slate-800 mb-3">좌석 배치 (드래그 앤 드롭)</h2>
          <p className="text-sm text-slate-500 mb-4">
            {rows}행 × {cols}열. 미배정 학생을 자리 칸에 놓으면 배정됩니다. 왼쪽 문, 아래쪽 교탁 기준으로 배치됩니다.
          </p>
          <div className="flex gap-2">
            <div
              className="flex flex-col justify-between w-12 shrink-0 text-center text-slate-500 text-xs font-medium border-2 border-slate-200 rounded-xl bg-slate-50 py-2"
              style={{ minHeight: `${rows * 5 + 4 + 0.5}rem` }}
            >
              <span>🚪 문</span>
              <span>🚪 문</span>
            </div>
            <div className="flex flex-col gap-2">
              {Array.from({ length: rows }, (_, i) => (
                <div
                  key={i}
                  className="grid gap-2"
                  style={{ gridTemplateColumns: `repeat(${cols}, minmax(4.5rem, 5rem))` }}
                >
                  {Array.from({ length: cols }, (_, col) => {
                    const student = getStudentAt(i, col);
                    const isOver = dragOverSeat?.row === i && dragOverSeat?.col === col;
                      return (
                        <div
                          key={col}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            setDragOverSeat({ row: i, col });
                          }}
                          onDragLeave={() => setDragOverSeat((prev: { row: number; col: number } | null) => (prev?.row === i && prev?.col === col ? null : prev))}
                          onDrop={(e) => {
                            e.preventDefault();
                            handleDropOnSeat(i, col);
                          }}
                          className={`min-w-[4.5rem] min-h-[4.5rem] w-20 h-20 rounded-xl border-2 flex items-center justify-center text-sm font-medium transition-colors ${
                            isOver ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          {student ? (
                            <span
                              draggable
                              onDragStart={(e) => {
                                setDraggingStudent(student);
                                e.dataTransfer.setData('text/plain', student.id);
                                e.dataTransfer.effectAllowed = 'move';
                              }}
                              onDragEnd={() => setDraggingStudent(null)}
                              className="text-slate-800 truncate px-1 cursor-grab active:cursor-grabbing w-full text-center"
                              title={`${student.name} (${student.studentId}) — 드래그하여 이동`}
                            >
                              {student.name}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">{i + 1}-{col + 1}</span>
                          )}
                        </div>
                      );
                    })}
                </div>
              ))}
              <div className="text-center py-2.5 rounded-xl bg-amber-100 border border-amber-200 text-amber-800 text-sm font-medium">
                🪑 교탁
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
