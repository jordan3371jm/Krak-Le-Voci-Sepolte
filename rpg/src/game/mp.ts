// Multigiocatore Playgama (Bridge, beta): stanze, host autorevole, stato sincronizzato.
import { bridgeActive } from './kv';

const w = () => (typeof window !== 'undefined' ? (window as any) : {});
const M = () => w().bridge?.multiplayer;
const E = (k: string, d: string) => w().bridge?.EVENT_NAME?.[k] || d;

export const MP_FILTER = { mode: 'veglia', v: 1 };
export function mpSupported() { try { return bridgeActive() && !!M()?.isSupported; } catch { return false; } }
export function mpIsHost() { try { return !!M()?.isHost; } catch { return true; } }
export function mpPlayerId() { try { return M()?.playerId || 'me'; } catch { return 'me'; } }
export function mpRoomId(): string { try { return M()?.roomId || ''; } catch { return ''; } }
export function mpPlayers(): { id: string; name: string; properties?: any }[] { try { return M()?.players || []; } catch { return []; } }
export function mpLaunchRoom(): string { try { return M()?.launchRoomId || ''; } catch { return ''; } }
export function mpInviteSupported() { try { return !!M()?.isInviteSupported; } catch { return false; } }
export function mpInvite(text: string) { try { M()?.inviteToRoom?.({ text }); } catch { /* */ } }

type Handlers = { onState: (st: any) => void; onMessage: (m: { type: string; data: any; from: string }) => void; onPlayers: () => void; onLeft: (reason: string) => void; getState: () => any; applyState: (st: any) => void };
let bound: Handlers | null = null;
const subs: [string, (x: any) => void][] = [];
function bind(h: Handlers) {
  unbind(); bound = h;
  const m = M(); if (!m) return;
  const on = (k: string, d: string, f: (x: any) => void) => { const ev = E(k, d); m.on(ev, f); subs.push([ev, f]); };
  on('MULTIPLAYER_MESSAGE_RECEIVED', 'multiplayer_message_received', x => bound?.onMessage(x));
  on('MULTIPLAYER_SYNC_STATE_RECEIVED', 'multiplayer_sync_state_received', x => bound?.onState(x));
  for (const [k, d] of [['MULTIPLAYER_PLAYER_JOINED', 'multiplayer_player_joined'], ['MULTIPLAYER_PLAYER_LEFT', 'multiplayer_player_left'], ['MULTIPLAYER_HOST_CHANGED', 'multiplayer_host_changed'], ['MULTIPLAYER_PLAYER_UPDATED', 'multiplayer_player_updated']])
    on(k, d, () => bound?.onPlayers());
  on('MULTIPLAYER_ROOM_LEFT', 'multiplayer_room_left', r => bound?.onLeft(String(r || 'left')));
}
export function unbind() { const m = M(); for (const [ev, f] of subs) { try { m?.off?.(ev, f); } catch { /* */ } } subs.length = 0; bound = null; }

const sync = (h: Handlers) => ({ getState: () => h.getState(), applyState: (st: any) => h.applyState(st), updatesPerSecond: 4 });
export async function mpQuick(h: Handlers, props: Record<string, string | number>) { bind(h); return M().joinOrCreateRoom({ maxPlayers: 4, filter: MP_FILTER, playerProperties: props, syncState: sync(h) }); }
export async function mpCreate(h: Handlers, props: Record<string, string | number>) { bind(h); return M().createRoom({ maxPlayers: 4, isVisible: false, filter: MP_FILTER, playerProperties: props, syncState: sync(h) }); }
export async function mpJoin(h: Handlers, code: string, props: Record<string, string | number>) { bind(h); await M().joinRoom(code.trim().toUpperCase(), { playerProperties: props, syncState: sync(h) }); return code; }
export function mpSend(type: string, data: any) { try { M()?.send(type, data, { to: 'host' }); } catch { /* */ } }
export function mpSetState(st: any) { try { M()?.setSyncState?.(st); } catch { /* */ } }
export function mpCloseRoom() { try { if (M()?.isHost) M().setRoomOpen(false); } catch { /* */ } }
export function mpLeave() { try { M()?.leaveRoom?.(); } catch { /* */ } unbind(); }
