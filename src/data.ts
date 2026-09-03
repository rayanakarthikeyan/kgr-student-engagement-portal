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
    subtitle: "Create faculty and student accounts, control access, and manage portal users.",
    metrics: [
      ["Total faculty", "0", "Create faculty accounts"],
      ["Total students", "0", "Create student accounts"],
      ["Student groups", "0", "No groups yet"],
      ["Active tasks", "0", "No tasks yet"],
      ["Quizzes", "0", "No quizzes yet"],
      ["Assignments", "0", "No assignments yet"],
      ["Low activity alerts", "0", "No alerts yet"],
      ["Recent activity", "0", "Fresh workspace"],
    ],
  },
  faculty: {
    label: "Faculty",
    title: "Faculty Dashboard",
    subtitle: "Assign work, review submissions, and monitor time students spend learning on the platform.",
    metrics: [
      ["Student groups", "0", "No groups yet"],
      ["Active tasks", "0", "No tasks yet"],
      ["Pending submissions", "0", "No submissions yet"],
      ["Low activity alerts", "0", "No alerts yet"],
      ["Upcoming deadlines", "0", "No deadlines yet"],
      ["Student activity", "0", "No activity yet"],
      ["Weak topics", "0", "No analytics yet"],
      ["Learning time", "0h", "No time tracked yet"],
    ],
  },
  student: {
    label: "Student",
    title: "Student Dashboard",
    subtitle: "View assigned work, complete quizzes, and track your learning time.",
    metrics: [
      ["Assigned groups", "0", "No groups yet"],
      ["Pending assignments", "0", "No assignments yet"],
      ["Pending quizzes", "0", "No quizzes yet"],
      ["Upcoming deadlines", "0", "No deadlines yet"],
      ["Recent feedback", "0", "No feedback yet"],
      ["Learning time", "0h", "No time tracked yet"],
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
    primaryTableTitle: "Student Groups",
    primaryTableSubtitle: "Create lightweight groups only for assigning and monitoring work.",
    secondaryTitle: "Platform Monitoring",
    filters: ["Group", "Task type", "Pending review", "Learning time"],
    actions: ["Create group", "Create task", "Add students"],
  },
  faculty: {
    primaryTableTitle: "My Student Groups",
    primaryTableSubtitle: "Open a group, assign tasks or quizzes, and monitor progress.",
    secondaryTitle: "Students Needing Support",
    filters: ["Group", "Task type", "Pending review", "Low activity"],
    actions: ["Create task", "Create quiz", "Review submissions"],
  },
  student: {
    primaryTableTitle: "My Work",
    primaryTableSubtitle: "Open assigned tasks, submit work, and continue pending quizzes.",
    secondaryTitle: "Recommended Next Steps",
    filters: ["Task type", "Pending work", "Deadline", "Feedback"],
    actions: ["Continue task", "Take quiz", "View feedback"],
  },
} as const;
