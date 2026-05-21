const BG_STYLE = {
  backgroundImage: [
    "linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, transparent 18%, transparent 82%, rgba(0,0,0,0.28) 100%)",
    "url('/background/background.jpg')",
  ].join(", "),
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
};

export default function TalentsPage() {
  return (
    <div className="min-h-screen" style={BG_STYLE}>
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Talents — coming soon</p>
      </div>
    </div>
  );
}
