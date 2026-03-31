"use client";

import { useRef, useCallback, useEffect } from "react";
import type { Curriculum } from "@/lib/types/learning";

interface EngagementTrackerOptions {
  topicId: number | null;
  activeModuleId: number | null;
  activeSubtopicId: string | null;
  curriculum: Curriculum | null;
}

function sendSignal(data: {
  topicId: number;
  moduleId?: number;
  subtopicId?: string;
  signalType: string;
  data: Record<string, unknown>;
}) {
  fetch("/api/learn/signals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).catch(() => {});
}

export function useEngagementTracker({
  topicId,
  activeModuleId,
  activeSubtopicId,
  curriculum,
}: EngagementTrackerOptions) {
  const startTimeRef = useRef<number | null>(null);
  const prevKeyRef = useRef<string | null>(null);
  const prevModuleIdRef = useRef<number | null>(null);

  const getEstimatedMinutes = useCallback(
    (moduleId: number, subtopicId: string): number => {
      if (!curriculum) return 15;
      const mod = curriculum.modules.find((m) => m.id === moduleId);
      const sub = mod?.subtopics.find((s) => s.id === subtopicId);
      return sub?.estimated_minutes ?? 15;
    },
    [curriculum]
  );

  // Track subtopic changes
  useEffect(() => {
    if (!topicId || !activeModuleId || !activeSubtopicId) return;

    const currentKey = `${topicId}-${activeModuleId}-${activeSubtopicId}`;

    // If same subtopic, nothing to do
    if (prevKeyRef.current === currentKey) return;

    // Log time for PREVIOUS subtopic (if any)
    if (prevKeyRef.current && startTimeRef.current && prevModuleIdRef.current) {
      const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
      const prevParts = prevKeyRef.current.split("-");
      const prevSubtopicId = prevParts.slice(2).join("-");
      const prevModuleId = parseInt(prevParts[1], 10);
      const estimatedMinutes = getEstimatedMinutes(prevModuleId, prevSubtopicId);
      const estimatedSeconds = estimatedMinutes * 60;

      // Log time on subtopic
      sendSignal({
        topicId,
        moduleId: prevModuleId,
        subtopicId: prevSubtopicId,
        signalType: "time_on_subtopic",
        data: { durationSeconds, estimatedSeconds },
      });

      // Check for rushing (< 30% of estimated)
      if (durationSeconds < estimatedSeconds * 0.3 && durationSeconds > 5) {
        sendSignal({
          topicId,
          moduleId: prevModuleId,
          subtopicId: prevSubtopicId,
          signalType: "rushing",
          data: { durationSeconds, estimatedSeconds, ratio: durationSeconds / estimatedSeconds },
        });
      }

      // Check for stuck (> 300% of estimated)
      if (durationSeconds > estimatedSeconds * 3) {
        sendSignal({
          topicId,
          moduleId: prevModuleId,
          subtopicId: prevSubtopicId,
          signalType: "stuck",
          data: { durationSeconds, estimatedSeconds, ratio: durationSeconds / estimatedSeconds },
        });
      }
    }

    // Check for backtracking (navigating to a LOWER module)
    if (prevModuleIdRef.current !== null && activeModuleId < prevModuleIdRef.current) {
      sendSignal({
        topicId,
        moduleId: activeModuleId,
        subtopicId: activeSubtopicId,
        signalType: "backtrack",
        data: { fromModuleId: prevModuleIdRef.current, toModuleId: activeModuleId },
      });
    }

    // Log subtopic start
    sendSignal({
      topicId,
      moduleId: activeModuleId,
      subtopicId: activeSubtopicId,
      signalType: "subtopic_started",
      data: {},
    });

    // Update refs
    prevKeyRef.current = currentKey;
    prevModuleIdRef.current = activeModuleId;
    startTimeRef.current = Date.now();
  }, [topicId, activeModuleId, activeSubtopicId, getEstimatedMinutes]);

  // Log time on unmount (e.g., leaving the page)
  useEffect(() => {
    return () => {
      if (startTimeRef.current && prevKeyRef.current && topicId) {
        const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
        if (durationSeconds > 5) {
          const parts = prevKeyRef.current.split("-");
          const moduleId = parseInt(parts[1], 10);
          const subtopicId = parts.slice(2).join("-");

          // Use navigator.sendBeacon for reliability during page unload
          const payload = JSON.stringify({
            topicId,
            moduleId,
            subtopicId,
            signalType: "time_on_subtopic",
            data: { durationSeconds },
          });
          const blob = new Blob([payload], { type: "application/json" });
          navigator.sendBeacon("/api/learn/signals", blob);
        }
      }
    };
  }, [topicId]);
}
