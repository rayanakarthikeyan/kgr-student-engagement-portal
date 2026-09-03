import {
  BookOpen,
  CalendarDays,
  Check,
  ExternalLink,
  GraduationCap,
  LoaderCircle,
  Plus,
  Trash2,
  UserRoundCheck,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { publishCourseToCohort } from "../platform/api";
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

  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");
  const [sections, setSections] = useState<string[]>([]);
  const [audience, setAudience] = useState<"all" | "cohort">("all");
  const [notice, setNotice] = useState("");
  const [publishing, setPublishing] = useState(false);

  // Mock enrollment records to show in the table
  const [publishedEnrollments, setPublishedEnrollments] = useState<
    Array<{
      id: string;
      courseId: string;
      target: {
        audience: "all" | "cohort";
        department?: string;
        year?: string;
        sections?: string[];
      };
      createdAt: string;
    }>
  >([]);

  useEffect(() => {
    // In a real app we might fetch existing published courses here
  }, [session.token]);

  const publish = async (event: React.FormEvent) => {
    event.preventDefault();
    if (audience === "cohort" && !department && !year && sections.length === 0) {
      setNotice("Please select at least one cohort criteria (Department, Year, or Section).");
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
      const target = {
        audience,
        department,
        year,
        sections,
      };

      await publishCourseToCohort(session.token, courseIdToAssign, target);

      setPublishedEnrollments((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          courseId: courseIdToAssign,
          target,
          createdAt: new Date().toISOString().slice(0, 10),
        },
      ]);

      setShowForm(false);
      setNotice(`Course published successfully to target audience.`);
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
          <p>Total assignments</p>
          <strong>
            {publishedEnrollments.length}
          </strong>
          <span>Published cohorts</span>
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
              Define the target cohort (department, year, sections) for your course.
            </p>
          </div>
          <button
            className="primary-button bg-indigo-600 hover:bg-indigo-700"
            onClick={() => setShowForm((value) => !value)}
            type="button"
          >
            {showForm ? <X size={17} /> : <Plus size={17} />}{" "}
            {showForm ? "Close" : "Publish to cohort"}
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
                      <h3 className="text-sm font-semibold">Define target audience</h3>
                    </div>
                  </div>
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
                    className={`flex-1 ${audience === "cohort" ? "active" : ""}`}
                    onClick={() => setAudience("cohort")}
                    type="button"
                  >
                    <UserRoundCheck size={14} className="mr-1 inline" />
                    Specific cohort
                  </button>
                </div>
                {audience === "cohort" && (
                  <div className="mt-5 grid gap-5 border-t border-[var(--line)] pt-5 sm:grid-cols-2">
                    <label>
                      Department
                      <select
                        className="profile-select"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                      >
                        <option value="">Any Department</option>
                        {["CSE", "CSM", "CSD", "ECE", "EEE"].map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Year
                      <select
                        className="profile-select"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                      >
                        <option value="">Any Year</option>
                        {["1", "2", "3", "4"].map((y) => (
                          <option key={y} value={y}>
                            Year {y}
                          </option>
                        ))}
                      </select>
                    </label>

                    <fieldset className="sm:col-span-2">
                      <legend className="mb-2 text-sm font-medium">Sections</legend>
                      <div className="flex flex-wrap gap-4 rounded-md border border-[var(--line)] bg-[var(--surface)] p-4">
                        {["A", "B", "C", "D", "E", "F"].map((sec) => (
                          <label
                            key={sec}
                            className="flex cursor-pointer items-center gap-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={sections.includes(sec)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSections([...sections, sec]);
                                } else {
                                  setSections(sections.filter((s) => s !== sec));
                                }
                              }}
                            />
                            {sec}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  </div>
                )}
              </section>
            </div>

            <footer className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-end">
              <button
                className="primary-button bg-indigo-600 hover:bg-indigo-700"
                disabled={publishing || (audience === "cohort" && !department && !year && sections.length === 0)}
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
                <th>Target Audience</th>
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
                      {enrollment.target.audience === "all" ? (
                        <span className="tag success">All students</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {enrollment.target.department && (
                            <span className="tag warning">
                              {enrollment.target.department}
                            </span>
                          )}
                          {enrollment.target.year && (
                            <span className="tag warning">
                              Year {enrollment.target.year}
                            </span>
                          )}
                          {enrollment.target.sections &&
                            enrollment.target.sections.length > 0 && (
                              <span className="tag warning">
                                Sec {enrollment.target.sections.join(", ")}
                              </span>
                            )}
                        </div>
                      )}
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
