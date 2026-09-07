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
}: {
  message: MessageOut;
  isOwn: boolean;
  showSenderName?: boolean;
  senderName?: string;
}) {
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} px-4 mb-1.5`}>
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
    </div>
  );
}
