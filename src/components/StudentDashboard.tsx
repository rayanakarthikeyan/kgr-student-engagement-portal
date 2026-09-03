import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Braces,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ClipboardList,
  PlayCircle,
  Target,
} from "lucide-react";
import { useMemo, useState } from "react";
import type {
  AssignmentRecord,
  Course,
  Enrollment,
  LearningRecord,
  LearningResource,
  SessionUser,
} from "../platform/types";

interface StudentDashboardProps {
  user: SessionUser;
  courses: Course[];
  enrollments: Enrollment[];
  resources: LearningResource[];
  assignments: AssignmentRecord[];
  submissions: LearningRecord[];
  onNavigate: (view: string) => void;
  onEnroll: (courseId: string) => Promise<void>;
}

function minutesLabel(minutes: number) {
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function courseCode(assignment: AssignmentRecord) {
  return (
    assignment.course_code ||
    (assignment.subject_id.includes("java") ? "JAVA" : "DBMS")
  );
}

export function StudentDashboard({
  user,
  courses,
  enrollments,
  resources,
  assignments,
  submissions,
  onNavigate,
  onEnroll,
}: StudentDashboardProps) {
  const [enrollingId, setEnrollingId] = useState("");
  const [enrollmentError, setEnrollmentError] = useState("");
  const totalMinutes = enrollments.reduce(
    (sum, item) => sum + item.studyMinutes,
    0,
  );
  const averageProgress = enrollments.length
    ? Math.round(
        enrollments.reduce((sum, item) => sum + item.progress, 0) /
          enrollments.length,
      )
    : 0;
  const submittedIds = new Set(
    submissions
      .filter((item) => item.status !== "draft")
      .map((item) => item.assignment_id),
  );
  const nextAssignment = useMemo(
    () =>
      assignments
        .filter((item) => !submittedIds.has(item.id))
        .toSorted((left, right) =>
          left.due_date.localeCompare(right.due_date),
        )[0],
    [assignments, submissions],
  );
  const nextResource = resources[0];
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="mx-auto max-w-[1440px] space-y-7">
      <section className="flex flex-col gap-5 border-b border-[var(--line)] pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-cyan-600">
            {today}
          </p>
          <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
            Welcome, {user.name.split(" ")[0]}.
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {assignments.length
              ? `You have ${assignments.length} assigned item${assignments.length === 1 ? "" : "s"} to complete.`
              : "Your courses are enrolled. Faculty-published work will appear here."}
          </p>
        </div>
        <button
          className="primary-button self-start"
          onClick={() => onNavigate("coursework")}
          type="button"
        >
          <ClipboardList size={17} />
          Open coursework
          <ArrowRight size={16} />
        </button>
      </section>
      {enrollmentError && (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-sm text-rose-500">
          {enrollmentError}
        </div>
      )}
      <section
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Learning summary"
      >
        {[
          [
            Clock3,
            "Active study",
            minutesLabel(totalMinutes),
            "Tracked from active resources",
            "cyan",
          ],
          [
            Target,
            "Course progress",
            `${averageProgress}%`,
            "Across active enrollments",
            "amber",
          ],
          [
            ClipboardList,
            "Assigned work",
            assignments.length,
            `${assignments.filter((item) => item.assignment_type === "lab" || item.assignment_type === "practice").length} practice and lab items`,
            "emerald",
          ],
          [
            CheckCircle2,
            "Submitted",
            submittedIds.size,
            `${Math.max(0, assignments.length - submittedIds.size)} remaining`,
            "violet",
          ],
        ].map(([Icon, label, value, note, tone]) => {
          const MetricIcon = Icon as typeof Clock3;
          return (
            <article className="metric-panel" key={String(label)}>
              <div className={`metric-icon ${tone}`}>
                <MetricIcon size={19} />
              </div>
              <p>{String(label)}</p>
              <strong>{String(value)}</strong>
              <span>{String(note)}</span>
            </article>
          );
        })}
      </section>
      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section>
          <div className="section-heading">
            <div>
              <h2>Your courses</h2>
              <p>Active learning pathways / Theory + Lab</p>
            </div>
            <span>{courses.length} published</span>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {courses.map((course, index) => {
              const enrollment = enrollments.find(
                (item) => item.courseId === course.id,
              );
              const courseResources = resources.filter(
                (item) => item.courseId === course.id,
              ).length;
              const courseAssignments = assignments.filter(
                (item) => courseCode(item) === course.code,
              ).length;
              return (
                <motion.article
                  className={`course-card ${course.accent}`}
                  key={course.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="course-code">{course.code}</span>
                    <span className="rounded-md border border-[var(--line)] px-2 py-1 text-[10px] font-bold uppercase tracking-[.1em] text-[var(--muted)]">
                      Theory + Lab
                    </span>
                  </div>
                  <h3>{course.title}</h3>
                  <p>{course.description}</p>
                  {enrollment ? (
                    <>
                      <div className="mt-6 flex items-center justify-between text-xs">
                        <span className="text-[var(--muted)]">
                          Overall progress
                        </span>
                        <strong>{enrollment.progress}%</strong>
                      </div>
                      <div className="progress-track mt-2">
                        <span style={{ width: `${enrollment.progress}%` }} />
                      </div>
                      <div className="mt-5 flex items-center gap-5 text-xs text-[var(--muted)]">
                        <span className="flex items-center gap-1.5">
                          <BookOpen size={14} />
                          {courseResources} resources
                        </span>
                        <span className="flex items-center gap-1.5">
                          <ClipboardList size={14} />
                          {courseAssignments} assigned
                        </span>
                      </div>
                      <div className="mt-5 grid grid-cols-2 gap-2">
                        <button
                          className="secondary-button"
                          onClick={() =>
                            onNavigate(
                              course.code === "JAVA"
                                ? "java-learn"
                                : "dbms-learn",
                            )
                          }
                          type="button"
                        >
                          <BookOpen size={16} />
                          Theory
                        </button>
                        <button
                          className="secondary-button"
                          onClick={() =>
                            onNavigate(
                              course.code === "JAVA" ? "java-lab" : "dbms-lab",
                            )
                          }
                          type="button"
                        >
                          <Braces size={16} />
                          Lab work
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      className="primary-button mt-6 w-full"
                      disabled={enrollingId === course.id}
                      onClick={() => {
                        setEnrollingId(course.id);
                        setEnrollmentError("");
                        void onEnroll(course.id)
                          .catch((error) =>
                            setEnrollmentError(
                              error instanceof Error
                                ? error.message
                                : "Enrollment failed",
                            ),
                          )
                          .finally(() => setEnrollingId(""));
                      }}
                      type="button"
                    >
                      {enrollingId === course.id
                        ? "Enrolling..."
                        : "Enroll in course"}
                      <ArrowRight size={16} />
                    </button>
                  )}
                </motion.article>
              );
            })}
          </div>
        </section>
        <aside className="space-y-4">
          <div className="section-heading">
            <div>
              <h2>Up next</h2>
              <p>Live priority queue</p>
            </div>
          </div>
          {nextAssignment ? (
            <article className="panel p-5">
              <div className="flex items-start justify-between">
                <span className="tag amber">
                  {nextAssignment.assignment_type || "Coursework"}
                </span>
                <span className="text-xs text-[var(--muted)]">
                  {nextAssignment.max_marks} marks
                </span>
              </div>
              <h3 className="mt-4 text-base font-semibold">
                {nextAssignment.title}
              </h3>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                {courseCode(nextAssignment)} / Unit{" "}
                {nextAssignment.unit_number || 1}
              </p>
              <div className="mt-5 flex items-center gap-2 text-xs text-amber-600">
                <CalendarClock size={16} />
                Due{" "}
                {new Date(
                  `${nextAssignment.due_date}T00:00:00`,
                ).toLocaleDateString()}
              </div>
              <button
                className="primary-button mt-5 w-full"
                onClick={() =>
                  onNavigate(
                    nextAssignment.assignment_type === "assessment"
                      ? "assessment"
                      : nextAssignment.assignment_type === "lab"
                        ? courseCode(nextAssignment) === "JAVA"
                          ? "java-lab"
                          : "dbms-lab"
                        : "coursework",
                  )
                }
                type="button"
              >
                <PlayCircle size={16} />
                Open assignment
              </button>
            </article>
          ) : (
            <article className="panel empty-panel min-h-48">
              <CheckCircle2 size={26} />
              <span>No pending coursework.</span>
            </article>
          )}
          {nextResource ? (
            <article className="panel p-5">
              <span className="tag cyan">Faculty resource</span>
              <h3 className="mt-3 text-base font-semibold">
                {nextResource.title}
              </h3>
              <p className="mt-2 text-xs text-[var(--muted)]">
                {nextResource.topic || "Course resource"} /{" "}
                {nextResource.durationMinutes} min
              </p>
              <button
                className="secondary-button mt-4 w-full"
                onClick={() =>
                  onNavigate(
                    nextResource.courseCode === "JAVA"
                      ? "java-learn"
                      : "dbms-learn",
                  )
                }
                type="button"
              >
                <BookOpen size={16} />
                Open resource
              </button>
            </article>
          ) : (
            <article className="panel p-5">
              <BookOpen size={20} className="text-[var(--muted)]" />
              <h3 className="mt-3 text-sm font-semibold">Resource library</h3>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                Faculty-published videos and PDFs will appear here.
              </p>
            </article>
          )}
        </aside>
      </div>
    </div>
  );
}
