"use client";

import { useState } from "react";
import { useBuildState, useReplaceBuildState, type BuildState } from "@/app/state/BuildContext";

const BG_STYLE = {
  backgroundImage: [
    "linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, transparent 18%, transparent 82%, rgba(0,0,0,0.28) 100%)",
    "url('/background/background.jpg')",
  ].join(", "),
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
};

// ─── Build codes (export/import) ─────────────────────────────────────────────

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

function BuildCodePanel() {
  const buildState = useBuildState();
  const replaceBuildState = useReplaceBuildState();

  const [exportedCode, setExportedCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [importValue, setImportValue] = useState("");
  const [importStatus, setImportStatus] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleExport() {
    const code = await compressToCode(JSON.stringify(buildState));
    setExportedCode(code);
    setCopied(false);
  }

  async function handleCopy() {
    if (!exportedCode) return;
    await navigator.clipboard.writeText(exportedCode);
    setCopied(true);
  }

  async function handleImport() {
    if (!importValue.trim()) return;
    try {
      const json = await decompressFromCode(importValue);
      const parsed = JSON.parse(json);
      if (!isBuildStateShaped(parsed)) throw new Error("not a build");
      replaceBuildState(parsed);
      setImportStatus({ ok: true, message: "Build imported." });
    } catch {
      setImportStatus({ ok: false, message: "That build code doesn't look valid." });
    }
  }

  const inputStyle: React.CSSProperties = {
    background: "#0a0a0a",
    border: "1px solid #3f3f46",
    borderRadius: "0 8px 0 8px",
    color: "#e0ddd8",
    fontSize: 12,
    padding: "8px 10px",
    fontFamily: "monospace",
  };

  const buttonStyle: React.CSSProperties = {
    background: "#222222",
    border: "1px solid #3f3f46",
    borderRadius: "0 8px 0 8px",
    color: "#e0ddd8",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    padding: "8px 16px",
    cursor: "pointer",
    flexShrink: 0,
  };

  return (
    <div
      className="flex flex-col gap-3 p-5 text-[#e0ddd8]"
      style={{
        background: "linear-gradient(to bottom, #1d1e1e, #0a0a0a)",
        border: "1px solid #1c1c1c",
        borderRadius: "0 24px 0 24px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        width: "100%",
        maxWidth: "700px",
      }}
    >
      <span style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#52525b" }}>
        Profiles
      </span>
      <div style={{ height: "2px", background: "#333333" }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#52525b" }}>
          Export Build Code
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <input readOnly value={exportedCode} placeholder="Click Export to generate a code" style={{ ...inputStyle, flex: 1 }} />
          <button style={buttonStyle} onClick={handleExport}>Export</button>
          <button style={buttonStyle} onClick={handleCopy} disabled={!exportedCode}>{copied ? "Copied" : "Copy"}</button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#52525b" }}>
          Import Build Code
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={importValue}
            onChange={(e) => { setImportValue(e.target.value); setImportStatus(null); }}
            placeholder="Paste a build code"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button style={buttonStyle} onClick={handleImport}>Import</button>
        </div>
        {importStatus && (
          <span style={{ fontSize: 11, color: importStatus.ok ? "#4ade80" : "#f87171" }}>{importStatus.message}</span>
        )}
      </div>
    </div>
  );
}

export default function ProfilesPage() {
  return (
    <div className="min-h-screen" style={BG_STYLE}>
      <div className="min-h-screen flex flex-col items-center justify-center px-[15%]">
        <BuildCodePanel />
      </div>
    </div>
  );
}
