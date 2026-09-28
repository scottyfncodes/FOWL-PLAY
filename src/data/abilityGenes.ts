import type { LocusId } from '../genetics/loci';

type Spec = Partial<Record<LocusId, string>>;

/**
 * Ability genes per breed. These are merged into each breed's genotype so
 * every real breed brings something to the farm: some of it visible, a lot
 * of it carried quietly. Loci not listed here are wild type.
 *
 * Design notes:
 * - Every starter and welcome-pick breed carries one springy and one long-leg
 *   gene without showing either, so the very first pairings can throw a chick
 *   that solves the first real problem.
 * - Bantams and light Mediterranean breeds tend to have big wings; heavy
 *   breeds tend to be brawny and slow. This is a toy, not poultry science.
 */
export const ABILITY_GENES: Record<string, Spec> = {
  // --- starters -----------------------------------------------------------
  australorp: { speed: 'qk/av', legLen: 'L+/lg', brawn: 'Bw/bw+', spring: 'jp+/Jp', nerve: 'steady/steady', habit: 'plain/plain' },
  orpington: { speed: 'sl/sl', legLen: 'L+/lg', brawn: 'Bw/bw+', spring: 'jp+/Jp', web: 'wb+/wb', nerve: 'steady/brave', habit: 'greedy/plain' },
  wyandotte: { speed: 'av/av', legLen: 'L+/lg', brawn: 'Bw/bw+', spring: 'jp+/Jp', nerve: 'steady/steady', habit: 'plain/plain' },
  sussex: { speed: 'qk/av', legLen: 'L+/lg', spring: 'jp+/Jp', web: 'wb+/wb', nerve: 'steady/steady', habit: 'greedy/plain' },
  plymouthrock: { speed: 'av/av', legLen: 'L+/lg', beak: 'Bk/bk+', dig: 'dg+/dg', spring: 'jp+/Jp', nerve: 'steady/steady', habit: 'plain/plain' },
  // --- welcome picks --------------------------------------------------------
  silkie: { speed: 'sl/av', legLen: 'L+/lg', grip: 'gr/gr+', spring: 'jp+/Jp', nerve: 'steady/steady', habit: 'plain/plain' },
  polish: { speed: 'av/av', legLen: 'L+/lg', wing: 'Wg/Wg', spring: 'jp+/Jp', nerve: 'steady/skittish', habit: 'plain/plain' },
  araucana: { speed: 'qk/qk', legLen: 'L+/lg', dig: 'dg+/dg', spring: 'jp+/Jp', nerve: 'brave/steady', habit: 'plain/plain' },
  // --- everyone else --------------------------------------------------------
  brahma: { speed: 'sl/sl', brawn: 'Bw/Bw', crow: 'Cw/cw+', nerve: 'brave/steady', spring: 'jp+/Jp' },
  cochin: { speed: 'sl/sl', brawn: 'Bw/bw+', dig: 'dg/dg', nerve: 'steady/steady', habit: 'greedy/plain' },
  rir: { speed: 'av/av', beak: 'Bk/Bk', brawn: 'Bw/bw+', nerve: 'steady/steady', habit: 'greedy/plain' },
  leghorn: { speed: 'qk/qk', wing: 'Wg/Wg', legLen: 'L+/lg', spring: 'jp+/Jp', nerve: 'skittish/steady', habit: 'noisy/plain' },
  ameraucana: { speed: 'qk/av', wing: 'Wg/wg+', legLen: 'L+/lg', spring: 'jp+/Jp' },
  marans: { speed: 'sl/av', beak: 'Bk/bk+', legLen: 'L+/lg', web: 'wb+/wb' },
  hamburg: { speed: 'qk/qk', wing: 'Wg/Wg', spring: 'Jp/Jp', nerve: 'skittish/skittish' },
  sebright: { speed: 'qk/av', wing: 'Wg/Wg', spring: 'Jp/Jp', nerve: 'brave/steady' },
  frizzle: { speed: 'qk/av', wing: 'Wg/wg+', spring: 'jp+/Jp' },
  faverolles: { speed: 'sl/av', habit: 'greedy/plain', nerve: 'steady/steady', web: 'wb+/wb' },
  jerseygiant: { speed: 'sl/sl', brawn: 'Bw/Bw', crow: 'Cw/Cw', nerve: 'steady/steady' },
  minorca: { speed: 'qk/qk', wing: 'Wg/wg+', legLen: 'L+/lg', crow: 'Cw/cw+' },
  ancona: { speed: 'qk/qk', wing: 'Wg/Wg', dig: 'dg/dg', nerve: 'skittish/steady' },
  barnevelder: { speed: 'sl/av', web: 'wb+/wb', habit: 'greedy/plain' },
  andalusian: { speed: 'qk/qk', wing: 'Wg/Wg', legLen: 'L+/lg', nerve: 'skittish/steady' },
  houdan: { grip: 'gr+/gr', spring: 'jp+/Jp', speed: 'av/av' },
  dorking: { speed: 'sl/av', brawn: 'Bw/bw+', web: 'wb/wb+', habit: 'greedy/plain' },
  dominique: { dig: 'dg/dg+', wing: 'Wg/wg+', speed: 'av/av' },
  cornish: { speed: 'sl/sl', brawn: 'Bw/Bw', beak: 'Bk/Bk', nerve: 'aggressive/brave' },
  oeg: { speed: 'qk/qk', wing: 'Wg/Wg', spring: 'Jp/Jp', dig: 'dg/dg', beak: 'Bk/bk+', nerve: 'aggressive/brave' },
  duccle: { speed: 'av/av', wing: 'Wg/wg+', spring: 'Jp/Jp', nerve: 'steady/steady' },
  cubalaya: { speed: 'qk/av', wing: 'Wg/wg+', spring: 'jp+/Jp', nerve: 'brave/steady' },
  sumatra: { speed: 'qk/qk', wing: 'Wg/Wg', spring: 'Jp/Jp', legLen: 'L+/lg', nerve: 'brave/steady', habit: 'sneaky/plain' },
  yokohama: { speed: 'av/av', wing: 'Wg/wg+' },
  phoenix: { speed: 'qk/av', wing: 'Wg/wg+' },
  shamo: { speed: 'sl/av', legLen: 'lg/lg', beak: 'Bk/Bk', brawn: 'Bw/Bw', nerve: 'aggressive/aggressive' },
  cemani: { speed: 'qk/av', wing: 'Wg/wg+', habit: 'sneaky/sneaky' },
  nakedneck: { speed: 'sl/av', brawn: 'Bw/bw+', web: 'wb/wb+' },
  spitzhauben: { speed: 'qk/qk', wing: 'Wg/Wg', spring: 'Jp/Jp', grip: 'gr/gr', nerve: 'skittish/steady' },
  creamlegbar: { speed: 'qk/av', wing: 'Wg/wg+', legLen: 'L+/lg' },
  welsummer: { speed: 'av/av', dig: 'dg/dg+', beak: 'Bk/bk+' },
  buckeye: { speed: 'av/av', brawn: 'Bw/Bw', beak: 'Bk/Bk', nerve: 'brave/steady' },
  delaware: { speed: 'av/av', brawn: 'Bw/bw+', habit: 'greedy/plain' },
  newhampshire: { speed: 'qk/av', brawn: 'Bw/bw+', habit: 'greedy/greedy' },
  serama: { speed: 'av/av', wing: 'Wg/wg+', spring: 'Jp/Jp', nerve: 'brave/brave' },
  japanesebantam: { speed: 'sl/av', wing: 'Wg/wg+', nerve: 'steady/steady' },
  sultan: { speed: 'sl/av', grip: 'gr/gr+', spring: 'jp+/Jp', nerve: 'steady/steady' },
  lafleche: { speed: 'qk/av', wing: 'Wg/Wg', spring: 'Jp/Jp', legLen: 'L+/lg', nerve: 'skittish/steady' },
  crevecoeur: { speed: 'av/av', wing: 'Wg/wg+' },
  campine: { speed: 'qk/qk', wing: 'Wg/Wg', spring: 'jp+/Jp', dig: 'dg+/dg', nerve: 'skittish/steady' },
  lakenvelder: { speed: 'qk/qk', wing: 'Wg/Wg', nerve: 'skittish/steady' },
  langshan: { speed: 'sl/av', legLen: 'lg/lg', brawn: 'Bw/bw+', crow: 'Cw/cw+' },
  malay: { speed: 'sl/av', legLen: 'lg/lg', beak: 'Bk/Bk', brawn: 'Bw/Bw', nerve: 'aggressive/brave' },
  moderngame: { speed: 'qk/qk', legLen: 'lg/lg', spring: 'Jp/Jp', nerve: 'brave/steady' },
  java: { speed: 'av/av', brawn: 'Bw/bw+', dig: 'dg/dg+', web: 'wb+/wb' },
  chantecler: { speed: 'av/av', brawn: 'Bw/bw+', web: 'wb/wb', nerve: 'steady/steady' },
  rosecomb: { speed: 'qk/av', wing: 'Wg/Wg', spring: 'Jp/Jp', nerve: 'skittish/steady' },
  dutchbantam: { speed: 'qk/qk', wing: 'Wg/Wg', spring: 'Jp/Jp', nerve: 'skittish/steady' },
  brabanter: { speed: 'av/av', wing: 'Wg/wg+' },
  icelandic: { speed: 'qk/av', wing: 'Wg/Wg', dig: 'dg/dg', grip: 'gr/gr+', nerve: 'brave/steady', web: 'wb+/wb' },
  swedishflower: { speed: 'av/av', dig: 'dg/dg+', habit: 'greedy/plain', web: 'wb/wb+' },
  buttercup: { speed: 'qk/qk', wing: 'Wg/Wg', spring: 'jp+/Jp', nerve: 'skittish/steady' },
  penedesenca: { speed: 'qk/av', wing: 'Wg/wg+', beak: 'Bk/bk+', nerve: 'skittish/skittish' },
  fayoumi: { speed: 'qk/qk', wing: 'Wg/Wg', spring: 'Jp/Jp', dig: 'dg/dg', habit: 'sneaky/sneaky', nerve: 'skittish/steady' },
  asil: { speed: 'av/av', beak: 'Bk/Bk', brawn: 'Bw/Bw', legLen: 'L+/lg', nerve: 'aggressive/aggressive' },
  bielefelder: { speed: 'av/av', brawn: 'Bw/bw+', habit: 'greedy/plain' },
  vorwerk: { speed: 'av/av', wing: 'Wg/wg+', dig: 'dg/dg+' },
  onagadori: { speed: 'sl/av', wing: 'Wg/wg+' },
  deathlayer: { speed: 'qk/av', wing: 'Wg/wg+', nerve: 'skittish/steady' },
  orloff: { speed: 'sl/av', brawn: 'Bw/Bw', beak: 'Bk/bk+', nerve: 'brave/brave', web: 'wb+/wb' },
  spanish: { speed: 'qk/qk', wing: 'Wg/Wg', legLen: 'L+/lg', crow: 'Cw/Cw' },
  pavlovskaya: { speed: 'qk/av', wing: 'Wg/Wg', spring: 'Jp/Jp', grip: 'gr/gr', web: 'wb+/wb', nerve: 'skittish/steady' },
  nankin: { speed: 'av/av', wing: 'Wg/wg+', habit: 'sneaky/plain', nerve: 'steady/steady' },
};
