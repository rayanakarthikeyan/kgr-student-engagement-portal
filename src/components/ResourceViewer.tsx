import { BookOpen, CalendarDays, CheckCircle2, Clock3, ExternalLink, FileText, ListVideo, Play, Video } from "lucide-react";
import { useMemo, useState } from "react";
import { usePdfTracker } from "../hooks/usePdfTracker";
import { useVideoTracker } from "../hooks/useVideoTracker";
import type { ActivityLog, LearningResource, SessionUser } from "../platform/types";

interface ResourceViewerProps {
  user: SessionUser;
  resources: LearningResource[];
  onEvent: (event: ActivityLog) => void;
}

function youtubeId(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) return parsed.pathname.split("/").filter(Boolean)[0] || "";
    if (parsed.searchParams.get("v")) return parsed.searchParams.get("v") || "";
    const parts = parsed.pathname.split("/").filter(Boolean);
    const marker = parts.findIndex((part) => ["embed", "shorts", "live"].includes(part));
    return marker >= 0 ? parts[marker + 1] || "" : "";
  } catch {
    return "";
  }
}

function documentPreviewUrl(url: string) {
  if (/drive\.google\.com\/file\/d\//i.test(url)) return url.replace(/\/(view|edit)(\?.*)?$/i, "/preview");
  return url;
}

function dueLabel(value: string) {
  if (!value) return "Open deadline";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : `Due ${date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`;
}

function VideoPlayer({ user, resource, onEvent }: { user: SessionUser; resource: LearningResource; onEvent: (event: ActivityLog) => void }) {
  const { mountRef, progress, watchedSeconds } = useVideoTracker({
    userId: user.id,
    courseId: resource.courseId,
    resourceId: resource.id,
    videoId: youtubeId(resource.externalUrl),
    onEvent,
  });
  return <div><div className="aspect-video overflow-hidden rounded-lg bg-black"><div className="h-full w-full" ref={mountRef}/></div><div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[var(--muted)]"><span className="flex items-center gap-1.5"><Play size={14}/>{Math.floor(watchedSeconds / 60)}m tracked</span><span className="flex items-center gap-1.5"><CheckCircle2 size={14}/>{progress}% complete</span><span>Only active playback is counted</span></div></div>;
}

function PdfPlayer({ user, resource, onEvent }: { user: SessionUser; resource: LearningResource; onEvent: (event: ActivityLog) => void }) {
  const { containerRef, activeSeconds } = usePdfTracker({ userId: user.id, courseId: resource.courseId, resourceId: resource.id, onEvent });
  return <div ref={containerRef}><div className="aspect-[16/10] overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface-2)]"><iframe className="h-full w-full bg-white" src={documentPreviewUrl(resource.externalUrl)} title={resource.title}/></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--muted)]"><span className="flex items-center gap-2"><Clock3 size={14}/>{activeSeconds}s focused reading tracked while this document is visible</span><a className="secondary-button" href={resource.externalUrl} target="_blank" rel="noreferrer">Open in new tab<ExternalLink size={15}/></a></div></div>;
}

export function ResourceViewer({ user, resources, onEvent }: ResourceViewerProps) {
  const [selectedId, setSelectedId] = useState(resources[0]?.id || "");
  const [courseFilter, setCourseFilter] = useState<"all" | "course-java" | "course-dbms">("all");
  const filtered = useMemo(() => resources.filter((item) => courseFilter === "all" || item.courseId === courseFilter), [courseFilter, resources]);
  const selected = filtered.find((item) => item.id === selectedId) || filtered[0];

  if (!selected) return <div className="panel empty-panel min-h-[280px]"><BookOpen size={28}/><span>No theory resources have been assigned to you.</span></div>;

  return (
    <div className="mx-auto grid max-w-[1440px] gap-6 xl:grid-cols-[330px_minmax(0,1fr)]">
      <aside className="panel overflow-hidden">
        <div className="border-b border-[var(--line)] p-4">
          <div className="flex items-center justify-between"><div><h2 className="font-semibold">Assigned theory</h2><p className="mt-1 text-xs text-[var(--muted)]">{filtered.length} videos and readings</p></div><ListVideo size={19} className="text-cyan-500"/></div>
          <div className="segmented-control mt-4 w-full">{[["all", "All"], ["course-java", "JAVA"], ["course-dbms", "DBMS"]].map(([id, label]) => <button className={`flex-1 ${courseFilter === id ? "active" : ""}`} key={id} onClick={() => setCourseFilter(id as typeof courseFilter)} type="button">{label}</button>)}</div>
        </div>
        <div className="max-h-[calc(100vh-250px)] space-y-1 overflow-y-auto p-2">
          {filtered.map((resource) => <button className={`resource-row ${selected.id === resource.id ? "active" : ""}`} key={resource.id} onClick={() => setSelectedId(resource.id)} type="button"><span className={`grid size-9 shrink-0 place-items-center rounded-md ${resource.type === "youtube" ? "bg-cyan-500/10 text-cyan-500" : "bg-amber-500/10 text-amber-500"}`}>{resource.type === "youtube" ? <Video size={17}/> : <FileText size={17}/>}</span><span className="min-w-0 flex-1 text-left"><strong>{resource.title}</strong><small>{resource.courseCode} / Unit {resource.unitNumber} · {resource.durationMinutes} min</small></span></button>)}
        </div>
      </aside>

      <section className="min-w-0">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><div className="flex flex-wrap gap-2"><span className={`tag ${selected.type === "youtube" ? "cyan" : "amber"}`}>{selected.type === "youtube" ? "Video lesson" : "Reading"}</span><span className="tag neutral">{selected.courseCode} / Unit {selected.unitNumber}</span></div><h2 className="mt-3 text-2xl font-semibold">{selected.title}</h2><p className="mt-1 text-sm text-[var(--muted)]">{selected.topic}</p></div>
          <span className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]"><CalendarDays size={15}/>{dueLabel(selected.dueDate)}</span>
        </div>
        <div className="panel p-3 sm:p-5">{selected.type === "youtube" ? <VideoPlayer key={selected.id} user={user} resource={selected} onEvent={onEvent}/> : <PdfPlayer key={selected.id} user={user} resource={selected} onEvent={onEvent}/>}</div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="panel p-4"><span className="text-xs text-[var(--muted)]">Curriculum</span><strong className="mt-2 block text-lg">{selected.courseCode} Unit {selected.unitNumber}</strong></div>
          <div className="panel p-4"><span className="text-xs text-[var(--muted)]">Expected study</span><strong className="mt-2 block text-lg">{selected.durationMinutes} minutes</strong></div>
          <div className="panel p-4"><span className="text-xs text-[var(--muted)]">Tracking</span><strong className="mt-2 flex items-center gap-2 text-lg"><Clock3 size={18}/>Active time only</strong></div>
        </div>
      </section>
    </div>
  );
}
