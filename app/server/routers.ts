import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  ai: router({
    explainConcept: publicProcedure
      .input(z.object({
        concept: z.object({
          title: z.string().min(1).max(120),
          subject: z.string().min(1).max(80),
          theory: z.string().min(1).max(500),
          keywords: z.array(z.string()).min(1).max(8),
        }),
      }))
      .mutation(async ({ input }) => {
        try {
          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: "당신은 한국 사회복지·행정법 시험의 친절한 AI 튜터입니다. 수험생이 처음 배우는 상황이라고 가정하고 전문용어를 쉬운 말로 풀어 설명하세요. 입력된 이론을 벗어나 새로운 법령·수치·출처를 지어내지 마세요. 생활 속 비유나 짧은 사례를 활용하되 시험에 필요한 정확성은 유지하세요. 반드시 JSON 스키마만 출력하세요.",
              },
              {
                role: "user",
                content: JSON.stringify({
                  개념명: input.concept.title,
                  과목: input.concept.subject,
                  기존이론: input.concept.theory,
                  핵심키워드: input.concept.keywords,
                }),
              },
            ],
            reasoning: { effort: "low" },
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "concept_easy_explanation",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    oneLine: { type: "string", description: "개념을 초보자도 이해할 한 문장" },
                    easyExplanation: { type: "string", description: "전문용어를 풀어 쓴 2~4문장 설명" },
                    example: { type: "string", description: "현실 또는 시험형 짧은 사례" },
                    distinction: { type: "string", description: "헷갈리기 쉬운 인접 개념과 구별법" },
                    memoryTip: { type: "string", description: "시험 직전 기억할 암기 문장" },
                    checkPoints: { type: "array", minItems: 2, maxItems: 3, items: { type: "string" }, description: "문제를 풀 때 확인할 포인트" },
                  },
                  required: ["oneLine", "easyExplanation", "example", "distinction", "memoryTip", "checkPoints"],
                  additionalProperties: false,
                },
              },
            },
          });
          const content = response.choices[0]?.message?.content;
          const text = typeof content === "string"
            ? content
            : Array.isArray(content)
              ? content.filter((part) => part.type === "text").map((part) => part.text).join("\n")
              : "";
          if (!text) throw new Error("Empty AI response");
          return JSON.parse(text) as {
            oneLine: string;
            easyExplanation: string;
            example: string;
            distinction: string;
            memoryTip: string;
            checkPoints: string[];
          };
        } catch (error) {
          console.error("[AI concept explanation] Failed:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI 개념 설명을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요." });
        }
      }),
    explainQuestion: publicProcedure
      .input(z.object({
        question: z.object({
          exam: z.string(),
          subject: z.string(),
          q: z.string(),
          choices: z.array(z.string()).min(2).max(6),
          answer: z.number().int().min(0).max(5),
          explain: z.string(),
          keyword: z.string(),
          era: z.string().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        const { question } = input;
        try {
          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: "당신은 한국 공무원·사회복지 시험 전문 튜터입니다. 주어진 문항만 근거로 정확하고 친절하게 설명하세요. 학습자가 왜 헷갈렸는지 짚고, 시험에서 다시 만날 수 있는 관련 개념과 암기 팁을 제시하세요. 법령·연도·수치처럼 확실하지 않은 내용은 단정하지 말고 주어진 문항의 범위를 벗어나지 마세요. 출력은 반드시 JSON 스키마를 지키세요.",
              },
              {
                role: "user",
                content: JSON.stringify({
                  시험: question.exam,
                  과목: question.subject,
                  문제: question.q,
                  보기: question.choices,
                  정답번호: question.answer,
                  기존해설: question.explain,
                  핵심키워드: question.keyword,
                  시대: question.era,
                }),
              },
            ],
            reasoning: { effort: "low" },
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "wrong_answer_explanation",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    summary: { type: "string", description: "문제의 핵심을 한 문장으로 정리" },
                    whyCorrect: { type: "string", description: "정답이 맞는 이유를 단계적으로 설명" },
                    choiceExplanations: { type: "array", items: { type: "string" }, description: "보기 순서와 같은 순서의 오답·정답 판별 설명" },
                    relatedConcepts: {
                      type: "array",
                      minItems: 2,
                      maxItems: 4,
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          explanation: { type: "string" },
                        },
                        required: ["title", "explanation"],
                        additionalProperties: false,
                      },
                    },
                    memoryTip: { type: "string", description: "시험 직전 떠올릴 짧은 암기 팁" },
                    nextSteps: { type: "array", minItems: 2, maxItems: 3, items: { type: "string" } },
                  },
                  required: ["summary", "whyCorrect", "choiceExplanations", "relatedConcepts", "memoryTip", "nextSteps"],
                  additionalProperties: false,
                },
              },
            },
          });

          const content = response.choices[0]?.message?.content;
          const text = typeof content === "string"
            ? content
            : Array.isArray(content)
              ? content.filter((part) => part.type === "text").map((part) => part.text).join("\n")
              : "";
          if (!text) throw new Error("Empty AI response");
          return JSON.parse(text) as {
            summary: string;
            whyCorrect: string;
            choiceExplanations: string[];
            relatedConcepts: { title: string; explanation: string }[];
            memoryTip: string;
            nextSteps: string[];
          };
        } catch (error) {
          console.error("[AI explanation] Failed to generate explanation:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI 해설을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요." });
        }
      }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
