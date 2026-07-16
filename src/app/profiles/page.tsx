"use client";

import { useEffect, useRef, useState } from "react";
import { useBuildState, useProfiles, type BuildState } from "@/app/state/BuildContext";

const BG_STYLE = {
  backgroundImage: [
    "linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, transparent 18%, transparent 82%, rgba(0,0,0,0.28) 100%)",
    "url('/background/background.jpg')",
  ].join(", "),
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
};

// ─── Export codes ─────────────────────────────────────────────────────────────

async function compressToCode(data: string): Promise<string> {
  const stream = new Blob([data]).stream().pipeThrough(new CompressionStream("deflate"));
  const buf = await new Response(stream).arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function decompressFromCode(code: string): Promise<string> {
  const b64 = code.trim().replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
  const buf = await new Response(stream).arrayBuffer();
  return new TextDecoder().decode(buf);
}

function isBuildStateShaped(v: unknown): v is BuildState {
  if (!v || typeof v !== "object") return false;
  const keys: (keyof BuildState)[] = ["gear", "skills", "pactspirits", "heroTrait", "talents", "divinitySlates"];
  return keys.every((k) => k in v && typeof (v as Record<string, unknown>)[k] === "object");
}

function formatUpdated(ts: number): string {
  return new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// ─── Shared chrome ────────────────────────────────────────────────────────────

function OuterContainer({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex flex-col gap-10 p-12 text-[#e0ddd8]"
      style={{
        background: "linear-gradient(to bottom, #141414, #050505)",
        border: "1px solid #1c1c1c",
        borderRadius: "0 32px 0 32px",
        boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
        width: "100%",
        maxWidth: "1560px",
      }}
    >
      {children}
    </div>
  );
}

function CardShell({ children, height }: { children: React.ReactNode; height: number }) {
  return (
    <div
      className="flex flex-col gap-5 p-6 text-[#e0ddd8]"
      style={{
        background: "linear-gradient(to bottom, #1d1e1e, #0a0a0a)",
        border: "1px solid #1c1c1c",
        borderRadius: "0 24px 0 24px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        height,
      }}
    >
      {children}
    </div>
  );
}

function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col gap-2.5">
      <span style={{ fontSize: "14px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#71717a" }}>
        {title}
      </span>
      <div style={{ height: "2px", background: "#333333" }} />
      {subtitle && <p style={{ fontSize: 15, color: "#a1a1aa", margin: 0, lineHeight: 1.5 }}>{subtitle}</p>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "#0a0a0a",
  border: "1px solid #3f3f46",
  borderRadius: "0 8px 0 8px",
  color: "#e0ddd8",
  fontSize: 15,
  padding: "12px 16px",
  fontFamily: "monospace",
  outline: "none",
};

const buttonStyle: React.CSSProperties = {
  background: "#222222",
  border: "1px solid #3f3f46",
  borderRadius: "0 8px 0 8px",
  color: "#e0ddd8",
  fontSize: 13,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  padding: "12px 22px",
  cursor: "pointer",
  flexShrink: 0,
};

const primaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  width: "100%",
  textAlign: "center",
  padding: "15px 22px",
};

// ─── Hover effects ────────────────────────────────────────────────────────────
// Matches the direct style-mutation pattern used elsewhere in the app (e.g. the
// overview page's CardTitleLink) instead of CSS :hover, since every element here
// is inline-styled.

function hoverProps(hoverStyle: React.CSSProperties, restoreStyle: React.CSSProperties) {
  return {
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
      if (e.currentTarget.disabled) return;
      Object.assign(e.currentTarget.style, hoverStyle);
    },
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
      Object.assign(e.currentTarget.style, restoreStyle);
    },
  };
}

const buttonHoverProps = hoverProps(
  { background: "#2e2e2e", borderColor: "#52525b" },
  { background: "#222222", borderColor: "#3f3f46" },
);

const dashedButtonHoverProps = hoverProps(
  { background: "rgba(255,255,255,0.04)", borderColor: "#71717a", color: "#e0ddd8" },
  { background: "transparent", borderColor: "#3f3f46", color: "#a1a1aa" },
);

const menuItemStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10,
  background: "transparent", border: "none",
  color: "#e0ddd8", fontSize: 14, fontWeight: 600,
  padding: "10px 14px", borderRadius: "0 6px 0 6px",
  cursor: "pointer", textAlign: "left", width: "100%",
};

const menuItemHoverProps = hoverProps(
  { background: "#2a2a2a" },
  { background: "transparent" },
);

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}

// ─── Active Profile ───────────────────────────────────────────────────────────

function ActiveProfileCard() {
  const { profiles, activeId, switchProfile } = useProfiles();
  const active = profiles.find((p) => p.id === activeId) ?? profiles[0];

  return (
    <CardShell height={188}>
      <CardHeader title="Active Profile" />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, minWidth: 0 }}>
          <div
            style={{
              width: 80, height: 80, flexShrink: 0,
              borderRadius: "0 20px 0 20px",
              background: "#161616",
              border: "2px solid #3f3f46",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#7a7a7a",
            }}
          >
            <UserIcon />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{active.name}</div>
            <div style={{ fontSize: 15, color: "#a1a1aa", marginTop: 6 }}>Last updated {formatUpdated(active.updatedAt)}</div>
          </div>
        </div>
        {/* Always rendered (even with a single profile) so the card's height never
            changes as profiles are added or removed. */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 220, flexShrink: 0 }}>
          <span style={{ fontSize: "14px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#71717a" }}>
            Switch Profile
          </span>
          <select
            value={activeId}
            onChange={(e) => switchProfile(e.target.value)}
            style={{ ...inputStyle, fontFamily: "inherit", cursor: "pointer" }}
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>
    </CardShell>
  );
}

// ─── All Profiles ─────────────────────────────────────────────────────────────

function AllProfilesCard() {
  const { profiles, activeId, switchProfile, createProfile, renameProfile, deleteProfile } = useProfiles();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close the options menu on any click outside it.
  useEffect(() => {
    if (!menu) return;
    function handleDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null);
    }
    document.addEventListener("mousedown", handleDocClick);
    return () => document.removeEventListener("mousedown", handleDocClick);
  }, [menu]);

  function commitCreate() {
    if (!newName.trim()) return;
    createProfile(newName);
    setNewName("");
    setCreating(false);
  }

  function openMenu(e: React.MouseEvent<HTMLButtonElement>, id: string) {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenu((m) => (m?.id === id ? null : { id, x: rect.right, y: rect.bottom + 4 }));
  }

  function startEdit(id: string, name: string) {
    setEditingId(id);
    setEditName(name);
    setMenu(null);
  }

  function commitEdit() {
    if (editingId) renameProfile(editingId, editName);
    setEditingId(null);
  }

  function handleDelete(id: string, name: string) {
    setMenu(null);
    if (window.confirm(`Delete profile "${name}"? This can't be undone.`)) deleteProfile(id);
  }

  const menuProfile = menu ? profiles.find((p) => p.id === menu.id) ?? null : null;

  return (
    <CardShell height={480}>
      <CardHeader title="All Profiles" subtitle="Create, manage, and switch between your profiles." />
      {/* Fixed height + internal scroll — the list can grow arbitrarily long without
          changing the card's overall size. */}
      <div className="overflow-y-auto" style={{ display: "flex", flexDirection: "column", gap: 10, height: 258, paddingRight: 4 }}>
        {profiles.map((p) => {
          const isActive = p.id === activeId;
          const isEditing = editingId === p.id;
          return (
            <div
              key={p.id}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 16px",
                background: isActive ? "#18181b" : "#111111",
                border: `1px solid ${isActive ? "#3f3f46" : "#2a2a2a"}`,
                borderRadius: "0 10px 0 10px",
              }}
            >
              {isEditing ? (
                <div style={{ display: "flex", gap: 8, flex: 1, alignItems: "center" }}>
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingId(null); }}
                    style={{ ...inputStyle, flex: 1, fontFamily: "inherit" }}
                  />
                  <button style={buttonStyle} onClick={commitEdit} {...buttonHoverProps}>Save</button>
                  <button style={buttonStyle} onClick={() => setEditingId(null)} {...buttonHoverProps}>Cancel</button>
                </div>
              ) : (
                <>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: 13, color: "#71717a", marginTop: 3 }}>Updated {formatUpdated(p.updatedAt)}</div>
                  </div>
                  {isActive ? (
                    <span
                      style={{
                        fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
                        color: "#4ade80", border: "1px solid #22633f", padding: "6px 10px", borderRadius: "0 6px 0 6px",
                        flexShrink: 0,
                      }}
                    >
                      Active
                    </span>
                  ) : (
                    <button style={buttonStyle} onClick={() => switchProfile(p.id)} {...buttonHoverProps}>Switch</button>
                  )}
                  <button
                    style={{ ...buttonStyle, padding: "10px 12px", color: "#a1a1aa" }}
                    onClick={(e) => openMenu(e, p.id)}
                    aria-label={`Options for ${p.name}`}
                    {...buttonHoverProps}
                  >
                    <MoreIcon />
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
      {/* Anchored via the button's own bounding rect and positioned fixed (viewport-relative)
          so it always renders above everything else instead of being clipped by the list's
          own overflow-y scroll region. */}
      {menu && menuProfile && (
        <div
          ref={menuRef}
          style={{
            position: "fixed", top: menu.y, left: menu.x, transform: "translateX(-100%)",
            background: "#1a1a1a", border: "1px solid #3f3f46", borderRadius: "0 10px 0 10px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.6)", padding: 8,
            display: "flex", flexDirection: "column", gap: 2,
            zIndex: 50, minWidth: 150,
          }}
        >
          <button style={menuItemStyle} onClick={() => startEdit(menuProfile.id, menuProfile.name)} {...menuItemHoverProps}>
            <EditIcon /> Edit
          </button>
          <button
            style={{ ...menuItemStyle, color: "#f87171" }}
            onClick={() => handleDelete(menuProfile.id, menuProfile.name)}
            {...menuItemHoverProps}
          >
            <TrashIcon /> Delete
          </button>
        </div>
      )}
      {/* Fixed-height wrapper — swapping between the two states below never changes
          the card's overall size. */}
      <div style={{ height: 48, display: "flex", alignItems: "center" }}>
        {creating ? (
          <div style={{ display: "flex", gap: 8, width: "100%" }}>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commitCreate(); if (e.key === "Escape") setCreating(false); }}
              placeholder="Profile name"
              style={{ ...inputStyle, flex: 1, fontFamily: "inherit" }}
            />
            <button style={buttonStyle} onClick={commitCreate} {...buttonHoverProps}>Create</button>
            <button style={buttonStyle} onClick={() => { setCreating(false); setNewName(""); }} {...buttonHoverProps}>Cancel</button>
          </div>
        ) : (
          <button
            style={{
              background: "transparent",
              border: "1px dashed #3f3f46",
              borderRadius: "0 10px 0 10px",
              color: "#a1a1aa",
              fontSize: 14, fontWeight: 600,
              padding: "13px 16px",
              cursor: "pointer",
              width: "100%",
              height: "100%",
            }}
            onClick={() => setCreating(true)}
            {...dashedButtonHoverProps}
          >
            + Create New Profile
          </button>
        )}
      </div>
    </CardShell>
  );
}

// ─── Export Profile ───────────────────────────────────────────────────────────

function ExportProfileCard() {
  const buildState = useBuildState();
  const { profiles, activeId } = useProfiles();
  const activeName = profiles.find((p) => p.id === activeId)?.name ?? "Profile";

  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    const payload = JSON.stringify({ name: activeName, state: buildState });
    setCode(await compressToCode(payload));
    setCopied(false);
  }

  async function handleCopy() {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
  }

  return (
    <CardShell height={312}>
      <CardHeader title="Export Profile" subtitle={`Generate an export code to share "${activeName}" with others.`} />
      <button style={primaryButtonStyle} onClick={handleGenerate} {...buttonHoverProps}>Generate Export Code</button>
      {/* Always rendered (even before a code exists) so generating one doesn't grow the card. */}
      <div style={{ display: "flex", gap: 10 }}>
        <input readOnly value={code} placeholder="Click Generate to create a code" style={{ ...inputStyle, flex: 1 }} />
        <button
          style={{ ...buttonStyle, opacity: code ? 1 : 0.5, cursor: code ? "pointer" : "default" }}
          onClick={handleCopy}
          disabled={!code}
          {...buttonHoverProps}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <span style={{ fontSize: 13, color: "#71717a" }}>Anyone with this code can import and use this profile.</span>
    </CardShell>
  );
}

// ─── Import Profile ───────────────────────────────────────────────────────────

function ImportProfileCard() {
  const { importProfile } = useProfiles();
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleImport() {
    if (!value.trim()) return;
    try {
      const json = await decompressFromCode(value);
      const parsed: unknown = JSON.parse(json);

      let name = "Imported Profile";
      let state: unknown = parsed;
      if (parsed && typeof parsed === "object" && "state" in parsed) {
        const wrapped = parsed as { name?: unknown; state?: unknown };
        if (typeof wrapped.name === "string" && wrapped.name.trim()) name = wrapped.name;
        state = wrapped.state;
      }
      if (!isBuildStateShaped(state)) throw new Error("not a build");

      importProfile(name, state);
      setStatus({ ok: true, message: `Imported as "${name}".` });
      setValue("");
    } catch {
      setStatus({ ok: false, message: "That export code doesn't look valid." });
    }
  }

  return (
    <CardShell height={312}>
      <CardHeader title="Import Profile" subtitle="Import a profile using an export code from another user." />
      <input
        value={value}
        onChange={(e) => { setValue(e.target.value); setStatus(null); }}
        placeholder="e.g. NX7C-9Q2L-RM4P-T8ZV"
        style={{ ...inputStyle, width: "100%" }}
      />
      <button style={primaryButtonStyle} onClick={handleImport} {...buttonHoverProps}>Import Profile</button>
      {/* Fixed-height slot, always mounted, so a status message appearing doesn't grow the card. */}
      <span style={{ fontSize: 13, height: 16, color: status ? (status.ok ? "#4ade80" : "#f87171") : "transparent" }}>
        {status?.message ?? " "}
      </span>
      <span style={{ fontSize: 13, color: "#71717a" }}>Imported profiles will be added to your profile list.</span>
    </CardShell>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilesPage() {
  return (
    <div className="min-h-screen" style={BG_STYLE}>
      <div className="min-h-screen flex flex-col items-center justify-center px-[15%] py-16">
        <OuterContainer>
          <div>
            <h1 style={{ fontSize: 40, fontWeight: 800, color: "#e0ddd8", margin: 0 }}>Profiles</h1>
            <p style={{ fontSize: 16, color: "#a1a1aa", marginTop: 8 }}>
              Manage your profiles, switch between them, or share with export codes.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 28, alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              <ActiveProfileCard />
              <AllProfilesCard />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              <ExportProfileCard />
              <ImportProfileCard />
            </div>
          </div>
        </OuterContainer>
      </div>
    </div>
  );
}
