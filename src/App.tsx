import {
  Activity,
  CircleAlert,
  BarChart3,
  BookOpen,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  KeyRound,
  Mail,
  Search,
  Settings,
  UserCheck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  roleConfig,
  roleProfiles,
  studentProfiles,
  type RoleId,
  type Subject,
  type SubjectType,
  type ViewId,
} from "./data";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: RoleId;
  title?: string;
  is_active?: boolean;
  created_at?: string;
}

interface ApiSubject {
  id: string;
  name: string;
  type: SubjectType;
  semester: string;
  section: string;
  department?: string;
  academic_year?: string;
  is_active?: boolean;
}

interface ApiAssignment {
  id: string;
  title: string;
  subject_id: string;
  due_date: string;
  assigned: number;
  submitted: number;
  pending: number;
  reviewed: number;
  subjects?: Pick<ApiSubject, "name" | "type" | "semester" | "section"> | null;
}

interface SessionAuth {
  email: string;
  password: string;
}

interface PortalData {
  users: ApiUser[];
  subjects: ApiSubject[];
  assignments: ApiAssignment[];
}

const navigationByRole: Record<RoleId, { id: ViewId; label: string; icon: React.ElementType }[]> = {
  admin: [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "settings", label: "Manage Users", icon: Settings },
  ],
  faculty: [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "workspace", label: "Student Groups", icon: BookOpen },
    { id: "resources", label: "Students", icon: GraduationCap },
    { id: "activities", label: "Assignments & Quizzes", icon: ClipboardList },
    { id: "analytics", label: "Time Monitor", icon: BarChart3 },
  ],
  student: [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "activities", label: "My Assignments & Quizzes", icon: ClipboardList },
    { id: "analytics", label: "My Learning Time", icon: BarChart3 },
  ],
};

const analytics = [
  ["Assignment completion", 0],
  ["Quiz completion", 0],
  ["Quiz performance", 0],
  ["Average learning time", 0],
  ["Low activity students", 0],
  ["Pending reviews", 0],
] as const;

interface AssignmentCardData {
  title: string;
  subject: string;
  due: string;
  assigned: number;
  submitted: number;
  pending: number;
  reviewed: number;
  progress: number;
}

function toSubjectCard(subject: ApiSubject): Subject {
  return {
    name: subject.name,
    type: subject.type,
    semester: subject.semester,
    section: subject.section,
    faculty: "",
    progress: 0,
    pending: 0,
    doubtCount: 0,
    risk: "Low",
  };
}

function toAssignmentCard(assignment: ApiAssignment, subjectName = "Unassigned"): AssignmentCardData {
  const assigned = assignment.assigned || 0;
  const submitted = assignment.submitted || 0;
  const progress = assigned > 0 ? Math.round((submitted / assigned) * 100) : 0;

  return {
    title: assignment.title,
    subject: assignment.subjects?.name ?? subjectName,
    due: assignment.due_date,
    assigned,
    submitted,
    pending: assignment.pending || 0,
    reviewed: assignment.reviewed || 0,
    progress,
  };
}

function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function accountLabel(user: ApiUser) {
  return user.email.split("@")[0] || user.name;
}

function workTypeLabel(type: SubjectType) {
  if (type === "Theory Only") return "Assignments only";
  if (type === "Lab Only") return "Quizzes only";
  return "Assignments + quizzes";
}

function badgeClass(value: SubjectType | Subject["risk"] | string) {
  if (value === "Lab Only") return "lab";
  if (value === "Theory + Lab" || value === "Recommended") return "mixed";
  if (value === "High" || value === "Unanswered") return "danger";
  if (value === "Medium" || value.includes("Needs") || value.includes("Repeated")) return "risk";
  return "";
}

function LoginScreen({ onLogin }: { onLogin: (role: RoleId, auth: SessionAuth, name?: string) => void }) {
  const [email, setEmail] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Invalid email or password");
      }

      setIsLoading(false);
      onLogin(data.user.role, { email: normalizedEmail, password }, data.user.name);
    } catch (error) {
      setError(error instanceof TypeError ? "Unable to connect to the portal server" : error instanceof Error ? error.message : "Invalid email or password");
      setIsLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-stack" aria-labelledby="loginTitle">
        <div className="login-logo-mark" aria-hidden="true">
          <span className="wing wing-left" />
          <span className="wing wing-right" />
        </div>
        <div className="login-heading">
          <h1 id="loginTitle">Learning Portal</h1>
          <p>Faculty Assignment, Quiz, and Student Monitoring Portal</p>
        </div>

        <form className="login-panel login-form glass-panel animate-slide-up" onSubmit={handleLogin}>
          <div className="login-gradient-line" />
          <h2>Account Login</h2>
          {error && (
            <div className="login-error">
              <CircleAlert size={16} />
              <span>{error}</span>
            </div>
          )}
          <label>
            Email or Account Name
            <span className="login-input">
              <Mail size={19} />
              <input
                type="text"
                placeholder="admin or name@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isLoading}
              />
            </span>
          </label>
          <label>
            Password
            <span className="login-input">
              <KeyRound size={19} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isLoading}
              />
            </span>
          </label>
          <button className="button login-button" type="submit">
            {isLoading ? "Authenticating..." : "Sign In"}
          </button>
          <div className="demo-login-actions" aria-label="Demo accounts">
            <button className="button secondary" type="button" onClick={() => { setEmail("faculty.demo"); setPassword("faculty123"); }}>
              Faculty demo
            </button>
            <button className="button secondary" type="button" onClick={() => { setEmail("student.demo"); setPassword("student123"); }}>
              Student demo
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

function MetricGrid({ role }: { role: RoleId }) {
  return (
    <section className="summary-grid">
      {roleProfiles[role].metrics.map(([label, value, trend]) => (
        <article className="metric-card" key={label}>
          <span className="metric-label">{label}</span>
          <strong>{value}</strong>
          <span className="metric-trend">{trend}</span>
        </article>
      ))}
    </section>
  );
}

function FilterBar({ role }: { role: RoleId }) {
  return (
    <div className="filter-bar">
      {roleConfig[role].filters.map((filter) => (
        <select aria-label={filter} key={filter}>
          <option>{filter}</option>
          <option>All</option>
          <option>Needs attention</option>
        </select>
      ))}
      <button className="button secondary" type="button">
        Apply filters
      </button>
    </div>
  );
}

function AnalyticsBars() {
  return (
    <div className="chart-grid">
      {analytics.map(([label, value]) => (
        <div className="bar-row" key={label}>
          <strong>{label}</strong>
          <div className="bar-track">
            <div className="bar" style={{ width: `${value}%` }} />
          </div>
          <span>{value}%</span>
        </div>
      ))}
    </div>
  );
}

function PortalKpis({ role, data }: { role: RoleId; data: PortalData }) {
  const studentCount = data.users.filter((user) => user.role === "student").length;
  const facultyCount = data.users.filter((user) => user.role === "faculty").length;
  const inactiveCount = data.users.filter((user) => user.is_active === false).length;
  const submittedCount = data.assignments.reduce((total, assignment) => total + (assignment.submitted || 0), 0);

  const values = {
    admin: [
      ["Total Accounts", String(data.users.length), "Portal users", UserCheck],
      ["Faculty", String(facultyCount), "Faculty accounts", Activity],
      ["Students", String(studentCount), "Student accounts", UsersIcon],
      ["Inactive", String(inactiveCount), "Disabled accounts", Settings],
    ],
    faculty: [
      ["Active Tasks", String(data.assignments.length), "Learning tasks", ClipboardList],
      ["Enrolled Students", String(studentCount), "Student accounts", UsersIcon],
      ["Submitted", String(submittedCount), "Recorded submissions", FileText],
      ["Learning Time", "0 min", "No time tracked yet", BarChart3],
    ],
    student: [
      ["Pending Work", String(data.assignments.length), "Available tasks", ClipboardList],
      ["Assigned Groups", String(data.subjects.length), "Learning groups", BookOpen],
      ["Submitted", String(submittedCount), "Recorded submissions", FileText],
      ["Learning Time", "0 min", "No time tracked yet", BarChart3],
    ],
  } as const;

  return (
    <section className="portal-kpis" aria-label="Dashboard summary">
      {values[role].map(([label, value, note, Icon]) => (
        <article className="portal-kpi" key={label}>
          <span className="kpi-icon">
            <Icon size={24} />
          </span>
          <div>
            <p>{label}</p>
            <strong>{value}</strong>
            <span>{note}</span>
          </div>
        </article>
      ))}
    </section>
  );
}

function UsersIcon({ size = 24 }: { size?: number }) {
  return <GraduationCap size={size} />;
}

function AssignmentWorkbench({
  role,
  assignments,
  subjects: subjectRows,
  onCreateAssignment,
}: {
  role: RoleId;
  assignments: ApiAssignment[];
  subjects: ApiSubject[];
  onCreateAssignment: (body: Record<string, string | number>) => Promise<void>;
}) {
  const canManage = role === "faculty";
  const cards = assignments.map((assignment) => toAssignmentCard(assignment, subjectRows.find((subject) => subject.id === assignment.subject_id)?.name));
  const [selectedAssignmentTitle, setSelectedAssignmentTitle] = useState(cards[0]?.title ?? "");
  const [localQuery, setLocalQuery] = useState("");
  const [draft, setDraft] = useState({ title: "", subjectId: subjectRows[0]?.id ?? "", dueDate: todayDateInputValue(), assigned: "0" });
  const selectedAssignment = cards.find((assignment) => assignment.title === selectedAssignmentTitle) ?? cards[0] ?? null;
  const filtered = cards.filter((item) => item.title.toLowerCase().includes(localQuery.toLowerCase()));

  useEffect(() => {
    if (!selectedAssignmentTitle && cards[0]) setSelectedAssignmentTitle(cards[0].title);
    if (!draft.subjectId && subjectRows[0]) setDraft((current) => ({ ...current, subjectId: subjectRows[0].id }));
  }, [cards, draft.subjectId, selectedAssignmentTitle, subjectRows]);

  const submitAssignment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const subjectId = draft.subjectId || subjectRows[0]?.id;
    if (!subjectId) return;

    await onCreateAssignment({
      title: draft.title,
      subjectId,
      dueDate: draft.dueDate || todayDateInputValue(),
      assigned: Number(draft.assigned),
      submitted: 0,
      pending: Number(draft.assigned),
      reviewed: 0,
    });
    setDraft({ title: "", subjectId: subjectRows[0]?.id ?? "", dueDate: todayDateInputValue(), assigned: "0" });
  };

  return (
    <section className="workbench-grid">
      <aside className="assignment-rail">
        <div className="rail-header">
          <h2>{role === "student" ? "My Activities" : "Assignments"}</h2>
          {canManage && (
            <button className="button compact" type="button" onClick={() => document.getElementById("assignmentTitle")?.focus()}>
              + New
            </button>
          )}
        </div>
        <label className="search-box rail-search">
          <Search size={18} />
          <span>Search assignments</span>
          <input value={localQuery} type="search" placeholder="Search assignments..." onChange={(event) => setLocalQuery(event.target.value)} />
        </label>
        <div className="assignment-list">
          {filtered.length === 0 && (
            <div className="empty-state">
              <h3>No tasks yet</h3>
              <p>{canManage ? "Create the first assignment or quiz for a student group." : "Your assigned work will appear here."}</p>
            </div>
          )}
          {filtered.map((assignment) => (
            <button
              className={`assignment-card ${selectedAssignment?.title === assignment.title ? "selected" : ""}`}
              type="button"
              key={assignment.title}
              onClick={() => setSelectedAssignmentTitle(assignment.title)}
            >
              <div className="assignment-title-row">
                <h3>{assignment.title}</h3>
                {canManage && <span className="edit-link">Edit</span>}
              </div>
              <div className="assignment-meta">
                <span>{assignment.subject}</span>
                <span>Due: {assignment.due}</span>
              </div>
              <div className="mini-stats">
                <span>
                  <strong>{assignment.assigned}</strong>
                  Assigned
                </span>
                <span>
                  <strong>{assignment.submitted}</strong>
                  Submitted
                </span>
                <span>
                  <strong>{assignment.pending}</strong>
                  Pending
                </span>
                <span>
                  <strong>{assignment.reviewed}</strong>
                  Reviewed
                </span>
              </div>
              <div className="progress strong">
                <span style={{ width: `${assignment.progress}%` }} />
              </div>
            </button>
          ))}
        </div>
      </aside>

      <article className="submission-panel">
        <p className="eyebrow">{canManage ? "Submission workspace" : "Activity details"}</p>
        {selectedAssignment ? (
          <>
            <h2>{selectedAssignment.title}</h2>
            <p>{canManage ? "Review submissions, completion, pending students, and time spent for this assignment or quiz." : "View the due date, status, and details for this assignment or quiz."}</p>
            <select aria-label="Choose assignment">
              {cards.map((assignment) => (
                <option key={assignment.title}>{assignment.title} with {assignment.submitted} submissions</option>
              ))}
            </select>
            <div className="submission-summary">
              <div>
                <strong>{selectedAssignment.submitted}</strong>
                <span>Submitted</span>
              </div>
              <div>
                <strong>{selectedAssignment.pending}</strong>
                <span>Pending</span>
              </div>
              <div>
                <strong>{selectedAssignment.reviewed}</strong>
                <span>Reviewed</span>
              </div>
              <div>
                <strong>{selectedAssignment.progress}%</strong>
                <span>Completion</span>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state large">
            <h2>{canManage ? "Select or create a task" : "No assigned work"}</h2>
            <p>{canManage ? "No assignments or quizzes have been created yet." : "New assignments and quizzes will appear here."}</p>
          </div>
        )}
        {canManage && <form className="form-grid inline-form" onSubmit={submitAssignment}>
          <label>
            Task title
            <input
              id="assignmentTitle"
              required
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="Weekly coding assignment or quiz"
            />
          </label>
          <label>
            Student group
            <select required value={draft.subjectId} onChange={(event) => setDraft((current) => ({ ...current, subjectId: event.target.value }))}>
              <option value="" disabled>
                Create a student group first
              </option>
              {subjectRows.map((subject) => (
                <option value={subject.id} key={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Due date
            <input required type="date" value={draft.dueDate} onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))} />
          </label>
          <label>
            Assigned count
            <input required min="0" type="number" value={draft.assigned} onChange={(event) => setDraft((current) => ({ ...current, assigned: event.target.value }))} />
          </label>
          <div className="actions full-width">
            <button className="button" type="submit" disabled={subjectRows.length === 0}>
              Create assignment / quiz
            </button>
          </div>
        </form>}
      </article>
    </section>
  );
}

function moduleCards(type: SubjectType) {
  return [
    [
      "Assignments",
      "Create, assign, and track submitted or pending assignments for this group.",
      type !== "Lab Only",
      FileText,
    ],
    [
      "Quizzes",
      "Create quick checks, score quiz attempts, and identify students who need follow-up.",
      type !== "Theory Only",
      Activity,
    ],
    [
      "Submissions",
      "Review submitted work, pending students, scores, feedback, and reattempts.",
      true,
      ClipboardList,
    ],
    [
      "Learning Time",
      "Monitor platform time, inactive students, and repeated low-engagement patterns.",
      true,
      BarChart3,
    ],
  ] as const;
}

function Workspace({
  subjects: subjectRows,
  selectedSubject,
  setSelectedSubject,
  onOpen,
  onCreateSubject,
}: {
  subjects: ApiSubject[];
  selectedSubject: number;
  setSelectedSubject: (index: number) => void;
  onOpen: (subject: Subject) => void;
  onCreateSubject: (body: Record<string, string>) => Promise<void>;
}) {
  const subjectCards = subjectRows.map(toSubjectCard);
  const subject = subjectCards[selectedSubject];
  const [draft, setDraft] = useState({ name: "", type: "Theory + Lab" as SubjectType, semester: "", section: "" });

  const submitSubject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onCreateSubject(draft);
    setDraft({ name: "", type: "Theory + Lab", semester: "", section: "" });
  };

  if (!subject) {
    return (
      <section className="workspace-layout">
        <article className="panel">
          <div className="panel-header">
            <div>
              <h2>Student Groups</h2>
              <p>Create only the groups faculty need for assigning and monitoring work.</p>
            </div>
          </div>
          <div className="empty-state">
            <h3>No student groups yet</h3>
            <p>Create a group such as CSE A or Python Batch 1 to assign work.</p>
          </div>
        </article>

        <article className="panel">
          <div className="empty-state large">
            <h2>No group selected</h2>
            <p>Student groups will appear here after they are created.</p>
          </div>
          <SubjectForm draft={draft} setDraft={setDraft} onSubmit={submitSubject} />
        </article>
      </section>
    );
  }

  return (
    <section className="workspace-layout">
      <article className="panel">
        <div className="panel-header">
          <div>
            <h2>Student Groups</h2>
            <p>Assign tasks and quizzes to these groups, then monitor submissions and time spent.</p>
          </div>
        </div>
        {subjectCards.map((item, index) => (
          <button
            className={`subject-card ${index === selectedSubject ? "selected" : ""}`}
            key={item.name}
            type="button"
            onClick={() => setSelectedSubject(index)}
          >
            <h3>{item.name}</h3>
            <p>
              {item.semester} / {item.section}
            </p>
            <span className={`badge ${badgeClass(item.type)}`}>{workTypeLabel(item.type)}</span>
          </button>
        ))}
      </article>

      <article className="panel">
        <div className="panel-header">
          <div>
            <h2>{subject.name}</h2>
            <p>
              Assignment and monitoring group for {subject.semester} {subject.section}
            </p>
          </div>
          <button className="button" type="button" onClick={() => onOpen(subject)}>
            Open group
          </button>
        </div>
        <div className="tabs">
          <button className="tab-button active" type="button">
            Assignments
          </button>
          <button className="tab-button" type="button">
            Quizzes
          </button>
          <button className="tab-button" type="button">
            Submissions
          </button>
          <button className="tab-button" type="button">
            Time spent
          </button>
        </div>
        <div className="module-grid">
          {moduleCards(subject.type)
            .filter(([, , enabled]) => enabled)
            .map(([title, body, , Icon]) => (
              <div className="profile-card" key={title}>
                <Icon size={22} />
                <h3>{title}</h3>
                <p>{body}</p>
                <button className="button secondary" type="button">
                  Manage
                </button>
              </div>
            ))}
        </div>
        <SubjectForm draft={draft} setDraft={setDraft} onSubmit={submitSubject} />
      </article>
    </section>
  );
}

function SubjectForm({
  draft,
  setDraft,
  onSubmit,
}: {
  draft: { name: string; type: SubjectType; semester: string; section: string };
  setDraft: React.Dispatch<React.SetStateAction<{ name: string; type: SubjectType; semester: string; section: string }>>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="form-grid inline-form" onSubmit={onSubmit}>
      <label>
        Group name
        <input required value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="CSE A or Python Batch 1" />
      </label>
      <label>
        Work type
        <select value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as SubjectType }))}>
          <option value="Theory Only">Assignments only</option>
          <option value="Lab Only">Quizzes only</option>
          <option value="Theory + Lab">Assignments + quizzes</option>
        </select>
      </label>
      <label>
        Group label
        <input required value={draft.semester} onChange={(event) => setDraft((current) => ({ ...current, semester: event.target.value }))} placeholder="Batch 2026" />
      </label>
      <label>
        Section or batch
        <input required value={draft.section} onChange={(event) => setDraft((current) => ({ ...current, section: event.target.value }))} placeholder="Group A" />
      </label>
      <div className="actions full-width">
        <button className="button" type="submit">
          Create group
        </button>
      </div>
    </form>
  );
}

function Resources({ role, users }: { role: RoleId; users: ApiUser[] }) {
  const students = users.filter((user) => user.role === "student");

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Students</h2>
          <p>Students added here can receive assignments and quizzes from faculty.</p>
        </div>
        <button className="button" type="button" onClick={() => document.querySelector<HTMLInputElement>('input[placeholder="Student or faculty name"]')?.focus()}>
          Add student
        </button>
      </div>
      <FilterBar role={role} />
      <div className="list-stack">
        {students.length === 0 && (
          <div className="empty-state">
            <h3>No students yet</h3>
            <p>Create student accounts from the Accounts tab to begin assigning work.</p>
          </div>
        )}
        {students.map((student) => (
          <div className="list-row" key={student.id}>
            <div>
              <h3>{student.name}</h3>
              <p>{accountLabel(student)}</p>
            </div>
            <div className="actions">
              <span className="badge">Student</span>
              <span className="muted">{student.is_active === false ? "Inactive" : "Active"}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Activities({ role, assignments, subjects: subjectRows, onCreateAssignment }: { role: RoleId; assignments: ApiAssignment[]; subjects: ApiSubject[]; onCreateAssignment: (body: Record<string, string | number>) => Promise<void> }) {
  const cards = assignments.map((assignment) => toAssignmentCard(assignment, subjectRows.find((subject) => subject.id === assignment.subject_id)?.name));

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Assessments and Activities</h2>
          <p>Tasks with due dates, completion status, quiz scores, submissions, and feedback.</p>
        </div>
        {role === "faculty" && (
          <button className="button" type="button" onClick={() => document.getElementById("assignmentTitle")?.focus()}>
            Create activity
          </button>
        )}
      </div>
      <FilterBar role={role} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Activity</th>
              <th>Type</th>
              <th>Group</th>
              <th>Due</th>
              <th>Status</th>
              <th>Evaluation</th>
            </tr>
          </thead>
          <tbody>
            {cards.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <div className="empty-state">
                    <h3>No activities yet</h3>
                    <p>Assignments and quizzes will appear here.</p>
                  </div>
                </td>
              </tr>
            )}
            {cards.map((assignment) => (
              <tr key={assignment.title}>
                <td data-label="Activity">
                  <strong>{assignment.title}</strong>
                </td>
                <td data-label="Type">Assignment</td>
                <td data-label="Group">{assignment.subject}</td>
                <td data-label="Due">{assignment.due}</td>
                <td data-label="Status">
                  <span className="badge">{assignment.pending > 0 ? "Open" : "Complete"}</span>
                </td>
                <td data-label="Evaluation">{assignment.reviewed} reviewed</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AssignmentWorkbench role={role} assignments={assignments} subjects={subjectRows} onCreateAssignment={onCreateAssignment} />
    </section>
  );
}

function Engagement({ users, assignments }: { users: ApiUser[]; assignments: ApiAssignment[] }) {
  const students = users.filter((user) => user.role === "student");

  return (
    <section className="content-grid">
      <article className="panel">
        <div className="panel-header">
          <div>
            <h2>Learning Time Monitor</h2>
            <p>Track how much time students spend learning on the platform. Detailed timers can be connected to student sessions next.</p>
          </div>
        </div>
        <div className="list-stack">
          {students.length === 0 && (
            <div className="empty-state">
              <h3>No students to monitor</h3>
              <p>Add student accounts to start monitoring learning time.</p>
            </div>
          )}
          {students.map((student) => (
            <div className="list-row" key={student.id}>
              <div>
                <h3>{student.name}</h3>
                <p>{accountLabel(student)}</p>
              </div>
              <span className="badge">0 min tracked</span>
            </div>
          ))}
        </div>
      </article>
      <aside className="panel">
        <h2>Monitoring Summary</h2>
        <p>{assignments.length} active assignments or quizzes.</p>
        <p>{students.length} students available for monitoring.</p>
        <p>Time values currently start at zero until student session tracking is enabled.</p>
      </aside>
    </section>
  );
}

function Analytics({ role }: { role: RoleId }) {
  return (
    <>
      <MetricGrid role={role} />
      <section className="content-grid">
        <article className="panel">
          <div className="panel-header">
            <div>
              <h2>Time and Completion Analytics</h2>
              <p>Faculty monitoring signals for assignments, quizzes, submissions, and platform time.</p>
            </div>
          </div>
          <AnalyticsBars />
        </article>
        <aside className="panel">
          <h2>Student Monitoring Profiles</h2>
          <p>Submitted work, pending tasks, feedback history, quiz attempts, and time spent.</p>
          <div className="profile-grid">
            {studentProfiles.length === 0 && (
              <div className="empty-state">
                <h3>No student profiles yet</h3>
                <p>Monitoring profiles will appear after students are added and begin work.</p>
              </div>
            )}
            {studentProfiles.map(([name, section, subject, progress, weak, trend]) => (
              <div className="profile-card" key={name}>
                <h3>{name}</h3>
                <p>
                  {section} / {subject}
                </p>
                <strong>{progress}</strong>
                <p>Weak topics: {weak}</p>
                <span className={`badge ${badgeClass(trend)}`}>{trend}</span>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </>
  );
}

function AdminOverview({ users, onManageUsers }: { users: ApiUser[]; onManageUsers: () => void }) {
  const facultyCount = users.filter((user) => user.role === "faculty").length;
  const studentCount = users.filter((user) => user.role === "student").length;

  return (
    <section className="content-grid">
      <article className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Portal access</p>
            <h2>Manage faculty and student accounts</h2>
            <p>Create login accounts, assign the correct role, and disable access when needed.</p>
          </div>
          <button className="button" type="button" onClick={onManageUsers}>
            Manage users
          </button>
        </div>
        <div className="submission-summary">
          <div><strong>{facultyCount}</strong><span>Faculty</span></div>
          <div><strong>{studentCount}</strong><span>Students</span></div>
          <div><strong>{users.filter((user) => user.is_active !== false).length}</strong><span>Active</span></div>
          <div><strong>{users.filter((user) => user.is_active === false).length}</strong><span>Inactive</span></div>
        </div>
      </article>
      <aside className="panel">
        <h2>Recent accounts</h2>
        <div className="list-stack">
          {users.slice(0, 5).map((user) => (
            <div className="list-row" key={user.id}>
              <div><h3>{user.name}</h3><p>{accountLabel(user)}</p></div>
              <span className="badge">{user.role === "admin" ? "Super Admin" : user.role}</span>
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}

function SettingsView({ users, onCreateUser, onToggleUser }: { users: ApiUser[]; onCreateUser: (body: Record<string, string>) => Promise<void>; onToggleUser: (user: ApiUser) => Promise<void> }) {
  const [draft, setDraft] = useState({ name: "", email: "", password: "", role: "student" as RoleId, title: "" });

  const submitUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onCreateUser(draft);
    setDraft({ name: "", email: "", password: "", role: "student", title: "" });
  };

  return (
    <section className="content-grid">
      <article className="panel">
        <div className="panel-header">
          <div>
            <h2>Create Account</h2>
            <p>Create faculty and student accounts for assigning and monitoring work.</p>
          </div>
        </div>
        <form className="form-grid" onSubmit={submitUser}>
          <label>
            Name
            <input required value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Student or faculty name" />
          </label>
          <label>
            Email
            <input required type="email" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} placeholder="person@learningportal.test" />
          </label>
          <label>
            Password
            <input required value={draft.password} onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))} placeholder="Temporary password" />
          </label>
          <label>
            Role
            <select value={draft.role} onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value as RoleId }))}>
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
            </select>
          </label>
          <label className="full-width">
            Title
            <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Student or Faculty" />
          </label>
          <div className="actions full-width">
            <button className="button" type="submit">
              Create account
            </button>
          </div>
        </form>
      </article>
      <aside className="panel">
        <h2>Manage Users</h2>
        <div className="list-stack">
          {users.map((user) => (
            <div className="list-row" key={user.id}>
              <div>
                <h3>{user.name}</h3>
                <p>{accountLabel(user)}</p>
              </div>
              <div className="actions">
                <span className="badge">{user.role === "admin" ? "Super Admin" : user.role}</span>
                <button
                  className="button secondary compact"
                  type="button"
                  disabled={user.role === "admin"}
                  onClick={() => void onToggleUser(user)}
                >
                  {user.is_active === false ? "Activate" : "Deactivate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}

function DetailModal({ subject, onClose }: { subject: Subject | null; onClose: () => void }) {
  if (!subject) return null;
  return (
    <div className="modal open" role="dialog" aria-modal="true" aria-labelledby="modalTitle" onMouseDown={onClose}>
      <div className="modal-panel" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Group detail</p>
            <h2 id="modalTitle">{subject.name}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Close modal" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <div className="profile-grid">
            <div className="profile-card">
              <strong>{workTypeLabel(subject.type)}</strong>
              <p>Work type</p>
            </div>
            <div className="profile-card">
              <strong>{subject.progress}%</strong>
              <p>Completion progress</p>
            </div>
            <div className="profile-card">
              <strong>{subject.pending}</strong>
              <p>Pending tasks</p>
            </div>
          </div>
          <h3>Assignments and quizzes</h3>
          <p>Faculty can create tasks, set due dates, and monitor submitted, pending, and reviewed work.</p>
          <h3>Student monitoring</h3>
          <p>Track completion, quiz attempts, feedback, and time spent learning on the platform.</p>
          <h3>Follow-up signals</h3>
          <p>Use pending work and low activity to identify students who need support.</p>
        </div>
      </div>
    </div>
  );
}

export function App() {
  const [role, setRole] = useState<RoleId>("admin");
  const [sessionName, setSessionName] = useState("admin");
  const [sessionAuth, setSessionAuth] = useState<SessionAuth | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [view, setView] = useState<ViewId>("overview");
  const [query, setQuery] = useState("");
  const [selectedSubjectIndex, setSelectedSubjectIndex] = useState(0);
  const [modalSubject, setModalSubject] = useState<Subject | null>(null);
  const [portalData, setPortalData] = useState<PortalData>({ users: [], subjects: [], assignments: [] });
  const [statusMessage, setStatusMessage] = useState("");

  const filteredData = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return portalData;

    return {
      users: portalData.users.filter((user) => `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(search)),
      subjects: portalData.subjects.filter((subject) => `${subject.name} ${subject.semester} ${subject.section}`.toLowerCase().includes(search)),
      assignments: portalData.assignments.filter((assignment) => `${assignment.title} ${assignment.subjects?.name ?? ""}`.toLowerCase().includes(search)),
    };
  }, [portalData, query]);

  const authHeaders = () => ({
    "Content-Type": "application/json",
    ...(sessionAuth ? { "X-User-Email": sessionAuth.email, "X-User-Password": sessionAuth.password } : {}),
  });

  const apiRequest = async <T,>(path: string, options: RequestInit = {}) => {
    const response = await fetch(`${API_BASE_URL}${path}`, options);
    const data = (await response.json()) as T & { error?: string };
    if (!response.ok) throw new Error(data.error ?? "Request failed");
    return data;
  };

  const loadPortalData = async () => {
    const headers = authHeaders();
    const usersPromise = role === "student"
      ? Promise.resolve({ users: [] as ApiUser[] })
      : apiRequest<{ users: ApiUser[] }>("/api/users", { headers });
    const subjectsPromise = role === "admin"
      ? Promise.resolve({ subjects: [] as ApiSubject[] })
      : apiRequest<{ subjects: ApiSubject[] }>("/api/subjects", { headers });
    const assignmentsPromise = role === "admin"
      ? Promise.resolve({ assignments: [] as ApiAssignment[] })
      : apiRequest<{ assignments: ApiAssignment[] }>("/api/assignments", { headers });

    const [usersResponse, subjectsResponse, assignmentsResponse] = await Promise.all([
      usersPromise,
      subjectsPromise,
      assignmentsPromise,
    ]);

    setPortalData({
      users: usersResponse.users,
      subjects: subjectsResponse.subjects,
      assignments: assignmentsResponse.assignments,
    });
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    loadPortalData().catch((error) => setStatusMessage(error instanceof Error ? error.message : "Unable to load portal data"));
  }, [isAuthenticated, role]);

  const createUser = async (body: Record<string, string>) => {
    try {
      await apiRequest<{ user: ApiUser }>("/api/users", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      setStatusMessage("Account created");
      await loadPortalData();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to create account");
      throw error;
    }
  };

  const toggleUser = async (user: ApiUser) => {
    try {
      const nextActive = user.is_active === false;
      await apiRequest<{ user: ApiUser }>("/api/users", {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ id: user.id, isActive: nextActive }),
      });
      setStatusMessage(`${user.name} ${nextActive ? "activated" : "deactivated"}`);
      await loadPortalData();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to update account");
      throw error;
    }
  };

  const createSubject = async (body: Record<string, string>) => {
    try {
      await apiRequest<{ subject: ApiSubject }>("/api/subjects", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
    setStatusMessage("Group created");
      await loadPortalData();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to create group");
      throw error;
    }
  };

  const createAssignment = async (body: Record<string, string | number>) => {
    try {
      await apiRequest<{ assignment: ApiAssignment }>("/api/assignments", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      setStatusMessage("Task created");
      await loadPortalData();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to create task");
      throw error;
    }
  };

  const goToView = (nextView: ViewId) => {
    setView(nextView);
  };

  const login = (nextRole: RoleId, auth: SessionAuth, name?: string) => {
    setRole(nextRole);
    setSessionAuth(auth);
    setSessionName(name ?? (nextRole === "student" ? "Student" : nextRole === "faculty" ? "Faculty" : "admin"));
    setView("overview");
    setQuery("");
    setIsAuthenticated(true);
    window.history.replaceState(null, "", `/${nextRole}/dashboard`);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setSessionAuth(null);
    setModalSubject(null);
    window.history.replaceState(null, "", "/login");
  };

  if (!isAuthenticated) {
    return <LoginScreen onLogin={login} />;
  }

  const navigation = navigationByRole[role];

  return (
    <div className="portal-shell">
      <header className="portal-header">
        <div className="brand">
          <div className="brand-mark">L</div>
          <div>
            <strong>Learning Portal</strong>
            <span>Faculty assignment and monitoring</span>
          </div>
        </div>
        <div className="portal-user">
          <div className="user-avatar">
            <UserCheck size={18} />
          </div>
          <div>
            <strong>{sessionName}</strong>
            <span>{roleProfiles[role].label}</span>
          </div>
          <button className="button secondary exit-button" type="button" onClick={logout}>
            <LogOut size={17} />
            Exit
          </button>
        </div>
      </header>

      <main className="portal-main">
        <section className="portal-title-row">
          <div>
            <p className="eyebrow">{role === "admin" ? "Portal Administration" : role === "faculty" ? "Faculty Monitoring Platform" : "Student Learning Portal"}</p>
            <h1>{roleProfiles[role].title}</h1>
            <p className="page-subtitle">{roleProfiles[role].subtitle}</p>
          </div>
          <label className="search-box portal-search">
            <Search size={18} />
            <span>Search</span>
            <input
              value={query}
              type="search"
              placeholder="Search groups, students, assignments..."
              onChange={(event) => {
                setQuery(event.target.value);
                setView("overview");
              }}
            />
          </label>
        </section>

        <PortalKpis role={role} data={portalData} />
        {statusMessage && (
          <div className="status-banner" role="status">
            {statusMessage}
          </div>
        )}

        <nav className="portal-tabs" aria-label="Dashboard modules">
          {navigation.map(({ id, label }) => (
            <button className={view === id ? "active" : ""} type="button" key={id} onClick={() => goToView(id)}>
              {id === "overview" ? "Dashboard" : label}
            </button>
          ))}
        </nav>

        <section className="dashboard-content" aria-live="polite">
          {view === "overview" && role === "admin" && <AdminOverview users={filteredData.users} onManageUsers={() => goToView("settings")} />}
          {view === "overview" && role !== "admin" && <AssignmentWorkbench role={role} assignments={filteredData.assignments} subjects={filteredData.subjects} onCreateAssignment={createAssignment} />}
          {view === "workspace" && role === "faculty" && (
            <Workspace
              subjects={filteredData.subjects}
              selectedSubject={selectedSubjectIndex}
              setSelectedSubject={setSelectedSubjectIndex}
              onOpen={setModalSubject}
              onCreateSubject={createSubject}
            />
          )}
          {view === "resources" && role === "faculty" && <Resources role={role} users={filteredData.users} />}
          {view === "activities" && role !== "admin" && <Activities role={role} assignments={filteredData.assignments} subjects={filteredData.subjects} onCreateAssignment={createAssignment} />}
          {view === "engagement" && <Engagement users={filteredData.users} assignments={filteredData.assignments} />}
          {view === "analytics" && role !== "admin" && <Analytics role={role} />}
          {view === "settings" && role === "admin" && <SettingsView users={filteredData.users} onCreateUser={createUser} onToggleUser={toggleUser} />}
        </section>
      </main>

      <nav className="bottom-nav" aria-label="Mobile navigation">
        {navigation.map(({ id, label, icon: Icon }) => (
          <button className={`bottom-item ${view === id ? "active" : ""}`} type="button" key={id} onClick={() => goToView(id)}>
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <DetailModal subject={modalSubject} onClose={() => setModalSubject(null)} />
    </div>
  );
}
