"use client";

import { useState, useCallback, useMemo } from "react";
import { SidebarLeft } from "./sidebar-left";
import { MainContent } from "./main-content";
import { ChatPanel } from "@/components/chat/chat-panel";
import { QuizShell } from "@/components/quiz/quiz-shell";
import { BottomNav, type MobileTab } from "./bottom-nav";
import { useSwipe } from "@/hooks/use-swipe";
import type { Module } from "@/lib/types/learning";
import type { useLearningState } from "@/hooks/use-learning-state";
import type { useProgress } from "@/hooks/use-progress";
import type { useAssessment } from "@/hooks/use-assessment";
import { cn } from "@/lib/utils";

interface MobileWorkspaceProps {
  learning: ReturnType<typeof useLearningState>;
  activeModule: Module | null;
  progress: ReturnType<typeof useProgress>;
  assessment: ReturnType<typeof useAssessment>;
}

export function MobileWorkspace({
  learning,
  activeModule,
  progress,
  assessment,
}: MobileWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<MobileTab>("learn");
  const [pendingAction, setPendingAction] = useState<{
    action: string;
    selectedText: string;
  } | null>(null);

  const handleSubtopicNavigate = useCallback(
    (moduleId: number, subtopicId: string) => {
      learning.navigateToSubtopic(moduleId, subtopicId);
      setActiveTab("learn");
    },
    [learning]
  );

  const handleTextSelectionAction = useCallback(
    (action: string, selectedText: string) => {
      setPendingAction({ action, selectedText });
      setActiveTab("chat");
    },
    []
  );

  const clearPendingAction = useCallback(() => {
    setPendingAction(null);
  }, []);

  const { ref: swipeRef } = useSwipe<HTMLDivElement>({
    onSwipeRight: () => setActiveTab("contents"),
    onSwipeLeft: () => setActiveTab("chat"),
    enabled: activeTab === "learn",
  });

  const activeSubtopicTitle = useMemo(() => {
    if (!learning.curriculum || !learning.activeSubtopicId) return undefined;
    for (const mod of learning.curriculum.modules) {
      const sub = mod.subtopics.find(
        (s) => s.id === learning.activeSubtopicId
      );
      if (sub) return sub.title;
    }
    return undefined;
  }, [learning.curriculum, learning.activeSubtopicId]);

  const quizContent =
    assessment.mode !== "idle"
      ? (() => {
          const quizModule = learning.curriculum?.modules.find(
            (m) => m.id === assessment.moduleId
          );
          return (
            <QuizShell
              assessment={assessment}
              moduleTitle={quizModule?.title ?? activeModule?.title ?? ""}
              passThreshold={quizModule?.checkpoint.pass_threshold ?? 70}
              onDismiss={() => {
                assessment.dismiss();
                learning.setPhase("learning");
              }}
              onNextModule={() => {
                assessment.dismiss();
                learning.setPhase("learning");
                const quizModId = assessment.moduleId ?? activeModule?.id;
                if (quizModId && learning.curriculum) {
                  const nextModule = learning.curriculum.modules.find(
                    (m) => m.id === quizModId + 1
                  );
                  if (nextModule && nextModule.subtopics[0]) {
                    learning.navigateToSubtopic(
                      nextModule.id,
                      nextModule.subtopics[0].id
                    );
                  }
                }
                progress.refreshProgress();
              }}
            />
          );
        })()
      : undefined;

  return (
    <div ref={swipeRef} className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Panels — all mounted, active one visible via display */}
      <div className={cn("min-h-0 flex-1", activeTab !== "contents" && "hidden")}>
        <div className="h-full">
          <SidebarLeft
            curriculum={learning.curriculum}
            activeModuleId={learning.activeModuleId}
            activeSubtopicId={learning.activeSubtopicId}
            loadedModuleId={learning.activeModuleId}
            completedSubtopics={progress.completedSubtopics}
            checkpoints={progress.checkpoints}
            isLoading={learning.isLoading}
            onSubtopicClick={handleSubtopicNavigate}
            onStartQuiz={(moduleId) => {
              learning.setPhase("assessing");
              assessment.startQuiz(moduleId);
              setActiveTab("learn");
            }}
          />
        </div>
      </div>

      <div className={cn("min-h-0 flex-1", activeTab !== "learn" && "hidden")}>
        <div className="h-full">
          <MainContent
            phase={learning.phase}
            content={learning.moduleContent}
            isLoading={learning.isLoading}
            error={learning.error}
            activeModuleTitle={activeModule?.title}
            onTextSelectionAction={handleTextSelectionAction}
            quizContent={quizContent}
          />
        </div>
      </div>

      <div className={cn("min-h-0 flex-1", activeTab !== "chat" && "hidden")}>
        <div className="h-full">
          <ChatPanel
            topicId={learning.topicId}
            topic={learning.topic}
            moduleId={learning.activeModuleId}
            subtopicId={learning.activeSubtopicId}
            subtopicTitle={activeSubtopicTitle}
            pendingAction={pendingAction}
            onPendingActionConsumed={clearPendingAction}
          />
        </div>
      </div>

      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        chatBadge={!!pendingAction}
      />
    </div>
  );
}
