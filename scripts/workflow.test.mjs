import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import register from "../api/register.js";
import login from "../api/login.js";
import assignments from "../api/assignments.js";
import users from "../api/users.js";
import platform from "../api/platform.js";
import learning from "../api/learning.js";
import runner from "../api/code-runner.js";
import { activityTemplates } from "../server/curriculum-templates.js";
import { createSupabaseClient, hashPassword } from "../api/_shared.js";
process.env.LOCAL_API_SEED_PATH = fileURLToPath(new URL("../server/db.seed.json", import.meta.url));
process.env.AUTH_SECRET = "local-test-secret";
delete process.env.CODE_RUNNER_URL;

async function call(handler, method = "GET", body = {}, token = "", query = {}) {
  let status = 200, result;
  await handler({ method, body, query, headers: { authorization: token ? "Bearer " + token : "" } }, {
    setHeader() {}, status(value) { status = value; return this; }, json(value) { result = value; }, end() {},
  });
  return { status, ...result };
}
const profile = { name: "Test Student", email: "test-profile@example.invalid", rollNumber: "TEST2026001", contactNumber: "9876543210", department: "CSE", section: "A", password: "Test-only-password-123" };

test("catalog has all syllabus labs and editable examples for every theory unit", () => {
  assert.equal(Object.keys(activityTemplates).length, 41);
  for (const [key, template] of Object.entries(activityTemplates)) {
    assert.ok(template.task.length > 40, key);
    assert.ok(template.output.length > 0, key);
    assert.ok(template.hints.length > 0, key);
    if (key.includes("theory")) {
      assert.equal(template.questions.length, 2);
      for (const q of template.questions) assert.ok(q.options[q.correctIndex]);
    }
  }
});

test("registration, publication gate, editing, filtering and grading", async () => {
  assert.equal((await call(login, "POST", { email: "random@example.invalid", password: "randompass" })).status, 401);
  for (const invalid of [{ department: "ECE" }, { section: "Z" }, { contactNumber: "123" }, { name: "" }]) {
    assert.equal((await call(register, "POST", { ...profile, ...invalid })).status, 400);
  }
  const student = await call(register, "POST", profile);
  assert.equal(student.status, 201);
  assert.equal(student.user.department, "CSE");
  assert.equal(student.user.section, "A");
  assert.equal(student.user.contact_number, "9876543210");
  assert.equal(student.user.college, "KG Reddy College of Engineering and Technology");
  assert.equal(student.user.password_hash, undefined);
  assert.equal((await call(register, "POST", profile)).status, 409);
  const enrolled = await call(platform, "GET", {}, student.token, { entity: "enrollment" });
  assert.deepEqual(enrolled.enrollments.map(e => e.course_id).sort(), ["course-dbms", "course-java"]);
  assert.ok(enrolled.enrollments.every(e => e.tracks.includes("theory") && e.tracks.includes("lab")));
  assert.equal((await call(assignments, "GET", {}, student.token, { templates: "1" })).status, 403);
  assert.equal((await call(assignments, "GET", {}, student.token)).assignments.length, 0);
  assert.equal((await call(users, "GET", {}, student.token)).status, 403);

  const facultyCredentials = { email: "faculty-test@example.invalid", password: "Test-only-faculty-123" };
  const { error: facultyError } = await createSupabaseClient({ requirePrivileged: true }).from("users").insert({
    id: "faculty-test", name: "Test Faculty", email: facultyCredentials.email,
    password_hash: hashPassword(facultyCredentials.password), role: "faculty", is_active: true,
  });
  assert.equal(facultyError, null);
  const faculty = await call(login, "POST", facultyCredentials);
  assert.equal(faculty.status, 200);
  assert.equal(Object.keys((await call(assignments, "GET", {}, faculty.token, { templates: "1" })).templates).length, 41);
  const cohort = await call(users, "GET", {}, faculty.token, { department: "CSE", section: "A" });
  assert.equal(cohort.users.length, 1);
  assert.equal((await call(users, "GET", {}, faculty.token, { department: "CSM" })).users.length, 0);
  const outsider = await call(register, "POST", { ...profile, email: "second@example.invalid", rollNumber: "TEST2026002", department: "CSM", section: "B" });
  const questions = activityTemplates["java-theory-1"].questions;
  const payload = { title: "Java practice", subjectId: "sub-java-cse-a", dueDate: "2099-12-31", maxMarks: 99, description: "Practice task", workMode: "mcq", questions, assignedUserIds: [student.user.id], assignmentType: "practice", courseCode: "JAVA", unitNumber: 1, curriculumItemId: "java-theory-1", assigned: 1, hints: ["Try reasoning first"] };
  assert.equal((await call(assignments, "POST", payload, student.token)).status, 403);
  assert.equal((await call(assignments, "POST", { ...payload, assignedUserIds: [] }, faculty.token)).status, 400);
  assert.equal((await call(assignments, "POST", { ...payload, questions: [{ ...questions[0], correctIndex: 9 }] }, faculty.token)).status, 400);
  const created = await call(assignments, "POST", payload, faculty.token);
  assert.equal(created.status, 201, JSON.stringify(created));
  assert.equal(created.assignment.max_marks, 2);
  const id = created.assignment.id;
  assert.equal((await call(assignments, "PATCH", { id, title: "Edited Java practice" }, faculty.token)).status, 200);
  assert.equal((await call(assignments, "GET", {}, outsider.token)).assignments.length, 0);
  const published = (await call(assignments, "GET", {}, student.token)).assignments[0];
  assert.equal(published.questions[0].correctIndex, undefined);
  assert.equal(published.title, "Edited Java practice");
  const answers = { [questions[0].id]: null, [questions[1].id]: questions[1].correctIndex };
  const submitted = await call(learning, "POST", { kind: "submission", assignmentId: id, subjectId: payload.subjectId, title: "Answers", body: JSON.stringify(answers), status: "submitted", score: 999, metadata: { answers, hints_used: [0] } }, student.token);
  assert.equal(submitted.status, 201, JSON.stringify(submitted));
  assert.equal(submitted.record.score, 1);
  assert.equal((await call(learning, "PATCH", { id: submitted.record.id, score: 999 }, student.token)).status, 403);
  assert.equal((await call(assignments, "PATCH", { id, title: "Changed after attempt" }, faculty.token)).status, 409);
  const lab = activityTemplates["java-lab-1"];
  const labWork = await call(assignments, "POST", { ...payload, title: "Prime lab", workMode: "ide", questions: [], assignmentType: "lab", testCases: [{ input: lab.input, output: lab.output }], hints: lab.hints }, faculty.token);
  assert.equal(labWork.status, 201);
  const labSubmission = await call(learning, "POST", { kind: "submission", assignmentId: labWork.assignment.id, title: "Prime solution", body: lab.starterCode, status: "submitted", score: 100 }, student.token);
  assert.equal(labSubmission.record.score, null);
  assert.equal((await call(runner, "POST", { language: "java", code: lab.starterCode }, student.token)).status, 503);
});
