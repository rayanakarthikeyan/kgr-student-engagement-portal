import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  Printer,
  Search,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  loadCoursework,
  loadResourceActivity,
  loadStudentWork,
  loadAiChatLogs,
  bulkAutoGrade,
} from "../platform/api";
import type {
  AssignmentRecord,
  AuthSession,
  LearningRecord,
  SessionUser,
} from "../platform/types";
import { CohortFilters, matchesCohort } from "./CohortFilters";

type Activity = Awaited<ReturnType<typeof loadResourceActivity>>[number];
function groupByUser<T>(rows: T[], key: (row: T) => string) {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const id = key(row);
    const group = groups.get(id) || [];
    group.push(row);
    groups.set(id, group);
  }
  return groups;
}

export function FacultyAnalytics({
  session,
  compact = false,
}: {
  session: AuthSession;
  compact?: boolean;
}) {
  const [students, setStudents] = useState<SessionUser[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [submissions, setSubmissions] = useState<LearningRecord[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [details, setDetails] = useState<LearningRecord[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [aiLogs, setAiLogs] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [section, setSection] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [page, setPage] = useState(0);
  const [report, setReport] = useState<"roster" | "student" | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isGrading, setIsGrading] = useState(false);
  const [gradeMessage, setGradeMessage] = useState("");

  const loadData = () => {
    let active = true;
    setLoading(true);
    void Promise.all([
      loadCoursework(session.token, true),
      loadResourceActivity(session.token),
    ])
      .then(([data, activity]) => {
        if (!active) return;
        setStudents(data.students);
        setAssignments(data.assignments);
        setSubmissions(data.submissions);
        setActivities(activity);
        if (!selectedId && data.students.length > 0)
          setSelectedId(data.students[0].id);
      })
      .catch((caught) => {
        if (active)
          setError(
            caught instanceof Error
              ? caught.message
              : "Could not load insights",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  };

  useEffect(() => {
    return loadData();
  }, [session.token]);

  const handleBulkGrade = async () => {
    setIsGrading(true);
    setGradeMessage("Evaluating pending submissions with Gemini AI...");
    try {
      const response = await bulkAutoGrade(session.token);
      setGradeMessage(response.message);
      loadData();
    } catch (err) {
      setGradeMessage(
        err instanceof Error ? err.message : "Auto-grading failed.",
      );
    } finally {
      setIsGrading(false);
      setTimeout(() => setGradeMessage(""), 5000);
    }
  };

  useEffect(() => {
    setPage(0);
  }, [query, department, section]);

  const summaries = useMemo(() => {
    const records = groupByUser(submissions, (row) => row.author_id);
    const logs = groupByUser(activities, (row) => row.user_id);
    const byAssignment = new Map(assignments.map((item) => [item.id, item]));
    return new Map(
      students.map((student) => {
        const work = assignments.filter((item) =>
          item.assigned_user_ids.includes(student.id),
        );
        const history = records.get(student.id) || [];
        const events = logs.get(student.id) || [];
        const final = history.filter((item) => item.status !== "draft");
        const scored = final.filter(
          (item) =>
            typeof item.score === "number" &&
            Number(byAssignment.get(item.assignment_id || "")?.max_marks) > 0,
        );
        const score = scored.length
          ? Math.round(
              scored.reduce(
                (sum, item) =>
                  sum +
                  (Number(item.score) /
                    Number(
                      byAssignment.get(item.assignment_id || "")?.max_marks,
                    )) *
                    100,
                0,
              ) / scored.length,
            )
          : null;
        const seconds = events
          .filter(
            (item) =>
              item.kind === "video_progress" || item.kind === "pdf_dwell",
          )
          .reduce((sum, item) => sum + Number(item.duration_seconds || 0), 0);
        return [
          student.id,
          {
            work,
            history,
            final,
            score,
            minutes: Math.round(seconds / 60),
            runs: events
              .filter(
                (item) =>
                  item.kind === "code_run" &&
                  byAssignment.get(item.assignment_id || "")
                    ?.assignment_type === "lab",
              )
              .reduce((sum, item) => sum + Number(item.event_count || 1), 0),
            pastes: events
              .filter((item) => item.kind === "editor_paste")
              .reduce((sum, item) => sum + Number(item.event_count || 1), 0),
            violations: events
              .filter((item) => item.kind === "exam_violation")
              .reduce((sum, item) => sum + Number(item.event_count || 1), 0),
            hints: history.reduce(
              (sum, item) =>
                sum +
                (Array.isArray(item.metadata.hints_used)
                  ? item.metadata.hints_used.length
                  : 0),
              0,
            ),
          },
        ];
      }),
    );
  }, [students, submissions, activities, assignments]);
  const filtered = useMemo(
    () =>
      students.filter((student) =>
        matchesCohort(student, query, department, section),
      ),
    [students, query, department, section],
  );
  const selected =
    filtered.find((student) => student.id === selectedId) || filtered[0];
  const effectiveSelectedId = selected?.id;
  useEffect(() => {
    let active = true;
    setDetails([]);
    setDetailsError("");
    if (!effectiveSelectedId) {
      setDetailsLoading(false);
      return;
    }
    setDetailsLoading(true);
    void Promise.all([
      loadStudentWork(session.token, effectiveSelectedId),
      loadAiChatLogs(session.token, effectiveSelectedId),
    ])
      .then(([rows, logs]) => {
        if (active) {
          setDetails(rows);
          setAiLogs(logs);
        }
      })
      .catch((caught) => {
        if (active)
          setDetailsError(
            caught instanceof Error
              ? caught.message
              : "Could not load submissions",
          );
      })
      .finally(() => {
        if (active) setDetailsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [effectiveSelectedId, session.token]);
  const insight = selected ? summaries.get(selected.id) : undefined;
  const pageCount = Math.max(1, Math.ceil(filtered.length / 50));
  const currentPage = Math.min(page, pageCount - 1);
  const pageStudents = filtered.slice(currentPage * 50, (currentPage + 1) * 50);
  const totals = filtered.reduce(
    (sum, student) => {
      const row = summaries.get(student.id)!;
      return {
        submitted: sum.submitted + row.final.length,
        assigned: sum.assigned + row.work.length,
        minutes: sum.minutes + row.minutes,
      };
    },
    { submitted: 0, assigned: 0, minutes: 0 },
  );

  if (loading)
    return (
      <div className="empty-panel min-h-72">
        <Clock3 size={24} className="animate-pulse" />
        Loading cohort data...
      </div>
    );
  const reportTable = (
    <table>
      <thead>
        <tr>
          <th>Name / Roll</th>
          <th>Department / Section</th>
          <th>Email / Contact</th>
          <th>Submitted / Assigned</th>
          <th>Study min</th>
          <th>Average %</th>
        </tr>
      </thead>
      <tbody>
        {filtered.map((student) => {
          const row = summaries.get(student.id)!;
          return (
            <tr key={student.id}>
              <td>
                {student.name}
                <br />
                {student.rollNumber}
              </td>
              <td>
                {student.department || "-"} / {student.section || "-"}
              </td>
              <td>
                {student.email}
                <br />
                {student.contactNumber || "-"}
              </td>
              <td>
                {row.final.length} / {row.work.length}
              </td>
              <td>{row.minutes}</td>
              <td>{row.score ?? "-"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-5">
        <div>
          <p className="text-xs text-[var(--muted)]">KGRCET</p>
          <h2 className="mt-2 text-2xl font-semibold">
            {compact ? "Faculty overview" : "Student insights"}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {gradeMessage && (
            <span className="text-xs font-medium text-emerald-600">
              {gradeMessage}
            </span>
          )}
          <button
            className="primary-button"
            disabled={isGrading || !!error}
            onClick={handleBulkGrade}
          >
            {isGrading ? (
              <Clock3 size={16} className="animate-spin" />
            ) : (
              <Users size={16} />
            )}{" "}
            Auto-Grade Pending
          </button>
          <button
            className="secondary-button"
            disabled={!filtered.length || !!error}
            onClick={() => setReport("roster")}
          >
            <Printer size={16} />
            Print filtered roster
          </button>
        </div>
      </header>
      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-end gap-4">
        <CohortFilters
          department={department}
          section={section}
          onDepartment={setDepartment}
          onSection={setSection}
        />
        <label className="search-control">
          <Search size={16} />
          <input
            aria-label="Search students"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, roll, email or contact"
          />
        </label>
      </div>
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          ["Students", filtered.length],
          ["Submitted / assigned", totals.submitted + " / " + totals.assigned],
          ["Theory study minutes", totals.minutes],
        ].map(([label, value]) => (
          <article className="metric-panel" key={label}>
            <p>{label}</p>
            <strong>{value}</strong>
          </article>
        ))}
      </section>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]">
        <section className="min-w-0">
          
          <div className="grid gap-4 md:hidden">
            {pageStudents.map((student) => {
              const row = summaries.get(student.id)!;
              return (
                <div
                  key={student.id}
                  className={`flex flex-col gap-3 rounded-xl border p-4 shadow-sm transition-colors ${
                    selected?.id === student.id
                      ? "border-cyan-500/50 bg-cyan-500/5"
                      : "border-[var(--line)] bg-[var(--surface)]"
                  }`}
                  onClick={() => setSelectedId(student.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-[var(--ink)] truncate">{student.name}</div>
                      <div className="text-xs text-[var(--muted)] truncate">{student.rollNumber || student.email}</div>
                    </div>
                    <div className="text-right shrink-0">
                       <div className="text-lg font-bold text-cyan-600">{row.score == null ? "-" : row.score + "%"}</div>
                       <div className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Average</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs border-t border-[var(--line)] pt-3 mt-1">
                    <div className="text-[var(--muted)]">
                      Dept/Sec: <strong className="text-[var(--ink)] font-medium">{student.department || "-"} / {student.section || "-"}</strong>
                    </div>
                    <div className="text-[var(--muted)]">
                      Submitted: <strong className="text-[var(--ink)] font-medium">{row.final.length} / {row.work.length}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
            {!filtered.length && (
              <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--muted)]">
                No students match these filters.
              </div>
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="data-table min-w-[560px]">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Dept / Section</th>
                  <th>Submitted</th>
                  <th>Average</th>
                </tr>
              </thead>
              <tbody>
                {pageStudents.map((student) => {
                  const row = summaries.get(student.id)!;
                  return (
                    <tr
                      key={student.id}
                      className={
                        selected?.id === student.id ? "selected-row" : ""
                      }
                    >
                      <td>
                        <button
                          className="text-left"
                          onClick={() => setSelectedId(student.id)}
                        >
                          <strong>{student.name}</strong>
                          <small>{student.rollNumber || student.email}</small>
                        </button>
                      </td>
                      <td>
                        {student.department || "-"} / {student.section || "-"}
                      </td>
                      <td>
                        {row.final.length} / {row.work.length}
                      </td>
                      <td>{row.score == null ? "-" : row.score + "%"}</td>
                    </tr>
                  );
                })}
                {!filtered.length && (
                  <tr>
                    <td colSpan={4}>No students match these filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <footer className="mt-4 flex items-center justify-between text-xs text-[var(--muted)]">
            <span>
              {filtered.length} students / Page {currentPage + 1} of {pageCount}
            </span>
            <div className="flex gap-2">
              <button
                className="icon-button"
                aria-label="Previous page"
                title="Previous page"
                disabled={currentPage === 0}
                onClick={() => setPage(currentPage - 1)}
              >
                <ArrowLeft size={16} />
              </button>
              <button
                className="icon-button"
                aria-label="Next page"
                title="Next page"
                disabled={currentPage + 1 >= pageCount}
                onClick={() => setPage(currentPage + 1)}
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </footer>
        </section>
        <aside className="min-w-0 border-t border-[var(--line)] pt-5 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
          {selected && insight ? (
            <>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold">{selected.name}</h3>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {selected.rollNumber} / {selected.department || "-"} /{" "}
                    {selected.section || "-"}
                  </p>
                </div>
                <button
                  className="icon-button"
                  aria-label="Print student insights"
                  title="Print student insights"
                  onClick={() => setReport("student")}
                >
                  <Printer size={17} />
                </button>
              </div>
              <p className="mt-3 break-all text-sm">{selected.email}</p>
              <p className="mt-1 text-sm">
                {selected.contactNumber || "Contact not recorded"}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {selected.college}
              </p>
              <dl className="mt-5 grid grid-cols-2 gap-4">
                {[
                  ["Study minutes", insight.minutes],
                  ["Average score %", insight.score ?? "-"],
                  ["Lab runs", insight.runs],
                  ["Paste events", insight.pastes],
                  ["Hints opened", insight.hints],
                  ["Proctor violations", insight.violations],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="border-b border-[var(--line)] pb-3"
                  >
                    <dt className="text-xs text-[var(--muted)]">{label}</dt>
                    <dd className="mt-1 text-xl font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
              <h4 className="mt-6 text-sm font-semibold">
                Submitted work and drafts
              </h4>
              {detailsLoading && (
                <p className="mt-3 text-xs">Loading submitted work...</p>
              )}
              {detailsError && (
                <p role="alert" className="mt-3 text-xs text-rose-600">
                  {detailsError}
                </p>
              )}
              {!detailsLoading && !detailsError && !insight.history.length && (
                <p className="mt-3 text-sm text-[var(--muted)]">
                  No work recorded yet.
                </p>
              )}
              {details.slice(0, 20).map((record) => (
                <details
                  key={record.id}
                  className="border-b border-[var(--line)] py-3"
                >
                  <summary className="cursor-pointer text-sm">
                    <strong className="break-words">{record.title}</strong>
                    <span className="mt-1 block text-xs text-[var(--muted)]">
                      {record.status}
                      {record.score != null
                        ? " / " + record.score + " marks"
                        : ""}
                    </span>
                  </summary>
                  <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs">
                    {record.body}
                  </pre>
                  {typeof record.metadata.output === "string" && (
                    <pre className="mt-3 whitespace-pre-wrap break-words text-xs">
                      {record.metadata.output}
                    </pre>
                  )}
                </details>
              ))}
              <h4 className="mt-6 text-sm font-semibold">
                AI Tutor Transcripts
              </h4>
              {aiLogs.length === 0 && (
                <p className="mt-3 text-sm text-[var(--muted)]">
                  No AI tutor chats recorded.
                </p>
              )}
              {aiLogs.length > 0 && (
                <div className="mt-4 space-y-4">
                  {Array.from(new Set(aiLogs.map((l) => l.challenge_id))).map(
                    (cid) => (
                      <details
                        key={cid}
                        className="border border-[var(--line)] rounded-md p-3"
                      >
                        <summary className="cursor-pointer text-sm font-medium">
                          Challenge: {cid}
                        </summary>
                        <div className="mt-3 space-y-3 max-h-80 overflow-y-auto">
                          {aiLogs
                            .filter((l) => l.challenge_id === cid)
                            .map((log) => (
                              <div
                                key={log.id}
                                className={`text-xs p-2 rounded ${log.role === "user" ? "bg-cyan-500/10 ml-4" : "bg-[var(--surface-2)] mr-4"}`}
                              >
                                <strong className="block mb-1">
                                  {log.role === "user" ? "Student" : "AI"}
                                </strong>
                                {log.content}
                              </div>
                            ))}
                        </div>
                      </details>
                    ),
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="empty-panel min-h-48">
              <Users size={24} />
              Select a student
            </div>
          )}
        </aside>
      </div>
      {report &&
        createPortal(
          <section id="faculty-print-report" className="print-report">
            <div className="report-toolbar">
              <button onClick={() => window.print()}>
                <Printer size={16} />
                Print / Save PDF
              </button>
              <button onClick={() => setReport(null)} aria-label="Close report">
                <X size={18} />
                Close
              </button>
            </div>
            <h1>KGRCET</h1>
            <h2>
              {report === "roster"
                ? "Student roster and insights"
                : "Individual student insights"}
            </h2>
            <p>
              {new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}{" "}
              IST / {department || "All departments"} /{" "}
              {section || "All sections"}
            </p>
            {report === "roster"
              ? reportTable
              : selected &&
                insight && (
                  <>
                    <h3>
                      {selected.name} / {selected.rollNumber}
                    </h3>
                    <p>
                      {selected.department} / {selected.section} /{" "}
                      {selected.email} / {selected.contactNumber}
                    </p>
                    <p>
                      Submitted {insight.final.length} of {insight.work.length}.
                      Average {insight.score ?? "-"}%. Theory {insight.minutes}{" "}
                      min. Lab runs {insight.runs}. Paste events{" "}
                      {insight.pastes}. Hints opened {insight.hints}. Proctor
                      violations {insight.violations}.
                    </p>
                    <table>
                      <thead>
                        <tr>
                          <th>Work</th>
                          <th>Type</th>
                          <th>Deadline</th>
                          <th>Status / Marks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {insight.work.map((work) => {
                          const record = insight.history.find(
                            (item) => item.assignment_id === work.id,
                          );
                          return (
                            <tr key={work.id}>
                              <td>{work.title}</td>
                              <td>{work.assignment_type}</td>
                              <td>{work.due_date}</td>
                              <td>
                                {record?.status || "Not started"} /{" "}
                                {record?.score ?? "-"} of {work.max_marks}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </>
                )}
          </section>,
          document.body,
        )}
    </div>
  );
}
