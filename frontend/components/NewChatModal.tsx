"use client";

import { useEffect, useState } from "react";
import { api, ConversationOut, UserOut } from "@/lib/api";
import Avatar from "./Avatar";
import Modal from "./Modal";

export default function NewChatModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (conv: ConversationOut) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserOut[]>([]);
  const [contacts, setContacts] = useState<UserOut[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    api.listContacts().then(setContacts).catch(() => {});
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      api
        .searchUsers(query)
        .then(setResults)
        .catch(() => setResults([]));
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  const startChat = async (user: UserOut) => {
    setError("");
    setBusyId(user.id);
    try {
      // ensure they're a contact for convenience, ignore failure if already added
      await api.addContact(user.phone_or_username).catch(() => {});
      const conv = await api.createDirectConversation(user.id);
      onCreated(conv);
    } catch (err: any) {
      setError(err.message || "Could not start chat");
    } finally {
      setBusyId(null);
    }
  };

  const list = query.trim() ? results : contacts;

  return (
    <Modal title="New chat" onClose={onClose}>
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or username"
        className="w-full bg-signal-panel rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-signal-blue/30 mb-3"
      />
      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
      {!query.trim() && (
        <p className="text-xs text-signal-textMuted mb-2 uppercase tracking-wide font-medium">
          Contacts
        </p>
      )}
      <div className="space-y-0.5">
        {list.length === 0 && (
          <p className="text-sm text-signal-textMuted text-center py-6">
            {query.trim() ? "No users found" : "No contacts yet — search above to add one"}
          </p>
        )}
        {list.map((u) => (
          <button
            key={u.id}
            onClick={() => startChat(u)}
            disabled={busyId === u.id}
            className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-signal-panel text-left disabled:opacity-50"
          >
            <Avatar src={u.avatar_url} name={u.display_name} size={40} />
            <div>
              <p className="text-sm font-medium text-signal-text">{u.display_name}</p>
              <p className="text-xs text-signal-textMuted">@{u.phone_or_username}</p>
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
}
