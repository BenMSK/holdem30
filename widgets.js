// widgets.js — 강의 본문의 <div data-widget="이름" data-arg="…">를 채우는 시각·상호작용 요소.
// index.html의 전역(cardHtml, rangeWidget, mountRange, POS …)과 poker.js를 호출 시점에 사용한다.
const pc = s => ({ r: RANKS.indexOf(s[0]) + 2, s: 'shdc'.indexOf(s[1]) });
const pcs = s => (s.match(/[2-9TJQKA][shdc]/g) || []).map(pc);
const sameCard = (a, b) => a.r === b.r && a.s === b.s;
const cardsHtml = (cs, big) => cs.map(c => cardHtml(c, big)).join('');
const unseen = excl => newDeck().filter(c => !excl.some(e => sameCard(e, c))); // 섞인 상태로 돌아옴
const mod = (a, n) => ((a % n) + n) % n;
const C2 = n => n * (n - 1) / 2;

// 자리 이름과 행동 순서. 버튼을 옮겨 보며 익힌다
function wSeats(root) {
  const names = ['나', '민수', '지은', '철수', '영희', '현우'];
  const spots = [[50, 86], [14, 68], [14, 30], [50, 14], [86, 30], [86, 68]];
  let btn = 5, pre = true;
  const draw = () => {
    const sb = mod(btn + 1, 6), bb = mod(btn + 2, 6);
    const order = i => mod(i - btn - (pre ? 3 : 1), 6) + 1;
    root.innerHTML = `<div class="table mini">${names.map((n, i) => `<div class="seat" style="left:${spots[i][0]}%;top:${spots[i][1]}%"><div class="nm"><b>${n}</b> <span class="muted">${POS[mod(i - btn, 6)]}</span>${i === btn ? '<span class="dbtn">D</span>' : ''}<br><b style="color:var(--goldbg)">${order(i)}번째</b>${i === sb ? '<br><span class="small">미리 1 냄</span>' : i === bb ? '<br><span class="small">미리 2 냄</span>' : ''}</div></div>`).join('')}<div class="center small" style="color:#fff">${pre ? '프리플랍 순서' : '플랍·턴·리버 순서'}</div></div>
<div class="row"><button class="wnext">다음 판 (버튼 한 칸 이동)</button><button class="wmode">${pre ? '플랍부터의 순서 보기' : '프리플랍 순서 보기'}</button></div>
<p class="small muted">${pre ? '프리플랍은 BB 왼쪽(UTG)이 1번째이고, 미리 돈을 낸 SB·BB가 맨 마지막입니다.' : '플랍부터는 버튼 왼쪽(SB)이 1번째이고, 버튼(BTN)이 항상 맨 마지막입니다.'} 버튼을 옮기면 자리 이름이 모두 한 칸씩 바뀝니다.</p>`;
    root.querySelector('.wnext').onclick = () => { btn = mod(btn + 1, 6); draw(); };
    root.querySelector('.wmode').onclick = () => { pre = !pre; draw(); };
  };
  draw();
}

// 한 판 되감기. 요소 안의 JSON 배열: [{t:설명, b:보드, p:팟, h:내 카드, v:상대 카드('??'=뒷면, ''=없음), vn:상대 이름}] 생략한 칸은 앞 단계 값 유지
function wReplay(root) {
  const steps = JSON.parse(root.textContent); let k = 0;
  const states = []; steps.forEach((s, i) => states.push(Object.assign({}, states[i - 1] || { t: '', b: '', p: 0, h: '', v: '', vn: '상대' }, s)));
  const draw = () => {
    const s = states[k];
    const vil = s.v === '??' ? '<span class="card back"></span><span class="card back"></span>' : s.v ? cardsHtml(pcs(s.v)) : '<span class="muted small">(없음)</span>';
    root.innerHTML = `<div class="row" style="justify-content:space-between;align-items:flex-start"><div><div class="small muted">나</div>${s.h ? cardsHtml(pcs(s.h)) : '<span class="muted small">(아직 없음)</span>'}</div><div style="text-align:center"><div class="small muted">팟</div><b style="font-size:1.3em">${s.p}</b></div><div style="text-align:right"><div class="small muted">${esc(s.vn)}</div>${vil}</div></div>
<div style="text-align:center;margin:10px 0;min-height:64px">${s.b ? cardsHtml(pcs(s.b), true) : '<span class="muted small">가운데 카드 아직 없음</span>'}</div>
<p style="min-height:3.5em">${cc(esc(s.t))}</p>
<div class="row" style="justify-content:space-between"><button class="wprev" ${k === 0 ? 'disabled' : ''}>◀ 이전</button><span class="muted small">${k + 1} / ${states.length}</span><button class="wnext primary" ${k === states.length - 1 ? 'disabled' : ''}>다음 ▶</button></div>`;
    root.querySelector('.wprev').onclick = () => { k--; draw(); };
    root.querySelector('.wnext').onclick = () => { k++; draw(); };
  };
  draw();
}

// 족보 그림 + "누가 이길까?" 퀴즈
const RANK_EX = [['로열 플러시 Royal Flush', 'AsKsQsJsTs'], ['스트레이트 플러시 Straight Flush', '9h8h7h6h5h'], ['포카드 Four of a Kind', 'QsQhQdQc4s'], ['풀하우스 Full House', 'JsJhJd8c8s'], ['플러시 Flush', 'AdJd8d5d2d'], ['스트레이트 Straight', 'Ts9d8c7h6s'], ['트리플 Three of a Kind', '7s7h7dKc2s'], ['투페어 Two Pair', 'KsKh9d9c3s'], ['원페어 One Pair', 'AsAhTd6c3s'], ['하이카드 High Card', 'AsQd9c5h2s']];
function wRankings(root, arg) {
  let score = [0, 0], q;
  const deal = () => { const d = newDeck(); q = { a: d.slice(0, 2), b: d.slice(2, 4), board: d.slice(4, 9), done: false }; draw(); };
  const draw = () => {
    const list = arg === 'quiz' ? '' : `<table class="small"><tr><th>#</th><th>족보</th><th>예</th></tr>${RANK_EX.map(([n, c], i) => `<tr><td>${i + 1}</td><td>${n}</td><td>${cardsHtml(pcs(c))}</td></tr>`).join('')}</table><p class="small muted">위가 강합니다. 표를 손으로 가리고 순서를 말해 본 뒤, 아래 퀴즈를 풀어 보세요.</p>`;
    const sa = evalBest(q.a.concat(q.board)), sb = evalBest(q.b.concat(q.board));
    const ans = sa > sb ? 0 : sb > sa ? 1 : 2;
    root.innerHTML = `${list}<h4 style="margin:.6em 0 .3em">누가 이길까? <span class="muted small">맞힘 ${score[0]} / ${score[1]}</span></h4>
<div style="text-align:center">${cardsHtml(q.board, true)}</div>
<div class="row" style="justify-content:space-around;margin:8px 0"><div style="text-align:center"><div class="small muted">왼쪽</div>${cardsHtml(q.a)}${q.done ? `<div class="small"><b>${CAT_NAMES[catOf(sa)]}</b></div>` : ''}</div><div style="text-align:center"><div class="small muted">오른쪽</div>${cardsHtml(q.b)}${q.done ? `<div class="small"><b>${CAT_NAMES[catOf(sb)]}</b></div>` : ''}</div></div>
<div class="row" style="justify-content:center">${q.done ? `<p><b>${['왼쪽이 이깁니다', '오른쪽이 이깁니다', '무승부(스플릿)'][ans]}.</b> 7장 중 가장 좋은 5장끼리 비교한 결과입니다.</p><button class="wdeal primary">다음 문제</button>` : ['왼쪽', '오른쪽', '무승부'].map((l, i) => `<button class="wans" data-i="${i}">${l}</button>`).join('')}</div>`;
    root.querySelectorAll('.wans').forEach(b => b.onclick = () => { q.done = true; score[1]++; if (+b.dataset.i === ans) score[0]++; draw(); });
    const nd = root.querySelector('.wdeal'); if (nd) nd.onclick = deal;
  };
  deal();
}

// 7장 중 최고의 5장 고르기
function wBestFive(root) {
  let cards, sel, checked;
  const deal = () => { cards = newDeck().slice(0, 7); sel = []; checked = false; draw(); };
  const best5 = () => { let b = null, bs = -1; for (let i = 0; i < 7; i++) for (let j = i + 1; j < 7; j++) { const rest = cards.filter((c, k) => k !== i && k !== j); const s = eval5(rest); if (s > bs) { bs = s; b = rest; } } return b; };
  const draw = () => {
    const mine = sel.length === 5 ? eval5(sel.map(i => cards[i])) : null, top = evalBest(cards);
    root.innerHTML = `<p class="small muted">카드를 눌러 5장을 고르세요. 7장 중 가장 좋은 5장을 찾는 연습입니다.</p>
<div style="text-align:center">${cards.map((c, i) => `<span class="cardbtn" data-i="${i}">${cardHtml(c, true).replace('class="card', `class="card ${sel.includes(i) ? 'sel' : ''}`)}</span>`).join('')}</div>
<div class="row" style="justify-content:center;margin-top:8px"><span class="muted small">${sel.length}/5 선택</span><button class="wcheck primary" ${sel.length === 5 ? '' : 'disabled'}>확인</button><button class="wdeal">새 카드</button></div>
${checked ? `<p>${mine === top ? '<b style="color:var(--green)">정답!</b>' : '<b style="color:var(--red)">아쉽습니다.</b>'} 가장 좋은 5장은 <b>${CAT_NAMES[catOf(top)]}</b>: ${cardsHtml(best5())}${mine !== top ? ` <span class="small muted">(당신의 선택: ${CAT_NAMES[catOf(mine)]})</span>` : ''}</p>` : ''}`;
    root.querySelectorAll('.cardbtn').forEach(b => b.onclick = () => { const i = +b.dataset.i; if (checked) return; if (sel.includes(i)) sel = sel.filter(x => x !== i); else if (sel.length < 5) sel.push(i); draw(); });
    root.querySelector('.wcheck').onclick = () => { checked = true; draw(); };
    root.querySelector('.wdeal').onclick = deal;
  };
  deal();
}

// 아웃츠 그림. 시나리오의 ok(card)가 아웃 판정
const OUTS_EX = [
  { n: '플러시 드로우 (같은 무늬 4장)', h: 'Ah7h', b: 'Kh9h2s', ok: c => c.s === 1 },
  { n: '오픈엔드 스트레이트 드로우 OESD (양쪽 열림)', h: '9c8d', b: 'Th7s2c', ok: c => c.r === 11 || c.r === 6 },
  { n: '것샷 (가운데 한 장 빈 스트레이트)', h: '9c8d', b: 'Jh7s2c', ok: c => c.r === 10 },
  { n: '오버카드 2장 (A K)', h: 'AsKd', b: '9h7c2d', ok: c => c.r >= 13 },
  { n: '플러시 드로우 + OESD (콤보)', h: '9h8h', b: 'Th7h2s', ok: c => c.s === 1 || c.r === 11 || c.r === 6 },
  { n: '셋 → 풀하우스/포카드', h: '7s7h', b: '7dKc2h', ok: c => c.r === 7 || c.r === 13 || c.r === 2 },
  { n: '투페어 → 풀하우스', h: 'Ks7d', b: 'Kh7c2s', ok: c => c.r === 13 || c.r === 7 },
  { n: '원페어 → 트리플/투페어', h: 'As9d', b: 'Ah7c2s', ok: c => c.r === 14 || c.r === 9 },
];
function wOuts(root) {
  let k = 0, tries = 0, hits = 0, last = null;
  const draw = () => {
    const sc = OUTS_EX[k], h = pcs(sc.h), b = pcs(sc.b), rest = unseen(h.concat(b)), outs = rest.filter(sc.ok).sort((x, y) => y.r - x.r || x.s - y.s);
    const n = outs.length, U = rest.length, one = n / U * 100, two = (1 - C2(U - n) / C2(U)) * 100;
    root.innerHTML = `<div class="row"><select class="wsel">${OUTS_EX.map((s, i) => `<option value="${i}" ${i === k ? 'selected' : ''}>${s.n}</option>`).join('')}</select></div>
<div class="row" style="margin:8px 0;gap:18px"><div><div class="small muted">내 카드</div>${cardsHtml(h, true)}</div><div><div class="small muted">플랍</div>${cardsHtml(b, true)}</div></div>
<div class="small muted">안 보이는 카드 ${U}장 중 나를 완성시키는 카드(아웃츠) <b style="color:var(--gold)">${n}장</b>:</div><div style="margin:4px 0">${cardsHtml(outs)}</div>
<table class="small"><tr><th></th><th>어림 (2와 4의 법칙)</th><th>정확</th></tr><tr><td>다음 한 장(턴)에 맞을 확률</td><td>${n} × 2 = <b>${n * 2}%</b></td><td>${n} ÷ ${U} = ${one.toFixed(1)}%</td></tr><tr><td>리버까지 두 장 안에 맞을 확률</td><td>${n} × 4 = <b>${n * 4}%</b>${n > 8 ? ` → 보정 ${n * 4 - (n - 8)}%` : ''}</td><td>${two.toFixed(1)}%</td></tr></table>
<div class="row"><button class="wdraw">턴 카드 한 장 뽑아 보기</button><span class="small">${last ? `${cardHtml(last)} → ${sc.ok(last) ? '<b style="color:var(--green)">맞았다!</b>' : '<b style="color:var(--red)">안 맞았다</b>'}` : ''} ${tries ? `· ${tries}번 중 ${hits}번 맞음 (${Math.round(hits / tries * 100)}%)` : ''}</span></div>
<p class="small muted">여러 번 뽑아 보세요. 횟수가 많아질수록 맞은 비율이 위의 확률에 가까워집니다. 이것이 "장기적으로"라는 말의 뜻입니다.</p>`;
    root.querySelector('.wsel').onchange = e => { k = +e.target.value; tries = hits = 0; last = null; draw(); };
    root.querySelector('.wdraw').onclick = () => { last = rest[Math.floor(Math.random() * rest.length)]; tries++; if (sc.ok(last)) hits++; draw(); };
  };
  draw();
}

// 팟 오즈 슬라이더
function wPotOdds(root) {
  let pot = 100, bet = 50, outs = 9, two = false;
  const draw = () => {
    const need = bet / (pot + bet * 2) * 100, mine = two ? Math.min(100, outs * 4 - Math.max(0, outs - 8)) : outs * 2, tot = pot + bet * 2;
    const seg = (v, col, l) => `<span style="width:${v / tot * 100}%;background:${col}">${l} ${v}</span>`;
    root.innerHTML = `<div class="row">팟 <input type="range" class="wpot" min="10" max="300" step="5" value="${pot}"> <b>${pot}</b></div>
<div class="row">상대 베팅 <input type="range" class="wbet" min="5" max="300" step="5" value="${bet}"> <b>${bet}</b> <span class="muted small">(팟의 ${Math.round(bet / pot * 100)}%)</span></div>
<div class="bar2" style="margin:8px 0">${seg(pot, '#777', '팟')}${seg(bet, 'var(--red)', '상대')}${seg(bet, '#b8860b', '내 콜')}</div>
<p>필요 승률 = 내 콜 ${bet} ÷ (팟 ${pot} + 상대 ${bet} + 내 콜 ${bet}) = ${bet} ÷ ${tot} = <b style="font-size:1.2em">${need.toFixed(1)}%</b> <span class="muted small">(비율로는 ${((pot + bet) / bet).toFixed(1)} : 1)</span></p>
<div class="row">내 드로우 <select class="wouts">${[[4, '것샷 4아웃'], [6, '오버카드 6아웃'], [8, 'OESD 8아웃'], [9, '플러시 드로우 9아웃'], [15, '콤보 15아웃']].map(([v, l]) => `<option value="${v}" ${v === outs ? 'selected' : ''}>${l}</option>`).join('')}</select>
<label><input type="checkbox" class="wtwo" ${two ? 'checked' : ''}> 리버까지 두 장 확정(올인)</label></div>
<p>내 승률 약 <b>${mine}%</b> ${mine >= need ? '<b style="color:var(--green)">≥</b>' : '<b style="color:var(--red)">&lt;</b>'} 필요 ${need.toFixed(0)}% → <b style="color:${mine >= need ? 'var(--green)' : 'var(--red)'}">${mine >= need ? '콜해도 손해가 아닙니다' : '팟 오즈만으로는 폴드'}</b></p>
<p class="small muted">슬라이더를 움직여 보세요. 상대 베팅이 팟의 절반이면 필요 승률은 25%, 팟과 같으면 33%입니다. 팟이 아무리 커도 50%는 넘지 않습니다.</p>`;
    root.querySelector('.wpot').oninput = e => { pot = +e.target.value; draw(); };
    root.querySelector('.wbet').oninput = e => { bet = +e.target.value; draw(); };
    root.querySelector('.wouts').onchange = e => { outs = +e.target.value; draw(); };
    root.querySelector('.wtwo').onchange = e => { two = e.target.checked; draw(); };
  };
  draw();
}

// 핸드 대결 승률 (표본 추출)
function concrete(key) {
  if (/^[2-9TJQKA][shdc][2-9TJQKA][shdc]$/.test(key)) return pcs(key);
  const r1 = RANKS.indexOf(key[0]) + 2, r2 = RANKS.indexOf(key[1]) + 2, t = key[2];
  const s1 = Math.floor(Math.random() * 4); let s2 = Math.floor(Math.random() * 4);
  if (r1 === r2 || t === 'o') while (s2 === s1) s2 = Math.floor(Math.random() * 4);
  if (t === 's') s2 = s1;
  return [{ r: r1, s: s1 }, { r: r2, s: s2 }];
}
function duel(k1, k2, iters = 2500) {
  let w = 0, t = 0, n = 0;
  for (let i = 0; i < iters; i++) {
    const a = concrete(k1), b = concrete(k2);
    if (a.some(x => b.some(y => sameCard(x, y)))) continue;
    const board = unseen(a.concat(b)).slice(0, 5);
    const sa = evalBest(a.concat(board)), sb = evalBest(b.concat(board));
    n++; if (sa > sb) w++; else if (sa === sb) t++;
  }
  return { a: (w + t / 2) / n * 100, b: (n - w - t / 2) / n * 100, tie: t / n * 100 };
}
const normKey = s => { let k = s.trim().replace(/10/g, 'T').toUpperCase(); if (/^[2-9TJQKA][SHDC][2-9TJQKA][SHDC]$/.test(k)) return k[0] + k[1].toLowerCase() + k[2] + k[3].toLowerCase(); k = k.replace(/S$/, 's').replace(/O$/, 'o'); if (!/^[2-9TJQKA]{2}[so]?$/.test(k)) return null; if (k.length === 3 && k[0] === k[1]) return null; return k; };
function wMatchup(root) {
  let h1 = 'AKs', h2 = 'QQ', res = null;
  const presets = [['AA', 'KK'], ['AKs', 'QQ'], ['AKo', '72o'], ['A9o', 'ATo'], ['KQs', '55'], ['JTs', 'AKo']];
  const draw = () => {
    root.innerHTML = `<div class="row"><input type="text" class="wh1" value="${h1}" style="width:90px"> <b>vs</b> <input type="text" class="wh2" value="${h2}" style="width:90px"> <button class="wgo primary">승률 보기</button></div>
<div class="row small" style="margin:6px 0">${presets.map(([a, b]) => `<button class="wp small" data-a="${a}" data-b="${b}">${a} vs ${b}</button>`).join('')}</div>
${res ? `<div class="row" style="justify-content:space-between"><b>${res.k1}: ${res.a.toFixed(0)}%</b><b>${res.k2}: ${res.b.toFixed(0)}%</b></div><div class="eqbar"><i style="width:${res.a}%"></i></div><p class="small muted">무승부 ${res.tie.toFixed(1)}% 포함(반씩 나눔). 보드 5장을 2,500번 무작위로 돌린 어림값이라 1~2% 오차가 있습니다.</p>` : res === false ? '<p class="small" style="color:var(--red)">표기를 확인하세요. 예: AKs, AKo, QQ, 또는 정확한 카드 AsKd</p>' : '<p class="small muted">s = 같은 무늬(suited), o = 다른 무늬(offsuit). 페어는 QQ처럼 두 글자. 정확한 카드는 AsKd처럼 (s♠ h♥ d♦ c♣).</p>'}`;
    const go = () => { h1 = root.querySelector('.wh1').value; h2 = root.querySelector('.wh2').value; const k1 = normKey(h1), k2 = normKey(h2); res = k1 && k2 ? Object.assign(duel(k1, k2), { k1, k2 }) : false; draw(); };
    root.querySelector('.wgo').onclick = go;
    root.querySelectorAll('.wp').forEach(b => b.onclick = () => { h1 = b.dataset.a; h2 = b.dataset.b; go(); });
  };
  draw();
}

// 플랍 텍스처 생성기
function flopInfo(f) {
  const rs = f.map(c => c.r).sort((a, b) => b - a), suits = new Set(f.map(c => c.s)).size;
  const paired = new Set(rs).size < 3, span = rs[0] - rs[2], high = rs.filter(r => r >= 10).length;
  const lines = [
    suits === 3 ? '무늬가 셋 다 다릅니다(레인보우). 플러시 드로우가 없습니다.' : suits === 2 ? '같은 무늬가 2장(투톤). 플러시 드로우가 가능합니다.' : '셋 다 같은 무늬(모노톤). 벌써 플러시가 있을 수 있습니다.',
    paired ? '같은 숫자가 있는 페어드 보드. 트립스·풀하우스가 가능하지만 상대도 맞추기 어렵습니다.' : span <= 4 ? '숫자가 서로 가까워(연결됨) 스트레이트 드로우가 많습니다.' : span <= 7 ? '숫자가 조금 떨어져 있어 것샷 정도만 가능합니다.' : '숫자가 멀리 떨어져 있어 스트레이트 드로우가 거의 없습니다.',
    high >= 2 ? '높은 카드(T 이상)가 많아 프리플랍에 올린 사람(레이저) 편입니다.' : high === 0 ? '낮은 카드뿐이라 콜한 사람(넓은 레인지) 편에 가깝습니다.' : '높은 카드 한 장. 중간입니다.',
  ];
  const wet = (suits <= 2 ? 1 : 0) + (!paired && span <= 4 ? 1 : 0) + (suits === 1 ? 1 : 0);
  return { lines, label: wet === 0 ? '드라이 (마른 보드)' : wet === 1 ? '중간' : '웻 (젖은 보드)' };
}
function wTexture(root) {
  const draw = () => {
    const f = newDeck().slice(0, 3), info = flopInfo(f);
    root.innerHTML = `<div class="row" style="align-items:center;gap:16px"><div>${cardsHtml(f, true)}</div><button class="wnew primary">새 플랍</button></div>
<p>이 플랍은 <b style="font-size:1.1em">${info.label}</b></p><ul class="small">${info.lines.map(l => `<li>${l}</li>`).join('')}</ul>
<p class="small muted">"새 플랍"을 누르기 전에 먼저 세 단어(무늬·연결·높낮이)로 말해 보고, 아래 설명과 맞춰 보세요.</p>`;
    root.querySelector('.wnew').onclick = draw;
  };
  draw();
}

// 레인지 그리드 (rfi | vs | push)
function wRange(root, arg) {
  const sets = arg === 'vs' ? { '3벳(되올리기)': VS_RAISE.threeBet, '콜': VS_RAISE.call, 'BB에서만 콜': VS_RAISE.callLoose, '3벳 맞으면 4벳': VS_RAISE.vs3betRaise, '3벳 맞으면 콜': VS_RAISE.vs3betCall } : arg === 'push' ? PUSH10 : RFI;
  root.innerHTML = rangeWidget('w' + arg);
  mountRange(root, sets);
  root.insertAdjacentHTML('beforeend', '<p class="small muted">위 단추를 눌러 바꿔 보세요. 초록 칸이 해당하는 카드입니다. 대각선은 페어, 오른쪽 위는 같은 무늬(s), 왼쪽 아래는 다른 무늬(o)입니다.</p>');
}

const WIDGETS = { seats: wSeats, replay: wReplay, rankings: wRankings, bestfive: wBestFive, outs: wOuts, potodds: wPotOdds, matchup: wMatchup, texture: wTexture, range: wRange };
function mountWidgets(scope) {
  scope.querySelectorAll('[data-widget]').forEach(el => { const f = WIDGETS[el.dataset.widget]; if (!f) return; el.classList.add('wg'); try { f(el, el.dataset.arg); } catch (e) { el.innerHTML = '<span class="muted small">표시 오류</span>'; } });
}
if (typeof module !== 'undefined') module.exports = { OUTS_EX, flopInfo, duel, normKey, concrete, pcs, WIDGETS };
