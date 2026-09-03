import { useMemo, useState } from "react";
import {
  Bot,
  ChevronDown,
  Download,
  Eye,
  FileQuestion,
  MessageSquareText,
  Pencil,
  Plus,
  Printer,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import type { RoleId } from "./data";

export interface LearningRecord {
  id: string;
  kind: "question" | "submission" | "chat";
  author_id: string;
  subject_id?: string | null;
  assignment_id?: string | null;
  title: string;
  body: string;
  status: string;
  score?: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

interface LearningPerson {
  id: string;
  name: string;
  email?: string;
  role: RoleId;
  roll_number?: string;
  batch?: string;
}

interface LearningAssignment {
  id: string;
  title: string;
  subject_id: string;
}

interface EngagementLike {
  kind: string;
  author_id: string;
  created_at?: string;
  metadata: Record<string, unknown>;
}

interface TestCaseDraft {
  input: string;
  output: string;
  hidden: boolean;
}

type CreateLearning = (body: Record<string, unknown>) => Promise<void>;

function metaText(record: LearningRecord, key: string) {
  const value = record.metadata?.[key];
  return typeof value === "string" ? value : "";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const content = rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function assignmentName(
  id: string | null | undefined,
  assignments: LearningAssignment[],
) {
  return (
    assignments.find((assignment) => assignment.id === id)?.title ??
    "General support"
  );
}

function personFor(id: string, people: LearningPerson[]) {
  return people.find((person) => person.id === id);
}

function duration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) return seconds > 0 ? `${seconds}s` : "0 min";
  return minutes < 60
    ? `${minutes} min`
    : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function QuestionBank({
  assignments,
  records,
  onCreate,
  onUpdate,
  onDelete,
}: {
  assignments: LearningAssignment[];
  records: LearningRecord[];
  onCreate: CreateLearning;
  onUpdate: CreateLearning;
  onDelete: (id: string) => Promise<void>;
}) {
  const questions = records.filter((record) => record.kind === "question");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [tests, setTests] = useState<TestCaseDraft[]>([
    { input: "", output: "", hidden: false },
  ]);
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState({
    assignmentId: assignments[0]?.id ?? "",
    category: "SQL Practice",
    title: "",
    prompt: "",
    marks: "10",
    difficulty: "Medium",
    keywords: "",
    answer: "",
    starterCode: "",
  });
  const categories = [
    ...new Set(
      questions.map((question) => metaText(question, "category") || "General"),
    ),
  ].toSorted();
  const filtered = questions.filter((question) => {
    const matchesQuery =
      `${question.title} ${question.body} ${metaText(question, "category")}`
        .toLowerCase()
        .includes(query.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" ||
      (metaText(question, "category") || "General") === categoryFilter;
    return matchesQuery && matchesCategory;
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const assignment = assignments.find(
      (item) => item.id === draft.assignmentId,
    );
    const payload = {
      assignmentId: draft.assignmentId,
      assignment_id: draft.assignmentId,
      subjectId: assignment?.subject_id,
      subject_id: assignment?.subject_id,
      title: draft.title,
      body: draft.prompt,
      score: Number(draft.marks),
      metadata: {
        category: draft.category,
        difficulty: draft.difficulty,
        keywords: draft.keywords
          .split(",")
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean),
        tags: draft.keywords
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        reference_answer: draft.answer,
        starter_code: draft.starterCode,
        test_cases: tests.filter((test) => test.input || test.output),
      },
    };
    if (editingId) await onUpdate({ id: editingId, ...payload });
    else await onCreate({ kind: "question", ...payload });
    setEditingId("");
    setDraft((current) => ({
      ...current,
      title: "",
      prompt: "",
      keywords: "",
      answer: "",
      starterCode: "",
    }));
    setTests([{ input: "", output: "", hidden: false }]);
  };

  const loadQuestion = (question: LearningRecord, edit: boolean) => {
    setEditingId(edit ? question.id : "");
    setDraft({
      assignmentId: question.assignment_id ?? assignments[0]?.id ?? "",
      category: metaText(question, "category") || "General",
      title: question.title,
      prompt: question.body,
      marks: String(question.score ?? 10),
      difficulty: metaText(question, "difficulty") || "Medium",
      keywords: Array.isArray(question.metadata.keywords)
        ? question.metadata.keywords.join(", ")
        : "",
      answer: metaText(question, "reference_answer"),
      starterCode: metaText(question, "starter_code"),
    });
    const savedTests = Array.isArray(question.metadata.test_cases)
      ? (question.metadata.test_cases as TestCaseDraft[])
      : [];
    setTests(
      savedTests.length
        ? savedTests
        : [{ input: "", output: "", hidden: false }],
    );
  };

  return (
    <section className="tool-layout question-bank-layout">
      <article className="panel tool-main">
        <div className="tool-heading">
          <div>
            <FileQuestion size={22} />
            <p className="eyebrow">Faculty authoring</p>
            <h2>Question Bank</h2>
            <p>
              Build reusable prompts, rubrics, starter code, and test cases.
            </p>
          </div>
          <span className="count-badge">{questions.length} questions</span>
        </div>
        <div className="report-filters question-filters">
          <label className="inline-search">
            <Search size={16} />
            <input
              type="search"
              placeholder="Search questions..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label>
            Category
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="dense-table-wrap">
          <table className="dense-table">
            <thead>
              <tr>
                <th>Question</th>
                <th>Category</th>
                <th>Assignment</th>
                <th>Difficulty</th>
                <th>Marks</th>
                <th>Tests</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((question) => {
                const savedTests = Array.isArray(question.metadata.test_cases)
                  ? question.metadata.test_cases
                  : [];
                return (
                  <tr key={question.id}>
                    <td>
                      <strong>{question.title}</strong>
                      <span>{question.body}</span>
                    </td>
                    <td>{metaText(question, "category") || "General"}</td>
                    <td>
                      {assignmentName(question.assignment_id, assignments)}
                    </td>
                    <td>
                      <span className="status-pill">
                        {metaText(question, "difficulty") || "Medium"}
                      </span>
                    </td>
                    <td>{question.score ?? 0}</td>
                    <td>{savedTests.length}</td>
                    <td>
                      <div className="question-actions">
                        <button
                          type="button"
                          onClick={() => loadQuestion(question, false)}
                        >
                          Use for Assignment
                        </button>
                        <button
                          type="button"
                          title="Edit question"
                          onClick={() => loadQuestion(question, true)}
                        >
                          <Pencil size={14} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          title="Delete question"
                          onClick={() => void onDelete(question.id)}
                        >
                          <Trash2 size={14} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7}>No questions match the current filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
      <aside className="panel tool-side question-authoring-panel">
        <div className="side-heading">
          <h2>{editingId ? "Edit Question" : "Add Question"}</h2>
          {editingId && (
            <button
              className="button secondary compact"
              type="button"
              onClick={() => setEditingId("")}
            >
              Cancel
            </button>
          )}
        </div>
        <form className="form-grid single-column" onSubmit={submit}>
          <label>
            Assignment
            <select
              required
              value={draft.assignmentId}
              onChange={(event) =>
                setDraft((value) => ({
                  ...value,
                  assignmentId: event.target.value,
                }))
              }
            >
              {assignments.map((assignment) => (
                <option value={assignment.id} key={assignment.id}>
                  {assignment.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Category
            <input
              required
              value={draft.category}
              onChange={(event) =>
                setDraft((value) => ({
                  ...value,
                  category: event.target.value,
                }))
              }
              placeholder="Normalization"
            />
          </label>
          <label>
            Question title
            <input
              required
              value={draft.title}
              onChange={(event) =>
                setDraft((value) => ({ ...value, title: event.target.value }))
              }
            />
          </label>
          <label>
            Problem statement
            <textarea
              required
              value={draft.prompt}
              onChange={(event) =>
                setDraft((value) => ({ ...value, prompt: event.target.value }))
              }
            />
          </label>
          <div className="form-split">
            <label>
              Difficulty
              <select
                value={draft.difficulty}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    difficulty: event.target.value,
                  }))
                }
              >
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </label>
            <label>
              Marks
              <input
                min="1"
                type="number"
                value={draft.marks}
                onChange={(event) =>
                  setDraft((value) => ({ ...value, marks: event.target.value }))
                }
              />
            </label>
          </div>
          <label>
            Rubric keywords
            <input
              required
              placeholder="join, group, having"
              value={draft.keywords}
              onChange={(event) =>
                setDraft((value) => ({
                  ...value,
                  keywords: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Reference answer
            <textarea
              required
              value={draft.answer}
              onChange={(event) =>
                setDraft((value) => ({ ...value, answer: event.target.value }))
              }
            />
          </label>
          <label>
            Starter code or SQL
            <textarea
              className="code-input"
              value={draft.starterCode}
              onChange={(event) =>
                setDraft((value) => ({
                  ...value,
                  starterCode: event.target.value,
                }))
              }
              placeholder="SELECT ..."
            />
          </label>
          <div className="test-case-header">
            <strong>Output test cases</strong>
            <button
              type="button"
              className="button secondary compact"
              onClick={() =>
                setTests((current) => [
                  ...current,
                  { input: "", output: "", hidden: false },
                ])
              }
            >
              <Plus size={14} />
              Add test
            </button>
          </div>
          <div className="test-case-list">
            {tests.map((test, index) => (
              <div className="test-case-row" key={index}>
                <span>Test {index + 1}</span>
                <input
                  placeholder="Input"
                  value={test.input}
                  onChange={(event) =>
                    setTests((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, input: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
                <input
                  placeholder="Expected output"
                  value={test.output}
                  onChange={(event) =>
                    setTests((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, output: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={test.hidden}
                    onChange={(event) =>
                      setTests((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, hidden: event.target.checked }
                            : item,
                        ),
                      )
                    }
                  />
                  Hidden
                </label>
                <button
                  className="icon-button"
                  type="button"
                  title="Remove test"
                  disabled={tests.length === 1}
                  onClick={() =>
                    setTests((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <button
            className="button"
            type="submit"
            disabled={assignments.length === 0}
          >
            {editingId ? "Save question changes" : "Add to bank"}
          </button>
        </form>
      </aside>
    </section>
  );
}

export function MarksExport({
  assignments,
  records,
  people,
}: {
  assignments: LearningAssignment[];
  records: LearningRecord[];
  people: LearningPerson[];
}) {
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const students = people.filter((person) => person.role === "student");
  const batches = [
    ...new Set(
      students.map((student) => student.batch).filter(Boolean) as string[],
    ),
  ].toSorted();
  const filteredStudents = students.filter(
    (student) => batchFilter === "all" || student.batch === batchFilter,
  );
  const filteredAssignments = assignments.filter(
    (assignment) =>
      assignmentFilter === "all" || assignment.id === assignmentFilter,
  );
  const rows = filteredStudents.flatMap((student) =>
    filteredAssignments.map((assignment) => {
      const record = records.find(
        (item) =>
          item.kind === "submission" &&
          item.author_id === student.id &&
          item.assignment_id === assignment.id,
      );
      return [
        student.batch || "-",
        student.roll_number || "-",
        student.name,
        assignment.title,
        record?.status || "not started",
        record?.score ?? "",
        record ? formatDate(record.created_at) : "-",
      ] as Array<string | number>;
    }),
  );
  const graded = rows.filter((row) => row[4] === "graded").length;
  const submitted = rows.filter((row) => row[4] === "submitted").length;
  return (
    <section className="panel tool-main printable-report">
      <div className="tool-heading">
        <div>
          <Download size={22} />
          <p className="eyebrow">Faculty reporting</p>
          <h2>Marks Export</h2>
          <p>Filter, print, or download the marks register batch-wise.</p>
        </div>
        <div className="heading-actions">
          <button
            className="button secondary"
            type="button"
            onClick={() => window.print()}
          >
            <Printer size={16} />
            Print
          </button>
          <button
            className="button"
            type="button"
            onClick={() =>
              downloadCsv("learning-portal-marks.csv", [
                [
                  "Batch",
                  "Roll Number",
                  "Student",
                  "Assignment",
                  "Status",
                  "Marks",
                  "Submitted",
                ],
                ...rows,
              ])
            }
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>
      <div className="report-filters">
        <label>
          Batch
          <select
            value={batchFilter}
            onChange={(event) => setBatchFilter(event.target.value)}
          >
            <option value="all">All batches</option>
            {batches.map((batch) => (
              <option key={batch}>{batch}</option>
            ))}
          </select>
        </label>
        <label>
          Assignment
          <select
            value={assignmentFilter}
            onChange={(event) => setAssignmentFilter(event.target.value)}
          >
            <option value="all">All assignments</option>
            {assignments.map((assignment) => (
              <option value={assignment.id} key={assignment.id}>
                {assignment.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="report-summary">
        <div>
          <span>Rows</span>
          <strong>{rows.length}</strong>
        </div>
        <div>
          <span>Graded</span>
          <strong>{graded}</strong>
        </div>
        <div>
          <span>Submitted</span>
          <strong>{submitted}</strong>
        </div>
        <div>
          <span>Not started</span>
          <strong>{rows.length - graded - submitted}</strong>
        </div>
      </div>
      <div className="dense-table-wrap">
        <table className="dense-table">
          <thead>
            <tr>
              <th>Batch</th>
              <th>Roll number</th>
              <th>Student</th>
              <th>Assignment</th>
              <th>Status</th>
              <th>Marks</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row[1]}-${row[3]}-${index}`}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>{cell || "-"}</td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7}>No rows match the current filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function AiChatExport({
  assignments,
  records,
  people,
}: {
  assignments: LearningAssignment[];
  records: LearningRecord[];
  people: LearningPerson[];
}) {
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const batches = [
    ...new Set(
      people
        .filter((person) => person.role === "student")
        .map((person) => person.batch)
        .filter(Boolean) as string[],
    ),
  ].toSorted();
  const chats = records
    .filter((record) => record.kind === "chat")
    .filter(
      (record) =>
        assignmentFilter === "all" || record.assignment_id === assignmentFilter,
    )
    .filter(
      (record) =>
        batchFilter === "all" ||
        personFor(record.author_id, people)?.batch === batchFilter,
    );
  const rows = chats.map((record) => {
    const person = personFor(record.author_id, people);
    return [
      person?.batch || "-",
      person?.roll_number || "-",
      person?.name || "Portal user",
      assignmentName(record.assignment_id, assignments),
      record.body,
      metaText(record, "response"),
      formatDate(record.created_at),
    ];
  });
  return (
    <section className="panel tool-main printable-report">
      <div className="tool-heading">
        <div>
          <MessageSquareText size={22} />
          <p className="eyebrow">Support oversight</p>
          <h2>AI Chat Export</h2>
          <p>
            Review assignment-support conversations handled by the private
            built-in tutor.
          </p>
        </div>
        <div className="heading-actions">
          <span className="status-pill success">No external API</span>
          <button
            className="button secondary"
            type="button"
            onClick={() => window.print()}
          >
            <Printer size={16} />
            Print
          </button>
          <button
            className="button"
            type="button"
            onClick={() =>
              downloadCsv("learning-portal-ai-chats.csv", [
                [
                  "Batch",
                  "Roll Number",
                  "Student",
                  "Assignment",
                  "Question",
                  "Guidance",
                  "Time",
                ],
                ...rows,
              ])
            }
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>
      <div className="report-filters">
        <label>
          Batch
          <select
            value={batchFilter}
            onChange={(event) => setBatchFilter(event.target.value)}
          >
            <option value="all">All batches</option>
            {batches.map((batch) => (
              <option key={batch}>{batch}</option>
            ))}
          </select>
        </label>
        <label>
          Assignment
          <select
            value={assignmentFilter}
            onChange={(event) => setAssignmentFilter(event.target.value)}
          >
            <option value="all">All assignments</option>
            {assignments.map((assignment) => (
              <option value={assignment.id} key={assignment.id}>
                {assignment.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="report-summary">
        <div>
          <span>Conversations</span>
          <strong>{chats.length}</strong>
        </div>
        <div>
          <span>Students using support</span>
          <strong>{new Set(chats.map((chat) => chat.author_id)).size}</strong>
        </div>
        <div>
          <span>Assignments covered</span>
          <strong>
            {new Set(chats.map((chat) => chat.assignment_id)).size}
          </strong>
        </div>
        <div>
          <span>External API calls</span>
          <strong>0</strong>
        </div>
      </div>
      <div className="dense-table-wrap">
        <table className="dense-table">
          <thead>
            <tr>
              <th>Batch</th>
              <th>Roll / Student</th>
              <th>Assignment</th>
              <th>Question</th>
              <th>Guidance</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {chats.map((record) => {
              const person = personFor(record.author_id, people);
              return (
                <tr key={record.id}>
                  <td>{person?.batch || "-"}</td>
                  <td>
                    <strong>{person?.roll_number || "-"}</strong>
                    <span>{person?.name || "Portal user"}</span>
                  </td>
                  <td>{assignmentName(record.assignment_id, assignments)}</td>
                  <td>{record.body}</td>
                  <td>{metaText(record, "response")}</td>
                  <td>{formatDate(record.created_at)}</td>
                </tr>
              );
            })}
            {chats.length === 0 && (
              <tr>
                <td colSpan={6}>
                  No support conversations match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function StudentRoster({
  people,
  learning,
  engagement,
}: {
  people: LearningPerson[];
  learning: LearningRecord[];
  engagement: EngagementLike[];
}) {
  const [query, setQuery] = useState("");
  const [batchFilter, setBatchFilter] = useState("all");
  const [expandedId, setExpandedId] = useState("");
  const allStudents = people.filter((person) => person.role === "student");
  const batches = [
    ...new Set(
      allStudents.map((student) => student.batch).filter(Boolean) as string[],
    ),
  ].toSorted();
  const students = allStudents
    .filter((student) => batchFilter === "all" || student.batch === batchFilter)
    .filter((student) =>
      `${student.name} ${student.email} ${student.roll_number}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
  return (
    <section className="panel tool-main">
      <div className="tool-heading">
        <div>
          <Users size={22} />
          <p className="eyebrow">Faculty monitoring</p>
          <h2>Student Roster</h2>
          <p>
            Search students and inspect submissions, support chats, and learning
            time.
          </p>
        </div>
        <span className="count-badge">{students.length} students</span>
      </div>
      <div className="report-filters">
        <label className="inline-search">
          <Search size={16} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, email, or roll number..."
          />
        </label>
        <label>
          Batch
          <select
            value={batchFilter}
            onChange={(event) => setBatchFilter(event.target.value)}
          >
            <option value="all">All batches</option>
            {batches.map((batch) => (
              <option key={batch}>{batch}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="dense-table-wrap">
        <table className="dense-table roster-table">
          <thead>
            <tr>
              <th>Roll number</th>
              <th>Student</th>
              <th>Batch</th>
              <th>Submissions</th>
              <th>Average mark</th>
              <th>AI chats</th>
              <th>Learning time</th>
              <th>Portfolio</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              const submissions = learning.filter(
                (record) =>
                  record.kind === "submission" &&
                  record.author_id === student.id,
              );
              const scores = submissions
                .map((record) => Number(record.score))
                .filter(Number.isFinite);
              const chats = learning.filter(
                (record) =>
                  record.kind === "chat" && record.author_id === student.id,
              );
              const sessions = engagement.filter(
                (record) =>
                  record.kind === "time_session" &&
                  record.author_id === student.id,
              );
              const seconds = sessions.reduce(
                (sum, record) =>
                  sum + Number(record.metadata.active_seconds || 0),
                0,
              );
              const expanded = expandedId === student.id;
              return (
                <>
                  {
                    <tr key={student.id}>
                      <td>
                        <strong>{student.roll_number || "-"}</strong>
                      </td>
                      <td>
                        <strong>{student.name}</strong>
                        <span>{student.email || "-"}</span>
                      </td>
                      <td>{student.batch || "-"}</td>
                      <td>{submissions.length}</td>
                      <td>
                        {scores.length
                          ? (
                              scores.reduce((a, b) => a + b, 0) / scores.length
                            ).toFixed(1)
                          : "-"}
                      </td>
                      <td>{chats.length}</td>
                      <td>{duration(seconds)}</td>
                      <td>
                        <button
                          className="button secondary compact"
                          type="button"
                          onClick={() =>
                            setExpandedId(expanded ? "" : student.id)
                          }
                        >
                          <Eye size={14} />{" "}
                          {expanded ? "Hide logs" : "Show logs"}
                          <ChevronDown size={14} />
                        </button>
                      </td>
                    </tr>
                  }
                  {expanded && (
                    <tr className="roster-log-row" key={`${student.id}-logs`}>
                      <td colSpan={8}>
                        <div className="student-log-grid">
                          <div>
                            <span>Recent submissions</span>
                            {submissions.length ? (
                              submissions.slice(0, 3).map((record) => (
                                <p key={record.id}>
                                  <strong>{record.title}</strong>
                                  {record.status}{" "}
                                  {record.score == null
                                    ? ""
                                    : `· ${record.score} marks`}
                                </p>
                              ))
                            ) : (
                              <p>No submissions yet.</p>
                            )}
                          </div>
                          <div>
                            <span>AI support</span>
                            {chats.length ? (
                              chats.slice(0, 3).map((record) => (
                                <p key={record.id}>
                                  <strong>{record.body}</strong>
                                  {metaText(record, "response")}
                                </p>
                              ))
                            ) : (
                              <p>No support chats yet.</p>
                            )}
                          </div>
                          <div>
                            <span>Learning activity</span>
                            <p>
                              <strong>{duration(seconds)}</strong>
                              {sessions.length} tracked session
                              {sessions.length === 1 ? "" : "s"}
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {students.length === 0 && (
              <tr>
                <td colSpan={8}>No students match the current filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function AiAssignmentSupport({
  currentUserId,
  assignments,
  records,
  onCreate,
}: {
  currentUserId: string;
  assignments: LearningAssignment[];
  records: LearningRecord[];
  onCreate: CreateLearning;
}) {
  const [assignmentId, setAssignmentId] = useState(assignments[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const history = useMemo(
    () =>
      records
        .filter(
          (record) =>
            record.kind === "chat" &&
            record.author_id === currentUserId &&
            (!assignmentId || record.assignment_id === assignmentId),
        )
        .toReversed(),
    [assignmentId, currentUserId, records],
  );
  const prompts = [
    "Help me plan the first step",
    "Explain this concept with a smaller example",
    "Check my approach without giving the final answer",
  ];
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      const assignment = assignments.find((item) => item.id === assignmentId);
      await onCreate({
        kind: "chat",
        assignmentId,
        subjectId: assignment?.subject_id,
        message,
        title: "Assignment support",
      });
      setMessage("");
    } finally {
      setSending(false);
    }
  };
  return (
    <section className="ai-support-layout">
      <article className="ai-chat-panel">
        <header className="ai-chat-header">
          <div className="ai-bot-icon">
            <Bot size={22} />
          </div>
          <div>
            <p className="eyebrow">Assignment support</p>
            <h2>AI Learning Assistant</h2>
            <span>Private built-in DBMS tutor · no API required</span>
          </div>
          <span className="status-pill success">
            <Sparkles size={14} />
            Available
          </span>
        </header>
        <div className="ai-context-bar">
          <label>
            Working on
            <select
              value={assignmentId}
              onChange={(event) => setAssignmentId(event.target.value)}
            >
              {assignments.map((assignment) => (
                <option value={assignment.id} key={assignment.id}>
                  {assignment.title}
                </option>
              ))}
            </select>
          </label>
          <div>
            <ShieldCheck size={17} />
            <span>Hints and guided steps, not ready-to-submit answers</span>
          </div>
        </div>
        <div className="chat-history" aria-live="polite">
          {history.length === 0 && (
            <div className="chat-empty">
              <Bot size={30} />
              <h3>Ask about your assignment</h3>
              <p>
                Share the step where you are stuck and what you have already
                tried.
              </p>
            </div>
          )}
          {history.map((record) => (
            <div className="chat-exchange" key={record.id}>
              <div className="chat-bubble student">
                <span>You</span>
                <p>{record.body}</p>
              </div>
              <div className="chat-bubble assistant">
                <span>Learning Assistant</span>
                <p>{metaText(record, "response")}</p>
                <small>{metaText(record, "model")}</small>
              </div>
            </div>
          ))}
        </div>
        <div className="prompt-chips">
          {prompts.map((prompt) => (
            <button
              type="button"
              key={prompt}
              onClick={() => setMessage(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>
        <form className="chat-composer" onSubmit={submit}>
          <textarea
            required
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Describe what you tried and where you are stuck..."
          />
          <button
            className="button icon-submit"
            type="submit"
            disabled={sending}
            title="Send question"
          >
            <Send size={18} />
            <span>{sending ? "Thinking..." : "Send"}</span>
          </button>
        </form>
      </article>
      <aside className="ai-guidance-panel">
        <ShieldCheck size={22} />
        <h2>Private by design</h2>
        <p>
          The tutor runs from portal rules and DBMS guidance stored in the
          application. Student work is not sent to an external AI service.
        </p>
        <ul>
          <li>Assignment-aware guidance</li>
          <li>
            SQL, normalization, transactions, ER modeling, and indexing support
          </li>
          <li>Conversation logs visible to faculty</li>
        </ul>
        <p className="privacy-note">
          The tutor provides hints and checks. Faculty remain responsible for
          grading and feedback.
        </p>
      </aside>
    </section>
  );
}
