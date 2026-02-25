'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function AdminQRPage() {
  const params = useParams();
  const classId = (params?.classId as string) ?? 'default';
  const [studentUrl, setStudentUrl] = useState('');

  useEffect(() => {
    setStudentUrl(`${window.location.origin}/s/${classId}`);
  }, [classId]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">학생 접속 링크 & QR 코드</h1>
      <p className="text-slate-600">
        칠판에 이 QR 코드를 띄우거나 링크를 공유하세요. 학생이 스캔/접속 후 이름을 입력해 자리를 찾습니다.
      </p>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center gap-6">
        <div className="p-4 bg-white rounded-xl border border-slate-200">
          {studentUrl ? (
            <QRCodeSVG value={studentUrl} size={256} level="M" includeMargin />
          ) : (
            <div className="w-64 h-64 flex items-center justify-center text-slate-400">로딩 중...</div>
          )}
        </div>
        <div className="w-full max-w-md">
          <label className="block text-sm text-slate-600 mb-1">접속 URL</label>
          <input
            readOnly
            value={studentUrl}
            className="w-full rounded border border-slate-300 px-3 py-2 bg-slate-50 text-slate-700"
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(studentUrl);
              alert('복사되었습니다.');
            }}
            className="mt-2 py-2 px-4 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-700"
          >
            URL 복사
          </button>
        </div>
      </div>
    </div>
  );
}
