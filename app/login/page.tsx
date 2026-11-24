"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { sb, configured } from "@/lib/supabase";
import SetupNotice from "@/components/SetupNotice";

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ kind: "err" | "ok"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (!configured) return <SetupNotice />;

  async function forgot() {
    if (!email) { setMsg({ kind: "err", text: "Enter your email above first." }); return; }
    setBusy(true);
    const { error } = await sb().auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset" });
    setMsg(error ? { kind: "err", text: error.message } : { kind: "ok", text: "If that email has an account, a reset link is on its way." });
    setBusy(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    if (mode === "in") {
      const { error } = await sb().auth.signInWithPassword({ email, password });
      if (error) setMsg({ kind: "err", text: error.message });
      else router.replace("/dashboard");
    } else {
      const { data, error } = await sb().auth.signUp({ email, password });
      if (error) setMsg({ kind: "err", text: error.message });
      else if (data.session) router.replace("/dashboard");
      else setMsg({ kind: "ok", text: "Account created. Check your email to confirm it, then sign in." });
    }
    setBusy(false);
  }

  return (
    <div className="center">
      <form className="card authbox grid" onSubmit={submit}>
        <div className="brand">
          <div className="logo">V</div>
          <h1 style={{ fontSize: 22 }}>VyaparOne</h1>
        </div>
        <p className="note" style={{ margin: 0, fontSize: 14 }}>
          {mode === "in" ? "Sign in to your business account." : "Create your business account."}
        </p>
        {msg && <div className={msg.kind === "err" ? "err" : "okmsg"}>{msg.text}</div>}
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password" type="password" required minLength={8}
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className="pri" disabled={busy}>{busy ? "Please wait" : mode === "in" ? "Sign in" : "Create account"}</button>
        {mode === "in" && <button type="button" onClick={forgot} disabled={busy}>Forgot password?</button>}
        <button type="button" onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(null); }}>
          {mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}
        </button>
        <a href="/case-study" style={{ fontSize: 13, textAlign: "center" }}>Read the case study</a>
      </form>
    </div>
  );
}
