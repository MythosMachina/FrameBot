"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PanelHeader from "../../../../_components/PanelHeader";
import { getApiBase } from "../../../../lib/api";
import { gearInfoMap } from "../../../../lib/gearInfo";

type Gear = {
  id: string;
  key: string;
  name: string;
  category: string;
  description: string;
  enabled: boolean;
};

export default function GearInfoPage() {
  const router = useRouter();
  const params = useParams<{ key: string }>();
  const gearKey = Array.isArray(params?.key) ? params.key[0] : params?.key;
  const [gear, setGear] = useState<Gear | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gearKey) return;
    const load = async () => {
      const authRes = await fetch(`${getApiBase()}/auth/me`, {
        credentials: "include",
      });
      if (!authRes.ok) {
        router.push("/");
        return;
      }
      const payload = await authRes.json();
      const user = payload.user;
      if (!user) {
        router.push("/");
        return;
      }
      if (user.role === "admin") {
        router.push("/admin/dashboard");
        return;
      }

      const res = await fetch(`${getApiBase()}/user/workshop`, {
        credentials: "include",
      });
      if (!res.ok) {
        setError("Failed to load gear data.");
        return;
      }
      const data = await res.json();
      const found = (data.gears ?? []).find((item: Gear) => item.key === gearKey) ?? null;
      if (!found) {
        setError("Gear not found.");
        return;
      }
      setGear(found);
    };
    load();
  }, [gearKey, router]);

  const info = gearKey ? gearInfoMap[gearKey] : null;

  return (
    <main className="panel">
      <PanelHeader
        eyebrow="Workshop"
        title={gear ? gear.name : "Gear Info"}
        lede={gear ? gear.description : "Loading gear details..."}
      />

      <section className="grid">
        <div className="card">
          <h2>Overview</h2>
          {error ? <div className="error">{error}</div> : null}
          {!gear ? (
            <p>Loading gear information.</p>
          ) : (
            <div className="list">
              <div className="list-row">
                <div>
                  <strong>Category</strong>
                  <span className="muted">{gear.category}</span>
                </div>
                <span className="tag">{gear.enabled ? "Enabled" : "Disabled"}</span>
              </div>
              <div className="list-row">
                <div>
                  <strong>Key</strong>
                  <span className="muted">{gear.key}</span>
                </div>
              </div>
              {info?.summary ? (
                <div className="list-row">
                  <div>
                    <strong>What it does</strong>
                    <span className="muted">{info.summary}</span>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="card">
          <h2>Commands & Syntax</h2>
          {!info || info.commands.length === 0 ? (
            <p>No Discord commands are available for this gear yet.</p>
          ) : (
            <div className="list">
              {info.commands.map((command) => (
                <div className="list-row" key={command.syntax}>
                  <div>
                    <strong>{command.name}</strong>
                    <span className="muted">{command.syntax}</span>
                    <span className="muted">{command.description}</span>
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
