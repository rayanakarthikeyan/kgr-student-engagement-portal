import type { ActivityLog, ActivityTemplate, AssignmentRecord, AssignmentSubject, AuthSession, Enrollment, LearningRecord, LearningResource, SessionUser } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const SESSION_KEY = "academia-session-v2";

function mapUser(user: Record<string, unknown>): SessionUser {
  return {
    id: String(user.id),
    name: String(user.name),
    email: String(user.email),
    role: user.role as SessionUser["role"],
    title: user.title ? String(user.title) : undefined,
    rollNumber: user.roll_number ? String(user.roll_number) : undefined,
    batch: user.batch ? String(user.batch) : undefined,
    contactNumber: user.contact_number ? String(user.contact_number) : undefined,
    department: user.department ? String(user.department) : undefined,
    year: user.year ? String(user.year) : undefined,
    section: user.section ? String(user.section) : undefined,
    college: user.college ? String(user.college) : undefined,
  };
}

async function parseResponse(response: Response) {
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) throw new Error(String(data.error || "Request failed"));
  return data;
}

function authHeaders(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function mapResource(row: Record<string, unknown>): LearningResource {
  return {
    id: String(row.id),
    courseId: String(row.course_id),
    title: String(row.title),
    topic: String(row.topic || ""),
    type: row.type as LearningResource["type"],
    externalUrl: String(row.external_url),
    durationMinutes: Number(row.duration_minutes || 0),
    completion: 0,
    activeLearners: 0,
    publishedAt: String(row.created_at || ""),
    curriculumItemId: String(row.curriculum_item_id || ""),
    courseCode: (row.course_code || (row.course_id === "course-dbms" ? "DBMS" : "JAVA")) as LearningResource["courseCode"],
    unitNumber: Number(row.unit_number || 1),
    dueDate: String(row.due_date || ""),
    assignedUserIds: Array.isArray(row.assigned_user_ids) ? row.assigned_user_ids.map(String) : [],
  };
}

export function restoreSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession | null) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

export async function login(email: string, password: string): Promise<AuthSession> {
  const data = await parseResponse(
    await fetch(`${API_BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }),
  );
  return { token: String(data.token || ""), user: mapUser(data.user as Record<string, unknown>) };
}

export async function validateSession(token: string): Promise<AuthSession> {
  const data = await parseResponse(await fetch(`${API_BASE}/api/login`, {
    headers: authHeaders(token),
  }));
  return { token, user: mapUser(data.user as Record<string, unknown>) };
}

export async function aiChat(token: string, payload: { challengeId: string; code: string; statement: string; history: { role: "user" | "model"; content: string }[]; message: string }): Promise<string> {
  const data = await parseResponse(
    await fetch(`${API_BASE}/api/ai-chat`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  );
  return String(data.response || "");
}

export async function loadAiChatLogs(token: string, userId: string): Promise<any[]> {
  const data = await parseResponse(
    await fetch(`${API_BASE}/api/ai-chat-logs?userId=${userId}`, { headers: authHeaders(token) })
  );
  return Array.isArray(data.logs) ? data.logs : [];
}

export async function registerStudent(input: {
  name: string;
  email: string;
  rollNumber: string;
  password: string;
  contactNumber: string;
  department: string;
  year: string;
  section: string;
}): Promise<AuthSession> {
  const data = await parseResponse(
    await fetch(`${API_BASE}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
  return { token: String(data.token || ""), user: mapUser(data.user as Record<string, unknown>) };
}

export async function logActivity(token: string, activity: ActivityLog) {
  if (!token) return;
  try {
    await fetch(`${API_BASE}/api/platform?entity=activity`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(activity),
      keepalive: true,
    });
  } catch {
    // Telemetry must never interrupt a learner's primary task.
  }
}

async function platformMutation(token: string, entity: string, body: Record<string, unknown>) {
  return parseResponse(await fetch(`${API_BASE}/api/platform?entity=${entity}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  }));
}

export async function enrollInCourse(token: string, courseId: string) {
  return platformMutation(token, "enrollment", { courseId, tracks: ["theory", "lab"] });
}

export async function publishResource(token: string, resource: Pick<LearningResource, "courseId" | "title" | "topic" | "type" | "externalUrl" | "durationMinutes" | "curriculumItemId" | "courseCode" | "unitNumber" | "dueDate" | "assignedUserIds">) {
  const data = await platformMutation(token, "resource", resource);
  return mapResource(data.resource as Record<string, unknown>);
}

export async function deleteResource(token: string, id: string) {
  await parseResponse(await fetch(`${API_BASE}/api/platform?entity=resource&id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(token),
  }));
}

export async function loadResourceActivity(token: string) {
  const data = await parseResponse(await fetch(`${API_BASE}/api/platform?entity=activity&summary=1`, { headers: authHeaders(token) }));
  return (data.activity_logs || []) as Array<{
    id: string;
    user_id: string;
    resource_id?: string | null;
    assignment_id?: string | null;
    kind: string;
    duration_seconds: number;
    event_count?: number;
    metadata: Record<string, unknown>;
    occurred_at: string;
  }>;
}

export async function createAssessment(token: string, assessment: { courseId: string; title: string; durationMinutes: number; totalMarks: number; settings: Record<string, unknown> }) {
  return platformMutation(token, "assessment", { ...assessment, status: "draft", questions: [] });
}

export async function submitAssessment(token: string, submission: { assessmentId: string; answers: Record<string, number>; score: number; violationCount: number; automatic: boolean }) {
  return platformMutation(token, "submission", { ...submission, status: submission.automatic ? "auto_submitted" : "submitted" });
}

export async function runCode(token: string, input: { language: "java" | "sql"; code: string; stdin: string }) {
  const data = await parseResponse(
    await fetch(`${API_BASE}/api/code-runner`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    }),
  );
  return data as { status: "passed" | "failed" | "error"; stdout: string; stderr: string; durationMs: number };
}

export async function loadCoursework(token: string, includeRoster: boolean) {
  const requests = [
    fetch(`${API_BASE}/api/assignments`, { headers: authHeaders(token) }),
    fetch(`${API_BASE}/api/subjects`, { headers: authHeaders(token) }),
    includeRoster ? fetch(`${API_BASE}/api/users?role=student`, { headers: authHeaders(token) }) : Promise.resolve(null),
    fetch(`${API_BASE}/api/learning?kind=submission${includeRoster ? "&summary=1" : ""}`, { headers: authHeaders(token) }),
  ] as const;
  const [assignmentResponse, subjectResponse, rosterResponse, learningResponse] = await Promise.all(requests);
  const [assignmentData, subjectData, rosterData, learningData] = await Promise.all([
    parseResponse(assignmentResponse),
    parseResponse(subjectResponse),
    rosterResponse ? parseResponse(rosterResponse) : Promise.resolve({ users: [] }),
    parseResponse(learningResponse),
  ]);
  return {
    assignments: (assignmentData.assignments || []) as AssignmentRecord[],
    subjects: (subjectData.subjects || []) as AssignmentSubject[],
    students: ((rosterData.users || []) as Array<Record<string, unknown>>).map(mapUser),
    submissions: (learningData.records || []) as LearningRecord[],
  };
}

export async function loadActivityTemplates(token: string): Promise<Record<string, ActivityTemplate>> {
  const data = await parseResponse(await fetch(`${API_BASE}/api/assignments?templates=1`, { headers: authHeaders(token) }));
  return data.templates as Record<string, ActivityTemplate>;
}

export async function loadStudentWork(token: string, userId: string): Promise<LearningRecord[]> {
  const data = await parseResponse(await fetch(`${API_BASE}/api/learning?kind=submission&authorId=${encodeURIComponent(userId)}`, { headers: authHeaders(token) }));
  return data.records as LearningRecord[];
}

export async function loadStudentOverview(token: string) {
  const [enrollmentResponse, resourceResponse] = await Promise.all([
    fetch(`${API_BASE}/api/platform?entity=enrollment`, { headers: authHeaders(token) }),
    fetch(`${API_BASE}/api/platform?entity=resource`, { headers: authHeaders(token) }),
  ]);
  const [enrollmentData, resourceData] = await Promise.all([parseResponse(enrollmentResponse), parseResponse(resourceResponse)]);
  return {
    enrollments: ((enrollmentData.enrollments || []) as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      courseId: String(row.course_id),
      userId: String(row.user_id),
      tracks: Array.isArray(row.tracks) ? row.tracks : ["theory", "lab"],
      progress: Number(row.progress || 0),
      studyMinutes: Number(row.study_minutes || 0),
      status: row.status,
    })) as Enrollment[],
    resources: ((resourceData.resources || []) as Array<Record<string, unknown>>).map(mapResource),
  };
}

export async function createCourseworkAssignment(token: string, assignment: Record<string, unknown>) {
  const data = await parseResponse(await fetch(`${API_BASE}/api/assignments`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(assignment),
  }));
  return data.assignment as AssignmentRecord;
}

export async function deleteCourseworkAssignment(token: string, id: string) {
  await parseResponse(await fetch(`${API_BASE}/api/assignments?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(token),
    body: JSON.stringify({ id }),
  }));
}

export async function updateCourseworkAssignment(token: string, id: string, assignment: Record<string, unknown>) {
  const data = await parseResponse(await fetch(`${API_BASE}/api/assignments`, {
    method: "PATCH", headers: authHeaders(token), body: JSON.stringify({ ...assignment, id }),
  }));
  return data.assignment as AssignmentRecord;
}

export async function saveCourseworkSubmission(token: string, input: {
  assignment: AssignmentRecord;
  body: string;
  status: "draft" | "submitted";
  metadata?: Record<string, unknown>;
  score?: number;
}) {
  const data = await parseResponse(await fetch(`${API_BASE}/api/learning`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      kind: "submission",
      assignmentId: input.assignment.id,
      subjectId: input.assignment.subject_id,
      title: `${input.assignment.title} submission`,
      body: input.body,
      status: input.status,
      score: input.score,
      metadata: input.metadata || {},
    }),
  }));
  return data.record as LearningRecord;
}

export async function bulkAutoGrade(token: string) {
  const data = await parseResponse(await fetch(`${API_BASE}/api/auto-grade-bulk`, {
    method: "POST",
    headers: authHeaders(token),
  }));
  return data as { gradedCount: number; message: string };
}
