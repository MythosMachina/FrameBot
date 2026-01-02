"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PanelHeader from "../../../_components/PanelHeader";
import { getApiBase } from "../../../lib/api";
import { configToValues, getGearFields, valuesToConfig } from "../../../lib/gearConfig";

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

type NewsPost = {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  createdAt: string;
  source: string;
};

export default function UserGearDetailPage() {
  const router = useRouter();
  const params = useParams<{ key: string }>();
  const gearKey = Array.isArray(params?.key) ? params.key[0] : params?.key;
  const [gear, setGear] = useState<Gear | null>(null);
  const [automatons, setAutomatons] = useState<Automaton[]>([]);
  const [selectedAutomaton, setSelectedAutomaton] = useState("");
  const [configError, setConfigError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shopItems, setShopItems] = useState<
    { key: string; name: string; price: string; roleId: string; description: string }[]
  >([]);
  const [newsTitle, setNewsTitle] = useState("");
  const [newsBody, setNewsBody] = useState("");
  const [newsImageUrl, setNewsImageUrl] = useState("");
  const [newsBusy, setNewsBusy] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [newsPosts, setNewsPosts] = useState<NewsPost[]>([]);

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
      const authPayload = await authRes.json();
      const user = authPayload.user;
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

      const autoRes = await fetch(`${getApiBase()}/user/automatons`, {
        credentials: "include",
      });
      if (autoRes.ok) {
        const autos = await autoRes.json();
        setAutomatons(autos.automatons ?? []);
      }
    };
    load();
  }, [gearKey, router]);

  const loadConfig = async (automatonId: string) => {
    if (!gearKey) return;
    setConfigError(null);
    setSaveError(null);
    const res = await fetch(
      `${getApiBase()}/user/automatons/${automatonId}/gears/${encodeURIComponent(gearKey)}/config`,
      { credentials: "include" }
    );
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setConfigError(payload.error ?? "Failed to load gear config.");
      setValues({});
      return;
    }
    const payload = await res.json();
    const fields = getGearFields(gearKey, "user");
    const loadedValues = configToValues(fields, payload.config ?? {});
    setValues(loadedValues);
    if (gearKey === "economy.economy") {
      const raw = String(payload.config?.shopItems ?? "");
      const items = raw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [key, name, price, roleId, description] = line
            .split("|")
            .map((part) => (part ?? "").trim());
          return {
            key: key ?? "",
            name: name ?? "",
            price: price ?? "",
            roleId: roleId ?? "",
            description: description ?? "",
          };
        });
      setShopItems(items);
    }
  };

  const saveConfig = async () => {
    if (!gearKey || !selectedAutomaton) return;
    setSaveBusy(true);
    setSaveError(null);
    const fields = getGearFields(gearKey, "user");
    const parsed = valuesToConfig(fields, values);
    if (gearKey === "economy.economy") {
      const lines = shopItems
        .filter((item) => item.key && item.name && item.price)
        .map((item) =>
          [item.key, item.name, item.price, item.roleId || "", item.description || ""].join("|")
        );
      parsed.shopItems = lines.join("\n");
    }
    const res = await fetch(
      `${getApiBase()}/user/automatons/${selectedAutomaton}/gears/${encodeURIComponent(gearKey)}/config`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ config: parsed }),
      }
    );
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setSaveError(payload.error ?? "Failed to save config.");
      setSaveBusy(false);
      return;
    }
    setSaveBusy(false);
  };

  const loadNews = async (automatonId: string) => {
    setNewsError(null);
    const res = await fetch(`${getApiBase()}/user/automatons/${automatonId}/news/posts`, {
      credentials: "include",
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setNewsError(payload.error ?? "Failed to load news posts.");
      setNewsPosts([]);
      return;
    }
    const payload = await res.json();
    setNewsPosts(payload.posts ?? []);
  };

  const publishNews = async () => {
    if (!selectedAutomaton) return;
    setNewsBusy(true);
    setNewsError(null);
    const res = await fetch(`${getApiBase()}/user/automatons/${selectedAutomaton}/news/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        title: newsTitle,
        body: newsBody,
        imageUrl: newsImageUrl || undefined,
      }),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setNewsError(payload.error ?? "Failed to publish news.");
      setNewsBusy(false);
      return;
    }
    setNewsTitle("");
    setNewsBody("");
    setNewsImageUrl("");
    await loadNews(selectedAutomaton);
    setNewsBusy(false);
  };

  const updateValue = (key: string, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const addShopItem = () => {
    setShopItems((prev) => [
      ...prev,
      { key: "", name: "", price: "", roleId: "", description: "" },
    ]);
  };

  const updateShopItem = (
    index: number,
    field: "key" | "name" | "price" | "roleId" | "description",
    value: string
  ) => {
    setShopItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const removeShopItem = (index: number) => {
    setShopItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  return (
    <main className="panel">
      <PanelHeader
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
            </div>
          )}
        </div>

        <div className="card">
          <h2>Assignment</h2>
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
                    loadConfig(id);
                    if (gearKey === "news.news") {
                      loadNews(id);
                    }
                  } else {
                    setValues({});
                    setConfigError(null);
                    setNewsPosts([]);
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
            {configError ? <div className="error">{configError}</div> : null}
            {gearKey
              ? getGearFields(gearKey, "user").length === 0
                ? (
                  <p>No configuration fields defined yet.</p>
                  )
                : (
                  getGearFields(gearKey, "user")
                    .filter((field) => !(gearKey === "economy.economy" && field.key === "shopItems"))
                    .map((field) => {
                    const fieldValue = values[field.key] ?? (field.type === "checkbox" ? false : "");
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
                            disabled={!selectedAutomaton}
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
                            disabled={!selectedAutomaton}
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
                            disabled={!selectedAutomaton}
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
                          disabled={!selectedAutomaton}
                        />
                        {field.help ? <span className="muted">{field.help}</span> : null}
                      </label>
                    );
                    })
                  )
              : null}
            {gearKey === "economy.economy" ? (
              <div className="card full">
                <h2>Shop Items</h2>
                {shopItems.length === 0 ? (
                  <p>No shop items yet.</p>
                ) : (
                  <div className="list">
                    {shopItems.map((item, index) => (
                      <div className="list-row" key={`shop-${index}`}>
                        <div className="form-stack" style={{ flex: 1 }}>
                          <label className="field">
                            <span>Key</span>
                            <input
                              className="input"
                              value={item.key}
                              onChange={(event) => updateShopItem(index, "key", event.target.value)}
                            />
                          </label>
                          <label className="field">
                            <span>Name</span>
                            <input
                              className="input"
                              value={item.name}
                              onChange={(event) => updateShopItem(index, "name", event.target.value)}
                            />
                          </label>
                          <label className="field">
                            <span>Price</span>
                            <input
                              className="input"
                              type="number"
                              value={item.price}
                              onChange={(event) => updateShopItem(index, "price", event.target.value)}
                            />
                          </label>
                          <label className="field">
                            <span>Role ID (optional)</span>
                            <input
                              className="input"
                              value={item.roleId}
                              onChange={(event) => updateShopItem(index, "roleId", event.target.value)}
                            />
                          </label>
                          <label className="field">
                            <span>Description (optional)</span>
                            <input
                              className="input"
                              value={item.description}
                              onChange={(event) =>
                                updateShopItem(index, "description", event.target.value)
                              }
                            />
                          </label>
                        </div>
                        <div className="row-actions">
                          <button className="button ghost" onClick={() => removeShopItem(index)}>
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button className="button ghost" onClick={addShopItem}>
                  Add shop item
                </button>
              </div>
            ) : null}
            {gearKey === "news.news" ? (
              <div className="card full">
                <h2>News Editor</h2>
                <div className="form-stack">
                  <label className="field">
                    <span>Title</span>
                    <input
                      className="input"
                      value={newsTitle}
                      onChange={(event) => setNewsTitle(event.target.value)}
                      disabled={!selectedAutomaton}
                    />
                  </label>
                  <label className="field">
                    <span>Body</span>
                    <textarea
                      className="input input-area"
                      rows={8}
                      value={newsBody}
                      onChange={(event) => setNewsBody(event.target.value)}
                      disabled={!selectedAutomaton}
                    />
                  </label>
                  <label className="field">
                    <span>Image URL (optional)</span>
                    <input
                      className="input"
                      value={newsImageUrl}
                      onChange={(event) => setNewsImageUrl(event.target.value)}
                      disabled={!selectedAutomaton}
                    />
                  </label>
                  {newsError ? <div className="error">{newsError}</div> : null}
                  <button className="button" onClick={publishNews} disabled={!selectedAutomaton || newsBusy}>
                    {newsBusy ? "Publishing..." : "Publish News"}
                  </button>
                </div>
              </div>
            ) : null}
            {saveError ? <div className="error">{saveError}</div> : null}
            <button className="button" onClick={saveConfig} disabled={!selectedAutomaton || saveBusy}>
              {saveBusy ? "Saving..." : "Save Config"}
            </button>
          </div>
        </div>
      </section>

      {gearKey === "news.news" ? (
        <section className="grid">
          <div className="card">
            <h2>Recent News</h2>
            {newsPosts.length === 0 ? (
              <p>No news posts yet.</p>
            ) : (
              <div className="list">
                {newsPosts.map((post) => (
                  <div className="list-row" key={post.id}>
                    <div>
                      <strong>{post.title}</strong>
                      <span className="muted">{new Date(post.createdAt).toLocaleString()}</span>
                      <span className="muted">Source: {post.source}</span>
                    </div>
                    <span className="tag">{post.imageUrl ? "Image" : "Text"}</span>
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
