"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PanelHeader from "../../_components/PanelHeader";
import { getApiBase } from "../../lib/api";

type Gear = {
  id: string;
  key: string;
  name: string;
  category: string;
  description: string;
  enabled: boolean;
};

type Automaton = {
  id: string;
  name: string;
};

type Assignment = { gearId: string; enabled: boolean };

export default function UserWorkshopPage() {
  const router = useRouter();
  const [gears, setGears] = useState<Gear[]>([]);
  const [automatons, setAutomatons] = useState<Automaton[]>([]);
  const [selectedAutomaton, setSelectedAutomaton] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const catalog = gears;

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
      setGears(data.gears ?? []);
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

  const loadAssignments = async (automatonId: string) => {
    const res = await fetch(`${getApiBase()}/user/automatons/${automatonId}/gears`, {
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      const assignments: Assignment[] = data.assignments ?? [];
      setSelected(assignments.filter((a) => a.enabled).map((a) => a.gearId));
    }
  };

  const toggle = (gearId: string) => {
    setSelected((prev) =>
      prev.includes(gearId) ? prev.filter((id) => id !== gearId) : [...prev, gearId]
    );
  };

  const openInfo = (key: string) => {
    router.push(`/user/gears/${encodeURIComponent(key)}/info`);
  };

  const save = async () => {
    if (!selectedAutomaton) return;
    setBusy(true);
    await fetch(`${getApiBase()}/user/automatons/${selectedAutomaton}/gears`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ gearIds: selected }),
    });
    setBusy(false);
  };

  const categories = Array.from(
    new Set(catalog.map((gear) => gear.category).filter(Boolean))
  ).sort();

  const filtered = catalog.filter((gear) => {
    const matchesCategory = activeCategory === "All" || gear.category === activeCategory;
    const matchesSearch = search
      ? `${gear.name} ${gear.description} ${gear.category}`
          .toLowerCase()
          .includes(search.toLowerCase())
      : true;
    return matchesCategory && matchesSearch;
  });

  return (
    <main className="panel">
      <PanelHeader
        eyebrow="Workshop"
        title="Gear Assignment"
        lede="Select Gears to equip your Automatons."
      />

      <div className="toolbar">
        <div className="filter-row">
          <input
            className="input"
            placeholder="Search gears..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="chip-row">
            <button
              className={activeCategory === "All" ? "chip active" : "chip"}
              onClick={() => setActiveCategory("All")}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category}
                className={activeCategory === category ? "chip active" : "chip"}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="grid">
        <div className="card form-card">
          <h2>Target Automaton</h2>
          <div className="form-stack">
            <label className="field">
              <span>Automaton</span>
              <select
                className="input"
                value={selectedAutomaton}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedAutomaton(id);
                  if (id) {
                    loadAssignments(id);
                  } else {
                    setSelected([]);
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
            <button className="button" onClick={save} disabled={busy || !selectedAutomaton}>
              {busy ? "Saving..." : "Save Gears"}
            </button>
          </div>
        </div>

        <div className="card">
          <h2>Gears</h2>
          {catalog.length === 0 ? (
            <p>No Gears available.</p>
          ) : filtered.length === 0 ? (
            <p>No matching Gears found.</p>
          ) : (
            <div className="gear-grid">
              {filtered.map((gear) => {
                const active = selected.includes(gear.id);
                const available = gear.enabled;
                return (
                  <div
                    key={gear.id}
                    className={active ? "gear-card active" : "gear-card"}
                    role="button"
                    tabIndex={0}
                    onClick={() => openInfo(gear.key)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") openInfo(gear.key);
                    }}
                  >
                    <div className="gear-meta">
                      <span className="tag">{gear.category}</span>
                      <h3>{gear.name}</h3>
                      <p>{gear.description}</p>
                    </div>
                    <div className="gear-toggle">
                      {available ? (
                        <button
                          className="button ghost"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (!selectedAutomaton) return;
                            toggle(gear.id);
                          }}
                          disabled={!selectedAutomaton}
                        >
                          {active ? "Remove" : "Add"}
                        </button>
                      ) : (
                        <span className="tag">Disabled</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="grid">
        <div className="card">
          <h2>Selection Summary</h2>
          {selected.length === 0 ? (
            <p>No Gears selected yet.</p>
          ) : (
            <div className="list">
              {selected.map((gearId) => {
                const gear = gears.find((item) => item.id === gearId);
                if (!gear) return null;
                return (
                  <div className="list-row" key={gear.id}>
                    <div>
                      <strong>{gear.name}</strong>
                      <span className="muted">{gear.category}</span>
                    </div>
                    <button className="button ghost" onClick={() => toggle(gear.id)}>
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
