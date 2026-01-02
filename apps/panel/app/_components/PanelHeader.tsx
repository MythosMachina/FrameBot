export default function PanelHeader({
  eyebrow,
  title,
  lede,
}: {
  eyebrow: string;
  title: string;
  lede: string;
}) {
  return (
    <header className="masthead">
      <div className="brand">
        <span className="sigil" aria-hidden="true">
          <svg className="gear-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M11.42 2.255a.75.75 0 0 1 1.16 0l1.14 1.52c.257.343.72.47 1.117.306l1.768-.72a.75.75 0 0 1 .99.617l.188 1.89c.043.43.38.767.81.81l1.89.188a.75.75 0 0 1 .617.99l-.72 1.768a.75.75 0 0 0 .306 1.117l1.52 1.14a.75.75 0 0 1 0 1.16l-1.52 1.14a.75.75 0 0 0-.306 1.117l.72 1.768a.75.75 0 0 1-.617.99l-1.89.188a.75.75 0 0 0-.81.81l-.188 1.89a.75.75 0 0 1-.99.617l-1.768-.72a.75.75 0 0 0-1.117.306l-1.14 1.52a.75.75 0 0 1-1.16 0l-1.14-1.52a.75.75 0 0 0-1.117-.306l-1.768.72a.75.75 0 0 1-.99-.617l-.188-1.89a.75.75 0 0 0-.81-.81l-1.89-.188a.75.75 0 0 1-.617-.99l.72-1.768a.75.75 0 0 0-.306-1.117l-1.52-1.14a.75.75 0 0 1 0-1.16l1.52-1.14a.75.75 0 0 0 .306-1.117l-.72-1.768a.75.75 0 0 1 .617-.99l1.89-.188a.75.75 0 0 0 .81-.81l.188-1.89a.75.75 0 0 1 .99-.617l1.768.72a.75.75 0 0 0 1.117-.306l1.14-1.52ZM12 8.25a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5Z"
            />
          </svg>
        </span>
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
        </div>
      </div>
      <p className="lede">{lede}</p>
    </header>
  );
}
