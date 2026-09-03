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
      ["Total faculty", "148", "+12 this term"],
      ["Total students", "4,820", "8 departments"],
      ["Active subjects", "286", "Theory, lab, mixed"],
      ["Active classrooms", "412", "34 archived"],
      ["Active resources", "2,918", "PDF, video, code"],
      ["Assignments / lab tasks", "1,276", "212 due this week"],
      ["Unresolved doubts", "184", "42 high priority"],
      ["Recent activity", "18.4k", "7 day events"],
    ],
  },
  faculty: {
    label: "Faculty",
    title: "Faculty Dashboard",
    subtitle: "Teach, share resources, review learning tasks, answer doubts, and support progress.",
    metrics: [
      ["Assigned classrooms", "6", "2 theory, 2 lab, 2 mixed"],
      ["Active subjects", "4", "DBMS, OS, CN, Python"],
      ["Pending submissions", "87", "34 lab reviews"],
      ["Unanswered doubts", "19", "5 repeated topics"],
      ["Upcoming deadlines", "11", "Next 7 days"],
      ["Student activity", "1,284", "Events this week"],
      ["Weak topics", "8", "Joins, deadlocks, ERD"],
      ["Uploaded resources", "46", "9 recommended"],
    ],
  },
  student: {
    label: "Student",
    title: "Student Dashboard",
    subtitle: "Know what to study, what to submit, where you are weak, and how to improve.",
    metrics: [
      ["Enrolled subjects", "7", "3 theory, 2 lab, 2 mixed"],
      ["Pending assignments", "5", "2 due soon"],
      ["Pending lab tasks", "3", "1 resubmission"],
      ["Upcoming deadlines", "8", "Next 10 days"],
      ["Recent feedback", "6", "2 faculty notes"],
      ["Recommended resources", "14", "Based on weak topics"],
      ["Unread announcements", "4", "1 pinned"],
      ["Weak topics", "5", "Practice suggested"],
    ],
  },
} as const;

export const subjects: Subject[] = [
  {
    name: "Database Management Systems",
    type: "Theory + Lab",
    semester: "Sem 4",
    section: "CSE-A",
    faculty: "Dr. Meera Iyer, Prof. Anand Rao",
    progress: 72,
    pending: 14,
    doubtCount: 31,
    risk: "Medium",
  },
  {
    name: "Operating Systems",
    type: "Theory Only",
    semester: "Sem 4",
    section: "CSE-B",
    faculty: "Prof. Kavitha N",
    progress: 64,
    pending: 18,
    doubtCount: 24,
    risk: "High",
  },
  {
    name: "Python Programming Lab",
    type: "Lab Only",
    semester: "Sem 2",
    section: "IT-A Batch 2",
    faculty: "Prof. Ramesh K",
    progress: 81,
    pending: 9,
    doubtCount: 12,
    risk: "Low",
  },
  {
    name: "Computer Networks",
    type: "Theory + Lab",
    semester: "Sem 5",
    section: "ECE-A",
    faculty: "Dr. Farah Khan",
    progress: 58,
    pending: 22,
    doubtCount: 39,
    risk: "High",
  },
];

export const resources = [
  ["ER Modeling Notes", "PDF", "DBMS / Unit 2", "Recommended", "1,246 views"],
  ["SQL Join Practice Dataset", "Dataset", "DBMS Lab", "Published", "734 downloads"],
  ["Deadlock Simulator Link", "External link", "Operating Systems", "Published", "482 opens"],
  ["Python File Handling Starter", "Starter files", "Python Lab", "Draft", "Reusable"],
  ["Subnetting Walkthrough", "Video", "Networks / Unit 3", "Recommended", "913 views"],
];

export const activities = [
  ["ER Diagram Case Study", "Written assignment", "DBMS", "Aug 22", "68% complete", "Manual rubric"],
  ["SQL Joins Lab Task", "SQL task", "DBMS Lab", "Aug 23", "54% complete", "Auto + faculty review"],
  ["Process Scheduling Quiz", "MCQ quiz", "Operating Systems", "Aug 25", "72% complete", "Auto checked"],
  ["Socket Programming Mini Task", "Coding task", "Networks Lab", "Aug 28", "41% complete", "Needs support"],
  ["File Upload Experiment", "Lab task", "Python Lab", "Aug 30", "83% complete", "Feedback pending"],
];

export const doubts = [
  ["SQL joins vs nested queries", "DBMS", "18 students following", "Pinned answer suggested"],
  ["Deadlock prevention examples", "Operating Systems", "11 students following", "Unanswered"],
  ["Socket bind error", "Networks Lab", "7 students following", "Faculty replied"],
  ["Python CSV read issue", "Python Lab", "4 students following", "AI helped, needs review"],
];

export const studentProfiles = [
  ["Akhil R", "CSE-A", "DBMS", "76%", "Joins, normalization", "Improving"],
  ["Sneha M", "CSE-A", "DBMS", "61%", "ER modeling", "Needs support"],
  ["Rahul P", "CSE-B", "OS", "55%", "Deadlocks, scheduling", "Repeated attempts"],
  ["Nisha K", "IT-A", "Python Lab", "84%", "File IO", "Stable"],
  ["Imran S", "ECE-A", "Networks", "49%", "Subnetting, sockets", "Needs support"],
  ["Divya T", "CSE-A", "DBMS", "91%", "None critical", "Strong"],
];

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
