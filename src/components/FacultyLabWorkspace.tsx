import {
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  LoaderCircle,
  Pencil,
  Plus,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createCourseworkAssignment, loadCoursework } from '../platform/api';
import { curriculumCatalog } from '../platform/curriculum';
import type {
  AssignmentRecord,
  AssignmentSubject,
  AuthSession,
  CourseCode,
  CurriculumItem,
  SessionUser,
} from '../platform/types';

// Editable snapshot of an experiment before publishing
interface ExperimentDraft {
  id: string;
  courseCode: CourseCode;
  label: string;
  title: string;
  brief: string;
  starterCode: string;
  expectedOutput: string;
  suggestedMarks: number;
  outcomes: string[];
  unit: number;
  isCustom?: boolean;
}

function defaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

function subjectForCourse(courseCode: CourseCode, subjects: AssignmentSubject[]) {
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

function makeDraftFromItem(item: CurriculumItem): ExperimentDraft {
  return {
    id: item.id,
    courseCode: item.courseCode,
    label: item.label,
    title: item.title,
    brief: item.brief,
    starterCode: item.starterCode,
    expectedOutput: item.expectedOutput || '',
    suggestedMarks: item.suggestedMarks,
    outcomes: [...item.outcomes],
    unit: item.unit,
  };
}

function EditPanel({
  draft,
  onChange,
  onClose,
}: {
  draft: ExperimentDraft;
  onChange: (d: ExperimentDraft) => void;
  onClose: () => void;
}) {
  const set = (field: keyof ExperimentDraft, value: unknown) =>
    onChange({ ...draft, [field]: value });
  return (
    <div className="rounded-xl border-2 border-cyan-400/30 bg-[var(--surface-2)] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-cyan-600">Edit Experiment</p>
        <button className="icon-button" onClick={onClose} type="button" title="Close editor">
          <X size={15} />
        </button>
      </div>

      <label className="block text-xs font-semibold">
        Experiment Title
        <input
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-cyan-400"
          style={{ borderColor: 'var(--line)', background: 'var(--surface)', color: 'var(--ink)' }}
          value={draft.title}
          onChange={(e) => set('title', e.target.value)}
        />
      </label>

      <label className="block text-xs font-semibold">
        Description / Task Instructions
        <textarea
          className="mt-1 w-full rounded-md border px-3 py-2 text-xs leading-5 outline-none focus:border-cyan-400"
          style={{ borderColor: 'var(--line)', background: 'var(--surface)', color: 'var(--ink)', minHeight: '90px' }}
          value={draft.brief}
          onChange={(e) => set('brief', e.target.value)}
        />
      </label>

      <label className="block text-xs font-semibold">
        Starter Code
        <textarea
          className="mt-1 w-full rounded-md border px-3 py-2 font-mono text-xs leading-5 outline-none focus:border-cyan-400"
          style={{ borderColor: 'var(--line)', background: 'var(--surface)', color: 'var(--ink)', minHeight: '80px' }}
          value={draft.starterCode}
          onChange={(e) => set('starterCode', e.target.value)}
        />
      </label>

      <label className="block text-xs font-semibold">
        Expected Output / Observations <span className="text-rose-500">*</span>
        <textarea
          className="mt-1 w-full rounded-md border px-3 py-2 font-mono text-xs leading-5 outline-none focus:border-cyan-400"
          style={{ borderColor: 'var(--line)', background: 'var(--surface)', color: 'var(--ink)', minHeight: '80px' }}
          placeholder="Enter expected output that students should match..."
          value={draft.expectedOutput}
          onChange={(e) => set('expectedOutput', e.target.value)}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs font-semibold">
          Marks
          <input
            type="number" min="1" max="100"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-cyan-400"
            style={{ borderColor: 'var(--line)', background: 'var(--surface)', color: 'var(--ink)' }}
            value={draft.suggestedMarks}
            onChange={(e) => set('suggestedMarks', Number(e.target.value))}
          />
        </label>
        <label className="block text-xs font-semibold">
          Course
          <div className="mt-1 segmented-control w-full">
            {(['JAVA', 'DBMS'] as CourseCode[]).map((c) => (
              <button key={c} type="button"
                className={'flex-1 ' + (draft.courseCode === c ? 'active' : '')}
                onClick={() => set('courseCode', c)}
              >{c}</button>
            ))}
          </div>
        </label>
      </div>

      <button
        className="secondary-button"
        type="button"
        onClick={onClose}
      >
        <CheckCircle2 size={14} /> Done editing
      </button>
    </div>
  );
}

export function FacultyLabWorkspace({ session }: { session: AuthSession }) {
  const [subjects, setSubjects] = useState<AssignmentSubject[]>([]);
  const [students, setStudents] = useState<SessionUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dueDates, setDueDates] = useState<Record<string, string>>({});
  const [publishing, setPublishing] = useState<Record<string, boolean>>({});
  const [published, setPublished] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ExperimentDraft>>({});
  const [courseFilter, setCourseFilter] = useState<'ALL' | 'JAVA' | 'DBMS'>('ALL');
  const [customExperiments, setCustomExperiments] = useState<ExperimentDraft[]>([]);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  // blank custom experiment template
  const blankCustom = (): ExperimentDraft => ({
    id: 'custom-' + Date.now(),
    courseCode: 'JAVA',
    label: 'Custom Experiment',
    title: '',
    brief: '',
    starterCode: 'public class Main {\n  public static void main(String[] args) {\n    // Your code here\n  }\n}\n',
    expectedOutput: '',
    suggestedMarks: 10,
    outcomes: ['Complete the experiment as described'],
    unit: 1,
    isCustom: true,
  });

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadCoursework(session.token, true)
      .then((data) => {
        if (!active) return;
        setSubjects(data.subjects);
        setStudents(data.students);
        const pub: Record<string, boolean> = {};
        data.assignments
          .filter((a: AssignmentRecord) => a.assignment_type === 'lab')
          .forEach((a: AssignmentRecord) => { pub[a.curriculum_item_id] = true; });
        setPublished(pub);
        // pre-populate drafts from catalog
        const d: Record<string, ExperimentDraft> = {};
        curriculumCatalog
          .filter((item) => item.track === 'lab')
          .forEach((item) => { d[item.id] = makeDraftFromItem(item); });
        setDrafts(d);
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

  const filteredCustom = useMemo(
    () => customExperiments.filter((e) => courseFilter === 'ALL' || e.courseCode === courseFilter),
    [customExperiments, courseFilter],
  );

  const getDue = (id: string) => dueDates[id] || defaultDueDate();

  const getDraft = (item: CurriculumItem): ExperimentDraft =>
    drafts[item.id] || makeDraftFromItem(item);

  const publishExperiment = async (draft: ExperimentDraft) => {
    setError('');
    setNotice('');
    if (!draft.expectedOutput.trim()) {
      setError('Add expected output or observations for ' + draft.title + ' before publishing.');
      setEditingId(draft.id);
      return;
    }
    setPublishing((prev) => ({ ...prev, [draft.id]: true }));
    try {
      const subjectId = subjectForCourse(draft.courseCode, subjects);
      // Empty assigned_user_ids = publish to ALL students (current + future)
      await createCourseworkAssignment(session.token, {
        title: draft.title,
        subjectId,
        dueDate: getDue(draft.id),
        maxMarks: draft.suggestedMarks,
        description: draft.brief + '\n\nTask:\nComplete the experiment in the IDE workspace below.\n\nExpected Output:\n' + draft.expectedOutput,
        starterCode: draft.starterCode,
        testCases: [{ input: '', output: draft.expectedOutput, hidden: false }],
        assignedUserIds: [],   // empty = all students (current + future)
        assigned: students.length,
        submitted: 0,
        pending: students.length,
        reviewed: 0,
        assignmentType: 'lab',
        curriculumItemId: draft.id,
        courseCode: draft.courseCode,
        unitNumber: draft.unit,
        durationMinutes: 60,
        workMode: 'ide',
        executionEnvironment: 'runner',
        hints: [],
        questions: [],
      });
      setPublished((prev) => ({ ...prev, [draft.id]: true }));
      setEditingId(null);
      setNotice(draft.label + ': ' + draft.title + ' published — visible to all students including future registrants.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not publish experiment');
    } finally {
      setPublishing((prev) => ({ ...prev, [draft.id]: false }));
    }
  };

  const addCustomExperiment = () => {
    const custom = blankCustom();
    setCustomExperiments((prev) => [...prev, custom]);
    setDrafts((prev) => ({ ...prev, [custom.id]: custom }));
    setEditingId(custom.id);
  };

  const removeCustomExperiment = (id: string) => {
    setCustomExperiments((prev) => prev.filter((e) => e.id !== id));
    setDrafts((prev) => { const n = { ...prev }; delete n[id]; return n; });
    if (editingId === id) setEditingId(null);
  };

  const updateDraft = (draft: ExperimentDraft) => {
    setDrafts((prev) => ({ ...prev, [draft.id]: draft }));
    if (draft.isCustom) {
      setCustomExperiments((prev) => prev.map((e) => e.id === draft.id ? draft : e));
    }
  };

  const toggleExpand = (id: string) =>
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));

  if (loading)
    return (
      <div className="panel empty-panel min-h-[320px]">
        <LoaderCircle className="animate-spin text-cyan-600" size={28} />
        <span>Loading lab experiments...</span>
      </div>
    );

  const publishedCount = Object.values(published).filter(Boolean).length;
  const totalCount = labExperiments.length + customExperiments.length;

  // Render a single experiment card (works for both catalog and custom)
  const renderCard = (draft: ExperimentDraft, onRemove?: () => void) => {
    const isPublished = !!published[draft.id];
    const isPublishing = !!publishing[draft.id];
    const isEditing = editingId === draft.id;
    const isExpanded = !!expandedIds[draft.id];
    const isJava = draft.courseCode === 'JAVA';
    const accentClass = isJava ? 'bg-cyan-500/10 text-cyan-600' : 'bg-amber-500/10 text-amber-600';
    const tagClass = isJava ? 'tag cyan' : 'tag amber';
    const hasOutput = !!draft.expectedOutput.trim();

    return (
      <article
        key={draft.id}
        className={'panel p-5 flex flex-col gap-4 ' + (isPublished ? 'border-emerald-400/40' : !hasOutput ? 'border-amber-400/30' : '')}
        style={isPublished ? { background: 'rgba(16, 185, 129, 0.03)' } : undefined}
      >
        {/* Header */}
        <div className="flex items-start gap-3">
          <span className={'grid size-10 shrink-0 place-items-center rounded-lg ' + accentClass}>
            <FlaskConical size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={tagClass}>{draft.courseCode}</span>
              <span className="tag neutral">{draft.label}</span>
              {isPublished && <span className="tag" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>Published</span>}
              {!hasOutput && !isPublished && <span className="tag" style={{ background: 'rgba(251,191,36,0.1)', color: '#d97706' }}>Needs output</span>}
            </div>
            <h3 className="mt-2 text-sm font-semibold leading-snug">{draft.title || '(Untitled experiment)'}</h3>
          </div>
          <div className="flex gap-1 shrink-0">
            <button
              className="icon-button"
              type="button"
              title={isEditing ? 'Close editor' : 'Edit experiment'}
              onClick={() => setEditingId(isEditing ? null : draft.id)}
            >
              {isEditing ? <X size={14} /> : <Pencil size={14} />}
            </button>
            <button
              className="icon-button"
              type="button"
              title={isExpanded ? 'Collapse' : 'Show details'}
              onClick={() => toggleExpand(draft.id)}
            >
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {onRemove && (
              <button className="icon-button" type="button" title="Remove" onClick={onRemove}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Edit panel */}
        {isEditing && (
          <EditPanel
            draft={draft}
            onChange={updateDraft}
            onClose={() => setEditingId(null)}
          />
        )}

        {/* Expanded details */}
        {isExpanded && !isEditing && (
          <div className="space-y-3">
            <p className="text-xs leading-5" style={{ color: 'var(--muted)' }}>{draft.brief}</p>
            <ul className="space-y-1">
              {draft.outcomes.map((o, i) => (
                <li key={i} className="flex items-start gap-2 text-[11px]" style={{ color: 'var(--muted)' }}>
                  <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-cyan-500" />
                  {o}
                </li>
              ))}
            </ul>
            {draft.expectedOutput && (
              <div className="rounded-md border px-3 py-2" style={{ borderColor: 'var(--line)' }}>
                <p className="text-[10px] font-bold uppercase" style={{ color: 'var(--muted)' }}>Expected Output / Observations</p>
                <pre className="mt-1 whitespace-pre-wrap text-xs leading-5" style={{ color: 'var(--ink)' }}>{draft.expectedOutput}</pre>
              </div>
            )}
          </div>
        )}

        {/* Due date + publish */}
        <div className="mt-auto space-y-3 border-t pt-4" style={{ borderColor: 'var(--line)' }}>
          <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
            <CalendarDays size={14} />
            Deadline
            <input
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              value={getDue(draft.id)}
              onChange={(e) => setDueDates((prev) => ({ ...prev, [draft.id]: e.target.value }))}
              className="ml-auto rounded-md border px-2 py-1 text-xs outline-none focus:border-cyan-400"
              style={{ borderColor: 'var(--line)', background: 'var(--surface)', color: 'var(--ink)' }}
            />
          </label>
          <button
            className={'primary-button w-full' + (isPublished ? ' opacity-70' : '')}
            disabled={isPublishing || !draft.title.trim()}
            onClick={() => void publishExperiment(draft)}
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
                ? 'Re-publish to all students'
                : 'Publish to all students'}
          </button>
          {!isPublished && (
            <p className="text-center text-[11px]" style={{ color: 'var(--muted)' }}>
              Visible to all students, including future registrants
            </p>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-7">
      {/* Stats */}
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="metric-panel">
          <p>Total Experiments</p>
          <strong>{totalCount}</strong>
          <span>Curriculum + custom experiments</span>
          <span className="metric-icon cyan"><FlaskConical size={18} /></span>
        </div>
        <div className="metric-panel">
          <p>Published</p>
          <strong>{publishedCount}</strong>
          <span>Visible to all students</span>
          <span className="metric-icon emerald"><CheckCircle2 size={18} /></span>
        </div>
        <div className="metric-panel">
          <p>Enrolled Students</p>
          <strong>{students.length}</strong>
          <span>Future registrants see published work too</span>
          <span className="metric-icon amber"><Send size={18} /></span>
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

      {/* Header + Filter + Add */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-cyan-600">Lab Workspace</p>
          <h2 className="mt-1 text-2xl font-semibold">Publish Experiments</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
            Edit any experiment, set a deadline, and publish — visible to all students, current and future.
          </p>
        </div>
        <div className="flex items-center gap-3">
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
          <button
            className="primary-button"
            type="button"
            onClick={addCustomExperiment}
          >
            <Plus size={15} /> Add Experiment
          </button>
        </div>
      </div>

      {/* Custom experiments first */}
      {filteredCustom.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[.14em]" style={{ color: 'var(--muted)' }}>Custom Experiments</p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredCustom.map((draft) =>
              renderCard(
                drafts[draft.id] || draft,
                () => removeCustomExperiment(draft.id),
              ),
            )}
          </div>
        </div>
      )}

      {/* Curriculum experiments */}
      <div>
        {filteredCustom.length > 0 && (
          <p className="mb-3 text-xs font-bold uppercase tracking-[.14em]" style={{ color: 'var(--muted)' }}>KGR25 Curriculum</p>
        )}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {labExperiments.map((item) => renderCard(getDraft(item)))}
        </div>
      </div>
    </div>
  );
}
