export default function AuthBackground() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      {/* Top Left */}
      <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-emerald-300/20 blur-3xl" />

      {/* Top Right */}
      <div className="absolute -right-24 top-10 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl" />

      {/* Bottom Left */}
      <div className="absolute bottom-0 left-10 h-80 w-80 rounded-full bg-blue-300/20 blur-3xl" />

      {/* Bottom Right */}
      <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-emerald-200/20 blur-3xl" />
    </div>
  );
}