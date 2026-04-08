import { useState, useCallback, useEffect, useRef } from "react";
import type { Curriculum, Module } from "@/lib/types/learning";

export type LearningPhase =
  | "idle"
  | "scoping"
  | "researching"
  | "designing"
  | "learning"
  | "assessing";

export interface TopicSummary {
  id: number;
  slug: string;
  displayName: string;
  level: string;
  goal: string;
  totalModules: number;
  estimatedMinutes: number;
  completionPercent: number;
  lastSession: string;
}

interface LearningState {
  phase: LearningPhase;
  topic: string | null;
  topicSlug: string | null;
  topicId: number | null;
  curriculum: Curriculum | null;
  activeModuleId: number | null;
  activeSubtopicId: string | null;
  moduleContent: string | null;
  moduleDiagrams: string | null;
  hasPreviousVersion: boolean;
  isLoading: boolean;
  error: string | null;
  existingTopics: TopicSummary[];
}

export function useLearningState() {
  const [state, setState] = useState<LearningState>({
    phase: "idle",
    topic: null,
    topicSlug: null,
    topicId: null,
    curriculum: null,
    activeModuleId: null,
    activeSubtopicId: null,
    moduleContent: null,
    moduleDiagrams: null,
    hasPreviousVersion: false,
    isLoading: false,
    error: null,
    existingTopics: [],
  });

  // Topics are loaded by the landing page server component, not here

  const setError = useCallback((error: string) => {
    setState((prev) => ({ ...prev, error, isLoading: false }));
  }, []);

  const loadingRef = useRef(false);

  const loadTopicBySlug = useCallback(
    async (slug: string) => {
      // Prevent duplicate calls (React StrictMode, double-click, etc.)
      if (loadingRef.current) return;
      loadingRef.current = true;

      setState((prev) => ({
        ...prev,
        topicSlug: slug,
        phase: "learning",
        isLoading: true,
        error: null,
      }));

      try {
        const startRes = await fetch("/api/learn/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: slug }),
        });
        const startData = await startRes.json();

        if (!startData.exists) {
          setError("Topic not found");
          return;
        }

        const topicRes = await fetch("/api/learn/topics");
        const topicData = await topicRes.json();
        const topicInfo = topicData.topics?.find(
          (t: Record<string, unknown>) => t.slug === slug
        );

        if (!topicInfo) {
          setError("Topic not found");
          return;
        }

        setState((prev) => ({
          ...prev,
          topic: topicInfo.displayName,
          topicId: topicInfo.id,
        }));

        const currRes = await fetch("/api/learn/curriculum", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: topicInfo.displayName,
            slug: topicInfo.slug,
            level: topicInfo.level,
            goal: topicInfo.goal,
            timeCommitment: topicInfo.timeCommitment ?? "standard",
          }),
        });
        const currData = await currRes.json();
        if (!currData.success) throw new Error(currData.error);

        const firstModule = currData.curriculum.modules[0];
        const firstSubtopic = firstModule?.subtopics[0];

        // Resume from saved position if available
        const savedPosition = topicInfo.lastPosition as { moduleId: number; subtopicId: string } | null;
        let resumeModuleId = firstModule?.id ?? 1;
        let resumeSubtopicId = firstSubtopic?.id ?? null;

        if (savedPosition) {
          const savedModule = currData.curriculum.modules.find(
            (m: { id: number }) => m.id === savedPosition.moduleId
          );
          if (savedModule) {
            const savedSubtopic = savedModule.subtopics.find(
              (s: { id: string }) => s.id === savedPosition.subtopicId
            );
            if (savedSubtopic) {
              resumeModuleId = savedPosition.moduleId;
              resumeSubtopicId = savedPosition.subtopicId;
            }
          }
        }

        setState((prev) => ({
          ...prev,
          curriculum: currData.curriculum,
          activeModuleId: resumeModuleId,
          activeSubtopicId: resumeSubtopicId,
        }));

        // Auto-load the resume subtopic content so the user never sees an empty state
        if (resumeModuleId && resumeSubtopicId) {
          const contentRes = await fetch("/api/learn/content", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              topic: topicInfo.displayName,
              slug: topicInfo.slug,
              moduleId: resumeModuleId,
              subtopicId: resumeSubtopicId,
            }),
          });
          const contentData = await contentRes.json();
          if (contentData.success) {
            setState((prev) => ({
              ...prev,
              moduleContent: contentData.content,
              moduleDiagrams: contentData.diagrams,
              hasPreviousVersion: !!contentData.hasPreviousVersion,
              isLoading: false,
            }));
            return;
          }
        }
        setState((prev) => ({ ...prev, isLoading: false }));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load topic"
        );
      } finally {
        loadingRef.current = false;
      }
    },
    [setError]
  );

  const loadExistingTopic = useCallback(
    async (topicSummary: TopicSummary) => {
      setState((prev) => ({
        ...prev,
        topic: topicSummary.displayName,
        topicSlug: topicSummary.slug,
        topicId: topicSummary.id,
        phase: "learning",
        isLoading: true,
        error: null,
        moduleContent: null,
        moduleDiagrams: null,
      }));

      try {
        const currRes = await fetch("/api/learn/curriculum", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: topicSummary.displayName,
            slug: topicSummary.slug,
            level: topicSummary.level,
            goal: topicSummary.goal,
            timeCommitment: "standard",
          }),
        });
        const currData = await currRes.json();
        if (!currData.success) throw new Error(currData.error);

        setState((prev) => ({
          ...prev,
          curriculum: currData.curriculum,
          activeModuleId: 1,
          activeSubtopicId:
            currData.curriculum.modules[0]?.subtopics[0]?.id ?? null,
          isLoading: false,
        }));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load topic"
        );
      }
    },
    [setError]
  );

  const startTopic = useCallback(
    async (
      topic: string,
      level: string,
      goal: string,
      timeCommitment: string
    ) => {
      setState((prev) => ({
        ...prev,
        topic,
        phase: "researching",
        isLoading: true,
        error: null,
        moduleContent: null,
        moduleDiagrams: null,
      }));

      try {
        const startRes = await fetch("/api/learn/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic }),
        });
        const startData = await startRes.json();
        const { topicSlug } = startData;

        setState((prev) => ({ ...prev, topicSlug, phase: "researching" }));

        const researchRes = await fetch("/api/learn/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, slug: topicSlug, level, goal, timeCommitment }),
        });
        if (!researchRes.ok) throw new Error("Research failed");
        const researchData = await researchRes.json();

        setState((prev) => ({
          ...prev,
          topicId: researchData.topicId,
          phase: "designing",
        }));

        const currRes = await fetch("/api/learn/curriculum", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, slug: topicSlug, level, goal, timeCommitment }),
        });
        const currData = await currRes.json();
        if (!currData.success) throw new Error(currData.error);

        setState((prev) => ({
          ...prev,
          curriculum: currData.curriculum,
          phase: "learning",
          activeModuleId: 1,
          activeSubtopicId:
            currData.curriculum.modules[0]?.subtopics[0]?.id ?? null,
          isLoading: false,
          existingTopics: [
            ...prev.existingTopics,
            {
              id: currData.topicId,
              slug: topicSlug,
              displayName: topic,
              level,
              goal,
              totalModules: currData.curriculum.modules.length,
              estimatedMinutes:
                currData.curriculum.estimated_total_minutes,
              completionPercent: 0,
              lastSession: new Date().toISOString(),
            },
          ],
        }));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to start topic"
        );
      }
    },
    [setError]
  );

  const loadModuleContent = useCallback(
    async (moduleId: number) => {
      if (!state.topic) return;

      if (moduleId === state.activeModuleId && state.moduleContent) {
        return;
      }

      setState((prev) => ({
        ...prev,
        activeModuleId: moduleId,
        isLoading: true,
        error: null,
      }));

      try {
        const res = await fetch("/api/learn/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: state.topic, slug: state.topicSlug, moduleId }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        setState((prev) => ({
          ...prev,
          moduleContent: data.content,
          moduleDiagrams: data.diagrams,
          hasPreviousVersion: !!data.hasPreviousVersion,
          isLoading: false,
        }));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load content"
        );
      }
    },
    [state.topic, state.topicSlug, state.activeModuleId, state.moduleContent, setError]
  );

  const navigatingRef = useRef(false);

  const navigateToSubtopic = useCallback(
    async (moduleId: number, subtopicId: string) => {
      if (!state.topic || navigatingRef.current) return;
      navigatingRef.current = true;

      // Fire-and-forget: persist last position for resume on reload
      if (state.topicSlug) {
        fetch("/api/learn/position", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: state.topicSlug, moduleId, subtopicId }),
        }).catch(() => {});
      }

      setState((prev) => ({
        ...prev,
        activeModuleId: moduleId,
        activeSubtopicId: subtopicId,
        moduleContent: null,
        moduleDiagrams: null,
        isLoading: true,
        error: null,
      }));

      try {
        const res = await fetch("/api/learn/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: state.topic,
            slug: state.topicSlug,
            moduleId,
            subtopicId,
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        setState((prev) => ({
          ...prev,
          moduleContent: data.content,
          moduleDiagrams: data.diagrams,
          hasPreviousVersion: !!data.hasPreviousVersion,
          isLoading: false,
        }));

        requestAnimationFrame(() => {
          const article = document.querySelector("article");
          if (article) article.scrollTo({ top: 0, behavior: "smooth" });
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load content"
        );
      } finally {
        navigatingRef.current = false;
      }
    },
    [state.topic, setError]
  );

  const regenerateSubtopic = useCallback(
    async (moduleId: number, subtopicId: string, feedback?: string) => {
      if (!state.topic) return;

      setState((prev) => ({
        ...prev,
        moduleContent: null,
        moduleDiagrams: null,
        isLoading: true,
        error: null,
      }));

      try {
        const res = await fetch("/api/learn/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: state.topic,
            slug: state.topicSlug,
            moduleId,
            subtopicId,
            forceRegenerate: true,
            feedback,
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        setState((prev) => ({
          ...prev,
          moduleContent: data.content,
          moduleDiagrams: data.diagrams,
          hasPreviousVersion: !!data.hasPreviousVersion,
          isLoading: false,
        }));

        requestAnimationFrame(() => {
          const article = document.querySelector("article");
          if (article) article.scrollTo({ top: 0, behavior: "smooth" });
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to regenerate content"
        );
      }
    },
    [state.topic, state.topicSlug, setError]
  );

  const rollbackContent = useCallback(
    async (moduleId: number) => {
      if (!state.topicSlug) return;

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const res = await fetch("/api/learn/content/rollback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: state.topicSlug, moduleId }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        setState((prev) => ({
          ...prev,
          moduleContent: data.content,
          moduleDiagrams: data.diagrams,
          hasPreviousVersion: false,
          isLoading: false,
        }));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to rollback content"
        );
      }
    },
    [state.topicSlug, setError]
  );

  const getActiveModule = useCallback((): Module | null => {
    if (!state.curriculum || !state.activeModuleId) return null;
    return (
      state.curriculum.modules.find(
        (m) => m.id === state.activeModuleId
      ) ?? null
    );
  }, [state.curriculum, state.activeModuleId]);

  const setPhase = useCallback((phase: LearningPhase) => {
    setState((prev) => ({ ...prev, phase }));
  }, []);

  const resetToIdle = useCallback(() => {
    setState((prev) => ({
      ...prev,
      phase: "idle",
      topic: null,
      topicSlug: null,
      topicId: null,
      curriculum: null,
      activeModuleId: null,
      activeSubtopicId: null,
      moduleContent: null,
      moduleDiagrams: null,
      hasPreviousVersion: false,
      isLoading: false,
      error: null,
    }));
  }, []);

  return {
    ...state,
    startTopic,
    loadTopicBySlug,
    loadExistingTopic,
    loadModuleContent,
    navigateToSubtopic,
    regenerateSubtopic,
    rollbackContent,
    getActiveModule,
    setPhase,
    setError,
    resetToIdle,
  };
}
