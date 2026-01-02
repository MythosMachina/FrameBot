import "./globals.css";

export const metadata = {
  title: "FrameBot Control Panel",
  description: "Automaton control panel for FrameBot.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="frame">{children}</div>
      </body>
    </html>
  );
}
