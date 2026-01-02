"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBase } from "../../lib/api";

type BootstrapStatus = {
  adminExists: boolean;
};

export default function AdminLoginPage() {
  const router = useRouter();
  const [status, setStatus] = useState<BootstrapStatus | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`${getApiBase()}/admin/bootstrap/status`, {
        credentials: "include",
      });
      if (res.ok) {
        setStatus(await res.json());
      }
    };
    load();
  }, []);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const endpoint = status?.adminExists ? "/admin/login" : "/admin/bootstrap";
      const res = await fetch(`${getApiBase()}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Request failed.");
        return;
      }
      router.push("/admin/dashboard");
    } catch (err) {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="panel">
      <header className="masthead">
        <div className="brand">
          <span className="sigil" aria-hidden="true">
            <svg className="gear-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M11.42 2.255a.75.75 0 0 1 1.16 0l1.14 1.52c.257.343.72.47 1.117.306l1.768-.72a.75.75 0 0 1 .99.617l.188 1.89c.043.43.38.767.81.81l1.89.188a.75.75 0 0 1 .617.99l-.72 1.768a.75.75 0 0 0 .306 1.117l1.52 1.14a.75.75 0 0 1 0 1.16l-1.52 1.14a.75.75 0 0 0-.306 1.117l.72 1.768a.75.75 0 0 1-.617.99l-1.89.188a.75.75 0 0 0-.81.81l-.188 1.89a.75.75 0 0 1-.99.617l-1.768-.72a.75.75 0 0 0-1.117.306l-1.14 1.52a.75.75 0 0 1-1.16 0l-1.14-1.52a.75.75 0 0 0-1.117-.306l-1.768.72a.75.75 0 0 1-.99-.617l-.188-1.89a.75.75 0 0 0-.81-.81l-1.89-.188a.75.75 0 0 1-.617-.99l.72-1.768a.75.75 0 0 0-.306-1.117l-1.52-1.14a.75.75 0 0 1 0-1.16l1.52-1.14a.75.75 0 0 0 .306-1.117l-.72-1.768a.75.75 0 0 1 .617-.99l1.89-.188a.75.75 0 0 0 .81-.81l.188-1.89a.75.75 0 0 1 .99-.617l1.768.72a.75.75 0 0 0 1.117-.306l1.14-1.52ZM12 8.25a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5Z"
              />
            </svg>
          </span>
          <div>
            <p className="eyebrow">Admin Access</p>
            <h1>{status?.adminExists ? "Sign in" : "Bootstrap Admin"}</h1>
          </div>
        </div>
        <p className="lede">
          {status?.adminExists
            ? "Authenticate to manage users and Automaton limits."
            : "Create the first overseer account to bring the system online."}
        </p>
      </header>

      <section className="card form-card">
        <div className="form-stack">
          <label className="field">
            <span>Username</span>
            <input
              className="input"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={status?.adminExists ? "current-password" : "new-password"}
            />
          </label>
          {error ? <div className="error">{error}</div> : null}
          <button className="button" onClick={submit} disabled={busy}>
            {busy ? "Working..." : status?.adminExists ? "Sign in" : "Create Admin"}
          </button>
        </div>
      </section>
    </main>
  );
}
