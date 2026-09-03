import { useEffect, useMemo, useState } from "react";
import { Bot, ChevronRight, FileText, Pencil, Plus, Printer, ScanSearch, Search, Sparkles, Trash2, X } from "lucide-react";
import type { LearningRecord } from "./LearningTools";
import type { RoleId, SubjectType } from "./data";

interface TestCase {
  input: string;
  output: string;
  hidden: boolean;
}

interface Assignment {
  id: string;
  title: string;
  subject_id: string;
  due_date: string;
  max_marks?: number;
  description?: string;
  starter_code?: string;
  test_cases?: TestCase[];
  assigned_user_ids?: string[];
  assigned: number;
  submitted: number;
  pending: number;
  reviewed: number;
  subjects?: { name: string; type: SubjectType; semester: string; section: string } | null;
}

interface Subject { id: string; name: string; }

interface Person {
  id: string;
  name: string;
  email?: string;
  roll_number?: string;
  batch?: string;
  role: RoleId;
}

interface AssignmentDraft {
  title: string;
  subjectId: string;
  dueDate: string;
  maxMarks: string;
  description: string;
  starterCode: string;
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

function testCases(value: unknown): TestCase[] {
  return Array.isArray(value) ? value.filter((item): item is TestCase => Boolean(item && typeof item === "object")) : [];
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
  onCreateAssignment: (body: Record<string, unknown>) => Promise<void>;
  onUpdateAssignment: (body: Record<string, unknown>) => Promise<void>;
  onDeleteAssignment: (id: string) => Promise<void>;
  onLearningAction: LearningAction;
  onOpenAi: () => void;
}) {
  const canManage = role === "faculty";
  const students = people.filter((person) => person.role === "student");
  const emptyDraft = (): AssignmentDraft => ({ title: "", subjectId: subjects[0]?.id ?? "", dueDate: new Date().toISOString().slice(0, 10), maxMarks: "10", description: "", starterCode: "" });
  const [selectedId, setSelectedId] = useState(assignments[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState<AssignmentDraft>(emptyDraft);
  const [tests, setTests] = useState<TestCase[]>([{ input: "", output: "", hidden: false }]);
  const [audienceMode, setAudienceMode] = useState<"all" | "specific">("all");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [submissionText, setSubmissionText] = useState("");
  const [working, setWorking] = useState("");
  const [evaluating, setEvaluating] = useState<LearningRecord | null>(null);
  const [rubric, setRubric] = useState({ correctness: 3, structure: 3, quality: 3, engagement: 0 });
  const [feedback, setFeedback] = useState("");

  const selected = assignments.find((assignment) => assignment.id === selectedId) ?? assignments[0] ?? null;
  const assignedStudentIds = Array.isArray(selected?.assigned_user_ids) ? selected.assigned_user_ids : [];
  const rosterStudents = assignedStudentIds.length ? students.filter((student) => assignedStudentIds.includes(student.id)) : students;
  const filteredAssignments = assignments.filter((assignment) => `${assignment.title} ${assignment.subjects?.name ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  const submissions = learning.filter((record) => record.kind === "submission" && record.assignment_id === selected?.id);
  const questions = learning.filter((record) => record.kind === "question" && record.assignment_id === selected?.id);
  const allQuestions = learning.filter((record) => record.kind === "question");
  const chats = learning.filter((record) => record.kind === "chat" && record.assignment_id === selected?.id);
  const ownSubmission = submissions.find((record) => record.author_id === currentUserId);
  const batches = [...new Set(rosterStudents.map((student) => student.batch).filter(Boolean) as string[])].toSorted();
  const assignmentTests = testCases(selected?.test_cases);

  useEffect(() => {
    if (!selectedId && assignments[0]) setSelectedId(assignments[0].id);
  }, [assignments, selectedId]);

  useEffect(() => {
    setSubmissionText(ownSubmission?.body ?? selected?.starter_code ?? "");
  }, [ownSubmission?.id, selected?.id, selected?.starter_code]);

  const rosterRows = useMemo(() => rosterStudents.map((student) => {
    const submission = submissions.find((record) => record.author_id === student.id);
    const studentChats = chats.filter((record) => record.author_id === student.id);
    const status = submission?.status ?? "not_started";
    const participation = Math.min(100, studentChats.length * 25);
    const dependency = metadataNumber(submission, "ai_dependency_percent");
    const quality = dependency >= 70 ? "Over-dependent" : participation >= 40 ? "Moderate use" : "Low engagement";
    return { student, submission, aiChats: studentChats.length, participation, dependency, quality, status };
  }).filter((row) => batchFilter === "all" || row.student.batch === batchFilter)
    .filter((row) => statusFilter === "all" || (statusFilter === "needs_evaluation" ? row.status === "submitted" : row.status === statusFilter)), [batchFilter, chats, statusFilter, rosterStudents, submissions]);

  const openNew = () => {
    setEditingId("");
    setDraft(emptyDraft());
    setTests([{ input: "", output: "", hidden: false }]);
    setAudienceMode("all");
    setSelectedStudentIds([]);
    setShowEditor(true);
  };

  const beginEdit = (assignment: Assignment) => {
    const assignedIds = Array.isArray(assignment.assigned_user_ids) ? assignment.assigned_user_ids : [];
    setEditingId(assignment.id);
    setDraft({ title: assignment.title, subjectId: assignment.subject_id, dueDate: assignment.due_date, maxMarks: String(assignment.max_marks ?? 10), description: assignment.description ?? "", starterCode: assignment.starter_code ?? "" });
    setTests(testCases(assignment.test_cases).length ? testCases(assignment.test_cases) : [{ input: "", output: "", hidden: false }]);
    setAudienceMode(assignedIds.length ? "specific" : "all");
    setSelectedStudentIds(assignedIds);
    setShowEditor(true);
  };

  const applyTemplate = (id: string) => {
    const question = allQuestions.find((item) => item.id === id);
    if (!question) return;
    setDraft((current) => ({ ...current, title: question.title, description: question.body, maxMarks: String(question.score ?? 10), starterCode: String(question.metadata.starter_code ?? "") }));
    const linkedTests = testCases(question.metadata.test_cases);
    if (linkedTests.length) setTests(linkedTests);
  };

  const saveAssignment = async (event: React.FormEvent) => {
    event.preventDefault();
    const assignedUserIds = audienceMode === "specific" ? selectedStudentIds : [];
    const assignedCount = audienceMode === "specific" ? selectedStudentIds.length : students.length;
    const payload: Record<string, unknown> = { title: draft.title, subjectId: draft.subjectId, dueDate: draft.dueDate, maxMarks: Number(draft.maxMarks), description: draft.description, starterCode: draft.starterCode, testCases: tests.filter((test) => test.input || test.output), assignedUserIds, assigned: assignedCount };
    if (editingId) {
      const assignment = assignments.find((item) => item.id === editingId);
      await onUpdateAssignment({ id: editingId, ...payload, pending: Math.max(0, assignedCount - (assignment?.submitted ?? 0)) });
    } else {
      await onCreateAssignment({ ...payload, submitted: 0, pending: assignedCount, reviewed: 0 });
    }
    setShowEditor(false);
  };

  const saveWork = async (status: "draft" | "submitted") => {
    if (!selected || !submissionText.trim()) return;
    setWorking(status);
    try {
      await onLearningAction({ kind: "submission", id: `learn-submission-${selected.id}-${currentUserId}`, assignmentId: selected.id, subjectId: selected.subject_id, title: `${selected.title} submission`, body: submissionText, status, metadata: { time_spent_seconds: metadataNumber(ownSubmission, "time_spent_seconds") || 60 } });
    } finally {
      setWorking("");
    }
  };

  const runAction = async (id: string, action: "scan" | "grade") => {
    setWorking(`${action}-${id}`);
    try { await onLearningAction({ id, action }); } finally { setWorking(""); }
  };

  const openEvaluation = (submission: LearningRecord, aiChats: number) => {
    const existing = submission.metadata.rubric_scores as Partial<typeof rubric> | undefined;
    setRubric({ correctness: Number(existing?.correctness ?? 3), structure: Number(existing?.structure ?? 3), quality: Number(existing?.quality ?? 3), engagement: Number(existing?.engagement ?? Math.min(5, aiChats)) });
    setFeedback(String(submission.metadata.faculty_feedback ?? submission.metadata.auto_grade_summary ?? ""));
    setEvaluating(submission);
  };

  const awardedScore = selected ? Math.round((((rubric.correctness + rubric.structure + rubric.quality + rubric.engagement) / 20) * Number(selected.max_marks ?? 10)) * 10) / 10 : 0;

  const saveEvaluation = async () => {
    if (!evaluating) return;
    await onLearningAction({ id: evaluating.id, action: "review", score: awardedScore, rubric, feedback });
    setEvaluating(null);
  };

  return <>
    <section className="reference-workspace">
      <aside className="reference-assignment-rail">
        <div className="rail-header"><div><p className="eyebrow">Course work</p><h2>{canManage ? "Assignments" : "My Assignments"}</h2></div>{canManage&&<button className="button compact" type="button" onClick={openNew}><Plus size={15}/>New</button>}</div>
        <label className="rail-search-input"><Search size={17}/><input type="search" value={query} placeholder="Search assignments..." onChange={(event)=>setQuery(event.target.value)}/></label>
        <div className="reference-assignment-list">{filteredAssignments.map((assignment)=>{const progress=assignment.assigned?Math.round((assignment.submitted/assignment.assigned)*100):0;return <div className={`reference-assignment-card ${selected?.id===assignment.id?"selected":""}`} key={assignment.id}><button className="assignment-card-select" type="button" onClick={()=>setSelectedId(assignment.id)}><div className="assignment-title-row"><h3>{assignment.title}</h3><ChevronRight size={16}/></div><div className="assignment-meta"><span>{assignment.max_marks??10} marks</span><span>Due {assignment.due_date}</span></div><div className="reference-mini-stats"><span><strong>{assignment.assigned}</strong>Assigned</span><span className="blue"><strong>{assignment.submitted}</strong>Submitted</span><span className="amber"><strong>{assignment.pending}</strong>Pending</span><span className="green"><strong>{assignment.reviewed}</strong>Graded</span></div><div className="progress strong"><span style={{width:`${progress}%`}}/></div></button>{canManage&&<div className="assignment-card-actions"><button type="button" title="Edit assignment" onClick={()=>beginEdit(assignment)}><Pencil size={14}/></button><button type="button" title="Delete assignment" onClick={()=>void onDeleteAssignment(assignment.id)}><Trash2 size={14}/></button></div>}</div>;})}{filteredAssignments.length===0&&<div className="rail-empty">No matching assignments.</div>}</div>
      </aside>

      <article className="reference-submission-panel">{!selected?<div className="empty-state large"><h2>No assignments yet</h2><p>Create an assignment to begin.</p></div>:<>
        <header className="submission-toolbar"><div><p className="eyebrow">Viewing assignment</p><select value={selected.id} onChange={(event)=>setSelectedId(event.target.value)}>{assignments.map((assignment)=><option value={assignment.id} key={assignment.id}>{assignment.title} - {assignment.submitted}/{assignment.assigned} submitted</option>)}</select><p>{selected.subjects?.name} · Due {selected.due_date} · {selected.max_marks??10} marks · {questions.length} rubric question{questions.length===1?"":"s"}</p></div>{canManage?<div className="toolbar-actions"><button className="button secondary" type="button" onClick={()=>window.print()}><Printer size={16}/>Print Marks</button><button className="button secondary" type="button" disabled={!submissions.some((item)=>item.status==="draft")} onClick={()=>void onLearningAction({action:"submit_started",assignmentId:selected.id})}><FileText size={16}/>Submit Started</button><button className="button secondary" type="button" disabled={submissions.length===0} onClick={()=>void Promise.all(submissions.map((submission)=>runAction(submission.id,"scan")))}><ScanSearch size={16}/>Scan Plagiarism</button><button className="button" type="button" disabled={!submissions.some((submission)=>submission.status==="submitted")} onClick={()=>void Promise.all(submissions.filter((submission)=>submission.status==="submitted").map((submission)=>runAction(submission.id,"grade")))}><Sparkles size={16}/>Auto-grade</button></div>:<button className="button ai-cta" type="button" onClick={onOpenAi}><Bot size={17}/>Ask AI for help</button>}</header>
        <div className="assignment-brief"><strong>Instructions</strong><p>{selected.description||"Complete the linked questions and submit your working."}</p>{selected.starter_code&&<details><summary>Starter content</summary><pre>{selected.starter_code}</pre></details>}</div>
        <div className="reference-summary"><div><span>Assigned</span><strong>{selected.assigned}</strong></div><div><span>Submitted</span><strong className="blue-text">{selected.submitted}</strong></div><div><span>Not started</span><strong>{Math.max(0,selected.assigned-selected.submitted)}</strong></div><div><span>Graded</span><strong className="green-text">{selected.reviewed}</strong></div></div>
        {canManage?<><div className="submission-filter-row"><div className="submission-filters">{[["all","All"],["needs_evaluation","Needs Evaluation"],["graded","Graded"],["draft","Working"],["not_started","Not Started"]].map(([id,label])=><button className={statusFilter===id?"active":""} type="button" key={id} onClick={()=>setStatusFilter(id)}>{label}</button>)}</div><label>Batch<select value={batchFilter} onChange={(event)=>setBatchFilter(event.target.value)}><option value="all">All batches</option>{batches.map((batch)=><option key={batch}>{batch}</option>)}</select></label></div><div className="dense-table-wrap submission-roster"><table className="dense-table"><thead><tr><th>Student Details</th><th>Roll / Batch</th><th>Status</th><th>AI Usage Quality</th><th>Time Spent</th><th>Similarity</th><th>Evaluation</th><th>Actions</th></tr></thead><tbody>{rosterRows.map(({student,submission,aiChats,participation,dependency,quality,status})=><tr key={student.id}><td><strong>{student.name}</strong><span>{student.email||"-"}</span></td><td><strong>{student.roll_number||"-"}</strong><span>{student.batch||"-"}</span></td><td><span className={`status-pill ${status==="graded"?"success":status==="not_started"?"warning":""}`}>{status.replaceAll("_"," ")}</span></td><td><strong>{quality}</strong><span>Dep {dependency}% · Part {participation}% · Hints {aiChats}</span></td><td>{formatTime(metadataNumber(submission,"time_spent_seconds"))}</td><td><span className={`similarity-score ${metadataNumber(submission,"similarity_score")>=60?"high":""}`}>{submission?`${metadataNumber(submission,"similarity_score")}%`:"-"}</span></td><td>{submission?.score==null?<span className="muted-text">Not graded</span>:<><strong className="mark-score">{submission.score}</strong><span>/ {selected.max_marks??10}</span></>}</td><td>{submission?<div className="row-actions"><button title="Run similarity scan" type="button" onClick={()=>void runAction(submission.id,"scan")} disabled={working===`scan-${submission.id}`}><ScanSearch size={15}/></button><button type="button" onClick={()=>openEvaluation(submission,aiChats)}>Evaluate<ChevronRight size={14}/></button></div>:<span className="muted-text">Awaiting work</span>}</td></tr>)}{rosterRows.length===0&&<tr><td colSpan={8}>No students match this status or batch.</td></tr>}</tbody></table></div></>:<section className="student-submission-workspace"><div className="assignment-question-list"><h2>Assignment Questions</h2>{questions.map((question,index)=><div className="question-preview" key={question.id}><span>{index+1}</span><div><strong>{question.title}</strong><p>{question.body}</p><small>{question.score??0} marks · {String(question.metadata.difficulty||"Medium")}</small></div></div>)}{assignmentTests.filter((test)=>!test.hidden).map((test,index)=><div className="test-preview" key={`${test.input}-${index}`}><strong>Visible test {index+1}</strong><code>{test.input||"No input"}</code><span>Expected: {test.output}</span></div>)}{questions.length===0&&assignmentTests.length===0&&<p>No question prompt has been added yet.</p>}</div><form className="student-answer-form" onSubmit={(event)=>{event.preventDefault();void saveWork("submitted");}}><div><h2>Your Submission</h2><span className={`status-pill ${ownSubmission?.status==="graded"?"success":""}`}>{ownSubmission?.status?.replaceAll("_"," ")||"Not started"}</span></div><textarea required value={submissionText} onChange={(event)=>setSubmissionText(event.target.value)} placeholder="Write your answer, query, or working notes here..."/><div className="student-submit-footer"><p>{ownSubmission?.score==null?"Faculty feedback and marks will appear after evaluation.":`Current mark: ${ownSubmission.score} / ${selected.max_marks??10}`}</p><div className="actions"><button className="button secondary" type="button" disabled={working==="draft"} onClick={()=>void saveWork("draft")}>Save draft</button><button className="button" type="submit" disabled={working==="submitted"}>{working==="submitted"?"Saving...":"Submit work"}</button></div></div></form></section>}
      </>}</article>
    </section>

    {showEditor&&<div className="modal open" role="dialog" aria-modal="true" aria-labelledby="assignmentEditorTitle" onMouseDown={()=>setShowEditor(false)}><div className="modal-panel assignment-editor-panel" onMouseDown={(event)=>event.stopPropagation()}><div className="modal-header"><div><p className="eyebrow">Faculty assignment</p><h2 id="assignmentEditorTitle">{editingId?"Edit Assignment":"Create Assignment"}</h2></div><button className="icon-button" type="button" aria-label="Close assignment editor" onClick={()=>setShowEditor(false)}><X size={18}/></button></div><form className="assignment-editor-form" onSubmit={saveAssignment}><label>Question bank template<select defaultValue="" onChange={(event)=>applyTemplate(event.target.value)}><option value="">Start blank or choose a question</option>{allQuestions.map((question)=><option value={question.id} key={question.id}>{String(question.metadata.category||"DBMS")} · {question.title}</option>)}</select></label><div className="form-split"><label>Assignment title<input required value={draft.title} onChange={(event)=>setDraft((value)=>({...value,title:event.target.value}))}/></label><label>Maximum marks<input required min="1" type="number" value={draft.maxMarks} onChange={(event)=>setDraft((value)=>({...value,maxMarks:event.target.value}))}/></label></div><label>Description and guidelines<textarea required value={draft.description} onChange={(event)=>setDraft((value)=>({...value,description:event.target.value}))}/></label><div className="form-split"><label>Student group<select required value={draft.subjectId} onChange={(event)=>setDraft((value)=>({...value,subjectId:event.target.value}))}>{subjects.map((subject)=><option value={subject.id} key={subject.id}>{subject.name}</option>)}</select></label><label>Submission deadline<input required type="date" value={draft.dueDate} onChange={(event)=>setDraft((value)=>({...value,dueDate:event.target.value}))}/></label></div><label>Starter code or answer skeleton<textarea className="code-input" value={draft.starterCode} onChange={(event)=>setDraft((value)=>({...value,starterCode:event.target.value}))}/></label><div className="test-case-header"><strong>Output test cases</strong><button className="button secondary compact" type="button" onClick={()=>setTests((current)=>[...current,{input:"",output:"",hidden:false}])}><Plus size={14}/>Add test case</button></div><div className="test-case-list">{tests.map((test,index)=><div className="test-case-row" key={index}><span>Test {index+1}</span><input placeholder="Input" value={test.input} onChange={(event)=>setTests((current)=>current.map((item,itemIndex)=>itemIndex===index?{...item,input:event.target.value}:item))}/><input placeholder="Expected output" value={test.output} onChange={(event)=>setTests((current)=>current.map((item,itemIndex)=>itemIndex===index?{...item,output:event.target.value}:item))}/><label className="check-label"><input type="checkbox" checked={test.hidden} onChange={(event)=>setTests((current)=>current.map((item,itemIndex)=>itemIndex===index?{...item,hidden:event.target.checked}:item))}/>Hidden</label><button className="icon-button" type="button" title="Remove test" disabled={tests.length===1} onClick={()=>setTests((current)=>current.filter((_,itemIndex)=>itemIndex!==index))}><Trash2 size={14}/></button></div>)}</div><label>Assign to<select value={audienceMode} onChange={(event)=>setAudienceMode(event.target.value as "all"|"specific")}><option value="all">All students ({students.length})</option><option value="specific">Specific students</option></select></label>{audienceMode==="specific"&&<div className="student-picker"><p>Selected {selectedStudentIds.length} of {students.length}. Students are ordered by batch and roll number.</p>{students.toSorted((a,b)=>`${a.batch} ${a.roll_number}`.localeCompare(`${b.batch} ${b.roll_number}`)).map((student)=><label key={student.id}><input type="checkbox" checked={selectedStudentIds.includes(student.id)} onChange={(event)=>setSelectedStudentIds((current)=>event.target.checked?[...current,student.id]:current.filter((id)=>id!==student.id))}/><span><strong>{student.roll_number||"-"}</strong>{student.name} · {student.batch||"No batch"}</span></label>)}</div>}<div className="actions"><button className="button" type="submit" disabled={audienceMode==="specific"&&selectedStudentIds.length===0}>{editingId?"Save Assignment Changes":"Publish Assignment"}</button></div></form></div></div>}

    {evaluating&&<div className="modal open" role="dialog" aria-modal="true" aria-labelledby="evaluationTitle" onMouseDown={()=>setEvaluating(null)}><div className="modal-panel evaluation-panel" onMouseDown={(event)=>event.stopPropagation()}><div className="modal-header"><div><p className="eyebrow">Faculty review</p><h2 id="evaluationTitle">Grading Evaluation Rubric</h2></div><button className="icon-button" type="button" aria-label="Close evaluation" onClick={()=>setEvaluating(null)}><X size={18}/></button></div><p>Rubric total: 20 points. Review correctness, structure, quality, and constructive learning-assistant use.</p><div className="rubric-list">{([['correctness','Correctness and completeness'],['structure','DBMS structure and logic'],['quality','Reasoning quality and edge cases'],['engagement','Learning process and support use']] as const).map(([key,label])=><label key={key}><span>{label}<strong>{rubric[key]} / 5</strong></span><input type="range" min="0" max="5" step="1" value={rubric[key]} onChange={(event)=>setRubric((current)=>({...current,[key]:Number(event.target.value)}))}/></label>)}</div><div className="final-award"><span>Final awarded marks</span><strong>{awardedScore} / {selected?.max_marks??10}</strong></div><label>Faculty comments and feedback<textarea value={feedback} onChange={(event)=>setFeedback(event.target.value)} placeholder="Provide specific guidance, corrections, and next steps..."/></label><button className="button" type="button" onClick={()=>void saveEvaluation()}>Save Evaluation</button></div></div>}
  </>;
}
