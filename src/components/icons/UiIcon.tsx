export type UiIconName = "up-right" | "down-right" | "right" | "left" | "down" | "plus" | "play" | "close" | "menu";

export function UiIcon({ name, className = "" }: { name: UiIconName; className?: string }) {
  return <svg className={`ui-icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {name === "up-right" && <path d="M5 19 19 5M9 5h10v10" />}
    {name === "down-right" && <path d="m5 5 14 14M9 19h10V9" />}
    {name === "right" && <path d="M4 12h16m-6-6 6 6-6 6" />}
    {name === "left" && <path d="M20 12H4m6-6-6 6 6 6" />}
    {name === "down" && <path d="M12 4v16m-6-6 6 6 6-6" />}
    {name === "plus" && <path d="M12 5v14M5 12h14" />}
    {name === "play" && <path d="m9 6 10 6-10 6V6Z" className="ui-icon-accent" />}
    {name === "close" && <path d="M5 5 19 19M19 5 5 19" />}
    {name === "menu" && <path d="M4 6h16M4 12h16M4 18h16" />}
  </svg>;
}
