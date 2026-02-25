'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function JoinPage() {
  const router = useRouter();
  const [classId, setClassId] = useState('default');

  const go = () => {
    const id = classId.trim() || 'default';
    router.push(`/s/${encodeURIComponent(id)}`);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
      <h1 className="text-xl font-bold text-slate-800 mb-4">학생 접속</h1>
      <p className="text-slate-600 text-sm mb-4">교사가 안내한 학급 코드를 입력하세요. (기본: default)</p>
      <input
        value={classId}
        onChange={(e) => setClassId(e.target.value)}
        placeholder="학급 코드"
        className="w-full max-w-xs rounded-lg border border-slate-300 px-4 py-3 mb-3"
      />
      <button
        onClick={go}
        className="w-full max-w-xs py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500"
      >
        들어가기
      </button>
    </main>
  );
}
