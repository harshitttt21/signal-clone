"use client";

import { useEffect, useState } from "react";
import { api, ConversationOut, UserOut } from "@/lib/api";
import Avatar from "./Avatar";
import Modal from "./Modal";

export default function NewGroupModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (conv: ConversationOut) => void;
}) {
  const [name, setName] = useState("");
  const [contacts, setContacts] = useState<UserOut[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.listContacts().then(setContacts).catch(() => {});
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const submit = async () => {
    setError("");
    if (!name.trim()) {
      setError("Give your group a name");
      return;
    }
    if (selected.size === 0) {
      setError("Add at least one member");
      return;
    }
    setSubmitting(true);
    try {
      const conv = await api.createGroup(name.trim(), Array.from(selected));
      onCreated(conv);
    } catch (err: any) {
      setError(err.message || "Could not create group");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="New group" onClose={onClose}>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Group name"
        className="w-full bg-signal-panel rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-signal-blue/30 mb-3"
      />
      <p className="text-xs text-signal-textMuted mb-2 uppercase tracking-wide font-medium">
        Members ({selected.size} selected)
      </p>
      <div className="space-y-0.5 mb-4">
        {contacts.length === 0 && (
          <p className="text-sm text-signal-textMuted text-center py-6">
            Add some contacts first from New Chat
          </p>
        )}
        {contacts.map((u) => (
          <button
            key={u.id}
            onClick={() => toggle(u.id)}
            className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-signal-panel text-left"
          >
            <Avatar src={u.avatar_url} name={u.display_name} size={40} />
            <div className="flex-1">
              <p className="text-sm font-medium text-signal-text">{u.display_name}</p>
              <p className="text-xs text-signal-textMuted">@{u.phone_or_username}</p>
            </div>
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selected.has(u.id)
                  ? "bg-signal-blue border-signal-blue"
                  : "border-signal-border"
              }`}
            >
              {selected.has(u.id) && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
      <button
        onClick={submit}
        disabled={submitting}
        className="w-full bg-signal-blue hover:bg-signal-blue-dark text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-60"
      >
        {submitting ? "Creating…" : "Create group"}
      </button>
    </Modal>
  );
}
