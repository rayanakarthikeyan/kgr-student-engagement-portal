export type RoleId = "admin" | "faculty" | "student";
export type ViewId = "overview" | "workspace" | "resources" | "activities" | "engagement" | "analytics" | "settings";
export type SubjectType = "Theory Only" | "Lab Only" | "Theory + Lab";

export interface Subject {
  name: string;
  type: SubjectType;
  semester: string;
  section: string;
  faculty: string;
  progress: number;
  pending: number;
  doubtCount: number;
  risk: "Low" | "Medium" | "High";
}

export const roleProfiles = {
  admin: {
    label: "Super Admin",
    title: "Super Admin Dashboard",
    subtitle: "Configure platform structure, manage users, subjects, classrooms, and learning usage.",
    metrics: [
      ["Total faculty", "0", "Create faculty accounts"],
      ["Total students", "0", "Create student accounts"],
      ["Active subjects", "0", "No subjects yet"],
      ["Active classrooms", "0", "No classrooms yet"],
      ["Active resources", "0", "No resources yet"],
      ["Assignments / lab tasks", "0", "No learning tasks yet"],
      ["Unresolved doubts", "0", "No doubts yet"],
      ["Recent activity", "0", "Fresh workspace"],
    ],
  },
  faculty: {
    label: "Faculty",
    title: "Faculty Dashboard",
    subtitle: "Teach, share resources, review learning tasks, answer doubts, and support progress.",
    metrics: [
      ["Assigned classrooms", "0", "No classrooms yet"],
      ["Active subjects", "0", "No subjects yet"],
      ["Pending submissions", "0", "No submissions yet"],
      ["Unanswered doubts", "0", "No doubts yet"],
      ["Upcoming deadlines", "0", "No deadlines yet"],
      ["Student activity", "0", "No activity yet"],
      ["Weak topics", "0", "No analytics yet"],
      ["Uploaded resources", "0", "No resources yet"],
    ],
  },
  student: {
    label: "Student",
    title: "Student Dashboard",
    subtitle: "Know what to study, what to submit, where you are weak, and how to improve.",
    metrics: [
      ["Enrolled subjects", "0", "No subjects yet"],
      ["Pending assignments", "0", "No assignments yet"],
      ["Pending lab tasks", "0", "No lab tasks yet"],
      ["Upcoming deadlines", "0", "No deadlines yet"],
      ["Recent feedback", "0", "No feedback yet"],
      ["Recommended resources", "0", "No recommendations yet"],
      ["Unread announcements", "0", "No announcements yet"],
      ["Weak topics", "0", "No analytics yet"],
    ],
  },
} as const;

export const subjects: Subject[] = [];

export const resources: [string, string, string, string, string][] = [];

export const activities: [string, string, string, string, string, string][] = [];

export const doubts: [string, string, string, string][] = [];

export const studentProfiles: [string, string, string, string, string, string][] = [];

export const roleConfig = {
  admin: {
    primaryTableTitle: "Classroom Setup",
    primaryTableSubtitle: "Map subject, faculty, semester, section or batch, and learning status.",
    secondaryTitle: "Platform Monitoring",
    filters: ["Department", "Semester", "Subject type", "Activity risk"],
    actions: ["Create classroom", "Bulk import users", "Archive old classroom"],
  },
  faculty: {
    primaryTableTitle: "My Classrooms",
    primaryTableSubtitle: "Open a workspace, view enrolled students, and manage learning progress.",
    secondaryTitle: "Students Needing Support",
    filters: ["Subject", "Semester", "Section / batch", "Pending review"],
    actions: ["Upload resource", "Create activity", "Answer doubts"],
  },
  student: {
    primaryTableTitle: "My Subjects",
    primaryTableSubtitle: "Open a subject workspace and continue pending theory or lab learning.",
    secondaryTitle: "Recommended Next Steps",
    filters: ["Subject type", "Pending work", "Deadline", "Weak topic"],
    actions: ["Ask doubt", "Continue practice", "View feedback"],
  },
} as const;
