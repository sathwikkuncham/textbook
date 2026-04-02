"use client";

import { useCallback, useState, useMemo, useRef } from "react";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { useEngagementTracker } from "@/hooks/use-engagement-tracker";
import { AudioPlayButton, AudioProgressBar } from "@/components/ui/audio-player";
import { X, Columns2, Maximize2, Minimize2 } from "lucide-react";
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
  const [chatMode, setChatMode] = useState<"drawer" | "wide" | "popout">("drawer");

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

  // Compute the DB key for audio (same formula as content API)
  const activeDbKey = useMemo(() => {
    if (!learning.curriculum || !learning.activeModuleId || !learning.activeSubtopicId) return null;
    const mod = learning.curriculum.modules.find(m => m.id === learning.activeModuleId);
    if (!mod) return null;
    const subIdx = mod.subtopics.findIndex(s => s.id === learning.activeSubtopicId);
    if (subIdx < 0) return null;
    return learning.activeModuleId * 100 + subIdx;
  }, [learning.curriculum, learning.activeModuleId, learning.activeSubtopicId]);

  const audioPlayer = useAudioPlayer(learning.topicId, activeDbKey);

  useEngagementTracker({
    topicId: learning.topicId,
    activeModuleId: learning.activeModuleId,
    activeSubtopicId: learning.activeSubtopicId,
    curriculum: learning.curriculum,
  });

  // Swipe-down-to-close for mobile drawers
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const scrollAtTop = useRef(false);

  const handleDrawerTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
    // Find the nearest scroll viewport and check if it's scrolled to the top
    const viewport = (e.target as HTMLElement).closest('[data-slot="scroll-area-viewport"]');
    scrollAtTop.current = !viewport || viewport.scrollTop <= 0;
  }, []);

  const makeDrawerTouchEnd = useCallback((close: () => void) => {
    return (e: React.TouchEvent) => {
      if (!scrollAtTop.current) return;
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
          activeSubtopicTitle={activeSubtopicTitle}
          topicId={learning.topicId}
          onCurriculumChange={() => {
            if (learning.topicSlug) {
              learning.loadTopicBySlug(learning.topicSlug);
            }
          }}
          onNavigateSubtopic={learning.navigateToSubtopic}
          onRegenerate={
            learning.activeModuleId && learning.activeSubtopicId
              ? (feedback?: string) => learning.regenerateSubtopic(learning.activeModuleId!, learning.activeSubtopicId!, feedback)
              : undefined
          }
          onRollback={
            learning.hasPreviousVersion && learning.activeModuleId
              ? () => learning.rollbackContent(learning.activeModuleId!)
              : undefined
          }
          hasPreviousVersion={learning.hasPreviousVersion}
          activeSectionIndex={audioPlayer.isPlaying ? audioPlayer.currentSectionIndex : null}
          audioPlayer={audioPlayer}
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
            isMobile ? "bg-black/40"
              : chatMode === "popout" && rightSidebarOpen ? "bg-black/40 backdrop-blur-[3px]"
              : "bg-black/20 backdrop-blur-[2px]"
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

      {/* Right chat drawer — fixed position, supports drawer/wide/popout modes */}
      <div
        onTouchStart={isMobile ? handleDrawerTouchStart : undefined}
        onTouchEnd={isMobile ? makeDrawerTouchEnd(() => onRightSidebarOpenChange(false)) : undefined}
        className={cn(
          "fixed z-50 flex flex-col overflow-hidden border border-border bg-card",
          isMobile
            ? "inset-x-0 rounded-t-2xl shadow-[0_-10px_40px_-10px_rgba(26,22,20,0.15)]"
            : chatMode === "popout"
              ? "rounded-2xl shadow-[0_10px_60px_-10px_rgba(26,22,20,0.25),0_20px_80px_-10px_rgba(26,22,20,0.12)]"
              : "rounded-2xl shadow-[0_10px_40px_-10px_rgba(26,22,20,0.15),0_20px_50px_-10px_rgba(26,22,20,0.08)]",
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
        } : chatMode === "popout" ? {
          top: 60,
          bottom: 36,
          left: "10%",
          right: "10%",
          opacity: rightSidebarOpen ? 1 : 0,
          transform: rightSidebarOpen ? "scale(1)" : "scale(0.95)",
          transition: "opacity 200ms ease-out, transform 200ms ease-out",
        } : {
          top: 60,
          bottom: 36,
          width: chatMode === "wide" ? 640 : 440,
          right: rightSidebarOpen ? 12 : -(chatMode === "wide" ? 660 : 460),
          opacity: rightSidebarOpen ? 1 : 0,
          transition: "right 300ms ease-out, opacity 200ms ease-out, width 200ms ease-out",
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
          className="min-h-0 flex-1"
          topicId={learning.topicId}
          topic={learning.topic}
          topicSlug={learning.topicSlug}
          moduleId={learning.activeModuleId}
          subtopicId={learning.activeSubtopicId}
          subtopicTitle={activeSubtopicTitle}
          pendingAction={pendingAction}
          onPendingActionConsumed={clearPendingAction}
          headerActions={!isMobile ? (
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setChatMode(chatMode === "wide" ? "drawer" : "wide")}
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  chatMode === "wide"
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
                title={chatMode === "wide" ? "Narrow view" : "Wide view"}
              >
                <Columns2 className="size-3.5" />
              </button>
              <button
                onClick={() => setChatMode(chatMode === "popout" ? "drawer" : "popout")}
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  chatMode === "popout"
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
                title={chatMode === "popout" ? "Back to sidebar" : "Pop out"}
              >
                {chatMode === "popout" ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
              </button>
              <button
                onClick={() => {
                  setChatMode("drawer");
                  onRightSidebarOpenChange(false);
                }}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                title="Close"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : undefined}
        />
      </div>
    </>
  );
}
