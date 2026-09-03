import {
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  FlaskConical,
  LoaderCircle,
  Send,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createCourseworkAssignment, loadCoursework } from '../platform/api';
import { curriculumCatalog } from '../platform/curriculum';
import type {
  AssignmentRecord,
  AssignmentSubject,
  AuthSession,
  CurriculumItem,
  SessionUser,
} from '../platform/types';

function defaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

function subjectForCourse(courseCode: 'JAVA' | 'DBMS', subjects: AssignmentSubject[]) {
  return (
    subjects.find((s) =>
      courseCode === 'JAVA'
        ? s.name.toLowerCase().includes('java') || s.id.includes('java')
        : s.name.toLowerCase().includes('dbms') || s.id.includes('dbms'),
    )?.id ||
    subjects[0]?.id ||
    ''
  );
}

export function FacultyLabWorkspace({ session }: { session: AuthSession }) {
  const [_assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [subjects, setSubjects] = useState<AssignmentSubject[]>([]);
  const [students, setStudents] = useState<SessionUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dueDates, setDueDates] = useState<Record<string, string>>({});
  const [publishing, setPublishing] = useState<Record<string, boolean>>({});
  const [published, setPublished] = useState<Record<string, boolean>>({});
  const [courseFilter, setCourseFilter] = useState<'ALL' | 'JAVA' | 'DBMS'>('ALL');

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadCoursework(session.token, true)
      .then((data) => {
        if (!active) return;
        setAssignments(data.assignments);
        setSubjects(data.subjects);
        setStudents(data.students);
        const pub: Record<string, boolean> = {};
        data.assignments
          .filter((a) => a.assignment_type === 'lab')
          .forEach((a) => { pub[a.curriculum_item_id] = true; });
        setPublished(pub);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session.token]);

  const labExperiments = useMemo(
    () =>
      curriculumCatalog
        .filter(
          (item) =>
            item.track === 'lab' &&
            (courseFilter === 'ALL' || item.courseCode === courseFilter),
        )
        .sort((a, b) =>
          a.courseCode === b.courseCode
            ? a.sequence - b.sequence
            : a.courseCode.localeCompare(b.courseCode),
        ),
    [courseFilter],
  );

  const getDue = (id: string) => dueDates[id] || defaultDueDate();

  const publishExperiment = async (item: CurriculumItem) => {
    setError('');
    setNotice('');
    setPublishing((prev) => ({ ...prev, [item.id]: true }));
    try {
      const assignedUserIds = students.map((s) => s.id);
      const subjectId = subjectForCourse(item.courseCode, subjects);
      const javaStarter = 'public class Main {\n  public static void main(String[] args) {\n    // ' + item.title + '\n  }\n}\n';
      const sqlStarter = '-- ' + item.title + '\n-- Write your SQL below.\n';
      const starterCode = item.courseCode === 'JAVA' ? javaStarter : sqlStarter;
      const assignment = await createCourseworkAssignment(session.token, {
        title: item.title,
        subjectId,
        dueDate: getDue(item.id),
        maxMarks: item.suggestedMarks,
        description: item.brief + '\n\nTask:\nComplete the experiment in the IDE workspace below.',
        starterCode,
        testCases: [{ input: '', output: '', hidden: false }],
        assignedUserIds,
        assigned: assignedUserIds.length,
        submitted: 0,
        pending: assignedUserIds.length,
        reviewed: 0,
        assignmentType: 'lab',
        curriculumItemId: item.id,
        courseCode: item.courseCode,
        unitNumber: item.unit,
        durationMinutes: 60,
        workMode: 'ide',
        executionEnvironment: 'runner',
        hints: [],
        questions: [],
      });
      setAssignments((prev) => [assignment, ...prev]);
      setPublished((prev) => ({ ...prev, [item.id]: true }));
      const cnt = assignedUserIds.length;
      setNotice(item.label + ': ' + item.title + ' published to ' + cnt + ' student' + (cnt !== 1 ? 's' : '') + '.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not publish experiment');
    } finally {
      setPublishing((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  if (loading)
    return (
      <div className="panel empty-panel min-h-[320px]">
        <LoaderCircle className="animate-spin text-cyan-600" size={28} />
        <span>Loading lab experiments...</span>
      </div>
    );

  const publishedCount = Object.values(published).filter(Boolean).length;

  return (
    <div className="space-y-7">
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="metric-panel">
          <p>JAVA Experiments</p>
          <strong>21</strong>
          <span>Official KGR25 lab curriculum</span>
          <span className="metric-icon cyan"><FlaskConical size={18} /></span>
        </div>
        <div className="metric-panel">
          <p>DBMS Experiments</p>
          <strong>10</strong>
          <span>Official KGR25 lab curriculum</span>
          <span className="metric-icon amber"><FlaskConical size={18} /></span>
        </div>
        <div className="metric-panel">
          <p>Published so far</p>
          <strong>{publishedCount}</strong>
          <span>Experiments assigned to students</span>
          <span className="metric-icon emerald"><CheckCircle2 size={18} /></span>
        </div>
      </section>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-300 bg-rose-500/8 px-4 py-3 text-sm text-rose-600">
          <CircleAlert size={18} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-600">
          <CheckCircle2 size={17} />
          {notice}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-cyan-600">Lab Workspace</p>
          <h2 className="mt-1 text-2xl font-semibold">Publish Experiments</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Pick a deadline and click <strong>Publish</strong> to assign any experiment to all students.
          </p>
        </div>
        <div className="segmented-control">
          {(['ALL', 'JAVA', 'DBMS'] as const).map((val) => (
            <button
              key={val}
              className={courseFilter === val ? 'active' : ''}
              onClick={() => setCourseFilter(val)}
              type="button"
            >
              {val === 'ALL' ? 'All' : val}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {labExperiments.map((item) => {
          const isPublished = !!published[item.id];
          const isPublishing = !!publishing[item.id];
          const isJava = item.courseCode === 'JAVA';
          const accentClass = isJava ? 'bg-cyan-500/10 text-cyan-600' : 'bg-amber-500/10 text-amber-600';
          const tagClass = isJava ? 'tag cyan' : 'tag amber';
          const btnClass = 'primary-button w-full' + (isPublished ? ' opacity-70' : '');
          const cardClass = 'panel p-5 flex flex-col gap-4' + (isPublished ? ' border-emerald-400/40' : '');
          return (
            <article
              key={item.id}
              className={cardClass}
              style={isPublished ? { background: 'rgba(16, 185, 129, 0.03)' } : undefined}
            >
              <div className="flex items-start gap-3">
                <span className={'grid size-10 shrink-0 place-items-center rounded-lg ' + accentClass}>
                  <FlaskConical size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={tagClass}>{item.courseCode}</span>
                    <span className="tag neutral">{item.label}</span>
                    {isPublished && (
                      <span className="tag" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                        Published
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 text-sm font-semibold leading-snug">{item.title}</h3>
                </div>
              </div>

              <p className="line-clamp-3 text-xs leading-5" style={{ color: 'var(--muted)' }}>{item.brief}</p>

              <ul className="space-y-1">
                {item.outcomes.map((outcome, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px]" style={{ color: 'var(--muted)' }}>
                    <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-cyan-500" />
                    {outcome}
                  </li>
                ))}
              </ul>

              <div className="mt-auto space-y-3 border-t pt-4" style={{ borderColor: 'var(--line)' }}>
                <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
                  <CalendarDays size={14} />
                  Deadline
                  <input
                    type="date"
                    min={new Date().toISOString().slice(0, 10)}
                    value={getDue(item.id)}
                    onChange={(e) => setDueDates((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    className="ml-auto rounded-md border px-2 py-1 text-xs outline-none focus:border-cyan-400"
                    style={{ borderColor: 'var(--line)', background: 'var(--surface)', color: 'var(--ink)' }}
                  />
                </label>
                <button
                  className={btnClass}
                  disabled={isPublishing}
                  onClick={() => void publishExperiment(item)}
                  type="button"
                >
                  {isPublishing ? (
                    <LoaderCircle className="animate-spin" size={15} />
                  ) : isPublished ? (
                    <CheckCircle2 size={15} />
                  ) : (
                    <Send size={15} />
                  )}
                  {isPublishing
                    ? 'Publishing...'
                    : isPublished
                      ? 'Re-publish'
                      : 'Publish to ' + students.length + ' student' + (students.length !== 1 ? 's' : '')}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
