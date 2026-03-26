"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePanelState } from "@/hooks/use-panel-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useLearningState } from "@/hooks/use-learning-state";
import { useProgress } from "@/hooks/use-progress";
import { useAssessment } from "@/hooks/use-assessment";
import { useMobile } from "@/hooks/use-mobile";
import { TopBar } from "./top-bar";
import { StatusBar } from "./status-bar";
import { PanelLayout } from "./panel-layout";
import { MobileWorkspace } from "./mobile-workspace";

interface WorkspaceShellProps {
  topicSlug: string;
}

export function WorkspaceShell({ topicSlug }: WorkspaceShellProps) {
  const { isMobile } = useMobile();

  const {
    leftSidebarOpen,
    rightSidebarOpen,
    toggleLeftSidebar,
    toggleRightSidebar,
    setLeftSidebarOpen,
    setRightSidebarOpen,
  } = usePanelState();

  useKeyboardShortcuts({
    onToggleLeftSidebar: toggleLeftSidebar,
    onToggleRightSidebar: toggleRightSidebar,
  });

  const learning = useLearningState();
  const activeModule = learning.getActiveModule();
  const progress = useProgress(learning.topicId, learning.curriculum);
  const assessment = useAssessment(learning.topicId, learning.topic);

  // Track subtopic completion on navigation
  const prevSubtopicRef = useRef<{
    moduleId: number;
    subtopicId: string;
  } | null>(null);

  useEffect(() => {
    const prev = prevSubtopicRef.current;
    if (
      prev &&
      learning.topicId &&
      !progress.completedSubtopics.has(prev.subtopicId)
    ) {
      progress.markSubtopicCompleted(prev.moduleId, prev.subtopicId);
    }
    if (learning.activeModuleId && learning.activeSubtopicId) {
      prevSubtopicRef.current = {
        moduleId: learning.activeModuleId,
        subtopicId: learning.activeSubtopicId,
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [learning.activeSubtopicId]);

  // Review mode entry
  const handleReviewsClick = useCallback(() => {
    if (progress.dueReviews.length > 0) {
      const first = progress.dueReviews[0];
      learning.setPhase("assessing");
      assessment.startReview(first.moduleId);
    }
  }, [progress.dueReviews, learning, assessment]);

  useEffect(() => {
    if (topicSlug && learning.phase === "idle") {
      learning.loadTopicBySlug(topicSlug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicSlug]);

  return (
    <div className="flex h-dvh w-screen flex-col overflow-hidden">
      <TopBar
        phase={learning.phase}
        topic={learning.topic}
        topicSlug={topicSlug}
        isLoading={learning.isLoading}
        completionPercent={progress.completionPercent}
      />
      {isMobile ? (
        <MobileWorkspace
          learning={learning}
          activeModule={activeModule}
          progress={progress}
          assessment={assessment}
        />
      ) : (
        <>
          <PanelLayout
            leftSidebarOpen={leftSidebarOpen}
            rightSidebarOpen={rightSidebarOpen}
            onLeftSidebarOpenChange={setLeftSidebarOpen}
            onRightSidebarOpenChange={setRightSidebarOpen}
            learning={learning}
            activeModule={activeModule}
            progress={progress}
            assessment={assessment}
          />
          <StatusBar
            activeModuleTitle={activeModule?.title ?? null}
            phase={learning.phase}
            completionPercent={progress.completionPercent}
            reviewsDueCount={progress.reviewsDueCount}
            onReviewsClick={handleReviewsClick}
          />
        </>
      )}
    </div>
  );
}
