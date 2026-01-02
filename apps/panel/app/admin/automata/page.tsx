"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBase } from "../../lib/api";
import AdminHeader from "../_components/AdminHeader";

type AdminUser = { id: string; username: string };

type Automaton = {
  id: string;
  name: string;
  status: "stopped" | "running" | "error";
  createdAt: string;
  owner: { id: string; username: string };
};

export default function AdminAutomataPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [automatons, setAutomatons] = useState<Automaton[]>([]);
  const [ownerId, setOwnerId] = useState("");
  const [name, setName] = useState("");
  const [discordToken, setDiscordToken] = useState("");
  const [guildId, setGuildId] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await fetch(`${getApiBase()}/admin/me`, {
      credentials: "include",
    });
    if (!res.ok) {
      router.push("/admin/login");
      return;
    }

    const usersRes = await fetch(`${getApiBase()}/admin/users`, {
      credentials: "include",
    });
    if (usersRes.ok) {
      const payload = await usersRes.json();
      setUsers(payload.users ?? []);
    }

    const automatonRes = await fetch(`${getApiBase()}/admin/automatons`, {
      credentials: "include",
    });
    if (automatonRes.ok) {
      const payload = await automatonRes.json();
      setAutomatons(payload.automatons ?? []);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    setBusy(true);
    await fetch(`${getApiBase()}/admin/automatons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ownerId, name, discordToken, guildId }),
    });
    setName("");
    setDiscordToken("");
    setGuildId("");
    await load();
    setBusy(false);
  };

  return (
    <main className="panel">
      <AdminHeader
        eyebrow="Automatons"
        title="Provisioning"
        lede="Create and review Automaton instances."
      />

      <section className="grid">
        <div className="card form-card">
          <h2>Create Automaton</h2>
          <div className="form-stack">
            <label className="field">
              <span>Owner</span>
              <select className="input" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
                <option value="">Select user</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Name</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="field">
              <span>Discord token</span>
              <input
                className="input"
                value={discordToken}
                onChange={(e) => setDiscordToken(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Guild ID (optional)</span>
              <input className="input" value={guildId} onChange={(e) => setGuildId(e.target.value)} />
            </label>
            <button className="button" onClick={create} disabled={busy}>
              {busy ? "Working..." : "Create"}
            </button>
          </div>
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
                  <span className="tag">{new Date(automaton.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
