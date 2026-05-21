"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/overview",
    label: "Overview",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/crafting",
    label: "Gear",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
    ),
  },
  {
    href: "/skills",
    label: "Skills",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    href: "/pactspirits",
    label: "Pactspirits",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 10h.01M15 10h.01M12 2a8 8 0 0 0-8 8v10l3-3 3 3 3-3 3 3 3-3V10a8 8 0 0 0-8-8z" />
      </svg>
    ),
  },
  {
    href: "/hero-trait",
    label: "Hero Trait",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  {
    href: "/talents",
    label: "Talents",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
      </svg>
    ),
  },
  {
    href: "/divinity-slates",
    label: "Divinity Slates",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
];

export default function NavPanel() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(true);

  return (
    <nav
      className="fixed left-0 top-0 h-screen z-40 flex flex-col py-6 gap-2 transition-all duration-200"
      style={{
        width: expanded ? "180px" : "64px",
        background: "linear-gradient(to bottom, #141414, #0a0a0a)",
        borderRight: "1px solid #1c1c1c",
      }}
    >
      {/* Toggle button section */}
      <div className="flex flex-col w-full" style={{ height: "56px" }}>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex-1 w-full flex items-center justify-end pr-4 text-[#52525b] hover:text-[#e0ddd8] hover:bg-[#1c1c1c] transition-all cursor-pointer"
        >
          {expanded ? (
            <>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 17l-5-5 5-5" />
                <path d="M18 17l-5-5 5-5" />
              </svg>
              <span className="text-xs font-medium tracking-wide ml-1">Collapse</span>
            </>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 17l5-5-5-5" />
              <path d="M6 17l5-5-5-5" />
            </svg>
          )}
        </button>
      </div>

      <div className="w-full h-px bg-[#1c1c1c] mb-2 shrink-0" />

      {NAV_ITEMS.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative group flex items-center gap-3 h-12 transition-all duration-200 shrink-0 ${
              isActive
                ? "bg-[#1c1c1c] text-[#e0ddd8]"
                : "text-[#52525b] hover:bg-[#161616] hover:text-[#a1a1aa]"
            }`}
            style={{
              width: expanded ? "calc(100% - 16px)" : "48px",
              marginLeft: "8px",
              borderRadius: "0 10px 0 10px",
              paddingLeft: "13px",
            }}
          >
            <span className="shrink-0">{item.icon}</span>
            {expanded && (
              <span className="text-sm font-medium whitespace-nowrap overflow-hidden">
                {item.label}
              </span>
            )}
            {/* Tooltip when collapsed */}
            {!expanded && (
              <span
                className="pointer-events-none absolute left-full ml-3 px-3 py-1 text-xs whitespace-nowrap rounded opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                style={{
                  background: "#141414",
                  border: "1px solid #3a3a3a",
                  color: "#a1a1aa",
                }}
              >
                {item.label}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
