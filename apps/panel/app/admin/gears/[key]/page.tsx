"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getApiBase } from "../../../lib/api";
import AdminHeader from "../../_components/AdminHeader";
import { configToValues, getGearFields, valuesToConfig } from "../../../lib/gearConfig";

type Gear = {
  id: string;
  key: string;
  name: string;
  category: string;
  description: string;
  version: string;
  enabled: boolean;
};

type EconomyStats = {
  totals: {
    accounts: number;
    totalBalance: number;
    avgBalance: number;
  };
  top: { discordUserId: string; balance: number; guildId: string }[];
  recent: { day: string; count: number }[];
};

export default function AdminGearDetailPage() {
  const router = useRouter();
  const params = useParams<{ key: string }>();
  const gearKey = Array.isArray(params?.key) ? params.key[0] : params?.key;
  const [gear, setGear] = useState<Gear | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [economyStats, setEconomyStats] = useState<EconomyStats | null>(null);

  useEffect(() => {
    if (!gearKey) return;
    const load = async () => {
      const res = await fetch(`${getApiBase()}/admin/gears/${encodeURIComponent(gearKey)}`, {
        credentials: "include",
      });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!res.ok) {
        setError("Gear not found.");
        return;
      }
      const data = await res.json();
      setGear(data.gear ?? null);

      const configRes = await fetch(
        `${getApiBase()}/admin/gears/${encodeURIComponent(gearKey)}/config`,
        { credentials: "include" }
      );
      if (configRes.ok) {
        const payload = await configRes.json();
        const fields = getGearFields(gearKey, "admin");
        setValues(configToValues(fields, payload.config ?? {}));
      }

      if (gearKey === "economy.economy") {
        const statsRes = await fetch(`${getApiBase()}/admin/economy/stats`, {
          credentials: "include",
        });
        if (statsRes.ok) {
          const payload = await statsRes.json();
          setEconomyStats(payload);
        }
      }
    };
    load();
  }, [gearKey, router]);

  const updateValue = (key: string, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const saveConfig = async () => {
    if (!gearKey) return;
    setSaveBusy(true);
    setSaveError(null);
    const fields = getGearFields(gearKey, "admin");
    const config = valuesToConfig(fields, values);
    const res = await fetch(`${getApiBase()}/admin/gears/${encodeURIComponent(gearKey)}/config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ config }),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setSaveError(payload.error ?? "Failed to save config.");
      setSaveBusy(false);
      return;
    }
    setSaveBusy(false);
  };

  return (
    <main className="panel">
      <AdminHeader
        eyebrow="Gears"
        title={gear ? gear.name : "Loading Gear"}
        lede={gear ? gear.description : "Loading gear details..."}
      />

      <section className="grid">
        <div className="card">
          <h2>Gear Details</h2>
          {error ? <div className="error">{error}</div> : null}
          {!gear ? (
            <p>Loading gear information.</p>
          ) : (
            <div className="list">
              <div className="list-row">
                <div>
                  <strong>Key</strong>
                  <span className="muted">{gear.key}</span>
                </div>
                <span className="tag">{gear.enabled ? "Enabled" : "Disabled"}</span>
              </div>
              <div className="list-row">
                <div>
                  <strong>Category</strong>
                  <span className="muted">{gear.category}</span>
                </div>
                <span className="tag">v{gear.version}</span>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h2>Configuration</h2>
          {gearKey
            ? getGearFields(gearKey, "admin").length === 0
              ? (
                <p>No configuration fields defined yet.</p>
                )
              : (
                <div className="form-stack">
                  {getGearFields(gearKey, "admin").map((field) => {
                    const fieldValue =
                      values[field.key] ?? (field.type === "checkbox" ? false : "");
                    if (field.type === "textarea") {
                      return (
                        <label className="field" key={field.key}>
                          <span>{field.label}</span>
                          <textarea
                            className="input input-area"
                            rows={6}
                            value={String(fieldValue)}
                            placeholder={field.placeholder}
                            onChange={(event) => updateValue(field.key, event.target.value)}
                          />
                          {field.help ? <span className="muted">{field.help}</span> : null}
                        </label>
                      );
                    }
                    if (field.type === "select") {
                      return (
                        <label className="field" key={field.key}>
                          <span>{field.label}</span>
                          <select
                            className="input"
                            value={String(fieldValue)}
                            onChange={(event) => updateValue(field.key, event.target.value)}
                          >
                            <option value="">Select</option>
                            {field.options?.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          {field.help ? <span className="muted">{field.help}</span> : null}
                        </label>
                      );
                    }
                    if (field.type === "checkbox") {
                      return (
                        <label className="field" key={field.key}>
                          <span>{field.label}</span>
                          <input
                            type="checkbox"
                            checked={Boolean(fieldValue)}
                            onChange={(event) => updateValue(field.key, event.target.checked)}
                          />
                          {field.help ? <span className="muted">{field.help}</span> : null}
                        </label>
                      );
                    }
                    return (
                      <label className="field" key={field.key}>
                        <span>{field.label}</span>
                        <input
                          className="input"
                          type={field.type === "number" ? "number" : "text"}
                          value={String(fieldValue)}
                          placeholder={field.placeholder}
                          onChange={(event) => updateValue(field.key, event.target.value)}
                        />
                        {field.help ? <span className="muted">{field.help}</span> : null}
                      </label>
                    );
                  })}
                  {saveError ? <div className="error">{saveError}</div> : null}
                  <button className="button" onClick={saveConfig} disabled={saveBusy}>
                    {saveBusy ? "Saving..." : "Save Configuration"}
                  </button>
                </div>
                )
            : null}
        </div>
      </section>

      {gearKey === "economy.economy" ? (
        <section className="grid">
          <div className="card">
            <h2>Economy Snapshot</h2>
            {!economyStats ? (
              <p>No economy stats yet.</p>
            ) : (
              <div className="stats-grid">
                <div className="stat">
                  <span className="stat-label">Accounts</span>
                  <strong>{economyStats.totals.accounts}</strong>
                </div>
                <div className="stat">
                  <span className="stat-label">Total Balance</span>
                  <strong>{economyStats.totals.totalBalance}</strong>
                </div>
                <div className="stat">
                  <span className="stat-label">Avg Balance</span>
                  <strong>{economyStats.totals.avgBalance}</strong>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <h2>Top Holders</h2>
            {!economyStats || economyStats.top.length === 0 ? (
              <p>No holders yet.</p>
            ) : (
              <div className="list">
                {economyStats.top.map((item) => (
                  <div className="list-row" key={`${item.discordUserId}-${item.guildId}`}>
                    <div>
                      <strong>{item.discordUserId}</strong>
                      <span className="muted">Guild {item.guildId}</span>
                    </div>
                    <span className="tag">{item.balance}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h2>New Accounts (7 days)</h2>
            {!economyStats || economyStats.recent.length === 0 ? (
              <p>No recent activity.</p>
            ) : (
              <div className="list">
                {economyStats.recent.map((row) => (
                  <div className="list-row" key={row.day}>
                    <div>
                      <strong>{new Date(row.day).toLocaleDateString()}</strong>
                      <span className="muted">New accounts</span>
                    </div>
                    <span className="tag">{row.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : null}
    </main>
  );
}
