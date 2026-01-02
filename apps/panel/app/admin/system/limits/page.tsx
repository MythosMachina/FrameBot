"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBase } from "../../../lib/api";
import AdminHeader from "../../_components/AdminHeader";

export default function SystemLimitsPage() {
  const router = useRouter();
  const [values, setValues] = useState({
    globalBotLimit: "",
    maxUsers: "",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`${getApiBase()}/admin/me`, {
        credentials: "include",
      });
      if (!res.ok) {
        router.push("/admin/login");
        return;
      }
      const settings = await fetch(`${getApiBase()}/admin/system/limits`, {
        credentials: "include",
      });
      if (settings.ok) {
        const payload = await settings.json();
        setValues({
          globalBotLimit: payload.values?.globalBotLimit ?? "",
          maxUsers: payload.values?.maxUsers ?? "",
        });
      }
    };
    load();
  }, []);

  const save = async () => {
    setBusy(true);
    await fetch(`${getApiBase()}/admin/system/limits`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ values }),
    });
    setBusy(false);
  };

  return (
    <main className="panel">
      <AdminHeader
        eyebrow="System Settings"
        title="Limits"
        lede="Control quotas and global Automaton limits."
      />

      <div className="system-panel">
        <h2>Limits</h2>
        <div className="form-stack">
          <label className="field">
            <span>Global Automaton limit</span>
            <input
              className="input"
              value={values.globalBotLimit}
              onChange={(event) => setValues({ ...values, globalBotLimit: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Max users</span>
            <input
              className="input"
              value={values.maxUsers}
              onChange={(event) => setValues({ ...values, maxUsers: event.target.value })}
            />
          </label>
          <button className="button" onClick={save} disabled={busy}>
            {busy ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </main>
  );
}
