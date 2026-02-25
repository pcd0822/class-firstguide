'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  subscribeStudents,
  subscribeClassSettings,
  getClassSettings,
  setClassSettings,
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

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-800">실시간 대시보드</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-800 mb-3">좌석 현황판</h2>
          <p className="text-sm text-slate-500 mb-3">
            연두색 = 착석 완료 · {seatedCount} / {students.length}명
          </p>
          <div
            className="inline-grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(2rem, 1fr))`,
              gridTemplateRows: `repeat(${rows}, minmax(2rem, 1fr))`,
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
                  className={`w-10 h-10 rounded flex items-center justify-center text-xs font-medium border ${
                    seated
                      ? 'bg-seat-seated border-green-400 text-slate-800'
                      : 'bg-seat-empty border-slate-200 text-slate-500'
                  }`}
                  title={student ? `${student.name} (${student.studentId})` : '빈 자리'}
                >
                  {student?.name?.slice(0, 1) ?? '-'}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-800 mb-3">퀴즈 랭킹</h2>
          <p className="text-sm text-slate-500 mb-3">완료한 학생 기준 (빠른 순)</p>
          <ol className="space-y-2">
            {ranking.length === 0 ? (
              <li className="text-slate-500 text-sm">아직 완료한 학생이 없습니다.</li>
            ) : (
              ranking.map((s, i) => (
                <li key={s.id} className="flex justify-between text-sm">
                  <span>
                    {i + 1}. {s.name}
                  </span>
                  <span className="text-slate-600">
                    {Math.floor((s.quizTimeSeconds ?? 0) / 60)}분 {(s.quizTimeSeconds ?? 0) % 60}초
                  </span>
                </li>
              ))
            )}
          </ol>
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
