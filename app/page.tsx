'use client';

import { useState } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion'; // Variants 추가
export default function ZzwarakApp() {
  // 1. 상태 관리 (입력된 텍스트, 현재 화면 단계, AI 결과 데이터)
  const [dumpText, setDumpText] = useState('');
  const [step, setStep] = useState('input'); // 'input' -> 'loading' -> 'result'
  const [resultData, setResultData] = useState<any>(null);

  // 2. AI API 호출 함수 (버튼 누르면 실행됨)
  const handleAnalyze = async () => {
    if (dumpText.trim() === '') return;

    setStep('loading'); // 로딩 화면으로 전환!

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: dumpText }),
      });

      const data = await response.json();
      setResultData(data);
      setStep('result'); // 결과 화면으로 전환!
    } catch (error) {
      alert("앗, 쫘라락 분류 중 문제가 생겼어요. 다시 시도해주세요!");
      setStep('input');
    }
  };

  // 대시보드 카드 애니메이션 설정
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };
  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-10 overflow-x-hidden">

      {/* 화면이 바뀔 때 부드럽게 전환되도록 mode="wait" 사용 */}
      <AnimatePresence mode="wait">

        {/* ==================== 1. 입력 화면 ==================== */}
        {step === 'input' && (
          <motion.div
            key="input-screen"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40, scale: 0.95 }}
            className="w-full max-w-2xl flex flex-col items-center"
          >
            <h1 className="text-4xl text-gray-800 mb-3 font-extrabold tracking-tight">쫘라락</h1>
            <p className="text-lg text-gray-400 mb-10 font-light text-center">
              형식은 필요 없습니다. 엔터로 구분해서 머릿속을 전부 쏟아내세요.
            </p>

            <div className="w-full bg-white rounded-3xl shadow-sm border border-gray-200 p-8 transition-shadow focus-within:shadow-md focus-within:border-gray-300">
              <textarea
                value={dumpText}
                onChange={(e) => setDumpText(e.target.value)}
                placeholder={`예시)\n기말 보고서 서론 쓰기\n김대리한테 메일 회신\n쿠팡에서 휴지 사기\n스페인어 공부 시작...`}
                className="w-full h-80 text-xl bg-transparent outline-none resize-none leading-relaxed text-gray-700 placeholder-gray-300"
                autoFocus
              />
            </div>

            <AnimatePresence>
              {dumpText.trim().length > 0 && (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  onClick={handleAnalyze} // 클릭하면 AI 분석 시작!
                  className="mt-12 px-10 py-5 bg-black text-white rounded-full text-xl font-bold shadow-2xl hover:scale-105 transition-transform"
                >
                  ✨ AI로 쫘라락 정리하기
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ==================== 2. 로딩 화면 ==================== */}
        {step === 'loading' && (
          <motion.div
            key="loading-screen"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-16 h-16 border-4 border-gray-200 border-t-black rounded-full mb-8"
            />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">AI가 쫘라락 분류 중...</h2>
            <p className="text-gray-500 animate-pulse">우선순위와 뇌 사용량을 계산하고 있어요.</p>
          </motion.div>
        )}

        {/* ==================== 3. 결과 대시보드 화면 ==================== */}
        {step === 'result' && resultData && (
          <motion.div
            key="result-screen"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="w-full max-w-4xl flex flex-col gap-6"
          >
            <motion.h2 variants={cardVariants} className="text-3xl font-extrabold text-center text-gray-800 mb-6">
              ✨ 마법처럼 정리된 결과입니다
            </motion.h2>

            <motion.div variants={cardVariants} className="bg-white p-8 rounded-3xl shadow-sm border border-red-100">
              <h3 className="text-xl font-bold text-red-500 mb-4">🔥 오늘의 절대 목표 (Top 3)</h3>
              <ul className="space-y-3">
                {resultData.top3?.map((task: string, i: number) => (
                  <li key={i} className="flex items-start text-lg text-gray-700 font-medium">
                    <span className="mr-3 mt-1 w-5 h-5 border-2 border-red-200 rounded-md flex-shrink-0"></span>
                    {task}
                  </li>
                ))}
              </ul>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div variants={cardVariants} className="bg-white p-8 rounded-3xl shadow-sm border border-blue-100">
                <h3 className="text-xl font-bold text-blue-500 mb-2">☕ 가벼운 업무 (Shallow)</h3>
                <p className="text-sm text-gray-400 mb-4">점심 먹고 졸릴 때 한 번에 처리하세요.</p>
                <ul className="space-y-2">
                  {resultData.shallow?.map((task: string, i: number) => (
                    <li key={i} className="text-gray-600 flex items-center before:content-['•'] before:mr-2 before:text-blue-300">{task}</li>
                  ))}
                </ul>
              </motion.div>

              <motion.div variants={cardVariants} className="bg-white p-8 rounded-3xl shadow-sm border border-indigo-100">
                <h3 className="text-xl font-bold text-indigo-500 mb-2">🎧 깊은 몰입 (Deep)</h3>
                <p className="text-sm text-gray-400 mb-4">방해 금지 모드를 켜고 집중하세요.</p>
                <ul className="space-y-2">
                  {resultData.deep?.map((task: string, i: number) => (
                    <li key={i} className="text-gray-600 flex items-center before:content-['•'] before:mr-2 before:text-indigo-300">{task}</li>
                  ))}
                </ul>
              </motion.div>
            </div>

            <motion.div variants={cardVariants} className="bg-black p-8 rounded-3xl shadow-lg mt-2">
              <h3 className="text-xl font-bold text-green-400 mb-2">🐣 실행의 첫 걸음 (Micro)</h3>
              <p className="text-gray-400 mb-4 text-sm">막연한 목표를 AI가 쪼갰습니다. 당장 이것부터 하세요!</p>
              <ul className="space-y-2">
                {resultData.micro?.map((task: string, i: number) => (
                  <li key={i} className="text-lg text-white font-semibold">👉 {task}</li>
                ))}
              </ul>
            </motion.div>

            <motion.button
              variants={cardVariants}
              onClick={() => { setStep('input'); setDumpText(''); setResultData(null); }}
              className="mx-auto mt-6 px-6 py-3 text-gray-500 hover:text-black transition-colors underline underline-offset-4"
            >
              다시 쏟아내기
            </motion.button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}