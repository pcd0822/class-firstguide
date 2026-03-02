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
  getStudents,
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
  const [showWrongNameModal, setShowWrongNameModal] = useState(false);
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [answerInput, setAnswerInput] = useState('');
  const [wrongCount, setWrongCount] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong1' | 'wrong2' | null>(null);
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const [totalSeconds, setTotalSeconds] = useState<number | null>(null);
  const [ranking, setRanking] = useState<{ name: string; quizTimeSeconds: number }[]>([]);

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
      setShowWrongNameModal(true);
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
          getStudents(classId).then((list) => {
            const r = list
              .filter((s) => s.quizTimeSeconds != null)
              .sort((a, b) => (a.quizTimeSeconds ?? 0) - (b.quizTimeSeconds ?? 0))
              .slice(0, 10)
              .map((s) => ({ name: s.name, quizTimeSeconds: s.quizTimeSeconds ?? 0 }));
            setRanking(r);
          });
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
      <main className="student-flow-bg min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <span className="text-5xl animate-bounce" aria-hidden>🌱</span>
        <p className="text-slate-600 font-medium">잠깐만 기다려 줘!</p>
      </main>
    );
  }
  if (!settings) {
    return (
      <main className="student-flow-bg min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <span className="text-5xl" aria-hidden>📚</span>
        <p className="text-slate-600 text-center">해당 학급이 설정되지 않았어.<br />선생님께 문의해 줘.</p>
      </main>
    );
  }

  return (
    <main className="student-flow-bg min-h-screen flex flex-col items-center p-4 pb-8">
      {/* Step 1: 초기 이미지 + 이름 입력 */}
      {step === 'name' && (
        <div className="w-full max-w-md flex flex-col items-center">
          {images.initial ? (
            <div className="w-full rounded-3xl overflow-hidden shadow-lg mb-6 bg-white student-card ring-2 ring-white/60">
              <img
                src={images.initial}
                alt="환영"
                className="w-full aspect-square object-cover"
              />
            </div>
          ) : (
            <div className="w-full aspect-square rounded-3xl student-card mb-6 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-amber-50 to-rose-50 border-2 border-amber-100/80">
              <span className="text-6xl" aria-hidden>🌟</span>
              <span className="text-5xl" aria-hidden>🎒</span>
              <p className="text-amber-800/90 font-medium text-lg">반가워!</p>
            </div>
          )}
          <div className="w-full student-card bg-white/95 backdrop-blur p-6 rounded-3xl">
            <p className="flex items-center justify-center gap-2 text-slate-700 font-medium mb-3 text-lg">
              <span className="text-2xl" aria-hidden>👋</span>
              너의 이름을 입력하세요
            </p>
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
              placeholder="이름을 써 주세요"
              className="w-full rounded-2xl border-2 border-amber-200/80 bg-amber-50/50 px-4 py-3.5 text-lg focus:border-amber-400 focus:ring-2 focus:ring-amber-200 mb-2 placeholder:text-amber-300"
            />
            {nameError && (
              <p className="flex items-center gap-1.5 text-rose-600 text-sm mb-2">
                <span aria-hidden>💬</span> {nameError}
              </p>
            )}
          {showWrongNameModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowWrongNameModal(false)}>
                <div className="student-card bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center" onClick={(e) => e.stopPropagation()}>
                  <p className="text-slate-800 font-medium leading-relaxed mb-6">
                    자네는 우리 반이 아닌 것 같네!<br />
                    혹시 이름을 잘못 입력하지는 않았는가?
                  </p>
                  <button
                    onClick={() => setShowWrongNameModal(false)}
                    className="w-full py-3 rounded-2xl bg-slate-700 text-white font-medium hover:bg-slate-600"
                  >
                    확인
                  </button>
                </div>
              </div>
            )}
            <button
              onClick={handleNameSubmit}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-rose-400 text-white font-semibold hover:from-amber-500 hover:to-rose-500 shadow-md active:scale-[0.98] transition"
            >
              <span className="mr-1.5" aria-hidden>✨</span> 확인
            </button>
          </div>
        </div>
      )}

      {/* Step 2 & 3: 자리 안내 + 착석 버튼 */}
      {(step === 'seat' || step === 'seated') && student && (
        <div className="w-full max-w-md flex flex-col items-center">
          <div className="w-full student-card bg-white/95 backdrop-blur p-6 rounded-3xl mb-4">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-800 mb-4">
              <span className="text-2xl" aria-hidden>🪑</span> 자리 안내
            </h2>
            <div className="rounded-2xl bg-amber-50/80 border border-amber-200/60 p-4 mb-4">
              <p className="text-slate-700 text-lg mb-0.5">
                너의 학번은? <strong className="text-amber-600 text-xl">{student.studentId}</strong> !!
              </p>
              <p className="text-slate-600 text-sm flex items-center gap-1">
                <span aria-hidden>💛</span> 꼭 기억해주길 바라
              </p>
            </div>
            {student.seat.row >= 0 && student.seat.col >= 0 ? (
              <>
                <p className="text-slate-700 font-medium mb-3 flex items-center gap-1.5">
                  <span aria-hidden>📍</span> 너의 자리는? 아래 표시된 자리에 가서 앉아.
                </p>
                <div className="flex gap-2 my-4">
                  <div
                    className="flex flex-col justify-between w-11 shrink-0 text-center text-slate-500 text-xs font-medium border-2 border-slate-200 rounded-xl bg-slate-100/80 py-2"
                    style={{ minHeight: `${((settings?.rows ?? 4) * 2.75) + 3 + 0.5}rem` }}
                  >
                    <span>🚪 문</span>
                    <span>🚪 문</span>
                  </div>
                  <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-slate-50/80 border border-slate-200/80">
                    {Array.from({ length: settings?.rows ?? 4 }, (_, i) => (
                      <div key={i} className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${settings?.cols ?? 6}, minmax(2.5rem, 3rem))` }}>
                        {Array.from({ length: settings?.cols ?? 6 }, (_, col) => {
                          const isMySeat = student.seat.row === i && student.seat.col === col;
                          return (
                            <div
                              key={col}
                              className={`min-w-[2.5rem] min-h-[2.5rem] rounded-xl border-2 flex items-center justify-center text-xs font-bold ${
                                isMySeat ? 'bg-gradient-to-br from-amber-100 to-rose-100 border-amber-400 text-amber-800 shadow-sm' : 'bg-white/60 border-slate-200 text-slate-400'
                              }`}
                            >
                              {isMySeat ? <span className="truncate px-0.5">{student.name}</span> : <span className="opacity-40" aria-hidden>▢</span>}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    <div className="text-center py-1.5 rounded-xl bg-amber-100/90 border border-amber-200 text-amber-800 text-sm font-medium mt-1">
                      🪑 교탁
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-amber-700 font-medium flex items-center gap-1.5">
                <span aria-hidden>💬</span> 자리가 아직 배정되지 않았어. 선생님께 문의해 줘.
              </p>
            )}
          </div>
          {student.seat.row >= 0 && student.seat.col >= 0 ? (
            <>
              <p className="text-slate-600 text-center text-sm mb-4">
                자리에 가서 앉은 뒤, 아래 버튼을 눌러 주세요.
              </p>
              <button
                onClick={handleSeated}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 text-white text-lg font-bold hover:from-emerald-500 hover:to-teal-500 shadow-lg active:scale-[0.98] transition"
              >
                <span className="mr-1.5" aria-hidden>✅</span> 자리에 앉았어요
              </button>
            </>
          ) : (
            <button
              onClick={() => setStep('wait')}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-slate-400 to-slate-500 text-white text-lg font-bold shadow-lg active:scale-[0.98] transition"
            >
              <span className="mr-1.5" aria-hidden>📝</span> 퀴즈로 진행
            </button>
          )}
        </div>
      )}

      {/* Step 4: 퀴즈 대기 + 스타트 */}
      {step === 'wait' && (
        <div className="w-full max-w-md flex flex-col items-center">
          <div className="w-full student-card bg-white/95 backdrop-blur p-8 rounded-3xl text-center">
            <div className="flex justify-center gap-2 mb-4">
              <span className="text-4xl" aria-hidden>📚</span>
              <span className="text-4xl" aria-hidden>✏️</span>
              <span className="text-4xl" aria-hidden>🎯</span>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">퀴즈 준비</h2>
            <p className="text-slate-600 mb-2">준비되면 아래 버튼을 눌러 시작해!</p>
            <div className="rounded-2xl bg-amber-50 border border-amber-200/80 p-4 mb-6">
              <p className="text-amber-800 font-semibold flex items-center justify-center gap-2">
                <span className="text-2xl" aria-hidden>🎁</span>
                빨리 맞추면 상품이 있으니 신중히 풀어봐!
              </p>
            </div>
            <button
              onClick={handleStartQuiz}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 text-white text-lg font-bold hover:from-amber-500 hover:to-orange-500 shadow-lg active:scale-[0.98] transition"
            >
              <span className="mr-1.5" aria-hidden>🚀</span> 스타트
            </button>
          </div>
        </div>
      )}

      {/* Step 5: 퀴즈 진행 */}
      {step === 'quiz' && (
        <div className="w-full max-w-md flex flex-col">
          {quizzes.length === 0 ? (
            <div className="student-card bg-white/95 p-6 rounded-3xl text-center text-slate-500">
              <span className="text-4xl block mb-2" aria-hidden>📋</span>
              퀴즈 문항이 없어요. 선생님께 문의해 줘.
            </div>
          ) : currentQuiz ? (
            <>
              <div className="w-full student-card bg-white/95 backdrop-blur p-6 rounded-3xl mb-4">
                <p className="flex items-center gap-1.5 text-sm text-slate-500 mb-2">
                  <span aria-hidden>📝</span> {quizIndex + 1} / {quizzes.length}
                </p>
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-start gap-2">
                  <span className="text-2xl shrink-0" aria-hidden>🧩</span>
                  {currentQuiz.question}
                </h2>
                <input
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAnswerSubmit()}
                  placeholder="정답을 입력해 줘"
                  className="w-full rounded-2xl border-2 border-amber-200/80 bg-amber-50/50 px-4 py-3 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 placeholder:text-amber-300"
                />
                <button
                  onClick={handleAnswerSubmit}
                  className="w-full mt-3 py-3.5 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-500 text-white font-semibold hover:from-violet-600 hover:to-purple-600 shadow-md active:scale-[0.98] transition"
                >
                  <span className="mr-1.5" aria-hidden>✉️</span> 제출
                </button>
              </div>

              {/* 정답/오답 이미지 팝업 */}
              {feedback === 'correct' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeFeedback}>
                  <div className="student-card bg-white rounded-3xl overflow-hidden shadow-2xl max-w-sm w-full ring-2 ring-emerald-200/60">
                    {images.correct ? (
                      <img src={images.correct} alt="정답" className="w-full aspect-square object-cover" />
                    ) : (
                      <div className="w-full aspect-square flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-emerald-50 to-teal-50">
                        <span className="text-5xl" aria-hidden>🎉</span>
                        <span className="text-4xl" aria-hidden>⭐</span>
                        <p className="text-xl font-bold text-emerald-600">정답!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {feedback === 'wrong1' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeFeedback}>
                  <div className="student-card bg-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col p-5 ring-2 ring-amber-200/50">
                    <div className="flex-1 min-h-0 flex flex-col items-center justify-center rounded-2xl mb-3 min-h-[8rem] bg-gradient-to-br from-amber-50/80 to-rose-50/80 border border-amber-100">
                      {images.wrong1 ? (
                        <img src={images.wrong1} alt="1차 오답" className="max-w-full max-h-[50vh] w-auto h-auto object-contain rounded-xl" />
                      ) : (
                        <>
                          <span className="text-4xl mb-2" aria-hidden>🤔</span>
                          <p className="text-amber-700 font-medium">다시 생각해 봐!</p>
                        </>
                      )}
                    </div>
                    <p className="text-amber-800 font-medium flex items-center gap-1.5">
                      <span aria-hidden>💡</span> 힌트: {currentQuiz.hint || '다시 생각해 보세요.'}
                    </p>
                    <p className="text-slate-500 text-sm mt-2 flex items-center gap-1">
                      <span aria-hidden>👆</span> 화면을 탭하면 닫기
                    </p>
                  </div>
                </div>
              )}
              {feedback === 'wrong2' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeFeedback}>
                  <div className="student-card bg-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col p-5 ring-2 ring-rose-200/50">
                    <div className="flex-1 min-h-0 flex flex-col items-center justify-center rounded-2xl mb-3 min-h-[8rem] bg-gradient-to-br from-rose-50/80 to-amber-50/80 border border-rose-100">
                      {images.wrong2 ? (
                        <img src={images.wrong2} alt="2차 오답" className="max-w-full max-h-[50vh] w-auto h-auto object-contain rounded-xl" />
                      ) : (
                        <>
                          <span className="text-4xl mb-2" aria-hidden>💪</span>
                          <p className="text-rose-700 font-medium">조금만 더 생각해 봐!</p>
                        </>
                      )}
                    </div>
                    <p className="text-amber-800 font-medium flex items-center gap-1.5">
                      <span aria-hidden>💡</span> 힌트: {currentQuiz.hint || '다시 생각해 보세요.'}
                    </p>
                    <p className="text-slate-500 text-sm mt-2 flex items-center gap-1">
                      <span aria-hidden>👆</span> 화면을 탭하면 닫기
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="student-card bg-white/95 p-6 rounded-3xl text-center text-slate-500">
              <span className="text-3xl block mb-2" aria-hidden>⏳</span>
              퀴즈를 불러오는 중...
            </div>
          )}
        </div>
      )}

      {/* Step 6: 최종 성공 */}
      {step === 'result' && (
        <div className="w-full max-w-md flex flex-col items-center">
          {images.finalSuccess ? (
            <div className="w-full rounded-3xl overflow-hidden shadow-xl mb-6 student-card ring-2 ring-amber-200/60">
              <img
                src={images.finalSuccess}
                alt="축하"
                className="w-full aspect-square object-cover"
              />
            </div>
          ) : (
            <div className="w-full aspect-square rounded-3xl student-card mb-6 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-amber-100 to-rose-100 border-2 border-amber-200/60">
              <span className="text-5xl" aria-hidden>🎊</span>
              <span className="text-5xl" aria-hidden>🏆</span>
              <p className="text-xl font-bold text-amber-800">완료!</p>
            </div>
          )}
          <div className="w-full student-card bg-white/95 backdrop-blur p-6 rounded-3xl text-center mb-4">
            <div className="flex justify-center gap-1 mb-2">
              <span className="text-2xl" aria-hidden>⭐</span>
              <span className="text-2xl" aria-hidden>🎉</span>
              <span className="text-2xl" aria-hidden>🌟</span>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">모든 퀴즈 완료!</h2>
            <p className="text-slate-600 flex items-center justify-center gap-1.5">
              <span aria-hidden>⏱️</span>
              총 소요 시간: <strong className="text-amber-600">{totalSeconds != null ? `${Math.floor(totalSeconds / 60)}분 ${totalSeconds % 60}초` : '-'}</strong>
            </p>
          </div>
          {ranking.length > 0 && (
            <div className="w-full student-card bg-white/95 backdrop-blur p-5 rounded-3xl">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center justify-center gap-1.5">
                <span aria-hidden>🏆</span> 게임 랭킹
              </h3>
              <div className="space-y-2">
                {ranking.map((r, i) => {
                  const rank = i + 1;
                  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
                  const timeStr = `${Math.floor(r.quizTimeSeconds / 60)}분 ${r.quizTimeSeconds % 60}초`;
                  return (
                    <div
                      key={`${r.name}-${i}`}
                      className={`flex items-center gap-3 rounded-xl border-2 p-2.5 ${
                        rank === 1 ? 'bg-amber-50 border-amber-200' : rank === 2 ? 'bg-slate-50 border-slate-200' : rank === 3 ? 'bg-orange-50 border-orange-200' : 'bg-slate-50/50 border-slate-100'
                      }`}
                    >
                      <span className="w-7 text-center text-base font-bold shrink-0">{medal ?? `#${rank}`}</span>
                      <span className="flex-1 text-sm font-medium text-slate-800 truncate">{r.name}</span>
                      <span className="text-xs font-semibold text-slate-600 tabular-nums">{timeStr}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {settings?.announcement && (settings.announcement.noticeText.trim() || (settings.announcement.tableRows?.length ?? 0) > 0) && (
            <div className="w-full student-card bg-white/95 backdrop-blur p-5 rounded-3xl overflow-hidden border-2 border-amber-100 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                <span aria-hidden>📅</span> 입학식 일정
              </h3>
              {settings.announcement.noticeText.trim() && (
                <p className="text-slate-600 text-sm mb-4 leading-relaxed">{settings.announcement.noticeText}</p>
              )}
              {settings.announcement.tableRows && settings.announcement.tableRows.length > 0 && (
                <div className="rounded-2xl overflow-hidden border-2 border-amber-100 bg-amber-50/50">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-amber-100/80">
                        <th className="text-left py-3 px-4 text-amber-900 font-bold text-sm rounded-tl-xl">시간</th>
                        <th className="text-left py-3 px-4 text-amber-900 font-bold text-sm">일정</th>
                        <th className="text-left py-3 px-4 text-amber-900 font-bold text-sm rounded-tr-xl">비고</th>
                      </tr>
                    </thead>
                    <tbody>
                      {settings.announcement.tableRows.map((row, i) => {
                        const isLast = i === settings.announcement!.tableRows!.length - 1;
                        return (
                          <tr key={i} className="bg-white/90 border-t border-amber-100">
                            <td className={`py-2.5 px-4 text-slate-700 text-sm font-medium ${isLast ? 'rounded-bl-xl' : ''}`}>{row.time || '—'}</td>
                            <td className="py-2.5 px-4 text-slate-700 text-sm">{row.schedule || '—'}</td>
                            <td className={`py-2.5 px-4 text-slate-600 text-sm ${isLast ? 'rounded-br-xl' : ''}`}>{row.note || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
