"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { QuizQuestion } from "@/lib/types/learning";

// ── Progress Dots ──────────────────────────────────────

interface QuizProgressDotsProps {
  total: number;
  current: number;
  answered: Set<number>;
  onGoTo: (index: number) => void;
}

function QuizProgressDots({
  total,
  current,
  answered,
  onGoTo,
}: QuizProgressDotsProps) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => {
        const isCurrent = i === current;
        const isAnswered = answered.has(i);
        return (
          <button
            key={i}
            onClick={() => onGoTo(i)}
            className={`size-2.5 rounded-full transition-all ${
              isCurrent
                ? "scale-125 bg-primary ring-2 ring-primary/30"
                : isAnswered
                  ? "bg-primary/60"
                  : "bg-muted-foreground/30"
            }`}
            aria-label={`Question ${i + 1}`}
          />
        );
      })}
    </div>
  );
}

// ── Question Card ──────────────────────────────────────

interface QuizQuestionCardProps {
  question: QuizQuestion;
  selectedAnswer: string | undefined;
  onSelectAnswer: (answer: string) => void;
}

function QuizQuestionCard({
  question,
  selectedAnswer,
  onSelectAnswer,
}: QuizQuestionCardProps) {
  if (question.question_type === "true_false") {
    return (
      <div className="mt-6 flex gap-4">
        {["True", "False"].map((opt) => {
          const letter = opt === "True" ? "True" : "False";
          const isSelected = selectedAnswer === letter;
          return (
            <button
              key={opt}
              onClick={() => onSelectAnswer(letter)}
              className={`flex-1 rounded-lg border-2 p-6 text-center text-base font-medium transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-muted/50"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    );
  }

  // MCQ options
  const options = question.options ?? [];

  return (
    <div className="mt-6 space-y-3">
      {options.map((opt) => {
        const colonIndex = opt.indexOf(": ");
        const letter = colonIndex > 0 ? opt.substring(0, colonIndex) : opt;
        const text = colonIndex > 0 ? opt.substring(colonIndex + 2) : opt;
        const isSelected = selectedAnswer === letter;

        return (
          <button
            key={opt}
            onClick={() => onSelectAnswer(letter)}
            className={`flex w-full items-start gap-3 rounded-lg border-2 p-4 text-left transition-all ${
              isSelected
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-primary/40 hover:bg-muted/50"
            }`}
          >
            <span
              className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold ${
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {letter}
            </span>
            <span className="text-sm leading-relaxed text-foreground/90">
              {text}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Quiz Player ────────────────────────────────────────

interface QuizPlayerProps {
  questions: QuizQuestion[];
  currentIndex: number;
  answers: Map<number, string>;
  isReview: boolean;
  isSubmitting: boolean;
  onSelectAnswer: (questionNumber: number, answer: string) => void;
  onNavigate: (direction: "prev" | "next") => void;
  onGoToQuestion: (index: number) => void;
  onSubmit: () => void;
}

export function QuizPlayer({
  questions,
  currentIndex,
  answers,
  isReview,
  isSubmitting,
  onSelectAnswer,
  onNavigate,
  onGoToQuestion,
  onSubmit,
}: QuizPlayerProps) {
  const question = questions[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === questions.length - 1;
  const allAnswered = questions.every((q) => answers.has(q.question_number));

  const answeredIndices = useMemo(() => {
    const set = new Set<number>();
    questions.forEach((q, i) => {
      if (answers.has(q.question_number)) set.add(i);
    });
    return set;
  }, [questions, answers]);

  if (!question) return null;

  const bloomLabel = question.bloom_level
    ? question.bloom_level.charAt(0).toUpperCase() +
      question.bloom_level.slice(1)
    : null;

  const difficultyColors: Record<string, string> = {
    easy: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    medium:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    hard: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            {isReview ? "Review" : "Quiz"}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Question {currentIndex + 1} of {questions.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {bloomLabel && (
            <Badge variant="secondary" className="text-xs">
              {bloomLabel}
            </Badge>
          )}
          {question.difficulty && (
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                difficultyColors[question.difficulty] ?? ""
              }`}
            >
              {question.difficulty}
            </span>
          )}
        </div>
      </div>

      {/* Progress Dots */}
      <div className="flex justify-center">
        <QuizProgressDots
          total={questions.length}
          current={currentIndex}
          answered={answeredIndices}
          onGoTo={onGoToQuestion}
        />
      </div>

      {/* Question */}
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-base leading-relaxed text-foreground">
          {question.question_text}
        </p>
        <QuizQuestionCard
          question={question}
          selectedAnswer={answers.get(question.question_number)}
          onSelectAnswer={(answer) =>
            onSelectAnswer(question.question_number, answer)
          }
        />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate("prev")}
          disabled={isFirst}
          className="gap-1"
        >
          <ChevronLeft className="size-4" />
          Previous
        </Button>

        {isLast && allAnswered ? (
          <Button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="gap-2"
          >
            <Send className="size-4" />
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate("next")}
            disabled={isLast}
            className="gap-1"
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
