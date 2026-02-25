'use client';

import { useState, useRef } from 'react';
import type { ImageKeys } from '@/lib/types';
import { IMAGE_LABELS } from '@/lib/types';
import { uploadImage } from '@/lib/storage';

interface ImageUploadCardProps {
  classId: string;
  imageKey: ImageKeys;
  currentUrl: string | null;
  onUploaded: (url: string) => void;
}

export default function ImageUploadCard({
  classId,
  imageKey,
  currentUrl,
  onUploaded,
}: ImageUploadCardProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const label = IMAGE_LABELS[imageKey];

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드 가능합니다.');
      return;
    }
    setError(null);
    setUploading(true);
    setProgress(0);
    try {
      const url = await uploadImage(classId, imageKey, file, (pct) => setProgress(pct));
      onUploaded(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드 실패');
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <h3 className="font-medium text-slate-800 mb-3">{label}</h3>
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <div className="w-full sm:w-40 h-40 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
          {uploading ? (
            <div className="text-center p-2">
              <div className="text-sm text-slate-600 mb-1">업로드 중...</div>
              <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-xs text-slate-500 mt-1">{Math.round(progress)}%</div>
            </div>
          ) : currentUrl ? (
            <img
              src={currentUrl}
              alt={label}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-slate-400 text-sm">미리보기 없음</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            disabled={uploading}
            className="hidden"
            id={`upload-${imageKey}`}
          />
          <label
            htmlFor={`upload-${imageKey}`}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium cursor-pointer hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {currentUrl ? '다른 이미지로 변경' : '이미지 업로드'}
          </label>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
