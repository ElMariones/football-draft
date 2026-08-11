// The common currency of every decision in the game.
//
// Ceremonies, brand deals, derbies and press conferences all pay out in the same
// handful of things, and they should all clamp them the same way. This is that
// shared core; systems with extra state of their own (a sponsor's standing, a
// rivalry's bad blood) layer it on top rather than reimplementing the basics.
import type { CareerPlayer, Attrs } from '@/data/career/types';
import { clamp } from './rng';
import type { Lang } from './i18n';

export interface PlayerEffects {
  reputation?: number;
  morale?: number;
  form?: number;
  money?: number;
  stamina?: number;
  discipline?: number;
  /** idolatry at the club you are currently at */
  idol?: number;
  attrs?: Partial<Attrs>;
}

/** Apply to a copy of the player, clamped to every field's real range. */
export function applyEffects(p: CareerPlayer, e: PlayerEffects): CareerPlayer {
  const idolatry = { ...(p.idolatry ?? {}) };
  if (e.idol && p.clubId) {
    idolatry[p.clubId] = clamp(0, 100, (idolatry[p.clubId] ?? 0) + e.idol);
  }
  const attrs = { ...p.attrs };
  for (const [k, v] of Object.entries(e.attrs ?? {})) {
    attrs[k as keyof Attrs] = clamp(1, 99, attrs[k as keyof Attrs] + (v as number));
  }
  return {
    ...p,
    idolatry,
    attrs,
    reputation: clamp(0, 100, p.reputation + (e.reputation ?? 0)),
    morale: clamp(5, 100, p.morale + (e.morale ?? 0)),
    form: clamp(15, 99, p.form + (e.form ?? 0)),
    stamina: clamp(20, 100, (p.stamina ?? 70) + (e.stamina ?? 0)),
    discipline: clamp(0, 100, p.discipline + (e.discipline ?? 0)),
    money: Math.max(0, (p.money ?? 0) + (e.money ?? 0)),
  };
}

export interface Chip {
  label: string;
  delta: number;
  money?: boolean;
  /** render as a percentage rather than a flat number */
  pct?: boolean;
}

const ATTR_LABEL: Record<string, [string, string]> = {
  tec: ['Technique', 'Técnica'], pac: ['Pace', 'Velocidad'], phy: ['Physical', 'Físico'],
  vis: ['Vision', 'Visión'], lea: ['Leadership', 'Liderazgo'],
};

/** The chips shown after a choice, so the numbers are never silent. */
export function effectChips(e: PlayerEffects, lang: Lang): Chip[] {
  const es = lang === 'es';
  const out: Chip[] = [];
  const add = (label: string, v?: number) => { if (v) out.push({ label, delta: v }); };
  add(es ? 'Fama' : 'Fame', e.reputation);
  add(es ? 'Ánimo' : 'Morale', e.morale);
  add(es ? 'Forma' : 'Form', e.form);
  add(es ? 'Resistencia' : 'Stamina', e.stamina);
  add(es ? 'Disciplina' : 'Discipline', e.discipline);
  add(es ? 'Idolatría' : 'Idolatry', e.idol);
  for (const [k, v] of Object.entries(e.attrs ?? {})) {
    if (v) out.push({ label: ATTR_LABEL[k][es ? 1 : 0], delta: v as number });
  }
  if (e.money) out.push({ label: es ? 'Dinero' : 'Money', delta: e.money, money: true });
  return out;
}

export function fmtMoney(n: number): string {
  const a = Math.abs(n);
  const s = a >= 1_000_000 ? `€${(a / 1_000_000).toFixed(1)}M`
    : a >= 1_000 ? `€${Math.round(a / 1000)}K` : `€${a}`;
  return n < 0 ? `−${s}` : s;
}
