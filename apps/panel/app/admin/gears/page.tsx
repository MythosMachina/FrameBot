"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBase } from "../../lib/api";
import AdminHeader from "../_components/AdminHeader";

type AdminSelf = {
  id: string;
  username: string;
  role: "admin" | "user";
};

type Gear = {
  id: string;
  key: string;
  name: string;
  category: string;
  description: string;
  version: string;
  enabled: boolean;
};

export default function AdminGearsPage() {
  const router = useRouter();
  const [me, setMe] = useState<AdminSelf | null>(null);
  const [gears, setGears] = useState<Gear[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

    const gearRes = await fetch(`${getApiBase()}/admin/gears`, {
      credentials: "include",
    });
    if (!gearRes.ok) {
      setError("Failed to load gears.");
      return;
    }
    const payload = await gearRes.json();
    setGears(payload.gears ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleGear = async (gear: Gear) => {
    setBusyKey(gear.key);
    setError(null);
    const res = await fetch(`${getApiBase()}/admin/gears/${encodeURIComponent(gear.key)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ enabled: !gear.enabled }),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setError(payload.error ?? "Update failed.");
    } else {
      await load();
    }
    setBusyKey(null);
  };

  return (
    <main className="panel">
      <AdminHeader
        eyebrow="Gears"
        title="Gear Registry"
        lede={me ? `Signed in as ${me.username}.` : "Loading session..."}
      />

      <section className="grid">
        <div className="card">
          <h2>Registered Gears</h2>
          {error ? <div className="error">{error}</div> : null}
          {gears.length === 0 ? (
            <p>No gears registered.</p>
          ) : (
            <div className="list">
              {gears.map((gear) => (
                <div className="list-row" key={gear.id}>
                  <div>
                    <strong>{gear.name}</strong>
                    <span className="muted">{gear.category}</span>
                    <span className="muted">{gear.key}</span>
                  </div>
                  <div className="row-actions">
                    <span className="tag">{gear.enabled ? "Enabled" : "Disabled"}</span>
                    <button
                      className="button ghost"
                      onClick={() => toggleGear(gear)}
                      disabled={busyKey === gear.key}
                    >
                      {busyKey === gear.key
                        ? "Working..."
                        : gear.enabled
                          ? "Disable"
                          : "Enable"}
                    </button>
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
