// Ricompense delle pubblicità facoltative: ognuna con il suo limite, per non rompere il bilanciamento.
import { t as T } from '../../i18n';
import type { GameState } from '../types';
import { addRes, toast } from './state';
import { productionPerSec } from './village';
import { refreshMarket } from './meta';
import { todayKey } from '../rng';

const dayNum = () => Number(todayKey().replace(/-/g, ''));
export const AD_BLESS_CD = 20 * 60_000;
export const AD_MARKET_CD = 10 * 60_000;

export function adBlessReady(s: GameState) { return Date.now() >= (s.totals.adBlessAt || 0); }
export function adBlessing(s: GameState) {
  const now = Date.now();
  if (!adBlessReady(s)) return;
  s.totals.adBlessAt = now + AD_BLESS_CD;
  s.events.buffs.push({ id: 'ad_bless', label: T('Benedizione della Valle ×2'), until: now + 10 * 60_000, prod: 2 });
  toast(s, T('✨ Benedizione della Valle: produzione ×2 per 10 minuti'), 'fate');
}
export function adChestReady(s: GameState) { return s.daily.chest && (s.totals.adChestDay || 0) !== dayNum(); }
export function adChestDouble(s: GameState) {
  if (!adChestReady(s)) return;
  s.totals.adChestDay = dayNum();
  addRes(s, { cenere: Math.round(40 + s.hero.level * 8 + productionPerSec(s).cenere * 180), provviste: 3, intuizione: 1 });
  s.potions++;
  toast(s, T('🎁 Forziere raddoppiato!'), 'good');
}
export function adSupplies(s: GameState) {
  addRes(s, { provviste: 3 }, false);
  toast(s, T('🍞 +3 Provviste dalla valle'), 'good');
}
export function adMarketReady(s: GameState) { return Date.now() >= (s.totals.adMarketAt || 0); }
export function adMarketRefresh(s: GameState) {
  if (!adMarketReady(s)) return;
  s.totals.adMarketAt = Date.now() + AD_MARKET_CD;
  refreshMarket(s, true);
  toast(s, T('🎭 Le Ombre portano merci nuove'), 'fate');
}
export function adBossReady(s: GameState) { return s.world.bossTries >= 3 && (s.totals.adBossDay || 0) !== dayNum(); }
export function adBossTry(s: GameState) {
  if (!adBossReady(s)) return;
  s.totals.adBossDay = dayNum();
  s.world.bossTries = 2;
  toast(s, T('🗻 Un tentativo in più contro il Colosso'), 'good');
}
