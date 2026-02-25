'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  subscribeStudents,
  subscribeClassSettings,
  getClassSettings,
  setClassSettings,
  setStudentSeated,
} from '@/lib/db';
import type { Student, TeacherSettings } from '@/lib/types';

export default function AdminDashboardPage() {
  const params = useParams();
  const classId = (params?.classId as string) ?? 'default';
  const [students, setStudents] = useState<Student[]>([]);
  const [settings, setSettings] = useState<TeacherSettings | null>(null);

  useEffect(() => {
    getClassSettings(classId).then((s) => {
      if (s) setSettings(s);
      else {
        setClassSettings(classId, { rows: 4, cols: 6 }).then(() =>
          getClassSettings(classId).then(setSettings)
        );
      }
    });
  }, [classId]);

  useEffect(() => {
    const unsub = subscribeClassSettings(classId, setSettings);
    return () => unsub();
  }, [classId]);

  useEffect(() => {
    const unsub = subscribeStudents(classId, setStudents);
    return () => unsub();
  }, [classId]);

  const rows = settings?.rows ?? 4;
  const cols = settings?.cols ?? 6;
  const seatedCount = students.filter((s) => s.seated).length;
  const ranking = students
    .filter((s) => s.quizTimeSeconds != null)
    .sort((a, b) => (a.quizTimeSeconds ?? 0) - (b.quizTimeSeconds ?? 0))
    .slice(0, 10);

  const getStudentAt = (row: number, col: number) =>
    students.find((s) => s.seat.row === row && s.seat.col === col);

  const handleUnseat = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    setStudentSeated(classId, student.id, false);
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-800">실시간 대시보드</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-800 mb-3">좌석 현황판</h2>
          <p className="text-sm text-slate-500 mb-3">
            연두색 = 착석 완료 · {seatedCount} / {students.length}명 · 녹색 칸에 마우스를 올린 뒤 ✕를 누르면 착석 해제
          </p>
          <div className="flex flex-col">
            <div className="flex gap-2">
              <div
                className="flex flex-col justify-between w-12 shrink-0 text-center text-slate-500 text-xs font-medium border-2 border-slate-200 rounded-xl bg-slate-50 py-2"
                style={{ minHeight: `${rows * 5 + 0.5}rem` }}
              >
                <span>🚪 문</span>
                <span>🚪 문</span>
              </div>
              <div className="flex flex-col">
              <div
                className="inline-grid gap-2"
                style={{
                  gridTemplateColumns: `repeat(${cols}, minmax(4rem, 5rem))`,
                  gridTemplateRows: `repeat(${rows}, minmax(4rem, 5rem))`,
                }}
              >
                {Array.from({ length: rows * cols }, (_, i) => {
                  const row = Math.floor(i / cols);
                  const col = i % cols;
                  const student = getStudentAt(row, col);
                  const seated = student?.seated ?? false;
                  return (
                    <div
                      key={i}
                      className={`relative min-w-[4rem] min-h-[4rem] w-20 h-20 rounded-xl flex items-center justify-center text-sm font-medium border-2 group ${
                        seated
                          ? 'bg-seat-seated border-green-400 text-slate-800'
                          : 'bg-seat-empty border-slate-200 text-slate-500'
                      }`}
                      title={student ? `${student.name} (${student.studentId})` : '빈 자리'}
                    >
                      {student?.name ?? '-'}
                      {seated && student && (
                        <button
                          type="button"
                          onClick={(e) => handleUnseat(e, student)}
                          className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xl font-bold hover:bg-red-500/80"
                          title="착석 해제"
                          aria-label="착석 해제"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="text-center py-2.5 mt-2 rounded-xl bg-amber-100 border border-amber-200 text-amber-800 text-sm font-medium">
                🪑 교탁
              </div>
            </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-800 mb-1">퀴즈 랭킹</h2>
          <p className="text-sm text-slate-500 mb-4">완료한 학생 기준 · 빠른 순 (학생 화면에도 노출)</p>
          <div className="space-y-3">
            {ranking.length === 0 ? (
              <div className="rounded-xl bg-slate-50 border border-slate-200 py-8 text-center text-slate-500">
                아직 완료한 학생이 없습니다.
              </div>
            ) : (
              ranking.map((s, i) => {
                const rank = i + 1;
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
                const timeStr = `${Math.floor((s.quizTimeSeconds ?? 0) / 60)}분 ${(s.quizTimeSeconds ?? 0) % 60}초`;
                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-3 rounded-xl border-2 p-3 transition transform hover:scale-[1.02] ${
                      rank === 1
                        ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300 shadow-md'
                        : rank === 2
                          ? 'bg-gradient-to-r from-slate-50 to-gray-100 border-slate-300'
                          : rank === 3
                            ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200'
                            : 'bg-slate-50/80 border-slate-200'
                    }`}
                  >
                    <span className="w-8 text-center text-lg font-bold shrink-0">
                      {medal ?? `#${rank}`}
                    </span>
                    <span className="flex-1 font-medium text-slate-800 truncate">{s.name}</span>
                    <span className="text-sm font-semibold text-slate-600 shrink-0 tabular-nums">{timeStr}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <Link
          href={`/admin/${classId}/qr`}
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500"
        >
          QR 코드 / 링크 보기
        </Link>
      </div>
    </div>
  );
}
