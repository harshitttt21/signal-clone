import { MessageOut } from "@/lib/api";

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function StatusTicks({ status }: { status: MessageOut["status"] }) {
  if (status === "sending") {
    return <span className="text-[10px] opacity-70">Sending…</span>;
  }
  const color = status === "read" ? "#5EC9FF" : "rgba(255,255,255,0.85)";
  const double = status === "delivered" || status === "read";
  return (
    <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
      <path
        d="M1 5.5L4 8.5L9 2.5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {double && (
        <path
          d="M6 5.5L9 8.5L15 1.5"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

export default function MessageBubble({
  message,
  isOwn,
  showSenderName,
  senderName,
  replySenderName,
  onReply,
}: {
  message: MessageOut;
  isOwn: boolean;
  showSenderName?: boolean;
  senderName?: string;
  replySenderName?: string;
  onReply?: (message: MessageOut) => void;
}) {
  return (
    <div className={`group flex items-center gap-2 ${isOwn ? "justify-end" : "justify-start"} px-4 mb-1.5`}>
      {/* reply button on the left for own messages */}
      {isOwn && onReply && (
        <button
          onClick={() => onReply(message)}
          title="Reply"
          className="opacity-0 group-hover:opacity-100 transition-opacity text-signal-textMuted hover:text-signal-blue"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 17l-5-5 5-5M4 12h11a4 4 0 0 1 4 4v2" />
          </svg>
        </button>
      )}

      <div
        className={`relative max-w-[65%] rounded-2xl px-3.5 py-2 ${
          isOwn
            ? "bg-signal-blue text-white rounded-br-sm"
            : "bg-signal-bubbleReceived text-signal-text rounded-bl-sm"
        }`}
      >
        {showSenderName && !isOwn && (
          <p className="text-[11px] font-semibold text-signal-blue mb-0.5">
            {senderName}
          </p>
        )}

        {/* quoted reply preview */}
        {message.reply_to_message_id && message.reply_to_body && (
          <div
            className={`mb-1 rounded-md px-2 py-1 border-l-2 ${
              isOwn
                ? "bg-white/15 border-white/60"
                : "bg-black/5 border-signal-blue"
            }`}
          >
            <p className={`text-[10px] font-semibold ${isOwn ? "text-white/90" : "text-signal-blue"}`}>
              {replySenderName || "Reply"}
            </p>
            <p className={`text-[12px] truncate ${isOwn ? "text-white/80" : "text-signal-textMuted"}`}>
              {message.reply_to_body}
            </p>
          </div>
        )}

        <p className="text-[14px] leading-snug whitespace-pre-wrap break-words">
          {message.body}
        </p>
        <div
          className={`flex items-center gap-1 justify-end mt-0.5 ${
            isOwn ? "text-white/80" : "text-signal-textMuted"
          }`}
        >
          <span className="text-[10px]">{formatTime(message.created_at)}</span>
          {isOwn && <StatusTicks status={message.status} />}
        </div>
      </div>

      {/* reply button on the right for others' messages */}
      {!isOwn && onReply && (
        <button
          onClick={() => onReply(message)}
          title="Reply"
          className="opacity-0 group-hover:opacity-100 transition-opacity text-signal-textMuted hover:text-signal-blue"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 17l-5-5 5-5M4 12h11a4 4 0 0 1 4 4v2" />
          </svg>
        </button>
      )}
    </div>
  );
}
