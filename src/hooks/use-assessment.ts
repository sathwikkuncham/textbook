"use client";

import { useState, useCallback } from "react";
import type { QuizQuestion, QuizResult } from "@/lib/types/learning";

export type AssessmentMode = "idle" | "loading" | "quiz" | "results" | "review";

interface AssessmentState {
  mode: AssessmentMode;
  moduleId: number | null;
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  answers: Map<number, string>;
  result: QuizResult | null;
  isSubmitting: boolean;
  error: string | null;
  isReview: boolean;
}

const INITIAL_STATE: AssessmentState = {
  mode: "idle",
  moduleId: null,
  questions: [],
  currentQuestionIndex: 0,
  answers: new Map(),
  result: null,
  isSubmitting: false,
  error: null,
  isReview: false,
};

export function useAssessment(
  topicId: number | null,
  topic: string | null
) {
  const [state, setState] = useState<AssessmentState>(INITIAL_STATE);

  const startQuiz = useCallback(
    async (moduleId: number) => {
      if (!topicId || !topic) return;

      setState({
        ...INITIAL_STATE,
        mode: "loading",
        moduleId,
      });

      try {
        const res = await fetch("/api/learn/assess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, moduleId }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        setState((prev) => ({
          ...prev,
          mode: "quiz",
          questions: data.questions,
          currentQuestionIndex: 0,
          answers: new Map(),
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          mode: "idle",
          error:
            err instanceof Error ? err.message : "Failed to load quiz",
        }));
      }
    },
    [topicId, topic]
  );

  const startReview = useCallback(
    async (moduleId: number) => {
      if (!topicId || !topic) return;

      setState({
        ...INITIAL_STATE,
        mode: "loading",
        moduleId,
        isReview: true,
      });

      try {
        const res = await fetch("/api/learn/assess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, moduleId }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        setState((prev) => ({
          ...prev,
          mode: "review",
          questions: data.questions,
          currentQuestionIndex: 0,
          answers: new Map(),
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          mode: "idle",
          error:
            err instanceof Error ? err.message : "Failed to load review",
        }));
      }
    },
    [topicId, topic]
  );

  const selectAnswer = useCallback(
    (questionNumber: number, answer: string) => {
      setState((prev) => {
        const newAnswers = new Map(prev.answers);
        newAnswers.set(questionNumber, answer);
        return { ...prev, answers: newAnswers };
      });
    },
    []
  );

  const navigateQuestion = useCallback(
    (direction: "prev" | "next") => {
      setState((prev) => {
        const newIndex =
          direction === "next"
            ? Math.min(prev.currentQuestionIndex + 1, prev.questions.length - 1)
            : Math.max(prev.currentQuestionIndex - 1, 0);
        return { ...prev, currentQuestionIndex: newIndex };
      });
    },
    []
  );

  const goToQuestion = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      currentQuestionIndex: Math.max(
        0,
        Math.min(index, prev.questions.length - 1)
      ),
    }));
  }, []);

  const submitQuiz = useCallback(
    async (passThreshold: number) => {
      if (!topicId || !state.moduleId) return;

      setState((prev) => ({ ...prev, isSubmitting: true }));

      try {
        const answersArray = Array.from(state.answers.entries()).map(
          ([questionNumber, selectedAnswer]) => ({
            questionNumber,
            selectedAnswer,
          })
        );

        const res = await fetch("/api/learn/checkpoint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topicId,
            moduleId: state.moduleId,
            answers: answersArray,
            questions: state.questions,
            passThreshold,
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        setState((prev) => ({
          ...prev,
          mode: "results",
          result: data.result,
          isSubmitting: false,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isSubmitting: false,
          error:
            err instanceof Error ? err.message : "Failed to submit quiz",
        }));
      }
    },
    [topicId, state.moduleId, state.answers, state.questions]
  );

  const submitReview = useCallback(async () => {
    if (!topicId || !state.moduleId) return;

    setState((prev) => ({ ...prev, isSubmitting: true }));

    try {
      // Score locally for review
      const correctCount = state.questions.filter((q) => {
        const answer = state.answers.get(q.question_number);
        return (
          answer?.trim().toUpperCase() ===
          q.expected_answer.trim().toUpperCase()
        );
      }).length;

      const score = Math.round(
        (correctCount / state.questions.length) * 100
      );
      const passed = score >= 70;

      // Submit review result for Leitner box update
      const reviewRes = await fetch("/api/learn/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId,
          moduleId: state.moduleId,
          score,
          passed,
        }),
      });
      const reviewData = await reviewRes.json();
      if (!reviewData.success) throw new Error("Review submission failed");

      // Build question results for display
      const questionResults = state.questions.map((q) => {
        const selected = state.answers.get(q.question_number) ?? "";
        return {
          questionNumber: q.question_number,
          selectedAnswer: selected,
          expectedAnswer: q.expected_answer,
          isCorrect:
            selected.trim().toUpperCase() ===
            q.expected_answer.trim().toUpperCase(),
          explanation: q.explanation,
          feedbackCorrect: q.feedback_correct,
          feedbackIncorrect: q.feedback_incorrect,
        };
      });

      setState((prev) => ({
        ...prev,
        mode: "results",
        result: {
          topicId,
          moduleId: prev.moduleId!,
          score,
          passed,
          passThreshold: 70,
          attemptNumber: 0,
          questionResults,
        },
        isSubmitting: false,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        error:
          err instanceof Error ? err.message : "Failed to submit review",
      }));
    }
  }, [topicId, state.moduleId, state.answers, state.questions]);

  const retryQuiz = useCallback(() => {
    setState((prev) => ({
      ...prev,
      mode: prev.isReview ? "review" : "quiz",
      currentQuestionIndex: 0,
      answers: new Map(),
      result: null,
      isSubmitting: false,
      error: null,
    }));
  }, []);

  const dismiss = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    mode: state.mode,
    moduleId: state.moduleId,
    questions: state.questions,
    currentQuestionIndex: state.currentQuestionIndex,
    answers: state.answers,
    result: state.result,
    isSubmitting: state.isSubmitting,
    error: state.error,
    isReview: state.isReview,
    startQuiz,
    startReview,
    selectAnswer,
    navigateQuestion,
    goToQuestion,
    submitQuiz,
    submitReview,
    retryQuiz,
    dismiss,
  };
}
