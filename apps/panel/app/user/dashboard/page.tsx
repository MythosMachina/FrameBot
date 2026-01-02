"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PanelHeader from "../../_components/PanelHeader";
import { getApiBase } from "../../lib/api";

type UserSelf = {
  id: string;
  username: string;
  role: "admin" | "user";
  botLimit: number;
};

type Automaton = {
  id: string;
  name: string;
  status: "stopped" | "running" | "error";
  createdAt: string;
};

export default function UserDashboard() {
  const router = useRouter();
  const [me, setMe] = useState<UserSelf | null>(null);
  const [automatons, setAutomatons] = useState<Automaton[]>([]);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`${getApiBase()}/auth/me`, {
        credentials: "include",
      });
      if (!res.ok) {
        router.push("/");
        return;
      }
      const payload = await res.json();
      const user = payload.user as UserSelf | null;
      if (!user) {
        router.push("/");
        return;
      }
      if (user.role === "admin") {
        router.push("/admin/dashboard");
        return;
      }
      setMe(user);

      const autosRes = await fetch(`${getApiBase()}/user/automatons`, {
        credentials: "include",
      });
      if (autosRes.ok) {
        const data = await autosRes.json();
        setAutomatons(data.automatons ?? []);
      }
    };
    load();
  }, []);

  return (
    <main className="panel">
      <PanelHeader
        eyebrow="User Console"
        title="Automaton Control"
        lede={me ? `Signed in as ${me.username}.` : "Loading session..."}
      />
      <section className="grid">
        <div className="card">
          <h2>Automaton Summary</h2>
          <p>{automatons.length} Automatons registered.</p>
        </div>
        <div className="card">
          <h2>Workshop</h2>
          <p>Assign Gears to your Automatons from the Workshop.</p>
        </div>
      </section>
    </main>
  );
}
