"use client";

import { useEffect, useState } from "react";
import { api, ConversationOut, UserOut } from "@/lib/api";
import Avatar from "./Avatar";
import Modal from "./Modal";

export default function GroupInfoModal({
  conversation,
  currentUserId,
  onClose,
  onUpdated,
}: {
  conversation: ConversationOut;
  currentUserId: string;
  onClose: () => void;
  onUpdated: (conv: ConversationOut) => void;
}) {
  const [contacts, setContacts] = useState<UserOut[]>([]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const isAdmin = conversation.members.some(
    (m) => m.user.id === currentUserId && m.role === "admin"
  );

  useEffect(() => {
    api.listContacts().then(setContacts).catch(() => {});
  }, []);

  const memberIds = new Set(conversation.members.map((m) => m.user.id));
  const addable = contacts.filter((c) => !memberIds.has(c.id));

  const addMember = async (userId: string) => {
    setError("");
    try {
      const conv = await api.addGroupMember(conversation.id, userId);
      onUpdated(conv);
    } catch (err: any) {
      setError(err.message || "Could not add member");
    }
  };

  const removeMember = async (userId: string) => {
    setError("");
    try {
      const conv = await api.removeGroupMember(conversation.id, userId);
      onUpdated(conv);
    } catch (err: any) {
      setError(err.message || "Could not remove member");
    }
  };

  return (
    <Modal title={conversation.name || "Group info"} onClose={onClose}>
      <p className="text-xs text-signal-textMuted mb-2 uppercase tracking-wide font-medium">
        {conversation.members.length} members
      </p>
      <div className="space-y-0.5 mb-4">
        {conversation.members.map((m) => (
          <div
            key={m.user.id}
            className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-signal-panel"
          >
            <Avatar src={m.user.avatar_url} name={m.user.display_name} size={40} />
            <div className="flex-1">
              <p className="text-sm font-medium text-signal-text">
                {m.user.display_name}
                {m.user.id === currentUserId ? " (you)" : ""}
              </p>
              <p className="text-xs text-signal-textMuted">
                {m.role === "admin" ? "Admin" : "Member"}
              </p>
            </div>
            {isAdmin && m.user.id !== currentUserId && (
              <button
                onClick={() => removeMember(m.user.id)}
                className="text-xs text-red-500 hover:underline"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

      {isAdmin && (
        <div>
          <button
            onClick={() => setAdding((a) => !a)}
            className="text-sm text-signal-blue font-medium mb-2"
          >
            {adding ? "Hide" : "+ Add members"}
          </button>
          {adding && (
            <div className="space-y-0.5">
              {addable.length === 0 && (
                <p className="text-sm text-signal-textMuted py-2">
                  All your contacts are already in this group
                </p>
              )}
              {addable.map((u) => (
                <button
                  key={u.id}
                  onClick={() => addMember(u.id)}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-signal-panel text-left"
                >
                  <Avatar src={u.avatar_url} name={u.display_name} size={36} />
                  <span className="text-sm text-signal-text">{u.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
