export type SeatCoord = { row: number; col: number };

export interface Student {
  id: string;
  name: string;
  studentId: string;
  seat: SeatCoord;
  seated: boolean;
  quizTimeSeconds: number | null;
}

export interface QuizItem {
  id: string;
  order: number;
  question: string;
  answer: string;
  hint: string;
}

export type ImageKeys = 'initial' | 'correct' | 'wrong1' | 'wrong2' | 'finalSuccess';

export interface TeacherSettings {
  id: string;
  rows: number;
  cols: number;
  images: {
    initial: string;
    correct: string;
    wrong1: string;
    wrong2: string;
    finalSuccess: string;
  };
}

export const IMAGE_KEYS: ImageKeys[] = ['initial', 'correct', 'wrong1', 'wrong2', 'finalSuccess'];

export const IMAGE_LABELS: Record<ImageKeys, string> = {
  initial: '초기 화면 이미지',
  correct: '정답 이미지',
  wrong1: '1차 오답 이미지',
  wrong2: '2차 오답 이미지',
  finalSuccess: '최종 성공 이미지',
};
