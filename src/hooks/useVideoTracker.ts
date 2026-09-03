import { useCallback, useEffect, useRef, useState } from "react";
import type { ActivityLog } from "../platform/types";

interface YouTubePlayer {
  destroy(): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
}

interface VideoTrackerOptions {
  userId: string;
  courseId: string;
  resourceId: string;
  videoId: string;
  onEvent: (event: ActivityLog) => void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement,
        options: Record<string, unknown>,
      ) => YouTubePlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<void> | null = null;

function loadYouTubeApi() {
  if (window.YT) return Promise.resolve();
  if (youtubeApiPromise) return youtubeApiPromise;
  youtubeApiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    if (
      !document.querySelector(
        "script[src='https://www.youtube.com/iframe_api']",
      )
    ) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(script);
    }
  });
  return youtubeApiPromise;
}

export function useVideoTracker({
  userId,
  courseId,
  resourceId,
  videoId,
  onEvent,
}: VideoTrackerOptions) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const [progress, setProgress] = useState(0);
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const pendingSeconds = useRef(0);
  const progressRef = useRef(0);

  const emit = useCallback(
    (
      kind: ActivityLog["kind"],
      metadata: Record<string, unknown>,
      durationSeconds?: number,
    ) => {
      onEvent({
        userId,
        courseId,
        resourceId,
        kind,
        durationSeconds,
        metadata,
      });
    },
    [courseId, onEvent, resourceId, userId],
  );

  useEffect(() => {
    let disposed = false;
    let pulse = 0;
    void loadYouTubeApi().then(() => {
      if (disposed || !mountRef.current || !window.YT) return;
      playerRef.current = new window.YT.Player(mountRef.current, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onStateChange: (event: { data: number }) => {
            const current = Math.round(
              playerRef.current?.getCurrentTime() || 0,
            );
            if (event.data === 1)
              emit("video_play", { positionSeconds: current });
            if (event.data === 2) {
              emit(
                "video_pause",
                {
                  positionSeconds: current,
                  activeSeconds: pendingSeconds.current,
                },
                pendingSeconds.current,
              );
              pendingSeconds.current = 0;
            }
            if (event.data === 0) {
              emit(
                "video_complete",
                {
                  completionPercent: 100,
                  positionSeconds: current,
                  activeSeconds: pendingSeconds.current,
                },
                pendingSeconds.current,
              );
              pendingSeconds.current = 0;
            }
          },
        },
      });
      pulse = window.setInterval(() => {
        const player = playerRef.current;
        if (!player || player.getPlayerState() !== 1 || document.hidden) return;
        const duration = player.getDuration() || 1;
        const current = player.getCurrentTime();
        const percent = Math.min(100, Math.round((current / duration) * 100));
        progressRef.current = percent;
        setProgress(percent);
        setWatchedSeconds((seconds) => seconds + 10);
        pendingSeconds.current += 10;
        if (pendingSeconds.current >= 60) {
          emit(
            "video_progress",
            {
              positionSeconds: Math.round(current),
              completionPercent: percent,
            },
            pendingSeconds.current,
          );
          pendingSeconds.current = 0;
        }
      }, 10000);
    });
    return () => {
      disposed = true;
      window.clearInterval(pulse);
      const player = playerRef.current;
      if (pendingSeconds.current > 0 && player) {
        emit(
          "video_progress",
          {
            positionSeconds: Math.round(player.getCurrentTime()),
            completionPercent: progressRef.current,
          },
          pendingSeconds.current,
        );
        pendingSeconds.current = 0;
      }
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [emit, videoId]);

  return { mountRef, progress, watchedSeconds };
}
