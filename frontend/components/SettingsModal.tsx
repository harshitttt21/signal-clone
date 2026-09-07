"use client";

import { useState } from "react";
import Modal from "./Modal";

type Section = "privacy" | "notifications" | "appearance" | "linked" | "help";

const SECTIONS: { id: Section; label: string; icon: JSX.Element }[] = [
  {
    id: "privacy",
    label: "Privacy",
    icon: (
      <path d="M12 2l7 4v6c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-4z" />
    ),
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: (
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
    ),
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: <path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19" />,
  },
  {
    id: "linked",
    label: "Linked devices",
    icon: (
      <>
        <rect x="4" y="2" width="10" height="20" rx="2" />
        <path d="M15 8h5v10a2 2 0 0 1-2 2h-3" />
      </>
    ),
  },
  {
    id: "help",
    label: "Help",
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" />
      </>
    ),
  },
];

function Toggle({ defaultOn = false }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      onClick={() => setOn((o) => !o)}
      className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 ${
        on ? "bg-signal-blue" : "bg-gray-300"
      }`}
    >
      <span
        className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${
          on ? "translate-x-[18px]" : "translate-x-[2px]"
        }`}
      />
    </button>
  );
}

function Row({
  title,
  subtitle,
  control,
}: {
  title: string;
  subtitle?: string;
  control?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-signal-border last:border-0">
      <div>
        <p className="text-sm text-signal-text">{title}</p>
        {subtitle && <p className="text-xs text-signal-textMuted mt-0.5">{subtitle}</p>}
      </div>
      {control}
    </div>
  );
}

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const [active, setActive] = useState<Section>("privacy");

  return (
    <Modal title="Settings" onClose={onClose}>
      <div className="flex gap-4 -m-1">
        <div className="w-40 flex-shrink-0 space-y-0.5">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-sm transition-colors ${
                active === s.id
                  ? "bg-signal-blue/10 text-signal-blue font-medium"
                  : "text-signal-text hover:bg-signal-panel"
              }`}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {s.icon}
              </svg>
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-0">
          {active === "privacy" && (
            <div>
              <Row title="Read receipts" subtitle="Show when you've read messages" control={<Toggle defaultOn />} />
              <Row title="Typing indicators" subtitle="Show when you're typing" control={<Toggle defaultOn />} />
              <Row title="Disappearing messages" subtitle="Set a default timer for new chats" control={<Toggle />} />
              <Row title="Screen lock" subtitle="Require unlock to open the app" control={<Toggle />} />
            </div>
          )}
          {active === "notifications" && (
            <div>
              <Row title="Message notifications" subtitle="Play a sound for new messages" control={<Toggle defaultOn />} />
              <Row title="Show preview" subtitle="Display message text in notifications" control={<Toggle defaultOn />} />
              <Row title="Reaction notifications" subtitle="Notify when someone reacts" control={<Toggle />} />
            </div>
          )}
          {active === "appearance" && (
            <div>
              <Row title="Theme" subtitle="Light (dark mode coming soon)" control={<Toggle />} />
              <Row title="Chat wallpaper" subtitle="Default" />
              <Row title="Message font size" subtitle="Medium" />
            </div>
          )}
          {active === "linked" && (
            <ComingSoon
              title="Linked devices"
              body="Use Signal Clone on your computer and tablet, linked to your phone. This feature is coming soon."
            />
          )}
          {active === "help" && (
            <ComingSoon
              title="Help"
              body="Support articles and contact options will appear here. Coming soon."
            />
          )}
        </div>
      </div>
    </Modal>
  );
}

function ComingSoon({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4">
      <div className="w-12 h-12 rounded-full bg-signal-blue/10 flex items-center justify-center mb-3">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A76F0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      </div>
      <p className="text-sm font-medium text-signal-text mb-1">{title}</p>
      <p className="text-xs text-signal-textMuted max-w-[220px]">{body}</p>
      <span className="mt-3 text-[11px] font-medium text-signal-blue bg-signal-blue/10 px-2.5 py-1 rounded-full">
        Coming soon
      </span>
    </div>
  );
}
