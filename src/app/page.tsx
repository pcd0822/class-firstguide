import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-50 to-slate-100">
      <h1 className="text-3xl font-bold text-slate-800 mb-2">첫날 가이드</h1>
      <p className="text-slate-600 mb-8">학급 아이스브레이킹 · 자리 찾기 · 퀴즈</p>
      <div className="flex gap-4">
        <Link
          href="/admin"
          className="px-6 py-3 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700 transition"
        >
          교사 관리자
        </Link>
        <Link
          href="/join"
          className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-500 transition"
        >
          학생 접속 (링크 입력)
        </Link>
      </div>
    </main>
  );
}
