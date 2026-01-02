"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBase } from "../../lib/api";
import AdminHeader from "../_components/AdminHeader";

type Ticket = {
  id: string;
  title: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  category: string | null;
  adminReply: string | null;
  createdAt: string;
  createdBy: { id: string; username: string };
};

export default function AdminTicketingPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [status, setStatus] = useState<Ticket["status"]>("open");
  const [priority, setPriority] = useState<Ticket["priority"]>("normal");
  const [category, setCategory] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await fetch(`${getApiBase()}/admin/me`, {
      credentials: "include",
    });
    if (!res.ok) {
      router.push("/admin/login");
      return;
    }

    const ticketsRes = await fetch(`${getApiBase()}/admin/tickets`, {
      credentials: "include",
    });
    if (ticketsRes.ok) {
      const payload = await ticketsRes.json();
      setTickets(payload.tickets ?? []);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selectTicket = (ticket: Ticket) => {
    setSelected(ticket);
    setStatus(ticket.status);
    setPriority(ticket.priority);
    setCategory(ticket.category ?? "");
    setReply(ticket.adminReply ?? "");
  };

  const save = async () => {
    if (!selected) return;
    setBusy(true);
    await fetch(`${getApiBase()}/admin/tickets/${selected.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status, priority, category, adminReply: reply }),
    });
    await load();
    setBusy(false);
  };

  return (
    <main className="panel">
      <AdminHeader
        eyebrow="Ticketing"
        title="Internal Support"
        lede="Review, categorize, and respond to user tickets."
      />

      <section className="grid">
        <div className="card">
          <h2>Incoming Tickets</h2>
          {tickets.length === 0 ? (
            <p>No tickets available.</p>
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
                  onClick={() => selectTicket(ticket)}
                >
                  <div>
                    <strong>{ticket.title}</strong>
                    <span className="muted">{ticket.createdBy.username}</span>
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
            <p>Select a ticket to manage it.</p>
          ) : (
            <div className="form-stack">
              <div>
                <strong>{selected.title}</strong>
                <p className="muted">{selected.description}</p>
              </div>
              <label className="field">
                <span>Status</span>
                <select className="input" value={status} onChange={(e) => setStatus(e.target.value as Ticket["status"])}>
                  <option value="open">Open</option>
                  <option value="in_progress">In progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
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
              <label className="field">
                <span>Category</span>
                <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} />
              </label>
              <label className="field">
                <span>Admin reply</span>
                <textarea
                  className="input"
                  rows={5}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                />
              </label>
              <button className="button" onClick={save} disabled={busy}>
                {busy ? "Saving..." : "Save changes"}
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
