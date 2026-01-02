"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getApiBase } from "../../lib/api";

const items = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/automata", label: "Automatons" },
  { href: "/admin/system", label: "System Settings" },
  { href: "/admin/ticketing", label: "Ticketing" },
  { href: "/admin/logs", label: "System Logs" },
];

type GearLink = {
  key: string;
  name: string;
  enabled: boolean;
};

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [gearLinks, setGearLinks] = useState<GearLink[]>([]);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`${getApiBase()}/admin/gears`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      const gears = (data.gears ?? []) as GearLink[];
      setGearLinks(gears.filter((gear) => gear.enabled));
    };
    load();
  }, []);

  const logout = async () => {
    await fetch(`${getApiBase()}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    router.push("/");
  };
  return (
    <nav className="admin-nav">
      <div className="nav-title">Admin Console</div>
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            className={active ? "nav-link active" : "nav-link"}
            href={item.href}
          >
            {item.label}
          </Link>
        );
      })}
      <Link
        className={pathname === "/admin/gears" ? "nav-link active" : "nav-link"}
        href="/admin/gears"
      >
        Gears
      </Link>
      {gearLinks.length > 0 ? <div className="nav-section">Active Gears</div> : null}
      {gearLinks.map((gear) => {
        const href = `/admin/gears/${encodeURIComponent(gear.key)}`;
        const active = pathname === href;
        return (
          <Link key={gear.key} className={active ? "nav-link sub active" : "nav-link sub"} href={href}>
            {gear.name}
          </Link>
        );
      })}
      <button className="nav-link nav-button" onClick={logout}>
        Sign out
      </button>
    </nav>
  );
}
