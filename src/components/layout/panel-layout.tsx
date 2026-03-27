"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import type { PanelImperativeHandle } from "react-resizable-panels";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { SidebarLeft } from "./sidebar-left";
import { MainContent } from "./main-content";
import { ChatPanel } from "@/components/chat/chat-panel";
import { QuizShell } from "@/components/quiz/quiz-shell";
import type { Module } from "@/lib/types/learning";
import type { useLearningState } from "@/hooks/use-learning-state";
import type { useProgress } from "@/hooks/use-progress";
import type { useAssessment } from "@/hooks/use-assessment";

interface PanelLayoutProps {
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  onLeftSidebarOpenChange: (open: boolean) => void;
  onRightSidebarOpenChange: (open: boolean) => void;
  learning: ReturnType<typeof useLearningState>;
  activeModule: Module | null;
  progress: ReturnType<typeof useProgress>;
  assessment: ReturnType<typeof useAssessment>;
}

export function PanelLayout({
  leftSidebarOpen,
  rightSidebarOpen,
  onLeftSidebarOpenChange,
  onRightSidebarOpenChange,
  learning,
  activeModule,
  progress,
  assessment,
}: PanelLayoutProps) {
  const leftPanelRef = useRef<PanelImperativeHandle>(null);
  const rightPanelRef = useRef<PanelImperativeHandle>(null);
  const hasMounted = useRef(false);

  const [pendingAction, setPendingAction] = useState<{
    action: string;
    selectedText: string;
  } | null>(null);

  useEffect(() => {
    if (!hasMounted.current) return;
    if (leftSidebarOpen) leftPanelRef.current?.expand();
    else leftPanelRef.current?.collapse();
  }, [leftSidebarOpen]);

  useEffect(() => {
    if (!hasMounted.current) return;
    if (rightSidebarOpen) rightPanelRef.current?.expand();
    else rightPanelRef.current?.collapse();
  }, [rightSidebarOpen]);

  useEffect(() => {
    hasMounted.current = true;
  }, []);

  const handleLeftCollapse = useCallback(() => {
    onLeftSidebarOpenChange(false);
  }, [onLeftSidebarOpenChange]);

  const handleLeftExpand = useCallback(() => {
    onLeftSidebarOpenChange(true);
  }, [onLeftSidebarOpenChange]);

  const handleRightCollapse = useCallback(() => {
    onRightSidebarOpenChange(false);
  }, [onRightSidebarOpenChange]);

  const handleRightExpand = useCallback(() => {
    onRightSidebarOpenChange(true);
  }, [onRightSidebarOpenChange]);

  const handleTextSelectionAction = useCallback(
    (action: string, selectedText: string) => {
      setPendingAction({ action, selectedText });
      // Ensure right panel is open for chat
      if (!rightSidebarOpen) {
        onRightSidebarOpenChange(true);
      }
    },
    [rightSidebarOpen, onRightSidebarOpenChange]
  );

  const clearPendingAction = useCallback(() => {
    setPendingAction(null);
  }, []);

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

  return (
    <ResizablePanelGroup orientation="horizontal" className="flex-1">
      <ResizablePanel
        panelRef={leftPanelRef}
        id="left-sidebar"
        defaultSize="22%"
        minSize="15%"
        maxSize="30%"
        collapsible
        collapsedSize="0%"
        onResize={(panelSize) => {
          if (!hasMounted.current) return;
          if (panelSize.asPercentage === 0) handleLeftCollapse();
          else handleLeftExpand();
        }}
      >
        <SidebarLeft
          curriculum={learning.curriculum}
          activeModuleId={learning.activeModuleId}
          activeSubtopicId={learning.activeSubtopicId}
          loadedModuleId={learning.activeModuleId}
          completedSubtopics={progress.completedSubtopics}
          checkpoints={progress.checkpoints}
          isLoading={learning.isLoading}
          onSubtopicClick={learning.navigateToSubtopic}
          onStartQuiz={(moduleId) => {
            learning.setPhase("assessing");
            assessment.startQuiz(moduleId);
          }}
        />
      </ResizablePanel>

      <ResizableHandle className="transition-colors hover:bg-primary/50 data-[resize-handle-active]:bg-primary" />

      <ResizablePanel id="main-content" defaultSize="50%" minSize="30%">
        <MainContent
          phase={learning.phase}
          content={learning.moduleContent}
          isLoading={learning.isLoading}
          error={learning.error}
          activeModuleTitle={activeModule?.title}
          onTextSelectionAction={handleTextSelectionAction}
          curriculum={learning.curriculum}
          activeModuleId={learning.activeModuleId}
          activeSubtopicId={learning.activeSubtopicId}
          onNavigateSubtopic={learning.navigateToSubtopic}
          quizContent={
            assessment.mode !== "idle" ? (() => {
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
                  // Navigate to first subtopic of next module
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
            })() : undefined
          }
        />
      </ResizablePanel>

      <ResizableHandle className="transition-colors hover:bg-primary/50 data-[resize-handle-active]:bg-primary" />

      <ResizablePanel
        panelRef={rightPanelRef}
        id="right-sidebar"
        defaultSize="28%"
        minSize="20%"
        maxSize="40%"
        collapsible
        collapsedSize="0%"
        onResize={(panelSize) => {
          if (!hasMounted.current) return;
          if (panelSize.asPercentage === 0) handleRightCollapse();
          else handleRightExpand();
        }}
      >
        <ChatPanel
          topicId={learning.topicId}
          topic={learning.topic}
          topicSlug={learning.topicSlug}
          moduleId={learning.activeModuleId}
          subtopicId={learning.activeSubtopicId}
          subtopicTitle={activeSubtopicTitle}
          pendingAction={pendingAction}
          onPendingActionConsumed={clearPendingAction}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
