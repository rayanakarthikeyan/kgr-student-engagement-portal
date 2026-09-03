import { useEffect, useMemo, useState } from "react";
import { Bot, ChevronRight, Pencil, Plus, ScanSearch, Search, Sparkles, Trash2, X } from "lucide-react";
import type { LearningRecord } from "./LearningTools";
import type { RoleId, SubjectType } from "./data";

interface Assignment {
  id: string;
  title: string;
  subject_id: string;
  due_date: string;
  assigned: number;
  submitted: number;
  pending: number;
  reviewed: number;
  subjects?: { name: string; type: SubjectType; semester: string; section: string } | null;
}

interface Subject {
  id: string;
  name: string;
}

interface Person {
  id: string;
  name: string;
  role: RoleId;
}

type LearningAction = (body: Record<string, unknown>) => Promise<void>;

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) return seconds > 0 ? `${seconds}s` : "-";
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function metadataNumber(record: LearningRecord | undefined, key: string) {
  return Number(record?.metadata?.[key] || 0);
}

export function AssignmentWorkspace({
  role,
  currentUserId,
  assignments,
  subjects,
  people,
  learning,
  onCreateAssignment,
  onUpdateAssignment,
  onDeleteAssignment,
  onLearningAction,
  onOpenAi,
}: {
  role: RoleId;
  currentUserId: string;
  assignments: Assignment[];
  subjects: Subject[];
  people: Person[];
  learning: LearningRecord[];
  onCreateAssignment: (body: Record<string, string | number>) => Promise<void>;
  onUpdateAssignment: (body: Record<string, string | number>) => Promise<void>;
  onDeleteAssignment: (id: string) => Promise<void>;
  onLearningAction: LearningAction;
  onOpenAi: () => void;
}) {
  const canManage = role === "faculty";
  const [selectedId, setSelectedId] = useState(assignments[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [submissionText, setSubmissionText] = useState("");
  const [working, setWorking] = useState("");
  const [draft, setDraft] = useState({ title: "", subjectId: subjects[0]?.id ?? "", dueDate: new Date().toISOString().slice(0, 10), assigned: "1" });

  const selected = assignments.find((assignment) => assignment.id === selectedId) ?? assignments[0] ?? null;
  const filteredAssignments = assignments.filter((assignment) => `${assignment.title} ${assignment.subjects?.name ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  const submissions = learning.filter((record) => record.kind === "submission" && record.assignment_id === selected?.id);
  const questions = learning.filter((record) => record.kind === "question" && record.assignment_id === selected?.id);
  const chats = learning.filter((record) => record.kind === "chat" && record.assignment_id === selected?.id);
  const ownSubmission = submissions.find((record) => record.author_id === currentUserId);
  const students = people.filter((person) => person.role === "student");

  useEffect(() => {
    if (!selectedId && assignments[0]) setSelectedId(assignments[0].id);
    if (!draft.subjectId && subjects[0]) setDraft((value) => ({ ...value, subjectId: subjects[0].id }));
  }, [assignments, draft.subjectId, selectedId, subjects]);

  useEffect(() => {
    setSubmissionText(ownSubmission?.body ?? "");
  }, [ownSubmission?.id, selected?.id]);

  const rosterRows = useMemo(() => students.map((student) => {
    const submission = submissions.find((record) => record.author_id === student.id);
    const aiChats = chats.filter((record) => record.author_id === student.id).length;
    const status = submission?.status ?? "not_started";
    return { student, submission, aiChats, status };
  }).filter((row) => statusFilter === "all" || (statusFilter === "needs_evaluation" ? row.status === "submitted" : row.status === statusFilter)), [chats, statusFilter, students, submissions]);

  const createAssignment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (editingId) {
      await onUpdateAssignment({ id: editingId, title: draft.title, subjectId: draft.subjectId, dueDate: draft.dueDate, assigned: Number(draft.assigned) });
    } else {
      await onCreateAssignment({ title: draft.title, subjectId: draft.subjectId, dueDate: draft.dueDate, assigned: Number(draft.assigned), submitted: 0, pending: Number(draft.assigned), reviewed: 0 });
    }
    setDraft((value) => ({ ...value, title: "" }));
    setEditingId("");
    setShowCreate(false);
  };

  const beginEdit = (assignment: Assignment) => {
    setEditingId(assignment.id);
    setDraft({ title: assignment.title, subjectId: assignment.subject_id, dueDate: assignment.due_date, assigned: String(assignment.assigned) });
    setShowCreate(true);
  };

  const closeEditor = () => {
    setEditingId("");
    setShowCreate(false);
    setDraft((value) => ({ ...value, title: "" }));
  };

  const submitWork = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setWorking("submit");
    try {
      await onLearningAction({ kind: "submission", id: `learn-submission-${selected.id}-${currentUserId}`, assignmentId: selected.id, subjectId: selected.subject_id, title: `${selected.title} submission`, body: submissionText, status: "submitted", metadata: { time_spent_seconds: metadataNumber(ownSubmission, "time_spent_seconds") || 60 } });
    } finally {
      setWorking("");
    }
  };

  const runAction = async (id: string, action: "scan" | "grade") => {
    setWorking(`${action}-${id}`);
    try {
      await onLearningAction({ id, action });
    } finally {
      setWorking("");
    }
  };

  return (
    <section className="reference-workspace">
      <aside className="reference-assignment-rail">
        <div className="rail-header"><div><p className="eyebrow">Course work</p><h2>{canManage ? "Assignments" : "My Assignments"}</h2></div>{canManage&&<button className="button compact" type="button" onClick={()=>{if(showCreate)closeEditor();else setShowCreate(true);}}>{showCreate?<X size={15}/>:<Plus size={15}/>} {showCreate?"Close":"New"}</button>}</div>
        <label className="rail-search-input"><Search size={17}/><input type="search" value={query} placeholder="Search assignments..." onChange={(event)=>setQuery(event.target.value)}/></label>
        {showCreate&&<form className="quick-create" onSubmit={createAssignment}><strong>{editingId?"Edit assignment":"New assignment"}</strong><input required placeholder="Assignment title" value={draft.title} onChange={(event)=>setDraft((value)=>({...value,title:event.target.value}))}/><select value={draft.subjectId} onChange={(event)=>setDraft((value)=>({...value,subjectId:event.target.value}))}>{subjects.map((subject)=><option value={subject.id} key={subject.id}>{subject.name}</option>)}</select><div><input required type="date" value={draft.dueDate} onChange={(event)=>setDraft((value)=>({...value,dueDate:event.target.value}))}/><input required min="1" type="number" value={draft.assigned} onChange={(event)=>setDraft((value)=>({...value,assigned:event.target.value}))}/></div><button className="button" type="submit">{editingId?"Save changes":"Create"}</button></form>}
        <div className="reference-assignment-list">
          {filteredAssignments.map((assignment)=>{const progress=assignment.assigned?Math.round((assignment.submitted/assignment.assigned)*100):0;return <div className={`reference-assignment-card ${selected?.id===assignment.id?"selected":""}`} key={assignment.id}><button className="assignment-card-select" type="button" onClick={()=>setSelectedId(assignment.id)}><div className="assignment-title-row"><h3>{assignment.title}</h3><ChevronRight size={16}/></div><div className="assignment-meta"><span>{assignment.subjects?.name??"Student group"}</span><span>Due {assignment.due_date}</span></div><div className="reference-mini-stats"><span><strong>{assignment.assigned}</strong>Assigned</span><span className="blue"><strong>{assignment.submitted}</strong>Submitted</span><span className="amber"><strong>{assignment.pending}</strong>Pending</span><span className="green"><strong>{assignment.reviewed}</strong>Graded</span></div><div className="progress strong"><span style={{width:`${progress}%`}}/></div></button>{canManage&&<div className="assignment-card-actions"><button type="button" title="Edit assignment" onClick={()=>beginEdit(assignment)}><Pencil size={14}/></button><button type="button" title="Delete assignment" onClick={()=>void onDeleteAssignment(assignment.id)}><Trash2 size={14}/></button></div>}</div>;})}
          {filteredAssignments.length===0&&<div className="rail-empty">No matching assignments.</div>}
        </div>
      </aside>

      <article className="reference-submission-panel">
        {!selected?<div className="empty-state large"><h2>No assignments yet</h2><p>Create an assignment to begin.</p></div>:<>
          <header className="submission-toolbar"><div><p className="eyebrow">Viewing assignment</p><select value={selected.id} onChange={(event)=>setSelectedId(event.target.value)}>{assignments.map((assignment)=><option value={assignment.id} key={assignment.id}>{assignment.title} - {assignment.submitted}/{assignment.assigned} submitted</option>)}</select><p>{selected.subjects?.name} · Due {selected.due_date} · {questions.length} rubric question{questions.length===1?"":"s"}</p></div>{canManage?<div className="toolbar-actions"><button className="button secondary" type="button" disabled={submissions.length===0} onClick={()=>void Promise.all(submissions.map((submission)=>runAction(submission.id,"scan")))}><ScanSearch size={16}/>Scan Plagiarism</button><button className="button" type="button" disabled={submissions.length===0} onClick={()=>void Promise.all(submissions.filter((submission)=>submission.status!=="graded").map((submission)=>runAction(submission.id,"grade")))}><Sparkles size={16}/>Auto-grade</button></div>:<button className="button ai-cta" type="button" onClick={onOpenAi}><Bot size={17}/>Ask AI for help</button>}</header>

          <div className="reference-summary"><div><span>Assigned</span><strong>{selected.assigned}</strong></div><div><span>Submitted</span><strong className="blue-text">{selected.submitted}</strong></div><div><span>Not started</span><strong>{Math.max(0,selected.assigned-selected.submitted)}</strong></div><div><span>Graded</span><strong className="green-text">{selected.reviewed}</strong></div></div>

          {canManage?<>
            <div className="submission-filters">{[["all","All"],["needs_evaluation","Needs Evaluation"],["graded","Graded"],["submitted","Working"],["not_started","Not Started"]].map(([id,label])=><button className={statusFilter===id?"active":""} type="button" key={id} onClick={()=>setStatusFilter(id)}>{label}</button>)}</div>
            <div className="dense-table-wrap submission-roster"><table className="dense-table"><thead><tr><th>Student Details</th><th>Status</th><th>AI Usage</th><th>Time Spent</th><th>Similarity</th><th>Evaluation</th><th>Actions</th></tr></thead><tbody>{rosterRows.map(({student,submission,aiChats,status})=><tr key={student.id}><td><strong>{student.name}</strong></td><td><span className={`status-pill ${status==="graded"?"success":status==="not_started"?"warning":""}`}>{status.replaceAll("_"," ")}</span></td><td><strong>{aiChats}</strong><span>support chats</span></td><td>{formatTime(metadataNumber(submission,"time_spent_seconds"))}</td><td><span className={`similarity-score ${metadataNumber(submission,"similarity_score")>=60?"high":""}`}>{submission?`${metadataNumber(submission,"similarity_score")}%`:"-"}</span></td><td>{submission?.score==null?<span className="muted-text">Not graded</span>:<><strong className="mark-score">{submission.score}</strong><span>/ {metadataNumber(submission,"auto_grade_possible")||10}</span></>}</td><td>{submission?<div className="row-actions"><button title="Run similarity scan" type="button" onClick={()=>void runAction(submission.id,"scan")} disabled={working===`scan-${submission.id}`}><ScanSearch size={15}/></button><button type="button" onClick={()=>void runAction(submission.id,"grade")} disabled={working===`grade-${submission.id}`}>Evaluate<ChevronRight size={14}/></button></div>:<span className="muted-text">Awaiting work</span>}</td></tr>)}{rosterRows.length===0&&<tr><td colSpan={7}>No students match this status.</td></tr>}</tbody></table></div>
          </>:<section className="student-submission-workspace"><div className="assignment-question-list"><h2>Assignment Questions</h2>{questions.map((question,index)=><div className="question-preview" key={question.id}><span>{index+1}</span><div><strong>{question.title}</strong><p>{question.body}</p><small>{question.score??0} marks · {String(question.metadata.difficulty||"Medium")}</small></div></div>)}{questions.length===0&&<p>No question prompt has been added yet.</p>}</div><form className="student-answer-form" onSubmit={submitWork}><div><h2>Your Submission</h2><span className={`status-pill ${ownSubmission?.status==="graded"?"success":""}`}>{ownSubmission?.status?.replaceAll("_"," ")||"Not started"}</span></div><textarea required value={submissionText} onChange={(event)=>setSubmissionText(event.target.value)} placeholder="Write your answer, query, or working notes here..."/><div className="student-submit-footer"><p>{ownSubmission?.score==null?"Faculty feedback and marks will appear after evaluation.":`Current mark: ${ownSubmission.score}`}</p><button className="button" type="submit" disabled={working==="submit"}>{working==="submit"?"Saving...":"Submit work"}</button></div></form></section>}
        </>}
      </article>
    </section>
  );
}
