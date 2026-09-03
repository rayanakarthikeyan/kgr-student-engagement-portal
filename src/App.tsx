import {
  Activity,
  CircleAlert,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Library,
  LogOut,
  KeyRound,
  Mail,
  MessageSquare,
  Search,
  Settings,
  UserCheck,
  X,
} from "lucide-react";
import { useState } from "react";
import {
  activities,
  doubts,
  resources,
  roleConfig,
  roleProfiles,
  studentProfiles,
  subjects,
  type RoleId,
  type Subject,
  type SubjectType,
  type ViewId,
} from "./data";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8787";

const navigation: { id: ViewId; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "workspace", label: "Workspace", icon: BookOpen },
  { id: "resources", label: "Resources", icon: Library },
  { id: "activities", label: "Activities", icon: ClipboardList },
  { id: "engagement", label: "Doubts & Discussion", icon: MessageSquare },
  { id: "analytics", label: "Learning Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

const analytics = [
  ["Assignment completion", 68],
  ["Lab task completion", 54],
  ["Quiz performance", 72],
  ["Resource usage", 81],
  ["Resolved doubts", 63],
  ["AI dependency awareness", 38],
] as const;

const assignmentCards = [
  {
    title: "DBMS Lab 5: SQL Joins Practice",
    subject: "Database Management Systems",
    due: "2026-08-25",
    assigned: 64,
    submitted: 46,
    pending: 18,
    reviewed: 31,
    progress: 72,
  },
  {
    title: "OS Practice 4: Deadlock Scenarios",
    subject: "Operating Systems",
    due: "2026-08-26",
    assigned: 58,
    submitted: 39,
    pending: 19,
    reviewed: 28,
    progress: 67,
  },
  {
    title: "Python Lab 3: File Upload Experiment",
    subject: "Python Programming Lab",
    due: "2026-08-30",
    assigned: 42,
    submitted: 35,
    pending: 7,
    reviewed: 29,
    progress: 83,
  },
  {
    title: "Networks Task: Socket Programming",
    subject: "Computer Networks",
    due: "2026-08-28",
    assigned: 71,
    submitted: 33,
    pending: 38,
    reviewed: 21,
    progress: 46,
  },
];

function badgeClass(value: SubjectType | Subject["risk"] | string) {
  if (value === "Lab Only") return "lab";
  if (value === "Theory + Lab" || value === "Recommended") return "mixed";
  if (value === "High" || value === "Unanswered") return "danger";
  if (value === "Medium" || value.includes("Needs") || value.includes("Repeated")) return "risk";
  return "";
}

function LoginScreen({ onLogin }: { onLogin: (role: RoleId, name?: string) => void }) {
  const [email, setEmail] = useState("umashankar@kgr.ac.in");
  const [password, setPassword] = useState("123dskgr");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const credentials: Record<string, { password: string; role: RoleId }> = {
    "admin@kgr.ac.in": { password: "admin123", role: "admin" },
    "umashankar@kgr.ac.in": { password: "123dskgr", role: "faculty" },
    "karthikeyan@kgr.ac.in": { password: "password123", role: "student" },
  };

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();
    const match = credentials[normalizedEmail];

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
      onLogin(data.user.role, data.user.name);
    } catch (error) {
      if (!match || match.password !== password) {
        setError(error instanceof Error ? error.message : "Invalid email or password");
        setIsLoading(false);
        return;
      }

      window.setTimeout(() => {
        setIsLoading(false);
        onLogin(match.role);
      }, 250);
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
          <h1 id="loginTitle">KG Reddy College</h1>
          <p>Data Structures Programming Assignment Portal</p>
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
            Email Address
            <span className="login-input">
              <Mail size={19} />
              <input
                type="email"
                placeholder="rollnum@kgr.ac.in"
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

function PortalKpis({ role }: { role: RoleId }) {
  const values = {
    admin: [
      ["Active Classrooms", "412", "Current academic year", BookOpen],
      ["Enrolled Students", "4,820", "Across departments", UsersIcon],
      ["Submitted", "1,184", "Learning activities", ClipboardList],
      ["Avg AI Engagement", "29%", "All active classrooms", Activity],
    ],
    faculty: [
      ["Active Tasks", "11", "Due this week", ClipboardList],
      ["Enrolled Students", "286", "Assigned classrooms", UsersIcon],
      ["Submitted", "96", "Awaiting review", FileText],
      ["Avg AI Engagement", "29%", "All assigned rows", Activity],
    ],
    student: [
      ["Pending Work", "8", "Assignments and lab tasks", ClipboardList],
      ["Enrolled Subjects", "7", "Theory, lab, mixed", BookOpen],
      ["Submitted", "26", "This semester", FileText],
      ["Practice Growth", "18%", "Recent improvement", Activity],
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

function AssignmentWorkbench({ role }: { role: RoleId }) {
  const [selectedAssignment, setSelectedAssignment] = useState(assignmentCards[0]);
  const [localQuery, setLocalQuery] = useState("");
  const filtered = assignmentCards.filter((item) => item.title.toLowerCase().includes(localQuery.toLowerCase()));

  return (
    <section className="workbench-grid">
      <aside className="assignment-rail">
        <div className="rail-header">
          <h2>{role === "student" ? "My Activities" : "Assignments"}</h2>
          <button className="button compact" type="button">
            + New
          </button>
        </div>
        <label className="search-box rail-search">
          <Search size={18} />
          <span>Search assignments</span>
          <input value={localQuery} type="search" placeholder="Search assignments..." onChange={(event) => setLocalQuery(event.target.value)} />
        </label>
        <div className="assignment-list">
          {filtered.map((assignment) => (
            <button
              className={`assignment-card ${selectedAssignment.title === assignment.title ? "selected" : ""}`}
              type="button"
              key={assignment.title}
              onClick={() => setSelectedAssignment(assignment)}
            >
              <div className="assignment-title-row">
                <h3>{assignment.title}</h3>
                <span className="edit-link">Edit</span>
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
        <p className="eyebrow">Submission workspace</p>
        <h2>{selectedAssignment.title}</h2>
        <p>
          Review submissions, feedback, weak topics, AI assistance patterns, and pending students for this learning
          activity.
        </p>
        <select aria-label="Choose assignment">
          {assignmentCards.map((assignment) => (
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
      </article>
    </section>
  );
}

function moduleCards(type: SubjectType) {
  return [
    [
      "Theory Units",
      "Notes, PPTs, videos, important questions, previous practice questions, and unit discussions.",
      type !== "Lab Only",
      FileText,
    ],
    [
      "Lab Experiments",
      "Aim, concept, procedure, algorithm, sample output, submissions, viva practice, and feedback.",
      type !== "Theory Only",
      Activity,
    ],
    [
      "Activities",
      "MCQ, short answer, written assignment, coding, SQL, file upload, mini project, and practice test.",
      true,
      ClipboardList,
    ],
    [
      "Student Progress",
      "Completion, repeated attempts, weak topics, resource usage, feedback history, and AI usage trend.",
      true,
      BarChart3,
    ],
  ] as const;
}

function Workspace({
  role,
  selectedSubject,
  setSelectedSubject,
  onOpen,
}: {
  role: RoleId;
  selectedSubject: number;
  setSelectedSubject: (index: number) => void;
  onOpen: (subject: Subject) => void;
}) {
  const subject = subjects[selectedSubject];
  return (
    <section className="workspace-layout">
      <article className="panel">
        <div className="panel-header">
          <div>
            <h2>{role === "admin" ? "Academic Setup" : "Subject Workspaces"}</h2>
            <p>Supports theory-only, lab-only, and theory-plus-lab classrooms.</p>
          </div>
        </div>
        {subjects.map((item, index) => (
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
            <span className={`badge ${badgeClass(item.type)}`}>{item.type}</span>
          </button>
        ))}
      </article>

      <article className="panel">
        <div className="panel-header">
          <div>
            <h2>{subject.name}</h2>
            <p>
              {subject.type} workspace for {subject.semester} {subject.section}
            </p>
          </div>
          <button className="button" type="button" onClick={() => onOpen(subject)}>
            Open detail
          </button>
        </div>
        <div className="tabs">
          <button className="tab-button active" type="button">
            Theory units
          </button>
          <button className="tab-button" type="button">
            Lab tasks
          </button>
          <button className="tab-button" type="button">
            Resources
          </button>
          <button className="tab-button" type="button">
            Progress
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
      </article>
    </section>
  );
}

function Resources({ role }: { role: RoleId }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Resource Library</h2>
          <p>Reusable PDFs, PPTs, images, videos, links, datasets, SQL schemas, starter files, sample programs, and lab manuals.</p>
        </div>
        <button className="button" type="button">
          Upload resource
        </button>
      </div>
      <FilterBar role={role} />
      <div className="list-stack">
        {resources.map(([name, type, place, status, usage]) => (
          <div className="list-row" key={name}>
            <div>
              <h3>{name}</h3>
              <p>{place}</p>
            </div>
            <div className="actions">
              <span className="badge">{type}</span>
              <span className={`badge ${badgeClass(status)}`}>{status}</span>
              <span className="muted">{usage}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Activities({ role }: { role: RoleId }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Assessments and Activities</h2>
          <p>Learning tasks with due dates, resources, scoring or completion status, rubrics, and feedback.</p>
        </div>
        <button className="button" type="button">
          Create activity
        </button>
      </div>
      <FilterBar role={role} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Activity</th>
              <th>Type</th>
              <th>Subject</th>
              <th>Due</th>
              <th>Status</th>
              <th>Evaluation</th>
            </tr>
          </thead>
          <tbody>
            {activities.map(([name, type, subject, due, status, evaluation]) => (
              <tr key={name}>
                <td data-label="Activity">
                  <strong>{name}</strong>
                </td>
                <td data-label="Type">{type}</td>
                <td data-label="Subject">{subject}</td>
                <td data-label="Due">{due}</td>
                <td data-label="Status">
                  <span className="badge">{status}</span>
                </td>
                <td data-label="Evaluation">{evaluation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Engagement({ role }: { role: RoleId }) {
  return (
    <section className="content-grid">
      <article className="panel">
        <div className="panel-header">
          <div>
            <h2>Doubts and Communication</h2>
            <p>Faculty answers, AI guidance, class discussions, announcements, polls, and private feedback.</p>
          </div>
          <button className="button" type="button">
            {role === "student" ? "Ask doubt" : "Post announcement"}
          </button>
        </div>
        <div className="list-stack">
          {doubts.map(([title, subject, followers, status]) => (
            <div className="list-row" key={title}>
              <div>
                <h3>{title}</h3>
                <p>
                  {subject} / {followers}
                </p>
              </div>
              <span className={`badge ${badgeClass(status)}`}>{status}</span>
            </div>
          ))}
        </div>
      </article>
      <aside className="panel">
        <h2>Common Doubt Summary</h2>
        <p>Most repeated questions are clustered around SQL joins, deadlock prevention, subnetting practice, and lab environment setup.</p>
        <textarea aria-label="Private feedback note" placeholder="Write private feedback or a discussion response..." />
        <div className="actions">
          <button className="button" type="button">
            Send
          </button>
          <button className="button secondary" type="button">
            Pin answer
          </button>
        </div>
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
              <h2>Learning Analytics</h2>
              <p>Progress signals only, separate from official college records.</p>
            </div>
          </div>
          <AnalyticsBars />
        </article>
        <aside className="panel">
          <h2>Student Learning Profiles</h2>
          <p>Submitted activities, pending tasks, feedback history, doubts, weak topics, improvement trend, and private notes.</p>
          <div className="profile-grid">
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

function SettingsView({ role }: { role: RoleId }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>{role === "admin" ? "Platform Settings" : "Profile and Preferences"}</h2>
          <p>Configurable defaults for resource rules, late policy, AI assistant behavior, and moderation.</p>
        </div>
      </div>
      <form className="form-grid">
        <label>
          Resource upload rules
          <select>
            <option>PDF, PPT, media, links, code, SQL, datasets</option>
          </select>
        </label>
        <label>
          Assignment late policy default
          <select>
            <option>Allow late submissions with visible status</option>
            <option>Close after due date</option>
          </select>
        </label>
        <label>
          AI assistant rules
          <select>
            <option>Explain and guide, do not complete graded work</option>
          </select>
        </label>
        <label>
          Discussion moderation
          <select>
            <option>Faculty moderated classroom discussions</option>
          </select>
        </label>
        <label>
          Future public registration
          <select>
            <option>Placeholder disabled</option>
          </select>
        </label>
        <label>
          Password update
          <input type="password" placeholder="New password" />
        </label>
        <label className="full-width">
          Notes
          <textarea placeholder="Policy notes, faculty private notes, or learning support guidance" />
        </label>
        <div className="actions full-width">
          <button className="button" type="button">
            Save changes
          </button>
          <button className="button secondary" type="button">
            Reset
          </button>
        </div>
      </form>
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
            <p className="eyebrow">Learning detail</p>
            <h2 id="modalTitle">{subject.name}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Close modal" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <div className="profile-grid">
            <div className="profile-card">
              <strong>{subject.type}</strong>
              <p>Subject type</p>
            </div>
            <div className="profile-card">
              <strong>{subject.progress}%</strong>
              <p>Learning progress</p>
            </div>
            <div className="profile-card">
              <strong>{subject.pending}</strong>
              <p>Pending activities</p>
            </div>
          </div>
          <h3>Theory support</h3>
          <p>Units, notes, quizzes, assignments, important questions, previous practice questions, and unit-wise discussions are available when the subject includes theory.</p>
          <h3>Lab support</h3>
          <p>Experiments include aim, concept, procedure, algorithm, sample input/output, expected result, submissions, viva practice, and feedback when the subject includes lab work.</p>
          <h3>Learning analytics</h3>
          <p>Progress, scores, task completion, feedback, attempts, weak topics, and AI usage awareness are shown as learning indicators only.</p>
        </div>
      </div>
    </div>
  );
}

export function App() {
  const [role, setRole] = useState<RoleId>("admin");
  const [sessionName, setSessionName] = useState("K. Uma Shankar");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [view, setView] = useState<ViewId>("overview");
  const [query, setQuery] = useState("");
  const [selectedSubjectIndex, setSelectedSubjectIndex] = useState(0);
  const [modalSubject, setModalSubject] = useState<Subject | null>(null);

  const goToView = (nextView: ViewId) => {
    setView(nextView);
  };

  const login = (nextRole: RoleId, name?: string) => {
    setRole(nextRole);
    setSessionName(name ?? (nextRole === "student" ? "Karthikeyan" : "K. Uma Shankar"));
    setView("overview");
    setQuery("");
    setIsAuthenticated(true);
    window.history.replaceState(null, "", `/${nextRole}/dashboard`);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setModalSubject(null);
    window.history.replaceState(null, "", "/login");
  };

  if (!isAuthenticated) {
    return <LoginScreen onLogin={login} />;
  }

  return (
    <div className="portal-shell">
      <header className="portal-header">
        <div className="brand">
          <div className="brand-mark">K</div>
          <div>
            <strong>KGRCET Learning Portal</strong>
            <span>KG Reddy College of Engineering & Technology</span>
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
            <p className="eyebrow">Academic Learning Platform</p>
            <h1>{roleProfiles[role].title}</h1>
            <p className="page-subtitle">{roleProfiles[role].subtitle}</p>
          </div>
          <label className="search-box portal-search">
            <Search size={18} />
            <span>Search</span>
            <input
              value={query}
              type="search"
              placeholder="Search subjects, students, resources..."
              onChange={(event) => {
                setQuery(event.target.value);
                setView("overview");
              }}
            />
          </label>
        </section>

        <PortalKpis role={role} />

        <nav className="portal-tabs" aria-label="Dashboard modules">
          {navigation.map(({ id, label }) => (
            <button className={view === id ? "active" : ""} type="button" key={id} onClick={() => goToView(id)}>
              {id === "overview" ? "Assignments & Submissions" : label}
            </button>
          ))}
        </nav>

        <section className="dashboard-content" aria-live="polite">
          {view === "overview" && <AssignmentWorkbench role={role} />}
          {view === "workspace" && (
            <Workspace
              role={role}
              selectedSubject={selectedSubjectIndex}
              setSelectedSubject={setSelectedSubjectIndex}
              onOpen={setModalSubject}
            />
          )}
          {view === "resources" && <Resources role={role} />}
          {view === "activities" && <Activities role={role} />}
          {view === "engagement" && <Engagement role={role} />}
          {view === "analytics" && <Analytics role={role} />}
          {view === "settings" && <SettingsView role={role} />}
        </section>
      </main>

      <nav className="bottom-nav" aria-label="Mobile navigation">
        {[
          ["overview", "Home", LayoutDashboard],
          ["workspace", "Class", GraduationCap],
          ["activities", "Tasks", CheckCircle2],
          ["engagement", "Doubts", MessageSquare],
        ].map(([id, label, Icon]) => (
          <button className={`bottom-item ${view === id ? "active" : ""}`} type="button" key={id as string} onClick={() => goToView(id as ViewId)}>
            <Icon size={18} />
            <span>{label as string}</span>
          </button>
        ))}
      </nav>

      <button className="floating-action" type="button">
        <ChevronRight size={18} />
        {role === "student" ? "Continue" : "Create"}
      </button>

      <DetailModal subject={modalSubject} onClose={() => setModalSubject(null)} />
    </div>
  );
}
