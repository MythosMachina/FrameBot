"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBase } from "../../../lib/api";
import AdminHeader from "../../_components/AdminHeader";

export default function SystemPoliciesPage() {
  const router = useRouter();
  const [values, setValues] = useState({
    allowUserSignup: "",
    passwordPolicy: "",
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
      const settings = await fetch(`${getApiBase()}/admin/system/policies`, {
        credentials: "include",
      });
      if (settings.ok) {
        const payload = await settings.json();
        setValues({
          allowUserSignup: payload.values?.allowUserSignup ?? "",
          passwordPolicy: payload.values?.passwordPolicy ?? "",
        });
      }
    };
    load();
  }, []);

  const save = async () => {
    setBusy(true);
    await fetch(`${getApiBase()}/admin/system/policies`, {
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
        title="Policies"
        lede="Define security and access policies."
      />

      <div className="system-panel">
        <h2>Policies</h2>
        <div className="form-stack">
          <label className="field">
            <span>Allow user signup (true/false)</span>
            <input
              className="input"
              value={values.allowUserSignup}
              onChange={(event) =>
                setValues({ ...values, allowUserSignup: event.target.value })
              }
            />
          </label>
          <label className="field">
            <span>Password policy</span>
            <input
              className="input"
              value={values.passwordPolicy}
              onChange={(event) =>
                setValues({ ...values, passwordPolicy: event.target.value })
              }
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
