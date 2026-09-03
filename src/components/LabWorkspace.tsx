import Editor from "@monaco-editor/react";
import { AlertCircle, Braces, Check, ChevronDown, Clock3, Code2, FileCode2, History, Lightbulb, LoaderCircle, Play, RotateCcw, Send, TerminalSquare } from "lucide-react";
import { useMemo, useState } from "react";
import { useEditorTelemetry } from "../hooks/useEditorTelemetry";
import { runCode } from "../platform/api";
import { labChallenges } from "../platform/demo";
import type { ActivityLog, AuthSession } from "../platform/types";

interface LabWorkspaceProps { session: AuthSession; onEvent: (event: ActivityLog) => void; theme: "light" | "dark"; }

export function LabWorkspace({ session, onEvent, theme }: LabWorkspaceProps) {
  const [challengeId, setChallengeId] = useState(labChallenges[0].id);
  const challenge = useMemo(() => labChallenges.find((item) => item.id === challengeId) || labChallenges[0], [challengeId]);
  const [codeByChallenge, setCodeByChallenge] = useState<Record<string, string>>(() => Object.fromEntries(labChallenges.map((item) => [item.id, item.starterCode])));
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState({ status: "idle" as "idle" | "passed" | "failed" | "error", stdout: "Run your code to see output.", stderr: "", durationMs: 0 });
  const [bottomTab, setBottomTab] = useState<"output" | "timeline">("output");
  const code = codeByChallenge[challenge.id] || challenge.starterCode;
  const telemetry = useEditorTelemetry({ userId: session.user.id, courseId: challenge.courseId, challengeId: challenge.id, onEvent });

  const execute = async () => {
    setRunning(true);
    setBottomTab("output");
    try {
      const result = await runCode(session.token, { language: challenge.language, code, stdin: challenge.sampleInput });
      setOutput(result);
      telemetry.recordRun(result);
    } catch (caught) {
      const result = { status: "error" as const, stdout: "", stderr: caught instanceof Error ? caught.message : "Runner unavailable", durationMs: 0 };
      setOutput(result);
      telemetry.recordRun(result);
    } finally { setRunning(false); }
  };

  const selectChallenge = (id: string) => {
    setChallengeId(id);
    setOutput({ status: "idle", stdout: "Run your code to see output.", stderr: "", durationMs: 0 });
  };

  return (
    <div className="lab-shell mx-auto max-w-[1540px] overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] shadow-xl shadow-slate-900/5">
      <header className="flex min-h-14 flex-wrap items-center gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-3 sm:px-4">
        <span className="flex items-center gap-2 text-sm font-semibold"><Braces size={18} className="text-[var(--accent)]" />Practice Lab</span><span className="hidden h-5 w-px bg-[var(--line)] sm:block" />
        <label className="relative min-w-0 flex-1 sm:max-w-[380px]"><select className="h-9 w-full appearance-none rounded-md border border-[var(--line)] bg-[var(--surface-2)] pl-3 pr-9 text-xs font-medium text-[var(--ink)] outline-none focus:border-cyan-500" value={challengeId} onChange={(e) => selectChallenge(e.target.value)}>{labChallenges.map((item) => <option value={item.id} key={item.id}>{item.language.toUpperCase()} · {item.title}</option>)}</select><ChevronDown size={14} className="pointer-events-none absolute right-3 top-3 text-[var(--muted)]" /></label>
        <span className="ml-auto hidden items-center gap-2 text-xs text-[var(--muted)] md:flex"><Clock3 size={14} />Autosaved locally</span>
        <button className="lab-button" disabled={running} onClick={() => void execute()} type="button">{running ? <LoaderCircle size={15} className="animate-spin" /> : <Play size={15} />}Run</button>
        <button className="lab-button primary" onClick={() => { telemetry.recordSubmit(); setBottomTab("timeline"); }} type="button"><Send size={15} />Submit</button>
      </header>

      <div className="grid min-h-[720px] lg:grid-cols-[minmax(310px,38%)_minmax(0,62%)]">
        <aside className="overflow-y-auto border-b border-[var(--line)] bg-[var(--surface-2)] lg:border-b-0 lg:border-r">
          <div className="border-b border-[var(--line)] px-5 py-4"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.13em] text-[var(--accent)]"><FileCode2 size={14} />Problem statement</div><h2 className="mt-3 text-xl font-semibold text-[var(--ink)]">{challenge.title}</h2><p className="mt-1 text-xs text-[var(--muted)]">{challenge.topic} · {challenge.language.toUpperCase()}</p></div>
          <div className="space-y-6 p-5 text-sm leading-6 text-[var(--muted)]"><section><h3 className="problem-heading">Task</h3><p className="mt-2">{challenge.statement}</p></section><section className="lab-theory-bridge rounded-md border p-4"><h3 className="flex items-center gap-2 text-xs font-semibold text-[var(--accent)]"><Lightbulb size={15} />Theory bridge</h3><p className="mt-2 text-xs leading-5 text-[var(--muted)]">{challenge.concept}</p></section><section><h3 className="problem-heading">Constraints</h3><ul className="mt-2 space-y-1 font-mono text-xs">{challenge.constraints.map((item) => <li key={item}>• {item}</li>)}</ul></section><section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"><div><h3 className="problem-heading">Sample input</h3><pre className="code-sample">{challenge.sampleInput}</pre></div><div><h3 className="problem-heading">Expected output</h3><pre className="code-sample">{challenge.expectedOutput}</pre></div></section><details className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-4"><summary className="cursor-pointer text-xs font-semibold text-amber-500">Reveal conceptual hint</summary><p className="mt-3 text-xs leading-5">{challenge.hint}</p></details></div>
        </aside>

        <section className="grid min-h-[720px] min-w-0 grid-rows-[minmax(390px,58%)_minmax(260px,42%)]">
          <div className="min-h-0 border-b border-[var(--line)]">
            <div className="flex h-10 items-center border-b border-[var(--line)] bg-[var(--surface)] px-3"><span className="flex h-full items-center gap-2 border-b-2 border-cyan-500 px-2 text-xs text-[var(--ink)]"><Code2 size={14} className="text-[var(--accent)]" />Main.{challenge.language === "java" ? "java" : "sql"}</span><button className="ml-auto p-2 text-[var(--muted)] hover:text-[var(--accent)]" onClick={() => setCodeByChallenge((current) => ({ ...current, [challenge.id]: challenge.starterCode }))} type="button" title="Reset starter code"><RotateCcw size={14} /></button></div>
            <Editor
              height="calc(100% - 40px)"
              language={challenge.language}
              onChange={(value) => { setCodeByChallenge((current) => ({ ...current, [challenge.id]: value || "" })); telemetry.handleChange(value); }}
              onMount={telemetry.handleMount}
              options={{ minimap: { enabled: false }, fontSize: 14, lineHeight: 22, padding: { top: 14 }, scrollBeyondLastLine: false, automaticLayout: true, tabSize: 2, wordWrap: "on", suggestOnTriggerCharacters: true }}
              theme={theme === "dark" ? "vs-dark" : "light"}
              value={code}
            />
          </div>

          <div className="min-h-0 bg-[var(--surface)]">
            <div className="flex h-10 items-center border-b border-[var(--line)] px-3"><button className={`lab-tab ${bottomTab === "output" ? "active" : ""}`} onClick={() => setBottomTab("output")} type="button"><TerminalSquare size={14} />Output</button><button className={`lab-tab ${bottomTab === "timeline" ? "active" : ""}`} onClick={() => setBottomTab("timeline")} type="button"><History size={14} />Attempt timeline <span>{telemetry.timeline.length}</span></button>{output.status !== "idle" && <span className={`ml-auto flex items-center gap-1.5 text-[11px] ${output.status === "passed" ? "text-emerald-600" : "text-rose-600"}`}>{output.status === "passed" ? <Check size={13} /> : <AlertCircle size={13} />}{output.status} · {output.durationMs}ms</span>}</div>
            {bottomTab === "output" ? <div className="grid h-[calc(100%_-_40px)] min-h-0 md:grid-cols-2"><div className="border-b border-[var(--line)] p-4 md:border-b-0 md:border-r"><p className="terminal-label">Expected output</p><pre className="terminal-output text-[var(--ink)]">{challenge.expectedOutput}</pre></div><div className="p-4"><p className="terminal-label">Actual output</p>{running ? <div className="mt-5 flex items-center gap-2 text-xs text-[var(--accent)]"><LoaderCircle size={15} className="animate-spin" />Compiling and running...</div> : <pre className={`terminal-output ${output.status === "passed" ? "text-emerald-500" : output.status === "idle" ? "text-[var(--muted)]" : "text-rose-500"}`}>{output.stderr || output.stdout}</pre>}</div></div> : <div className="max-h-[240px] overflow-y-auto p-4">{telemetry.timeline.length === 0 ? <div className="grid h-36 place-items-center text-center text-xs text-[var(--muted)]"><span><History size={24} className="mx-auto mb-2" />Run code or paste into the editor to begin the attempt timeline.</span></div> : <div className="space-y-2">{telemetry.timeline.toReversed().map((item) => <div className="flex gap-3 rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-3" key={item.id}><span className={`mt-1 size-2 shrink-0 rounded-full ${item.severity === "success" ? "bg-emerald-500" : item.severity === "error" ? "bg-rose-500" : item.severity === "warning" ? "bg-amber-500" : "bg-slate-400"}`} /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="text-xs text-[var(--ink)]">{item.label}</strong><span className="text-[10px] text-[var(--muted)]">{new Date(item.timestamp).toLocaleTimeString()}</span></div><p className="mt-1 truncate text-[11px] text-[var(--muted)]">{item.detail}</p></div></div>)}</div>}</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
