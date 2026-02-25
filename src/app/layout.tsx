import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '첫날 가이드 - 학급 아이스브레이킹',
  description: 'QR로 자리 찾기 & 담임 선생님 퀴즈',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
