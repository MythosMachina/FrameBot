"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getApiBase } from "../../lib/api";

const items = [
  { href: "/user/dashboard", label: "Dashboard" },
  { href: "/user/automatons", label: "Automatons" },
  { href: "/user/workshop", label: "Workshop" },
  { href: "/user/storefront", label: "Storefront" },
  { href: "/user/help", label: "Help" },
  { href: "/user/support", label: "Support" },
];

type GearLink = {
  key: string;
  name: string;
  enabled: boolean;
};

export default function UserNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [gearLinks, setGearLinks] = useState<GearLink[]>([]);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`${getApiBase()}/user/workshop`, {
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
    <nav className="user-nav">
      <div className="nav-title">User Console</div>
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
      {gearLinks.length > 0 ? <div className="nav-section">Active Gears</div> : null}
      {gearLinks.map((gear) => {
        const href = `/user/gears/${encodeURIComponent(gear.key)}`;
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
