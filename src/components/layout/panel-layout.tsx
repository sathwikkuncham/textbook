"use client";

import { useCallback, useState, useMemo, useRef } from "react";
import { X } from "lucide-react";
import { SidebarLeft } from "./sidebar-left";
import { MainContent } from "./main-content";
import { ChatPanel } from "@/components/chat/chat-panel";
import { QuizShell } from "@/components/quiz/quiz-shell";
import { cn } from "@/lib/utils";
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
  isMobile?: boolean;
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
  isMobile = false,
}: PanelLayoutProps) {
  const [pendingAction, setPendingAction] = useState<{
    action: string;
    selectedText: string;
  } | null>(null);

  const handleTextSelectionAction = useCallback(
    (action: string, selectedText: string) => {
      setPendingAction({ action, selectedText });
      if (!rightSidebarOpen) {
        onRightSidebarOpenChange(true);
      }
    },
    [rightSidebarOpen, onRightSidebarOpenChange]
  );

  const clearPendingAction = useCallback(() => {
    setPendingAction(null);
  }, []);

  const handleSubtopicClick = useCallback(
    (moduleId: number, subtopicId: string) => {
      learning.navigateToSubtopic(moduleId, subtopicId);
      onLeftSidebarOpenChange(false);
    },
    [learning, onLeftSidebarOpenChange]
  );

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

  // Swipe-down-to-close for mobile drawers
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);

  const handleDrawerTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const makeDrawerTouchEnd = useCallback((close: () => void) => {
    return (e: React.TouchEvent) => {
      const deltaY = e.changedTouches[0].clientY - touchStartY.current;
      const deltaX = Math.abs(e.changedTouches[0].clientX - touchStartX.current);
      // Swipe down: vertical > 80px and dominates horizontal
      if (deltaY > 80 && deltaY > deltaX) {
        close();
      }
    };
  }, []);

  const anyDrawerOpen = leftSidebarOpen || rightSidebarOpen;

  return (
    <>
      {/* Main content — full width, always visible */}
      <div className="h-full w-full">
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
            assessment.mode !== "idle"
              ? (() => {
                  const quizModule = learning.curriculum?.modules.find(
                    (m) => m.id === assessment.moduleId
                  );
                  return (
                    <QuizShell
                      assessment={assessment}
                      moduleTitle={
                        quizModule?.title ?? activeModule?.title ?? ""
                      }
                      passThreshold={
                        quizModule?.checkpoint.pass_threshold ?? 70
                      }
                      onDismiss={() => {
                        assessment.dismiss();
                        learning.setPhase("learning");
                      }}
                      onNextModule={() => {
                        assessment.dismiss();
                        learning.setPhase("learning");
                        const quizModId =
                          assessment.moduleId ?? activeModule?.id;
                        if (quizModId && learning.curriculum) {
                          const nextModule =
                            learning.curriculum.modules.find(
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
              : undefined
          }
        />
      </div>

      {/* Backdrop — fixed overlay, shared for both drawers */}
      {anyDrawerOpen && (
        <div
          className={cn(
            "fixed inset-0 z-40",
            isMobile ? "bg-black/40" : "bg-black/20 backdrop-blur-[2px]"
          )}
          style={{ top: 48 }}
          onClick={() => {
            if (leftSidebarOpen) onLeftSidebarOpenChange(false);
            if (rightSidebarOpen) onRightSidebarOpenChange(false);
          }}
        />
      )}

      {/* Left sidebar drawer — fixed position */}
      <div
        onTouchStart={isMobile ? handleDrawerTouchStart : undefined}
        onTouchEnd={isMobile ? makeDrawerTouchEnd(() => onLeftSidebarOpenChange(false)) : undefined}
        className={cn(
          "fixed z-50 overflow-hidden border border-border bg-card",
          isMobile
            ? "inset-x-0 rounded-t-2xl shadow-[0_-10px_40px_-10px_rgba(26,22,20,0.15)]"
            : "w-80 rounded-2xl shadow-[0_10px_40px_-10px_rgba(26,22,20,0.15),0_20px_50px_-10px_rgba(26,22,20,0.08)]",
          !leftSidebarOpen && "pointer-events-none"
        )}
        style={isMobile ? {
          top: 48,
          bottom: 0,
          left: 0,
          right: 0,
          transform: leftSidebarOpen ? "translateY(0)" : "translateY(100%)",
          opacity: leftSidebarOpen ? 1 : 0,
          transition: "transform 300ms ease-out, opacity 200ms ease-out",
        } : {
          top: 60,
          bottom: 36,
          left: leftSidebarOpen ? 12 : -332,
          opacity: leftSidebarOpen ? 1 : 0,
          transition: "left 300ms ease-out, opacity 200ms ease-out",
        }}
      >
        {isMobile && (
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contents</span>
            <button
              onClick={() => onLeftSidebarOpenChange(false)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
        <SidebarLeft
          curriculum={learning.curriculum}
          activeModuleId={learning.activeModuleId}
          activeSubtopicId={learning.activeSubtopicId}
          loadedModuleId={learning.activeModuleId}
          completedSubtopics={progress.completedSubtopics}
          checkpoints={progress.checkpoints}
          isLoading={learning.isLoading}
          onSubtopicClick={handleSubtopicClick}
          onStartQuiz={(moduleId) => {
            learning.setPhase("assessing");
            assessment.startQuiz(moduleId);
            onLeftSidebarOpenChange(false);
          }}
        />
      </div>

      {/* Right chat drawer — fixed position */}
      <div
        onTouchStart={isMobile ? handleDrawerTouchStart : undefined}
        onTouchEnd={isMobile ? makeDrawerTouchEnd(() => onRightSidebarOpenChange(false)) : undefined}
        className={cn(
          "fixed z-50 overflow-hidden border border-border bg-card",
          isMobile
            ? "inset-x-0 rounded-t-2xl shadow-[0_-10px_40px_-10px_rgba(26,22,20,0.15)]"
            : "w-[380px] rounded-2xl shadow-[0_10px_40px_-10px_rgba(26,22,20,0.15),0_20px_50px_-10px_rgba(26,22,20,0.08)]",
          !rightSidebarOpen && "pointer-events-none"
        )}
        style={isMobile ? {
          top: 48,
          bottom: 0,
          left: 0,
          right: 0,
          transform: rightSidebarOpen ? "translateY(0)" : "translateY(100%)",
          opacity: rightSidebarOpen ? 1 : 0,
          transition: "transform 300ms ease-out, opacity 200ms ease-out",
        } : {
          top: 60,
          bottom: 36,
          right: rightSidebarOpen ? 12 : -392,
          opacity: rightSidebarOpen ? 1 : 0,
          transition: "right 300ms ease-out, opacity 200ms ease-out",
        }}
      >
        {isMobile && (
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Chat</span>
            <button
              onClick={() => onRightSidebarOpenChange(false)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
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
      </div>
    </>
  );
}
