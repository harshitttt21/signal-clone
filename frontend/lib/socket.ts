import { WS_URL } from "./api";

type Listener = (data: any) => void;

class SocketClient {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<Listener>> = new Map();
  private token: string | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;

  connect(token: string) {
    this.token = token;
    this.shouldReconnect = true;
    this.open();
  }

  private open() {
    if (!this.token) return;
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }
    const socket = new WebSocket(
      `${WS_URL}/ws?token=${encodeURIComponent(this.token)}`
    );
    this.ws = socket;

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const set = this.listeners.get(data.type);
        set?.forEach((cb) => cb(data));
        const allSet = this.listeners.get("*");
        allSet?.forEach((cb) => cb(data));
      } catch {
        // ignore malformed frames
      }
    };

    socket.onclose = () => {
      if (this.shouldReconnect) {
        this.reconnectTimer = setTimeout(() => this.open(), 1500);
      }
    };

    socket.onerror = () => {
      socket.close();
    };
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  send(payload: object) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  on(type: string, cb: Listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(cb);
    return () => this.listeners.get(type)?.delete(cb);
  }
}

export const socketClient = new SocketClient();
