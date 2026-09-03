import type { Course, LabChallenge } from "./types";

// Stable course configuration. Student, resource, assessment, and activity data
// are loaded from the authenticated API.
export const courses: Course[] = [
  {
    id: "course-java",
    code: "JAVA",
    title: "Object-Oriented Programming through JAVA",
    description: "KGR25 theory and laboratory work organized unit by unit.",
    accent: "cyan",
    faculty: "KGR Faculty",
    enrolled: 0,
  },
  {
    id: "course-dbms",
    code: "DBMS",
    title: "Database Management Systems",
    description: "KGR25 database theory, SQL practice, assessments, and experiments.",
    accent: "amber",
    faculty: "KGR Faculty",
    enrolled: 0,
  },
];

// General unassigned practice remains available as a lightweight orientation
// workspace. Faculty-assigned practice and labs use the unit coursework flow.
export const labChallenges: LabChallenge[] = [
  {
    id: "practice-java-orientation",
    courseId: "course-java",
    language: "java",
    title: "Java editor orientation",
    topic: "Classes and console output",
    statement: "Complete a small Java class with a main method and print a result.",
    concept: "A Java application begins at the public static void main entry point.",
    constraints: ["Use a Main class", "Keep braces balanced", "Print at least one value"],
    sampleInput: "",
    expectedOutput: "Java structure checks passed.",
    starterCode: "public class Main {\n  public static void main(String[] args) {\n    System.out.println(\"Ready\");\n  }\n}",
    hint: "Keep the class and main method declarations before adding the solution.",
  },
  {
    id: "practice-dbms-orientation",
    courseId: "course-dbms",
    language: "sql",
    title: "SQL editor orientation",
    topic: "Read-only queries",
    statement: "Write a SELECT query and validate its basic structure.",
    concept: "SELECT identifies result columns and FROM identifies the source relation.",
    constraints: ["Terminate the statement with a semicolon", "Use balanced parentheses"],
    sampleInput: "",
    expectedOutput: "SQL structure checks passed.",
    starterCode: "SELECT *\nFROM students;",
    hint: "Start with SELECT and FROM, then add filters or ordering.",
  },
];
