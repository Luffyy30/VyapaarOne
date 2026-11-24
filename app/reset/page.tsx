"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sb, configured } from "@/lib/supabase";
import SetupNotice from "@/components/SetupNotice";

export default function Reset() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<{ kind: "err" | "ok"; text: string } | null>(null);

  useEffect(() => {
    if (!configured) return;
    const { data } = sb().auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    sb().auth.getSession().then((r) => { if (r.data.session) setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!configured) return <SetupNotice />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await sb().auth.updateUser({ password: pw });
    if (error) setMsg({ kind: "err", text: error.message });
    else { setMsg({ kind: "ok", text: "Password changed. Taking you to your dashboard." }); setTimeout(() => router.replace("/dashboard"), 1200); }
  }

  return (
    <div className="center">
      <form className="card authbox grid" onSubmit={submit}>
        <h2>Choose a new password</h2>
        {msg && <div className={msg.kind === "err" ? "err" : "okmsg"}>{msg.text}</div>}
        {!ready ? (
          <p className="note" style={{ margin: 0, fontSize: 14 }}>Open this page from the link in your password reset email.</p>
        ) : (
          <>
            <div>
              <label htmlFor="npw">New password</label>
              <input id="npw" type="password" required minLength={8} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
            </div>
            <button className="pri">Save password</button>
          </>
        )}
      </form>
    </div>
  );
}
