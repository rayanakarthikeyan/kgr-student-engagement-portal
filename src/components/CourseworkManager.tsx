import Editor from "@monaco-editor/react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, BookOpenText, CalendarDays, Check, CheckCircle2, CircleAlert, ClipboardCheck, ClipboardList, Clock3, Code2, FileCode2, FlaskConical, History, Pencil, ListChecks, LoaderCircle, Play, Save, Search, Send, ShieldCheck, Trash2, UserRoundCheck, Users, } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditorTelemetry } from "../hooks/useEditorTelemetry";
import { useProctoring } from "../hooks/useProctoring";
import { createCourseworkAssignment, deleteCourseworkAssignment, loadActivityTemplates, updateCourseworkAssignment, loadCoursework, runCode, saveCourseworkSubmission } from "../platform/api";
import { CohortFilters, matchesCohort } from "./CohortFilters";
import { curriculumCatalog } from "../platform/curriculum";
import type { ActivityLog, ActivityTemplate, AssessmentQuestion, AssignmentRecord, AssignmentSubject, AuthSession, CourseCode, CourseworkType, CurriculumItem, LearningRecord, SessionUser, Track, WorkMode, } from "../platform/types";
type CourseworkFilter = "all" | CourseworkType;
const typeOptions: Array<{
    id: CourseworkType;
    label: string;
    icon: typeof BookOpenText;
}> = [
    { id: "theory", label: "Theory", icon: BookOpenText },
    { id: "practice", label: "Practice", icon: Code2 },
    { id: "assessment", label: "Assessment", icon: ClipboardCheck },
    { id: "lab", label: "Lab", icon: FlaskConical },
];
function defaultDueDate() {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().slice(0, 10);
}
function assignmentType(assignment: AssignmentRecord): CourseworkType {
    return assignment.assignment_type || (assignment.starter_code ? "practice" : "theory");
}
function courseForSubject(subject: AssignmentSubject | null | undefined): CourseCode {
    const value = `${subject?.id || ""} ${subject?.name || ""}`.toLowerCase();
    return value.includes("java") ? "JAVA" : "DBMS";
}
function assignmentCourse(assignment: AssignmentRecord): CourseCode {
    return assignment.course_code || courseForSubject(assignment.subjects);
}
function subjectForItem(item: CurriculumItem, subjects: AssignmentSubject[]) {
    return subjects.find((subject) => courseForSubject(subject) === item.courseCode)?.id || subjects[0]?.id || "";
}
function dueLabel(value: string) {
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
function isPastDeadline(value: string) {
    const deadline = new Date(`${value}T23:59:59`);
    return !Number.isNaN(deadline.getTime()) && deadline.getTime() < Date.now();
}
function typeLabel(value: CourseworkType) {
    return typeOptions.find((item) => item.id === value)?.label || value;
}
function newQuestion(index = 0): AssessmentQuestion {
    return {
        id: `question-${Date.now()}-${index}`,
        prompt: "",
        options: ["", "", "", ""],
        correctIndex: 0,
        marks: 1,
    };
}
function AssignmentWorkspace({ assignment, submission, session, theme, onEvent, onBack, onSaved, }: {
    assignment: AssignmentRecord;
    submission?: LearningRecord;
    session: AuthSession;
    theme: "light" | "dark";
    onEvent: (event: ActivityLog) => void;
    onBack: () => void;
    onSaved: (record: LearningRecord) => void;
}) {
    const type = assignmentType(assignment);
    const mode: WorkMode = assignment.work_mode || (type === "assessment" ? "mcq" : type === "practice" || type === "lab" ? "ide" : "response");
    const isCoding = mode === "ide";
    const isMcq = mode === "mcq";
    const language = assignmentCourse(assignment) === "JAVA" ? "java" : "sql";
    const localKey = `coursework-${assignment.id}-${session.user.id}`;
    const savedAnswers = submission?.metadata?.answers;
    const [stdin, setStdin] = useState(assignment.test_cases?.[0]?.input || "");
    const [hintsUsed, setHintsUsed] = useState<number[]>([]);
    const external = assignment.execution_environment === "external";
    const [body, setBody] = useState(() => submission?.body || localStorage.getItem(localKey) || assignment.starter_code || "");
    const [answers, setAnswers] = useState<Record<string, number>>(() => {
        if (savedAnswers && typeof savedAnswers === "object" && !Array.isArray(savedAnswers)) return savedAnswers as Record<string, number>;
        try { return JSON.parse(localStorage.getItem(localKey) || "{}"); } catch { return {}; }
    });
    const [saving, setSaving] = useState(false);
    const [running, setRunning] = useState(false);
    const [locked, setLocked] = useState(Boolean(submission && submission.status !== "draft"));
    const [notice, setNotice] = useState("");
    const [error, setError] = useState("");
    const [output, setOutput] = useState({ status: "idle" as "idle" | "passed" | "failed" | "error", stdout: "Run your work to see the actual output.", stderr: "", durationMs: 0 });
    const [bottomTab, setBottomTab] = useState<"output" | "timeline">("output");
    const submitRef = useRef<(automatic: boolean) => void>(() => undefined);
    const telemetry = useEditorTelemetry({
        userId: session.user.id,
        courseId: assignmentCourse(assignment) === "JAVA" ? "course-java" : "course-dbms",
        challengeId: assignment.id,
        onEvent,
    });
    const autoSubmit = useCallback(() => submitRef.current(true), []);
    const proctor = useProctoring({
        userId: session.user.id,
        courseId: assignmentCourse(assignment) === "JAVA" ? "course-java" : "course-dbms",
        assignmentId: assignment.id,
        durationMinutes: assignment.duration_minutes || 30,
        maxViolations: 2,
        onEvent,
        onAutoSubmit: autoSubmit,
    });
    useEffect(() => {
        if (locked)
            return;
        const timer = window.setTimeout(() => {
            localStorage.setItem(localKey, isMcq ? JSON.stringify(answers) : body);
        }, 600);
        return () => window.clearTimeout(timer);
    }, [answers, body, isMcq, localKey, locked]);
    const persist = async (status: "draft" | "submitted", automatic = false) => {
        const unanswered = isMcq ? assignment.questions.filter((question) => answers[question.id] === undefined).length : 0;
        if (status === "submitted" && unanswered > 0 && !automatic) {
            setError(`Answer all ${assignment.questions.length} questions before submitting.`);
            return;
        }
        const response = isMcq ? JSON.stringify(answers) : body.trim() || (automatic ? "No response was entered before automatic submission." : "");
        if (!response) {
            setError("Add your response before saving.");
            return;
        }
        setSaving(true);
        setError("");
        setNotice("");
        try {
            const record = await saveCourseworkSubmission(session.token, {
                assignment,
                body: response,
                status,
                metadata: {
                    assignment_type: type,
                    work_mode: mode,
                    answers: isMcq ? answers : undefined,
                    language: isCoding ? language : null,
                    validation_status: isCoding ? output.status : null,
                    violation_count: type === "assessment" ? proctor.violations : 0,
                    automatic,
                    hints_used: hintsUsed,
                    output: isCoding ? (output.stdout + output.stderr).slice(0, 8000) : null,
                },
            });
            onSaved(record);
            if (status === "submitted") {
                setLocked(true);
                localStorage.removeItem(localKey);
                if (isCoding)
                    telemetry.recordSubmit();
                if (document.fullscreenElement)
                    void document.exitFullscreen();
            }
            setNotice(status === "submitted" ? (automatic ? "Assessment auto-submitted." : "Work submitted successfully.") : "Draft saved.");
        }
        catch (caught) {
            setError(caught instanceof Error ? caught.message : "Work could not be saved");
        }
        finally {
            setSaving(false);
        }
    };
    submitRef.current = (automatic) => { void persist("submitted", automatic); };
    const execute = async () => {
        setRunning(true);
        setBottomTab("output");
        setError("");
        try {
            const result = await runCode(session.token, { language, code: body, stdin });
            setOutput(result);
            telemetry.recordRun(result);
        }
        catch (caught) {
            const result = { status: "error" as const, stdout: "", stderr: caught instanceof Error ? caught.message : "Runner unavailable", durationMs: 0 };
            setOutput(result);
            telemetry.recordRun(result);
        }
        finally {
            setRunning(false);
        }
    };
    if (type === "assessment" && !proctor.started && !locked) {
        return <div className="mx-auto max-w-3xl py-8"><section className="panel p-7 sm:p-9"><button className="secondary-button mb-7" onClick={onBack} type="button"><ArrowLeft size={16}/>Back to assessments</button><span className="tag amber"><ShieldCheck size={13}/>Proctored assessment</span><h2 className="mt-4 text-2xl font-semibold">{assignment.title}</h2><p className="mt-3 whitespace-pre-line text-sm leading-6 text-[var(--muted)]">{assignment.description}</p><div className="mt-7 grid gap-3 sm:grid-cols-3"><div className="exam-stat"><Clock3 size={18}/><strong>{assignment.duration_minutes || 30} min</strong><span>Time limit</span></div><div className="exam-stat"><ClipboardCheck size={18}/><strong>{assignment.max_marks}</strong><span>Marks</span></div><div className="exam-stat"><ShieldCheck size={18}/><strong>2</strong><span>Focus losses</span></div></div><button className="primary-button mt-7" disabled={isPastDeadline(assignment.due_date)} onClick={() => void proctor.begin()} type="button"><ShieldCheck size={16}/>{isPastDeadline(assignment.due_date) ? "Deadline passed" : "Enter fullscreen and begin"}</button></section></div>;
    }
    const expectedOutput = assignment.test_cases?.[0]?.output || "No expected output was provided.";
    const actualOutput = output.stderr || output.stdout;
    return (<div className="mx-auto max-w-[1500px] space-y-4">
      <header className="flex flex-wrap items-center gap-3 border-b border-[var(--line)] pb-4">
        <button className="secondary-button" onClick={onBack} type="button"><ArrowLeft size={16}/>Assignments</button>
        <div className="min-w-0 flex-1 basis-[220px]"><div className="flex flex-wrap items-center gap-2"><span className={`tag ${assignmentCourse(assignment) === "JAVA" ? "cyan" : "amber"}`}>{assignmentCourse(assignment)}</span><span className="tag neutral">Unit {assignment.unit_number || 1}</span><span className="tag neutral">{typeLabel(type)}</span><span className="tag neutral">{mode.toUpperCase()}</span></div><h2 className="mt-2 break-words text-lg font-semibold sm:truncate">{assignment.title}</h2></div>
        {type === "assessment" && proctor.started && <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 font-mono text-sm font-semibold text-amber-600">{proctor.formattedTime}</span>}
        <span className="text-xs text-[var(--muted)]">Due {dueLabel(assignment.due_date)}</span>
      </header>
      {(error || proctor.warning) && <div className="flex items-start gap-2 rounded-lg border border-rose-300 bg-rose-500/8 px-4 py-3 text-sm text-rose-600"><CircleAlert size={18} className="mt-0.5 shrink-0"/>{error || proctor.warning}</div>}
      {notice && <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-600"><CheckCircle2 size={17}/>{notice}{locked && submission?.score != null ? ` Score: ${submission.score}/${assignment.max_marks}` : ""}</div>}

      <div className={`grid gap-4 ${isCoding ? "xl:grid-cols-[minmax(0,0.36fr)_minmax(0,0.64fr)]" : "xl:grid-cols-[minmax(0,0.38fr)_minmax(0,0.62fr)]"}`}>
        <aside className="panel h-fit p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-cyan-600">{type === "lab" ? "Experiment brief" : "Instructions"}</p><p className="mt-4 whitespace-pre-line text-sm leading-6 text-[var(--muted)]">{assignment.description}</p><div className="mt-5 border-t border-[var(--line)] pt-4 text-xs text-[var(--muted)]"><p className="flex items-center gap-2"><CalendarDays size={14}/>Deadline: {dueLabel(assignment.due_date)}</p><p className="mt-2 flex items-center gap-2"><ClipboardCheck size={14}/>Maximum marks: {assignment.max_marks}</p></div>
          {external && <p className="mt-4 text-xs text-amber-600">External lab environment / faculty-reviewed results</p>}
          {!isMcq && <div className="mt-5 border-t border-[var(--line)] pt-4"><h3 className="text-xs font-semibold">Sample input</h3><pre className="mt-2 whitespace-pre-wrap break-words text-xs">{assignment.test_cases?.[0]?.input || "See task fixtures"}</pre>{!isCoding && <><h3 className="mt-4 text-xs font-semibold">Expected observations</h3><pre className="mt-2 whitespace-pre-wrap break-words text-xs">{expectedOutput}</pre></>}</div>}
          {type !== "assessment" && (assignment.hints || []).map((hint, index) => <details className="mt-3 border-t border-[var(--line)] pt-3 text-sm" key={index} onToggle={event => { if (event.currentTarget.open) setHintsUsed(current => current.includes(index) ? current : [...current, index]); }}><summary className="cursor-pointer font-medium">Hint {index + 1}</summary><p className="mt-2 text-xs leading-5 text-[var(--muted)]">{hint}</p></details>)}
        </aside>
        <section className="panel min-w-0 overflow-hidden">
          <div className="flex h-11 items-center border-b border-[var(--line)] px-4">{isMcq ? <ListChecks size={15} className="text-cyan-600"/> : <FileCode2 size={15} className="text-cyan-600"/>}<strong className="ml-2 text-xs">{isMcq ? `${assignment.questions.length} questions` : isCoding ? `Main.${language === "java" ? "java" : "sql"}` : "Response"}</strong>{locked && <span className="ml-auto status-pill on-track">Submitted{submission?.score != null ? ` / ${submission.score}/${assignment.max_marks}` : ""}</span>}</div>
          {isMcq ? <div className="max-h-[620px] space-y-4 overflow-y-auto bg-[var(--surface)] p-4 sm:p-5">{assignment.questions.map((question, index) => <fieldset className="rounded-md border border-[var(--line)] p-4" key={question.id}><legend className="px-2 text-sm font-semibold">{index + 1}. {question.prompt} <span className="text-xs font-normal text-[var(--muted)]">({question.marks} marks)</span></legend><div className="mt-3 grid gap-2">{question.options.map((option, optionIndex) => <label className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 text-sm ${answers[question.id] === optionIndex ? "border-cyan-500 bg-cyan-500/8" : "border-[var(--line)]"}`} key={`${question.id}-${optionIndex}`}><input checked={answers[question.id] === optionIndex} disabled={locked} name={question.id} onChange={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))} type="radio"/><span>{option}</span></label>)}</div></fieldset>)}{assignment.questions.length === 0 && <div className="empty-panel min-h-52"><ListChecks size={26}/><span>No questions were added to this assignment.</span></div>}</div> : isCoding ? <Editor height="430px" language={language} onChange={(value) => { setBody(value || ""); telemetry.handleChange(value); }} onMount={telemetry.handleMount} options={{ minimap: { enabled: false }, fontSize: 14, lineHeight: 22, padding: { top: 14 }, scrollBeyondLastLine: false, automaticLayout: true, wordWrap: "on", readOnly: locked }} theme={theme === "dark" ? "vs-dark" : "light"} value={body}/> : <textarea className="min-h-[430px] w-full resize-y bg-[var(--surface)] p-5 text-sm leading-7 text-[var(--ink)] outline-none" disabled={locked} onChange={(event) => setBody(event.target.value)} placeholder="Write your response here..." value={body}/>}
          {isCoding && !external && <label className="block border-t border-[var(--line)] p-4 text-xs">Standard input<textarea className="mt-2 block w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-2 font-mono" rows={3} value={stdin} onChange={event => setStdin(event.target.value)} /></label>}
          {isCoding && <div className="border-t border-[var(--line)]"><div className="flex h-10 items-center border-b border-[var(--line)] px-3"><button className={`lab-tab ${bottomTab === "output" ? "active" : ""}`} onClick={() => setBottomTab("output")} type="button"><Code2 size={14}/>Output comparison</button><button className={`lab-tab ${bottomTab === "timeline" ? "active" : ""}`} onClick={() => setBottomTab("timeline")} type="button"><History size={14}/>Timeline <span>{telemetry.timeline.length}</span></button></div>{bottomTab === "output" ? <div className="grid min-h-32 sm:grid-cols-2"><div className="border-b border-[var(--line)] p-4 sm:border-b-0 sm:border-r"><p className="mb-2 text-[10px] font-bold uppercase text-[var(--muted)]">Expected output</p><pre className="whitespace-pre-wrap text-xs leading-5 text-[var(--ink)]">{expectedOutput}</pre></div><div className="p-4"><p className="mb-2 text-[10px] font-bold uppercase text-[var(--muted)]">Actual output</p><pre className={`whitespace-pre-wrap text-xs leading-5 ${output.status === "passed" ? "text-emerald-600" : output.status === "idle" ? "text-[var(--muted)]" : "text-rose-600"}`}>{running ? "Running..." : actualOutput}</pre></div></div> : <div className="max-h-40 overflow-y-auto p-3">{telemetry.timeline.length === 0 ? <p className="p-4 text-center text-xs text-[var(--muted)]">Run or edit code to build an attempt timeline.</p> : telemetry.timeline.toReversed().map((item) => <div className="border-b border-[var(--line)] px-2 py-2 text-xs last:border-0" key={item.id}><strong>{item.label}</strong><p className="mt-1 truncate text-[var(--muted)]">{item.detail}</p></div>)}</div>}</div>}
          <footer className="flex flex-wrap justify-end gap-2 border-t border-[var(--line)] p-4">{isCoding && <button className="secondary-button" disabled={running || locked || external} onClick={() => void execute()} type="button">{running ? <LoaderCircle className="animate-spin" size={16}/> : <Play size={16}/>}{external ? "External lab runtime" : "Run"}</button>}<button className="secondary-button" disabled={saving || locked || isPastDeadline(assignment.due_date)} onClick={() => void persist("draft")} type="button"><Save size={16}/>Save draft</button><button className="primary-button" disabled={saving || locked || isPastDeadline(assignment.due_date) || (isMcq && assignment.questions.length === 0)} onClick={() => void persist("submitted")} type="button">{saving ? <LoaderCircle className="animate-spin" size={16}/> : <Send size={16}/>}{locked ? "Submitted" : "Submit final"}</button></footer>
        </section>
      </div>
    </div>);
}
function StudentCoursework({ assignments, submissions, session, initialType, courseFilter, theme, onEvent, onSaved }: {
    assignments: AssignmentRecord[];
    submissions: LearningRecord[];
    session: AuthSession;
    initialType: CourseworkFilter;
    courseFilter?: string;
    theme: "light" | "dark";
    onEvent: (event: ActivityLog) => void;
    onSaved: (record: LearningRecord) => void;
}) {
    const [filter, setFilter] = useState<CourseworkFilter>(initialType);
    const [courseFilterState, setCourseFilterState] = useState(courseFilter || "");
    const [unitFilter, setUnitFilter] = useState("");
    const [active, setActive] = useState<AssignmentRecord | null>(null);
    const visible = useMemo(() => assignments.filter((item) => (filter === "all" || assignmentType(item) === filter) && (!courseFilterState || assignmentCourse(item) === courseFilterState) && (!unitFilter || String(item.unit_number) === unitFilter)), [assignments, filter, courseFilterState, unitFilter]);
    const queueTitle = initialType === "practice" ? "Practice queue" : initialType === "assessment" ? "Assessments" : initialType === "lab" ? "Lab experiments" : "My learning queue";
    const queueDescription = initialType === "practice" ? "Non-proctored MCQs and IDE questions assigned by faculty." : initialType === "assessment" ? "Timed, proctored assessments with automatic submission guardrails." : initialType === "lab" ? "Official KGR25 experiments with an IDE workspace and attempt tracking." : "Assigned academic work organized by course and unit.";
    if (active)
        return <AssignmentWorkspace assignment={active} submission={submissions.find((item) => item.assignment_id === active.id)} session={session} theme={theme} onEvent={onEvent} onBack={() => setActive(null)} onSaved={onSaved}/>;
    return <div className="space-y-6"><section className="flex flex-col gap-4 border-b border-[var(--line)] pb-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-cyan-600">Assigned coursework</p><h2 className="mt-2 text-3xl font-semibold">{queueTitle}</h2><p className="mt-2 text-sm text-[var(--muted)]">{queueDescription}</p></div><span className="tag cyan"><ClipboardList size={13}/>KGR25 curriculum</span></section><div className="flex flex-wrap gap-3"><label className="text-xs">Course<select className="profile-select" value={courseFilterState} onChange={event => setCourseFilterState(event.target.value)}><option value="">Both courses</option><option value="JAVA">OOP through Java</option><option value="DBMS">DBMS</option></select></label><label className="text-xs">Unit<select className="profile-select" value={unitFilter} onChange={event => setUnitFilter(event.target.value)}><option value="">All units</option>{[1,2,3,4,5].map(unit => <option key={unit} value={unit}>Unit {unit}</option>)}</select></label></div>{initialType === "all" && <div className="segmented-control w-full overflow-x-auto sm:w-fit">{(["all", "practice", "assessment", "lab"] as const).map((value) => <button className={filter === value ? "active" : ""} key={value} onClick={() => setFilter(value)} type="button">{value === "all" ? "All" : typeLabel(value)}</button>)}</div>}{visible.length === 0 ? <div className="panel empty-panel min-h-[260px]"><ClipboardList size={30}/><span>No {filter === "all" ? "coursework" : typeLabel(filter).toLowerCase()} has been assigned.</span></div> : <div className="grid gap-4 xl:grid-cols-2">{visible.map((assignment) => { const record = submissions.find((item) => item.assignment_id === assignment.id); const status = record?.status || "not_started"; return <article className="panel p-5" key={assignment.id}><div className="flex items-start justify-between gap-4"><div className="flex flex-wrap gap-2"><span className={`tag ${assignmentCourse(assignment) === "JAVA" ? "cyan" : "amber"}`}>{assignmentCourse(assignment)}</span><span className="tag neutral">Unit {assignment.unit_number || 1}</span><span className="tag neutral">{assignment.work_mode?.toUpperCase() || typeLabel(assignmentType(assignment))}</span></div><span className="text-right text-xs text-[var(--muted)]"><strong className="block text-base text-[var(--ink)]">{record?.score ?? assignment.max_marks}</strong>{record?.score != null ? `/${assignment.max_marks}` : "marks"}</span></div><h3 className="mt-4 text-base font-semibold">{assignment.title}</h3><p className="mt-2 line-clamp-3 text-xs leading-5 text-[var(--muted)]">{assignment.description}</p><div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4 text-xs text-[var(--muted)]"><span className="flex items-center gap-2"><CalendarDays size={15}/>Due {dueLabel(assignment.due_date)}</span><span className={`status-pill ${status === "submitted" || status === "graded" ? "on-track" : isPastDeadline(assignment.due_date) ? "at-risk" : "needs-attention"}`}>{status === "not_started" ? (isPastDeadline(assignment.due_date) ? "Closed" : "Not started") : status}</span></div><button className="primary-button mt-4 w-full" onClick={() => setActive(assignment)} type="button">{status === "submitted" || status === "graded" ? "View submission" : status === "draft" ? "Continue work" : "Open assignment"}</button></article>; })}</div>}</div>;
}
export function CourseworkManager({ session, initialType = "all", theme, courseFilter, onEvent }: {
    session: AuthSession;
    initialType?: CourseworkFilter;
    theme: "light" | "dark";
    courseFilter?: string;
    onEvent: (event: ActivityLog) => void;
}) {
    const workflowType: CourseworkType = initialType === "assessment" ? "assessment" : initialType === "lab" ? "lab" : "practice";
    const requiredTrack: Track = workflowType === "lab" ? "lab" : "theory";
    const initialItem = curriculumCatalog.find((item) => item.track === requiredTrack) || curriculumCatalog[0];
    const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
    const [submissions, setSubmissions] = useState<LearningRecord[]>([]);
    const [subjects, setSubjects] = useState<AssignmentSubject[]>([]);
    const [students, setStudents] = useState<SessionUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [course, setCourse] = useState<CourseCode>(initialItem.courseCode);
    const [track, setTrack] = useState<Track>(requiredTrack);
    const [unit, setUnit] = useState<number>(initialItem.unit);
    const [selectedId, setSelectedId] = useState(initialItem.id);
    const taskType = workflowType;
    const [workMode, setWorkMode] = useState<WorkMode>(workflowType === "lab" ? "ide" : "mcq");
    const [templates, setTemplates] = useState<Record<string, ActivityTemplate>>({});
    const [hints, setHints] = useState("");
    const [sampleInput, setSampleInput] = useState("");
    const [environment, setEnvironment] = useState<"runner" | "external">("runner");
    const [department, setDepartment] = useState("");
    const [section, setSection] = useState("");
    const [editingId, setEditingId] = useState("");
    const [questions, setQuestions] = useState<AssessmentQuestion[]>([newQuestion()]);
    const [expectedOutput, setExpectedOutput] = useState("");
    const [title, setTitle] = useState(initialItem.title);
    const [description, setDescription] = useState(initialItem.brief);
    const [starterCode, setStarterCode] = useState(initialItem.starterCode);
    const [marks, setMarks] = useState(String(initialItem.suggestedMarks));
    const [duration, setDuration] = useState("30");
    const [dueDate, setDueDate] = useState(defaultDueDate);
    const [subjectId, setSubjectId] = useState("");
    const [audience, setAudience] = useState<"all" | "selected">("all");
    const [studentQuery, setStudentQuery] = useState("");
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [publishing, setPublishing] = useState(false);
    const isFaculty = session.user.role !== "student";
    const selected = curriculumCatalog.find((item) => item.id === selectedId) || initialItem;
    const questionMarks = questions.reduce((sum, question) => sum + Math.max(1, Number(question.marks) || 1), 0);
    const effectiveMarks = workMode === "mcq" ? questionMarks : Number(marks);
    const availableCatalog = useMemo(() => curriculumCatalog.filter((item) => item.courseCode === course && item.track === track && item.unit === unit), [course, track, unit]);
    const workflowAssignments = useMemo(() => assignments.filter((item) => assignmentType(item) === workflowType), [assignments, workflowType]);
    const filteredStudents = useMemo(() => students.filter(student => matchesCohort(student, studentQuery, department, section)), [studentQuery, students, department, section]);
    const renderedStudents = filteredStudents.slice(0, 100);
    useEffect(() => { let active = true; setLoading(true); void Promise.all([loadCoursework(session.token, isFaculty), isFaculty ? loadActivityTemplates(session.token) : Promise.resolve({} as Record<string, ActivityTemplate>)]).then(([data, loadedTemplates]) => { if (!active)
        return; setTemplates(loadedTemplates); const template = loadedTemplates[initialItem.id]; if (template) applyTemplate(initialItem, template); setAssignments(data.assignments); setSubmissions(data.submissions); setSubjects(data.subjects); setStudents(data.students); setSubjectId(subjectForItem(initialItem, data.subjects)); }).catch((caught) => { if (active)
        setError(caught instanceof Error ? caught.message : "Coursework could not be loaded"); }).finally(() => { if (active)
        setLoading(false); }); return () => { active = false; }; }, [initialItem, isFaculty, session.token]);
    const applyTemplate = (item: CurriculumItem, template: ActivityTemplate) => {
        setDescription(item.brief + (workflowType !== "lab" && workMode === "mcq" ? "\n\nAnswer each question. Select one option per question." : "\n\nTask:\n" + template.task));
        setStarterCode(template.starterCode);
        setExpectedOutput(template.output);
        setSampleInput(template.input);
        setHints(template.hints.join("\n"));
        setEnvironment(template.environment);
        setQuestions(template.questions.map(q => ({ ...q, options: [...q.options] })));
        if (workflowType === "lab") setWorkMode(template.mode);
    };
    const chooseItem = (item: CurriculumItem) => {
        setCourse(item.courseCode); setTrack(item.track); setUnit(item.unit); setSelectedId(item.id);
        setTitle(item.title); setMarks(String(item.suggestedMarks)); setSubjectId(subjectForItem(item, subjects));
        setEditingId(""); setNotice("");
        if (templates[item.id]) {
            applyTemplate(item, templates[item.id]);
        } else {
            setDescription(item.brief + (workflowType !== "lab" && workMode === "mcq" ? "\n\nAnswer each question. Select one option per question." : ""));
            setStarterCode("");
            setExpectedOutput("");
            setSampleInput("");
            setHints("");
            setQuestions([newQuestion()]);
        }
    };
    const changeMode = (mode: WorkMode) => {
        setWorkMode(mode);
        const template = templates[selected.id];
        if (template) setDescription(selected.brief + (mode === "mcq" ? "\n\nAnswer each question. Select one option per question." : "\n\nTask:\n" + template.task));
    };
    const changeCatalogFilter = (nextCourse: CourseCode, nextTrack: Track, nextUnit: number) => {
        setCourse(nextCourse);
        setTrack(nextTrack);
        setUnit(nextUnit);
        const nextItem = curriculumCatalog.find((item) => item.courseCode === nextCourse && item.track === nextTrack && item.unit === nextUnit) || curriculumCatalog.find(item => item.courseCode === nextCourse && item.track === nextTrack);
        if (nextItem)
            chooseItem(nextItem);
    };
    const nextRef = useRef(false);
    const publish = async (event: React.FormEvent) => { event.preventDefault(); setError(""); setNotice("");
        const isNext = nextRef.current;
        nextRef.current = false;
        if (workMode === "mcq" && (questions.length === 0 || questions.some((question) => !question.prompt.trim() || question.options.some((option) => !option.trim())))) {
            setError("Complete every MCQ prompt and all four options before publishing.");
            return;
        }
        if (workMode !== "mcq" && !expectedOutput.trim()) {
            setError("Add the expected output before publishing IDE work.");
            return;
        }
        setPublishing(true); try {
        const assignedUserIds = audience === "selected" ? selectedStudentIds : students.map((student) => student.id);
        const assigned = assignedUserIds.length;
        const payload = { title, subjectId, dueDate, maxMarks: effectiveMarks, description, starterCode: workMode !== "mcq" ? starterCode : "", testCases: workMode !== "mcq" ? [{ input: sampleInput, output: expectedOutput, hidden: false }] : [], assignedUserIds, assigned, submitted: 0, pending: assigned, reviewed: 0, assignmentType: taskType, curriculumItemId: selected.id, courseCode: selected.courseCode, unitNumber: selected.unit, durationMinutes: taskType === "assessment" ? Number(duration) : 0, workMode, executionEnvironment: environment, hints: taskType === "assessment" ? [] : hints.split("\n").filter(hint => hint.trim()), questions: workMode === "mcq" ? questions : [] };
        const assignment = editingId
            ? await updateCourseworkAssignment(session.token, editingId, payload)
            : await createCourseworkAssignment(session.token, payload);
        const linkedSubject = subjects.find((subject) => subject.id === assignment.subject_id) || null;
        setAssignments((current) => [{ ...assignment, subjects: linkedSubject }, ...current.filter(item => item.id !== assignment.id)]);
        setEditingId("");
        setNotice(`Published ${typeLabel(taskType).toLowerCase()} work to ${assigned} student${assigned === 1 ? "" : "s"}.`);
        if (isNext && !editingId) {
            const currentIndex = availableCatalog.findIndex(i => i.id === selected.id);
            if (currentIndex >= 0 && currentIndex < availableCatalog.length - 1) {
                chooseItem(availableCatalog[currentIndex + 1]);
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        }
    }
    catch (caught) {
        setError(caught instanceof Error ? caught.message : "Assignment could not be published");
    }
    finally {
        setPublishing(false);
    } };
    const removeAssignment = async (assignment: AssignmentRecord) => { if (!window.confirm(`Delete "${assignment.title}"?`))
        return; setError(""); try {
        await deleteCourseworkAssignment(session.token, assignment.id);
        setAssignments((current) => current.filter((item) => item.id !== assignment.id));
    }
    catch (caught) {
        setError(caught instanceof Error ? caught.message : "Assignment could not be deleted");
    } };
    const editAssignment = (assignment: AssignmentRecord) => {
        const item = curriculumCatalog.find(entry => entry.id === assignment.curriculum_item_id);
        if (!item) return;
        chooseItem(item); setEditingId(assignment.id); setTitle(assignment.title); setDescription(assignment.description);
        setStarterCode(assignment.starter_code); setExpectedOutput(assignment.test_cases?.[0]?.output || "");
        setSampleInput(assignment.test_cases?.[0]?.input || ""); setHints((assignment.hints || []).join("\n"));
        setEnvironment(assignment.execution_environment || "runner"); setWorkMode(assignment.work_mode);
        setQuestions(assignment.questions); setMarks(String(assignment.max_marks)); setDueDate(assignment.due_date);
        setDuration(String(assignment.duration_minutes)); setAudience("selected"); setSelectedStudentIds(assignment.assigned_user_ids);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const recipientCount = audience === "all" ? students.length : selectedStudentIds.length;
    const earliestDeadline = new Date().toISOString().slice(0, 10);
    if (loading)
        return <div className="panel empty-panel min-h-[320px]"><LoaderCircle className="animate-spin text-cyan-600" size={28}/><span>Loading coursework...</span></div>;
    if (!isFaculty)
        return (<StudentCoursework assignments={assignments} submissions={submissions} session={session} initialType={initialType} theme={theme} courseFilter={courseFilter} onEvent={onEvent} onSaved={(record) => {
            setSubmissions((current) => {
                const index = current.findIndex((item) => item.id === record.id || item.assignment_id === record.assignment_id);
                if (index === -1)
                    return [...current, record];
                const updated = [...current];
                updated[index] = record;
                return updated;
            });
        }}/>);
    return (
        <div className="space-y-7">
            <section className="grid gap-3 sm:grid-cols-3">
                <div className="metric-panel"><p>Curriculum items</p><strong>{curriculumCatalog.length}</strong><span>Organized by course, track, and unit</span><span className="metric-icon cyan"><BookOpenText size={18}/></span></div>
                <div className="metric-panel"><p>Published {typeLabel(taskType).toLowerCase()}</p><strong>{workflowAssignments.length}</strong><span>{workflowAssignments.reduce((sum, item) => sum + item.pending, 0)} pending submissions</span><span className="metric-icon amber"><ListChecks size={18}/></span></div>
                <div className="metric-panel"><p>Registered students</p><strong>{students.length}</strong><span>One action assigns work to the full class</span><span className="metric-icon emerald"><Users size={18}/></span></div>
            </section>

            {error && <div className="flex items-start gap-2 rounded-lg border border-rose-300 bg-rose-500/8 px-4 py-3 text-sm text-rose-600"><CircleAlert size={18} className="mt-0.5 shrink-0"/>{error}</div>}

            <form className="panel resource-form overflow-hidden" onSubmit={publish}>
                <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] p-5 sm:p-6">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[.14em] text-cyan-600">Create assignment</p>
                        <h2 className="mt-2 text-lg font-semibold">{editingId ? "Edit published assignment" : "Enable curriculum work"}</h2>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                        <span className="tag cyan">{selected.courseCode}</span>
                        <span className="tag neutral">Unit {selected.unit}</span>
                        <span className="tag neutral">{typeLabel(taskType)}</span>
                    </div>
                </header>

                <div className="grid lg:grid-cols-2">
                    <section className="border-b border-[var(--line)] p-5 sm:p-6 lg:border-r">
                        <div className="mb-5 flex items-center gap-3">
                            <span className="grid size-9 place-items-center rounded-md bg-cyan-500/10 text-cyan-600"><BookOpenText size={17}/></span>
                            <div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-cyan-600">Step 1</p><h3 className="text-sm font-semibold">Choose syllabus content</h3></div>
                        </div>
                        <div className="space-y-4">
                            <fieldset>
                                <legend>Course</legend>
                                <div className="segmented-control mt-2 w-full">
                                    {(["JAVA", "DBMS"] as CourseCode[]).map((value) => <button className={"flex-1 " + (course === value ? "active" : "")} key={value} onClick={() => changeCatalogFilter(value, track, unit)} type="button">{value}</button>)}
                                </div>
                            </fieldset>
                            <div className="rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3">
                                <p className="text-[10px] font-bold uppercase text-[var(--muted)]">Workflow</p>
                                <p className="mt-1 flex items-center gap-2 text-sm font-semibold">{taskType === "lab" ? <FlaskConical size={15} className="text-amber-600"/> : taskType === "assessment" ? <ShieldCheck size={15} className="text-amber-600"/> : <Code2 size={15} className="text-cyan-600"/>}{taskType === "lab" ? "Lab experiment" : taskType === "assessment" ? "Proctored assessment" : "Non-proctored practice"}</p>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-[130px_minmax(0,1fr)]">
                                <label>Unit<select value={unit} onChange={(event) => changeCatalogFilter(course, track, Number(event.target.value))}>{[...new Set(curriculumCatalog.filter(item => item.courseCode === course && item.track === track).map(item => item.unit))].map((value) => <option key={value} value={value}>Unit {value}</option>)}</select></label>
                                <label>Topic or experiment<select value={selected.id} onChange={(event) => { const item = curriculumCatalog.find((entry) => entry.id === event.target.value); if (item) chooseItem(item); }}>{availableCatalog.map((item) => <option key={item.id} value={item.id}>{item.label}: {item.title}</option>)}</select></label>
                            </div>
                            <div className="border-l-2 border-cyan-500 bg-[var(--surface-2)] px-4 py-3">
                                <div className="flex items-start gap-3">
                                    {selected.track === "lab" ? <FlaskConical className="mt-0.5 shrink-0 text-amber-600" size={17}/> : <BookOpenText className="mt-0.5 shrink-0 text-cyan-600" size={17}/>}
                                    <div className="min-w-0"><strong className="block text-sm">{selected.title}</strong><p className="mt-1 line-clamp-3 text-xs leading-5 text-[var(--muted)]">{selected.brief}</p></div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="border-b border-[var(--line)] p-5 sm:p-6">
                        <div className="mb-5 flex items-center gap-3">
                            <span className="grid size-9 place-items-center rounded-md bg-amber-500/10 text-amber-600"><ClipboardCheck size={17}/></span>
                            <div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-amber-600">Step 2</p><h3 className="text-sm font-semibold">Set work type and deadline</h3></div>
                        </div>
                        <fieldset>
                            <legend>Student activity</legend>
                            {taskType === "practice" || taskType === "assessment" ? <div className="segmented-control mt-2 w-full"><button className={"flex-1 " + (workMode === "mcq" ? "active" : "")} onClick={() => changeMode("mcq")} type="button"><ListChecks size={14} className="mr-1 inline"/>{taskType === "assessment" ? "Proctored MCQ" : "MCQs"}</button><button className={"flex-1 " + (workMode === "ide" ? "active" : "")} onClick={() => changeMode("ide")} type="button"><Code2 size={14} className="mr-1 inline"/>{taskType === "assessment" ? "Proctored IDE" : "IDE question"}</button></div> : <div className="mt-2 rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-sm font-semibold"><Code2 className="mr-2 inline text-cyan-600" size={15}/>{workMode === "response" ? "Design / written experiment" : "IDE experiment"}</div>}
                        </fieldset>
                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <label>Deadline<input required min={earliestDeadline} type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)}/></label>
                            {workMode === "mcq" ? <div><span className="block text-xs font-semibold text-[var(--muted)]">Total marks</span><strong className="mt-2 block rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2.5 text-sm">{questionMarks} from questions</strong></div> : <label>Maximum marks<input required min="1" max="100" type="number" value={marks} onChange={(event) => setMarks(event.target.value)}/></label>}
                        </div>
                        {taskType === "assessment" && <label className="mt-4">Time limit (minutes)<input required min="5" max="480" type="number" value={duration} onChange={(event) => setDuration(event.target.value)}/></label>}
                        <p className="mt-5 flex items-center gap-2 text-xs text-[var(--muted)]"><CalendarDays size={15}/>Due {dueLabel(dueDate)} for {effectiveMarks} marks</p>
                    </section>
                </div>

                <section className="border-b border-[var(--line)] p-5 sm:p-6">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <span className="grid size-9 place-items-center rounded-md bg-cyan-500/10 text-cyan-600">{workMode === "mcq" ? <ListChecks size={17}/> : <Code2 size={17}/>}</span>
                            <div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-cyan-600">Step 3</p><h3 className="text-sm font-semibold">{workMode === "mcq" ? "Build questions" : taskType === "lab" ? "Configure experiment workspace" : "Configure IDE question"}</h3></div>
                        </div>
                    </div>
                    <label className="mb-4 block">Editable task / instructions<textarea className="mt-2 min-h-40 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-3 text-sm leading-6" required value={description} onChange={event => setDescription(event.target.value)} /></label>
                    {workMode !== "mcq" && <div className="mb-4 grid gap-4 sm:grid-cols-2">
                      <label>Sample input<textarea className="mt-2 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-3 font-mono text-xs" rows={3} value={sampleInput} onChange={event => setSampleInput(event.target.value)} /></label>
                      <label>Execution environment<select value={environment} onChange={event => setEnvironment(event.target.value as "runner" | "external")}><option value="runner">Isolated code runner</option><option value="external">External lab / faculty review</option></select></label>
                    </div>}
                    {taskType !== "assessment" && <label className="mb-4 block">Optional hints (one per line)<textarea className="mt-2 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-3 text-sm" rows={3} value={hints} onChange={event => setHints(event.target.value)} /></label>}
                    {workMode === "mcq" ? <div className="space-y-4">{questions.map((question, questionIndex) => <article className="rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-4" key={question.id}><div className="flex items-center gap-3"><strong className="flex-1 text-sm">Question {questionIndex + 1}</strong><label className="w-24">Marks<input min="1" type="number" value={question.marks} onChange={(event) => setQuestions((current) => current.map((item) => item.id === question.id ? { ...item, marks: Math.max(1, Number(event.target.value)) } : item))}/></label><button className="icon-button" disabled={questions.length === 1} onClick={() => setQuestions((current) => current.filter((item) => item.id !== question.id))} title="Delete question" type="button"><Trash2 size={14}/></button></div><label className="mt-3">Prompt<input placeholder="Enter the question" value={question.prompt} onChange={(event) => setQuestions((current) => current.map((item) => item.id === question.id ? { ...item, prompt: event.target.value } : item))}/></label><div className="mt-3 grid gap-3 sm:grid-cols-2">{question.options.map((option, optionIndex) => <label key={`${question.id}-option-${optionIndex}`}><span className="flex items-center gap-2"><input checked={question.correctIndex === optionIndex} name={`${question.id}-correct`} onChange={() => setQuestions((current) => current.map((item) => item.id === question.id ? { ...item, correctIndex: optionIndex } : item))} type="radio"/>Option {optionIndex + 1}{question.correctIndex === optionIndex && <span className="text-[10px] font-semibold text-emerald-600">Correct</span>}</span><input className="mt-1" placeholder={`Option ${optionIndex + 1}`} value={option} onChange={(event) => setQuestions((current) => current.map((item) => item.id === question.id ? { ...item, options: item.options.map((value, index) => index === optionIndex ? event.target.value : value) } : item))}/></label>)}</div></article>)}<div className="flex justify-center mt-4"><button className="secondary-button" onClick={() => setQuestions((current) => [...current, newQuestion(current.length)])} type="button"><ListChecks size={15}/>Add question</button></div></div> : <div className="grid gap-4 lg:grid-cols-2"><label>Starter code<textarea className="mt-2 min-h-40 w-full resize-y rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-3 font-mono text-xs leading-5 text-[var(--ink)] outline-none focus:border-cyan-500" value={starterCode} onChange={(event) => setStarterCode(event.target.value)}/></label><label>Expected output<textarea className="mt-2 min-h-40 w-full resize-y rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-3 font-mono text-xs leading-5 text-[var(--ink)] outline-none focus:border-cyan-500" placeholder="Enter the expected program or query output" required value={expectedOutput} onChange={(event) => setExpectedOutput(event.target.value)}/></label></div>}
                </section>

                <section className="border-b border-[var(--line)] p-5 sm:p-6">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <span className="grid size-9 place-items-center rounded-md bg-emerald-500/10 text-emerald-600"><Users size={17}/></span>
                            <div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-emerald-600">Step 4</p><h3 className="text-sm font-semibold">Choose students</h3></div>
                        </div>
                        <span className="text-xs font-semibold text-[var(--muted)]">{recipientCount} selected</span>
                    </div>
                    <div className="segmented-control w-full sm:w-[360px]">
                        <button className={"flex-1 " + (audience === "all" ? "active" : "")} onClick={() => setAudience("all")} type="button"><Users size={14} className="mr-1 inline"/>All students</button>
                        <button className={"flex-1 " + (audience === "selected" ? "active" : "")} onClick={() => setAudience("selected")} type="button"><UserRoundCheck size={14} className="mr-1 inline"/>Selected students</button>
                    </div>
                    <AnimatePresence>
                        {audience === "selected" && <motion.div className="mt-4 overflow-hidden rounded-md border border-[var(--line)]" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                            <div className="m-2"><CohortFilters department={department} section={section} onDepartment={setDepartment} onSection={setSection} /></div>
                            <div className="m-2 flex flex-wrap gap-2">
                                <label className="search-control min-w-[200px] flex-1"><Search size={14}/><input value={studentQuery} onChange={(event) => setStudentQuery(event.target.value)} placeholder="Search name or roll number"/></label>
                                <button className="secondary-button px-3" onClick={() => setSelectedStudentIds((current) => [...new Set([...current, ...filteredStudents.map((student) => student.id)])])} type="button">Select filtered</button>
                                <button className="icon-button" onClick={() => setSelectedStudentIds([])} title="Clear selection" type="button"><Trash2 size={14}/></button>
                            </div>
                            <div className="max-h-52 overflow-y-auto border-t border-[var(--line)]">
                                {renderedStudents.map((student) => <label className="flex cursor-pointer items-center gap-3 border-b border-[var(--line)] px-3 py-2.5 last:border-0" key={student.id}><input type="checkbox" checked={selectedStudentIds.includes(student.id)} onChange={(event) => setSelectedStudentIds((current) => event.target.checked ? [...current, student.id] : current.filter((id) => id !== student.id))}/><span className="min-w-0"><strong className="block truncate text-xs text-[var(--ink)]">{student.name}</strong><span className="text-[10px] text-[var(--muted)]">{student.rollNumber || "No roll number"} / {student.department || "Department not set"} / {student.section || "-"}</span></span></label>)}
                                {filteredStudents.length > renderedStudents.length && <p className="p-3 text-center text-[10px] text-[var(--muted)]">Showing 100 of {filteredStudents.length}. Search or use Select filtered.</p>}
                            </div>
                        </motion.div>}
                    </AnimatePresence>
                </section>

                <details className="border-b border-[var(--line)]">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold sm:px-6">
                        <span>Customize assignment details</span>
                        <span className="text-xs font-normal text-[var(--muted)]">Optional</span>
                    </summary>
                    <div className="grid gap-4 border-t border-[var(--line)] bg-[var(--surface-2)] p-5 sm:p-6">
                        <label>Title<input required value={title} onChange={(event) => setTitle(event.target.value)}/></label>
                        <label>Instructions<textarea className="min-h-28 w-full resize-y rounded-md border border-[var(--line)] bg-[var(--surface)] p-3 text-xs leading-5 text-[var(--ink)] outline-none focus:border-cyan-500" required value={description} onChange={(event) => setDescription(event.target.value)}/></label>
                        <label>Course section<select required value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>{subjects.map((subject) => <option value={subject.id} key={subject.id}>{courseForSubject(subject)} / {subject.section}</option>)}</select></label>
                    </div>
                </details>

                <footer className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div className="min-w-0">
                        {notice ? <p className="flex items-center gap-2 text-xs font-semibold text-emerald-600"><Check size={15}/>{notice}</p> : <p className="text-xs text-[var(--muted)]"><strong className="text-[var(--ink)]">{typeLabel(taskType)}:</strong> {selected.title} to {recipientCount} student{recipientCount === 1 ? "" : "s"}</p>}
                        <p className="mt-1 flex items-center gap-2 text-[10px] text-[var(--muted)]"><FileCode2 size={13}/>Source: {selected.source}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        {!editingId && <button className="secondary-button shrink-0" disabled={publishing || !subjectId || students.length === 0 || recipientCount === 0} onClick={() => nextRef.current = true} type="submit">{publishing ? <LoaderCircle className="animate-spin" size={16}/> : <Send size={16}/>} Publish & Next</button>}
                        <button className="primary-button shrink-0" disabled={publishing || !subjectId || students.length === 0 || recipientCount === 0} onClick={() => nextRef.current = false} type="submit">{publishing ? <LoaderCircle className="animate-spin" size={16}/> : <Send size={16}/>} {students.length === 0 ? "No registered students" : publishing ? "Saving..." : editingId ? "Save changes" : "Enable and publish"}</button>
                    </div>
                </footer>
            </form>

            <section className="panel overflow-hidden">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] p-5">
                    <div><p className="text-xs font-bold uppercase tracking-[.14em] text-cyan-600">Published work</p><h2 className="mt-1 text-base font-semibold">Assignment queue</h2></div>
                    <span className="text-xs text-[var(--muted)]">{workflowAssignments.length} total</span>
                </header>
                <div className="overflow-x-auto">
                    <table className="data-table">
                        <thead><tr><th>Assignment</th><th>Type</th><th>Course / Unit</th><th>Due</th><th>Assigned</th><th>Submitted</th><th aria-label="Actions"/></tr></thead>
                        <tbody>
                            {workflowAssignments.map((assignment) => <tr key={assignment.id}><td><strong>{assignment.title}</strong><small>{assignment.max_marks} marks</small></td><td><span className="tag neutral">{assignment.work_mode?.toUpperCase() || typeLabel(assignmentType(assignment))}</span></td><td><span className={"tag " + (assignmentCourse(assignment) === "JAVA" ? "cyan" : "amber")}>{assignmentCourse(assignment)} / U{assignment.unit_number || 1}</span></td><td>{dueLabel(assignment.due_date)}</td><td>{assignment.assigned}</td><td>{assignment.submitted}</td><td><div className="flex gap-1"><button className="icon-button" onClick={() => editAssignment(assignment)} title="Edit assignment" type="button"><Pencil size={14}/></button><button className="icon-button" onClick={() => void removeAssignment(assignment)} title="Delete assignment" type="button"><Trash2 size={14}/></button></div></td></tr>)}
                            {workflowAssignments.length === 0 && <tr><td colSpan={7} className="text-center">No {typeLabel(taskType).toLowerCase()} work has been published.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
