"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PanelHeader from "../../_components/PanelHeader";
import { getApiBase } from "../../lib/api";

type Ticket = {
  id: string;
  title: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  category: string | null;
  adminReply: string | null;
  createdAt: string;
};

export default function UserSupportPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Ticket["priority"]>("normal");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch(`${getApiBase()}/auth/me`, { credentials: "include" });
    if (!res.ok) {
      router.push("/");
      return;
    }
    const payload = await res.json();
    const user = payload.user;
    if (!user) {
      router.push("/");
      return;
    }
    if (user.role === "admin") {
      router.push("/admin/dashboard");
      return;
    }

    const ticketsRes = await fetch(`${getApiBase()}/user/tickets`, {
      credentials: "include",
    });
    if (ticketsRes.ok) {
      const data = await ticketsRes.json();
      setTickets(data.tickets ?? []);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createTicket = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch(`${getApiBase()}/user/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title, description, priority }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Request failed.");
      setBusy(false);
      return;
    }
    setTitle("");
    setDescription("");
    setPriority("normal");
    setShowCreate(false);
    await load();
    setBusy(false);
  };

  const updateTicket = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`${getApiBase()}/user/tickets/${selected.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        title: selected.title,
        description: selected.description,
        priority: selected.priority,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Update failed.");
      setBusy(false);
      return;
    }
    await load();
    setBusy(false);
  };

  const markResolved = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`${getApiBase()}/user/tickets/${selected.id}/resolve`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Update failed.");
      setBusy(false);
      return;
    }
    await load();
    setBusy(false);
  };

  return (
    <main className="panel">
      <PanelHeader
        eyebrow="Support"
        title="Ticket Desk"
        lede="Create tickets and track progress with the team."
      />

      <div className="toolbar">
        <button className="button" onClick={() => setShowCreate(true)}>
          New ticket
        </button>
      </div>

      <section className="grid">
        <div className="card">
          <h2>Your Tickets</h2>
          {tickets.length === 0 ? (
            <p>No tickets submitted yet.</p>
          ) : (
            <div className="list">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  className={
                    selected?.id === ticket.id
                      ? "list-row selectable active"
                      : "list-row selectable"
                  }
                  onClick={() => setSelected(ticket)}
                >
                  <div>
                    <strong>{ticket.title}</strong>
                    <span className="muted">
                      {ticket.status.replace("_", " ")} · {ticket.priority}
                    </span>
                  </div>
                  <span className="tag">{new Date(ticket.createdAt).toLocaleString()}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card form-card">
          <h2>Ticket Detail</h2>
          {!selected ? (
            <p>Select a ticket to view or edit.</p>
          ) : (
            <div className="form-stack">
              <label className="field">
                <span>Title</span>
                <input
                  className="input"
                  value={selected.title}
                  onChange={(e) =>
                    setSelected({ ...selected, title: e.target.value })
                  }
                  disabled={selected.status === "closed" || selected.status === "resolved"}
                />
              </label>
              <label className="field">
                <span>Description</span>
                <textarea
                  className="input"
                  rows={4}
                  value={selected.description}
                  onChange={(e) =>
                    setSelected({ ...selected, description: e.target.value })
                  }
                  disabled={selected.status === "closed" || selected.status === "resolved"}
                />
              </label>
              <label className="field">
                <span>Priority</span>
                <select
                  className="input"
                  value={selected.priority}
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      priority: e.target.value as Ticket["priority"],
                    })
                  }
                  disabled={selected.status === "closed" || selected.status === "resolved"}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>
              {selected.category ? (
                <div className="muted">Category: {selected.category}</div>
              ) : null}
              {selected.adminReply ? (
                <div className="reply-box">
                  <strong>Admin reply</strong>
                  <p>{selected.adminReply}</p>
                </div>
              ) : null}
              {error ? <div className="error">{error}</div> : null}
              <div className="button-row">
                <button
                  className="button"
                  onClick={updateTicket}
                  disabled={busy || selected.status === "closed" || selected.status === "resolved"}
                >
                  {busy ? "Saving..." : "Save"}
                </button>
                {selected.status !== "closed" && selected.status !== "resolved" ? (
                  <button className="button ghost" onClick={markResolved} disabled={busy}>
                    Mark as resolved
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </section>

      {showCreate ? (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Create Ticket</h2>
            <div className="form-stack">
              <label className="field">
                <span>Title</span>
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
              </label>
              <label className="field">
                <span>Description</span>
                <textarea
                  className="input"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Priority</span>
                <select
                  className="input"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Ticket["priority"])}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>
              {error ? <div className="error">{error}</div> : null}
              <div className="button-row">
                <button className="button" onClick={createTicket} disabled={busy}>
                  {busy ? "Working..." : "Create"}
                </button>
                <button className="button ghost" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
