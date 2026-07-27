export type WebSocketCallback = (data: any) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private callbacks: Set<WebSocketCallback> = new Set();
  private reconnectInterval = 3000;
  private reconnectTimer: number | null = null;
  private url: string;
  private isConnecting = false;
  private messageQueue: string[] = [];

  constructor() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.DEV ? 'localhost:8000' : window.location.host;
    this.url = `${protocol}//${host}/api/v1/ws/traffic`;
  }

  connect(): void {
    if (this.socket || this.isConnecting) return;

    this.isConnecting = true;
    console.log(`Connecting to Traffic WebSocket: ${this.url}`);

    try {
      this.socket = new WebSocket(this.url);

      this.socket.onopen = () => {
        console.log('Traffic WebSocket connected.');
        this.isConnecting = false;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        
        // Process queued messages
        while (this.messageQueue.length > 0) {
          const msg = this.messageQueue.shift();
          if (msg) this.socket.send(msg);
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          this.callbacks.forEach((cb) => cb(payload));
        } catch (err) {
          console.error('Error parsing WebSocket message payload:', err);
        }
      };

      this.socket.onclose = (event) => {
        console.warn(`WebSocket closed: ${event.reason}. Retrying connection...`);
        this.socket = null;
        this.isConnecting = false;
        this.scheduleReconnect();
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.socket?.close();
      };
    } catch (error) {
      console.error('WebSocket connection attempt failed:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectInterval);
  }

  subscribe(callback: WebSocketCallback): () => void {
    this.callbacks.add(callback);
    if (!this.socket && !this.isConnecting) {
      this.connect();
    }
    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  sendCommand(command: string, args: Record<string, any> = {}): void {
    const payload = JSON.stringify({ command, ...args });
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(payload);
    } else {
      console.warn('WebSocket is not open. Queueing command:', command);
      this.messageQueue.push(payload);
      this.connect();
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnecting = false;
  }
}

export const wsService = new WebSocketService();
