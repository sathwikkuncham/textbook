"use client";

import { useState } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuizPlayer } from "./quiz-player";
import type { useAssessment } from "@/hooks/use-assessment";
import type { QuizQuestion, QuestionResult } from "@/lib/types/learning";

// ── Loading State ──────────────────────────────────────

function QuizLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <Loader2 className="size-8 animate-spin text-primary" />
      <p className="mt-4 text-sm text-muted-foreground">
        Preparing your checkpoint quiz...
      </p>
    </div>
  );
}

// ── Result Question Review ─────────────────────────────

interface QuestionReviewItemProps {
  question: QuizQuestion;
  result: QuestionResult;
}

function QuestionReviewItem({ question, result }: QuestionReviewItemProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-lg"
      >
        {result.isCorrect ? (
          <CheckCircle2 className="size-5 shrink-0 text-green-600 dark:text-green-400" />
        ) : (
          <XCircle className="size-5 shrink-0 text-red-500" />
        )}
        <span className="flex-1 text-sm text-foreground">
          <span className="font-medium">Q{result.questionNumber}.</span>{" "}
          {question.question_text.length > 100
            ? question.question_text.slice(0, 100) + "..."
            : question.question_text}
        </span>
        {expanded ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          <p className="mb-3 text-sm text-foreground">
            {question.question_text}
          </p>

          {/* Options with correct/incorrect highlighting */}
          {question.options && (
            <div className="mb-4 space-y-2">
              {question.options.map((opt) => {
                const colonIndex = opt.indexOf(": ");
                const letter =
                  colonIndex > 0 ? opt.substring(0, colonIndex) : opt;
                const isCorrectOption =
                  letter.toUpperCase() ===
                  result.expectedAnswer.toUpperCase();
                const isSelectedOption =
                  letter.toUpperCase() ===
                  result.selectedAnswer.toUpperCase();
                const isWrongSelection =
                  isSelectedOption && !result.isCorrect;

                return (
                  <div
                    key={opt}
                    className={`rounded-md border px-3 py-2 text-sm ${
                      isCorrectOption
                        ? "border-green-300 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-900/20 dark:text-green-300"
                        : isWrongSelection
                          ? "border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300"
                          : "border-border text-muted-foreground"
                    }`}
                  >
                    {opt}
                    {isCorrectOption && (
                      <span className="ml-2 text-xs font-medium">
                        (correct)
                      </span>
                    )}
                    {isWrongSelection && (
                      <span className="ml-2 text-xs font-medium">
                        (your answer)
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Explanation */}
          <div className="rounded-md bg-muted/50 p-3">
            <p className="text-xs font-medium text-muted-foreground">
              Explanation
            </p>
            <p className="mt-1 text-sm leading-relaxed text-foreground/90">
              {result.explanation}
            </p>
          </div>

          {/* Feedback */}
          {result.isCorrect && result.feedbackCorrect && (
            <div className="mt-2 rounded-md bg-green-50 p-3 dark:bg-green-900/10">
              <p className="text-sm text-green-800 dark:text-green-300">
                {result.feedbackCorrect}
              </p>
            </div>
          )}
          {!result.isCorrect && result.feedbackIncorrect && (
            <div className="mt-2 rounded-md bg-red-50 p-3 dark:bg-red-900/10">
              <p className="text-sm text-red-800 dark:text-red-300">
                {result.feedbackIncorrect}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Results View ───────────────────────────────────────

interface QuizResultsProps {
  assessment: ReturnType<typeof useAssessment>;
  questions: QuizQuestion[];
  moduleTitle: string;
  onRetry: () => void;
  onNextModule: () => void;
  onDismiss: () => void;
}

function QuizResults({
  assessment,
  questions,
  moduleTitle,
  onRetry,
  onNextModule,
  onDismiss,
}: QuizResultsProps) {
  const result = assessment.result;
  if (!result) return null;

  const correctCount = result.questionResults.filter(
    (r) => r.isCorrect
  ).length;

  return (
    <div className="space-y-6">
      {/* Score Header */}
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <div
          className={`mx-auto mb-3 flex size-20 items-center justify-center rounded-full ${
            result.passed
              ? "bg-green-100 dark:bg-green-900/30"
              : "bg-red-100 dark:bg-red-900/30"
          }`}
        >
          <span
            className={`text-3xl font-bold ${
              result.passed
                ? "text-green-700 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {result.score}%
          </span>
        </div>

        <Badge
          variant={result.passed ? "default" : "destructive"}
          className="mb-2"
        >
          {result.passed ? "Passed" : "Not Passed"}
        </Badge>

        <p className="text-sm text-muted-foreground">
          {correctCount} of {questions.length} correct
          {result.attemptNumber > 0 && (
            <> &middot; Attempt {result.attemptNumber}</>
          )}
        </p>

        {result.passed ? (
          <p className="mt-3 text-sm text-foreground">
            Excellent work on <span className="font-medium">{moduleTitle}</span>
            ! This module is now scheduled for spaced repetition review.
          </p>
        ) : (
          <p className="mt-3 text-sm text-foreground">
            You need {result.passThreshold}% to pass. Review the material
            and try again.
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {result.passed ? (
          <>
            <Button onClick={onNextModule} className="gap-2">
              <ArrowRight className="size-4" />
              Continue to Next Module
            </Button>
            <Button variant="outline" onClick={onDismiss}>
              Back to Content
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onRetry} className="gap-2">
              <RotateCcw className="size-4" />
              Try Again
            </Button>
            <Button variant="outline" onClick={onDismiss} className="gap-2">
              <BookOpen className="size-4" />
              Review Material
            </Button>
          </>
        )}
      </div>

      {/* Per-Question Review */}
      <div>
        <h3 className="mb-3 font-serif text-base font-semibold text-foreground">
          Question Review
        </h3>
        <div className="space-y-2">
          {result.questionResults.map((qr) => {
            const question = questions.find(
              (q) => q.question_number === qr.questionNumber
            );
            if (!question) return null;
            return (
              <QuestionReviewItem
                key={qr.questionNumber}
                question={question}
                result={qr}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Quiz Shell ─────────────────────────────────────────

interface QuizShellProps {
  assessment: ReturnType<typeof useAssessment>;
  moduleTitle: string;
  passThreshold: number;
  onDismiss: () => void;
  onNextModule: () => void;
}

export function QuizShell({
  assessment,
  moduleTitle,
  passThreshold,
  onDismiss,
  onNextModule,
}: QuizShellProps) {
  if (assessment.mode === "loading") {
    return <QuizLoading />;
  }

  if (assessment.mode === "quiz" || assessment.mode === "review") {
    return (
      <>
        <div className="mb-4">
          <h2 className="font-serif text-xl font-bold text-foreground">
            {assessment.isReview ? "Review: " : "Checkpoint: "}
            {moduleTitle}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {assessment.isReview
              ? "Review this module to strengthen your understanding."
              : `Score ${passThreshold}% or higher to pass and unlock the next module.`}
          </p>
        </div>
        <QuizPlayer
          questions={assessment.questions}
          currentIndex={assessment.currentQuestionIndex}
          answers={assessment.answers}
          isReview={assessment.isReview}
          isSubmitting={assessment.isSubmitting}
          onSelectAnswer={assessment.selectAnswer}
          onNavigate={assessment.navigateQuestion}
          onGoToQuestion={assessment.goToQuestion}
          onSubmit={() =>
            assessment.isReview
              ? assessment.submitReview()
              : assessment.submitQuiz(passThreshold)
          }
        />
      </>
    );
  }

  if (assessment.mode === "results") {
    return (
      <QuizResults
        assessment={assessment}
        questions={assessment.questions}
        moduleTitle={moduleTitle}
        onRetry={assessment.retryQuiz}
        onNextModule={onNextModule}
        onDismiss={onDismiss}
      />
    );
  }

  return null;
}
