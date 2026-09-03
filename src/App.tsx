import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Bell,
  Braces,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Command,
  FileStack,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sun,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthScreen } from "./components/AuthScreen";
import { CourseworkManager } from "./components/CourseworkManager";
import { FacultyAnalytics } from "./components/FacultyAnalytics";
import { FacultyResourceManager } from "./components/FacultyResourceManager";
import { ResourceViewer } from "./components/ResourceViewer";
import { StudentDashboard } from "./components/StudentDashboard";
import { SettingsView } from "./components/SettingsView";
import { courses } from "./platform/demo";
import { enrollInCourse, loadCoursework, loadStudentOverview, logActivity, restoreSession, saveSession, validateSession } from "./platform/api";
import type { ActivityLog, AssignmentRecord, AuthSession, Enrollment, LearningRecord, LearningResource } from "./platform/types";

type ViewId = "dashboard" | "java-learn" | "java-lab" | "dbms-learn" | "dbms-lab" | "coursework" | "assessment" | "resources" | "telemetry" | "settings";
type Theme = "light" | "dark";

type NavItem = 
  | { id: ViewId; label: string; icon: any }
  | { isHeader: true; label: string };

const studentNavigation: NavItem[] = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { isHeader: true, label: "OOP Java" },
  { id: "java-learn", label: "Theory (5 Units)", icon: LibraryBig },
  { id: "java-lab", label: "Lab (21 Exp)", icon: Braces },
  { isHeader: true, label: "DBMS" },
  { id: "dbms-learn", label: "Theory (5 Units)", icon: LibraryBig },
  { id: "dbms-lab", label: "Lab (10 Exp)", icon: Braces },
  { isHeader: true, label: "Practice & Exams" },
  { id: "coursework", label: "Practice", icon: ClipboardList },
  { id: "assessment", label: "Assessments", icon: ClipboardCheck },
];

const facultyNavigation: NavItem[] = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { isHeader: true, label: "Course Management" },
  { id: "resources", label: "Theory resources", icon: FileStack },
  { id: "coursework", label: "Practice", icon: ClipboardList },
  { id: "assessment", label: "Assessments", icon: ClipboardCheck },
  { id: "telemetry", label: "Student insights", icon: BarChart3 },
];

function pageTitle(view: ViewId) {
  const titles: Record<ViewId, [string, string]> = {
    dashboard: ["Learning command center", "Courses, progress, and next actions in one focused workspace."],
    "java-learn": ["OOP Java: Theory", "Study faculty-assigned videos and documents organized across 5 units."],
    "java-lab": ["OOP Java: Lab work", "Complete 21 official Java experiments in an instrumented coding workspace."],
    "dbms-learn": ["DBMS: Theory", "Study faculty-assigned videos and documents organized across 5 units."],
    "dbms-lab": ["DBMS: Lab work", "Complete 10 official DBMS experiments in an instrumented coding workspace."],
    coursework: ["Practice", "Complete non-proctored MCQs and IDE questions for JAVA and DBMS."],
    assessment: ["Assessment center", "Secure, timed checkpoints with autosave and integrity monitoring."],
    resources: ["Theory resource manager", "Assign YouTube and Drive resources without consuming platform storage."],
    telemetry: ["Student insights", "Review study engagement, assessment integrity, and lab debugging behavior."],
    settings: ["Account Settings", "Manage your profile information and preferences."],
  };
  return titles[view];
}

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [view, setView] = useState<ViewId>("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => localStorage.getItem("kgr-theme") === "dark" ? "dark" : "light");
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [learningResources, setLearningResources] = useState<LearningResource[]>([]);
  const [dashboardAssignments, setDashboardAssignments] = useState<AssignmentRecord[]>([]);
  const [dashboardSubmissions, setDashboardSubmissions] = useState<LearningRecord[]>([]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("kgr-theme", theme);
  }, [theme]);

  useEffect(() => {
    const cached = restoreSession();
    if (!cached?.token) {
      saveSession(null);
      setCheckingSession(false);
      return;
    }

    let active = true;
    void validateSession(cached.token)
      .then((validated) => {
        if (!active) return;
        saveSession(validated);
        setSession(validated);
      })
      .catch(() => {
        if (!active) return;
        saveSession(null);
        setSession(null);
      })
      .finally(() => { if (active) setCheckingSession(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [view]);

  useEffect(() => {
    if (!session) return;
    let active = true;
    void loadStudentOverview(session.token).then((data) => {
      if (!active) return;
      setEnrollments(data.enrollments.filter((item) => session.user.role !== "student" || item.userId === session.user.id));
      setLearningResources(data.resources);
    }).catch(() => undefined);
    if (session.user.role === "student") {
      void loadCoursework(session.token, false).then((data) => {
        if (!active) return;
        setDashboardAssignments(data.assignments);
        setDashboardSubmissions(data.submissions);
      }).catch(() => undefined);
    }
    return () => { active = false; };
  }, [session]);

  const handleAuthenticated = (nextSession: AuthSession) => {
    saveSession(nextSession);
    setSession(nextSession);
    setEnrollments([]);
    setLearningResources([]);
    setDashboardAssignments([]);
    setDashboardSubmissions([]);
    setView("dashboard");
  };

  const logout = () => {
    saveSession(null);
    setSession(null);
    setView("dashboard");
  };

  const emitActivity = useCallback((event: ActivityLog) => {
    if (!session) return;
    void logActivity(session.token, { ...event, userId: session.user.id });
  }, [session]);

  const isStudent = session?.user.role === "student";
  const navigation = isStudent ? studentNavigation : facultyNavigation;
  const [title, subtitle] = pageTitle(view);

  const content = useMemo(() => {
    if (!session) return null;
    if (view === "dashboard") {
      return isStudent ? (
        <StudentDashboard
          user={session.user}
          courses={courses}
          enrollments={enrollments}
          resources={learningResources}
          assignments={dashboardAssignments}
          submissions={dashboardSubmissions}
          onNavigate={(view) => setView(view as ViewId)}
          onEnroll={async (courseId) => {
            await enrollInCourse(session.token, courseId);
            setEnrollments((current) => current.some((item) => item.courseId === courseId)
              ? current
              : [...current, { id: crypto.randomUUID(), courseId, userId: session.user.id, tracks: ["theory", "lab"], progress: 0, studyMinutes: 0, status: "active" }]);
          }}
        />
      ) : <FacultyAnalytics session={session} compact />;
    }
    if (view === "java-learn") return <ResourceViewer user={session.user} resources={learningResources} courseFilter="JAVA" onEvent={emitActivity} />;
    if (view === "dbms-learn") return <ResourceViewer user={session.user} resources={learningResources} courseFilter="DBMS" onEvent={emitActivity} />;
    if (view === "coursework") return <CourseworkManager session={session} initialType="practice" theme={theme} onEvent={emitActivity} />;
    if (view === "java-lab") return <CourseworkManager session={session} initialType="lab" courseFilter="JAVA" theme={theme} onEvent={emitActivity} />;
    if (view === "dbms-lab") return <CourseworkManager session={session} initialType="lab" courseFilter="DBMS" theme={theme} onEvent={emitActivity} />;
    if (view === "resources") return <FacultyResourceManager token={session.token} resources={learningResources} onChange={setLearningResources} />;
    if (view === "telemetry") return <FacultyAnalytics session={session} />;
    if (view === "settings") return <SettingsView session={session} />;
    return <CourseworkManager session={session} initialType="assessment" theme={theme} onEvent={emitActivity} />;
  }, [dashboardAssignments, dashboardSubmissions, emitActivity, enrollments, isStudent, learningResources, session, theme, view]);

  if (checkingSession) return <main className="grid min-h-screen place-items-center bg-[var(--page)] text-[var(--ink)]"><div className="flex items-center gap-3 text-sm text-[var(--muted)]"><span className="size-5 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />Verifying session...</div></main>;
  if (!session) return <AuthScreen onAuthenticated={handleAuthenticated} theme={theme} onToggleTheme={() => setTheme((current) => current === "light" ? "dark" : "light")} />;

  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--ink)] transition-colors">
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[268px] flex-col border-r border-[var(--line)] bg-[var(--sidebar)]/95 px-4 py-5 backdrop-blur-xl transition-transform lg:translate-x-0 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-12 items-center justify-between px-2">
          <button className="flex items-center gap-3 text-left" onClick={() => setView("dashboard")} type="button">
            <span className="grid size-10 place-items-center rounded-lg bg-cyan-400 text-slate-950 shadow-[0_0_24px_rgba(34,211,238,.2)]">
              <Command size={21} strokeWidth={2.5} />
            </span>
            <span>
              <strong className="block text-[15px] leading-tight text-[var(--ink)]">KG Reddy CET</strong>
              <span className="text-xs text-[var(--muted)]">Academic Learning Platform</span>
            </span>
          </button>
          <button className="icon-button mobile-only" onClick={() => setMobileNavOpen(false)} type="button" aria-label="Close navigation"><X size={18} /></button>
        </div>

        <nav className="mt-9 space-y-1" aria-label="Primary navigation">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-[var(--muted)]">Workspace</p>
          {navigation.map((item, i) => {
            if ("isHeader" in item) {
              return <p key={`header-${i}`} className="mb-2 mt-4 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-[var(--muted)]">{item.label}</p>;
            }
            const Icon = item.icon;
            return (
              <button
                className={`nav-item ${view === item.id ? "active" : ""}`}
                key={item.id}
                onClick={() => { setView(item.id); setMobileNavOpen(false); }}
                type="button"
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-8 border-t border-[var(--line)] pt-5">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-[var(--muted)]">Account</p>
          <button className={`nav-item ${view === "settings" ? "active" : ""}`} onClick={() => { setView("settings"); setMobileNavOpen(false); }} type="button"><Settings size={18} /><span>Settings</span></button>
        </div>

        <div className="mt-auto rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3">
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-cyan-400/15 text-sm font-bold text-cyan-500">{session.user.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span>
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-sm">{session.user.name}</strong>
              <span className="block truncate text-xs text-[var(--muted)]">{session.user.rollNumber || session.user.title || session.user.role}</span>
            </span>
            <button className="icon-button" onClick={logout} type="button" title="Sign out"><LogOut size={17} /></button>
          </div>
        </div>
      </aside>

      {mobileNavOpen && <button className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileNavOpen(false)} type="button" aria-label="Close navigation overlay" />}

      <div className="lg:pl-[268px]">
        <header className="sticky top-0 z-30 flex h-[72px] items-center border-b border-[var(--line)] bg-[var(--page)]/85 px-4 backdrop-blur-xl sm:px-7 lg:px-9">
          <button className="icon-button mobile-only mr-3" onClick={() => setMobileNavOpen(true)} type="button" aria-label="Open navigation"><Menu size={20} /></button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold sm:text-lg">{title}</h1>
            <p className="hidden truncate text-xs text-[var(--muted)] sm:block">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/8 px-3 py-2 text-xs font-medium text-emerald-500 md:flex"><span className="size-1.5 rounded-full bg-emerald-400" />System operational</span>
            <button className="icon-button" onClick={() => setTheme((current) => current === "light" ? "dark" : "light")} type="button" aria-label={`Use ${theme === "light" ? "dark" : "light"} theme`} title={`Use ${theme === "light" ? "dark" : "light"} theme`}>{theme === "light" ? <Moon size={18} /> : <Sun size={18} />}</button>
            <button className="icon-button relative" type="button" aria-label="Notifications"><Bell size={18} /><span className="absolute right-2 top-2 size-1.5 rounded-full bg-amber-400" /></button>
            <button className="hidden items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-medium sm:flex" type="button">
              {session.user.role === "student" ? <GraduationCap size={17} /> : <Users size={17} />}
              {session.user.role === "student" ? "Student" : "Faculty"}
              <ChevronDown size={14} className="text-[var(--muted)]" />
            </button>
          </div>
        </header>

        <main className="min-h-[calc(100vh-72px)] px-4 py-6 sm:px-7 lg:px-9 lg:py-8">
          <AnimatePresence mode="wait">
            <motion.div key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.18 }}>
              {content}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
