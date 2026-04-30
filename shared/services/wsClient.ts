// ============================================================
// Optimile ERP — WebSocket Client
// ============================================================
// Persistent singleton WebSocket connection with:
//   - Exponential backoff reconnect (1s → 2s → 4s … 30s max)
//   - Type-discriminated message subscriptions
//   - JWT auth via ?token= query param (read from authStorage)
//   - Intentional-close flag to prevent reconnect on logout
//
// Backend WS endpoint: /ws
// Message envelope: { type: string; payload: unknown; timestamp: number }
// ============================================================

import { getStoredAuthSession } from './authStorage';

// ── URL resolution ────────────────────────────────────────

function resolveWsUrl(): string {
    const explicit = import.meta.env.VITE_WS_URL as string | undefined;
    if (explicit) return explicit.replace(/\/+$/, '') + '/ws';

    const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
    if (apiBase) return apiBase.replace(/^http/, 'ws').replace(/\/+$/, '') + '/ws';

    // Derive from current page origin (works behind Vite proxy in dev)
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${proto}://${window.location.host}/ws`;
}

// ── Message types ─────────────────────────────────────────

export interface WsMessage<T = unknown> {
    type: string;
    payload: T;
    timestamp: number;
}

type MessageHandler<T = unknown> = (message: WsMessage<T>) => void;

// Well-known message types (non-exhaustive — backend can add more)
export type WsMessageType =
    | 'vehicle.position'    // Fleet: live GPS + status update
    | 'auction.bid'         // AMS:   new bid submitted
    | 'auction.lane_update' // AMS:   lane status / timer changed
    | 'trip.status_update'  // TMS:   trip status changed
    | 'ping';               // Server keepalive

// Payload shapes for known types
export interface VehiclePositionPayload {
    vehicleId: string;
    lat: number;
    lng: number;
    speed: number;
    status: string;
    documentCompliance: 'Compliant' | 'Non-Compliant';
    updatedAt: string;
}

export interface AuctionBidPayload {
    auctionId: string;
    laneId: string;
    vendorId: string;
    bidAmount: number;
    bidTimestamp: number;
}

export interface AuctionLaneUpdatePayload {
    auctionId: string;
    laneId: string;
    status: string;
    endTime?: number;
}

// ── Reconnect config ──────────────────────────────────────

const RECONNECT_BASE_MS  = 1_000;
const RECONNECT_MAX_MS   = 30_000;
const RECONNECT_FACTOR   = 2;

// ── Client ────────────────────────────────────────────────

class WsClient {
    private ws: WebSocket | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private handlers: Map<string, Set<MessageHandler<any>>> = new Map();
    private reconnectDelay = RECONNECT_BASE_MS;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private intentionalClose = false;

    /**
     * Open (or no-op if already open/connecting).
     */
    connect(): void {
        if (this.ws && (
            this.ws.readyState === WebSocket.OPEN ||
            this.ws.readyState === WebSocket.CONNECTING
        )) return;

        this.intentionalClose = false;
        this._open();
    }

    /**
     * Close and suppress auto-reconnect.
     */
    disconnect(): void {
        this.intentionalClose = true;
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
        this.ws?.close();
        this.ws = null;
    }

    /**
     * Subscribe to a message type. Returns an unsubscribe function.
     */
    subscribe<T = unknown>(type: WsMessageType | string, handler: MessageHandler<T>): () => void {
        if (!this.handlers.has(type)) this.handlers.set(type, new Set());
        this.handlers.get(type)!.add(handler as MessageHandler);
        return () => this.handlers.get(type)?.delete(handler as MessageHandler);
    }

    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    // ── Private ─────────────────────────────────────────────

    private _open(): void {
        const session = getStoredAuthSession();
        const baseUrl = resolveWsUrl();
        const url = session?.tokens?.accessToken
            ? `${baseUrl}?token=${encodeURIComponent(session.tokens.accessToken)}`
            : baseUrl;

        try {
            this.ws = new WebSocket(url);
        } catch {
            // WebSocket constructor can throw if the URL is invalid
            this._scheduleReconnect();
            return;
        }

        this.ws.onopen = () => {
            this.reconnectDelay = RECONNECT_BASE_MS; // reset backoff on successful connect
        };

        this.ws.onmessage = (event: MessageEvent) => {
            let msg: WsMessage;
            try {
                msg = JSON.parse(event.data as string) as WsMessage;
            } catch {
                return; // ignore non-JSON frames
            }
            if (msg.type === 'ping') return; // server keepalive, no handlers needed

            const handlers = this.handlers.get(msg.type);
            if (!handlers) return;
            handlers.forEach(handler => {
                try { handler(msg); } catch { /* swallow — one bad subscriber must not break others */ }
            });
        };

        this.ws.onerror = () => {
            // onclose fires right after onerror; let onclose handle reconnect
        };

        this.ws.onclose = () => {
            this.ws = null;
            if (!this.intentionalClose) {
                this._scheduleReconnect();
            }
        };
    }

    private _scheduleReconnect(): void {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
            this.reconnectDelay = Math.min(
                this.reconnectDelay * RECONNECT_FACTOR,
                RECONNECT_MAX_MS
            );
            this._open();
        }, this.reconnectDelay);
    }
}

// ── Singleton export ──────────────────────────────────────

export const wsClient = new WsClient();
