'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import Link from 'next/link';

// ── 타입 ───────────────────────────────────────────────────────────────────
interface TaskGroup {
  category: string;
  emoji: string;
  tasks: string[];
  tip: string;
}
interface SequencePhase {
  phase: string;
  tasks: string[];
  reason: string;
}
interface ResultData {
  top3: string[];
  shallow: string[];
  deep: string[];
  micro: string[];
  timeblocks?: { label: string; minutes: number }[];
  groups?: TaskGroup[];
  sequence?: SequencePhase[];
}
interface CheckState { [key: string]: boolean }
interface ParsedSlot { day: string; start: string; end: string; label: string }
interface ParseResult { freeHours: number; totalFreeMinutes: number; slots: ParsedSlot[]; summary: string }

// ── 상수 ───────────────────────────────────────────────────────────────────
const LS_KEY = 'zzwarak_today';
const LS_TIMETABLE = 'zzwarak_timetable';
const LS_HISTORY = 'zzwarak_history';
const TODAY = new Date().toISOString().slice(0, 10);
const POMODORO_MIN = 25;

// ── 애니메이션 ──────────────────────────────────────────────────────────────
const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const card: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 28 } },
};

// ── 유틸 ───────────────────────────────────────────────────────────────────
function pad(n: number) { return String(n).padStart(2, '0'); }

function saveHistory(resultData: ResultData, checks: CheckState) {
  const entry = { date: TODAY, resultData, checks, savedAt: Date.now() };
  const raw = localStorage.getItem(LS_HISTORY);
  const history: Record<string, typeof entry> = raw ? JSON.parse(raw) : {};
  history[TODAY] = entry;
  localStorage.setItem(LS_HISTORY, JSON.stringify(history));
}

// ── 삭제 가능한 리스트 아이템 ───────────────────────────────────────────────
function DeletableItem({ id, text, dot, onDelete }: {
  id: string; text: string; dot: string; onDelete: (id: string) => void;
}) {
  return (
    <motion.li
      layout
      exit={{ opacity: 0, x: 8, transition: { duration: 0.15 } }}
      className="group flex items-start justify-between gap-3 py-2.5 border-b border-zinc-100 last:border-0"
    >
      <span className="flex items-start gap-2.5 text-[14px] text-zinc-600 leading-snug">
        <span className={`mt-[6px] w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
        {text}
      </span>
      <button onClick={() => onDelete(id)} className="mt-[2px] flex-shrink-0 text-zinc-200 hover:text-zinc-500 transition-colors opacity-0 group-hover:opacity-100 text-lg leading-none">×</button>
    </motion.li>
  );
}

// ── 포모도로 오버레이 ───────────────────────────────────────────────────────
function PomodoroOverlay({ task, onClose }: { task: string; onClose: () => void }) {
  const [secsLeft, setSecsLeft] = useState(POMODORO_MIN * 60);
  const [running, setRunning] = useState(true);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running && !finished) {
      intervalRef.current = setInterval(() => {
        setSecsLeft(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current!);
            setFinished(true); setRunning(false);
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('쫘라락 — 포모도로 완료! 🎉', { body: task });
            }
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, finished, task]);

  const mins = Math.floor(secsLeft / 60);
  const secs = secsLeft % 60;
  const circumference = 2 * Math.PI * 54;
  const progress = 1 - secsLeft / (POMODORO_MIN * 60);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-5"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-3xl px-8 py-10 w-full max-w-sm flex flex-col items-center text-center"
      >
        <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-2">집중 중</p>
        <p className="text-[15px] text-zinc-700 font-medium mb-8 leading-snug px-2">{task}</p>
        <div className="relative w-32 h-32 mb-8">
          <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="#f4f4f5" strokeWidth="6" />
            <circle cx="60" cy="60" r="54" fill="none" stroke={finished ? '#22c55e' : '#18181b'} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)}
              style={{ transition: 'stroke-dashoffset 1s linear' }} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            {finished ? <span className="text-3xl">🎉</span> : (
              <span className="text-[28px] font-bold text-zinc-900 tabular-nums">{pad(mins)}:{pad(secs)}</span>
            )}
          </div>
        </div>
        {finished ? (
          <div className="space-y-3 w-full">
            <p className="text-[14px] text-zinc-600">25분 집중 완료! 수고했어요.</p>
            <button onClick={() => { setSecsLeft(POMODORO_MIN * 60); setFinished(false); setRunning(true); }}
              className="w-full py-2.5 text-[14px] font-medium text-white bg-zinc-900 rounded-xl hover:bg-black transition-colors">한 번 더</button>
            <button onClick={onClose} className="w-full py-2.5 text-[14px] text-zinc-400 hover:text-zinc-700 transition-colors">닫기</button>
          </div>
        ) : (
          <div className="flex gap-3 w-full">
            <button onClick={() => setRunning(r => !r)}
              className="flex-1 py-2.5 text-[14px] font-medium text-white bg-zinc-900 rounded-xl hover:bg-black transition-colors">
              {running ? '일시정지' : '재개'}
            </button>
            <button onClick={onClose} className="flex-1 py-2.5 text-[14px] text-zinc-500 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">그만하기</button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────
export default function ZzwarakApp() {
  const [step, setStep] = useState<'input' | 'time' | 'loading' | 'result' | 'done'>('input');
  const [dumpText, setDumpText] = useState('');
  const [freeHours, setFreeHours] = useState(3);
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [checks, setChecks] = useState<CheckState>({});
  const [deleted, setDeleted] = useState<Set<string>>(new Set());

  const [timeMode, setTimeMode] = useState<'image' | 'manual'>('image');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<ParseResult | null>(null);
  const [isParsingImage, setIsParsingImage] = useState(false);
  const [savedTimetable, setSavedTimetable] = useState<ParseResult | null>(null);
  const [pomodoroTask, setPomodoroTask] = useState<string | null>(null);

  // 결과 탭 ('plan' | 'groups' | 'sequence')
  const [resultTab, setResultTab] = useState<'plan' | 'groups' | 'sequence'>('plan');

  // ── 마운트 ───────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.date !== TODAY) {
          if (parsed.resultData) saveHistory(parsed.resultData, parsed.checks ?? {});
          localStorage.removeItem(LS_KEY);
        } else {
          setResultData(parsed.resultData);
          setChecks(parsed.checks ?? {});
          setDeleted(new Set(parsed.deleted ?? []));
          setFreeHours(parsed.freeHours ?? 3);
          setStep(parsed.done ? 'done' : 'result');
        }
      } catch { localStorage.removeItem(LS_KEY); }
    }
    const tt = localStorage.getItem(LS_TIMETABLE);
    if (tt) {
      try {
        const parsed = JSON.parse(tt);
        setSavedTimetable(parsed);
        setParsedResult(parsed);
        setFreeHours(parsed.freeHours ?? 3);
      } catch { localStorage.removeItem(LS_TIMETABLE); }
    }
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // ── 저장 ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!resultData || (step !== 'result' && step !== 'done')) return;
    localStorage.setItem(LS_KEY, JSON.stringify({
      date: TODAY, resultData, checks, deleted: Array.from(deleted), freeHours, done: step === 'done',
    }));
    if (step === 'result' && resultData.top3.length > 0 && resultData.top3.every((_, i) => checks[`top3-${i}`])) {
      saveHistory(resultData, checks);
      setTimeout(() => setStep('done'), 500);
    }
  }, [checks, deleted, resultData, step, freeHours]);

  // ── 핸들러 ───────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!dumpText.trim()) return;
    setStep('loading');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: dumpText, freeHours }),
      });
      const data: ResultData = await res.json();
      setResultData(data);
      setChecks({}); setDeleted(new Set());
      // sequence가 있으면 바로 실행순서 탭으로
      setResultTab(data.sequence?.length ? 'sequence' : 'plan');
      setStep('result');
    } catch {
      alert('앗, 분류 중 오류가 생겼어요. 다시 시도해주세요.');
      setStep('time');
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file); setParsedResult(null);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleImageParse = async () => {
    if (!imageFile || !imagePreview) return;
    setIsParsingImage(true);
    try {
      const base64 = imagePreview.split(',')[1];
      const res = await fetch('/api/parse-timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: imageFile.type }),
      });
      const data: ParseResult = await res.json();
      setParsedResult(data); setSavedTimetable(data); setFreeHours(data.freeHours);
      localStorage.setItem(LS_TIMETABLE, JSON.stringify(data));
    } catch {
      alert('시간표 분석에 실패했어요. 이미지를 다시 확인해주세요.');
    } finally { setIsParsingImage(false); }
  };

  const handleReset = () => {
    localStorage.removeItem(LS_KEY);
    setDumpText(''); setResultData(null); setChecks({}); setDeleted(new Set()); setStep('input');
  };

  const deleteItem = useCallback((key: string) => setDeleted(p => new Set([...p, key])), []);
  const toggleCheck = (key: string) => setChecks(p => ({ ...p, [key]: !p[key] }));
  const checkedCount = resultData?.top3.filter((_, i) => checks[`top3-${i}`]).length ?? 0;

  const PHASE_COLORS: Record<string, string> = {
    '워밍업': 'bg-amber-50 border-amber-200 text-amber-700',
    '딥포커스': 'bg-violet-50 border-violet-200 text-violet-700',
    '마무리': 'bg-emerald-50 border-emerald-200 text-emerald-700',
  };

  // ── 렌더 ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* 상단 탭 네비게이션 */}
      <nav className="sticky top-0 z-40 bg-white border-b border-zinc-100">
        <div className="max-w-2xl mx-auto flex">
          <div className="flex-1 py-3.5 text-center text-[13px] font-semibold text-zinc-900 border-b-2 border-zinc-900">오늘</div>
          <Link href="/history" className="flex-1 py-3.5 text-center text-[13px] font-medium text-zinc-400 hover:text-zinc-700 transition-colors">기록</Link>
        </div>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center px-5 py-12">

        <AnimatePresence>
          {pomodoroTask && <PomodoroOverlay task={pomodoroTask} onClose={() => setPomodoroTask(null)} />}
        </AnimatePresence>

        {/* 브랜드 (step !== result/done 일 때) */}
        <AnimatePresence mode="wait">
          {step !== 'result' && step !== 'done' && (
            <motion.div key="brand" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute top-20 left-1/2 -translate-x-1/2">
              <span className="text-sm font-semibold text-zinc-300 tracking-widest uppercase">쫘라락</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">

          {/* ─── 1. 입력 ───────────────────────────────────────────────── */}
          {step === 'input' && (
            <motion.div key="input" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="w-full max-w-xl">
              <div className="mb-8">
                <h1 className="text-[28px] font-bold text-zinc-900 tracking-tight leading-tight mb-2">
                  지금 머릿속에 있는 걸<br />전부 쏟아내세요.
                </h1>
                <p className="text-[14px] text-zinc-400">형식 없이, 순서 없이. 생각나는 대로.</p>
              </div>
              <textarea
                value={dumpText} onChange={e => setDumpText(e.target.value)}
                placeholder={`기말 보고서 서론 쓰기\n김대리 메일 회신\n쿠팡 휴지 주문\n스페인어 공부 시작해야 하는데...\n아 요즘 뭘 해도 집중이 안 됨\n주말에 놀고 싶은데 할 게 너무 많아`}
                className="w-full h-64 text-[15px] text-zinc-800 placeholder-zinc-300 bg-zinc-50 rounded-xl border border-zinc-200 px-5 py-4 outline-none resize-none leading-relaxed focus:border-zinc-400 focus:bg-white transition-all"
                autoFocus
              />
              <AnimatePresence>
                {dumpText.trim() && (
                  <motion.div key="next" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="mt-4 flex justify-end">
                    <button onClick={() => setStep('time')}
                      className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 text-white text-[14px] font-medium rounded-lg hover:bg-black transition-colors">
                      다음
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ─── 2. 시간 입력 ──────────────────────────────────────────── */}
          {step === 'time' && (
            <motion.div key="time" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="w-full max-w-md">
              <h2 className="text-[22px] font-bold text-zinc-900 tracking-tight mb-1">오늘 자유 시간 설정</h2>
              <p className="text-[13px] text-zinc-400 mb-5">시간표를 올리거나 직접 입력해주세요.</p>

              <div className="flex bg-zinc-100 rounded-lg p-0.5 mb-5">
                {(['image', 'manual'] as const).map(mode => (
                  <button key={mode} onClick={() => setTimeMode(mode)}
                    className={`flex-1 py-2 text-[13px] font-medium rounded-md transition-all ${timeMode === mode ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}>
                    {mode === 'image' ? '📅 시간표 업로드' : '⏱ 직접 입력'}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {timeMode === 'image' && (
                  <motion.div key="img" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mb-5">
                    {savedTimetable && !imagePreview ? (
                      <div className="bg-zinc-50 rounded-xl border border-zinc-200 px-4 py-4">
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">저장된 시간표</span>
                          <span className="text-[10px] bg-emerald-50 text-emerald-500 font-semibold px-1.5 py-0.5 rounded-full">저장됨</span>
                        </div>
                        <p className="text-[14px] text-zinc-700 mb-3">{savedTimetable.summary}</p>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {savedTimetable.slots.map((s, i) => <span key={i} className="text-[12px] bg-white border border-zinc-200 text-zinc-600 px-2.5 py-1 rounded-full">{s.label}</span>)}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] text-zinc-500">하루 평균 <span className="font-bold text-zinc-900">{savedTimetable.freeHours}시간</span> 여유</span>
                          <button onClick={() => { setSavedTimetable(null); setParsedResult(null); localStorage.removeItem(LS_TIMETABLE); }}
                            className="text-[12px] text-zinc-400 hover:text-zinc-600 underline">새 시간표로 교체</button>
                        </div>
                      </div>
                    ) : !imagePreview ? (
                      <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-zinc-200 rounded-xl cursor-pointer hover:border-zinc-400 hover:bg-zinc-50 transition-all">
                        <svg className="w-8 h-8 text-zinc-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        <span className="text-[13px] text-zinc-400">시간표 이미지 선택</span>
                        <span className="text-[11px] text-zinc-300 mt-1">에브리타임, 학교 포털 캡처 모두 가능</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                      </label>
                    ) : (
                      <div className="space-y-3">
                        <div className="relative rounded-xl overflow-hidden border border-zinc-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imagePreview} alt="시간표 미리보기" className="w-full max-h-52 object-contain bg-zinc-50" />
                          <button onClick={() => { setImageFile(null); setImagePreview(null); setParsedResult(null); }}
                            className="absolute top-2 right-2 w-7 h-7 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 border border-zinc-200 text-sm">×</button>
                        </div>
                        {!parsedResult ? (
                          <button onClick={handleImageParse} disabled={isParsingImage}
                            className="w-full py-2.5 text-[13px] font-medium text-white bg-zinc-800 rounded-lg hover:bg-zinc-900 transition-colors disabled:opacity-50">
                            {isParsingImage ? (
                              <span className="flex items-center justify-center gap-2">
                                <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }} className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" />
                                시간표 분석 중...
                              </span>
                            ) : 'AI로 빈 시간 분석하기'}
                          </button>
                        ) : (
                          <div className="bg-zinc-50 rounded-xl border border-zinc-200 px-4 py-4">
                            <p className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">분석 결과 — 자동 저장됨 ✓</p>
                            <p className="text-[14px] text-zinc-700 mb-3">{parsedResult.summary}</p>
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {parsedResult.slots.map((s, i) => <span key={i} className="text-[12px] bg-white border border-zinc-200 text-zinc-600 px-2.5 py-1 rounded-full">{s.label}</span>)}
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[13px] text-zinc-500">하루 평균 <span className="font-bold text-zinc-900">{parsedResult.freeHours}시간</span> 여유</span>
                              <button onClick={() => { setImageFile(null); setImagePreview(null); setParsedResult(null); }} className="text-[12px] text-zinc-400 hover:text-zinc-600 underline">다시 올리기</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
                {timeMode === 'manual' && (
                  <motion.div key="manual" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="bg-zinc-50 rounded-xl border border-zinc-200 px-6 py-6 mb-5">
                    <div className="text-[48px] font-bold text-zinc-900 tabular-nums mb-4 leading-none">
                      {freeHours % 1 === 0 ? freeHours : freeHours.toFixed(1)}<span className="text-[18px] font-medium text-zinc-400 ml-1.5">시간</span>
                    </div>
                    <input type="range" min={0.5} max={12} step={0.5} value={freeHours} onChange={e => setFreeHours(parseFloat(e.target.value))} className="w-full accent-zinc-900" />
                    <div className="flex justify-between text-[11px] text-zinc-300 mt-1"><span>30분</span><span>12시간</span></div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-2.5">
                <button onClick={() => setStep('input')} className="flex-1 py-2.5 text-[14px] text-zinc-500 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors">뒤로</button>
                <button onClick={handleAnalyze} disabled={timeMode === 'image' && !parsedResult && !savedTimetable}
                  className="flex-1 py-2.5 text-[14px] font-medium text-white bg-zinc-900 rounded-lg hover:bg-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed">분석하기</button>
              </div>
            </motion.div>
          )}

          {/* ─── 3. 로딩 ───────────────────────────────────────────────── */}
          {step === 'loading' && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-5 text-center">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-8 h-8 border-2 border-zinc-200 border-t-zinc-700 rounded-full" />
              <div>
                <p className="text-[16px] font-semibold text-zinc-800">분류하는 중</p>
                <p className="text-[13px] text-zinc-400 mt-0.5">잠깐만 기다려주세요</p>
              </div>
            </motion.div>
          )}

          {/* ─── 4. 결과 ───────────────────────────────────────────────── */}
          {step === 'result' && resultData && (
            <motion.div key="result" variants={container} initial="hidden" animate="show" className="w-full max-w-2xl pb-10">

              {/* 헤더 */}
              <motion.div variants={card} className="flex items-center justify-between mb-6">
                <div>
                  <span className="text-[11px] font-semibold text-zinc-300 uppercase tracking-widest">쫘라락</span>
                  <h2 className="text-[22px] font-bold text-zinc-900 mt-1">오늘의 플랜</h2>
                </div>
                <div className="flex items-center gap-3">
                  <Link href="/history" className="text-[13px] text-zinc-400 hover:text-zinc-700 transition-colors flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    기록
                  </Link>
                  <button onClick={handleReset} className="text-[13px] text-zinc-400 hover:text-zinc-700 transition-colors">다시 쏟아내기</button>
                </div>
              </motion.div>

              {/* 결과 탭 */}
              {(resultData.groups?.length || resultData.sequence?.length) ? (
                <motion.div variants={card} className="flex bg-zinc-100 rounded-lg p-0.5 mb-5">
                  {([
                    { id: 'plan', label: '📋 전체 플랜' },
                    { id: 'sequence', label: '⚡ 실행 순서' },
                    { id: 'groups', label: '🗂 묶음' },
                  ] as const).map(t => (
                    <button key={t.id} onClick={() => setResultTab(t.id)}
                      className={`flex-1 py-2 text-[12px] font-medium rounded-md transition-all ${resultTab === t.id ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}>
                      {t.label}
                    </button>
                  ))}
                </motion.div>
              ) : null}

              <AnimatePresence mode="wait">

                {/* ── 플랜 탭 ── */}
                {resultTab === 'plan' && (
                  <motion.div key="tab-plan" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-6">

                    {/* Top 3 */}
                    <section>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wider">오늘의 목표</h3>
                        <span className="text-[12px] text-zinc-300">{checkedCount} / {resultData.top3.length}</span>
                      </div>
                      <ul className="border border-zinc-200 rounded-xl overflow-hidden divide-y divide-zinc-100">
                        {resultData.top3.map((task, i) => {
                          const key = `top3-${i}`;
                          const done = !!checks[key];
                          return (
                            <motion.li key={key} layout onClick={() => toggleCheck(key)}
                              className="flex items-center gap-3 px-5 py-4 bg-white hover:bg-zinc-50/50 transition-colors cursor-pointer select-none">
                              <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${done ? 'bg-zinc-900 border-zinc-900' : 'border-zinc-300'}`}>
                                {done && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                              </div>
                              <span className={`flex-1 text-[15px] leading-snug transition-all ${done ? 'text-zinc-300 line-through' : 'text-zinc-800 font-medium'}`}>{task}</span>
                              {!done && (
                                <button onClick={e => { e.stopPropagation(); setPomodoroTask(task); }}
                                  className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-zinc-300 hover:text-zinc-700 hover:bg-zinc-100 transition-all" title="포모도로">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                </button>
                              )}
                            </motion.li>
                          );
                        })}
                      </ul>
                    </section>

                    {/* 타임블록 */}
                    {resultData.timeblocks && resultData.timeblocks.length > 0 && (
                      <section>
                        <h3 className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">타임블록 <span className="text-zinc-300 normal-case font-normal tracking-normal">({freeHours}시간 기준)</span></h3>
                        <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white divide-y divide-zinc-100">
                          {resultData.timeblocks.map((block, i) => {
                            const pct = Math.min(100, Math.round((block.minutes / (freeHours * 60)) * 100));
                            const label = block.minutes >= 60 ? `${Math.floor(block.minutes / 60)}시간${block.minutes % 60 ? ` ${block.minutes % 60}분` : ''}` : `${block.minutes}분`;
                            return (
                              <div key={i} className="px-5 py-4">
                                <div className="flex justify-between text-[14px] mb-2">
                                  <span className="text-zinc-700 font-medium">{block.label}</span>
                                  <span className="text-zinc-400">{label}</span>
                                </div>
                                <div className="h-1 bg-zinc-100 rounded-full overflow-hidden">
                                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, ease: 'easeOut', delay: 0.2 + i * 0.08 }} className="h-1 bg-zinc-800 rounded-full" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    )}

                    {/* Shallow + Deep */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { title: '가벼운 업무', sub: '집중 없이 처리 가능한 것들', key: 'shallow', dot: 'bg-sky-300', data: resultData.shallow },
                        { title: '깊은 몰입', sub: '집중 블록에 배치할 것들', key: 'deep', dot: 'bg-violet-300', data: resultData.deep },
                      ].map(({ title, sub, key, dot, data }) => (
                        <section key={key} className="border border-zinc-200 rounded-xl bg-white overflow-hidden">
                          <div className="px-5 py-4 border-b border-zinc-100">
                            <p className="text-[14px] font-semibold text-zinc-800">{title}</p>
                            <p className="text-[12px] text-zinc-400 mt-0.5">{sub}</p>
                          </div>
                          <ul className="px-5 py-2">
                            <AnimatePresence>
                              {data?.map((task, i) => {
                                const id = `${key}-${i}`;
                                if (deleted.has(id)) return null;
                                return <DeletableItem key={id} id={id} text={task} dot={dot} onDelete={deleteItem} />;
                              })}
                            </AnimatePresence>
                          </ul>
                        </section>
                      ))}
                    </div>

                    {/* Micro */}
                    <section className="border border-zinc-200 rounded-xl bg-white overflow-hidden">
                      <div className="px-5 py-4 border-b border-zinc-100">
                        <p className="text-[14px] font-semibold text-zinc-800">실행의 첫 걸음</p>
                        <p className="text-[12px] text-zinc-400 mt-0.5">막연한 목표를 AI가 잘게 쪼갰어요</p>
                      </div>
                      <ul className="px-5 py-2">
                        <AnimatePresence>
                          {resultData.micro?.map((task, i) => {
                            const id = `micro-${i}`;
                            if (deleted.has(id)) return null;
                            return <DeletableItem key={id} id={id} text={task} dot="bg-emerald-300" onDelete={deleteItem} />;
                          })}
                        </AnimatePresence>
                      </ul>
                    </section>
                  </motion.div>
                )}

                {/* ── 묶음 탭 ── */}
                {resultTab === 'groups' && resultData.groups && (
                  <motion.div key="tab-groups" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-4">
                    {resultData.groups.map((group, gi) => (
                      <div key={gi} className="border border-zinc-200 rounded-xl bg-white overflow-hidden">
                        <div className="px-5 py-4 flex items-center gap-3 border-b border-zinc-100">
                          <span className="text-2xl">{group.emoji}</span>
                          <div>
                            <p className="text-[15px] font-semibold text-zinc-800">{group.category}</p>
                            <p className="text-[12px] text-zinc-400 mt-0.5">{group.tasks.length}개 태스크</p>
                          </div>
                        </div>
                        <ul className="px-5 py-2">
                          {group.tasks.map((task, i) => (
                            <li key={i} className="flex items-start gap-2.5 py-2.5 border-b border-zinc-100 last:border-0">
                              <span className="mt-[6px] w-1.5 h-1.5 rounded-full bg-zinc-300 flex-shrink-0" />
                              <span className="text-[14px] text-zinc-600 leading-snug">{task}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="px-5 py-3 bg-zinc-50 border-t border-zinc-100">
                          <p className="text-[12px] text-zinc-500">💡 {group.tip}</p>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}

                {/* ── 실행 순서 탭 ── */}
                {resultTab === 'sequence' && resultData.sequence && (
                  <motion.div key="tab-sequence" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-4">
                    <p className="text-[13px] text-zinc-400 mb-1">워밍업으로 시작해서 딥포커스로 이어지는 심리학 기반 순서예요. 위에서 아래로 순서대로 처리하세요.</p>
                    {resultData.sequence.map((phase, pi) => {
                      const colorClass = PHASE_COLORS[phase.phase] ?? 'bg-zinc-50 border-zinc-200 text-zinc-700';
                      return (
                        <div key={pi} className="border border-zinc-200 rounded-xl bg-white overflow-hidden">
                          <div className={`px-5 py-3 border-b flex items-center justify-between ${colorClass.split(' ').slice(0, 2).join(' ')}`}>
                            <span className={`text-[13px] font-bold ${colorClass.split(' ')[2]}`}>
                              {pi + 1}단계 · {phase.phase}
                            </span>
                            <span className="text-[11px] text-zinc-400">{phase.tasks.length}개 태스크</span>
                          </div>
                          <ul className="divide-y divide-zinc-100">
                            {phase.tasks.map((task, ti) => {
                              const seqKey = `seq-${pi}-${ti}`;
                              const done = !!checks[seqKey];
                              return (
                                <motion.li key={ti} layout
                                  onClick={() => toggleCheck(seqKey)}
                                  className={`flex items-center gap-3 px-5 py-3.5 cursor-pointer select-none transition-colors ${done ? 'bg-zinc-50/50' : 'bg-white hover:bg-zinc-50/50'
                                    }`}>
                                  {/* 순번 or 체크 */}
                                  <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all text-[11px] font-bold ${done ? 'bg-zinc-900 border-zinc-900 text-white' : 'border-zinc-200 text-zinc-400'
                                    }`}>
                                    {done
                                      ? <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                      : ti + 1
                                    }
                                  </div>
                                  <span className={`flex-1 text-[14px] leading-snug transition-all ${done ? 'text-zinc-300 line-through' : 'text-zinc-700'
                                    }`}>{task}</span>
                                  {!done && (
                                    <button onClick={e => { e.stopPropagation(); setPomodoroTask(task); }}
                                      className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-zinc-300 hover:text-zinc-700 hover:bg-zinc-100 transition-all" title="포모도로">
                                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                    </button>
                                  )}
                                </motion.li>
                              );
                            })}
                          </ul>
                          <div className="px-5 py-3 bg-zinc-50 border-t border-zinc-100">
                            <p className="text-[12px] text-zinc-400">🧠 {phase.reason}</p>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex justify-center mt-6">
                <button onClick={handleReset} className="px-6 py-2.5 text-sm text-zinc-400 hover:text-zinc-700 transition-colors border border-zinc-200 rounded-full hover:border-zinc-300">
                  다시 쏟아내기
                </button>
              </div>
            </motion.div>
          )}

          {/* ─── 5. 완료 ───────────────────────────────────────────────── */}
          {step === 'done' && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center text-center gap-4">
              <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 0.5, ease: 'backOut' }} className="text-6xl">🎉</motion.div>
              <div>
                <h2 className="text-[24px] font-bold text-zinc-900 mb-1">오늘 할 일 다 끝냈어요</h2>
                <p className="text-[14px] text-zinc-400">수고했어요. 오늘 하루 잘 살았네요.</p>
              </div>
              <Link href="/history" className="text-[13px] text-zinc-400 hover:text-zinc-700 underline">내 기록 보기</Link>
              <button onClick={handleReset} className="mt-1 px-6 py-2.5 text-[14px] font-medium text-white bg-zinc-900 rounded-lg hover:bg-black transition-colors">내일도 쫘라락</button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}