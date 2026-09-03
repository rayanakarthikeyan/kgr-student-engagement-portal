import type { editor } from "monaco-editor";
import { useCallback, useRef, useState } from "react";
import type { ActivityLog, AttemptEvent } from "../platform/types";

interface EditorTelemetryOptions {
  userId: string;
  courseId: string;
  challengeId: string;
  onEvent: (event: ActivityLog) => void;
}

function timelineEvent(
  type: AttemptEvent["type"],
  label: string,
  detail: string,
  severity: AttemptEvent["severity"],
): AttemptEvent {
  return {
    id: crypto.randomUUID(),
    type,
    label,
    detail,
    severity,
    timestamp: new Date().toISOString(),
  };
}

export function useEditorTelemetry({
  userId,
  courseId,
  challengeId,
  onEvent,
}: EditorTelemetryOptions) {
  const [timeline, setTimeline] = useState<AttemptEvent[]>([]);
  const changes = useRef(0);
  const pasteCount = useRef(0);
  const lastError = useRef("");
  const lastValue = useRef("");
  const characterDelta = useRef(0);

  const log = useCallback(
    (kind: ActivityLog["kind"], metadata: Record<string, unknown>) => {
      onEvent({
        userId,
        courseId,
        assignmentId: challengeId,
        kind,
        metadata: { challengeId, ...metadata },
      });
    },
    [challengeId, courseId, onEvent, userId],
  );

  const handleChange = useCallback(
    (value: string | undefined) => {
      const next = value || "";
      changes.current += 1;
      const delta = Math.abs(next.length - lastValue.current.length);
      characterDelta.current += delta;
      lastValue.current = next;
      if (changes.current % 25 === 0) {
        log("editor_change", {
          changes: 25,
          characterDelta: characterDelta.current,
          afterError: Boolean(lastError.current),
        });
        characterDelta.current = 0;
      }
      if (lastError.current && changes.current % 10 === 0) {
        setTimeline((items) => [
          ...items,
          timelineEvent(
            "change",
            "Debugging edit",
            `Code changed after: ${lastError.current}`,
            "neutral",
          ),
        ]);
      }
    },
    [log],
  );

  const handleMount = useCallback(
    (instance: editor.IStandaloneCodeEditor) => {
      const node = instance.getDomNode();
      if (!node) return;
      const onPaste = (event: ClipboardEvent) => {
        const length = event.clipboardData?.getData("text").length || 0;
        pasteCount.current += 1;
        log("editor_paste", {
          pasteCount: pasteCount.current,
          characterCount: length,
        });
        setTimeline((items) => [
          ...items,
          timelineEvent(
            "paste",
            "Paste detected",
            `${length} characters inserted from clipboard`,
            "warning",
          ),
        ]);
      };
      node.addEventListener("paste", onPaste);
      instance.onDidDispose(() => node.removeEventListener("paste", onPaste));
    },
    [log],
  );

  const recordRun = useCallback(
    (result: {
      status: "passed" | "failed" | "error";
      stderr?: string;
      durationMs: number;
    }) => {
      const error =
        result.stderr ||
        (result.status === "failed"
          ? "Output did not match expected result"
          : "");
      log("code_run", {
        status: result.status,
        durationMs: result.durationMs,
        error,
      });
      if (error) {
        lastError.current = error;
        setTimeline((items) => [
          ...items,
          timelineEvent("error", "Run failed", error, "error"),
        ]);
      } else {
        const wasDebugging = Boolean(lastError.current);
        lastError.current = "";
        setTimeline((items) => [
          ...items,
          timelineEvent(
            wasDebugging ? "resolved" : "run",
            wasDebugging ? "Error resolved" : "Tests passed",
            `${result.durationMs} ms execution`,
            "success",
          ),
        ]);
      }
    },
    [log],
  );

  const recordSubmit = useCallback(() => {
    log("code_submit", {
      changes: changes.current,
      pasteCount: pasteCount.current,
      timelineLength: timeline.length,
    });
    setTimeline((items) => [
      ...items,
      timelineEvent(
        "submit",
        "Solution submitted",
        `${changes.current} edits, ${pasteCount.current} paste events`,
        "success",
      ),
    ]);
  }, [log, timeline.length]);

  return { timeline, handleChange, handleMount, recordRun, recordSubmit };
}
