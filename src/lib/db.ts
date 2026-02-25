import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { getDb } from './firebase';
import type { Student, QuizItem, TeacherSettings, ImageKeys } from './types';
import { IMAGE_KEYS } from './types';

const defaultImages: TeacherSettings['images'] = {
  initial: '',
  correct: '',
  wrong1: '',
  wrong2: '',
  finalSuccess: '',
};

export function classRef(classId: string) {
  return doc(getDb(), 'classes', classId);
}

export function studentsRef(classId: string) {
  return collection(getDb(), 'classes', classId, 'students');
}

export function quizzesRef(classId: string) {
  return collection(getDb(), 'classes', classId, 'quizzes');
}

export async function getClassSettings(classId: string): Promise<TeacherSettings | null> {
  const snap = await getDoc(classRef(classId));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    id: snap.id,
    rows: d?.rows ?? 4,
    cols: d?.cols ?? 6,
    images: { ...defaultImages, ...d?.images },
  };
}

export async function setClassSettings(
  classId: string,
  data: { rows?: number; cols?: number; images?: Partial<TeacherSettings['images']> }
) {
  const ref = classRef(classId);
  const existing = await getDoc(ref);
  const payload: Record<string, unknown> = {
    rows: data.rows ?? 4,
    cols: data.cols ?? 6,
    updatedAt: Timestamp.now(),
  };
  if (data.images) {
    const current = (existing.data()?.images as TeacherSettings['images']) ?? defaultImages;
    payload.images = { ...current, ...data.images };
  } else if (existing.exists()) {
    payload.images = existing.data()?.images ?? defaultImages;
  } else {
    payload.images = defaultImages;
  }
  await setDoc(ref, payload, { merge: true });
}

export async function getStudents(classId: string): Promise<Student[]> {
  const snap = await getDocs(studentsRef(classId));
  return snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      name: x.name ?? '',
      studentId: x.studentId ?? '',
      seat: x.seat ?? { row: 0, col: 0 },
      seated: x.seated ?? false,
      quizTimeSeconds: x.quizTimeSeconds ?? null,
    };
  });
}

export function subscribeStudents(
  classId: string,
  onUpdate: (students: Student[]) => void
) {
  return onSnapshot(studentsRef(classId), (snap) => {
    const students = snap.docs.map((d) => {
      const x = d.data();
      return {
        id: d.id,
        name: x.name ?? '',
        studentId: x.studentId ?? '',
        seat: x.seat ?? { row: 0, col: 0 },
        seated: x.seated ?? false,
        quizTimeSeconds: x.quizTimeSeconds ?? null,
      };
    });
    onUpdate(students);
  });
}

export async function setStudentSeated(classId: string, studentId: string, seated: boolean) {
  const ref = doc(getDb(), 'classes', classId, 'students', studentId);
  await updateDoc(ref, { seated });
}

export async function setStudentQuizTime(classId: string, studentId: string, seconds: number) {
  const ref = doc(getDb(), 'classes', classId, 'students', studentId);
  await updateDoc(ref, { quizTimeSeconds: seconds });
}

/** 퀴즈 랭킹 초기화: 모든 학생의 퀴즈 소요 시간을 null로 설정 */
export async function resetQuizRanking(classId: string) {
  const students = await getStudents(classId);
  const batch = writeBatch(getDb());
  for (const s of students) {
    const ref = doc(getDb(), 'classes', classId, 'students', s.id);
    batch.update(ref, { quizTimeSeconds: null });
  }
  await batch.commit();
}

/** 학생 한 명의 자리만 변경 (드래그 앤 드롭 배치용) */
export async function updateStudentSeat(
  classId: string,
  studentDocId: string,
  seat: { row: number; col: number }
) {
  const ref = doc(getDb(), 'classes', classId, 'students', studentDocId);
  await updateDoc(ref, { seat });
}

export async function upsertStudents(
  classId: string,
  students: (Omit<Student, 'id'> & { id?: string })[]
) {
  const ref = studentsRef(classId);
  const batch = writeBatch(getDb());
  for (const s of students) {
    const id = ('id' in s && s.id) || s.studentId || doc(ref).id;
    const docRef = doc(getDb(), 'classes', classId, 'students', id);
    batch.set(docRef, {
      name: s.name,
      studentId: s.studentId,
      seat: s.seat,
      seated: s.seated ?? false,
      quizTimeSeconds: s.quizTimeSeconds ?? null,
    });
  }
  await batch.commit();
}

export async function addStudent(classId: string, student: Omit<Student, 'id'>) {
  const ref = await addDoc(studentsRef(classId), {
    name: student.name,
    studentId: student.studentId,
    seat: student.seat,
    seated: student.seated ?? false,
    quizTimeSeconds: student.quizTimeSeconds ?? null,
  });
  return ref.id;
}

export async function getQuizzes(classId: string): Promise<QuizItem[]> {
  const q = query(quizzesRef(classId), orderBy('order', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      order: x.order ?? 0,
      question: x.question ?? '',
      answer: x.answer ?? '',
      hint: x.hint ?? '',
    };
  });
}

export async function addQuiz(classId: string, item: Omit<QuizItem, 'id'>) {
  const ref = await addDoc(quizzesRef(classId), {
    order: item.order,
    question: item.question,
    answer: item.answer,
    hint: item.hint,
  });
  return ref.id;
}

export async function updateQuiz(
  classId: string,
  quizId: string,
  data: Partial<Omit<QuizItem, 'id'>>
) {
  await updateDoc(doc(getDb(), 'classes', classId, 'quizzes', quizId), data as Record<string, unknown>);
}

export async function deleteQuiz(classId: string, quizId: string) {
  await deleteDoc(doc(getDb(), 'classes', classId, 'quizzes', quizId));
}

export async function findStudentByName(classId: string, name: string): Promise<Student | null> {
  const students = await getStudents(classId);
  const normalized = name.trim().toLowerCase();
  return students.find((s) => s.name.trim().toLowerCase() === normalized) ?? null;
}

export function subscribeClassSettings(
  classId: string,
  onUpdate: (settings: TeacherSettings | null) => void
) {
  return onSnapshot(classRef(classId), (snap) => {
    if (!snap.exists()) {
      onUpdate(null);
      return;
    }
    const d = snap.data();
    onUpdate({
      id: snap.id,
      rows: d?.rows ?? 4,
      cols: d?.cols ?? 6,
      images: { ...defaultImages, ...d?.images },
    });
  });
}

export { defaultImages, IMAGE_KEYS };
