'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const LS_HISTORY = 'zzwarak_history';

interface TaskGroup { category: string; emoji: string; tasks: string[]; tip: string; }
interface SequencePhase { phase: string; tasks: string[]; reason: string; }
interface ResultData {
    top3: string[];
    shallow?: string[];
    deep?: string[];
    micro?: string[];
    timeblocks?: { label: string; minutes: number }[];
    groups?: TaskGroup[];
    sequence?: SequencePhase[];
}
interface DayEntry {
    date: string;
    resultData: ResultData;
    checks: Record<string, boolean>;
    savedAt: number;
}

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDayOfMonth(y: number, m: number) { return new Date(y, m, 1).getDay(); }
function toDateStr(y: number, m: number, d: number) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const MONTHS_KR = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const DAYS_KR = ['일', '월', '화', '수', '목', '금', '토'];
const PHASE_COLORS: Record<string, string> = {
    '워밍업': 'text-amber-600 bg-amber-50',
    '딥포커스': 'text-violet-600 bg-violet-50',
    '마무리': 'text-emerald-600 bg-emerald-50',
};

// ── 날짜 상세 패널 ──────────────────────────────────────────────────────────
function DayDetail({ entry, onClose }: { entry: DayEntry; onClose: () => void }) {
    const [tab, setTab] = useState<'plan' | 'groups' | 'sequence'>('plan');
    const { resultData, checks } = entry;
    const total = resultData.top3.length;
    const done = resultData.top3.filter((_, i) => checks[`top3-${i}`]).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const hasTabs = !!(resultData.groups?.length || resultData.sequence?.length);

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="mt-4 border border-zinc-200 rounded-2xl bg-white overflow-hidden"
        >
            {/* 헤더 */}
            <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
                <div>
                    <p className="text-[11px] text-zinc-400 font-medium">{entry.date}</p>
                    <p className="text-[16px] font-bold text-zinc-900 mt-0.5">그날의 플랜</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <span className="text-[20px] font-bold text-zinc-900">{pct}%</span>
                        <p className="text-[11px] text-zinc-400">{done}/{total} 완료</p>
                    </div>
                    <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-zinc-300 hover:text-zinc-600 rounded-full hover:bg-zinc-100 transition-all text-lg">×</button>
                </div>
            </div>

            {/* 완료율 바 */}
            <div className="h-1 bg-zinc-100">
                <div className="h-1 bg-zinc-800 transition-all" style={{ width: `${pct}%` }} />
            </div>

            {/* 탭 (groups/sequence 있을 때만) */}
            {hasTabs && (
                <div className="flex bg-zinc-50 border-b border-zinc-100">
                    {([
                        { id: 'plan', label: '📋 플랜' },
                        { id: 'groups', label: '🗂 묶음' },
                        { id: 'sequence', label: '⚡ 순서' },
                    ] as const).map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={`flex-1 py-2.5 text-[12px] font-medium transition-all ${tab === t.id ? 'text-zinc-900 border-b-2 border-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>
            )}

            <div className="px-5 py-4">
                <AnimatePresence mode="wait">

                    {/* 플랜 탭 */}
                    {tab === 'plan' && (
                        <motion.div key="plan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                            {/* Top 3 */}
                            <div>
                                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">오늘의 목표</p>
                                <ul className="space-y-2">
                                    {resultData.top3.map((task, i) => {
                                        const isDone = !!checks[`top3-${i}`];
                                        return (
                                            <li key={i} className="flex items-start gap-2.5">
                                                <div className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${isDone ? 'bg-zinc-700 border-zinc-700' : 'border-zinc-300'}`}>
                                                    {isDone && <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                                </div>
                                                <span className={`text-[14px] leading-snug ${isDone ? 'line-through text-zinc-300' : 'text-zinc-700'}`}>{task}</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>

                            {/* 타임블록 */}
                            {resultData.timeblocks && resultData.timeblocks.length > 0 && (
                                <div>
                                    <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">타임블록</p>
                                    <div className="space-y-2">
                                        {resultData.timeblocks.map((b, i) => {
                                            const label = b.minutes >= 60 ? `${Math.floor(b.minutes / 60)}h${b.minutes % 60 ? ` ${b.minutes % 60}m` : ''}` : `${b.minutes}m`;
                                            return (
                                                <div key={i} className="flex items-center justify-between text-[13px]">
                                                    <span className="text-zinc-600">{b.label}</span>
                                                    <span className="text-zinc-400 tabular-nums">{label}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Shallow / Deep / Micro */}
                            {[
                                { title: '가벼운 업무', data: resultData.shallow, dot: 'bg-sky-300' },
                                { title: '깊은 몰입', data: resultData.deep, dot: 'bg-violet-300' },
                                { title: '실행의 첫 걸음', data: resultData.micro, dot: 'bg-emerald-300' },
                            ].filter(s => s.data?.length).map(({ title, data, dot }) => (
                                <div key={title}>
                                    <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">{title}</p>
                                    <ul className="space-y-1.5">
                                        {data!.map((task, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <span className={`mt-[7px] w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
                                                <span className="text-[13px] text-zinc-500 leading-snug">{task}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </motion.div>
                    )}

                    {/* 묶음 탭 */}
                    {tab === 'groups' && resultData.groups && (
                        <motion.div key="groups" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                            {resultData.groups.map((group, i) => (
                                <div key={i} className="bg-zinc-50 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xl">{group.emoji}</span>
                                        <span className="text-[14px] font-semibold text-zinc-800">{group.category}</span>
                                    </div>
                                    <ul className="space-y-1 mb-3">
                                        {group.tasks.map((t, ti) => (
                                            <li key={ti} className="flex items-start gap-2 text-[13px] text-zinc-500">
                                                <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-zinc-300 flex-shrink-0" />{t}
                                            </li>
                                        ))}
                                    </ul>
                                    <p className="text-[12px] text-zinc-400">💡 {group.tip}</p>
                                </div>
                            ))}
                        </motion.div>
                    )}

                    {/* 실행순서 탭 */}
                    {tab === 'sequence' && resultData.sequence && (
                        <motion.div key="sequence" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                            {resultData.sequence.map((phase, i) => {
                                const colorClass = PHASE_COLORS[phase.phase] ?? 'text-zinc-600 bg-zinc-50';
                                return (
                                    <div key={i} className="bg-zinc-50 rounded-xl p-4">
                                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${colorClass} mb-2 inline-block`}>
                                            {i + 1}단계 · {phase.phase}
                                        </span>
                                        <ul className="space-y-1 my-2">
                                            {phase.tasks.map((t, ti) => (
                                                <li key={ti} className="flex items-start gap-2 text-[13px] text-zinc-600">
                                                    <span className="text-[11px] font-bold text-zinc-300 mt-0.5 flex-shrink-0">{ti + 1}</span>{t}
                                                </li>
                                            ))}
                                        </ul>
                                        <p className="text-[12px] text-zinc-400">🧠 {phase.reason}</p>
                                    </div>
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}

// ── 메인 캘린더 페이지 ─────────────────────────────────────────────────────
export default function HistoryPage() {
    const [history, setHistory] = useState<Record<string, DayEntry>>({});
    const [now] = useState(new Date());
    const [viewYear, setViewYear] = useState(now.getFullYear());
    const [viewMonth, setViewMonth] = useState(now.getMonth());
    const [selected, setSelected] = useState<DayEntry | null>(null);

    useEffect(() => {
        const raw = localStorage.getItem(LS_HISTORY);
        if (raw) { try { setHistory(JSON.parse(raw)); } catch { /* noop */ } }
    }, []);

    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
    const today = toDateStr(now.getFullYear(), now.getMonth(), now.getDate());
    const totalDays = Object.keys(history).length;

    const prevMonth = () => { if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); } else setViewMonth(m => m - 1); };
    const nextMonth = () => { if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); } else setViewMonth(m => m + 1); };

    const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

    return (
        <div className="min-h-screen bg-white">
            {/* 상단 탭 내비게이션 */}
            <nav className="sticky top-0 z-40 bg-white border-b border-zinc-100">
                <div className="max-w-lg mx-auto flex">
                    <Link href="/" className="flex-1 py-3.5 text-center text-[13px] font-medium text-zinc-400 hover:text-zinc-700 transition-colors">오늘</Link>
                    <div className="flex-1 py-3.5 text-center text-[13px] font-semibold text-zinc-900 border-b-2 border-zinc-900">기록</div>
                </div>
            </nav>

            <div className="max-w-lg mx-auto px-5 py-6">

                {/* 통계 */}
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-[20px] font-bold text-zinc-900">기록</h1>
                    <span className="text-[13px] text-zinc-400">{totalDays}일 기록됨</span>
                </div>

                {/* 캘린더 헤더 */}
                <div className="flex items-center justify-between mb-4">
                    <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-all">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <span className="text-[16px] font-bold text-zinc-900">{viewYear}년 {MONTHS_KR[viewMonth]}</span>
                    <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-all">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>

                {/* 요일 헤더 */}
                <div className="grid grid-cols-7 mb-1">
                    {DAYS_KR.map((d, i) => (
                        <div key={d} className={`text-center text-[11px] font-semibold pb-2 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-zinc-400'}`}>{d}</div>
                    ))}
                </div>

                {/* 날짜 그리드 */}
                <div className="grid grid-cols-7 gap-y-1 mb-2">
                    {cells.map((day, idx) => {
                        if (day === null) return <div key={`e-${idx}`} />;
                        const dateStr = toDateStr(viewYear, viewMonth, day);
                        const entry = history[dateStr];
                        const isToday = dateStr === today;
                        const isSelected = selected?.date === dateStr;
                        const t = entry?.resultData.top3.length ?? 0;
                        const d = entry ? entry.resultData.top3.filter((_, i) => entry.checks[`top3-${i}`]).length : 0;
                        const allDone = t > 0 && d === t;
                        const dow = (firstDay + day - 1) % 7;

                        return (
                            <button key={dateStr} onClick={() => entry && setSelected(isSelected ? null : entry)}
                                className={`relative flex flex-col items-center py-2 rounded-xl transition-all ${entry ? 'hover:bg-zinc-50 cursor-pointer' : 'cursor-default'} ${isSelected ? 'bg-zinc-100' : ''} ${isToday ? 'ring-1 ring-zinc-300' : ''}`}>
                                <span className={`text-[13px] font-medium ${isToday ? 'font-bold text-zinc-900' : dow === 0 ? 'text-red-400' : dow === 6 ? 'text-blue-400' : 'text-zinc-600'}`}>{day}</span>
                                {entry && (
                                    <div className="mt-1 flex gap-0.5 items-center">
                                        {allDone ? (
                                            <span className="text-[11px] text-emerald-500">✓</span>
                                        ) : (
                                            Array.from({ length: Math.min(t, 3) }).map((_, i) => (
                                                <div key={i} className={`w-1 h-1 rounded-full ${i < d ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
                                            ))
                                        )}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* 범례 */}
                <div className="flex items-center gap-4 text-[11px] text-zinc-400 mb-4 justify-end">
                    <span className="flex items-center gap-1"><span className="text-emerald-500 text-sm">✓</span> 완료</span>
                    <span className="flex items-center gap-1.5"><span className="flex gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-zinc-700 inline-block" /><span className="w-1.5 h-1.5 rounded-full bg-zinc-300 inline-block" /></span> 진행 중</span>
                </div>

                {/* 선택된 날 상세 */}
                <AnimatePresence>
                    {selected && <DayDetail key={selected.date} entry={selected} onClose={() => setSelected(null)} />}
                </AnimatePresence>

                {/* 빈 상태 */}
                {totalDays === 0 && (
                    <div className="mt-16 text-center">
                        <p className="text-zinc-300 text-[14px]">아직 기록이 없어요.</p>
                        <p className="text-zinc-300 text-[12px] mt-1">오늘 할 일을 분석하면 여기에 쌓여요.</p>
                        <Link href="/" className="mt-4 inline-block text-[13px] text-zinc-500 border border-zinc-200 px-4 py-2 rounded-full hover:bg-zinc-50 transition-colors">시작하기 →</Link>
                    </div>
                )}
            </div>
        </div>
    );
}
