"use client";

import { useMemo, useState } from "react";
import { ConversationOut } from "@/lib/api";
import Avatar from "./Avatar";
import SettingsModal from "./SettingsModal";
import { useAuth } from "@/contexts/AuthContext";

function timeAgo(iso?: string | null) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export default function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onNewChat,
  onNewGroup,
  onlineMap,
}: {
  conversations: ConversationOut[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onNewGroup: () => void;
  onlineMap: Record<string, boolean>;
}) {
  const { user, logout } = useAuth();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return conversations;
    const q = query.toLowerCase();
    return conversations.filter((c) => {
      const name =
        c.name ||
        c.members.find((m) => m.user.id !== user?.id)?.user.display_name ||
        "";
      return name.toLowerCase().includes(q);
    });
  }, [conversations, query, user]);

  return (
    <div className="w-[360px] flex-shrink-0 border-r border-signal-border flex flex-col bg-signal-bg h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-signal-border">
        <div className="flex items-center gap-2 relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2"
          >
            <Avatar src={user?.avatar_url} name={user?.display_name || "?"} size={34} />
            <span className="font-semibold text-[15px] text-signal-text">
              {user?.display_name}
            </span>
          </button>
          {menuOpen && (
            <div className="absolute top-10 left-0 bg-signal-bg border border-signal-border rounded-lg shadow-lg py-1 w-44 z-20">
              <button
                onClick={() => {
                  setShowSettings(true);
                  setMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-signal-text hover:bg-signal-panel flex items-center gap-2"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                Settings
              </button>
              <button
                onClick={logout}
                className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-signal-panel flex items-center gap-2"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
                Log out
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onNewGroup}
            title="New group"
            className="w-9 h-9 rounded-full hover:bg-signal-panel flex items-center justify-center text-signal-blue"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
              <path
                d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM21 21v-2a4 4 0 0 0-3-3.87M15.5 3.13a4 4 0 0 1 0 7.75"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            onClick={onNewChat}
            title="New chat"
            className="w-9 h-9 rounded-full hover:bg-signal-panel flex items-center justify-center text-signal-blue"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="px-3 py-2 border-b border-signal-border">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-signal-textMuted"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M21 21l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="w-full bg-signal-panel rounded-full pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-signal-blue/30"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="text-center text-sm text-signal-textMuted mt-10 px-6">
            No conversations yet. Start one with the + button above.
          </div>
        )}
        {filtered.map((c) => {
          const other = c.members.find((m) => m.user.id !== user?.id)?.user;
          const displayName = c.is_group ? c.name : other?.display_name;
          const online = other ? onlineMap[other.id] ?? other.is_online : false;
          const isSelected = c.id === selectedId;
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                isSelected ? "bg-signal-panel" : "hover:bg-signal-panel/60"
              }`}
            >
              <Avatar
                src={c.avatar_url}
                name={displayName || "?"}
                showOnline={!c.is_group}
                online={online}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[14px] text-signal-text truncate">
                    {displayName}
                  </span>
                  <span className="text-[11px] text-signal-textMuted flex-shrink-0 ml-2">
                    {timeAgo(c.last_message?.created_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[13px] text-signal-textMuted truncate max-w-[220px]">
                    {c.last_message
                      ? `${
                          c.last_message.sender_id === user?.id ? "You: " : ""
                        }${c.last_message.body}`
                      : "No messages yet"}
                  </span>
                  {c.unread_count > 0 && (
                    <span className="bg-signal-blue text-white text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center flex-shrink-0 ml-2">
                      {c.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
"use client";

import { useMemo, useState } from "react";
import { ConversationOut } from "@/lib/api";
import Avatar from "./Avatar";
import SettingsModal from "./SettingsModal";
import { useAuth } from "@/contexts/AuthContext";

function timeAgo(iso?: string | null) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export default function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onNewChat,
  onNewGroup,
  onlineMap,
}: {
  conversations: ConversationOut[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onNewGroup: () => void;
  onlineMap: Record<string, boolean>;
}) {
  const { user, logout } = useAuth();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return conversations;
    const q = query.toLowerCase();
    return conversations.filter((c) => {
      const name =
        c.name ||
        c.members.find((m) => m.user.id !== user?.id)?.user.display_name ||
        "";
      return name.toLowerCase().includes(q);
    });
  }, [conversations, query, user]);

  return (
    <div className="w-[360px] flex-shrink-0 border-r border-signal-border flex flex-col bg-signal-bg h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-signal-border">
        <div className="flex items-center gap-2 relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2"
          >
            <Avatar src={user?.avatar_url} name={user?.display_name || "?"} size={34} />
            <span className="font-semibold text-[15px] text-signal-text">
              {user?.display_name}
            </span>
          </button>
          {menuOpen && (
            <div className="absolute top-10 left-0 bg-signal-bg border border-signal-border rounded-lg shadow-lg py-1 w-44 z-20">
              <button
                onClick={() => {
                  setShowSettings(true);
                  setMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-signal-text hover:bg-signal-panel flex items-center gap-2"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                Settings
              </button>
              <button
                onClick={logout}
                className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-signal-panel flex items-center gap-2"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
                Log out
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onNewGroup}
            title="New group"
            className="w-9 h-9 rounded-full hover:bg-signal-panel flex items-center justify-center text-signal-blue"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
              <path
                d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM21 21v-2a4 4 0 0 0-3-3.87M15.5 3.13a4 4 0 0 1 0 7.75"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            onClick={onNewChat}
            title="New chat"
            className="w-9 h-9 rounded-full hover:bg-signal-panel flex items-center justify-center text-signal-blue"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="px-3 py-2 border-b border-signal-border">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-signal-textMuted"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M21 21l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="w-full bg-signal-panel rounded-full pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-signal-blue/30"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="text-center text-sm text-signal-textMuted mt-10 px-6">
            No conversations yet. Start one with the + button above.
          </div>
        )}
        {filtered.map((c) => {
          const other = c.members.find((m) => m.user.id !== user?.id)?.user;
          const displayName = c.is_group ? c.name : other?.display_name;
          const online = other ? onlineMap[other.id] ?? other.is_online : false;
          const isSelected = c.id === selectedId;
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                isSelected ? "bg-signal-panel" : "hover:bg-signal-panel/60"
              }`}
            >
              <Avatar
                src={c.avatar_url}
                name={displayName || "?"}
                showOnline={!c.is_group}
                online={online}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[14px] text-signal-text truncate">
                    {displayName}
                  </span>
                  <span className="text-[11px] text-signal-textMuted flex-shrink-0 ml-2">
                    {timeAgo(c.last_message?.created_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[13px] text-signal-textMuted truncate max-w-[220px]">
                    {c.last_message
                      ? `${
                          c.last_message.sender_id === user?.id ? "You: " : ""
                        }${c.last_message.body}`
                      : "No messages yet"}
                  </span>
                  {c.unread_count > 0 && (
                    <span className="bg-signal-blue text-white text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center flex-shrink-0 ml-2">
                      {c.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
