import { motion } from "framer-motion";
import { ArrowRight, BookOpenCheck, Check, CircleAlert, Command, Eye, EyeOff, KeyRound, Mail, Moon, ShieldCheck, Sun, UserRound } from "lucide-react";
import { useState } from "react";
import { login, registerStudent } from "../platform/api";
import type { AuthSession } from "../platform/types";

interface AuthScreenProps { onAuthenticated: (session: AuthSession) => void; theme: "light" | "dark"; onToggleTheme: () => void; }

export function AuthScreen({ onAuthenticated, theme, onToggleTheme }: AuthScreenProps) {
  const [registering, setRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", rollNumber: "", password: "", contactNumber: "", department: "", section: "" });

  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const session = registering
        ? await registerStudent(form)
        : await login(form.email, form.password);
      onAuthenticated(session);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page min-h-screen overflow-hidden bg-[var(--page)] text-[var(--ink)]">
      <button className="icon-button fixed right-5 top-5 z-30" onClick={onToggleTheme} type="button" aria-label={`Use ${theme === "light" ? "dark" : "light"} theme`} title={`Use ${theme === "light" ? "dark" : "light"} theme`}>{theme === "light" ? <Moon size={18} /> : <Sun size={18} />}</button>
      <div className="mx-auto grid min-h-screen max-w-[1480px] lg:grid-cols-[1.08fr_.92fr]">
        <section className="auth-showcase relative hidden min-h-screen flex-col justify-between border-r border-[var(--line)] p-12 lg:flex xl:p-16">
          <div className="auth-grid absolute inset-0 opacity-70" />
          <div className="relative z-10 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-lg bg-cyan-400 text-slate-950"><Command size={23} strokeWidth={2.5} /></span>
            <div><strong className="block text-base text-[var(--ink)]">KG Reddy College of Engineering and Technology</strong><span className="text-xs text-[var(--muted)]">Academic Learning Platform</span></div>
          </div>

          <div className="relative z-10 max-w-[620px]">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45 }}>
              <span className="auth-kicker mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"><span className="size-1.5 rounded-full bg-cyan-500" />Learning, measured with purpose</span>
              <h1 className="max-w-[600px] text-5xl font-semibold leading-[1.08] text-[var(--ink)] xl:text-6xl">Theory becomes practice here.</h1>
              <p className="mt-6 max-w-[560px] text-lg leading-8 text-[var(--muted)]">The academic workspace for KG Reddy College of Engineering and Technology students, with guided theory, practice, proctored assessment, and instrumented labs.</p>
            </motion.div>
            <div className="mt-12 grid grid-cols-3 gap-4">
              {[
                [BookOpenCheck, "External resources", "Zero platform storage"],
                [ShieldCheck, "Integrity controls", "Proctored by default"],
                [Command, "Practice telemetry", "See the learning process"],
              ].map(([Icon, title, note]) => {
                const FeatureIcon = Icon as typeof Command;
                return <div className="border-l border-[var(--line)] pl-4" key={String(title)}><FeatureIcon size={19} className="mb-3 text-[var(--accent)]" /><strong className="block text-sm text-[var(--ink)]">{String(title)}</strong><span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{String(note)}</span></div>;
              })}
            </div>
          </div>

          <p className="relative z-10 text-xs text-[var(--muted)]">Built for accountable, accessible academic learning.</p>
        </section>

        <section className="flex min-h-screen items-center justify-center p-5 sm:p-8 lg:p-12">
          <motion.div className="w-full max-w-[470px]" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .35 }}>
            <div className="mb-9 flex items-center gap-3 lg:hidden"><span className="grid size-10 place-items-center rounded-lg bg-cyan-400 text-slate-950"><Command size={21} /></span><div><strong className="block">KG Reddy College of Engineering and Technology</strong><span className="text-xs text-[var(--muted)]">Academic Learning Platform</span></div></div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--accent)]">Secure access</p>
            <h2 className="mt-3 text-3xl font-semibold text-[var(--ink)]">{registering ? "Create your student account" : "Welcome back"}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{registering ? "Use your institutional details to begin enrollment." : "Sign in to continue to your academic workspace."}</p>

            <form className="mt-8 space-y-5" onSubmit={submit}>
              {registering && <div className="grid gap-4 sm:grid-cols-2">
                <label className="auth-label sm:col-span-2">College<span className="mt-2 block rounded-md border border-[var(--line)] bg-[var(--surface)] p-3 text-sm leading-5 text-[var(--ink)]">KG Reddy College of Engineering and Technology</span></label>
                <label className="auth-label sm:col-span-2">Contact number<span className="auth-input"><input required type="tel" autoComplete="tel" placeholder="10-digit mobile number" maxLength={16} value={form.contactNumber} onChange={(event) => update("contactNumber", event.target.value)} /></span></label>
                <label className="auth-label">Department<select className="profile-select" required value={form.department} onChange={(event) => update("department", event.target.value)}><option value="">Select department</option>{["CSE", "CSM", "CSD"].map((value) => <option key={value}>{value}</option>)}</select></label>
                <label className="auth-label">Section<select className="profile-select" required value={form.section} onChange={(event) => update("section", event.target.value)}><option value="">Select section</option>{["A", "B", "C", "D", "E"].map((value) => <option key={value}>{value}</option>)}</select></label>
              </div>}
              {error && <div className="auth-error flex items-start gap-2 rounded-lg border px-3 py-3 text-sm"><CircleAlert size={17} className="mt-0.5 shrink-0" />{error}</div>}
              {registering && <div className="grid gap-5 sm:grid-cols-2">
                <label className="auth-label">Full name<span className="auth-input"><UserRound size={18} /><input required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Aarav Mehta" /></span></label>
                <label className="auth-label">Roll number<span className="auth-input"><BookOpenCheck size={18} /><input required value={form.rollNumber} onChange={(e) => update("rollNumber", e.target.value)} placeholder="22CSE041" /></span></label>
              </div>}
              <label className="auth-label">Email address<span className="auth-input"><Mail size={18} /><input autoComplete="email" required type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="name@kgr.ac.in" /></span></label>
              <label className="auth-label">Password<span className="auth-input"><KeyRound size={18} /><input required minLength={8} type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="At least 8 characters" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
              {registering && <p className="flex items-center gap-2 text-xs text-[var(--muted)]"><Check size={14} className="text-emerald-500" />By continuing, you agree to the academic integrity policy.</p>}
              <button className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-cyan-400 px-4 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60" disabled={loading} type="submit">{loading ? "Please wait..." : registering ? "Create account" : "Sign in"}<ArrowRight size={17} /></button>
            </form>

            <p className="mt-7 text-center text-sm text-[var(--muted)]">{registering ? "Already registered?" : "New student?"} <button className="font-semibold text-[var(--accent)]" onClick={() => { setRegistering((value) => !value); setError(""); setForm({ name: "", email: "", rollNumber: "", password: "", contactNumber: "", department: "", section: "" }); }} type="button">{registering ? "Sign in" : "Create an account"}</button></p>
          </motion.div>
        </section>
      </div>
    </main>
  );
}
