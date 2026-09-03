import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ActivityLog } from "../platform/types";

interface ProctoringOptions {
  userId: string;
  courseId: string;
  assessmentId?: string;
  assignmentId?: string;
  durationMinutes: number;
  maxViolations?: number;
  onEvent: (event: ActivityLog) => void;
  onAutoSubmit: () => void;
}

export function useProctoring({
  userId,
  courseId,
  assessmentId,
  assignmentId,
  durationMinutes,
  maxViolations = 2,
  onEvent,
  onAutoSubmit,
}: ProctoringOptions) {
  const activityId = assessmentId || assignmentId || "assessment";
  const storageKey = `exam-${activityId}-${userId}`;
  const [started, setStarted] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(
    durationMinutes * 60,
  );
  const [violations, setViolations] = useState(0);
  const [warning, setWarning] = useState("");
  const lastViolationAt = useRef(0);
  const submittedRef = useRef(false);

  const emit = useCallback(
    (kind: ActivityLog["kind"], metadata: Record<string, unknown>) => {
      onEvent({ userId, courseId, assessmentId, assignmentId, kind, metadata });
    },
    [assessmentId, assignmentId, courseId, onEvent, userId],
  );

  const submitOnce = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    onAutoSubmit();
  }, [onAutoSubmit]);

  const registerViolation = useCallback(
    (reason: string) => {
      const now = Date.now();
      if (
        !started ||
        submittedRef.current ||
        now - lastViolationAt.current < 1200
      )
        return;
      lastViolationAt.current = now;
      setViolations((current) => {
        const next = current + 1;
        setWarning(`${reason}. Violation ${next} of ${maxViolations}.`);
        emit("exam_violation", { reason, count: next });
        if (next >= maxViolations) window.setTimeout(submitOnce, 100);
        return next;
      });
    },
    [emit, maxViolations, started, submitOnce],
  );

  useEffect(() => {
    if (!started) return;
    const onVisibility = () => {
      if (document.hidden) registerViolation("Tab switch detected");
    };
    const onBlur = () => registerViolation("Exam window lost focus");
    const onFullscreen = () => {
      if (!document.fullscreenElement)
        registerViolation("Fullscreen mode exited");
    };
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("fullscreenchange", onFullscreen);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("fullscreenchange", onFullscreen);
      window.removeEventListener("blur", onBlur);
    };
  }, [registerViolation, started]);

  useEffect(() => {
    if (!started || submittedRef.current) return;
    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => {
        const next = Math.max(0, current - 1);
        if (next % 60 === 0) {
          sessionStorage.setItem(
            storageKey,
            JSON.stringify({ remainingSeconds: next, violations }),
          );
          emit("exam_autosave", { remainingSeconds: next, violations });
        }
        if (next === 0) submitOnce();
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [emit, started, storageKey, submitOnce, violations]);

  const begin = useCallback(async () => {
    const saved = sessionStorage.getItem(storageKey);
    if (saved) {
      try {
        const state = JSON.parse(saved) as {
          remainingSeconds?: number;
          violations?: number;
        };
        if (state.remainingSeconds) setRemainingSeconds(state.remainingSeconds);
        if (state.violations) setViolations(state.violations);
      } catch {
        /* Ignore malformed local recovery state. */
      }
    }
    setStarted(true);
    emit("exam_started", { durationMinutes, fullscreenRequested: true });
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      setWarning("Fullscreen could not be started. Keep this window focused.");
    }
  }, [durationMinutes, emit, storageKey]);

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(remainingSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (remainingSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [remainingSeconds]);

  return {
    started,
    begin,
    remainingSeconds,
    formattedTime,
    violations,
    warning,
    clearWarning: () => setWarning(""),
  };
}
