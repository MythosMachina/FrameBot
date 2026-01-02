"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBase } from "../../lib/api";
import AdminHeader from "../_components/AdminHeader";

type LogEntry = {
  id: string;
  createdAt: string;
  level: "info" | "warn" | "error";
  message: string;
};

export default function AdminLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [level, setLevel] = useState("");
  const [query, setQuery] = useState("");

  const load = async () => {
    const res = await fetch(`${getApiBase()}/admin/me`, {
      credentials: "include",
    });
    if (!res.ok) {
      router.push("/admin/login");
      return;
    }

    const params = new URLSearchParams();
    if (level) params.set("level", level);
    if (query) params.set("q", query);

    const logsRes = await fetch(`${getApiBase()}/admin/logs?${params.toString()}`, {
      credentials: "include",
    });
    if (logsRes.ok) {
      const payload = await logsRes.json();
      setLogs(payload.logs ?? []);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="panel">
      <AdminHeader
        eyebrow="System Logs"
        title="Event Timeline"
        lede="Inspect system activity with filters and timestamps."
      />

      <section className="grid">
        <div className="card">
          <h2>Filters</h2>
          <div className="form-stack">
            <label className="field">
              <span>Level</span>
              <select className="input" value={level} onChange={(e) => setLevel(e.target.value)}>
                <option value="">All</option>
                <option value="info">Info</option>
                <option value="warn">Warn</option>
                <option value="error">Error</option>
              </select>
            </label>
            <label className="field">
              <span>Search</span>
              <input
                className="input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <button className="button" onClick={load}>Apply</button>
          </div>
        </div>

        <div className="card">
          <h2>Logs</h2>
          {logs.length === 0 ? (
            <p>No logs available.</p>
          ) : (
            <div className="list">
              {logs.map((log) => (
                <div className="list-row" key={log.id}>
                  <div>
                    <strong>{log.message}</strong>
                    <span className="muted">
                      {log.level.toUpperCase()} · {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
