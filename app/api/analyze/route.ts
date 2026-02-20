import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// 발급받은 키를 가져옵니다
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

export async function POST(req: Request) {
    try {
        const { text } = await req.json();

        // 가장 빠르고 가벼운 모델인 1.5-flash 사용 (JSON 형태로만 답변하도록 강제)
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `
      너는 천재적인 생산성 비서야. 
      사용자가 머릿속에 있는 할 일과 생각들을 무작위로 쏟아냈어. 
      이 텍스트를 분석해서 아래 JSON 형식으로 완벽하게 분류해줘.
      
      [분류 기준]
      1. top3: 지금 당장 해야 할 가장 중요하고 긴급한 일 3가지 (문장으로 정리)
      2. shallow: 뇌를 적게 쓰는 단순 잡무나 심부름 (예: 이메일 회신, 물건 사기)
      3. deep: 깊은 집중이 필요한 무거운 작업 (예: 기획안 작성, 공부)
      4. micro: 너무 막연해서 미루기 쉬운 목표를, 지금 당장 실행할 수 있는 아주 작은 행동 1개로 쪼갠 것 (예: "스페인어 공부" -> "듀오링고 앱 설치하기")

      사용자 입력:
      """
      ${text}
      """
      
      반드시 JSON 형식으로만 응답해.
    `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // AI가 준 JSON 데이터를 프론트엔드로 보내줍니다!
        return NextResponse.json(JSON.parse(responseText));

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'AI 분석 중 에러가 발생했습니다.' }, { status: 500 });
    }
}