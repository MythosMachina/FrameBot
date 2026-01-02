import UserNav from "./_components/UserNav";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="user-shell">
      <UserNav />
      <div className="user-content">{children}</div>
    </div>
  );
}
