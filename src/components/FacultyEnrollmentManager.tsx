import {
  BookOpen,
  CalendarDays,
  Check,
  ExternalLink,
  GraduationCap,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
  UserRoundCheck,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { assignCourseToStudents, loadCoursework } from "../platform/api";
import { CohortFilters, matchesCohort } from "./CohortFilters";
import { courses as defaultCourses } from "../platform/demo";
import type { SessionUser } from "../platform/types";

interface FacultyEnrollmentManagerProps {
  session: { token: string; user: SessionUser };
}

export function FacultyEnrollmentManager({
  session,
}: FacultyEnrollmentManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [isNewCourse, setIsNewCourse] = useState(false);
  const [courses, setCourses] = useState(defaultCourses);
  const [selectedCourseId, setSelectedCourseId] = useState(
    defaultCourses[0]?.id || "",
  );
  const [newCourseForm, setNewCourseForm] = useState({
    code: "",
    title: "",
  });

  const [students, setStudents] = useState<SessionUser[]>([]);
  const [studentQuery, setStudentQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [section, setSection] = useState("");
  const [audience, setAudience] = useState<"all" | "selected">("all");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [publishing, setPublishing] = useState(false);

  // Mock enrollment records to show in the table
  const [publishedEnrollments, setPublishedEnrollments] = useState<
    Array<{
      id: string;
      courseId: string;
      assignedUserIds: string[];
      createdAt: string;
    }>
  >([]);

  const filteredStudents = students.filter((student) =>
    matchesCohort(student, studentQuery, department, section),
  );
  const renderedStudents = filteredStudents.slice(0, 100);
  const recipientCount =
    audience === "all" ? students.length : selectedStudentIds.length;

  useEffect(() => {
    let active = true;
    void loadCoursework(session.token, true)
      .then((coursework) => {
        if (!active) return;
        setStudents(coursework.students);
      })
      .catch((error) => {
        if (active)
          setNotice(
            error instanceof Error
              ? error.message
              : "Student data could not be loaded",
          );
      });
    return () => {
      active = false;
    };
  }, [session.token]);

  const publish = async (event: React.FormEvent) => {
    event.preventDefault();
    if (recipientCount === 0) {
      setNotice("Register or select at least one student before publishing.");
      return;
    }

    let courseIdToAssign = selectedCourseId;

    if (isNewCourse) {
      if (!newCourseForm.code.trim() || !newCourseForm.title.trim()) {
        setNotice("Please provide a course code and title.");
        return;
      }
      const newId = `course-${newCourseForm.code.toLowerCase().replace(/\s+/g, "-")}`;
      setCourses((prev) => [
        ...prev,
        {
          id: newId,
          code: newCourseForm.code as "JAVA" | "DBMS",
          title: newCourseForm.title,
          description: "Newly created course",
          accent: "cyan",
          faculty: session.user.name,
          enrolled: 0,
          units: [],
          experiments: [],
        },
      ]);
      courseIdToAssign = newId;
    }

    setPublishing(true);
    setNotice("");
    try {
      const assignedIds =
        audience === "all"
          ? students.map((student) => student.id)
          : selectedStudentIds;

      await assignCourseToStudents(session.token, courseIdToAssign, assignedIds);

      setPublishedEnrollments((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          courseId: courseIdToAssign,
          assignedUserIds: assignedIds,
          createdAt: new Date().toISOString().slice(0, 10),
        },
      ]);

      setShowForm(false);
      setNotice(
        `Course assigned to ${recipientCount} student${recipientCount === 1 ? "" : "s"}.`,
      );
      if (isNewCourse) {
        setIsNewCourse(false);
        setNewCourseForm({ code: "", title: "" });
        setSelectedCourseId(courseIdToAssign);
      }
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Course assignment failed.",
      );
    } finally {
      setPublishing(false);
    }
  };

  const removeEnrollment = (id: string) => {
    if (!window.confirm("Remove this enrollment assignment?")) return;
    setPublishedEnrollments((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <article className="metric-panel">
          <p>Managed courses</p>
          <strong>{courses.length}</strong>
          <span>Available to publish</span>
        </article>
        <article className="metric-panel">
          <p>Total enrollments</p>
          <strong>
            {publishedEnrollments.reduce(
              (sum, curr) => sum + curr.assignedUserIds.length,
              0,
            )}
          </strong>
          <span>Assigned across cohorts</span>
        </article>
        <article className="metric-panel">
          <p>Active cohorts</p>
          <strong>{publishedEnrollments.length}</strong>
          <span>Published instances</span>
        </article>
      </section>

      {notice && (
        <div className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm">
          <span className="flex items-center gap-2">
            <Check size={16} className="text-emerald-500" />
            {notice}
          </span>
          <button
            className="icon-button"
            onClick={() => setNotice("")}
            type="button"
          >
            <X size={15} />
          </button>
        </div>
      )}

      <section className="panel overflow-hidden">
        <header className="flex flex-col gap-4 border-b border-[var(--line)] p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.14em] text-indigo-500">
              Enrollment Management
            </p>
            <h2 className="mt-2 text-lg font-semibold">
              Publish courses to students
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Select specific cohorts by year and section, or assign to all students.
            </p>
          </div>
          <button
            className="primary-button bg-indigo-600 hover:bg-indigo-700"
            onClick={() => setShowForm((value) => !value)}
            type="button"
          >
            {showForm ? <X size={17} /> : <Plus size={17} />}{" "}
            {showForm ? "Close" : "Assign enrollment"}
          </button>
        </header>

        {showForm && (
          <form className="resource-form" onSubmit={publish}>
            <div className="grid lg:grid-cols-2">
              <section className="border-b border-[var(--line)] p-5 lg:border-r">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <BookOpen className="text-indigo-600" size={19} />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[.14em] text-indigo-600">
                        Step 1
                      </p>
                      <h3 className="text-sm font-semibold">Choose course</h3>
                    </div>
                  </div>
                  <button
                    className="text-xs font-medium text-indigo-600 hover:underline"
                    onClick={() => setIsNewCourse(!isNewCourse)}
                    type="button"
                  >
                    {isNewCourse ? "Select existing" : "+ New course"}
                  </button>
                </div>

                {!isNewCourse ? (
                  <div className="grid gap-4">
                    <label>
                      Select Course
                      <select
                        value={selectedCourseId}
                        onChange={(event) =>
                          setSelectedCourseId(event.target.value)
                        }
                      >
                        {courses.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.code} - {course.title}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label>
                      Course Code
                      <input
                        required
                        placeholder="e.g., CS101"
                        value={newCourseForm.code}
                        onChange={(e) =>
                          setNewCourseForm({
                            ...newCourseForm,
                            code: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="sm:col-span-2">
                      Course Title
                      <input
                        required
                        placeholder="e.g., Introduction to Computer Science"
                        value={newCourseForm.title}
                        onChange={(e) =>
                          setNewCourseForm({
                            ...newCourseForm,
                            title: e.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                )}
              </section>

              <section className="border-b border-[var(--line)] p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Users className="text-emerald-600" size={19} />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[.14em] text-emerald-600">
                        Step 2
                      </p>
                      <h3 className="text-sm font-semibold">Choose students</h3>
                    </div>
                  </div>
                  <span className="text-xs text-[var(--muted)]">
                    {recipientCount} selected
                  </span>
                </div>
                <div className="segmented-control w-full sm:w-[360px]">
                  <button
                    className={`flex-1 ${audience === "all" ? "active" : ""}`}
                    onClick={() => setAudience("all")}
                    type="button"
                  >
                    <Users size={14} className="mr-1 inline" />
                    All students
                  </button>
                  <button
                    className={`flex-1 ${audience === "selected" ? "active" : ""}`}
                    onClick={() => setAudience("selected")}
                    type="button"
                  >
                    <UserRoundCheck size={14} className="mr-1 inline" />
                    Selected
                  </button>
                </div>
                {audience === "selected" && (
                  <div className="mt-4 overflow-hidden rounded-md border border-[var(--line)]">
                    <div className="m-2">
                      <CohortFilters
                        department={department}
                        section={section}
                        onDepartment={setDepartment}
                        onSection={setSection}
                      />
                    </div>
                    <div className="m-2 flex flex-wrap gap-2">
                      <label className="search-control min-w-[220px] flex-1">
                        <Search size={14} />
                        <input
                          value={studentQuery}
                          onChange={(event) =>
                            setStudentQuery(event.target.value)
                          }
                          placeholder="Search students"
                        />
                      </label>
                      <button
                        className="secondary-button"
                        onClick={() =>
                          setSelectedStudentIds((current) => [
                            ...new Set([
                              ...current,
                              ...filteredStudents.map((student) => student.id),
                            ]),
                          ])
                        }
                        type="button"
                      >
                        Select filtered
                      </button>
                      <button
                        className="icon-button"
                        onClick={() => setSelectedStudentIds([])}
                        title="Clear selection"
                        type="button"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto border-t border-[var(--line)]">
                      {renderedStudents.map((student) => (
                        <label
                          className="flex cursor-pointer items-center gap-3 border-b border-[var(--line)] px-3 py-2.5 last:border-0"
                          key={student.id}
                        >
                          <input
                            checked={selectedStudentIds.includes(student.id)}
                            onChange={(event) =>
                              setSelectedStudentIds((current) =>
                                event.target.checked
                                  ? [...current, student.id]
                                  : current.filter((id) => id !== student.id),
                              )
                            }
                            type="checkbox"
                          />
                          <span>
                            <strong className="block text-xs">
                              {student.name}
                            </strong>
                            <small className="text-[10px] text-[var(--muted)]">
                              {student.rollNumber || student.email} /{" "}
                              {student.department || "-"} /{" "}
                              {student.section || "-"}
                            </small>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </div>

            <footer className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-end">
              <button
                className="primary-button bg-indigo-600 hover:bg-indigo-700"
                disabled={publishing || recipientCount === 0}
                type="submit"
              >
                {publishing ? (
                  <LoaderCircle className="animate-spin" size={16} />
                ) : (
                  <ExternalLink size={16} />
                )}
                Publish Course
              </button>
            </footer>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="data-table min-w-[800px]">
            <thead>
              <tr>
                <th>Course</th>
                <th>Assigned Date</th>
                <th>Total Students Enrolled</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {publishedEnrollments.map((enrollment) => {
                const course = courses.find((c) => c.id === enrollment.courseId);
                return (
                  <tr key={enrollment.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 place-items-center rounded-md bg-indigo-500/10 text-indigo-600">
                          <GraduationCap size={17} />
                        </span>
                        <span>
                          <strong>{course?.title || "Unknown Course"}</strong>
                          <small>{course?.code || enrollment.courseId}</small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="flex items-center gap-1.5 text-[var(--muted)]">
                        <CalendarDays size={14} />
                        {enrollment.createdAt}
                      </span>
                    </td>
                    <td>
                      <span className="tag success">
                        {enrollment.assignedUserIds.length} Enrolled
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button
                          className="icon-button"
                          onClick={() => removeEnrollment(enrollment.id)}
                          title="Remove assignment"
                          type="button"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {publishedEnrollments.length === 0 && (
                <tr>
                  <td className="text-center" colSpan={4}>
                    No courses have been assigned yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
