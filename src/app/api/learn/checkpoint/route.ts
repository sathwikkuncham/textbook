import { NextRequest, NextResponse } from "next/server";
import {
  findCheckpoint,
  saveCheckpoint,
  saveReviewSchedule,
  logLearnerSignal,
} from "@/lib/db/repository";
import type {
  QuizQuestion,
  QuizAnswer,
  QuizResult,
  QuestionResult,
  LeitnerBox,
} from "@/lib/types/learning";
import { LEITNER_INTERVALS } from "@/lib/types/learning";

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export async function GET(request: NextRequest) {
  const topicId = request.nextUrl.searchParams.get("topicId");
  const moduleId = request.nextUrl.searchParams.get("moduleId");

  if (!topicId || !moduleId) {
    return NextResponse.json(
      { error: "topicId and moduleId are required" },
      { status: 400 }
    );
  }

  const checkpoint = await findCheckpoint(
    parseInt(topicId, 10),
    parseInt(moduleId, 10)
  );

  return NextResponse.json({ success: true, checkpoint });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { topicId, moduleId, answers, questions, passThreshold } = body as {
    topicId: number;
    moduleId: number;
    answers: QuizAnswer[];
    questions: QuizQuestion[];
    passThreshold: number;
  };

  if (!topicId || !moduleId || !answers || !questions) {
    return NextResponse.json(
      { error: "topicId, moduleId, answers, and questions are required" },
      { status: 400 }
    );
  }

  // Score each question
  const questionResults: QuestionResult[] = questions.map((q) => {
    const userAnswer = answers.find(
      (a) => a.questionNumber === q.question_number
    );
    const selected = userAnswer?.selectedAnswer?.trim() ?? "";
    const expected = q.expected_answer.trim();
    const isCorrect =
      selected.toUpperCase() === expected.toUpperCase();

    return {
      questionNumber: q.question_number,
      selectedAnswer: selected,
      expectedAnswer: expected,
      isCorrect,
      explanation: q.explanation,
      feedbackCorrect: q.feedback_correct,
      feedbackIncorrect: q.feedback_incorrect,
    };
  });

  const correctCount = questionResults.filter((r) => r.isCorrect).length;
  const score = Math.round((correctCount / questions.length) * 100);
  const passed = score >= (passThreshold ?? 70);

  // Load existing checkpoint for attempt tracking
  const existing = await findCheckpoint(topicId, moduleId);
  const attemptCount = (existing?.attemptCount ?? 0) + 1;
  const scoresHistory = [
    ...((existing?.scoresHistory as number[]) ?? []),
    score,
  ];

  // Save checkpoint
  await saveCheckpoint(topicId, moduleId, {
    passed,
    score,
    attemptCount,
    scoresHistory,
  });

  // If passed, schedule spaced repetition (Leitner box 1)
  if (passed) {
    const now = new Date();
    const box: LeitnerBox = 1;
    await saveReviewSchedule(topicId, moduleId, {
      boxNumber: box,
      nextReviewDate: addDays(now, LEITNER_INTERVALS[box]),
      lastReviewDate: now,
      lastScore: score,
      reviewHistory: [{ date: now.toISOString(), score }],
    });
  }

  const result: QuizResult = {
    topicId,
    moduleId,
    score,
    passed,
    passThreshold: passThreshold ?? 70,
    attemptNumber: attemptCount,
    questionResults,
  };

  // Log signal for learner model
  logLearnerSignal({
    topicId,
    moduleId,
    signalType: passed ? "quiz_completed" : "quiz_failed",
    data: { score, passed, attemptCount },
  }).catch(console.error);

  // Trigger learner model update (fire-and-forget)
  fetch(`${request.nextUrl.origin}/api/learn/learner-model`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topicId }),
  }).catch(console.error);

  return NextResponse.json({ success: true, result });
}
