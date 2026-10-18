// poker.js — 홀덤 엔진 (DOM 없음). 브라우저와 node 둘 다에서 동작.
// 카드: {r:2..14, s:0..3}. 14=A. 무늬: 0♠ 1♥ 2♦ 3♣
const RANKS = '23456789TJQKA';
const SUITS = ['♠', '♥', '♦', '♣'];

function newDeck() {
  const d = [];
  for (let r = 2; r <= 14; r++) for (let s = 0; s < 4; s++) d.push({ r, s });
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}
const cardStr = c => RANKS[c.r - 2] + SUITS[c.s];

// 5장 점수. 큰 숫자가 강함. 카테고리 0=하이카드 … 8=스트레이트플러시
function eval5(cs) {
  const rs = cs.map(c => c.r).sort((a, b) => b - a);
  const flush = cs.every(c => c.s === cs[0].s);
  const uniq = [...new Set(rs)];
  let straightHigh = 0;
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) straightHigh = uniq[0];
    else if (uniq.join() === '14,5,4,3,2') straightHigh = 5; // 휠(A-5)
  }
  const cnt = {};
  rs.forEach(r => cnt[r] = (cnt[r] || 0) + 1);
  // 장수가 많은 쪽 먼저, 같은 장수끼리는 랭크 내림차순
  const groups = Object.entries(cnt).map(([r, n]) => [n, +r]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  let cat, kick;
  if (straightHigh && flush) { cat = 8; kick = [straightHigh]; }
  else if (groups[0][0] === 4) { cat = 7; kick = [groups[0][1], groups[1][1]]; }
  else if (groups[0][0] === 3 && groups[1][0] === 2) { cat = 6; kick = [groups[0][1], groups[1][1]]; }
  else if (flush) { cat = 5; kick = rs; }
  else if (straightHigh) { cat = 4; kick = [straightHigh]; }
  else if (groups[0][0] === 3) { cat = 3; kick = groups.map(g => g[1]); }
  else if (groups[0][0] === 2 && groups[1][0] === 2) { cat = 2; kick = groups.map(g => g[1]); }
  else if (groups[0][0] === 2) { cat = 1; kick = groups.map(g => g[1]); }
  else { cat = 0; kick = rs; }
  let score = cat;
  for (let i = 0; i < 5; i++) score = score * 15 + (kick[i] || 0);
  return score;
}
const CAT_NAMES = ['하이카드 High Card', '원페어 One Pair', '투페어 Two Pair', '트리플 Three of a Kind', '스트레이트 Straight', '플러시 Flush', '풀하우스 Full House', '포카드 Four of a Kind', '스트레이트 플러시 Straight Flush'];
const catOf = score => Math.floor(score / 15 ** 5);

// 5~7장 중 최고 5장 점수 (조합 전부 비교. 7장이면 21가지)
function evalBest(cards) {
  const n = cards.length;
  if (n === 5) return eval5(cards);
  let best = 0;
  const drop = n - 5; // 제외할 장수 1 또는 2
  for (let a = 0; a < n; a++) {
    if (drop === 1) { best = Math.max(best, eval5(cards.filter((_, i) => i !== a))); continue; }
    for (let b = a + 1; b < n; b++) best = Math.max(best, eval5(cards.filter((_, i) => i !== a && i !== b)));
  }
  return best;
}

// 핸드 표기: AKs, AKo, 77
function handKey(c1, c2) {
  const [h, l] = c1.r >= c2.r ? [c1, c2] : [c2, c1];
  if (h.r === l.r) return RANKS[h.r - 2] + RANKS[l.r - 2];
  return RANKS[h.r - 2] + RANKS[l.r - 2] + (h.s === l.s ? 's' : 'o');
}

// 레인지 문자열("77+, ATs+, KQo, 54s") → Set of handKey
function parseRange(str) {
  const set = new Set();
  const R = RANKS;
  str.split(/[,\s]+/).filter(Boolean).forEach(tok => {
    const plus = tok.endsWith('+');
    tok = tok.replace('+', '');
    const a = R.indexOf(tok[0]), b = R.indexOf(tok[1]), suf = tok[2] || '';
    if (a === b) { // 페어
      for (let r = a; r <= (plus ? 12 : a); r++) set.add(R[r] + R[r]);
    } else {
      const hi = Math.max(a, b), lo = Math.min(a, b);
      // "ATs+" = AT..AK (낮은 카드를 올림)
      for (let r = lo; r <= (plus ? hi - 1 : lo); r++) set.add(R[hi] + R[r] + suf);
    }
  });
  return set;
}

// 상대 n명(랜덤 핸드 가정) 몬테카를로 승률. 동률은 1/n 가산
function equity(hole, board, nOpp, iters = 200) {
  let win = 0;
  const used = new Set([...hole, ...board].map(c => c.r * 4 + c.s));
  const base = [];
  for (let r = 2; r <= 14; r++) for (let s = 0; s < 4; s++) if (!used.has(r * 4 + s)) base.push({ r, s });
  for (let it = 0; it < iters; it++) {
    const d = base.slice();
    for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
    const full = board.concat(d.splice(0, 5 - board.length));
    const mine = evalBest(hole.concat(full));
    let ties = 1, lost = false;
    for (let o = 0; o < nOpp; o++) {
      const s = evalBest(d.splice(0, 2).concat(full));
      if (s > mine) { lost = true; break; }
      if (s === mine) ties++;
    }
    if (!lost) win += 1 / ties;
  }
  return win / iters;
}

// 입문용 단순화 6-max 오픈 레인지 (RFI). 정확한 GTO 차트는 자료 탭 참고.
const RFI = {
  UTG: '77+, ATs+, KJs+, QJs, JTs, AJo+, KQo',
  HJ: '66+, A9s+, A5s, KTs+, QTs+, JTs, T9s, 98s, AJo+, KQo',
  CO: '44+, A2s+, K8s+, Q9s+, J9s+, T9s, 98s, 87s, 76s, ATo+, KJo+, QJo',
  BTN: '22+, A2s+, K5s+, Q8s+, J8s+, T8s+, 97s+, 86s+, 75s+, 65s, 54s, A7o+, KTo+, QTo+, JTo',
  SB: '44+, A2s+, K8s+, Q9s+, J9s+, T9s, 98s, 87s, 76s, ATo+, KJo+, QJo',
};
const RFI_SET = Object.fromEntries(Object.entries(RFI).map(([k, v]) => [k, parseRange(v)]));
// 레이즈 상대 대응 (입문용)
const VS_RAISE = {
  threeBet: parseRange('QQ+, AKs, AKo'),
  call: parseRange('22+, A9s+, KTs+, QTs+, JTs, T9s, 98s, 87s, AQo, KQo'),
  callLoose: parseRange('22+, A2s+, K8s+, Q9s+, J9s+, T9s, 98s, 87s, 76s, ATo+, KJo+, QJo'),
  vs3betRaise: parseRange('KK+'),
  vs3betCall: parseRange('TT+, AQs+, AKo'),
};
// 10bb 이하 푸시/폴드 (언오픈 팟, 입문용 근사)
const PUSH10 = {
  UTG: '66+, ATs+, AJo+, KQs',
  HJ: '55+, A8s+, ATo+, KTs+, KQo, QJs',
  CO: '44+, A5s+, A9o+, K9s+, KJo+, QTs+, JTs',
  BTN: '22+, A2s+, A7o+, K8s+, KTo+, Q9s+, QJo, J9s+, T9s',
  SB: '22+, A2s+, A4o+, K5s+, K9o+, Q8s+, QTo+, J8s+, T8s+, 98s',
};

// 봇 의사결정.
// ctx: {pos, street(0~3), board, toCall, toCallTotal, pot, bb, raisers, limpers, nOpp}
// style: {tight 0..1, aggr 0..1}
function botAction(hole, ctx, style) {
  const key = handKey(hole[0], hole[1]);
  const rnd = Math.random();
  if (ctx.street === 0) {
    const open = ctx.pos === 'BB' ? RFI_SET.CO : RFI_SET[ctx.pos];
    const loose = style.tight < 0.4;
    if (ctx.raisers === 0) {
      if (open.has(key) || (loose && RFI_SET.BTN.has(key) && rnd < 0.5)) return { type: 'raise', to: ctx.bb * 2.5 + ctx.bb * ctx.limpers };
      if (ctx.toCall === 0) return { type: 'check' };
      if (loose && ctx.toCall <= ctx.bb && RFI_SET.BTN.has(key)) return { type: 'call' };
      return { type: 'fold' };
    }
    if (ctx.raisers === 1) {
      if (VS_RAISE.threeBet.has(key) || (style.aggr > 0.6 && VS_RAISE.call.has(key) && rnd < 0.25)) return { type: 'raise', to: ctx.toCallTotal * 3 };
      if ((loose ? VS_RAISE.callLoose : VS_RAISE.call).has(key)) return { type: 'call' };
      if (ctx.pos === 'BB' && ctx.toCall <= ctx.bb * 2 && VS_RAISE.callLoose.has(key)) return { type: 'call' };
      return { type: 'fold' };
    }
    if (VS_RAISE.vs3betRaise.has(key)) return { type: 'raise', to: ctx.toCallTotal * 2.5 };
    if (VS_RAISE.vs3betCall.has(key)) return { type: 'call' };
    return { type: 'fold' };
  }
  // 포스트플랍: 승률 vs 팟 오즈
  const eq = equity(hole, ctx.board, Math.max(1, ctx.nOpp), 120);
  const potOdds = ctx.toCall / (ctx.pot + ctx.toCall);
  const margin = 0.05 + style.tight * 0.1;
  if (ctx.toCall === 0) {
    if (eq > 0.62 - style.aggr * 0.08) return { type: 'bet', amt: Math.round(ctx.pot * (eq > 0.8 ? 0.75 : 0.6)) };
    if (rnd < style.aggr * 0.2 && ctx.nOpp === 1) return { type: 'bet', amt: Math.round(ctx.pot * 0.5) }; // 블러프
    return { type: 'check' };
  }
  if (eq > 0.78 && rnd < 0.4 + style.aggr * 0.4) return { type: 'raise', to: Math.round(ctx.toCallTotal * 2.5 + ctx.pot * 0.3) };
  if (eq > potOdds + margin) return { type: 'call' };
  if (style.tight < 0.4 && ctx.toCall <= ctx.pot * 0.35 && rnd < 0.3) return { type: 'call' }; // 루즈한 콜
  return { type: 'fold' };
}

// 사이드팟 포함 분배. players: [{put, folded, score}] → [{amount, winners:[idx]}]
function awardPots(players) {
  const levels = [...new Set(players.filter(p => p.put > 0).map(p => p.put))].sort((a, b) => a - b);
  const out = [];
  let prev = 0;
  for (const lv of levels) {
    let amount = 0;
    players.forEach(p => amount += Math.max(0, Math.min(p.put, lv) - prev));
    const elig = players.map((_, i) => i).filter(i => !players[i].folded && players[i].put >= lv);
    if (elig.length === 0) { // 남은 사람이 전부 폴드한 레벨(생길 일 거의 없음): 마지막 팟에 합침
      if (out.length) out[out.length - 1].amount += amount;
      prev = lv; continue;
    }
    const best = Math.max(...elig.map(i => players[i].score));
    const winners = elig.filter(i => players[i].score === best);
    if (amount > 0) out.push({ amount, winners });
    prev = lv;
  }
  return out;
}

// 2와 4의 법칙 (수업용 근사)
const rule24 = (outs, street) => Math.min(100, outs * (street === 1 ? 4 : 2));

if (typeof module !== 'undefined') {
  module.exports = { newDeck, cardStr, eval5, evalBest, handKey, parseRange, equity, RFI, RFI_SET, VS_RAISE, PUSH10, botAction, awardPots, CAT_NAMES, catOf, rule24, RANKS, SUITS };
  if (require.main === module) {
    const C = s => ({ r: RANKS.indexOf(s[0]) + 2, s: '♠♥♦♣'.indexOf(s[1]) });
    const H = s => s.split(' ').map(C);
    const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } };
    assert(catOf(eval5(H('A♠ K♠ Q♠ J♠ T♠'))) === 8, '로열');
    assert(catOf(eval5(H('5♠ 4♦ 3♠ 2♠ A♠'))) === 4, '휠');
    assert(eval5(H('A♠ A♦ A♣ K♠ K♦')) > eval5(H('K♠ K♦ K♣ A♠ A♦')), '풀하우스 비교');
    assert(eval5(H('9♠ 8♦ 7♣ 6♠ 5♦')) > eval5(H('5♠ 4♦ 3♠ 2♠ A♦')), '스트레이트 비교');
    assert(eval5(H('A♠ K♦ 7♣ 4♠ 2♦')) < eval5(H('2♠ 2♦ 3♣ 4♠ 5♦')), '페어 > 하이카드');
    assert(eval5(H('A♠ A♦ 9♣ 4♠ 2♦')) > eval5(H('A♣ A♥ 8♣ 7♠ 6♦')), '키커');
    assert(catOf(evalBest(H('A♠ A♦ 7♣ 7♠ 7♦ 2♣ 3♣'))) === 6, '7장 풀하우스');
    assert(catOf(evalBest(H('2♥ 3♥ 9♥ K♥ Q♥ Q♠ Q♦'))) === 5, '7장 플러시 > 트리플');
    assert(catOf(evalBest(H('2♥ 3♥ 9♥ K♥ Q♠ Q♦'))) === 1, '6장 원페어');
    assert(handKey(C('A♠'), C('K♠')) === 'AKs' && handKey(C('K♦'), C('A♠')) === 'AKo' && handKey(C('7♦'), C('7♠')) === '77', 'handKey');
    const r = parseRange('77+, ATs+, KQo');
    assert(r.has('AA') && r.has('77') && !r.has('66') && r.has('AJs') && r.has('AKs') && !r.has('A9s') && r.has('KQo') && !r.has('KJo'), 'parseRange');
    assert(RFI_SET.BTN.size > RFI_SET.CO.size && RFI_SET.CO.size > RFI_SET.UTG.size, '레인지 크기 순서');
    const eqAA = equity(H('A♠ A♦'), [], 1, 400);
    assert(eqAA > 0.78 && eqAA < 0.92, 'AA 헤즈업 승률 ' + eqAA);
    const pots = awardPots([{ put: 50, folded: false, score: 10 }, { put: 100, folded: false, score: 5 }, { put: 100, folded: false, score: 7 }]);
    assert(pots.length === 2 && pots[0].amount === 150 && pots[0].winners[0] === 0 && pots[1].amount === 100 && pots[1].winners[0] === 2, '사이드팟 ' + JSON.stringify(pots));
    const split = awardPots([{ put: 10, folded: false, score: 3 }, { put: 10, folded: false, score: 3 }, { put: 10, folded: true, score: 99 }]);
    assert(split[0].winners.length === 2 && split[0].amount === 30, '스플릿');
    const a = botAction(H('A♠ A♦'), { pos: 'UTG', street: 0, board: [], toCall: 2, toCallTotal: 2, pot: 3, bb: 2, raisers: 0, limpers: 0, nOpp: 5 }, { tight: 0.5, aggr: 0.5 });
    assert(a.type === 'raise', 'UTG AA 레이즈');
    const f = botAction(H('7♠ 2♦'), { pos: 'UTG', street: 0, board: [], toCall: 2, toCallTotal: 2, pot: 3, bb: 2, raisers: 0, limpers: 0, nOpp: 5 }, { tight: 0.5, aggr: 0.5 });
    assert(f.type === 'fold', 'UTG 72o 폴드');
    console.log('poker.js self-check OK');
  }
}
