"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PanelHeader from "../../_components/PanelHeader";
import { getApiBase } from "../../lib/api";

type Automaton = {
  id: string;
  name: string;
};

type Gear = {
  key: string;
  enabled: boolean;
};

type ShopItem = {
  key: string;
  name: string;
  price: string;
  roleId: string;
  description: string;
};

export default function StorefrontPage() {
  const router = useRouter();
  const [automatons, setAutomatons] = useState<Automaton[]>([]);
  const [selectedAutomaton, setSelectedAutomaton] = useState("");
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [gearEnabled, setGearEnabled] = useState(false);
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

    const gearsRes = await fetch(`${getApiBase()}/user/workshop`, {
      credentials: "include",
    });
    if (gearsRes.ok) {
      const data = await gearsRes.json();
      const gears = (data.gears ?? []) as Gear[];
      setGearEnabled(Boolean(gears.find((gear) => gear.key === "economy.economy")?.enabled));
    }

    const autoRes = await fetch(`${getApiBase()}/user/automatons`, {
      credentials: "include",
    });
    if (autoRes.ok) {
      const data = await autoRes.json();
      setAutomatons(data.automatons ?? []);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const parseItems = (raw: string) => {
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [key, name, price, roleId, description] = line
          .split("|")
          .map((part) => (part ?? "").trim());
        return {
          key,
          name,
          price,
          roleId,
          description,
        };
      })
      .filter((item) => item.key && item.name && item.price);
  };

  const loadStorefront = async (automatonId: string) => {
    setError(null);
    const res = await fetch(
      `${getApiBase()}/user/automatons/${automatonId}/gears/economy.economy/config`,
      { credentials: "include" }
    );
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setError(payload.error ?? "Failed to load storefront.");
      setShopItems([]);
      return;
    }
    const payload = await res.json();
    const raw = String(payload.config?.shopItems ?? "");
    setShopItems(parseItems(raw));
  };

  return (
    <main className="panel">
      <PanelHeader
        eyebrow="Storefront"
        title="Economy Shop"
        lede="Browse perks and items for your Automatons."
      />

      <section className="grid">
        <div className="card form-card">
          <h2>Target Automaton</h2>
          <div className="form-stack">
            <label className="field">
              <span>Automaton</span>
              <select
                className="input"
                value={selectedAutomaton}
                onChange={(event) => {
                  const id = event.target.value;
                  setSelectedAutomaton(id);
                  if (id) {
                    loadStorefront(id);
                  } else {
                    setShopItems([]);
                  }
                }}
              >
                <option value="">Select Automaton</option>
                {automatons.map((auto) => (
                  <option key={auto.id} value={auto.id}>
                    {auto.name}
                  </option>
                ))}
              </select>
            </label>
            {!gearEnabled ? (
              <div className="error">Economy gear is disabled.</div>
            ) : null}
            {error ? <div className="error">{error}</div> : null}
          </div>
        </div>

        <div className="card">
          <h2>How to Buy</h2>
          <p>Use the Discord command `\/buy item:&lt;key&gt;` in your server.</p>
        </div>
      </section>

      <section className="grid">
        <div className="card full">
          <h2>Shop Items</h2>
          {!selectedAutomaton ? (
            <p>Select an Automaton to view items.</p>
          ) : shopItems.length === 0 ? (
            <p>No items configured.</p>
          ) : (
            <div className="gear-grid">
              {shopItems.map((item) => (
                <div className="gear-card" key={item.key}>
                  <div className="gear-meta">
                    <span className="tag">{item.key}</span>
                    <h3>{item.name}</h3>
                    <p>{item.description || "No description provided."}</p>
                  </div>
                  <div className="gear-toggle">
                    <span>{item.price}</span>
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
