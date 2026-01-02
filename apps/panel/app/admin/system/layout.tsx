import SystemNav from "./_components/SystemNav";

export default function SystemLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="system-shell">
      <SystemNav />
      <div className="system-content">{children}</div>
    </div>
  );
}
