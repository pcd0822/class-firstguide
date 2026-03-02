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

/** 입학식 일정 테이블 한 행 (시간, 일정, 비고) */
export interface ScheduleTableRow {
  time: string;
  schedule: string;
  note: string;
}

/** 클래스 공지사항 (입학식 일정 등) */
export interface ClassAnnouncement {
  /** 공지 문구 (선택) */
  noticeText: string;
  /** 일정 테이블 - 첫 행은 헤더(시간/일정/비고), 이후 데이터 행 */
  tableRows: ScheduleTableRow[];
}

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
  /** 공지사항·입학식 일정 (선택) */
  announcement?: ClassAnnouncement | null;
}

export const IMAGE_KEYS: ImageKeys[] = ['initial', 'correct', 'wrong1', 'wrong2', 'finalSuccess'];

export const IMAGE_LABELS: Record<ImageKeys, string> = {
  initial: '초기 화면 이미지',
  correct: '정답 이미지',
  wrong1: '1차 오답 이미지',
  wrong2: '2차 오답 이미지',
  finalSuccess: '최종 성공 이미지',
};
