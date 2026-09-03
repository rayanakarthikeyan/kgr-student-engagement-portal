import {
  BookOpenText,
  CalendarDays,
  Check,
  Clock3,
  ExternalLink,
  FileText,
  Link2,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
  UserRoundCheck,
  Users,
  Video,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  deleteResource,
  loadCoursework,
  loadResourceActivity,
  publishResource,
} from "../platform/api";
import { CohortFilters, matchesCohort } from "./CohortFilters";
import { curriculumCatalog } from "../platform/curriculum";
import type {
  CourseCode,
  LearningResource,
  ResourceType,
  SessionUser,
} from "../platform/types";

interface FacultyResourceManagerProps {
  token: string;
  resources: LearningResource[];
  onChange: (resources: LearningResource[]) => void;
}

function defaultDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}

function durationLabel(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function FacultyResourceManager({
  token,
  resources,
  onChange,
}: FacultyResourceManagerProps) {
  const initialItem = curriculumCatalog.find(
    (item) => item.courseCode === "JAVA" && item.track === "theory",
  )!;
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | ResourceType>("all");
  const [course, setCourse] = useState<CourseCode>("JAVA");
  const [unit, setUnit] = useState(1);
  const [selectedItemId, setSelectedItemId] = useState(initialItem.id);
  const [form, setForm] = useState({
    title: initialItem.title,
    type: "youtube" as ResourceType,
    externalUrl: "",
    durationMinutes: "15",
    dueDate: defaultDueDate(),
  });
  const [students, setStudents] = useState<SessionUser[]>([]);
  const [studentQuery, setStudentQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [section, setSection] = useState("");
  const [audience, setAudience] = useState<"all" | "selected">("all");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [activity, setActivity] = useState<
    Awaited<ReturnType<typeof loadResourceActivity>>
  >([]);
  const [notice, setNotice] = useState("");
  const [publishing, setPublishing] = useState(false);

  const selectedItem =
    curriculumCatalog.find((item) => item.id === selectedItemId) || initialItem;
  const courseItems = curriculumCatalog.filter(
    (item) => item.track === "theory" && item.courseCode === course,
  );
  const filteredStudents = students.filter((student) =>
    matchesCohort(student, studentQuery, department, section),
  );
  const renderedStudents = filteredStudents.slice(0, 100);
  const recipientCount =
    audience === "all" ? students.length : selectedStudentIds.length;

  useEffect(() => {
    let active = true;
    void Promise.all([loadCoursework(token, true), loadResourceActivity(token)])
      .then(([coursework, logs]) => {
        if (!active) return;
        setStudents(coursework.students);
        setActivity(logs);
      })
      .catch((error) => {
        if (active)
          setNotice(
            error instanceof Error
              ? error.message
              : "Resource data could not be loaded",
          );
      });
    return () => {
      active = false;
    };
  }, [token]);

  const statsByResource = useMemo(() => {
    const result = new Map<
      string,
      {
        learners: number;
        completion: number;
        seconds: number;
        completed: number;
      }
    >();
    resources.forEach((resource) => {
      const rows = activity.filter((row) => row.resource_id === resource.id);
      const byStudent = new Map<
        string,
        { seconds: number; progress: number; completed: boolean }
      >();
      rows.forEach((row) => {
        const current = byStudent.get(row.user_id) || {
          seconds: 0,
          progress: 0,
          completed: false,
        };
        current.seconds += Number(row.duration_seconds || 0);
        current.progress = Math.max(
          current.progress,
          Number(row.metadata?.completionPercent || 0),
        );
        current.completed ||= row.kind === "video_complete";
        byStudent.set(row.user_id, current);
      });
      const studentRows = [...byStudent.values()];
      const completionValues = studentRows.map((row) => {
        const timePercent = Math.min(
          100,
          Math.round(
            (row.seconds / Math.max(60, resource.durationMinutes * 60)) * 100,
          ),
        );
        return Math.max(row.progress, timePercent, row.completed ? 100 : 0);
      });
      result.set(resource.id, {
        learners: studentRows.length,
        completion: completionValues.length
          ? Math.round(
              completionValues.reduce((sum, value) => sum + value, 0) /
                completionValues.length,
            )
          : 0,
        seconds: studentRows.reduce((sum, row) => sum + row.seconds, 0),
        completed: completionValues.filter((value) => value >= 90).length,
      });
    });
    return result;
  }, [activity, resources]);

  const filtered = useMemo(
    () =>
      resources.filter((item) => {
        const matchesQuery = `${item.title} ${item.topic} ${item.courseCode}`
          .toLowerCase()
          .includes(query.toLowerCase());
        return (
          matchesQuery && (typeFilter === "all" || item.type === typeFilter)
        );
      }),
    [query, resources, typeFilter],
  );

  const selectCurriculum = (nextCourse: CourseCode, nextUnit: number) => {
    const item = curriculumCatalog.find(
      (entry) =>
        entry.track === "theory" &&
        entry.courseCode === nextCourse &&
        entry.unit === nextUnit,
    );
    if (!item) return;
    setCourse(nextCourse);
    setUnit(nextUnit);
    setSelectedItemId(item.id);
    setForm((current) => ({ ...current, title: item.title }));
  };

  const publish = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedUrl = form.externalUrl.trim();
    const validYoutube = /(?:youtube\.com|youtu\.be)/i.test(normalizedUrl);
    const validPdf =
      /(?:drive\.google\.com|docs\.google\.com|\.pdf(?:\?|$))/i.test(
        normalizedUrl,
      );
    if (
      (form.type === "youtube" && !validYoutube) ||
      (form.type === "pdf" && !validPdf)
    ) {
      setNotice(
        form.type === "youtube"
          ? "Enter a valid YouTube URL."
          : "Enter a published Google Drive or PDF URL.",
      );
      return;
    }
    if (recipientCount === 0) {
      setNotice("Register or select at least one student before publishing.");
      return;
    }

    setPublishing(true);
    setNotice("");
    try {
      const resource = await publishResource(token, {
        courseId: course === "JAVA" ? "course-java" : "course-dbms",
        title: form.title,
        topic: selectedItem.title,
        type: form.type,
        externalUrl: normalizedUrl,
        durationMinutes: Number(form.durationMinutes),
        curriculumItemId: selectedItem.id,
        courseCode: course,
        unitNumber: unit,
        dueDate: form.dueDate,
        assignedUserIds:
          audience === "all"
            ? students.map((student) => student.id)
            : selectedStudentIds,
      });
      onChange([resource, ...resources]);
      setForm((current) => ({ ...current, externalUrl: "" }));
      setShowForm(false);
      setNotice(
        `Theory resource assigned to ${recipientCount} student${recipientCount === 1 ? "" : "s"}.`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Resource publishing failed.",
      );
    } finally {
      setPublishing(false);
    }
  };

  const remove = async (resource: LearningResource) => {
    if (!window.confirm(`Delete "${resource.title}"?`)) return;
    try {
      await deleteResource(token, resource.id);
      onChange(resources.filter((item) => item.id !== resource.id));
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Resource could not be deleted",
      );
    }
  };

  const totalSeconds = [...statsByResource.values()].reduce(
    (sum, stat) => sum + stat.seconds,
    0,
  );
  const activeLearners = new Set(
    activity.filter((row) => row.resource_id).map((row) => row.user_id),
  ).size;
  const averageCompletion = resources.length
    ? Math.round(
        [...statsByResource.values()].reduce(
          (sum, stat) => sum + stat.completion,
          0,
        ) / resources.length,
      )
    : 0;

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="metric-panel">
          <p>Assigned resources</p>
          <strong>{resources.length}</strong>
          <span>Unit-linked theory material</span>
        </article>
        <article className="metric-panel">
          <p>Average progress</p>
          <strong>{averageCompletion}%</strong>
          <span>Playback and focused reading</span>
        </article>
        <article className="metric-panel">
          <p>Active learners</p>
          <strong>{activeLearners}</strong>
          <span>Students with tracked engagement</span>
        </article>
        <article className="metric-panel">
          <p>Focused study</p>
          <strong>{durationLabel(totalSeconds)}</strong>
          <span>Aggregated active time</span>
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
            <p className="text-xs font-bold uppercase tracking-[.14em] text-cyan-600">
              Theory learning
            </p>
            <h2 className="mt-2 text-lg font-semibold">
              Assign videos and reading
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              YouTube and Drive links remain external while active engagement is
              monitored.
            </p>
          </div>
          <button
            className="primary-button"
            onClick={() => setShowForm((value) => !value)}
            type="button"
          >
            {showForm ? <X size={17} /> : <Plus size={17} />}{" "}
            {showForm ? "Close" : "Assign resource"}
          </button>
        </header>

        {showForm && (
          <form className="resource-form" onSubmit={publish}>
            <div className="grid lg:grid-cols-2">
              <section className="border-b border-[var(--line)] p-5 lg:border-r">
                <div className="mb-5 flex items-center gap-3">
                  <BookOpenText className="text-cyan-600" size={19} />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[.14em] text-cyan-600">
                      Step 1
                    </p>
                    <h3 className="text-sm font-semibold">
                      Choose theory unit
                    </h3>
                  </div>
                </div>
                <div className="segmented-control w-full">
                  {(["JAVA", "DBMS"] as CourseCode[]).map((value) => (
                    <button
                      className={`flex-1 ${course === value ? "active" : ""}`}
                      key={value}
                      onClick={() => selectCurriculum(value, unit)}
                      type="button"
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-[130px_minmax(0,1fr)]">
                  <label>
                    Unit
                    <select
                      value={unit}
                      onChange={(event) =>
                        selectCurriculum(course, Number(event.target.value))
                      }
                    >
                      {courseItems.map((item) => (
                        <option key={item.id} value={item.unit}>
                          Unit {item.unit}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Resource title
                    <input
                      required
                      value={form.title}
                      onChange={(event) =>
                        setForm({ ...form, title: event.target.value })
                      }
                    />
                  </label>
                </div>
                <div className="mt-4 border-l-2 border-cyan-500 bg-[var(--surface-2)] px-4 py-3">
                  <strong className="text-sm">{selectedItem.title}</strong>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    {selectedItem.brief}
                  </p>
                </div>
              </section>

              <section className="border-b border-[var(--line)] p-5">
                <div className="mb-5 flex items-center gap-3">
                  <Link2 className="text-amber-600" size={19} />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[.14em] text-amber-600">
                      Step 2
                    </p>
                    <h3 className="text-sm font-semibold">
                      Add link and deadline
                    </h3>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label>
                    Resource type
                    <select
                      value={form.type}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          type: event.target.value as ResourceType,
                        })
                      }
                    >
                      <option value="youtube">YouTube video</option>
                      <option value="pdf">Google Drive / PDF</option>
                    </select>
                  </label>
                  <label>
                    Expected study minutes
                    <input
                      required
                      min="1"
                      max="240"
                      type="number"
                      value={form.durationMinutes}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          durationMinutes: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="sm:col-span-2">
                    External URL
                    <input
                      required
                      type="url"
                      value={form.externalUrl}
                      onChange={(event) =>
                        setForm({ ...form, externalUrl: event.target.value })
                      }
                      placeholder={
                        form.type === "youtube"
                          ? "https://youtube.com/watch?v=..."
                          : "https://drive.google.com/file/d/.../preview"
                      }
                    />
                  </label>
                  <label>
                    Deadline
                    <input
                      required
                      min={new Date().toISOString().slice(0, 10)}
                      type="date"
                      value={form.dueDate}
                      onChange={(event) =>
                        setForm({ ...form, dueDate: event.target.value })
                      }
                    />
                  </label>
                </div>
              </section>
            </div>

            <section className="border-b border-[var(--line)] p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Users className="text-emerald-600" size={19} />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[.14em] text-emerald-600">
                      Step 3
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
            <footer className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-xs text-[var(--muted)]">
                <CalendarDays size={15} />
                Unit {unit} resource due {form.dueDate}
              </p>
              <button
                className="primary-button"
                disabled={publishing || recipientCount === 0}
                type="submit"
              >
                {publishing ? (
                  <LoaderCircle className="animate-spin" size={16} />
                ) : (
                  <ExternalLink size={16} />
                )}
                Assign and monitor
              </button>
            </footer>
          </form>
        )}

        <div className="flex flex-col gap-3 border-y border-[var(--line)] p-4 sm:flex-row sm:items-center">
          <label className="search-control flex-1">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search unit resources"
            />
          </label>
          <div className="segmented-control">
            {[
              ["all", "All"],
              ["youtube", "Videos"],
              ["pdf", "Reading"],
            ].map(([id, label]) => (
              <button
                className={typeFilter === id ? "active" : ""}
                key={id}
                onClick={() => setTypeFilter(id as typeof typeFilter)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[980px]">
            <thead>
              <tr>
                <th>Resource</th>
                <th>Unit</th>
                <th>Deadline</th>
                <th>Assigned</th>
                <th>Progress</th>
                <th>Active time</th>
                <th>Completed</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((resource) => {
                const stats = statsByResource.get(resource.id) || {
                  learners: 0,
                  completion: 0,
                  seconds: 0,
                  completed: 0,
                };
                return (
                  <tr key={resource.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span
                          className={`grid size-9 place-items-center rounded-md ${resource.type === "youtube" ? "bg-cyan-500/10 text-cyan-600" : "bg-amber-500/10 text-amber-600"}`}
                        >
                          {resource.type === "youtube" ? (
                            <Video size={17} />
                          ) : (
                            <FileText size={17} />
                          )}
                        </span>
                        <span>
                          <strong>{resource.title}</strong>
                          <small>
                            {resource.type === "youtube"
                              ? "YouTube"
                              : "Drive / PDF"}{" "}
                            · {resource.durationMinutes} min
                          </small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="tag neutral">
                        {resource.courseCode} / U{resource.unitNumber}
                      </span>
                    </td>
                    <td>{resource.dueDate || "Open"}</td>
                    <td>
                      {resource.assignedUserIds.length || students.length}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="progress-track w-20">
                          <span style={{ width: `${stats.completion}%` }} />
                        </div>
                        <span>{stats.completion}%</span>
                      </div>
                    </td>
                    <td>
                      <span className="flex items-center gap-1.5">
                        <Clock3 size={14} />
                        {durationLabel(stats.seconds)}
                      </span>
                    </td>
                    <td>
                      {stats.completed} / {stats.learners}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <a
                          className="icon-button"
                          href={resource.externalUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="Open resource"
                        >
                          <ExternalLink size={14} />
                        </a>
                        <button
                          className="icon-button"
                          onClick={() => void remove(resource)}
                          title="Delete resource"
                          type="button"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td className="text-center" colSpan={8}>
                    No theory resources have been assigned.
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
