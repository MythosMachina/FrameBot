"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBase } from "../../lib/api";
import AdminHeader from "../_components/AdminHeader";

type AdminAutomaton = {
  id: string;
  name: string;
  status: "stopped" | "running" | "error";
  createdAt: string;
  owner: { id: string; username: string };
};

type AdminSelf = {
  id: string;
  username: string;
  role: "admin" | "user";
};

type AdminStats = {
  users: number;
  automatons: number;
  gears: number;
  uptimeSeconds: number;
  loadAvg: number[];
  memory: { total: number; free: number };
  cpuCount: number;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [me, setMe] = useState<AdminSelf | null>(null);
  const [automatons, setAutomatons] = useState<AdminAutomaton[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch(`${getApiBase()}/admin/me`, {
      credentials: "include",
    });
    if (!res.ok) {
      router.push("/admin/login");
      return;
    }
    const data = await res.json();
    setMe(data);

    const automatonRes = await fetch(`${getApiBase()}/admin/automatons`, {
      credentials: "include",
    });
    if (automatonRes.ok) {
      const payload = await automatonRes.json();
      setAutomatons(payload.automatons ?? []);
    }

    const statsRes = await fetch(`${getApiBase()}/admin/stats`, {
      credentials: "include",
    });
    if (statsRes.ok) {
      const payload = await statsRes.json();
      setStats(payload);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startAutomaton = async (id: string) => {
    setBusyId(id);
    await fetch(`${getApiBase()}/admin/automatons/${id}/start`, {
      method: "POST",
      credentials: "include",
    });
    await load();
    setBusyId(null);
  };

  const stopAutomaton = async (id: string) => {
    setBusyId(id);
    await fetch(`${getApiBase()}/admin/automatons/${id}/stop`, {
      method: "POST",
      credentials: "include",
    });
    await load();
    setBusyId(null);
  };

  return (
    <main className="panel">
      <AdminHeader
        eyebrow="Dashboard"
        title="System Overview"
        lede={me ? `Signed in as ${me.username}.` : "Loading session..."}
      />

      <section className="grid">
        <div className="card">
          <h2>System Stats</h2>
          {!stats ? (
            <p>Stats unavailable.</p>
          ) : (
            <div className="stats-grid">
              <div className="stat">
                <span className="stat-label">Users</span>
                <strong>{stats.users}</strong>
              </div>
              <div className="stat">
                <span className="stat-label">Automatons</span>
                <strong>{stats.automatons}</strong>
              </div>
              <div className="stat">
                <span className="stat-label">Gears</span>
                <strong>{stats.gears}</strong>
              </div>
              <div className="stat">
                <span className="stat-label">Uptime</span>
                <strong>{Math.floor(stats.uptimeSeconds / 60)} min</strong>
              </div>
              <div className="stat">
                <span className="stat-label">Load Avg</span>
                <strong>{stats.loadAvg.map((v) => v.toFixed(2)).join(" / ")}</strong>
              </div>
              <div className="stat">
                <span className="stat-label">CPU Cores</span>
                <strong>{stats.cpuCount}</strong>
              </div>
              <div className="stat">
                <span className="stat-label">Memory</span>
                <strong>
                  {Math.round((stats.memory.total - stats.memory.free) / 1024 / 1024)} MB /{" "}
                  {Math.round(stats.memory.total / 1024 / 1024)} MB
                </strong>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h2>Automatons</h2>
          {automatons.length === 0 ? (
            <p>No automatons created yet.</p>
          ) : (
            <div className="list">
              {automatons.map((automaton) => (
                <div className="list-row" key={automaton.id}>
                  <div>
                    <strong>{automaton.name}</strong>
                    <span className="muted">
                      Owner {automaton.owner.username} · {automaton.status}
                    </span>
                  </div>
                  <div className="row-actions">
                    <span className="tag">
                      {new Date(automaton.createdAt).toLocaleString()}
                    </span>
                    {automaton.status === "running" ? (
                      <button
                        className="button ghost"
                        onClick={() => stopAutomaton(automaton.id)}
                        disabled={busyId === automaton.id}
                      >
                        Stop
                      </button>
                    ) : (
                      <button
                        className="button"
                        onClick={() => startAutomaton(automaton.id)}
                        disabled={busyId === automaton.id}
                      >
                        Start
                      </button>
                    )}
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
