'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ZzwarakInput() {
  const [dumpText, setDumpText] = useState('');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-10">

      {/* 타이틀 영역 */}
      <h1 className="text-4xl text-gray-800 mb-3 font-extrabold tracking-tight">
        쫘라락
      </h1>
      <p className="text-lg text-gray-400 mb-10 font-light text-center">
        형식은 필요 없습니다. 엔터로 구분해서 머릿속을 전부 쏟아내세요.
      </p>

      {/* 거대한 덤프 박스 (Textarea) */}
      <motion.div
        className="w-full max-w-2xl bg-white rounded-3xl shadow-sm border border-gray-200 p-8 transition-shadow focus-within:shadow-md focus-within:border-gray-300"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <textarea
          value={dumpText}
          onChange={(e) => setDumpText(e.target.value)}
          placeholder={`예시) \n기말 보고서 서론 쓰기 \n김대리한테 메일 회신 \n쿠팡에서 휴지 사기 \n스페인어 공부 시작...`}
          className="w-full h-80 text-xl bg-transparent outline-none resize-none leading-relaxed text-gray-700 placeholder-gray-300"
          autoFocus
        />
      </motion.div>

      {/* 매직 버튼 (글자가 한 글자라도 입력되면 등장) */}
      <AnimatePresence>
        {dumpText.trim().length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-12 px-10 py-5 bg-black text-white rounded-full text-xl font-bold shadow-2xl hover:scale-105 transition-transform"
          >
            ✨ 쫘라락 정리하기
          </motion.button>
        )}
      </AnimatePresence>

    </div>
  );
}