import type { ReactNode, SVGProps } from "react";

export type UiIconName =
  | "home"
  | "check"
  | "users"
  | "star"
  | "library"
  | "message"
  | "report"
  | "settings"
  | "book"
  | "calendar"
  | "sparkle"
  | "pen"
  | "layers"
  | "database"
  | "shield"
  | "student"
  | "more";

export function UiIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: UiIconName }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  const paths: Record<UiIconName, ReactNode> = {
    home: <><path d="M3.5 10.5 12 3l8.5 7.5"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-6h5v6"/></>,
    check: <><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="m8 12 2.6 2.6L16.5 9"/></>,
    users: <><path d="M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20"/><circle cx="10" cy="8" r="3"/><path d="M17 11.5a2.7 2.7 0 1 0 0-5.4"/><path d="M18 15.2a3.3 3.3 0 0 1 2 3V20"/></>,
    star: <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>,
    library: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22V5.5Z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22V5.5Z"/></>,
    message: <><path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H10l-5 4v-4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="M7.5 9.5h9M7.5 13h6"/></>,
    report: <><path d="M5 3.5h14v17H5z"/><path d="M8 16v-4M12 16V8M16 16v-6"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22V5.5Z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22V5.5Z"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 10h18"/></>,
    sparkle: <><path d="m12 3 1.2 3.1L16 7.3l-2.8 1.2L12 12l-1.2-3.5L8 7.3l2.8-1.2L12 3Z"/><path d="m18 13 .8 2.1 2.2.9-2.2.9L18 19l-.8-2.1L15 16l2.2-.9L18 13Z"/></>,
    pen: <><path d="m5 19 3.5-.8L19 7.7 16.3 5 5.8 15.5 5 19Z"/><path d="m14.5 6.8 2.7 2.7"/></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>,
    database: <><ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5"/><path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/></>,
    shield: <><path d="M12 3 5 6v5c0 4.6 2.8 8 7 10 4.2-2 7-5.4 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></>,
    student: <><circle cx="12" cy="8" r="3.2"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/></>,
    more: <><circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none"/></>,
  };

  return <svg {...common} {...props}>{paths[name]}</svg>;
}
