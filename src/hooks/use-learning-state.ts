import { useState, useCallback, useRef, useMemo } from "react";
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

export interface ModuleGenerationProgress {
  moduleId: number;
  status: "planning" | "generating" | "complete" | "error";
  currentSection: number;
  totalEstimate: number;
  currentSectionTitle: string;
  completedSections: Array<{ title: string; score: number }>;
  error?: string;
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
  currentVersion: number;
  isLoading: boolean;
  error: string | null;
  existingTopics: TopicSummary[];
  generationProgress: ModuleGenerationProgress | null;
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
    currentVersion: 0,
    isLoading: false,
    error: null,
    existingTopics: [],
    generationProgress: null,
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

        // For new-style modules without subtopics, don't try to load content
        const resumeModule = currData.curriculum.modules.find(
          (m: { id: number }) => m.id === resumeModuleId
        );
        const isUngenerated = resumeModule?.plan && !resumeModule?.generated;

        // Auto-load the resume subtopic content so the user never sees an empty state
        if (resumeModuleId && resumeSubtopicId && !isUngenerated) {
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
              currentVersion: contentData.currentVersion ?? 0,
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
          currentVersion: data.currentVersion ?? 0,
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
          currentVersion: data.currentVersion ?? 0,
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
      if (!state.topic || !state.curriculum) return;

      setState((prev) => ({
        ...prev,
        moduleContent: null,
        moduleDiagrams: null,
        isLoading: true,
        error: null,
      }));

      try {
        // Check if this is a new-style generated module — use orchestrator-aware regeneration
        const module = state.curriculum.modules.find((m) => m.id === moduleId);
        const isOrchestratorModule = module?.plan && module?.generated;

        if (isOrchestratorModule) {
          const sectionIndex = module.subtopics.findIndex((s) => s.id === subtopicId);
          if (sectionIndex < 0) throw new Error("Section not found");

          const res = await fetch("/api/learn/module/regenerate-section", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              slug: state.topicSlug,
              moduleId,
              sectionIndex,
              feedback,
            }),
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.error);

          setState((prev) => ({
            ...prev,
            moduleContent: data.content,
            moduleDiagrams: "",
            hasPreviousVersion: true,
            currentVersion: (prev.currentVersion ?? 0) + 1,
            isLoading: false,
          }));
        } else {
          // Legacy per-subtopic regeneration
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
            currentVersion: data.currentVersion ?? 0,
            isLoading: false,
          }));
        }

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
    [state.topic, state.topicSlug, state.curriculum, setError]
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
          currentVersion: data.currentVersion ?? prev.currentVersion,
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

  const restoreVersion = useCallback(
    async (moduleId: number, versionId: number) => {
      if (!state.topicSlug) return;

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const res = await fetch("/api/learn/content/versions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: state.topicSlug,
            moduleId,
            versionId,
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        setState((prev) => ({
          ...prev,
          moduleContent: data.content,
          moduleDiagrams: data.diagrams,
          currentVersion: data.currentVersion ?? prev.currentVersion,
          isLoading: false,
        }));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to restore version"
        );
      }
    },
    [state.topicSlug, setError]
  );

  const generateModule = useCallback(
    async (moduleId: number) => {
      if (!state.topicSlug || !state.curriculum) return;

      const module = state.curriculum.modules.find((m) => m.id === moduleId);
      if (!module?.plan || module.generated) return;

      setState((prev) => ({
        ...prev,
        activeModuleId: moduleId,
        activeSubtopicId: null,
        moduleContent: null,
        generationProgress: {
          moduleId,
          status: "planning",
          currentSection: 0,
          totalEstimate: 0,
          currentSectionTitle: "",
          completedSections: [],
        },
      }));

      try {
        const res = await fetch("/api/learn/module/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: state.topicSlug, moduleId }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Generation failed");
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6));

              switch (event.type) {
                case "planning":
                  setState((prev) => ({
                    ...prev,
                    generationProgress: prev.generationProgress
                      ? { ...prev.generationProgress, status: "planning" }
                      : null,
                  }));
                  break;

                case "section_start":
                  setState((prev) => ({
                    ...prev,
                    generationProgress: prev.generationProgress
                      ? {
                          ...prev.generationProgress,
                          status: "generating",
                          currentSection: event.sectionNumber,
                          totalEstimate: event.totalEstimate,
                          currentSectionTitle: event.title,
                        }
                      : null,
                  }));
                  break;

                case "section_complete":
                  setState((prev) => ({
                    ...prev,
                    generationProgress: prev.generationProgress
                      ? {
                          ...prev.generationProgress,
                          completedSections: [
                            ...prev.generationProgress.completedSections,
                            { title: event.title, score: event.score },
                          ],
                        }
                      : null,
                  }));
                  break;

                case "section_revision":
                  // Just a status update — section is being revised
                  break;

                case "module_complete":
                  setState((prev) => ({
                    ...prev,
                    generationProgress: prev.generationProgress
                      ? {
                          ...prev.generationProgress,
                          status: "complete",
                          completedSections: event.sections,
                        }
                      : null,
                  }));
                  break;

                case "done":
                  // Server sends updated curriculum after generation
                  if (event.curriculum) {
                    const updatedCurriculum = event.curriculum as Curriculum;
                    const generatedModule = updatedCurriculum.modules.find(
                      (m) => m.id === moduleId
                    );
                    const firstSubtopic = generatedModule?.subtopics[0];

                    setState((prev) => ({
                      ...prev,
                      curriculum: updatedCurriculum,
                      activeSubtopicId: firstSubtopic?.id ?? null,
                      generationProgress: null,
                    }));

                    // Auto-load first section content
                    if (firstSubtopic) {
                      const contentRes = await fetch("/api/learn/content", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          topic: state.topic,
                          slug: state.topicSlug,
                          moduleId,
                          subtopicId: firstSubtopic.id,
                        }),
                      });
                      const contentData = await contentRes.json();
                      if (contentData.success) {
                        setState((prev) => ({
                          ...prev,
                          moduleContent: contentData.content,
                          moduleDiagrams: contentData.diagrams,
                          hasPreviousVersion: !!contentData.hasPreviousVersion,
                          currentVersion: contentData.currentVersion ?? 0,
                          isLoading: false,
                        }));
                      }
                    }
                  }
                  break;

                case "error":
                  setState((prev) => ({
                    ...prev,
                    generationProgress: prev.generationProgress
                      ? {
                          ...prev.generationProgress,
                          status: "error",
                          error: event.message,
                        }
                      : null,
                    error: event.message,
                  }));
                  break;
              }
            } catch {
              // Skip malformed SSE lines
            }
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Module generation failed";
        setState((prev) => ({
          ...prev,
          generationProgress: prev.generationProgress
            ? { ...prev.generationProgress, status: "error", error: message }
            : null,
          error: message,
        }));
      }
    },
    [state.topicSlug, state.curriculum, state.topic]
  );

  // Compute the DB key used by module_content and content_versions
  const activeDbKey = useMemo(() => {
    if (!state.curriculum || !state.activeModuleId || !state.activeSubtopicId) return null;
    const mod = state.curriculum.modules.find((m) => m.id === state.activeModuleId);
    if (!mod) return null;
    const idx = mod.subtopics.findIndex((s) => s.id === state.activeSubtopicId);
    if (idx < 0) return null;
    return state.activeModuleId * 100 + idx;
  }, [state.curriculum, state.activeModuleId, state.activeSubtopicId]);

  const selectModule = useCallback((moduleId: number) => {
    setState((prev) => ({
      ...prev,
      activeModuleId: moduleId,
      activeSubtopicId: null,
      moduleContent: null,
      moduleDiagrams: null,
      isLoading: false,
      error: null,
    }));
  }, []);

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
      currentVersion: 0,
      isLoading: false,
      error: null,
      generationProgress: null,
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
    restoreVersion,
    generateModule,
    selectModule,
    activeDbKey,
    getActiveModule,
    setPhase,
    setError,
    resetToIdle,
  };
}
