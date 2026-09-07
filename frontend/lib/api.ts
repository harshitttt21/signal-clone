export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

export interface UserOut {
  id: string;
  phone_or_username: string;
  display_name: string;
  avatar_url?: string | null;
  is_online: boolean;
  last_seen: string;
}

export interface MessageOut {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  status: "sending" | "sent" | "delivered" | "read";
  reply_to_message_id?: string | null;
  reply_to_body?: string | null;
  reply_to_sender_id?: string | null;
}

export interface ConversationMemberOut {
  user: UserOut;
  role: "admin" | "member";
}

export interface ConversationOut {
  id: string;
  is_group: boolean;
  name?: string | null;
  avatar_url?: string | null;
  members: ConversationMemberOut[];
  last_message?: MessageOut | null;
  unread_count: number;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("signal_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") {
        // normal error: detail is a plain message
        detail = body.detail;
      } else if (Array.isArray(body.detail)) {
        // FastAPI validation error: detail is an array of {msg, loc, ...}
        detail = body.detail
          .map((e: any) => e.msg || JSON.stringify(e))
          .join(", ");
      } else if (body.detail) {
        detail = JSON.stringify(body.detail);
      }
    } catch {
      // response wasn't JSON; keep statusText
    }
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Hits the backend root to check if it's awake. Used to detect Render cold starts.
  ping: () => request<{ status: string }>("/"),

  requestOtp: (phone_or_username: string) =>
    request<{ message: string }>("/auth/request-otp", {
      method: "POST",
      body: JSON.stringify({ phone_or_username }),
    }),

  register: (data: {
    phone_or_username: string;
    otp: string;
    display_name: string;
    avatar_url?: string;
  }) =>
    request<{ access_token: string; user: UserOut }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: { phone_or_username: string; otp: string }) =>
    request<{ access_token: string; user: UserOut }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  me: () => request<UserOut>("/auth/me"),

  searchUsers: (q: string) =>
    request<UserOut[]>(`/contacts/search?q=${encodeURIComponent(q)}`),

  listContacts: () => request<UserOut[]>("/contacts"),

  addContact: (phone_or_username: string) =>
    request<UserOut>("/contacts", {
      method: "POST",
      body: JSON.stringify({ phone_or_username }),
    }),

  listConversations: () => request<ConversationOut[]>("/conversations"),

  createDirectConversation: (contact_id: string) =>
    request<ConversationOut>("/conversations/direct", {
      method: "POST",
      body: JSON.stringify({ contact_id }),
    }),

  createGroup: (name: string, member_ids: string[]) =>
    request<ConversationOut>("/conversations/group", {
      method: "POST",
      body: JSON.stringify({ name, member_ids }),
    }),

  getMessages: (conversationId: string) =>
    request<MessageOut[]>(`/conversations/${conversationId}/messages`),

  addGroupMember: (conversationId: string, user_id: string) =>
    request<ConversationOut>(`/conversations/${conversationId}/members`, {
      method: "POST",
      body: JSON.stringify({ user_id }),
    }),

  removeGroupMember: (conversationId: string, userId: string) =>
    request<ConversationOut>(
      `/conversations/${conversationId}/members/${userId}`,
      { method: "DELETE" }
    ),
};
