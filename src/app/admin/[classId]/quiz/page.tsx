'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  getQuizzes,
  addQuiz,
  updateQuiz,
  deleteQuiz,
  subscribeClassSettings,
} from '@/lib/db';
import type { QuizItem } from '@/lib/types';

export default function AdminQuizPage() {
  const params = useParams();
  const classId = (params?.classId as string) ?? 'default';
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [hint, setHint] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => getQuizzes(classId).then(setQuizzes);

  useEffect(() => {
    load();
  }, [classId]);

  const handleAdd = async () => {
    if (!question.trim() || !answer.trim()) return;
    setSaving(true);
    try {
      await addQuiz(classId, {
        order: quizzes.length,
        question: question.trim(),
        answer: answer.trim(),
        hint: hint.trim(),
      });
      setQuestion('');
      setAnswer('');
      setHint('');
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 문항을 삭제할까요?')) return;
    await deleteQuiz(classId, id);
    await load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">퀴즈 생성</h1>
      <p className="text-slate-600">담임 선생님에 대한 퀴즈 문항을 추가하세요. 정답·오답 시 힌트를 설정할 수 있습니다.</p>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-800 mb-3">새 문항 추가</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-slate-600 mb-1">문제</label>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2"
              placeholder="선생님의 혈액형은?"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">정답</label>
            <input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2"
              placeholder="A형"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">힌트 (오답 시 표시)</label>
            <input
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2"
              placeholder="A, B, AB, O 중 하나예요."
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={saving}
            className="py-2 px-4 rounded-lg bg-slate-800 text-white font-medium hover:bg-slate-700 disabled:opacity-50"
          >
            추가
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-800 mb-3">등록된 퀴즈 ({quizzes.length}문항)</h2>
        <ul className="space-y-4">
          {quizzes.map((q, i) => (
            <li key={q.id} className="border-b border-slate-100 pb-3 last:border-0">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <span className="text-slate-500 text-sm">{i + 1}.</span>{' '}
                  <span className="font-medium">{q.question}</span>
                  <p className="text-sm text-slate-600 mt-1">정답: {q.answer}</p>
                  {q.hint && <p className="text-sm text-amber-700 mt-1">힌트: {q.hint}</p>}
                </div>
                <button
                  onClick={() => handleDelete(q.id)}
                  className="text-red-600 text-sm hover:underline"
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
