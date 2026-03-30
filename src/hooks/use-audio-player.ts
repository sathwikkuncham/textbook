"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { SectionAudio } from "@/lib/tts/generate";

interface AudioPlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  currentSectionIndex: number;
  progress: number;
  duration: number;
  currentTime: number;
  hasAudio: boolean;
}

interface SectionDuration {
  index: number;
  duration: number;
  cumulativeStart: number;
}

export function useAudioPlayer(topicId: number | null, moduleId: number | null) {
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    isLoading: false,
    currentSectionIndex: -1,
    progress: 0,
    duration: 0,
    currentTime: 0,
    hasAudio: false,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sectionsRef = useRef<SectionAudio[]>([]);
  const sectionDurationsRef = useRef<SectionDuration[]>([]);
  const currentSectionIdxRef = useRef<number>(-1);
  const activeKeyRef = useRef<string | null>(null);
  const isAdvancingRef = useRef(false);

  const destroyAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
      audioRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    destroyAudio();
    sectionsRef.current = [];
    sectionDurationsRef.current = [];
    currentSectionIdxRef.current = -1;
    isAdvancingRef.current = false;
    setState({
      isPlaying: false,
      isLoading: false,
      currentSectionIndex: -1,
      progress: 0,
      duration: 0,
      currentTime: 0,
      hasAudio: false,
    });
  }, [destroyAudio]);

  // Reset when topicId or moduleId changes
  useEffect(() => {
    const key = topicId !== null && moduleId !== null ? `${topicId}-${moduleId}` : null;
    if (activeKeyRef.current !== key) {
      cleanup();
      activeKeyRef.current = key;
    }
  }, [topicId, moduleId, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
        audioRef.current = null;
      }
    };
  }, []);

  const computeOverallTime = useCallback((sectionArrayIdx: number, sectionCurrentTime: number): { currentTime: number; progress: number } => {
    const durations = sectionDurationsRef.current;
    if (durations.length === 0) return { currentTime: 0, progress: 0 };

    const totalDuration = durations.reduce((sum, d) => sum + d.duration, 0);
    if (totalDuration === 0) return { currentTime: 0, progress: 0 };

    const sectionDur = durations[sectionArrayIdx];
    if (!sectionDur) return { currentTime: 0, progress: 0 };

    const currentTime = sectionDur.cumulativeStart + sectionCurrentTime;
    const progress = (currentTime / totalDuration) * 100;
    return { currentTime, progress };
  }, []);

  const playSection = useCallback(async (sectionArrayIdx: number) => {
    const sections = sectionsRef.current;
    if (sectionArrayIdx >= sections.length) {
      // All sections finished
      setState((prev) => ({
        ...prev,
        isPlaying: false,
        currentSectionIndex: -1,
        progress: 100,
      }));
      isAdvancingRef.current = false;
      return;
    }

    destroyAudio();
    currentSectionIdxRef.current = sectionArrayIdx;

    const section = sections[sectionArrayIdx];
    const audio = new Audio(section.audioUrl);
    audioRef.current = audio;

    setState((prev) => ({
      ...prev,
      currentSectionIndex: section.index,
      isPlaying: true,
    }));

    audio.addEventListener("loadedmetadata", () => {
      const durations = sectionDurationsRef.current;
      if (durations[sectionArrayIdx]) {
        durations[sectionArrayIdx].duration = audio.duration;
        // Recompute cumulative starts
        let cumulative = 0;
        for (const d of durations) {
          d.cumulativeStart = cumulative;
          cumulative += d.duration;
        }
        setState((prev) => ({
          ...prev,
          duration: cumulative,
          hasAudio: true,
        }));
      }
    });

    audio.addEventListener("timeupdate", () => {
      const { currentTime, progress } = computeOverallTime(sectionArrayIdx, audio.currentTime);
      setState((prev) => ({
        ...prev,
        currentTime,
        progress,
      }));
    });

    audio.addEventListener("ended", () => {
      if (!isAdvancingRef.current) {
        isAdvancingRef.current = true;
        playSection(sectionArrayIdx + 1).finally(() => {
          isAdvancingRef.current = false;
        });
      }
    });

    audio.addEventListener("error", () => {
      // Skip failed section, try next
      if (!isAdvancingRef.current) {
        isAdvancingRef.current = true;
        playSection(sectionArrayIdx + 1).finally(() => {
          isAdvancingRef.current = false;
        });
      }
    });

    try {
      await audio.play();
    } catch {
      // Autoplay blocked — skip to next
      if (!isAdvancingRef.current) {
        isAdvancingRef.current = true;
        playSection(sectionArrayIdx + 1).finally(() => {
          isAdvancingRef.current = false;
        });
      }
    }
  }, [destroyAudio, computeOverallTime]);

  const play = useCallback(async () => {
    if (topicId === null || moduleId === null) return;

    // If already loaded, resume current section
    if (audioRef.current && sectionsRef.current.length > 0) {
      try {
        await audioRef.current.play();
        const section = sectionsRef.current[currentSectionIdxRef.current];
        setState((prev) => ({
          ...prev,
          isPlaying: true,
          currentSectionIndex: section?.index ?? -1,
        }));
        return;
      } catch {
        // Fall through to re-fetch
      }
    }

    // Fetch sections from API
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const res = await fetch(`/api/learn/audio?topicId=${topicId}&moduleId=${moduleId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch audio");
      }

      const sections: SectionAudio[] = data.sections;
      if (!sections || sections.length === 0) {
        throw new Error("No audio sections returned");
      }

      sectionsRef.current = sections;

      // Initialize duration tracking (durations filled in as each section loads metadata)
      sectionDurationsRef.current = sections.map((s) => ({
        index: s.index,
        duration: 0,
        cumulativeStart: 0,
      }));

      setState((prev) => ({ ...prev, isLoading: false, hasAudio: true }));

      // Start playing from first section
      await playSection(0);
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [topicId, moduleId, playSection]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setState((prev) => ({ ...prev, isPlaying: false }));
    }
  }, []);

  const toggle = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, pause, play]);

  return {
    isPlaying: state.isPlaying,
    isLoading: state.isLoading,
    currentSectionIndex: state.currentSectionIndex,
    progress: state.progress,
    duration: state.duration,
    currentTime: state.currentTime,
    hasAudio: state.hasAudio,
    play,
    pause,
    toggle,
  };
}
