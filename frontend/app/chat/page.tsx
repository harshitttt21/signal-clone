"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api, ConversationOut, MessageOut } from "@/lib/api";
import { socketClient } from "@/lib/socket";
import ConversationList from "@/components/ConversationList";
import ChatPane from "@/components/ChatPane";
import NewChatModal from "@/components/NewChatModal";
import NewGroupModal from "@/components/NewGroupModal";
import GroupInfoModal from "@/components/GroupInfoModal";
import NavRail, { NavTab } from "@/components/NavRail";
import PlaceholderView from "@/components/PlaceholderView";
import SettingsModal from "@/components/SettingsModal";

export default function ChatPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [conversations, setConversations] = useState<ConversationOut[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageOut[]>([]);
  const [onlineMap, setOnlineMap] = useState<Record<string, boolean>>({});
  const [typingMap, setTypingMap] = useState<Record<string, Set<string>>>({});
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>("chats");
  const [showSettings, setShowSettings] = useState(false);
  const [replyTarget, setReplyTarget] = useState<MessageOut | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;
  const typingClearTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    api.listConversations().then(setConversations).catch(() => {});
  }, [user]);

  const refreshConversations = useCallback(() => {
    api.listConversations().then(setConversations).catch(() => {});
  }, []);

  const openConversation = useCallback(
    async (id: string) => {
      setSelectedId(id);
      setShowGroupInfo(false);
      try {
        const msgs = await api.getMessages(id);
        setMessages(msgs);
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c))
        );
        // Mark incoming messages as read now that the thread is open
        msgs
          .filter((m) => m.sender_id !== user?.id)
          .forEach((m) => {
            socketClient.send({ type: "receipt", message_id: m.id, status: "read" });
          });
      } catch {
        // ignore
      }
    },
    [user]
  );

  // Global keyboard shortcuts
  useEffect(() => {
    if (!user) return;

    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Esc: close modals / cancel reply (works even while typing)
      if (e.key === "Escape") {
        if (showShortcuts) return setShowShortcuts(false);
        if (showNewChat) return setShowNewChat(false);
        if (showNewGroup) return setShowNewGroup(false);
        if (showGroupInfo) return setShowGroupInfo(false);
        if (showSettings) return setShowSettings(false);
        if (replyTarget) return setReplyTarget(null);
        return;
      }

      // Cmd/Ctrl+K -> new chat
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowNewChat(true);
        return;
      }
      // Cmd/Ctrl+G -> new group
      if (mod && e.key.toLowerCase() === "g") {
        e.preventDefault();
        setShowNewGroup(true);
        return;
      }
      // Cmd/Ctrl+/ -> shortcuts help
      if (mod && e.key === "/") {
        e.preventDefault();
        setShowShortcuts((s) => !s);
        return;
      }

      // Arrow up/down to move between conversations (only when not typing)
      if (!typing && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        if (conversations.length === 0) return;
        e.preventDefault();
        const idx = conversations.findIndex((c) => c.id === selectedIdRef.current);
        let nextIdx;
        if (e.key === "ArrowDown") {
          nextIdx = idx < 0 ? 0 : Math.min(idx + 1, conversations.length - 1);
        } else {
          nextIdx = idx < 0 ? 0 : Math.max(idx - 1, 0);
        }
        openConversation(conversations[nextIdx].id);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    user,
    conversations,
    openConversation,
    showShortcuts,
    showNewChat,
    showNewGroup,
    showGroupInfo,
    showSettings,
    replyTarget,
  ]);

  useEffect(() => {
    if (!user) return;

    const offMessage = socketClient.on("message:new", (data) => {
      const { conversation_id, message, client_temp_id } = data;
      const isCurrentConv = selectedIdRef.current === conversation_id;

      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === conversation_id);
        if (idx === -1) {
          // conversation not known locally yet (e.g. brand new chat started by peer)
          refreshConversations();
          return prev;
        }
        const updated = [...prev];
        const conv = { ...updated[idx], last_message: message };
        if (!isCurrentConv && message.sender_id !== user.id) {
          conv.unread_count = (conv.unread_count || 0) + 1;
        }
        updated.splice(idx, 1);
        updated.unshift(conv);
        return updated;
      });

      if (isCurrentConv) {
        setMessages((prev) => {
          if (client_temp_id) {
            const tempIdx = prev.findIndex((m) => m.id === client_temp_id);
            if (tempIdx !== -1) {
              const copy = [...prev];
              copy[tempIdx] = message;
              return copy;
            }
          }
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
        if (message.sender_id !== user.id) {
          socketClient.send({ type: "receipt", message_id: message.id, status: "read" });
        }
      }
    });

    const offTyping = socketClient.on("typing", (data) => {
      const { conversation_id, user_id, is_typing } = data;
      setTypingMap((prev) => {
        const next = { ...prev };
        const set = new Set(next[conversation_id] || []);
        if (is_typing) set.add(user_id);
        else set.delete(user_id);
        next[conversation_id] = set;
        return next;
      });
      const key = `${conversation_id}:${user_id}`;
      if (typingClearTimers.current[key]) clearTimeout(typingClearTimers.current[key]);
      if (is_typing) {
        typingClearTimers.current[key] = setTimeout(() => {
          setTypingMap((prev) => {
            const next = { ...prev };
            const set = new Set(next[conversation_id] || []);
            set.delete(user_id);
            next[conversation_id] = set;
            return next;
          });
        }, 3000);
      }
    });

    const offReceipt = socketClient.on("receipt:update", (data) => {
      const { message_id, conversation_id, status } = data;
      setMessages((prev) =>
        prev.map((m) => (m.id === message_id ? { ...m, status } : m))
      );
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversation_id && c.last_message?.id === message_id
            ? { ...c, last_message: { ...c.last_message!, status } }
            : c
        )
      );
    });

    const offPresence = socketClient.on("presence", (data) => {
      setOnlineMap((prev) => ({ ...prev, [data.user_id]: data.is_online }));
    });

    return () => {
      offMessage();
      offTyping();
      offReceipt();
      offPresence();
    };
  }, [user, refreshConversations]);

  if (loading || !user) {
    return (
      <div className="h-screen flex items-center justify-center text-signal-textMuted">
        Loading…
      </div>
    );
  }

  const selectedConversation = conversations.find((c) => c.id === selectedId) || null;
  const typingUserIds = selectedId ? Array.from(typingMap[selectedId] || []) : [];
  const typingNames = typingUserIds
    .map((id) => selectedConversation?.members.find((m) => m.user.id === id)?.user.display_name)
    .filter(Boolean) as string[];

  const handleSend = (body: string) => {
    if (!selectedId) return;
    const tempId = `temp-${crypto.randomUUID()}`;
    const optimistic: MessageOut = {
      id: tempId,
      conversation_id: selectedId,
      sender_id: user.id,
      body,
      created_at: new Date().toISOString(),
      status: "sending",
      reply_to_message_id: replyTarget?.id ?? null,
      reply_to_body: replyTarget?.body ?? null,
      reply_to_sender_id: replyTarget?.sender_id ?? null,
    };
    setMessages((prev) => [...prev, optimistic]);
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === selectedId);
      if (idx === -1) return prev;
      const updated = [...prev];
      const conv = { ...updated[idx], last_message: optimistic };
      updated.splice(idx, 1);
      updated.unshift(conv);
      return updated;
    });
    socketClient.send({
      type: "message:send",
      conversation_id: selectedId,
      body,
      client_temp_id: tempId,
      reply_to_message_id: replyTarget?.id ?? null,
    });
    setReplyTarget(null);
  };

  const handleTyping = (isTyping: boolean) => {
    if (!selectedId) return;
    socketClient.send({ type: "typing", conversation_id: selectedId, is_typing: isTyping });
  };

  const handleConversationCreated = (conv: ConversationOut) => {
    setConversations((prev) => {
      if (prev.some((c) => c.id === conv.id)) return prev;
      return [conv, ...prev];
    });
    setShowNewChat(false);
    setShowNewGroup(false);
    openConversation(conv.id);
  };

  return (
    <div className="h-screen w-full flex flex-col md:flex-row overflow-hidden">
      {/* Nav rail: desktop/tablet only */}
      <div className="hidden md:flex">
        <NavRail
          active={activeTab}
          onChange={setActiveTab}
          onOpenSettings={() => setShowSettings(true)}
        />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
      {activeTab === "calls" && (
        <PlaceholderView
          title="Calls"
          subtitle="Voice and video calls will show up here. This is a placeholder for the assignment."
          icon={
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          }
        />
      )}

      {activeTab === "stories" && (
        <PlaceholderView
          title="Stories"
          subtitle="Disappearing photo and video updates from your contacts will appear here. This is a placeholder for the assignment."
          icon={
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="7" y="2" width="10" height="20" rx="3" />
              <path d="M3 6v12M21 6v12" opacity="0.5" />
            </svg>
          }
        />
      )}

      {activeTab === "chats" && (
        <>
      {/* Conversation list: full-width on mobile, fixed width on desktop.
          On mobile, hidden once a conversation is open. */}
      <div className={`${selectedConversation ? "hidden md:flex" : "flex"} w-full md:w-auto`}>
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={openConversation}
          onNewChat={() => setShowNewChat(true)}
          onNewGroup={() => setShowNewGroup(true)}
          onlineMap={onlineMap}
        />
      </div>

      {/* Chat pane: full-screen on mobile when open; hidden on mobile when no chat */}
      {selectedConversation ? (
        <div className={`${selectedConversation ? "flex" : "hidden"} flex-1 min-w-0`}>
        <ChatPane
          conversation={selectedConversation}
          messages={messages}
          currentUserId={user.id}
          onSend={handleSend}
          onTyping={handleTyping}
          typingNames={typingNames}
          onlineMap={onlineMap}
          onOpenGroupInfo={() => setShowGroupInfo(true)}
          onBack={() => setSelectedId(null)}
          replyTarget={replyTarget}
          onReply={(m) => setReplyTarget(m)}
          onCancelReply={() => setReplyTarget(null)}
        />
        </div>
      ) : (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center text-signal-textMuted bg-signal-panel/40">
          <div className="w-20 h-20 rounded-full bg-signal-blue/10 flex items-center justify-center mb-4">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2C6.48 2 2 6.03 2 11c0 2.4 1.05 4.57 2.77 6.17-.09.9-.42 2.5-1.27 3.83 1.83-.32 3.5-1.15 4.4-1.72A11.6 11.6 0 0 0 12 20c5.52 0 10-4.03 10-9s-4.48-9-10-9z"
                fill="#3A76F0"
              />
            </svg>
          </div>
          <p className="text-sm">Select a conversation or start a new one</p>
        </div>
      )}
        </>
      )}
      </div>

      {/* Bottom tab bar: mobile only. Hidden when a chat is open so it doesn't cover the composer. */}
      {!selectedConversation && (
        <div className="flex md:hidden border-t border-signal-border bg-signal-bg">
          {([
            ["chats", "Chats"],
            ["calls", "Calls"],
            ["stories", "Stories"],
          ] as [NavTab, string][]).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 ${
                activeTab === tab ? "text-signal-blue" : "text-signal-textMuted"
              }`}
            >
              {tab === "chats" && (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
              )}
              {tab === "calls" && (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
              )}
              {tab === "stories" && (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="2" width="10" height="20" rx="3" /><path d="M3 6v12M21 6v12" opacity="0.5" /></svg>
              )}
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          ))}
          <button
            onClick={() => setShowSettings(true)}
            className="flex-1 flex flex-col items-center gap-0.5 py-2 text-signal-textMuted"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
            <span className="text-[10px] font-medium">Settings</span>
          </button>
        </div>
      )}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {showShortcuts && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="bg-signal-bg rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-signal-border">
              <h2 className="font-semibold text-[16px] text-signal-text">
                Keyboard shortcuts
              </h2>
              <button
                onClick={() => setShowShortcuts(false)}
                className="w-8 h-8 rounded-full hover:bg-signal-panel flex items-center justify-center text-signal-textMuted"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-2.5">
              {[
                ["Send message", "Enter"],
                ["New line", "Shift + Enter"],
                ["New chat", "⌘ / Ctrl + K"],
                ["New group", "⌘ / Ctrl + G"],
                ["Next / previous chat", "↑ / ↓"],
                ["Close / cancel", "Esc"],
                ["This help", "⌘ / Ctrl + /"],
              ].map(([label, keys]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-signal-text">{label}</span>
                  <kbd className="text-[12px] font-medium text-signal-textMuted bg-signal-panel border border-signal-border rounded px-2 py-1">
                    {keys}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showNewChat && (
        <NewChatModal onClose={() => setShowNewChat(false)} onCreated={handleConversationCreated} />
      )}
      {showNewGroup && (
        <NewGroupModal onClose={() => setShowNewGroup(false)} onCreated={handleConversationCreated} />
      )}
      {showGroupInfo && selectedConversation && (
        <GroupInfoModal
          conversation={selectedConversation}
          currentUserId={user.id}
          onClose={() => setShowGroupInfo(false)}
          onUpdated={(conv) => {
            setConversations((prev) => prev.map((c) => (c.id === conv.id ? conv : c)));
          }}
        />
      )}
    </div>
  );
}
