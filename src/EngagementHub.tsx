import { useMemo, useState } from "react";
import {
  Award,
  Bell,
  CheckCircle2,
  Clock3,
  HeartHandshake,
  Megaphone,
  MessageCircle,
  NotebookPen,
  Send,
} from "lucide-react";
import type { RoleId } from "./data";

export type EngagementKind =
  | "help_request"
  | "check_in"
  | "feedback"
  | "reminder"
  | "announcement"
  | "announcement_ack"
  | "pulse"
  | "pulse_response"
  | "journal"
  | "recognition"
  | "time_session";

export interface EngagementRecord {
  id: string;
  kind: EngagementKind;
  author_id: string;
  target_user_id?: string | null;
  subject_id?: string | null;
  assignment_id?: string | null;
  title: string;
  body: string;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

export interface PortalPerson {
  id: string;
  name: string;
  role: RoleId;
  email?: string;
  roll_number?: string;
  batch?: string;
}

type CreateRecord = (body: Record<string, unknown>, options?: { quiet?: boolean }) => Promise<void>;
type UpdateRecord = (id: string, body: Record<string, unknown>) => Promise<void>;

interface EngagementHubProps {
  role: RoleId;
  currentUser: PortalPerson;
  records: EngagementRecord[];
  people: PortalPerson[];
  onCreate: CreateRecord;
  onUpdate: UpdateRecord;
}

function personName(id: string | null | undefined, people: PortalPerson[]) {
  return people.find((person) => person.id === id)?.name ?? "Portal user";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function metadataText(record: EngagementRecord, key: string) {
  const value = record.metadata?.[key];
  return typeof value === "string" ? value : "";
}

function Empty({ title, body }: { title: string; body: string }) {
  return <div className="empty-state"><h3>{title}</h3><p>{body}</p></div>;
}

function RecordRow({ record, people, action }: { record: EngagementRecord; people: PortalPerson[]; action?: React.ReactNode }) {
  return (
    <div className="engagement-row">
      <div>
        <div className="engagement-row-title">
          <h3>{record.title}</h3>
          <span className="badge">{record.status.replace(/_/g, " ")}</span>
        </div>
        {record.body && <p>{record.body}</p>}
        <span className="record-meta">{record.metadata?.anonymous === true ? "Anonymous student" : personName(record.author_id, people)} · {formatDate(record.created_at)}</span>
      </div>
      {action && <div className="actions">{action}</div>}
    </div>
  );
}

function FacultyEngagement({ records, people, onCreate, onUpdate }: Omit<EngagementHubProps, "role">) {
  const [section, setSection] = useState("inbox");
  const students = people.filter((person) => person.role === "student");
  const [announcement, setAnnouncement] = useState({ title: "", body: "", important: false });
  const [pulse, setPulse] = useState({ question: "", options: "Understood, Need another example, Need help" });
  const [coaching, setCoaching] = useState({ targetUserId: students[0]?.id ?? "", kind: "feedback" as "feedback" | "reminder" | "recognition", title: "", body: "", voiceUrl: "" });

  const help = records.filter((record) => record.kind === "help_request" || record.kind === "check_in");
  const openHelp = help.filter((record) => !["resolved", "understood"].includes(record.status));
  const announcements = records.filter((record) => record.kind === "announcement");
  const pulses = records.filter((record) => record.kind === "pulse");
  const coachingRecords = records.filter((record) => ["feedback", "reminder", "recognition"].includes(record.kind));
  const timeRecords = records.filter((record) => record.kind === "time_session");
  const activeStudentIds = new Set(timeRecords.filter((record) => Number(record.metadata.active_seconds || 0) > 0).map((record) => record.author_id));

  const submitAnnouncement = async (event: React.FormEvent) => {
    event.preventDefault();
    await onCreate({ kind: "announcement", title: announcement.title, body: announcement.body, metadata: { important: announcement.important } });
    setAnnouncement({ title: "", body: "", important: false });
  };

  const submitPulse = async (event: React.FormEvent) => {
    event.preventDefault();
    const options = pulse.options.split(",").map((option) => option.trim()).filter(Boolean);
    await onCreate({ kind: "pulse", title: pulse.question, body: "Choose the response that best matches your understanding.", metadata: { options } });
    setPulse({ question: "", options: "Understood, Need another example, Need help" });
  };

  const submitCoaching = async (event: React.FormEvent) => {
    event.preventDefault();
    await onCreate({ kind: coaching.kind, targetUserId: coaching.targetUserId, title: coaching.title, body: coaching.body, metadata: { voice_url: coaching.voiceUrl } });
    setCoaching((value) => ({ ...value, title: "", body: "", voiceUrl: "" }));
  };

  return (
    <section className="engagement-shell">
      <div className="engagement-summary" aria-label="Weekly engagement summary">
        <article><HeartHandshake size={20} /><strong>{activeStudentIds.size}</strong><span>Active this week</span></article>
        <article><Bell size={20} /><strong>{Math.max(0, students.length - activeStudentIds.size)}</strong><span>Need follow-up</span></article>
        <article><MessageCircle size={20} /><strong>{openHelp.length}</strong><span>Open help requests</span></article>
        <article><CheckCircle2 size={20} /><strong>{coachingRecords.length}</strong><span>Coaching messages</span></article>
      </div>

      <nav className="engagement-tabs" aria-label="Faculty engagement tools">
        {[["inbox", "Inbox"], ["broadcasts", "Announcements & Polls"], ["coaching", "Feedback & Recognition"]].map(([id, label]) => (
          <button type="button" className={section === id ? "active" : ""} key={id} onClick={() => setSection(id)}>{label}</button>
        ))}
      </nav>

      {section === "inbox" && (
        <section className="content-grid">
          <article className="panel">
            <div className="panel-header"><div><h2>Student Check-ins and Help</h2><p>Private signals that need a faculty response.</p></div></div>
            <div className="list-stack">
              {help.length === 0 && <Empty title="No requests" body="Student check-ins and private help requests will appear here." />}
              {help.map((record) => <RecordRow key={record.id} record={record} people={people} action={record.status !== "resolved" && <button className="button secondary compact" type="button" onClick={() => void onUpdate(record.id, { status: "resolved" })}>Resolve</button>} />)}
            </div>
          </article>
          <aside className="panel">
            <h2>Weekly Follow-up</h2>
            <p>{students.length} student{students.length === 1 ? "" : "s"} · {activeStudentIds.size} active · {openHelp.length} waiting for help.</p>
            <div className="list-stack compact-list">
              {students.filter((student) => !activeStudentIds.has(student.id)).map((student) => <div className="list-row" key={student.id}><strong>{student.name}</strong><div className="actions"><span className="badge risk">Low activity</span><button className="button secondary compact" type="button" onClick={() => void onCreate({ kind: "reminder", targetUserId: student.id, title: "Learning activity reminder", body: "Please return to your pending learning work or send a private help request if you are blocked." })}>Remind</button></div></div>)}
            </div>
          </aside>
        </section>
      )}

      {section === "broadcasts" && (
        <section className="content-grid">
          <article className="panel">
            <div className="panel-header"><div><Megaphone size={20} /><h2>Post Announcement</h2><p>Share updates and request acknowledgement.</p></div></div>
            <form className="form-grid" onSubmit={submitAnnouncement}>
              <label>Title<input required value={announcement.title} onChange={(event) => setAnnouncement((value) => ({ ...value, title: event.target.value }))} /></label>
              <label className="full-width">Message<textarea required value={announcement.body} onChange={(event) => setAnnouncement((value) => ({ ...value, body: event.target.value }))} /></label>
              <label className="check-row full-width"><input type="checkbox" checked={announcement.important} onChange={(event) => setAnnouncement((value) => ({ ...value, important: event.target.checked }))} />Mark as important</label>
              <button className="button" type="submit"><Send size={16} />Publish</button>
            </form>
            <div className="list-stack spaced-list">
              {announcements.map((record) => {
                const acknowledgements = records.filter((item) => item.kind === "announcement_ack" && metadataText(item, "parent_id") === record.id).length;
                return <RecordRow key={record.id} record={record} people={people} action={<span className="badge">{acknowledgements} acknowledged</span>} />;
              })}
            </div>
          </article>
          <aside className="panel">
            <h2>Quick Pulse Check</h2>
            <form className="form-grid" onSubmit={submitPulse}>
              <label className="full-width">Question<input required value={pulse.question} onChange={(event) => setPulse((value) => ({ ...value, question: event.target.value }))} /></label>
              <label className="full-width">Options<input required value={pulse.options} onChange={(event) => setPulse((value) => ({ ...value, options: event.target.value }))} /></label>
              <button className="button" type="submit">Publish poll</button>
            </form>
            <div className="list-stack spaced-list">
              {pulses.map((record) => {
                const responses = records.filter((item) => item.kind === "pulse_response" && metadataText(item, "parent_id") === record.id);
                return <RecordRow key={record.id} record={record} people={people} action={<span className="badge">{responses.length} responses</span>} />;
              })}
            </div>
          </aside>
        </section>
      )}

      {section === "coaching" && (
        <section className="content-grid">
          <article className="panel">
            <div className="panel-header"><div><Award size={20} /><h2>Student Coaching</h2><p>Send feedback, reminders, or positive recognition.</p></div></div>
            <form className="form-grid" onSubmit={submitCoaching}>
              <label>Student<select required value={coaching.targetUserId} onChange={(event) => setCoaching((value) => ({ ...value, targetUserId: event.target.value }))}>{students.map((student) => <option value={student.id} key={student.id}>{student.name}</option>)}</select></label>
              <label>Type<select value={coaching.kind} onChange={(event) => setCoaching((value) => ({ ...value, kind: event.target.value as typeof coaching.kind }))}><option value="feedback">Feedback</option><option value="reminder">Reminder</option><option value="recognition">Recognition</option></select></label>
              <label className="full-width">Title<input required value={coaching.title} onChange={(event) => setCoaching((value) => ({ ...value, title: event.target.value }))} /></label>
              <label className="full-width">Message<textarea required value={coaching.body} onChange={(event) => setCoaching((value) => ({ ...value, body: event.target.value }))} /></label>
              <label className="full-width">Optional voice-note URL<input type="url" value={coaching.voiceUrl} onChange={(event) => setCoaching((value) => ({ ...value, voiceUrl: event.target.value }))} placeholder="https://..." /></label>
              <button className="button" type="submit"><Send size={16} />Send</button>
            </form>
          </article>
          <aside className="panel"><h2>Recent Coaching</h2><div className="list-stack">{coachingRecords.length === 0 && <Empty title="No messages" body="Feedback and recognition will appear here." />}{coachingRecords.map((record) => <RecordRow key={record.id} record={record} people={people} action={<span className="record-meta">To {personName(record.target_user_id, people)}</span>} />)}</div></aside>
        </section>
      )}

    </section>
  );
}

function StudentEngagement({ currentUser, records, people, onCreate, onUpdate }: Omit<EngagementHubProps, "role">) {
  const [section, setSection] = useState("support");
  const [help, setHelp] = useState({ title: "", body: "" });
  const [journal, setJournal] = useState({ title: "Today’s learning", body: "", share: true });

  const announcements = records.filter((record) => record.kind === "announcement");
  const pulses = records.filter((record) => record.kind === "pulse");
  const coaching = records.filter((record) => ["feedback", "reminder", "recognition"].includes(record.kind) && record.target_user_id === currentUser.id);
  const journals = records.filter((record) => record.kind === "journal" && record.author_id === currentUser.id);
  const requests = records.filter((record) => ["help_request", "check_in"].includes(record.kind) && record.author_id === currentUser.id);

  const linkedRecord = (kind: EngagementKind, parentId: string) => records.find((record) => record.kind === kind && record.author_id === currentUser.id && metadataText(record, "parent_id") === parentId);

  const checkIn = (mood: string) => onCreate({ kind: "check_in", title: `Check-in: ${mood}`, body: mood === "Understood" ? "I am comfortable continuing." : "I would like faculty follow-up.", status: mood === "Understood" ? "understood" : "open", metadata: { mood, private: true } });

  const submitHelp = async (event: React.FormEvent) => {
    event.preventDefault();
    await onCreate({ kind: "help_request", title: help.title, body: help.body, metadata: { private: true } });
    setHelp({ title: "", body: "" });
  };

  const submitJournal = async (event: React.FormEvent) => {
    event.preventDefault();
    await onCreate({ kind: "journal", title: journal.title, body: journal.body, status: "saved", metadata: { share_with_faculty: journal.share } });
    setJournal({ title: "Today’s learning", body: "", share: true });
  };

  return (
    <section className="engagement-shell">
      <div className="engagement-summary">
        <article><Megaphone size={20} /><strong>{announcements.filter((record) => !linkedRecord("announcement_ack", record.id)).length}</strong><span>Unread updates</span></article>
        <article><MessageCircle size={20} /><strong>{requests.filter((record) => record.status === "open").length}</strong><span>Open requests</span></article>
        <article><Award size={20} /><strong>{coaching.filter((record) => record.kind === "recognition").length}</strong><span>Recognitions</span></article>
        <article><NotebookPen size={20} /><strong>{journals.length}</strong><span>Journal entries</span></article>
      </div>

      <nav className="engagement-tabs" aria-label="Student engagement tools">
        {[["support", "Check-in & Help"], ["updates", "Updates & Polls"], ["feedback", "Feedback"], ["journal", "Learning Journal"]].map(([id, label]) => <button type="button" className={section === id ? "active" : ""} key={id} onClick={() => setSection(id)}>{label}</button>)}
      </nav>

      {section === "support" && <section className="content-grid"><article className="panel"><div className="panel-header"><div><HeartHandshake size={20} /><h2>How is your learning going?</h2><p>Your response is shared privately with faculty.</p></div></div><div className="checkin-grid">{["Understood", "Need help", "Stuck"].map((mood) => <button className="button secondary" type="button" key={mood} onClick={() => void checkIn(mood)}>{mood}</button>)}</div><form className="form-grid spaced-form" onSubmit={submitHelp}><label className="full-width">What do you need help with?<input required value={help.title} onChange={(event) => setHelp((value) => ({ ...value, title: event.target.value }))} /></label><label className="full-width">Details<textarea required value={help.body} onChange={(event) => setHelp((value) => ({ ...value, body: event.target.value }))} /></label><button className="button" type="submit"><Send size={16} />Send privately</button></form></article><aside className="panel"><h2>My Requests</h2><div className="list-stack">{requests.length === 0 && <Empty title="No requests" body="Your check-ins and help requests will appear here." />}{requests.map((record) => <RecordRow key={record.id} record={record} people={people} />)}</div></aside></section>}

      {section === "updates" && <section className="content-grid"><article className="panel"><div className="panel-header"><div><Megaphone size={20} /><h2>Announcements</h2><p>Updates from faculty.</p></div></div><div className="list-stack">{announcements.length === 0 && <Empty title="No announcements" body="Faculty updates will appear here." />}{announcements.map((record) => { const ack=linkedRecord("announcement_ack",record.id); return <RecordRow key={record.id} record={record} people={people} action={ack?<span className="badge">Acknowledged</span>:<button className="button secondary compact" type="button" onClick={() => void onCreate({ id:`ack-${record.id}-${currentUser.id}`,kind:"announcement_ack",title:`Acknowledged: ${record.title}`,status:"acknowledged",metadata:{parent_id:record.id} })}>Acknowledge</button>} />; })}</div></article><aside className="panel"><h2>Pulse Checks</h2><div className="list-stack">{pulses.length === 0 && <Empty title="No open polls" body="Quick faculty questions will appear here." />}{pulses.map((record) => { const response=linkedRecord("pulse_response",record.id); const options=Array.isArray(record.metadata.options)?record.metadata.options.filter((item):item is string=>typeof item==="string"):[]; return <div className="engagement-row" key={record.id}><div><h3>{record.title}</h3><p>{response?`Your response: ${response.title}`:record.body}</p>{!response&&<div className="choice-row">{options.map((option)=><button className="button secondary compact" type="button" key={option} onClick={() => void onCreate({id:`pulse-${record.id}-${currentUser.id}`,kind:"pulse_response",title:option,status:"submitted",metadata:{parent_id:record.id}})}>{option}</button>)}</div>}</div></div>; })}</div></aside></section>}

      {section === "feedback" && <section className="content-grid"><article className="panel"><div className="panel-header"><div><Award size={20} /><h2>Feedback and Recognition</h2><p>Acknowledge feedback or request clarification.</p></div></div><div className="list-stack">{coaching.length === 0 && <Empty title="No feedback yet" body="Faculty feedback, reminders, and recognition will appear here." />}{coaching.map((record) => <RecordRow key={record.id} record={record} people={people} action={record.kind === "feedback" && record.status === "open" ? <><button className="button secondary compact" type="button" onClick={() => void onUpdate(record.id,{status:"acknowledged"})}>Acknowledge</button><button className="button secondary compact" type="button" onClick={() => void onUpdate(record.id,{status:"clarification_requested"})}>Clarify</button></>:undefined} />)}</div></article><aside className="panel"><h2>Voice Feedback</h2>{coaching.filter((record)=>metadataText(record,"voice_url")).map((record)=><a className="button secondary" href={metadataText(record,"voice_url")} target="_blank" rel="noreferrer" key={record.id}>Open voice note</a>)}{!coaching.some((record)=>metadataText(record,"voice_url"))&&<Empty title="No voice notes" body="Voice feedback links from faculty will appear here." />}</aside></section>}

      {section === "journal" && <section className="content-grid"><article className="panel"><div className="panel-header"><div><NotebookPen size={20} /><h2>Learning Journal</h2><p>Record progress, difficulties, and your next step.</p></div></div><form className="form-grid" onSubmit={submitJournal}><label className="full-width">Entry title<input required value={journal.title} onChange={(event)=>setJournal((value)=>({...value,title:event.target.value}))}/></label><label className="full-width">Reflection<textarea required value={journal.body} onChange={(event)=>setJournal((value)=>({...value,body:event.target.value}))}/></label><label className="check-row full-width"><input type="checkbox" checked={journal.share} onChange={(event)=>setJournal((value)=>({...value,share:event.target.checked}))}/>Share with faculty</label><button className="button" type="submit">Save entry</button></form></article><aside className="panel"><h2>Recent Entries</h2><div className="list-stack">{journals.length===0&&<Empty title="No journal entries" body="Your reflections will appear here."/>}{journals.map((record)=><RecordRow key={record.id} record={record} people={people}/>)}</div></aside></section>}

    </section>
  );
}

export function EngagementHub(props: EngagementHubProps) {
  return props.role === "faculty" ? <FacultyEngagement {...props} /> : <StudentEngagement {...props} />;
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function TimeMonitor({ role, currentUser, records, people }: Pick<EngagementHubProps, "role" | "currentUser" | "records" | "people">) {
  const sessions = records.filter((record) => record.kind === "time_session");
  const students = people.filter((person) => person.role === "student");
  const totals = useMemo(() => new Map(students.map((student) => [student.id, sessions.filter((record) => record.author_id === student.id).reduce((sum, record) => sum + Number(record.metadata.active_seconds || 0), 0)])), [sessions, students]);
  const ownSeconds = sessions.filter((record) => record.author_id === currentUser.id).reduce((sum, record) => sum + Number(record.metadata.active_seconds || 0), 0);

  if (role === "student") {
    return <section className="content-grid"><article className="panel time-hero"><Clock3 size={28}/><p className="eyebrow">Active learning time</p><strong>{formatDuration(ownSeconds)}</strong><p>Only active, visible portal time is counted. Idle and background time is excluded.</p></article><aside className="panel"><h2>Privacy</h2><p>Faculty sees your total active learning time and last activity signal. The portal does not record screen contents, keystrokes, or activity outside this site.</p></aside></section>;
  }

  return <section className="content-grid"><article className="panel"><div className="panel-header"><div><Clock3 size={20}/><h2>Student Learning Time</h2><p>Active portal time with idle and background periods excluded.</p></div></div><div className="list-stack">{students.length===0&&<Empty title="No students" body="Student time will appear after accounts are created."/>}{students.map((student)=><div className="list-row" key={student.id}><div><h3>{student.name}</h3><p>{totals.get(student.id)?"Active learning recorded":"No recent activity"}</p></div><span className={`badge ${totals.get(student.id)?"":"risk"}`}>{formatDuration(totals.get(student.id)||0)}</span></div>)}</div></article><aside className="panel"><h2>Weekly Time Summary</h2><p>{students.filter((student)=>(totals.get(student.id)||0)>0).length} of {students.length} students have active time recorded.</p><p>Use low activity together with help requests and pending work before following up.</p></aside></section>;
}
