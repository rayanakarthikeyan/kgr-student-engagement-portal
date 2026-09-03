import { useCallback, useEffect, useRef, useState } from "react";
import type { ActivityLog } from "../platform/types";

interface PdfTrackerOptions {
  userId: string;
  courseId: string;
  resourceId: string;
  onEvent: (event: ActivityLog) => void;
}

export function usePdfTracker({
  userId,
  courseId,
  resourceId,
  onEvent,
}: PdfTrackerOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeSeconds, setActiveSeconds] = useState(0);
  const visibleRef = useRef(false);
  const focusedRef = useRef(document.hasFocus());
  const pendingRef = useRef(0);

  const flush = useCallback(
    (seconds: number) => {
      if (seconds <= 0) return;
      onEvent({
        userId,
        courseId,
        resourceId,
        kind: "pdf_dwell",
        durationSeconds: seconds,
        metadata: { viewportVisible: true, documentFocused: true },
      });
    },
    [courseId, onEvent, resourceId, userId],
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current =
          entry.isIntersecting && entry.intersectionRatio >= 0.5;
      },
      { threshold: [0.5] },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onFocus = () => {
      focusedRef.current = true;
    };
    const onBlur = () => {
      focusedRef.current = false;
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    const timer = window.setInterval(() => {
      if (visibleRef.current && focusedRef.current && !document.hidden) {
        setActiveSeconds((current) => {
          const next = current + 5;
          pendingRef.current += 5;
          if (pendingRef.current >= 60) {
            flush(pendingRef.current);
            pendingRef.current = 0;
          }
          return next;
        });
      }
    }, 5000);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
      flush(pendingRef.current);
      pendingRef.current = 0;
    };
  }, [flush]);

  return { containerRef, activeSeconds };
}
