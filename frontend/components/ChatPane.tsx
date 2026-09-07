"use client";

import { useEffect, useRef, useState } from "react";
import { ConversationOut, MessageOut } from "@/lib/api";
import Avatar from "./Avatar";
import MessageBubble from "./MessageBubble";

export default function ChatPane({
  conversation,
  messages,
  currentUserId,
  onSend,
  onTyping,
  typingNames,
  onlineMap,
  onOpenGroupInfo,
}: {
  conversation: ConversationOut;
  messages: MessageOut[];
  currentUserId: string;
  onSend: (body: string) => void;
  onTyping: (isTyping: boolean) => void;
  typingNames: string[];
  onlineMap: Record<string, boolean>;
  onOpenGroupInfo: () => void;
}) {
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, typingNames.length]);

  const other = conversation.members.find((m) => m.user.id !== currentUserId)?.user;
  const headerName = conversation.is_group ? conversation.name : other?.display_name;
  const online = other ? onlineMap[other.id] ?? other.is_online : false;

  const subtitle = conversation.is_group
    ? `${conversation.members.length} members`
    : online
    ? "Online"
    : other?.last_seen
    ? `Last seen ${new Date(other.last_seen).toLocaleString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : "";

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(e.target.value);
    onTyping(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => onTyping(false), 1500);
  };

  const handleSend = () => {
    const body = draft.trim();
    if (!body) return;
    onSend(body);
    setDraft("");
    onTyping(false);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
  };

  let lastSenderId: string | null = null;

  return (
    <div className="flex-1 flex flex-col h-full bg-signal-bg">
      <div className="flex items-center justify-between px-5 py-3 border-b border-signal-border">
        <button
          onClick={conversation.is_group ? onOpenGroupInfo : undefined}
          className="flex items-center gap-3 text-left"
        >
          <Avatar
            src={conversation.avatar_url}
            name={headerName || "?"}
            showOnline={!conversation.is_group}
            online={online}
          />
          <div>
            <p className="font-semibold text-[15px] text-signal-text">{headerName}</p>
            <p className="text-[12px] text-signal-textMuted">{subtitle}</p>
          </div>
        </button>
        <div className="flex items-center gap-1 text-signal-textMuted">
          <IconButton label="Voice call (coming soon)">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" />
          </IconButton>
          <IconButton label="Video call (coming soon)">
            <path d="M23 7l-7 5 7 5V7Z" />
            <rect x="1" y="5" width="15" height="14" rx="2" />
          </IconButton>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        {messages.length === 0 && (
          <div className="text-center text-sm text-signal-textMuted mt-10">
            No messages yet. Say hi 👋
          </div>
        )}
        {messages.map((m) => {
          const showSenderName =
            conversation.is_group && m.sender_id !== currentUserId && m.sender_id !== lastSenderId;
          lastSenderId = m.sender_id;
          const sender = conversation.members.find((mem) => mem.user.id === m.sender_id)?.user;
          return (
            <MessageBubble
              key={m.id}
              message={m}
              isOwn={m.sender_id === currentUserId}
              showSenderName={showSenderName}
              senderName={sender?.display_name}
            />
          );
        })}
        {typingNames.length > 0 && (
          <div className="px-4 mt-1">
            <div className="inline-flex items-center gap-1 bg-signal-bubbleReceived rounded-2xl px-3.5 py-2.5">
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-signal-textMuted inline-block" />
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-signal-textMuted inline-block" />
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-signal-textMuted inline-block" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-signal-border px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={handleChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message"
            rows={1}
            className="flex-1 resize-none bg-signal-panel rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-signal-blue/30 max-h-32"
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim()}
            className="w-10 h-10 rounded-full bg-signal-blue hover:bg-signal-blue-dark disabled:opacity-40 flex items-center justify-center flex-shrink-0 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7Z" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function IconButton({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <button
      title={label}
      className="w-9 h-9 rounded-full hover:bg-signal-panel flex items-center justify-center"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  );
}
