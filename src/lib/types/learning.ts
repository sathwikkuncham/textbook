export interface FoundationalConcept {
  name: string;
  description: string;
  prerequisites: string[];
  complexity_tier?: string;
}

export interface Misconception {
  misconception?: string;
  belief?: string;
  reality: string;
  why_it_persists?: string;
  correct_understanding?: string;
}

export interface ResearchFoundations {
  foundational_concepts: FoundationalConcept[];
  dependency_graph?: Record<string, string[]>;
  prerequisites?: {
    hard_prerequisites: string[];
    soft_prerequisites: string[];
  };
  misconceptions: Misconception[];
  difficulty_progression?: string[];
}

export interface Application {
  domain: string;
  description: string;
  example: string;
}

export interface Analogy {
  concept: string;
  analogy: string;
  why_it_works: string;
}

export interface WorkedExample {
  concept: string;
  example: string;
  step_by_step: string;
}

export interface Resource {
  title: string;
  url: string;
  type: string;
  quality_notes: string;
}

export interface ResearchApplications {
  applications: Application[];
  analogies: Analogy[];
  worked_examples: WorkedExample[];
  resources: Resource[];
}

export interface ResearchCache {
  foundations: ResearchFoundations;
  applications: ResearchApplications;
}

export interface LearnerIntentProfile {
  sourceType: string;
  purpose: string;
  priorKnowledge: string;
  desiredDepth: string;
  timeAvailable: string;
  focusAreas: string[];
  rawTranscript: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface Subtopic {
  id: string;
  title: string;
  estimated_minutes: number;
  key_concepts: string[];
  teaching_approach: "first-principles" | "analogy-driven" | "example-first" | "visual";
}

export interface Checkpoint {
  type: "quiz";
  num_questions: number;
  pass_threshold: number;
  question_types: string[];
}

export interface Module {
  id: number;
  title: string;
  estimated_minutes: number;
  description: string;
  subtopics: Subtopic[];
  checkpoint: Checkpoint;
}

export interface Curriculum {
  topic: string;
  topic_slug: string;
  level: "beginner" | "intermediate" | "advanced";
  goal: string;
  estimated_total_minutes: number;
  modules: Module[];
}

export interface SubtopicProgress {
  title: string;
  status: "completed" | "in_progress" | "locked";
  completed_at?: string;
}

export interface ModuleProgress {
  title: string;
  subtopics: Record<string, SubtopicProgress>;
  checkpoint?: {
    passed: boolean;
    score: number;
    attempt_count: number;
    scores_history: number[];
  };
}

export interface SpacedRepetition {
  box_number: number;
  next_review_date: string;
  last_review_date: string;
  last_score: number;
  review_history: Array<{ date: string; score: number }>;
}

export interface Progress {
  topic: string;
  started_at: string;
  last_session: string;
  current_module: number;
  current_subtopic: number;
  total_time_minutes: number;
  modules: Record<string, ModuleProgress>;
  spaced_repetition: Record<string, SpacedRepetition>;
}

export interface TopicIndex {
  display_name: string;
  started_at: string;
  last_session: string;
  completion_percent: number;
  total_modules: number;
  current_module: number;
}

export interface MasterIndex {
  topics: Record<string, TopicIndex>;
}

export interface QuizQuestion {
  question_number: number;
  question_text: string;
  question_type:
    | "conceptual"
    | "application"
    | "true_false"
    | "compare_contrast"
    | "scenario_analysis";
  bloom_level?: "understand" | "apply" | "analyze" | "evaluate";
  options?: string[];
  expected_answer: string;
  explanation: string;
  feedback_correct?: string;
  feedback_incorrect?: string;
  difficulty?: "easy" | "medium" | "hard";
  concepts_tested?: string[];
  common_wrong_answers?: Array<{ answer: string; why_wrong: string }>;
}

export interface QuizAnswer {
  questionNumber: number;
  selectedAnswer: string;
}

export interface QuestionResult {
  questionNumber: number;
  selectedAnswer: string;
  expectedAnswer: string;
  isCorrect: boolean;
  explanation: string;
  feedbackCorrect?: string;
  feedbackIncorrect?: string;
}

export interface QuizResult {
  topicId: number;
  moduleId: number;
  score: number;
  passed: boolean;
  passThreshold: number;
  attemptNumber: number;
  questionResults: QuestionResult[];
}

export type LeitnerBox = 1 | 2 | 3 | 4 | 5;

export const LEITNER_INTERVALS: Record<LeitnerBox, number> = {
  1: 1,
  2: 3,
  3: 7,
  4: 14,
  5: 30,
};

export type SourceType = "topic_only" | "pdf" | "url" | "markdown";

export interface TocSection {
  id: string;
  title: string;
  pageStart: number;
  pageEnd: number;
  depth: number;
}

export interface TocChapter {
  id: string;
  title: string;
  pageStart: number;
  pageEnd: number;
  sections: TocSection[];
}

export interface SourceToc {
  title: string;
  author?: string;
  totalPages?: number;
  chapters: TocChapter[];
}

export interface PageCalibration {
  pdfPageOffset: number;
  anchors: Array<{
    printedPage: number;
    pdfIndex: number;
  }>;
  totalPdfPages: number;
}

export interface UserScopeSelection {
  included: string[];
  excluded: string[];
  priorities: Record<string, "normal" | "skip" | "deep">;
}

export interface ScopingInput {
  topic: string;
  level: "beginner" | "intermediate" | "advanced";
  goal: string;
  timeCommitment: "quick" | "standard" | "deep";
  interests?: string;
  sourceType?: SourceType;
  sourcePath?: string;
}

export function generateSlug(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}
