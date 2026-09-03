import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Expand,
  FileCheck2,
  Plus,
  Save,
  ShieldCheck,
  ShieldX,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useProctoring } from "../hooks/useProctoring";
import {
  createAssessment,
  submitAssessment as persistAssessmentSubmission,
} from "../platform/api";
import type { ActivityLog, Assessment, AuthSession } from "../platform/types";

interface ProctoredTestProps {
  session: AuthSession;
  assessment: Assessment;
  onEvent: (event: ActivityLog) => void;
}

function FacultyAssessmentManager({
  assessment,
  token,
}: {
  assessment: Assessment;
  token: string;
}) {
  const [showBuilder, setShowBuilder] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState({
    title: "",
    courseId: "course-java",
    durationMinutes: "30",
    maxViolations: "2",
  });
  const saveDraft = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    try {
      await createAssessment(token, {
        courseId: draft.courseId,
        title: draft.title,
        durationMinutes: Number(draft.durationMinutes),
        totalMarks: 0,
        settings: {
          maxViolations: Number(draft.maxViolations),
          fullscreenRequired: true,
        },
      });
      setShowBuilder(false);
      setDraft({
        title: "",
        courseId: "course-java",
        durationMinutes: "30",
        maxViolations: "2",
      });
      setNotice("Assessment draft saved.");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Assessment could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Published tests", "8", "2 currently available"],
          ["Submissions", "312", "91% completion"],
          ["Average score", "78.4%", "+3.2% this month"],
          ["Flagged sessions", "7", "3 need review"],
        ].map(([label, value, note]) => (
          <article className="metric-panel" key={label}>
            <p>{label}</p>
            <strong>{value}</strong>
            <span>{note}</span>
          </article>
        ))}
      </section>
      {notice && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${notice.includes("saved") ? "border-emerald-500/20 bg-emerald-500/8 text-emerald-500" : "border-rose-500/20 bg-rose-500/8 text-rose-500"}`}
        >
          {notice}
        </div>
      )}
      <section className="panel overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-[var(--line)] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Assessments</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Configure timing, questions, marks, and integrity policy.
            </p>
          </div>
          <button
            className="primary-button"
            onClick={() => setShowBuilder((value) => !value)}
            type="button"
          >
            {showBuilder ? <X size={16} /> : <Plus size={16} />}
            {showBuilder ? "Close builder" : "New assessment"}
          </button>
        </div>
        {showBuilder && (
          <form
            className="resource-form border-b border-[var(--line)] bg-[var(--surface-2)] p-5"
            onSubmit={saveDraft}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label>
                Assessment title
                <input
                  required
                  value={draft.title}
                  onChange={(event) =>
                    setDraft({ ...draft, title: event.target.value })
                  }
                  placeholder="Mid-semester concept check"
                />
              </label>
              <label>
                Course
                <select
                  value={draft.courseId}
                  onChange={(event) =>
                    setDraft({ ...draft, courseId: event.target.value })
                  }
                >
                  <option value="course-java">JAVA</option>
                  <option value="course-dbms">DBMS</option>
                </select>
              </label>
              <label>
                Duration (minutes)
                <input
                  required
                  type="number"
                  min="5"
                  value={draft.durationMinutes}
                  onChange={(event) =>
                    setDraft({ ...draft, durationMinutes: event.target.value })
                  }
                />
              </label>
              <label>
                Violation limit
                <select
                  value={draft.maxViolations}
                  onChange={(event) =>
                    setDraft({ ...draft, maxViolations: event.target.value })
                  }
                >
                  <option value="2">2 focus losses</option>
                  <option value="3">3 focus losses</option>
                </select>
              </label>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                className="primary-button"
                disabled={saving}
                type="submit"
              >
                <Save size={16} />
                {saving ? "Saving..." : "Save draft"}
              </button>
            </div>
          </form>
        )}
        <div className="p-5">
          <article className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-5">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <span className="tag cyan">Available</span>
                <h3 className="mt-3 text-lg font-semibold">
                  {assessment.title}
                </h3>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  JAVA · {assessment.questions.length} questions ·{" "}
                  {assessment.totalMarks} marks · {assessment.durationMinutes}{" "}
                  minutes
                </p>
              </div>
              <div className="flex gap-2">
                <button className="secondary-button" type="button">
                  <FileCheck2 size={16} />
                  Preview
                </button>
                <button className="secondary-button" type="button">
                  <ShieldCheck size={16} />
                  Integrity settings
                </button>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-[var(--line)] pt-4 text-center text-xs text-[var(--muted)]">
              <span>
                <strong className="block text-lg text-[var(--ink)]">148</strong>
                Assigned
              </span>
              <span>
                <strong className="block text-lg text-[var(--ink)]">126</strong>
                Submitted
              </span>
              <span>
                <strong className="block text-lg text-amber-500">4</strong>
                Flagged
              </span>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

export function ProctoredTest({
  session,
  assessment,
  onEvent,
}: ProctoredTestProps) {
  const { user } = session;
  const answerKey = `answers-${assessment.id}-${user.id}`;
  const [answers, setAnswers] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(sessionStorage.getItem(answerKey) || "{}");
    } catch {
      return {};
    }
  });
  const [questionIndex, setQuestionIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const proctorViolationRef = useRef(0);

  const completeSubmission = useCallback(
    (automatic: boolean) => {
      if (submitted) return;
      const total = assessment.questions.reduce(
        (sum, question) =>
          sum +
          (answers[question.id] === question.correctIndex ? question.marks : 0),
        0,
      );
      setScore(total);
      setAutoSubmitted(automatic);
      setSubmitted(true);
      sessionStorage.removeItem(answerKey);
      onEvent({
        userId: user.id,
        courseId: assessment.courseId,
        assessmentId: assessment.id,
        kind: "exam_submitted",
        metadata: {
          automatic,
          answers: Object.keys(answers).length,
          score: total,
          totalMarks: assessment.totalMarks,
        },
      });
      void persistAssessmentSubmission(session.token, {
        assessmentId: assessment.id,
        answers,
        score: total,
        violationCount: proctorViolationRef.current,
        automatic,
      }).catch(() => undefined);
      if (document.fullscreenElement) void document.exitFullscreen();
    },
    [
      answerKey,
      answers,
      assessment,
      onEvent,
      session.token,
      submitted,
      user.id,
    ],
  );

  const handleAutoSubmit = useCallback(
    () => completeSubmission(true),
    [completeSubmission],
  );
  const proctor = useProctoring({
    userId: user.id,
    courseId: assessment.courseId,
    assessmentId: assessment.id,
    durationMinutes: assessment.durationMinutes,
    maxViolations: 2,
    onEvent,
    onAutoSubmit: handleAutoSubmit,
  });

  useEffect(() => {
    if (proctor.started && !submitted)
      sessionStorage.setItem(answerKey, JSON.stringify(answers));
  }, [answerKey, answers, proctor.started, submitted]);

  const question = assessment.questions[questionIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = Math.round(
    (answeredCount / Math.max(1, assessment.questions.length)) * 100,
  );

  proctorViolationRef.current = proctor.violations;

  if (user.role !== "student")
    return (
      <FacultyAssessmentManager assessment={assessment} token={session.token} />
    );

  if (submitted)
    return (
      <div className="mx-auto max-w-2xl py-10">
        <div className="panel p-7 text-center sm:p-10">
          <span
            className={`mx-auto grid size-16 place-items-center rounded-full ${autoSubmitted ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"}`}
          >
            {autoSubmitted ? <ShieldX size={30} /> : <CheckCircle2 size={30} />}
          </span>
          <h2 className="mt-5 text-2xl font-semibold">
            {autoSubmitted
              ? "Assessment auto-submitted"
              : "Assessment submitted"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
            {autoSubmitted
              ? "The configured integrity threshold was reached. Your saved answers were submitted and the session was flagged for faculty review."
              : "Your answers and session integrity log have been saved successfully."}
          </p>
          <div className="mx-auto mt-7 grid max-w-md grid-cols-3 gap-3">
            <div className="rounded-lg bg-[var(--surface-2)] p-4">
              <strong className="block text-xl">
                {score}/{assessment.totalMarks}
              </strong>
              <span className="text-xs text-[var(--muted)]">Score</span>
            </div>
            <div className="rounded-lg bg-[var(--surface-2)] p-4">
              <strong className="block text-xl">
                {answeredCount}/{assessment.questions.length}
              </strong>
              <span className="text-xs text-[var(--muted)]">Answered</span>
            </div>
            <div className="rounded-lg bg-[var(--surface-2)] p-4">
              <strong className="block text-xl">{proctor.violations}</strong>
              <span className="text-xs text-[var(--muted)]">Violations</span>
            </div>
          </div>
        </div>
      </div>
    );

  if (!proctor.started)
    return (
      <div className="mx-auto max-w-4xl py-4">
        <div className="grid overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)] lg:grid-cols-[1fr_330px]">
          <section className="p-6 sm:p-9">
            <span className="tag cyan">Available now</span>
            <h2 className="mt-5 text-3xl font-semibold">{assessment.title}</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">
              {assessment.description}
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3">
              <div className="exam-stat">
                <Clock3 size={18} />
                <strong>{assessment.durationMinutes} min</strong>
                <span>Duration</span>
              </div>
              <div className="exam-stat">
                <FileCheck2 size={18} />
                <strong>{assessment.questions.length}</strong>
                <span>Questions</span>
              </div>
              <div className="exam-stat">
                <CheckCircle2 size={18} />
                <strong>{assessment.totalMarks}</strong>
                <span>Marks</span>
              </div>
            </div>
            <button
              className="primary-button mt-8"
              onClick={() => void proctor.begin()}
              type="button"
            >
              <Expand size={17} />
              Enter fullscreen & begin
            </button>
          </section>
          <aside className="border-t border-[var(--line)] bg-[var(--surface-2)] p-6 lg:border-l lg:border-t-0">
            <ShieldCheck size={28} className="text-cyan-500" />
            <h3 className="mt-4 font-semibold">Integrity policy</h3>
            <ul className="mt-4 space-y-4 text-xs leading-5 text-[var(--muted)]">
              <li className="flex gap-2">
                <Check size={15} className="mt-0.5 shrink-0 text-emerald-500" />
                The test runs in fullscreen mode.
              </li>
              <li className="flex gap-2">
                <Check size={15} className="mt-0.5 shrink-0 text-emerald-500" />
                Answers and remaining time save automatically.
              </li>
              <li className="flex gap-2">
                <AlertTriangle
                  size={15}
                  className="mt-0.5 shrink-0 text-amber-500"
                />
                Leaving the tab or window creates a violation.
              </li>
              <li className="flex gap-2">
                <ShieldX size={15} className="mt-0.5 shrink-0 text-rose-500" />
                The second violation automatically submits the test.
              </li>
            </ul>
          </aside>
        </div>
      </div>
    );

  return (
    <div className="mx-auto max-w-[1180px]">
      <AnimatePresence>
        {proctor.warning && (
          <motion.div
            className="proctor-warning fixed left-1/2 top-5 z-[100] flex w-[min(92vw,600px)] -translate-x-1/2 items-start gap-3 rounded-lg border px-4 py-3 shadow-xl shadow-slate-900/10"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <AlertTriangle size={19} className="warning-icon mt-0.5 shrink-0" />
            <div className="flex-1">
              <strong className="block text-sm">Integrity warning</strong>
              <p className="warning-copy mt-1 text-xs">{proctor.warning}</p>
            </div>
            <button
              className="warning-dismiss"
              onClick={proctor.clearWarning}
              type="button"
              aria-label="Dismiss warning"
            >
              <X size={17} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <header className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 sm:px-5">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[.12em] text-cyan-500">
            Proctored session
          </p>
          <h2 className="truncate text-sm font-semibold">{assessment.title}</h2>
        </div>
        <span className="flex items-center gap-2 rounded-md border border-[var(--line)] px-3 py-2 text-sm font-bold tabular-nums">
          <Clock3
            size={16}
            className={
              proctor.remainingSeconds < 300 ? "text-rose-500" : "text-cyan-500"
            }
          />
          {proctor.formattedTime}
        </span>
        <span
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold ${proctor.violations ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"}`}
        >
          <ShieldCheck size={15} />
          {proctor.violations}/2 violations
        </span>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <section className="panel p-5 sm:p-7">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--muted)]">
              Question {questionIndex + 1} of {assessment.questions.length}
            </span>
            <span className="tag neutral">{question.marks} marks</span>
          </div>
          <h3 className="mt-6 text-lg font-medium leading-8 sm:text-xl">
            {question.prompt}
          </h3>
          <div className="mt-7 space-y-3">
            {question.options.map((option, index) => (
              <label
                className={`answer-option ${answers[question.id] === index ? "selected" : ""}`}
                key={option}
              >
                <input
                  checked={answers[question.id] === index}
                  name={question.id}
                  onChange={() =>
                    setAnswers((current) => ({
                      ...current,
                      [question.id]: index,
                    }))
                  }
                  type="radio"
                />
                <span className="answer-letter">
                  {String.fromCharCode(65 + index)}
                </span>
                <span>{option}</span>
              </label>
            ))}
          </div>
          <div className="mt-8 flex items-center justify-between border-t border-[var(--line)] pt-5">
            <button
              className="secondary-button"
              disabled={questionIndex === 0}
              onClick={() => setQuestionIndex((value) => value - 1)}
              type="button"
            >
              <ArrowLeft size={16} />
              Previous
            </button>
            {questionIndex === assessment.questions.length - 1 ? (
              <button
                className="primary-button"
                onClick={() => completeSubmission(false)}
                type="button"
              >
                <CheckCircle2 size={16} />
                Submit assessment
              </button>
            ) : (
              <button
                className="primary-button"
                onClick={() => setQuestionIndex((value) => value + 1)}
                type="button"
              >
                Next
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </section>

        <aside className="panel h-fit p-5">
          <h3 className="text-sm font-semibold">Question navigator</h3>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {assessment.questions.map((item, index) => (
              <button
                className={`question-button ${questionIndex === index ? "current" : ""} ${answers[item.id] !== undefined ? "answered" : ""}`}
                key={item.id}
                onClick={() => setQuestionIndex(index)}
                type="button"
              >
                {index + 1}
              </button>
            ))}
          </div>
          <div className="mt-5">
            <div className="flex justify-between text-[11px] text-[var(--muted)]">
              <span>{answeredCount} answered</span>
              <span>{progress}%</span>
            </div>
            <div className="progress-track mt-2">
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
          <p className="mt-5 flex items-center gap-2 text-[11px] text-[var(--muted)]">
            <Save size={13} className="text-emerald-500" />
            Answers autosaved locally
          </p>
        </aside>
      </div>
    </div>
  );
}
