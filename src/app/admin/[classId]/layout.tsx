import Link from 'next/link';

export default async function AdminClassLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-800 text-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="font-semibold">
            첫날 가이드 · 관리자
          </Link>
          <nav className="flex gap-4 flex-wrap">
            <Link href={`/admin/${classId}`} className="text-slate-300 hover:text-white">
              대시보드
            </Link>
            <Link href={`/admin/${classId}/settings`} className="text-slate-300 hover:text-white">
              자리 설정
            </Link>
            <Link href={`/admin/${classId}/students`} className="text-slate-300 hover:text-white">
              학생
            </Link>
            <Link href={`/admin/${classId}/quiz`} className="text-slate-300 hover:text-white">
              퀴즈
            </Link>
            <Link href={`/admin/${classId}/images`} className="text-slate-300 hover:text-white">
              이미지
            </Link>
            <Link href={`/admin/${classId}/qr`} className="text-slate-300 hover:text-white">
              QR/링크
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-4">{children}</main>
    </div>
  );
}
