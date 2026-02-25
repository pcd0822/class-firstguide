'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  getClassSettings,
  subscribeClassSettings,
  findStudentByName,
  setStudentSeated,
  setStudentQuizTime,
  getQuizzes,
} from '@/lib/db';
import type { Student, TeacherSettings, QuizItem } from '@/lib/types';

type Step =
  | 'name'      // Step 1: 초기 이미지 + 이름 입력
  | 'seat'      // Step 2: 자리 표시
  | 'seated'    // Step 3: 착석 확인 버튼 누름 대기
  | 'wait'      // Step 4: 퀴즈 대기, 스타트 버튼
  | 'quiz'      // Step 5: 퀴즈 진행
  | 'result';  // Step 6: 최종 성공 + 소요 시간

export default function StudentFlowPage() {
  const params = useParams();
  const classId = (params?.classId as string) ?? 'default';
  const [step, setStep] = useState<Step>('name');
  const [settings, setSettings] = useState<TeacherSettings | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [student, setStudent] = useState<Student | null>(null);
  const [nameError, setNameError] = useState('');
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [answerInput, setAnswerInput] = useState('');
  const [wrongCount, setWrongCount] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong1' | 'wrong2' | null>(null);
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const [totalSeconds, setTotalSeconds] = useState<number | null>(null);

  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    getClassSettings(classId).then((s) => {
      setSettings(s ?? null);
      setSettingsLoaded(true);
    });
    const unsub = subscribeClassSettings(classId, setSettings);
    return () => unsub();
  }, [classId]);

  const images = settings?.images ?? {
    initial: '',
    correct: '',
    wrong1: '',
    wrong2: '',
    finalSuccess: '',
  };

  const handleNameSubmit = useCallback(async () => {
    const name = nameInput.trim();
    if (!name) {
      setNameError('이름을 입력하세요.');
      return;
    }
    setNameError('');
    const found = await findStudentByName(classId, name);
    if (!found) {
      setNameError('등록된 이름이 없습니다. 이름을 확인해 주세요.');
      return;
    }
    setStudent(found);
    setStep('seat');
  }, [classId, nameInput]);

  const handleSeated = useCallback(async () => {
    if (!student) return;
    await setStudentSeated(classId, student.id, true);
    setStep('wait');
  }, [classId, student]);

  const loadQuizzes = useCallback(() => {
    getQuizzes(classId).then((list) => {
      setQuizzes(list);
      setQuizIndex(0);
      setAnswerInput('');
      setWrongCount(0);
      setFeedback(null);
    });
  }, [classId]);

  const handleStartQuiz = useCallback(async () => {
    const list = await getQuizzes(classId);
    setQuizzes(list);
    setTimerStart(Date.now());
    setQuizIndex(0);
    setAnswerInput('');
    setWrongCount(0);
    setStep('quiz');
  }, [classId]);

  const currentQuiz = quizzes[quizIndex];
  const isLastQuiz = quizIndex >= quizzes.length - 1 && quizzes.length > 0;

  const handleAnswerSubmit = useCallback(async () => {
    if (!currentQuiz || !student) return;
    const submitted = answerInput.trim();
    if (!submitted) return;

    if (submitted === currentQuiz.answer) {
      setFeedback('correct');
      setTimeout(() => {
        setFeedback(null);
        setAnswerInput('');
        setWrongCount(0);
        if (isLastQuiz) {
          const end = Date.now();
          const seconds = timerStart ? Math.round((end - timerStart) / 1000) : 0;
          setTotalSeconds(seconds);
          setStudentQuizTime(classId, student.id, seconds);
          setStep('result');
        } else {
          setQuizIndex((i) => i + 1);
        }
      }, 1500);
      return;
    }

    const nextWrong = wrongCount + 1;
    setWrongCount(nextWrong);
    if (nextWrong === 1) setFeedback('wrong1');
    else setFeedback('wrong2');
    setAnswerInput('');
  }, [currentQuiz, student, answerInput, wrongCount, isLastQuiz, timerStart, classId]);

  const closeFeedback = () => setFeedback(null);

  if (!settingsLoaded) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
        <p className="text-slate-500">로딩 중...</p>
      </main>
    );
  }
  if (!settings) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
        <p className="text-slate-600">해당 학급이 설정되지 않았습니다. 교사에게 문의하세요.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 flex flex-col items-center p-4">
      {/* Step 1: 초기 이미지 + 이름 입력 */}
      {step === 'name' && (
        <div className="w-full max-w-md flex flex-col items-center">
          {images.initial ? (
            <div className="w-full rounded-2xl overflow-hidden shadow-lg mb-6 bg-white">
              <img
                src={images.initial}
                alt="환영"
                className="w-full aspect-square object-cover"
              />
            </div>
          ) : (
            <div className="w-full aspect-square rounded-2xl bg-slate-200 flex items-center justify-center text-slate-500 mb-6">
              환영합니다
            </div>
          )}
          <p className="text-slate-700 font-medium mb-2">이름을 입력하세요</p>
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
            placeholder="이름"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-lg mb-2"
          />
          {nameError && <p className="text-red-600 text-sm mb-2">{nameError}</p>}
          <button
            onClick={handleNameSubmit}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-500"
          >
            확인
          </button>
        </div>
      )}

      {/* Step 2 & 3: 자리 안내 + 착석 버튼 */}
      {(step === 'seat' || step === 'seated') && student && (
        <div className="w-full max-w-md flex flex-col items-center">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-full mb-4">
            <h2 className="text-xl font-bold text-slate-800 mb-2">자리 안내</h2>
            <p className="text-slate-600">학번: <strong>{student.studentId}</strong></p>
            <p className="text-slate-600">
              자리: <strong>{student.seat.row + 1}번째 줄, {student.seat.col + 1}번째</strong>
            </p>
          </div>
          <button
            onClick={handleSeated}
            className="w-full py-4 rounded-xl bg-emerald-500 text-white text-lg font-bold hover:bg-emerald-400 shadow-md"
          >
            자리에 앉았어요
          </button>
        </div>
      )}

      {/* Step 4: 퀴즈 대기 + 스타트 */}
      {step === 'wait' && (
        <div className="w-full max-w-md flex flex-col items-center">
          <div className="bg-white rounded-2xl shadow-lg p-8 w-full text-center">
            <h2 className="text-xl font-bold text-slate-800 mb-2">퀴즈 준비</h2>
            <p className="text-slate-600 mb-6">준비되면 아래 버튼을 눌러 시작하세요.</p>
            <button
              onClick={handleStartQuiz}
              className="w-full py-4 rounded-xl bg-amber-500 text-white text-lg font-bold hover:bg-amber-400"
            >
              스타트
            </button>
          </div>
        </div>
      )}

      {/* Step 5: 퀴즈 진행 */}
      {step === 'quiz' && (
        <div className="w-full max-w-md flex flex-col">
          {quizzes.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-slate-500">
              퀴즈 문항이 없습니다. 교사에게 문의하세요.
            </div>
          ) : currentQuiz ? (
            <>
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
                <p className="text-sm text-slate-500 mb-1">
                  {quizIndex + 1} / {quizzes.length}
                </p>
                <h2 className="text-lg font-bold text-slate-800 mb-4">{currentQuiz.question}</h2>
                <input
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAnswerSubmit()}
                  placeholder="정답 입력"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
                <button
                  onClick={handleAnswerSubmit}
                  className="w-full mt-3 py-3 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700"
                >
                  제출
                </button>
              </div>

              {/* 정답/오답 이미지 팝업 */}
              {feedback === 'correct' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeFeedback}>
                  <div className="bg-white rounded-2xl overflow-hidden shadow-xl max-w-sm w-full">
                    {images.correct ? (
                      <img src={images.correct} alt="정답" className="w-full aspect-square object-cover" />
                    ) : (
                      <div className="w-full aspect-square flex items-center justify-center text-2xl font-bold text-emerald-600">정답!</div>
                    )}
                  </div>
                </div>
              )}
              {feedback === 'wrong1' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeFeedback}>
                  <div className="bg-white rounded-2xl overflow-hidden shadow-xl max-w-sm w-full p-4">
                    {images.wrong1 && (
                      <img src={images.wrong1} alt="1차 오답" className="w-full rounded-xl mb-3 object-cover max-h-48" />
                    )}
                    <p className="text-amber-700 font-medium">힌트: {currentQuiz.hint || '다시 생각해 보세요.'}</p>
                    <p className="text-slate-500 text-sm mt-2">화면을 탭하면 닫기</p>
                  </div>
                </div>
              )}
              {feedback === 'wrong2' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeFeedback}>
                  <div className="bg-white rounded-2xl overflow-hidden shadow-xl max-w-sm w-full p-4">
                    {images.wrong2 && (
                      <img src={images.wrong2} alt="2차 오답" className="w-full rounded-xl mb-3 object-cover max-h-48" />
                    )}
                    <p className="text-amber-700 font-medium">힌트: {currentQuiz.hint || '다시 생각해 보세요.'}</p>
                    <p className="text-slate-500 text-sm mt-2">화면을 탭하면 닫기</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-2xl p-6 text-center text-slate-500">퀴즈를 불러오는 중...</div>
          )}
        </div>
      )}

      {/* Step 6: 최종 성공 */}
      {step === 'result' && (
        <div className="w-full max-w-md flex flex-col items-center">
          {images.finalSuccess ? (
            <div className="w-full rounded-2xl overflow-hidden shadow-xl mb-6">
              <img
                src={images.finalSuccess}
                alt="축하"
                className="w-full aspect-square object-cover"
              />
            </div>
          ) : (
            <div className="w-full aspect-square rounded-2xl bg-amber-100 flex items-center justify-center text-2xl font-bold text-amber-800 mb-6">
              🎉 완료!
            </div>
          )}
          <div className="bg-white rounded-2xl shadow-lg p-6 w-full text-center">
            <h2 className="text-xl font-bold text-slate-800 mb-2">모든 퀴즈 완료!</h2>
            <p className="text-slate-600">
              총 소요 시간: <strong>{totalSeconds != null ? `${Math.floor(totalSeconds / 60)}분 ${totalSeconds % 60}초` : '-'}</strong>
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
