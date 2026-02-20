import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

export async function POST(req: Request) {
    try {
        const { text, freeHours = 3 } = await req.json();
        const totalMinutes = Math.round(freeHours * 60);

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: { responseMimeType: 'application/json' },
        });

        const prompt = `
너는 생산성 심리학 전문가이자 천재 비서야.
사용자가 Brain Dump로 할 일들을 쏟아냈어. 오늘 자유 시간은 ${freeHours}시간(${totalMinutes}분)이야.

아래 JSON 형식으로 정확하게 분석해줘.

[분류 기준]
1. top3: 지금 당장 가장 중요/긴급한 일 3가지 (완결된 문장, 간결하게)
2. shallow: 뇌를 적게 쓰는 단순 잡무/심부름
3. deep: 깊은 집중이 필요한 중요한 작업
4. micro: 막연한 목표를 지금 당장 실행 가능한 아주 작은 첫 행동 1개로 쪼갠 것
5. timeblocks: 오늘 ${freeHours}시간 배분. 각 블록은 { "label": string, "minutes": number }. 총합이 정확히 ${totalMinutes}분. 2~4개 블록.
6. groups: 비슷한 태스크를 카테고리로 묶어줘. 유사성 기준: 같은 과목/프로젝트, 같은 종류의 행동(구매, 연락, 공부 등).
   각 그룹: { "category": string, "emoji": string, "tasks": string[], "tip": string }
   - category: 그룹 이름 (예: "코딩 과제", "행정 잡무", "건강/운동")
   - emoji: 그룹을 대표하는 이모지 1개
   - tasks: 이 그룹에 속하는 원래 입력의 태스크들
   - tip: 이 그룹을 처리하는 데 도움이 되는 심리/생산성 팁 1줄 (한국어)
7. sequence: 심리학적으로 최적화된 오늘의 실행 순서. "워밍업 → 딥포커스 → 마무리" 패턴.
   배열 형태로 각 단계: { "phase": string, "tasks": string[], "reason": string }
   - phase: 단계 이름 (예: "워밍업", "딥포커스", "마무리")  
   - tasks: 이 단계에서 할 태스크들
   - reason: 이 단계에 이 태스크를 배치한 이유 (1줄, 한국어, 심리학/생산성 근거 포함)

심리학 원칙 참고:
- 워밍업: 작은 성취감으로 도파민 확보, 뇌를 깨우기
- 딥포커스: 인지 자원이 최대일 때 어려운 것 처리 (보통 오전/오후 초반)
- 마무리: 에너지가 낮을 때 처리할 수 있는 것들, 내일 준비

JSON 형식 (이 형식만 정확히 지켜):
{
  "top3": ["...", "...", "..."],
  "shallow": ["...", "..."],
  "deep": ["...", "..."],
  "micro": ["..."],
  "timeblocks": [{ "label": "...", "minutes": 0 }],
  "groups": [{ "category": "...", "emoji": "...", "tasks": ["..."], "tip": "..." }],
  "sequence": [{ "phase": "워밍업", "tasks": ["..."], "reason": "..." }]
}

사용자 입력:
"""
${text}
"""
    `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        return NextResponse.json(JSON.parse(responseText));
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'AI 분석 중 에러가 발생했습니다.' }, { status: 500 });
    }
}