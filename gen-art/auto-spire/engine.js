// ==========================================
// Auto Slay the Spire — 遊戲引擎
// 回合制戰鬥 + 自動出牌 AI + Act 1 流程
// 事件驅動：engine.step() 每次推進一小步，回傳動畫事件給 sketch 渲染
// ==========================================

const rr2 = (a, b) => a + Math.random() * (b - a);
const ri2 = (a, b) => Math.floor(rr2(a, b + 1));
const pick2 = arr => arr[Math.floor(Math.random() * arr.length)];
const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function makeCard(id) {
  const d = CARDS[id];
  return { id, up: false, ...JSON.parse(JSON.stringify({ n: d.n, c: d.c, t: d.t, tg: d.tg, fx: d.fx, r: d.r })) };
}

const STORAGE_KEY = 'auto-spire-stats-v1';

function loadStats() {
  try {
    const raw = (typeof localStorage !== 'undefined') && localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { won: 0, lost: 0, totalRuns: 0, chars: {} };
}
function saveStats(stats) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch (e) {}
}
function resetStats() {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
  return { won: 0, lost: 0, totalRuns: 0, chars: {} };
}

class Game {
  constructor() {
    this.stats = loadStats();
    this.newRun();
  }

  charStats(key) {
    if (!this.stats.chars[key]) this.stats.chars[key] = { w: 0, l: 0, bestFloor: 0 };
    return this.stats.chars[key];
  }

  recordResult(won) {
    const cs = this.charStats(this.chKey);
    this.stats.totalRuns++;
    const absFloor = (this.act - 1) * 15 + this.floor + 1;
    if (won) { this.stats.won++; cs.w++; cs.bestFloor = 45; }
    else {
      this.stats.lost++; cs.l++;
      cs.bestFloor = Math.max(cs.bestFloor, absFloor);
    }
    saveStats(this.stats);
  }

  clearMemory() {
    this.stats = resetStats();
    this.addLog('🗑️ 遊戲記錄已重置');
    this.emit({ t: 'memoryCleared' });
  }

  newRun() {
    const chKey = pick2(Object.keys(CHARS));
    const ch = CHARS[chKey];
    this.chKey = chKey; this.ch = ch;
    this.maxHP = ch.hp; this.hp = ch.hp;
    this.gold = 99;
    this.deck = ch.deck.map(makeCard);
    this.relics = ['spire_core', ch.relic];
    if (chKey === 'watcher') { this.relics.push('violet_lotus'); this.relics.push('third_eye_relic'); }
    this.potions = [pick2(Object.keys(POTIONS)), null, null];
    this.act = 1;
    this.floor = 0;
    this.map = this.genMap();
    this.state = 'map';       // map | battle | reward | rest | victory | defeat
    this.battle = null;
    this.log = [`⚔️ 新的爬塔：${ch.name}`];
    this.events = [{ t: 'newrun' }];
    this.stateTimer = 0;
    this.runsWon = this.runsWon || 0; this.runsLost = this.runsLost || 0;
  }

  genMap() {
    // Act 1：15 層固定節奏，含一間商店
    const layout = ['M','M','M','E','M','R','M','S','M','E','R','M','M','R','B'];
    return layout.map((t, i) => ({ type: t, done: false, idx: i }));
  }

  addLog(msg) { this.log.push(msg); if (this.log.length > 8) this.log.shift(); }
  emit(e) { this.events.push(e); }

  // ── 流程推進（sketch 在動畫空檔呼叫）──
  step() {
    if (this.state === 'map') return this.enterFloor();
    if (this.state === 'battle') return this.battleStep();
    if (this.state === 'reward') return this.claimReward();
    if (this.state === 'rest') return this.doRest();
    if (this.state === 'shop') return this.doShop();
    if (this.state === 'victory' || this.state === 'defeat') {
      this.newRun(); return;
    }
  }

  enterFloor() {
    const node = this.map[this.floor];
    if (!node) { this.state = 'victory'; return; }
    if (node.type === 'R') { this.state = 'rest'; return; }
    if (node.type === 'S') { this.state = 'shop'; this.shopStock = this.genShopStock(); return; }
    const P = ENCOUNTERS[this.act];
    const pool = node.type === 'B' ? P.boss : node.type === 'E' ? P.elite
               : this.floor < 3 ? P.easy : P.mid;
    this.startBattle(pick2(pool), node.type);
  }

  genShopStock() {
    // 3 張卡（依稀有度定價）、1 個遺物、2 瓶藥水、1 次移除服務
    const pool = Object.keys(CARDS).filter(k => CARDS[k].ch === this.chKey && !CARDS[k].derived);
    const rollCard = () => {
      const r = Math.random();
      const rarity = r < 0.5 ? 1 : r < 0.88 ? 2 : 3;
      const cands = pool.filter(k => CARDS[k].r === rarity);
      const id = pick2(cands.length ? cands : pool);
      return { id, price: rarity === 3 ? 75 : rarity === 2 ? 60 : 45 };
    };
    const availRelics = RELIC_POOL.filter(r => !this.relics.includes(r));
    return {
      cards: [rollCard(), rollCard(), rollCard()],
      relic: availRelics.length ? { id: pick2(availRelics), price: 120 } : null,
      potions: [{ id: pick2(Object.keys(POTIONS)), price: 40 }, { id: pick2(Object.keys(POTIONS)), price: 40 }],
      removePrice: 60,
    };
  }

  doShop() {
    const s = this.shopStock;
    const bought = [];
    // 1. 遺物優先（性價比最高）
    if (s.relic && this.gold >= s.relic.price) {
      this.gold -= s.relic.price;
      this.relics.push(s.relic.id);
      bought.push(`🏺${RELICS[s.relic.id].n}`);
      this.emit({ t: 'relicReward', relic: s.relic.id });
    }
    // 2. 補藥水（有空格才買）
    for (const p of s.potions) {
      const slot = this.potions.indexOf(null);
      if (slot >= 0 && this.gold >= p.price) {
        this.gold -= p.price;
        this.potions[slot] = p.id;
        bought.push(`🧪${POTIONS[p.id].n}`);
      }
    }
    // 3. 買一張最好的卡（跟獎勵選卡同權重）
    const atkCount = this.deck.filter(c => c.t === 'a').length;
    const affordable = s.cards.filter(c => this.gold >= c.price);
    if (affordable.length) {
      const best = affordable.sort((a, b) => (CARDS[b.id].r - CARDS[a.id].r))[0];
      if (CARDS[best.id].r >= 2 || Math.random() < 0.5) {
        this.gold -= best.price;
        this.deck.push(makeCard(best.id));
        bought.push(`🃏${CARDS[best.id].n}`);
      }
    }
    // 4. 移除一張基礎打擊/防禦（瘦牌）
    if (this.gold >= s.removePrice) {
      const basic = this.deck.find(c => !c.up && (c.n === '打擊' || c.n === '防禦'));
      if (basic && this.deck.length > 8) {
        this.gold -= s.removePrice;
        this.deck.splice(this.deck.indexOf(basic), 1);
        bought.push(`🗑️移除${basic.n}`);
      }
    }
    this.addLog(bought.length ? `🛒 購買：${bought.join('、')}` : '🛒 商店逛逛沒買東西');
    this.emit({ t: 'shop', bought });
    this.map[this.floor].done = true;
    this.floor++;
    this.state = 'map';
  }

  doRest() {
    // 升級一張未升級高價值卡，HP 低則休息
    if (this.hp < this.maxHP * 0.65) {
      const heal = Math.floor(this.maxHP * 0.3);
      this.hp = Math.min(this.maxHP, this.hp + heal);
      this.addLog(`🔥 營火休息，回復 ${heal} HP`);
      this.emit({ t: 'rest', heal });
    } else {
      // 觀者優先升級爆發（費用 2→1 是質變），其他角色升稀有度最高的
      const cand = (this.chKey === 'watcher' && this.deck.find(c => c.id === 'eruption' && !c.up))
                || this.deck.filter(c => !c.up && c.r > 0).sort((a, b) => b.r - a.r)[0]
                || this.deck.find(c => !c.up);
      if (cand) { this.upgradeCard(cand); this.addLog(`⬆️ 升級了「${cand.n}」`); this.emit({ t: 'upgrade', card: cand.n }); }
    }
    this.map[this.floor].done = true;
    this.floor++;
    this.state = 'map';
  }

  upgradeCard(c) {
    if (c.up) return;
    c.up = true; c.n += '+';
    if (c.id === 'eruption') c.c = 1;   // 爆發升級後費用 2→1（原作）
    const f = c.fx;
    if (f.dmg) f.dmg = Math.ceil(f.dmg * 1.35);
    if (f.block) f.block = Math.ceil(f.block * 1.35);
    if (f.poison) f.poison += 2;
    if (f.str) f.str += 1;
    if (f.dex) f.dex += 1;
    if (f.draw) f.draw += 1;
    if (f.vuln) f.vuln += 1;
    if (f.weak) f.weak += 1;
    if (f.demonForm) f.demonForm += 1;
    if (f.metallicize) f.metallicize += 1;
  }

  // ── 戰鬥 ──
  startBattle(enemyIds, nodeType) {
    const enemies = enemyIds.map(id => {
      const m = MONSTERS[id];
      return { id, n: m.n, emoji: m.emoji, w: m.w, hp: ri2(m.hp[0], m.hp[1]), maxHP: 0,
               block: 0, str: 0, weak: 0, vuln: 0, poison: 0, strDownEnd: 0,
               ai: m.ai, intents: m.intents, step: 0, intent: null };
    });
    enemies.forEach(e => { e.maxHP = e.hp; this.setIntent(e); });
    this.battle = {
      nodeType, enemies, turn: 0, phase: 'playerStart',
      // 尖塔核心隨幕數共鳴：Act1 +2 / Act2 +3 / Act3 +4 能量
      energy: 0, maxEnergy: 3 + (this.relics.includes('spire_core') ? 1 + this.act : 0),
      hand: [], draw: shuffle(this.deck.map(c => ({ ...c, fx: { ...c.fx } }))),
      discard: [], exhaustPile: [], block: 0,
      str: 0, dex: 0, weak: 0, vuln: 0, thorns: 0, metallicize: 0, intangible: 0, buffer: 0,
      stance: 'none', mantra: 0, orbs: [], orbSlots: 3, focus: 0,
      powers: {}, cardsPlayedThisTurn: 0, attacksPlayedThisTurn: 0, attacksPlayedTotal: 0,
      firstAttack: true, tookDamage: false, lastCardType: null,
      strDownEnd: 0, energyNext: 0, drawNext: 0, blockNext: 0, nextAttackBonus: 0,
      freeAttack: 0, doubleTapNext: 0, penNibCount: 0, nunchakuCount: 0, happyFlowerCount: 0,
      kunaiCount: 0, extraTurnFlag: 0,
    };
    // 遺物開戰效果
    const b = this.battle;
    if (this.relics.includes('cracked_core')) this.channelOrb('lightning');
    if (this.relics.includes('pure_water')) b.draw.unshift(makeCard('smite_card'));
    if (this.relics.includes('blood_vial')) this.hp = Math.min(this.maxHP, this.hp + 2);
    if (this.relics.includes('vajra')) b.str += 1;
    if (this.relics.includes('oddly_smooth')) b.dex += 1;
    if (this.relics.includes('bag_of_marbles')) b.enemies.forEach(e => e.vuln += 1);
    this.state = 'battle';
    this.addLog(`⚔️ 遭遇：${enemies.map(e => e.n).join('、')}`);
    this.emit({ t: 'battleStart', enemies: enemies.map(e => e.n) });
  }

  setIntent(e) {
    const m = MONSTERS[e.id];
    if (e.ai === 'seq') {
      const seq = m.intents;
      let idx = e.step;
      if (idx >= seq.length) {
        const loopStart = seq.findIndex(s => s.loop !== undefined);
        idx = loopStart >= 0 ? (seq[seq.length - 1].loop || 0) + ((idx - seq.length) % (seq.length - (seq[seq.length - 1].loop || 0))) : seq.length - 1;
        idx = Math.min(idx, seq.length - 1);
      }
      e.intent = seq[Math.min(idx, seq.length - 1)];
    } else {
      const total = m.intents.reduce((s, it) => s + (it.w || 1), 0);
      let r = Math.random() * total;
      for (const it of m.intents) { r -= (it.w || 1); if (r < 0) { e.intent = it; break; } }
      if (!e.intent) e.intent = m.intents[0];
    }
  }

  channelOrb(type) {
    const b = this.battle;
    if (b.orbs.length >= b.orbSlots) this.evokeOrb(0);
    b.orbs.push({ type });
    this.emit({ t: 'orb', type });
  }

  evokeOrb(idx) {
    const b = this.battle;
    const orb = b.orbs.splice(idx, 1)[0];
    if (!orb) return;
    const f = b.focus;
    if (orb.type === 'lightning') this.dmgRandomEnemy(8 + f, '⚡');
    if (orb.type === 'frost') b.block += 5 + f;
    if (orb.type === 'dark') this.dmgRandomEnemy(12 + f * 2, '🌑');
    if (orb.type === 'plasma') b.energy += 2;
  }

  orbPassives() {
    const b = this.battle;
    for (const orb of b.orbs) {
      const f = b.focus;
      if (orb.type === 'lightning') {
        if (b.powers.electrodynamics) this.dmgAllEnemies(3 + f, '⚡');
        else this.dmgRandomEnemy(3 + f, '⚡');
      }
      if (orb.type === 'frost') b.block += 2 + f;
      if (orb.type === 'plasma') b.energy += 1;
    }
  }

  dmgRandomEnemy(amt, tag) {
    const alive = this.battle.enemies.filter(e => e.hp > 0);
    if (!alive.length) return;
    this.dealDmgRaw(pick2(alive), amt, tag);
  }
  dmgAllEnemies(amt, tag) {
    for (const e of this.battle.enemies) if (e.hp > 0) this.dealDmgRaw(e, amt, tag);
  }

  dealDmgRaw(e, amt, tag) {
    let dmg = amt;
    if (e.vuln > 0) dmg = Math.floor(dmg * (this.relics.includes('paper_phrog') ? 1.75 : 1.5));
    if (e.intangibleNow) dmg = Math.min(dmg, 1);   // 復仇女神虛無回合
    const blocked = Math.min(e.block, dmg);
    e.block -= blocked; dmg -= blocked;
    e.hp -= dmg;
    this.emit({ t: 'dmg', target: e, amt: dmg, tag });
    if (e.hp <= 0) this.onEnemyDeath(e);
    return dmg;
  }

  onEnemyDeath(e) {
    // 覺醒者：第一次死亡時重生
    if (MONSTERS[e.id] && MONSTERS[e.id].rebirth && !e.reborn) {
      e.reborn = true;
      e.hp = e.maxHP;
      e.str += 2;
      this.addLog(`🕊️ ${e.n} 重生了！`);
      this.emit({ t: 'buff', txt: `${e.n} 重生` });
      return;
    }
    e.hp = 0;
    this.emit({ t: 'die', target: e });
    if (this.relics.includes('gremlin_horn')) { this.battle.energy += 1; this.drawCards(1); }
  }

  attackEnemy(e, base, card) {
    const b = this.battle;
    let dmg = base + b.str;
    if (card && card.fx.strMult) dmg = base + b.str * card.fx.strMult;
    if (b.nextAttackBonus) { dmg += b.nextAttackBonus; b.nextAttackBonus = 0; }
    if (b.stance === 'wrath') dmg *= 2;
    if (b.stance === 'divinity') dmg *= 3;
    if (b.weak > 0) dmg = Math.floor(dmg * 0.75);
    if (b.firstAttack && this.relics.includes('akabeko')) { dmg += 8; }
    b.penNibCount++;
    if (this.relics.includes('pen_nib') && b.penNibCount % 10 === 0) dmg *= 2;
    b.firstAttack = false;
    dmg = Math.max(0, Math.floor(dmg));
    const dealt = this.dealDmgRaw(e, dmg, '⚔️');
    // 攻擊附帶
    if (b.powers.envenom && dealt > 0) e.poison = (e.poison || 0) + 1;
    if (card && card.fx.reap) this.hp = Math.min(this.maxHP, this.hp + dealt);
    if (card && card.fx.talkHand) e.talkHand = (e.talkHand || 0) + card.fx.talkHand;
    if (e.hp > 0 && e.intent && e.intent.t !== 'atk' && false) {} // placeholder
    return dealt;
  }

  drawCards(n) {
    const b = this.battle;
    for (let i = 0; i < n; i++) {
      if (!b.draw.length) { b.draw = shuffle(b.discard); b.discard = []; }
      if (!b.draw.length) break;
      if (b.hand.length >= 10) break;
      const c = b.draw.pop();
      b.hand.push(c);
      if (b.powers.evolve && c.derived) this.drawCards(1);
    }
  }

  changeStance(s) {
    const b = this.battle;
    if (b.stance === s) return;
    const prev = b.stance;
    if (prev === 'calm') b.energy += 2 + (this.relics.includes('violet_lotus') ? 1 : 0);
    b.stance = s;
    if (b.powers.mentalFortress) b.block += b.powers.mentalFortress;
    if (s === 'wrath' && b.powers.rushdown) this.drawCards(b.powers.rushdown);
    this.emit({ t: 'stance', stance: s });
  }

  // ── 玩家回合 ──
  playerTurnStart() {
    const b = this.battle;
    b.turn++;
    b.cardsPlayedThisTurn = 0; b.attacksPlayedThisTurn = 0; b.kunaiCount = 0;
    // 格擋消退
    if (!b.powers.barricade && !this.relics.includes('calipers_x')) b.block = b.blockNext || 0;
    b.blockNext = 0;
    b.energy = b.maxEnergy + (b.energyNext || 0);
    b.energyNext = 0;
    if (b.turn === 1 && this.relics.includes('lantern')) b.energy += 1;
    if (b.turn === 1 && this.relics.includes('anchor')) b.block += 10;
    if (b.turn === 2 && this.relics.includes('horn_cleat')) b.block += 14;
    if (this.relics.includes('happy_flower')) { b.happyFlowerCount++; if (b.happyFlowerCount % 3 === 0) b.energy += 1; }
    // 能力牌每回合效果
    if (b.powers.demonForm) { b.str += b.powers.demonForm; this.emit({ t: 'buff', txt: `力量+${b.powers.demonForm}` }); }
    if (this.relics.includes('third_eye_relic')) { b.mantra += 4; this.checkMantra(); }
    if (b.powers.devotion) { b.mantra += b.powers.devotion; this.checkMantra(); }
    if (b.powers.battleHymn) b.hand.push(makeCard('smite_card'));
    if (b.powers.helloWorld) { const pool = Object.keys(CARDS).filter(k => CARDS[k].ch === this.chKey && CARDS[k].r === 1); b.hand.push(makeCard(pick2(pool))); }
    if (b.powers.infiniteBlades) b.hand.push(makeCard('shiv'));
    if (b.powers.noxiousFumes) for (const e of b.enemies) if (e.hp > 0) e.poison += b.powers.noxiousFumes;
    if (b.powers.brutality) { this.loseHP(1); this.drawCards(1); }
    if (b.powers.selfRepair) {} // 戰後回血，見 endBattle
    const drawN = 5 + (b.drawNext || 0) + (b.turn === 1 && (this.relics.includes('ring_snake') || this.relics.includes('bag_of_prep')) ? 2 : 0);
    b.drawNext = 0;
    this.drawCards(drawN);
    b.phase = 'playerPlay';
    this.emit({ t: 'turnStart', turn: b.turn });
  }

  checkMantra() {
    const b = this.battle;
    if (b.mantra >= 10) { b.mantra -= 10; this.changeStance('divinity'); b.energy += 3; }
  }

  loseHP(n) {
    const b = this.battle;
    if (this.relics.includes('tungsten_rod')) n = Math.max(0, n - 1);
    if (b.buffer > 0 && n > 0) { b.buffer--; return; }
    this.hp -= n;
    if (b.powers.rupture && n > 0) b.str += b.powers.rupture;
    if (n > 0 && !b.tookDamage && this.relics.includes('centennial_puzzle')) { this.drawCards(3); }
    if (n > 0) b.tookDamage = true;
    if (this.relics.includes('self_forming_clay') && n > 0) b.blockNext += 3;
    this.emit({ t: 'playerDmg', amt: n });
    if (this.hp <= 0) this.onDefeat();
  }

  // ── 自動出牌 AI ──
  // 觀者專用規劃器：格擋→進憤怒→攻擊×2→收尾蓄能，取代貪婪評分
  pickCardWatcher(playable, alive) {
    const b = this.battle;
    const inWrath = b.stance === 'wrath';
    const incoming = this.incomingDamage();   // 已含當前姿態倍率
    const wrathC = playable.find(c => c.fx.stance === 'wrath');
    const atks = playable.filter(c => c.t === 'a' && !c.fx.stance);
    const blocks = playable.filter(c => c.fx.block).sort((a, b2) => this.effCost(a) - this.effCost(b2));
    // 1. 格擋到安全線（若計畫進憤怒，需求以 ×2 計）
    const target = (wrathC && !inWrath) ? incoming * 2 : incoming;
    if (b.block < target && blocks.length) {
      const ok = blocks.find(c => !(c.fx.stance === 'calm' && inWrath && atks.length));
      if (ok) return ok;
    }
    // 2. 真言牌優先（神聖姿態 ×3 傷害無代價）與能力牌鋪場
    const mantraC = playable.find(c => c.fx.mantra);
    if (mantraC) return mantraC;
    const power = playable.find(c => c.t === 'p');
    if (power) return power;
    // 3. 進憤怒：格擋扛得住或能斬殺才進（爆發輸出主力改由神聖姿態負責）
    if (wrathC && !inWrath && (atks.length || wrathC.fx.dmg) && b.stance !== 'divinity') {
      const safe = b.block >= incoming * 2 - 6 || this.canLethalThisTurn();
      if (safe) return wrathC;
    }
    // 4. 攻擊：斬殺優先、傷害高優先
    if (atks.length) {
      return atks.sort((a, b2) => this.estimateDmg(b2, alive[0]) - this.estimateDmg(a, alive[0]))[0];
    }
    // 5. 收尾：切平靜蓄能或其他技能
    return playable[0];
  }

  pickCardToPlay() {
    const b = this.battle;
    const alive = b.enemies.filter(e => e.hp > 0);
    if (!alive.length) return null;
    const incoming = this.incomingDamage();
    const playable = b.hand.filter(c => this.canPlay(c));
    if (!playable.length) return null;
    if (this.chKey === 'watcher') return this.pickCardWatcher(playable, alive);

    const score = (c) => {
      const f = c.fx; let s = 0;
      const cost = this.effCost(c);
      // 能力牌前期優先
      if (c.t === 'p') s += 90 - b.turn * 12;
      // 斬殺
      if (f.dmg) {
        const est = this.estimateDmg(c, alive[0]);
        const killable = alive.find(e => this.estimateDmg(c, e) >= e.hp);
        s += killable ? 200 : Math.min(60, est * 2.2);
      }
      if (f.aoe && alive.length > 1) s += 25 * (alive.length - 1);
      // 需要格擋時
      if (f.block) {
        const need = Math.max(0, incoming - b.block);
        s += need > 0 ? Math.min(70, f.block * 3.2) : f.block * 0.4;
      }
      if (f.poison) s += f.poison * 3.5;
      if (f.vuln) s += 18;
      if (f.weak) s += 12;
      if (f.draw) s += f.draw * 6;
      if (f.energy) s += f.energy * 8;
      if (f.channel) s += 20;
      if (f.focus) s += 28;
      // 憤怒姿態：儘早進入讓後續攻擊吃 ×2，前提是剩餘能量足以把格擋補到安全線
      if (f.stance === 'wrath') {
        const cost = this.effCost(c);
        const wrathIncoming = incoming * (b.stance === 'wrath' ? 1 : 2);
        let blockPot = 0, eLeft = b.energy - cost;
        for (const x of b.hand.filter(x => x !== c && x.fx.block).sort((a, b2) => this.effCost(a) - this.effCost(b2))) {
          const xc = this.effCost(x);
          if (xc <= eLeft) { eLeft -= xc; blockPot += x.fx.block + b.dex; }
        }
        const safe = (wrathIncoming - b.block - blockPot) <= 6 || this.hp > this.maxHP * 0.75;
        s += this.canLethalThisTurn() ? 40 : safe ? 20 : -45;
        if (b.stance === 'calm') s += 12;   // 姿態舞能量回充
      }
      if (f.mark) s += 18;   // 點穴疊層
      if (f.stance === 'calm') {
        s += 14;
        // 還有攻擊牌沒打完就別從憤怒切回平靜（會浪費 ×2 加成）
        if (b.stance === 'wrath' && b.hand.some(x => x !== c && x.t === 'a' && this.effCost(x) <= b.energy - this.effCost(c))) s -= 32;
      }
      if (f.exitStance && b.stance === 'wrath') s += 50;
      if (f.mantra) s += 10;
      if (f.mantra) s += f.mantra * 4;
      if (f.loseHP && this.hp < 20) s -= 60;
      if (f.needAllAttacks && !b.hand.every(x => x.t === 'a')) return -999;
      if (f.needEmptyDraw && b.draw.length > 0) return -999;
      if (f.needOnlyAttack && b.hand.filter(x => x.t === 'a').length > 1) return -999;
      // 效率：便宜優先
      s -= cost * 6;
      return s;
    };
    let best = null, bestS = -998;
    for (const c of playable) { const s = score(c); if (s > bestS) { bestS = s; best = c; } }
    return bestS <= -500 ? null : best;
  }

  canLethalThisTurn() {
    // 粗估：手上可打出的攻擊總傷是否 ≥ 存活敵人總 HP
    const b = this.battle;
    const alive = b.enemies.filter(e => e.hp > 0);
    const totalHP = alive.reduce((s, e) => s + e.hp + e.block, 0);
    let energy = b.energy, total = 0;
    for (const c of b.hand.filter(x => x.t === 'a' && x.fx.dmg).sort((a, b2) => this.effCost(a) - this.effCost(b2))) {
      const cost = this.effCost(c);
      if (cost > energy) continue;
      energy -= cost;
      total += this.estimateDmg(c, alive[0]) * 2; // 憤怒後傷害×2
    }
    return total >= totalHP;
  }

  effCost(c) {
    const b = this.battle;
    if (c.fx.xCost) return b.energy;
    if (b.powers.corruption && c.t === 's') return 0;
    return Math.max(0, c.c);
  }

  canPlay(c) {
    const b = this.battle;
    if (c.fx.xCost) return b.energy >= 1;
    return this.effCost(c) <= b.energy;
  }

  estimateDmg(c, e) {
    const b = this.battle;
    let base = c.fx.dmg || 0;
    if (c.fx.blockAsDmg) base = b.block;
    if (c.fx.dmgPerStrike) base += this.deck.filter(x => x.id && x.id.includes('strike')).length * c.fx.dmgPerStrike;
    let dmg = (base + b.str) * (c.fx.hits || 1);
    if (b.stance === 'wrath') dmg *= 2;
    if (e.vuln > 0) dmg = Math.floor(dmg * 1.5);
    if (b.weak > 0) dmg = Math.floor(dmg * 0.75);
    return dmg;
  }

  incomingDamage() {
    let total = 0;
    for (const e of this.battle.enemies) {
      if (e.hp <= 0 || !e.intent || e.intent.t !== 'atk') continue;
      let d = (e.intent.dmg + e.str) * (e.intent.hits || 1);
      if (e.weak > 0) d = Math.floor(d * 0.75);
      if (this.battle.vuln > 0) d = Math.floor(d * 1.5);
      if (this.battle.stance === 'wrath') d *= 2;
      total += d;
    }
    return total;
  }

  pickTarget(c) {
    const alive = this.battle.enemies.filter(e => e.hp > 0);
    if (!alive.length) return null;
    // 能斬殺就殺、否則打意圖傷害最高的
    const killable = alive.filter(e => this.estimateDmg(c, e) >= e.hp)
                          .sort((a, b2) => b2.hp - a.hp)[0];
    if (killable) return killable;
    return alive.sort((a, b2) => {
      const da = a.intent && a.intent.t === 'atk' ? (a.intent.dmg + a.str) * (a.intent.hits || 1) : 0;
      const db = b2.intent && b2.intent.t === 'atk' ? (b2.intent.dmg + b2.str) * (b2.intent.hits || 1) : 0;
      return db - da;
    })[0];
  }

  maybeUsePotion() {
    const b = this.battle;
    const incoming = this.incomingDamage();
    for (let i = 0; i < this.potions.length; i++) {
      const p = this.potions[i];
      if (!p) continue;
      const pd = POTIONS[p];
      const danger = this.hp < this.maxHP * 0.3;
      const isBoss = b.nodeType === 'B';
      let use = false;
      if (pd.fx.healPct || pd.fx.heal) use = danger;
      else if (pd.fx.block) use = incoming > b.block + 10 && danger;
      else if (isBoss || danger) use = true;
      if (use) {
        this.usePotion(i);
        return true;
      }
    }
    return false;
  }

  usePotion(i) {
    const p = this.potions[i]; if (!p) return;
    const pd = POTIONS[p]; const b = this.battle; const f = pd.fx;
    this.potions[i] = null;
    this.addLog(`🧪 使用${pd.n}`);
    this.emit({ t: 'potion', name: pd.n, icon: pd.icon });
    const target = this.pickTarget({ fx: f });
    if (f.dmg && f.aoe) this.dmgAllEnemies(f.dmg, '💥');
    else if (f.dmg && target) this.dealDmgRaw(target, f.dmg, '💥');
    if (f.block) b.block += f.block;
    if (f.str) b.str += f.str;
    if (f.dex) b.dex += f.dex;
    if (f.energy) b.energy += f.energy;
    if (f.draw) this.drawCards(f.draw);
    if (f.vuln && target) target.vuln += f.vuln;
    if (f.weak && target) target.weak += f.weak;
    if (f.poison && target) target.poison += f.poison;
    if (f.heal) this.hp = Math.min(this.maxHP, this.hp + f.heal);
    if (f.healPct) this.hp = Math.min(this.maxHP, this.hp + Math.floor(this.maxHP * f.healPct));
  }

  // ── 打出一張卡 ──
  playCard(c, target) {
    const b = this.battle;
    const f = c.fx;
    let cost = this.effCost(c);
    const xVal = f.xCost ? b.energy : 0;
    b.energy -= cost;
    b.hand.splice(b.hand.indexOf(c), 1);
    b.cardsPlayedThisTurn++;
    if (c.t === 'a') { b.attacksPlayedThisTurn++; b.attacksPlayedTotal++; }
    this.emit({ t: 'play', card: c, target });

    const times = (b.doubleTapNext && c.t === 'a') ? 2 : (b.powers.echoForm && b.cardsPlayedThisTurn === 1 ? 2 : 1);
    if (b.doubleTapNext && c.t === 'a') b.doubleTapNext = 0;

    for (let rep = 0; rep < times; rep++) {
      this.resolveCard(c, target, xVal);
      if (b.enemies.every(e => e.hp <= 0)) break;
    }

    // 棄牌/消耗
    if (f.exhaust || f.ethereal_used) { b.exhaustPile.push(c); this.onExhaust(c); }
    else b.discard.push(c);
    b.lastCardType = c.t;

    // 攻擊牌計數遺物
    if (c.t === 'a') {
      b.nunchakuCount++;
      if (this.relics.includes('nunchaku') && b.nunchakuCount % 10 === 0) b.energy += 1;
      b.kunaiCount++;
      if (b.kunaiCount === 3) {
        if (this.relics.includes('kunai')) b.dex += 1;
        if (this.relics.includes('shuriken')) b.str += 1;
        if (this.relics.includes('ornamental_fan')) b.block += 4;
      }
    }
    if (b.powers.thousandCuts) this.dmgAllEnemies(b.powers.thousandCuts, '🔪');
    if (b.powers.afterImage) b.block += 1;
  }

  onExhaust(c) {
    const b = this.battle;
    if (b.powers.feelNoPain) b.block += b.powers.feelNoPain;
    if (b.powers.darkEmbrace) this.drawCards(1);
  }

  resolveCard(c, target, xVal) {
    const b = this.battle;
    const f = c.fx;
    const alive = () => b.enemies.filter(e => e.hp > 0);

    // 傷害
    if (f.dmg !== undefined || f.blockAsDmg || f.dmgPerStrike || f.dmgPerOrb || f.dmgPerEnemy || f.dmgPerMantra) {
      let base = f.dmg || 0;
      if (f.blockAsDmg) base = b.block;
      if (f.dmgPerStrike) base = f.dmg + this.deck.filter(x => x.n && x.n.includes('打擊')).length * f.dmgPerStrike;
      if (f.dmgPerOrb) base = f.dmgPerOrb * b.orbs.length;
      if (f.dmgPerEnemy) base = f.dmgPerEnemy + 0; // 均一傷害打全體之外的處理略
      if (f.dmgPerMantra) base = f.dmg + b.mantra * 2;
      if (f.rampage) { base = f.dmg + (c.rampageBonus || 0); c.rampageBonus = (c.rampageBonus || 0) + f.rampage; }
      if (f.finisher) base = f.finisher * b.attacksPlayedThisTurn;
      if (f.flechettes) base = f.flechettes * b.hand.filter(x => x.t === 's').length;
      if (f.windmillGrow) { base = f.dmg + (c.windmillBonus || 0); c.windmillBonus = (c.windmillBonus || 0) + f.windmillGrow; }
      if (f.clawGrow) { base = f.dmg + (b.clawBonus || 0); b.clawBonus = (b.clawBonus || 0) + f.clawGrow; }
      if (f.thunderStrike) base = f.thunderStrike;

      const hitTimes = f.xCost && f.dmg ? xVal : (f.hits || 1);
      for (let h = 0; h < hitTimes; h++) {
        const targets = f.aoe ? alive() : [f.randomTarget ? pick2(alive()) : (target && target.hp > 0 ? target : alive()[0])];
        for (const e of targets) {
          if (!e) continue;
          let extra = 0;
          if (f.dmgIfPoisonx2 && e.poison > 0) extra = base;
          this.attackEnemy(e, base + extra + (f.accuracyShiv && b.powers.accuracy ? b.powers.accuracy : 0), c);
          if (f.poison) e.poison += f.poison;
          if (f.vuln && f.vuln < 90) e.vuln += f.vuln + (this.relics.includes('champion_belt') ? 0 : 0);
          if (f.vuln && this.relics.includes('champion_belt')) e.weak += 1;
          if (f.weak) e.weak += f.weak;
          if (f.choke) e.choked = f.choke;
          if (f.lockOn) e.vuln += f.lockOn;
          if (f.mark) { e.mark = (e.mark || 0) + f.mark; this.dealDmgRaw(e, e.mark, '💢'); }
          if (f.wallop) b.block += Math.max(0, this.estimateDmg(c, e) / 2 | 0);
          if (f.feedMaxHP && e.hp <= 0) { this.maxHP += f.feedMaxHP; this.hp += f.feedMaxHP; }
          if (f.lessonLearned && e.hp <= 0) { const cd = pick2(this.deck.filter(x => !x.up)); if (cd) this.upgradeCard(cd); }
          if (f.refundIfKill && e.hp <= 0) b.energy += f.refundIfKill;
          if (f.ifVulnEnergy && e.vuln > 0) { b.energy += 1; this.drawCards(1); }
          if (f.ifWeakEnergy && e.weak > 0) { b.energy += 1; this.drawCards(1); }
        }
        if (b.enemies.every(e => e.hp <= 0)) break;
      }
    }

    // 只施毒不打傷害
    if (f.poison && f.dmg === undefined && target) target.poison += f.poison;
    if (f.poisonAll) for (const e of alive()) e.poison += f.poisonAll;
    if (f.poisonDouble && target) target.poison *= 2;

    // 格擋與資源
    if (f.block) {
      let bl = f.block + b.dex;
      if (f.blockPerHandCard) bl = f.blockPerHandCard * b.hand.length + b.dex;
      if (f.blockIfWrath && b.stance === 'wrath') bl += f.blockIfWrath;
      if (f.persevGrow) { bl += (c.persevBonus || 0); c.persevBonus = (c.persevBonus || 0) + f.persevGrow; }
      if (f.steamShrink) { bl += (c.steamBonus || 0); c.steamBonus = (c.steamBonus || 0) - 1; }
      if (f.xCost && !f.dmg) bl = (f.block + b.dex) * xVal;
      b.block += Math.max(0, bl);
    }
    if (f.doubleBlock) b.block *= 2;
    if (f.blockNext) b.blockNext += f.blockNext;
    if (f.autoShields && b.block === 0) b.block += f.autoShields;
    if (f.blockPerDiscard) b.block += Math.min(b.discard.length, 12);

    if (f.draw) this.drawCards(f.draw);
    if (f.drawTo) this.drawCards(Math.max(0, f.drawTo - b.hand.length));
    if (f.drawNext) b.drawNext += f.drawNext;
    if (f.drawIfFew && b.cardsPlayedThisTurn <= 3) this.drawCards(1);
    if (f.energy) b.energy += f.energy;
    if (f.energyNext) b.energyNext += f.energyNext;
    if (f.doubleEnergy) b.energy *= 2;
    if (f.loseHP) this.loseHP(f.loseHP);
    if (f.heal) this.hp = Math.min(this.maxHP, this.hp + f.heal);

    // 狀態
    if (f.str) { b.str += f.str; if (f.strDownEnd) b.strDownEnd += f.strDownEnd; }
    if (f.doubleStr) b.str *= 2;
    if (f.dex) b.dex += f.dex;
    if (f.thorns) b.thorns += f.thorns;
    if (f.thornsPerm) b.thorns += f.thornsPerm;
    if (f.metallicize) b.metallicize += f.metallicize;
    if (f.intangible) b.intangible += f.intangible;
    if (f.buffer) b.buffer += f.buffer;
    if (f.strDown && target) target.str -= f.strDown;
    if (f.strDownAll) for (const e of alive()) e.str -= Math.ceil(f.strDownAll / 2);
    if (f.weakAll) for (const e of alive()) e.weak += f.weakAll;
    if (f.vulnAll) for (const e of alive()) e.vuln += f.vulnAll;
    if (f.vuln && f.vuln >= 90 && target) target.vuln += f.vuln;

    // 球體
    if (f.channel) this.channelOrb(f.channel);
    if (f.channel2) this.channelOrb(f.channel2);
    if (f.channelXLightning) for (let i = 0; i < xVal; i++) this.channelOrb('lightning');
    if (f.evokeX) { this.evokeOrbTimes(f.evokeX); }
    if (f.evokeXTimes) this.evokeOrbTimes(xVal);
    if (f.focus) b.focus += f.focus;
    if (f.focusDown) b.focus -= f.focusDown;
    if (f.orbSlots) b.orbSlots += f.orbSlots;
    if (f.chillAll) for (let i = 0; i < alive().length; i++) this.channelOrb('frost');
    if (f.blizzard) this.dmgAllEnemies(f.blizzard * (b.frostChanneled || 2), '❄️');
    if (f.removeBlock && target) target.block = 0;

    // 姿態 / 真言
    if (f.stance) this.changeStance(f.stance);
    if (f.exitStance) this.changeStance('none');
    if (f.mantra) { b.mantra += f.mantra; this.checkMantra(); }
    if (f.calmIfAttacking && target && target.intent && target.intent.t === 'atk') this.changeStance('calm');
    if (f.vulnIfSkillLast && b.lastCardType === 's' && target) target.vuln += 1;
    if (f.weakIfAttackLast && b.lastCardType === 'a' && target) target.weak += 1;
    if (f.refundIfAttackLast && b.lastCardType === 'a') b.energy += 1;
    if (f.smite) b.hand.push(makeCard('smite_card'));
    if (f.shiv) for (let i = 0; i < f.shiv; i++) b.hand.push(makeCard('shiv'));
    if (f.nextAttackBonus) b.nextAttackBonus += f.nextAttackBonus;
    if (f.judgment && target && target.hp <= f.judgment) { target.hp = 0; this.onEnemyDeath(target); }
    if (f.extraTurn) b.extraTurnFlag = 1;

    // 棄牌
    if (f.discard || f.discardRandom) {
      const n = f.discard || f.discardRandom;
      for (let i = 0; i < n && b.hand.length; i++) {
        const worst = b.hand.slice().sort((a, b2) => a.c - b2.c)[b.hand.length - 1] || b.hand[0];
        b.hand.splice(b.hand.indexOf(worst), 1); b.discard.push(worst);
      }
    }
    if (f.gamble) { const n = b.hand.length; b.discard.push(...b.hand); b.hand = []; this.drawCards(n); }
    if (f.recycle && b.hand.length) { const c2 = b.hand.sort((a, b2) => b2.c - a.c)[0]; b.hand.splice(b.hand.indexOf(c2), 1); b.exhaustPile.push(c2); b.energy += Math.max(0, c2.c); }
    if (f.retrieve && b.discard.length) { const c2 = b.discard.pop(); c2.c = 0; b.hand.push(c2); }
    if (f.seek && b.draw.length) { const best = b.draw.slice().sort((a, b2) => b2.r - a.r)[0]; b.draw.splice(b.draw.indexOf(best), 1); b.hand.push(best); }

    // 能力牌旗標
    for (const key of ['demonForm','barricade','juggernaut','feelNoPain','darkEmbrace','evolve','combust','rupture','brutality','corruption',
                       'accuracy','noxiousFumes','envenom','thousandCuts','afterImage','infiniteBlades',
                       'electrodynamics','echoForm','loop','helloWorld','heatsinks','staticDischarge','storm','selfRepair','biasDecay',
                       'battleHymn','mentalFortress','rushdown','likeWater','nirvana','devotion','devaForm','foresight','simmeringFury']) {
      if (f[key]) b.powers[key] = (b.powers[key] || 0) + f[key];
    }
    if (f.upgradeRandom) { const cand = b.hand.filter(x => !x.up); if (cand.length) { const cc = pick2(cand); cc.fx.dmg && (cc.fx.dmg = Math.ceil(cc.fx.dmg * 1.35)); cc.fx.block && (cc.fx.block = Math.ceil(cc.fx.block * 1.35)); cc.up = true; cc.n += '+'; } }
    if (f.doubleTap) b.doubleTapNext = 1;
    if (f.glassKnife) { c.fx.dmg = Math.max(0, c.fx.dmg - 2); }
    if (f.costDown && c.c > 0) c.c -= 1;
    if (f.sandsCostDown && c.c > 0) c.c -= 1;
    if (f.ffCostDown) {} // 簡化
  }

  evokeOrbTimes(n) {
    const b = this.battle;
    if (!b.orbs.length) return;
    const orb = b.orbs[0];
    for (let i = 0; i < n; i++) {
      const f = b.focus;
      if (orb.type === 'lightning') this.dmgRandomEnemy(8 + f, '⚡');
      if (orb.type === 'frost') b.block += 5 + f;
      if (orb.type === 'dark') this.dmgRandomEnemy(12 + f * 2, '🌑');
      if (orb.type === 'plasma') b.energy += 2;
    }
    b.orbs.shift();
  }

  // ── 戰鬥主循環（一次一小步）──
  battleStep() {
    const b = this.battle;
    if (!b) return;
    if (b.enemies.every(e => e.hp <= 0)) return this.onVictoryBattle();
    if (this.hp <= 0) return this.onDefeat();

    if (b.phase === 'playerStart') { this.playerTurnStart(); return; }

    if (b.phase === 'playerPlay') {
      this.maybeUsePotion();
      const c = this.pickCardToPlay();
      if (c) {
        const target = c.tg === 'e' ? this.pickTarget(c) : null;
        this.playCard(c, target);
        if (b.extraTurnFlag) { b.extraTurnFlag = 0; b.discard.push(...b.hand); b.hand = []; b.phase = 'playerStart'; }
        return;
      }
      b.phase = 'playerEnd';
      return;
    }

    if (b.phase === 'playerEnd') {
      // 回合末
      if (b.strDownEnd) { b.str -= b.strDownEnd; b.strDownEnd = 0; }
      if (b.stance === 'divinity') b.stance = 'none';   // 神聖姿態回合結束退出（原作）
      if (b.powers.combust) { this.loseHP(1); this.dmgAllEnemies(b.powers.combust, '🔥'); }
      if (b.powers.likeWater && b.stance === 'calm') b.block += b.powers.likeWater;
      if (b.metallicize) b.block += b.metallicize;
      if (this.relics.includes('orichalcum') && b.block === 0) b.block += 6;
      this.orbPassives();
      // 乙太牌
      for (const c of b.hand) if (c.fx.ethereal) { c.fx.ethereal_used = 1; }
      const keep = [];
      for (const c of b.hand) {
        if (c.fx.ethereal) { b.exhaustPile.push(c); this.onExhaust(c); }
        else b.discard.push(c);
      }
      b.hand = keep;
      if (b.weak > 0) b.weak--;
      if (b.vuln > 0) b.vuln--;
      b.phase = 'enemyTurn'; b.enemyIdx = 0;
      return;
    }

    if (b.phase === 'enemyTurn') {
      // 逐隻敵人行動
      while (b.enemyIdx < b.enemies.length) {
        const e = b.enemies[b.enemyIdx];
        b.enemyIdx++;
        if (e.hp <= 0) continue;
        // 中毒結算
        if (e.poison > 0) {
          e.hp -= e.poison;
          this.emit({ t: 'dmg', target: e, amt: e.poison, tag: '☠️' });
          e.poison--;
          if (e.hp <= 0) { this.onEnemyDeath(e); continue; }
        }
        if (e.choked) { e.hp -= e.choked; this.emit({ t: 'dmg', target: e, amt: e.choked, tag: '🫁' }); if (e.hp <= 0) { this.onEnemyDeath(e); continue; } }
        this.enemyAct(e);
        return; // 一次一隻，讓動畫呈現
      }
      // 全部行動完
      for (const e of b.enemies) {
        if (e.hp <= 0) continue;
        if (e.weak > 0) e.weak--;
        if (e.vuln > 0) e.vuln--;
        e.step++;
        if (MONSTERS[e.id] && MONSTERS[e.id].intangibleCycle) e.intangibleNow = e.step % 2 === 1;
        this.setIntent(e);
      }
      if (b.powers.heatsinks) this.drawCards(0);
      b.phase = 'playerStart';
      return;
    }
  }

  enemyAct(e) {
    const b = this.battle;
    const it = e.intent;
    if (!it) return;
    this.emit({ t: 'enemyAct', enemy: e, intent: it });
    if (it.t === 'atk') {
      const hits = it.hits || 1;
      for (let h = 0; h < hits; h++) {
        let dmg = it.dmg + e.str;
        if (e.weak > 0) dmg = Math.floor(dmg * 0.75);
        if (b.vuln > 0) dmg = Math.floor(dmg * 1.5);
        if (b.stance === 'wrath') dmg *= 2;
        if (b.intangible > 0) dmg = 1;
        if (this.relics.includes('torii') && dmg <= 5 && dmg > 1) dmg = 1;
        dmg = Math.max(0, dmg);
        const blocked = Math.min(b.block, dmg);
        b.block -= blocked;
        const hpLoss = dmg - blocked;
        if (hpLoss > 0) this.loseHP(hpLoss);
        else this.emit({ t: 'blocked', amt: blocked });
        // 反傷
        if (b.thorns > 0 && e.hp > 0) this.dealDmgRaw(e, b.thorns, '🌵');
        if (this.relics.includes('bronze_scales') && e.hp > 0) this.dealDmgRaw(e, 3, '🐉');
        if (e.talkHand) b.block += e.talkHand;   // 格擋之手：被標記的敵人攻擊時給格擋
        if (this.hp <= 0) return;
      }
    }
    if (it.block) e.block += it.block;
    if (it.str) e.str += it.str;
    if (it.weak) { b.weak += it.weak; }
    if (it.frail) { b.weak += it.frail; }
    if (it.vuln) b.vuln += it.vuln;
    if (it.strDown) b.str -= it.strDown;
    if (it.dexDown) b.dex -= it.dexDown;
  }

  onVictoryBattle() {
    const b = this.battle;
    if (b.intangible > 0) b.intangible--;
    // 戰後遺物
    if (this.relics.includes('burning_blood')) this.hp = Math.min(this.maxHP, this.hp + 6);
    if (this.relics.includes('meat_on_bone') && this.hp < this.maxHP / 2) this.hp = Math.min(this.maxHP, this.hp + 12);
    if (b.powers.selfRepair) this.hp = Math.min(this.maxHP, this.hp + b.powers.selfRepair);
    const node = this.map[this.floor];
    node.done = true;
    this.gold += node.type === 'B' ? 100 : node.type === 'E' ? ri2(25, 35) : ri2(10, 20);
    this.addLog(`✅ 戰鬥勝利！`);
    this.emit({ t: 'battleWin', nodeType: node.type });
    if (node.type === 'B') {
      if (this.act < 3) {
        // 進入下一幕：回血 + Boss 遺物
        const heal = Math.floor((this.maxHP - this.hp) * 0.75);
        this.hp = Math.min(this.maxHP, this.hp + heal);
        const avail = RELIC_POOL.filter(r => !this.relics.includes(r));
        if (avail.length) {
          const br = pick2(avail);
          this.relics.push(br);
          this.addLog(`🏺 Boss 遺物「${RELICS[br].n}」`);
          this.emit({ t: 'relicReward', relic: br });
        }
        this.act++;
        this.maxHP += 8;   // 過幕強化：最大生命 +8
        this.hp += 8;
        this.floor = 0;
        this.map = this.genMap();
        this.state = 'map';
        this.addLog(`🌆 進入 Act ${this.act}！回復 ${heal} HP，最大生命 +8`);
        this.emit({ t: 'actClear', act: this.act });
        return;
      }
      this.runsWon++;
      this.recordResult(true);
      this.state = 'victory';
      this.addLog(`🏆 ${this.ch.name} 通關全部三幕！`);
      this.stateTimer = 0;
      return;
    }
    this.state = 'reward';
    this.rewardData = this.genReward(node.type);
  }

  genReward(nodeType) {
    // 三選一卡牌
    const pool = Object.keys(CARDS).filter(k => CARDS[k].ch === this.chKey && !CARDS[k].derived);
    const roll = () => {
      const r = Math.random();
      const rarity = nodeType === 'E' ? (r < 0.5 ? 2 : r < 0.85 ? 1 : 3) : (r < 0.6 ? 1 : r < 0.95 ? 2 : 3);
      const cands = pool.filter(k => CARDS[k].r === rarity);
      return pick2(cands.length ? cands : pool);
    };
    const cards = [roll(), roll(), roll()];
    let relic = null;
    if (nodeType === 'E') {
      const avail = RELIC_POOL.filter(r => !this.relics.includes(r));
      if (avail.length) relic = pick2(avail);
    }
    let potion = Math.random() < 0.4 ? pick2(Object.keys(POTIONS)) : null;
    return { cards, relic, potion };
  }

  claimReward() {
    const rd = this.rewardData;
    // AI 選卡：稀有度優先 + 攻防平衡
    const atkCount = this.deck.filter(c => c.t === 'a').length;
    const scoreCard = (k) => {
      const d = CARDS[k];
      let s = d.r * 10 + Math.random() * 8;
      if (d.t === 'p') s += 6;
      if (d.t === 'a' && atkCount > this.deck.length * 0.6) s -= 8;
      // 觀者偏好真言/防禦流（AI 打憤怒流容易自爆）
      if (this.chKey === 'watcher' && ['pray','worship','devotion','prostrate','mental_fortress','like_water','protect','talk_to_the_hand','wallop'].includes(k)) s += 14;
      // 機器人偏好集中/球體強化
      if (this.chKey === 'defect' && ['defragment','capacitor','biased_cognition','glacier','electrodynamics','loop'].includes(k)) s += 12;
      return s;
    };
    const bestCard = rd.cards.sort((a, b) => scoreCard(b) - scoreCard(a))[0];
    const newCard = makeCard(bestCard);
    // 後期幕的獎勵卡有機率直接升級（Act2 50%、Act3 必定）
    if (this.act === 2 && Math.random() < 0.5) this.upgradeCard(newCard);
    if (this.act === 3) this.upgradeCard(newCard);
    this.deck.push(newCard);
    this.addLog(`🃏 獲得「${newCard.n}」`);
    this.emit({ t: 'cardReward', card: CARDS[bestCard].n, choices: rd.cards });
    if (rd.relic) {
      this.relics.push(rd.relic);
      this.addLog(`🏺 獲得遺物「${RELICS[rd.relic].n}」`);
      this.emit({ t: 'relicReward', relic: rd.relic });
    }
    if (rd.potion) {
      const slot = this.potions.indexOf(null);
      if (slot >= 0) { this.potions[slot] = rd.potion; this.addLog(`🧪 獲得「${POTIONS[rd.potion].n}」`); }
    }
    this.floor++;
    this.state = 'map';
  }

  onDefeat() {
    if (this.state === 'defeat') return;
    this.runsLost++;
    this.recordResult(false);
    this.state = 'defeat';
    this.stateTimer = 0;
    this.addLog(`💀 ${this.ch.name} 倒在了第 ${this.floor + 1} 層…`);
    this.emit({ t: 'defeat' });
  }
}
