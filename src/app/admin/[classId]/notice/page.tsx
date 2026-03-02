'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getClassSettings, setAnnouncement } from '@/lib/db';
import type { ClassAnnouncement, ScheduleTableRow } from '@/lib/types';

const defaultRow = (): ScheduleTableRow => ({
  time: '',
  schedule: '',
  note: '',
});

export default function AdminNoticePage() {
  const params = useParams();
  const classId = (params?.classId as string) ?? 'default';
  const [noticeText, setNoticeText] = useState('');
  const [tableRows, setTableRows] = useState<ScheduleTableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getClassSettings(classId).then((s) => {
      const ann = s?.announcement;
      setNoticeText(ann?.noticeText ?? '');
      setTableRows(Array.isArray(ann?.tableRows) && ann.tableRows.length > 0 ? ann.tableRows : [defaultRow()]);
      setLoading(false);
    });
  }, [classId]);

  const addRow = () => setTableRows((prev) => [...prev, defaultRow()]);
  const removeRow = (index: number) => {
    setTableRows((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length === 0 ? [defaultRow()] : next;
    });
  };
  const updateRow = (index: number, field: keyof ScheduleTableRow, value: string) => {
    setTableRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await setAnnouncement(classId, {
        noticeText: noticeText.trim(),
        tableRows: tableRows.filter((r) => r.time.trim() || r.schedule.trim() || r.note.trim()),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">공지사항 · 입학식 일정</h1>
      <p className="text-slate-600">
        퀴즈를 모두 완료한 학생에게 보여줄 공지 문구와 입학식 일정 표를 작성하세요. 일정은 시간·일정·비고 열로 구성됩니다.
      </p>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-800 mb-3">공지 문구</h2>
        <textarea
          value={noticeText}
          onChange={(e) => setNoticeText(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 min-h-[100px] resize-y"
          placeholder="예: 아래 일정에 맞춰 입학식에 참석해 주세요."
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-800">입학식 일정 테이블</h2>
          <button
            type="button"
            onClick={addRow}
            className="text-sm px-3 py-1.5 rounded-lg bg-slate-700 text-white hover:bg-slate-600"
          >
            + 행 추가
          </button>
        </div>
        <p className="text-slate-500 text-sm mb-4">맨 위 행은 헤더(시간 / 일정 / 비고)로 고정되어 학생 화면에 표시됩니다.</p>
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="text-left py-2.5 px-3 text-slate-700 font-semibold w-[120px]">시간</th>
                <th className="text-left py-2.5 px-3 text-slate-700 font-semibold">일정</th>
                <th className="text-left py-2.5 px-3 text-slate-700 font-semibold w-[140px]">비고</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, index) => (
                <tr key={index} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="p-2">
                    <input
                      value={row.time}
                      onChange={(e) => updateRow(index, 'time', e.target.value)}
                      className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                      placeholder="09:00"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      value={row.schedule}
                      onChange={(e) => updateRow(index, 'schedule', e.target.value)}
                      className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                      placeholder="입학식 개회"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      value={row.note}
                      onChange={(e) => updateRow(index, 'note', e.target.value)}
                      className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                      placeholder="강당"
                    />
                  </td>
                  <td className="p-2">
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      className="text-slate-400 hover:text-red-600 p-1 rounded"
                      title="행 삭제"
                      aria-label="행 삭제"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-500 disabled:opacity-50"
        >
          {saving ? '저장 중…' : '저장하기'}
        </button>
        {saved && <span className="text-green-600 text-sm">저장되었습니다.</span>}
      </div>
    </div>
  );
}
