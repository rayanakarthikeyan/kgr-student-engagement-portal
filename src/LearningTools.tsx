import { useMemo, useState } from "react";
import {
  Bot,
  Download,
  FileQuestion,
  MessageSquareText,
  Send,
  ShieldCheck,
  Sparkles,
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
}

interface LearningAssignment {
  id: string;
  title: string;
  subject_id: string;
}

interface EngagementLike {
  kind: string;
  author_id: string;
  metadata: Record<string, unknown>;
}

type CreateLearning = (body: Record<string, unknown>) => Promise<void>;

function metaText(record: LearningRecord, key: string) {
  const value = record.metadata?.[key];
  return typeof value === "string" ? value : "";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const content = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function assignmentName(id: string | null | undefined, assignments: LearningAssignment[]) {
  return assignments.find((assignment) => assignment.id === id)?.title ?? "General support";
}

function personName(id: string, people: LearningPerson[]) {
  return people.find((person) => person.id === id)?.name ?? "Portal user";
}

export function QuestionBank({ assignments, records, onCreate }: { assignments: LearningAssignment[]; records: LearningRecord[]; onCreate: CreateLearning }) {
  const questions = records.filter((record) => record.kind === "question");
  const [draft, setDraft] = useState({ assignmentId: assignments[0]?.id ?? "", title: "", prompt: "", marks: "10", difficulty: "Medium", keywords: "", answer: "" });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const assignment = assignments.find((item) => item.id === draft.assignmentId);
    await onCreate({
      kind: "question",
      assignmentId: draft.assignmentId,
      subjectId: assignment?.subject_id,
      title: draft.title,
      body: draft.prompt,
      score: Number(draft.marks),
      metadata: {
        difficulty: draft.difficulty,
        keywords: draft.keywords.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean),
        tags: draft.keywords.split(",").map((item) => item.trim()).filter(Boolean),
        reference_answer: draft.answer,
      },
    });
    setDraft((current) => ({ ...current, title: "", prompt: "", keywords: "", answer: "" }));
  };

  return (
    <section className="tool-layout">
      <article className="panel tool-main">
        <div className="tool-heading"><div><FileQuestion size={22} /><p className="eyebrow">Faculty authoring</p><h2>Question Bank</h2><p>Create reusable rubric questions for assignments and quizzes.</p></div><span className="count-badge">{questions.length} questions</span></div>
        <div className="dense-table-wrap">
          <table className="dense-table">
            <thead><tr><th>Question</th><th>Assignment</th><th>Difficulty</th><th>Marks</th><th>Rubric keywords</th></tr></thead>
            <tbody>
              {questions.map((question) => <tr key={question.id}><td><strong>{question.title}</strong><span>{question.body}</span></td><td>{assignmentName(question.assignment_id, assignments)}</td><td><span className="status-pill">{metaText(question, "difficulty") || "Medium"}</span></td><td>{question.score ?? 0}</td><td>{Array.isArray(question.metadata.keywords) ? question.metadata.keywords.join(", ") : "-"}</td></tr>)}
              {questions.length === 0 && <tr><td colSpan={5}>No questions have been added yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </article>
      <aside className="panel tool-side">
        <h2>Add Question</h2>
        <form className="form-grid single-column" onSubmit={submit}>
          <label>Assignment<select required value={draft.assignmentId} onChange={(event) => setDraft((value) => ({ ...value, assignmentId: event.target.value }))}>{assignments.map((assignment) => <option value={assignment.id} key={assignment.id}>{assignment.title}</option>)}</select></label>
          <label>Question title<input required value={draft.title} onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value }))} /></label>
          <label>Prompt<textarea required value={draft.prompt} onChange={(event) => setDraft((value) => ({ ...value, prompt: event.target.value }))} /></label>
          <div className="form-split"><label>Difficulty<select value={draft.difficulty} onChange={(event) => setDraft((value) => ({ ...value, difficulty: event.target.value }))}><option>Easy</option><option>Medium</option><option>Hard</option></select></label><label>Marks<input min="1" type="number" value={draft.marks} onChange={(event) => setDraft((value) => ({ ...value, marks: event.target.value }))} /></label></div>
          <label>Rubric keywords<input required placeholder="join, group, having" value={draft.keywords} onChange={(event) => setDraft((value) => ({ ...value, keywords: event.target.value }))} /></label>
          <label>Reference answer<textarea required value={draft.answer} onChange={(event) => setDraft((value) => ({ ...value, answer: event.target.value }))} /></label>
          <button className="button" type="submit">Add to bank</button>
        </form>
      </aside>
    </section>
  );
}

export function MarksExport({ assignments, records, people }: { assignments: LearningAssignment[]; records: LearningRecord[]; people: LearningPerson[] }) {
  const submissions = records.filter((record) => record.kind === "submission");
  const rows = submissions.map((record) => [personName(record.author_id, people), assignmentName(record.assignment_id, assignments), record.status, record.score ?? "", metaText(record, "faculty_feedback"), formatDate(record.created_at)]);
  return <section className="panel tool-main"><div className="tool-heading"><div><Download size={22}/><p className="eyebrow">Faculty reporting</p><h2>Marks Export</h2><p>Review evaluated submissions before downloading the marks register.</p></div><button className="button" type="button" onClick={() => downloadCsv("learning-portal-marks.csv", [["Student", "Assignment", "Status", "Marks", "Feedback", "Submitted"], ...rows])}><Download size={16}/>Export CSV</button></div><div className="dense-table-wrap"><table className="dense-table"><thead><tr><th>Student</th><th>Assignment</th><th>Status</th><th>Marks</th><th>Feedback</th><th>Submitted</th></tr></thead><tbody>{rows.map((row, index)=><tr key={`${row[0]}-${index}`}>{row.map((cell, cellIndex)=><td key={cellIndex}>{cell || "-"}</td>)}</tr>)}{rows.length===0&&<tr><td colSpan={6}>No submissions are available for export.</td></tr>}</tbody></table></div></section>;
}

export function AiChatExport({ assignments, records, people, aiConfigured }: { assignments: LearningAssignment[]; records: LearningRecord[]; people: LearningPerson[]; aiConfigured: boolean }) {
  const chats = records.filter((record) => record.kind === "chat");
  const rows = chats.map((record) => [personName(record.author_id, people), assignmentName(record.assignment_id, assignments), record.body, metaText(record, "response"), metaText(record, "model"), formatDate(record.created_at)]);
  return <section className="panel tool-main"><div className="tool-heading"><div><MessageSquareText size={22}/><p className="eyebrow">Support oversight</p><h2>AI Chat Export</h2><p>Review assignment-support questions and the guidance returned to students.</p></div><div className="heading-actions"><span className={`status-pill ${aiConfigured ? "success" : ""}`}>{aiConfigured ? "Hosted AI connected" : "Built-in tutor active"}</span><button className="button secondary" type="button" onClick={() => downloadCsv("learning-portal-ai-chats.csv", [["Student", "Assignment", "Question", "Response", "Tutor", "Time"], ...rows])}><Download size={16}/>Export CSV</button></div></div><div className="dense-table-wrap"><table className="dense-table"><thead><tr><th>Student</th><th>Assignment</th><th>Question</th><th>Guidance</th><th>Tutor</th></tr></thead><tbody>{chats.map((record)=><tr key={record.id}><td>{personName(record.author_id,people)}</td><td>{assignmentName(record.assignment_id,assignments)}</td><td>{record.body}</td><td>{metaText(record,"response")}</td><td><span className="status-pill">{metaText(record,"model")}</span></td></tr>)}{chats.length===0&&<tr><td colSpan={5}>No AI support conversations yet.</td></tr>}</tbody></table></div></section>;
}

function duration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function StudentRoster({ people, learning, engagement }: { people: LearningPerson[]; learning: LearningRecord[]; engagement: EngagementLike[] }) {
  const students = people.filter((person) => person.role === "student");
  return <section className="panel tool-main"><div className="tool-heading"><div><Users size={22}/><p className="eyebrow">Faculty monitoring</p><h2>Student Roster</h2><p>Submission, AI-support, and active-learning indicators in one place.</p></div><span className="count-badge">{students.length} students</span></div><div className="dense-table-wrap"><table className="dense-table"><thead><tr><th>Student</th><th>Account</th><th>Submissions</th><th>Average mark</th><th>AI chats</th><th>Learning time</th><th>Signal</th></tr></thead><tbody>{students.map((student)=>{const submissions=learning.filter((record)=>record.kind==="submission"&&record.author_id===student.id);const scores=submissions.map((record)=>Number(record.score)).filter(Number.isFinite);const chats=learning.filter((record)=>record.kind==="chat"&&record.author_id===student.id).length;const seconds=engagement.filter((record)=>record.kind==="time_session"&&record.author_id===student.id).reduce((sum,record)=>sum+Number(record.metadata.active_seconds||0),0);return <tr key={student.id}><td><strong>{student.name}</strong></td><td>{student.email||"-"}</td><td>{submissions.length}</td><td>{scores.length?`${(scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1)}`:"-"}</td><td>{chats}</td><td>{duration(seconds)}</td><td><span className={`status-pill ${seconds>0?"success":"warning"}`}>{seconds>0?"Active":"Follow up"}</span></td></tr>;})}</tbody></table></div></section>;
}

export function AiAssignmentSupport({ currentUserId, assignments, records, onCreate, aiConfigured }: { currentUserId: string; assignments: LearningAssignment[]; records: LearningRecord[]; onCreate: CreateLearning; aiConfigured: boolean }) {
  const [assignmentId, setAssignmentId] = useState(assignments[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const history = useMemo(() => records.filter((record) => record.kind === "chat" && record.author_id === currentUserId && (!assignmentId || record.assignment_id === assignmentId)).toReversed(), [assignmentId, currentUserId, records]);
  const prompts = ["Help me plan the first step", "Explain this concept with a smaller example", "Check my approach without giving the final answer"];

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      const assignment = assignments.find((item) => item.id === assignmentId);
      await onCreate({ kind: "chat", assignmentId, subjectId: assignment?.subject_id, message, title: "Assignment support" });
      setMessage("");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="ai-support-layout">
      <article className="ai-chat-panel">
        <header className="ai-chat-header"><div className="ai-bot-icon"><Bot size={22}/></div><div><p className="eyebrow">Assignment support</p><h2>AI Learning Assistant</h2><span>{aiConfigured ? "Hosted AI guidance" : "Built-in DBMS tutor"}</span></div><span className="status-pill success"><Sparkles size={14}/>Available</span></header>
        <div className="ai-context-bar"><label>Working on<select value={assignmentId} onChange={(event)=>setAssignmentId(event.target.value)}>{assignments.map((assignment)=><option value={assignment.id} key={assignment.id}>{assignment.title}</option>)}</select></label><div><ShieldCheck size={17}/><span>Hints and guided steps, not ready-to-submit answers</span></div></div>
        <div className="chat-history" aria-live="polite">
          {history.length===0&&<div className="chat-empty"><Bot size={30}/><h3>Ask about your assignment</h3><p>Share the step where you are stuck and what you have already tried.</p></div>}
          {history.map((record)=><div className="chat-exchange" key={record.id}><div className="chat-bubble student"><span>You</span><p>{record.body}</p></div><div className="chat-bubble assistant"><span>Learning Assistant</span><p>{metaText(record,"response")}</p><small>{metaText(record,"model")}</small></div></div>)}
        </div>
        <div className="prompt-chips">{prompts.map((prompt)=><button type="button" key={prompt} onClick={()=>setMessage(prompt)}>{prompt}</button>)}</div>
        <form className="chat-composer" onSubmit={submit}><textarea required value={message} onChange={(event)=>setMessage(event.target.value)} placeholder="Describe what you tried and where you are stuck..."/><button className="button icon-submit" type="submit" disabled={sending} title="Send question"><Send size={18}/><span>{sending?"Thinking...":"Send"}</span></button></form>
      </article>
      <aside className="ai-guidance-panel"><Sparkles size={22}/><h2>Use it effectively</h2><p>Ask for an explanation, a smaller example, a debugging hint, or feedback on your approach.</p><ul><li>Include the exact assignment step.</li><li>Show your current query or reasoning.</li><li>Use the response to revise your own work.</li></ul><p className="privacy-note">Faculty can review support conversations to identify common learning gaps.</p></aside>
    </section>
  );
}
