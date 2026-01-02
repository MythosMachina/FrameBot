"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBase } from "../../lib/api";
import AdminHeader from "../_components/AdminHeader";

type AdminUser = {
  id: string;
  username: string;
  botLimit: number;
  createdAt: string;
  automatonCount: number;
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [botLimit, setBotLimit] = useState(1);
  const [editId, setEditId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editBotLimit, setEditBotLimit] = useState(0);

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
  };

  useEffect(() => {
    load();
  }, []);

  const createUser = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${getApiBase()}/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password, botLimit }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Request failed.");
        return;
      }
      setUsername("");
      setPassword("");
      setBotLimit(1);
      await load();
    } catch (err) {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  };

  const beginEdit = (user: AdminUser) => {
    setEditId(user.id);
    setEditUsername(user.username);
    setEditPassword("");
    setEditBotLimit(user.botLimit);
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditUsername("");
    setEditPassword("");
    setEditBotLimit(0);
  };

  const saveEdit = async () => {
    if (!editId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${getApiBase()}/admin/users/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: editUsername,
          password: editPassword || undefined,
          botLimit: editBotLimit,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Request failed.");
        return;
      }
      cancelEdit();
      await load();
    } catch (err) {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  };

  const deleteUser = async (userId: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${getApiBase()}/admin/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Request failed.");
        return;
      }
      await load();
    } catch (err) {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="panel">
      <AdminHeader
        eyebrow="Users"
        title="Access Control"
        lede="Create and manage user accounts."
      />

      <section className="grid">
        <div className="card form-card">
          <h2>Create User</h2>
          <div className="form-stack">
            <label className="field">
              <span>Username</span>
              <input
                className="input"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Bot limit</span>
              <input
                className="input"
                type="number"
                min={0}
                value={botLimit}
                onChange={(event) => setBotLimit(Number(event.target.value))}
              />
            </label>
            {error ? <div className="error">{error}</div> : null}
            <button className="button" onClick={createUser} disabled={busy}>
              {busy ? "Working..." : "Create user"}
            </button>
          </div>
        </div>

        <div className="card">
          <h2>Users</h2>
          {users.length === 0 ? (
            <p>No users created yet.</p>
          ) : (
            <div className="list">
              {users.map((user) => (
                <div className="list-row" key={user.id}>
                  <div>
                    <strong>{user.username}</strong>
                    <span className="muted">Created {new Date(user.createdAt).toLocaleString()}</span>
                    <span className="muted">Automatons {user.automatonCount}</span>
                  </div>
                  <div className="row-actions">
                    <span className="tag">Limit {user.botLimit}</span>
                    <button className="button ghost" onClick={() => beginEdit(user)}>
                      Edit
                    </button>
                    <button className="button danger" onClick={() => deleteUser(user.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {editId ? (
        <section className="grid">
          <div className="card form-card">
            <h2>Edit User</h2>
            <div className="form-stack">
              <label className="field">
                <span>Username</span>
                <input
                  className="input"
                  value={editUsername}
                  onChange={(event) => setEditUsername(event.target.value)}
                />
              </label>
              <label className="field">
                <span>New password</span>
                <input
                  className="input"
                  type="password"
                  value={editPassword}
                  onChange={(event) => setEditPassword(event.target.value)}
                />
              </label>
              <label className="field">
                <span>Bot limit</span>
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={editBotLimit}
                  onChange={(event) => setEditBotLimit(Number(event.target.value))}
                />
              </label>
              <div className="button-row">
                <button className="button" onClick={saveEdit} disabled={busy}>
                  {busy ? "Working..." : "Save"}
                </button>
                <button className="button ghost" onClick={cancelEdit} disabled={busy}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
