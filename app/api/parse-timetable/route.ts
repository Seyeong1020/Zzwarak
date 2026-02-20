import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

export async function POST(req: Request) {
    try {
        const { imageBase64, mimeType } = await req.json();

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `
이 이미지는 대학교 시간표야.
시간표를 꼼꼼히 분석해서 수업이 없는 빈 시간대를 찾아줘.

규칙:
1. 오전 9시 ~ 오후 10시 사이의 시간만 고려해.
2. 이미 수업이 있는 시간대는 제외해.
3. 빈 시간대 중에서 연속된 1시간 이상인 블록을 찾아줘.
4. 각 요일(월~금)별로 빈 블록 목록을 만들어줘.

아래 JSON 형식으로만 응답해:
{
  "freeHours": 숫자 (하루 평균 빈 시간, 정수 또는 .5 단위),
  "totalFreeMinutes": 숫자 (주간 총 빈 시간, 분 단위),
  "slots": [
    { "day": "월", "start": "10:00", "end": "12:00", "label": "월요일 10시-12시" },
    ...
  ],
  "summary": "시간표 요약 (예: 월·수·금 오전 자유, 화·목 오후 공강 2시간)"
}
    `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: mimeType || 'image/jpeg',
                    data: imageBase64,
                },
            },
        ]);

        const text = result.response.text();
        // JSON 부분만 추출
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('JSON not found in response');

        return NextResponse.json(JSON.parse(jsonMatch[0]));
    } catch (error) {
        console.error('[parse-timetable]', error);
        return NextResponse.json(
            { error: '시간표 분석에 실패했어요. 이미지를 다시 확인해주세요.' },
            { status: 500 }
        );
    }
}
