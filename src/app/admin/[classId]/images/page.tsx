'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  getClassSettings,
  setClassSettings,
  subscribeClassSettings,
} from '@/lib/db';
import type { TeacherSettings, ImageKeys } from '@/lib/types';
import { IMAGE_KEYS } from '@/lib/types';
import ImageUploadCard from '@/components/ImageUploadCard';

export default function AdminImagesPage() {
  const params = useParams();
  const classId = (params?.classId as string) ?? 'default';
  const [settings, setSettings] = useState<TeacherSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeClassSettings(classId, (next) => {
      setSettings(next);
      setLoading(false);
    });
    return () => unsub();
  }, [classId]);

  useEffect(() => {
    if (settings === null && !loading) {
      getClassSettings(classId).then((s) => {
        if (s) setSettings(s);
        else
          setSettings({
            id: classId,
            rows: 4,
            cols: 6,
            images: {
              initial: '',
              correct: '',
              wrong1: '',
              wrong2: '',
              finalSuccess: '',
            },
          });
        setLoading(false);
      });
    }
  }, [classId, settings, loading]);

  const handleUploaded = (key: ImageKeys, url: string) => {
    setClassSettings(classId, {
      images: { [key]: url },
    });
  };

  if (loading && !settings) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-500">로딩 중...</div>
      </div>
    );
  }

  const images = settings?.images ?? {
    initial: '',
    correct: '',
    wrong1: '',
    wrong2: '',
    finalSuccess: '',
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">상황별 이미지 관리</h1>
      <p className="text-slate-600">
        학생 화면에 표시될 캐릭터/사진을 업로드하세요. 업로드 상태와 미리보기가 표시됩니다.
      </p>
      <div className="grid gap-4">
        {IMAGE_KEYS.map((key) => (
          <ImageUploadCard
            key={key}
            classId={classId}
            imageKey={key}
            currentUrl={images[key] || null}
            onUploaded={(url) => handleUploaded(key, url)}
          />
        ))}
      </div>
    </div>
  );
}
