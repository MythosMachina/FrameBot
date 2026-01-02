"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin/system/branding", label: "Branding" },
  { href: "/admin/system/limits", label: "Limits" },
  { href: "/admin/system/policies", label: "Policies" },
];

export default function SystemNav() {
  const pathname = usePathname();
  return (
    <nav className="sub-nav">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            className={active ? "sub-link active" : "sub-link"}
            href={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
