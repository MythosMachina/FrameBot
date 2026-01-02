"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PanelHeader from "../../_components/PanelHeader";
import { getApiBase } from "../../lib/api";

type Automaton = {
  id: string;
  name: string;
  status: "stopped" | "running" | "error";
  createdAt: string;
  guildId: string | null;
  channelId: string | null;
};

type DiscordGuild = {
  id: string;
  name: string;
};

type DiscordChannel = {
  id: string;
  name: string;
  type: number;
};

type DiscordProfile = {
  id: string;
  username: string;
  avatar: string | null;
};

export default function UserAutomatonsPage() {
  const router = useRouter();
  const [automatons, setAutomatons] = useState<Automaton[]>([]);
  const [name, setName] = useState("");
  const [discordToken, setDiscordToken] = useState("");
  const [guildId, setGuildId] = useState("");
  const [channelId, setChannelId] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [configureId, setConfigureId] = useState<string | null>(null);
  const [guilds, setGuilds] = useState<DiscordGuild[]>([]);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [discordError, setDiscordError] = useState<string | null>(null);
  const [profile, setProfile] = useState<DiscordProfile | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

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
    const autosRes = await fetch(`${getApiBase()}/user/automatons`, {
      credentials: "include",
    });
    if (autosRes.ok) {
      const data = await autosRes.json();
      setAutomatons(data.automatons ?? []);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch(`${getApiBase()}/user/automatons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, discordToken, guildId, channelId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Request failed.");
      setBusy(false);
      return;
    }
    setName("");
    setDiscordToken("");
    setGuildId("");
    setChannelId("");
    await load();
    setBusy(false);
  };

  const startAutomaton = async (id: string) => {
    setBusyId(id);
    await fetch(`${getApiBase()}/user/automatons/${id}/start`, {
      method: "POST",
      credentials: "include",
    });
    await load();
    setBusyId(null);
  };

  const stopAutomaton = async (id: string) => {
    setBusyId(id);
    await fetch(`${getApiBase()}/user/automatons/${id}/stop`, {
      method: "POST",
      credentials: "include",
    });
    await load();
    setBusyId(null);
  };

  const removeAutomaton = async (id: string) => {
    setBusyId(id);
    await fetch(`${getApiBase()}/user/automatons/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    await load();
    setBusyId(null);
  };

  const loadGuilds = async (id: string) => {
    setDiscordError(null);
    const res = await fetch(`${getApiBase()}/user/automatons/${id}/discord/guilds`, {
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      setGuilds(data.guilds ?? []);
    } else {
      const data = await res.json().catch(() => ({}));
      setDiscordError(data.error ?? "Failed to load guilds.");
    }
  };

  const loadChannels = async (id: string, gId: string) => {
    setDiscordError(null);
    const res = await fetch(
      `${getApiBase()}/user/automatons/${id}/discord/channels?guildId=${gId}`,
      { credentials: "include" }
    );
    if (res.ok) {
      const data = await res.json();
      setChannels(data.channels ?? []);
    } else {
      const data = await res.json().catch(() => ({}));
      setDiscordError(data.error ?? "Failed to load channels.");
    }
  };

  const loadProfile = async (id: string) => {
    const res = await fetch(`${getApiBase()}/user/automatons/${id}/discord/profile`, {
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      const bot = data.profile as DiscordProfile;
      setProfile(bot);
      setProfileName(bot.username ?? "");
      setProfileAvatar(null);
    }
  };

  const saveConfig = async () => {
    if (!configureId) return;
    await fetch(`${getApiBase()}/user/automatons/${configureId}/config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ guildId, channelId }),
    });
    setConfigureId(null);
    setGuilds([]);
    setChannels([]);
    setProfile(null);
    await load();
  };

  const saveProfile = async () => {
    if (!configureId) return;
    setProfileBusy(true);
    setProfileError(null);
    const res = await fetch(`${getApiBase()}/user/automatons/${configureId}/discord/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        username: profileName || undefined,
        avatar: profileAvatar || undefined,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setProfileError(data.error ?? "Profile update failed.");
      setProfileBusy(false);
      return;
    }
    await loadProfile(configureId);
    setProfileBusy(false);
  };

  const onAvatarFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setProfileAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <main className="panel">
      <PanelHeader
        eyebrow="Automatons"
        title="Your Fleet"
        lede="Create, start, stop, or retire Automatons."
      />

      <section className="grid">
        <div className="card form-card">
          <h2>Create Automaton</h2>
          <div className="form-stack">
            <label className="field">
              <span>Name</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="field">
              <span>Discord token</span>
              <input
                className="input"
                value={discordToken}
                onChange={(e) => setDiscordToken(e.target.value)}
              />
            </label>
            {error ? <div className="error">{error}</div> : null}
            <button className="button" onClick={create} disabled={busy}>
              {busy ? "Working..." : "Create"}
            </button>
          </div>
        </div>

        <div className="card">
          <h2>Automatons</h2>
          {automatons.length === 0 ? (
            <p>No automatons created yet.</p>
          ) : (
            <div className="list">
              {automatons.map((automaton) => (
                <div className="list-row" key={automaton.id}>
                  <div>
                    <strong>{automaton.name}</strong>
                    <span className="muted">Status {automaton.status}</span>
                    <span className="muted">Guild {automaton.guildId ?? "Not set"}</span>
                    <span className="muted">Channel {automaton.channelId ?? "Not set"}</span>
                  </div>
                  <div className="row-actions">
                    {automaton.status === "running" ? (
                      <button
                        className="button ghost"
                        onClick={() => stopAutomaton(automaton.id)}
                        disabled={busyId === automaton.id}
                      >
                        Stop
                      </button>
                    ) : (
                      <button
                        className="button"
                        onClick={() => startAutomaton(automaton.id)}
                        disabled={busyId === automaton.id}
                      >
                        Start
                      </button>
                    )}
                    <button
                      className="button ghost"
                      onClick={() => {
                        setConfigureId(automaton.id);
                        setGuildId(automaton.guildId ?? "");
                        setChannelId(automaton.channelId ?? "");
                        loadGuilds(automaton.id);
                        loadProfile(automaton.id);
                      }}
                    >
                      Configure
                    </button>
                    <button
                      className="button danger"
                      onClick={() => removeAutomaton(automaton.id)}
                      disabled={busyId === automaton.id}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {configureId ? (
        <section className="grid">
          <div className="card form-card">
            <h2>Assign Guild & Channel</h2>
            <div className="form-stack">
              <label className="field">
                <span>Guild</span>
                <select
                  className="input"
                  value={guildId}
                  onChange={(e) => {
                    const next = e.target.value;
                    setGuildId(next);
                    setChannelId("");
                    if (next) {
                      loadChannels(configureId, next);
                    }
                  }}
                >
                  <option value="">Select guild</option>
                  {guilds.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Channel</span>
                <select
                  className="input"
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  disabled={!guildId}
                >
                  <option value="">Select channel</option>
                  {channels
                    .filter((ch) => ch.type === 0 || ch.type === 5)
                    .map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        {ch.name}
                      </option>
                    ))}
                </select>
              </label>
              {discordError ? <div className="error">{discordError}</div> : null}
              {!discordError && guildId && channels.length === 0 ? (
                <div className="placeholder">No text channels returned. Check bot permissions.</div>
              ) : null}
              <div className="button-row">
                <button className="button" onClick={saveConfig}>
                  Save
                </button>
                <button
                  className="button ghost"
                  onClick={() => {
                    setConfigureId(null);
                    setGuilds([]);
                    setChannels([]);
                    setProfile(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>

          <div className="card form-card">
            <h2>Bot Profile</h2>
            <div className="form-stack">
              <label className="field">
                <span>Current name</span>
                <input className="input" value={profile?.username ?? ""} disabled />
              </label>
              <label className="field">
                <span>New name</span>
                <input
                  className="input"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Avatar image</span>
                <input
                  className="input"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onAvatarFile(file);
                  }}
                />
              </label>
              {profileError ? <div className="error">{profileError}</div> : null}
              <div className="button-row">
                <button className="button" onClick={saveProfile} disabled={profileBusy}>
                  {profileBusy ? "Saving..." : "Save profile"}
                </button>
                <button
                  className="button ghost"
                  onClick={() => setProfileAvatar(null)}
                  disabled={profileBusy}
                >
                  Clear avatar
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
