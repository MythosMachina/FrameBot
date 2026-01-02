"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PanelHeader from "./_components/PanelHeader";
import { getApiBase } from "./lib/api";

export default function HomePage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const check = async () => {
      const res = await fetch(`${getApiBase()}/auth/me`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const payload = await res.json();
      const user = payload.user;
      if (user?.role === "admin") {
        router.push("/admin/dashboard");
      } else if (user?.role === "user") {
        router.push("/user");
      }
    };
    check();
  }, []);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch(`${getApiBase()}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Login failed.");
      setBusy(false);
      return;
    }
    const data = await res.json();
    if (data.role === "admin") {
      router.push("/admin/dashboard");
    } else {
      router.push("/user");
    }
  };

  return (
    <main className="panel">
      <PanelHeader
        eyebrow="FrameBot"
        title="Control Panel Login"
        lede="Sign in to manage Automatons or oversee the system."
      />
      <section className="card form-card">
        <h2>Access</h2>
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
              autoComplete="current-password"
            />
          </label>
          {error ? <div className="error">{error}</div> : null}
          <button className="button" onClick={submit} disabled={busy}>
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </div>
      </section>
    </main>
  );
}
