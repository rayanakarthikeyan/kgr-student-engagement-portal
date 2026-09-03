export type Role = "student" | "faculty" | "admin";
export type Track = "theory" | "lab";
export type CourseCode = "JAVA" | "DBMS";
export type CourseworkType = "theory" | "practice" | "assessment" | "lab";
export type WorkMode = "response" | "mcq" | "ide";
export type ResourceType = "youtube" | "pdf";
export type ActivityKind =
  | "video_play"
  | "video_pause"
  | "video_progress"
  | "video_complete"
  | "pdf_dwell"
  | "exam_started"
  | "exam_violation"
  | "exam_autosave"
  | "exam_submitted"
  | "editor_change"
  | "editor_paste"
  | "code_run"
  | "code_submit";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  title?: string;
  rollNumber?: string;
  batch?: string;
  contactNumber?: string;
  department?: string;
  section?: string;
  college?: string;
  year?: string;
}

export interface AuthSession {
  token: string;
  user: SessionUser;
}

export interface Unit {
  number: number;
  title: string;
}

export interface Experiment {
  number: number;
  title: string;
}

export interface Course {
  id: string;
  code: CourseCode;
  title: string;
  description: string;
  accent: "cyan" | "amber";
  faculty: string;
  enrolled: number;
  units: Unit[];
  experiments: Experiment[];
}

export interface Enrollment {
  id: string;
  courseId: string;
  userId: string;
  tracks: Track[];
  progress: number;
  studyMinutes: number;
  status: "active" | "completed";
}

export interface LearningResource {
  id: string;
  courseId: string;
  title: string;
  topic: string;
  type: ResourceType;
  externalUrl: string;
  durationMinutes: number;
  completion: number;
  activeLearners: number;
  publishedAt: string;
  curriculumItemId: string;
  courseCode: CourseCode;
  unitNumber: number;
  dueDate: string;
  assignedUserIds: string[];
}

export interface AssessmentQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  marks: number;
}

export interface Assessment {
  id: string;
  courseId: string;
  title: string;
  description: string;
  durationMinutes: number;
  startsAt: string;
  totalMarks: number;
  status: "scheduled" | "available" | "completed";
  questions: AssessmentQuestion[];
}

export interface LabChallenge {
  id: string;
  courseId: string;
  language: "java" | "sql";
  title: string;
  topic: string;
  statement: string;
  concept: string;
  constraints: string[];
  sampleInput: string;
  expectedOutput: string;
  starterCode: string;
  hint: string;
}

export interface ActivityLog {
  id?: string;
  userId: string;
  courseId?: string;
  resourceId?: string;
  assessmentId?: string;
  assignmentId?: string;
  submissionId?: string;
  kind: ActivityKind;
  durationSeconds?: number;
  metadata: Record<string, unknown>;
  occurredAt?: string;
}

export interface AttemptEvent {
  id: string;
  type: "change" | "paste" | "run" | "error" | "resolved" | "submit";
  label: string;
  detail: string;
  timestamp: string;
  severity: "neutral" | "warning" | "error" | "success";
}

export interface StudentInsight {
  id: string;
  name: string;
  rollNumber: string;
  course: CourseCode;
  studyMinutes: number;
  resourceProgress: number;
  labScore: number;
  violations: number;
  status: "On track" | "Needs attention" | "At risk";
}

export interface CurriculumItem {
  id: string;
  courseCode: CourseCode;
  track: Track;
  sequence: number;
  unit: number;
  label: string;
  title: string;
  brief: string;
  outcomes: string[];
  suggestedMarks: number;
  source: string;
  starterCode: string;
}

export interface AssignmentSubject {
  id: string;
  name: string;
  type: string;
  semester: string;
  section: string;
}

export interface AssignmentRecord {
  id: string;
  title: string;
  subject_id: string;
  due_date: string;
  max_marks: number;
  description: string;
  starter_code: string;
  test_cases: Array<{ input: string; output: string; hidden: boolean }>;
  assigned_user_ids: string[];
  assigned: number;
  submitted: number;
  pending: number;
  reviewed: number;
  assignment_type: CourseworkType;
  curriculum_item_id: string;
  course_code: CourseCode;
  unit_number: number;
  duration_minutes: number;
  work_mode: WorkMode;
  questions: AssessmentQuestion[];
  hints: string[];
  execution_environment: "runner" | "external";
  created_at?: string;
  subjects?: AssignmentSubject | null;
}

export interface ActivityTemplate {
  task: string;
  input: string;
  output: string;
  hints: string[];
  starterCode: string;
  mode: WorkMode;
  environment: "runner" | "external";
  questions: AssessmentQuestion[];
}

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
  created_at?: string;
  updated_at?: string;
}
