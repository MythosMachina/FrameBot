"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBase } from "../../../lib/api";
import AdminHeader from "../../_components/AdminHeader";

export default function SystemBrandingPage() {
  const router = useRouter();
  const [values, setValues] = useState({
    siteName: "",
    tagline: "",
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
      const settings = await fetch(`${getApiBase()}/admin/system/branding`, {
        credentials: "include",
      });
      if (settings.ok) {
        const payload = await settings.json();
        setValues({
          siteName: payload.values?.siteName ?? "",
          tagline: payload.values?.tagline ?? "",
        });
      }
    };
    load();
  }, []);

  const save = async () => {
    setBusy(true);
    await fetch(`${getApiBase()}/admin/system/branding`, {
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
        title="Branding"
        lede="Define the system name, theme, and identity."
      />

      <div className="system-panel">
        <h2>Branding</h2>
        <div className="form-stack">
          <label className="field">
            <span>Site name</span>
            <input
              className="input"
              value={values.siteName}
              onChange={(event) => setValues({ ...values, siteName: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Tagline</span>
            <input
              className="input"
              value={values.tagline}
              onChange={(event) => setValues({ ...values, tagline: event.target.value })}
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
