'use strict';
/* ============================================================
   擲骰模擬人生 · Dice of Life
   用 d6 / d10 / d12 / d20 決定人生各階段的事件與檢定，
   選擇累積屬性，最後給一份人生總結。（原創內容）
   ============================================================ */

// ── 骰子 ──
function rollDie(sides, rng) { return Math.floor((rng ? rng() : Math.random()) * sides) + 1; }
function mod(v) { return Math.floor((v - 10) / 2); }           // D&D 式屬性修正
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const STAT_META = {
  health: { zh: '健康', emo: '❤️' }, int: { zh: '智力', emo: '🧠' },
  str: { zh: '體魄', emo: '💪' }, cha: { zh: '魅力', emo: '✨' },
  wealth: { zh: '財富', emo: '💰' }, happy: { zh: '幸福', emo: '😊' },
};

function newLife(rng) {
  const a = () => rollDie(6, rng) + rollDie(6, rng) + 3;       // 2d6+3 → 5–15
  const S = {
    age: 0, alive: true, stage: 0, career: null, log: [], facts: {},
    health: rollDie(6, rng) + rollDie(6, rng) + 6,             // 8–18
    int: a(), str: a(), cha: a(), happy: 10, wealth: 0,
  };
  const fam = rollDie(10, rng);                                // d10 家庭背景
  let ft;
  if (fam <= 3) { ft = '清寒家庭'; S.wealth = 5; S.happy += 1; }
  else if (fam <= 7) { ft = '小康家庭'; S.wealth = 25; }
  else if (fam <= 9) { ft = '富裕家庭'; S.wealth = 80; S.cha += 1; }
  else { ft = '豪門世家'; S.wealth = 200; S.cha += 2; S.int += 1; }
  S.birthFam = ft; S.birthRoll = fam;
  S.log.push({ stage: '誕生', dice: [{ s: 10, v: fam }], t: `你出生在一個${ft}。` });
  return S;
}

// ── 階段資料 ──（events 以 d10 抽；choice 檢定用 d20；晚年用 d12）
const STAGES = [
  {
    key: '童年', age: '6–12 歲',
    events: [
      { t: '你是班上的模範生，老師特別喜歡你。', e: { int: 2, happy: 1 } },
      { t: '整天在外面玩耍、體格特別好。', e: { str: 2, health: 1 } },
      { t: '你很受同學歡迎，人緣極佳。', e: { cha: 2 } },
      { t: '一場重感冒讓你在家躺了整個月。', e: { health: -2 } },
      { t: '爸媽吵架，你悶悶不樂。', e: { happy: -2 } },
      { t: '你迷上了畫畫與故事書。', e: { int: 1, cha: 1 } },
      { t: '在公園摔斷了手，打了石膏。', e: { health: -1, str: -1 } },
      { t: '家裡養了一隻狗，童年很快樂。', e: { happy: 2 } },
      { t: '你參加了才藝班，樣樣都學一點。', e: { int: 1, str: 1, cha: 1 } },
      { t: '平凡但溫暖的童年。', e: { happy: 1 } },
    ],
    choices: [
      {
        q: '放學後你最常做什麼？',
        opts: [
          { label: '📚 泡在圖書館', t: '你養成了閱讀習慣。', e: { int: 2 } },
          { label: '⚽ 在操場運動', t: '你成了孩子王。', e: { str: 2, cha: 1 } },
          { label: '🎮 打電動', t: '反應變快，但爸媽念了幾句。', e: { int: 1, happy: 1, health: -1 } },
        ],
      },
      {
        q: '班上有人被欺負，你會？',
        opts: [
          { label: '🛡️ 挺身而出（體魄檢定）', check: { die: 20, stat: 'str', dc: 11 },
            ok: { t: '你趕跑了惡霸，成了大家的英雄。', e: { str: 1, cha: 2, happy: 1 } },
            fail: { t: '你被推倒擦傷，但沒有退縮。', e: { str: 1, cha: 1, health: -1 } } },
          { label: '🙋 告訴老師', t: '事情圓滿解決，你學會求助。', e: { int: 1, happy: 1 } },
          { label: '😶 假裝沒看見', t: '你變得比較怕事。', e: { happy: -1, int: 1 } },
        ],
      },
      {
        q: '爸媽讓你選一項才藝班：',
        opts: [
          { label: '🎹 學音樂', t: '你培養了藝術氣質。', e: { cha: 2, int: 1 } },
          { label: '🥋 學武術', t: '你身強體健、紀律十足。', e: { str: 2, health: 1 } },
          { label: '🧮 學程式與心算', t: '你的頭腦越來越靈光。', e: { int: 3 } },
        ],
      },
      {
        q: '過年拿到一筆壓歲錢，你？',
        opts: [
          { label: '🐷 存進小豬撲滿', t: '你從小就懂儲蓄。', e: { wealth: 10 } },
          { label: '🍬 買零食和玩具', t: '你開心得不得了。', e: { happy: 3, health: -1 } },
          { label: '📗 買書和文具', t: '你把錢花在自我成長上。', e: { int: 2 } },
        ],
      },
      {
        q: '學校運動會到了，你？',
        opts: [
          { label: '🏃 報名賽跑（體魄檢定）', check: { die: 20, stat: 'str', dc: 10 },
            ok: { t: '你一馬當先奪冠，全班歡呼！', e: { str: 2, cha: 1, happy: 1 } },
            fail: { t: '你跌了一跤，卻笑著跑完。', e: { str: 1, happy: 1 } } },
          { label: '📣 當啦啦隊加油', t: '你炒熱了全場氣氛。', e: { cha: 2, happy: 1 } },
          { label: '🎨 幫忙做海報布置', t: '你發揮了巧思與細心。', e: { int: 1, cha: 1 } },
        ],
      },
    ],
  },
  {
    key: '青少年', age: '13–18 歲',
    events: [
      { t: '你在校隊表現亮眼，拿了獎牌。', e: { str: 2, cha: 1 } },
      { t: '第一次戀愛，甜蜜又酸澀。', e: { cha: 2, happy: 1 } },
      { t: '沉迷手機，成績下滑。', e: { int: -1, happy: 1 } },
      { t: '你在科展得名，被師長看好。', e: { int: 3 } },
      { t: '青春期叛逆，和家人衝突不斷。', e: { happy: -2, cha: 1 } },
      { t: '打工存下第一桶金。', e: { wealth: 10, str: -1 } },
      { t: '熬夜讀書，身體有點吃不消。', e: { int: 2, health: -1 } },
      { t: '交到一群死黨，青春無敵。', e: { happy: 2, cha: 1 } },
      { t: '一次意外車禍，還好只是皮肉傷。', e: { health: -2 } },
      { t: '參加樂團，成了校園風雲人物。', e: { cha: 2, happy: 1 } },
    ],
    choices: [
      {
        q: '大考將近，你如何面對？',
        opts: [
          { label: '🌙 拚命苦讀（智力檢定）', check: { die: 20, stat: 'int', dc: 12 },
            ok: { t: '你金榜題名，考上頂尖學校！', e: { int: 3, happy: 2 } },
            fail: { t: '你讀到心力交瘁，成績卻不如預期。', e: { int: 1, health: -2, happy: -1 } } },
          { label: '⚖️ 均衡發展', t: '你維持了身心平衡。', e: { int: 1, str: 1, happy: 1 } },
          { label: '🎉 及時行樂', t: '你玩得很開心，前途未卜。', e: { happy: 3, int: -1 } },
        ],
      },
      {
        q: '你對某人怦然心動，決定？',
        opts: [
          { label: '💌 鼓起勇氣告白（魅力檢定）', check: { die: 20, stat: 'cha', dc: 12 },
            ok: { t: '兩情相悅，譜出甜蜜的校園戀曲。', e: { cha: 2, happy: 3 } },
            fail: { t: '你被婉拒了，卻也學會面對失落。', e: { cha: 1, int: 1, happy: -1 } } },
          { label: '📖 專心課業不分心', t: '你把悸動化為讀書的動力。', e: { int: 2, happy: -1 } },
          { label: '👫 當個好朋友就好', t: '你和大家打成一片。', e: { cha: 1, happy: 2 } },
        ],
      },
      {
        q: '打工存下一筆錢，你要？',
        opts: [
          { label: '🏦 存起來', t: '小小年紀就懂理財。', e: { wealth: 15 } },
          { label: '🎸 買夢寐以求的裝備', t: '你玩得不亦樂乎。', e: { happy: 3, cha: 1 } },
          { label: '📚 報名補習衝刺', t: '你把錢投資在自己腦袋裡。', e: { int: 2 } },
        ],
      },
      {
        q: '同儕慫恿你做件叛逆的事，你？',
        opts: [
          { label: '😎 跟著一起冒險', t: '你嚐到了刺激，也惹了點麻煩。', e: { cha: 2, happy: 1, health: -1 } },
          { label: '🙅 堅持自己的原則', t: '你守住了底線，更成熟了。', e: { int: 1, str: 1 } },
          { label: '🤔 折衷小小叛逆一下', t: '你拿捏了分寸。', e: { cha: 1, happy: 1 } },
        ],
      },
      {
        q: '漫長的暑假，你決定？',
        opts: [
          { label: '🏕️ 參加營隊拓展視野', t: '你認識了各路好手。', e: { int: 1, cha: 1, happy: 1 } },
          { label: '💪 報名健身與運動', t: '你練出了好體格。', e: { str: 2, health: 1 } },
          { label: '💤 在家耍廢追劇', t: '你徹底放鬆，卻荒廢了時間。', e: { happy: 2, int: -1 } },
        ],
      },
    ],
  },
  {
    key: '成年初期', age: '19–25 歲',
    events: [
      { t: '大學生活多采多姿，交遊廣闊。', e: { cha: 2, happy: 1 } },
      { t: '你創業失敗，欠了一屁股債。', e: { wealth: -30, int: 1 } },
      { t: '一趟壯遊改變了你的世界觀。', e: { int: 1, cha: 1, happy: 2, wealth: -10 } },
      { t: '你在實驗室沒日沒夜地研究。', e: { int: 3, health: -1 } },
      { t: '談了一場刻骨銘心的戀愛。', e: { cha: 1, happy: 2 } },
      { t: '兼職接案，小有積蓄。', e: { wealth: 20 } },
      { t: '一場大病讓你差點休學。', e: { health: -3 } },
      { t: '你在社團當上領袖，磨練了口才。', e: { cha: 2, int: 1 } },
      { t: '沉迷投機，賠掉了打工錢。', e: { wealth: -15 } },
      { t: '平順地畢業，準備踏入社會。', e: { happy: 1 } },
    ],
    choices: [
      {
        q: '大學四年你打算怎麼過？',
        opts: [
          { label: '🎓 衝績點與證照', t: '你的專業能力扎實。', e: { int: 2 } },
          { label: '🌍 熱衷社團與交流', t: '你建立了廣闊人脈。', e: { cha: 2, happy: 1 } },
          { label: '💼 提早接案賺錢', t: '你比同齡人更早財務獨立。', e: { wealth: 20, happy: -1 } },
        ],
      },
      {
        q: '踏入社會，你選擇的職業是？', pin: true,
        opts: [
          { label: '🏢 進大公司上班', career: '上班族', t: '你成為朝九晚五的上班族，穩定踏實。', e: { wealth: 30, happy: -1 } },
          { label: '💻 當工程師', career: '工程師', t: '你日夜與程式碼為伍，薪優但常爆肝。', e: { wealth: 40, int: 2, happy: -1 } },
          { label: '🩺 投身醫療（智力檢定）', career: '醫療人員', check: { die: 20, stat: 'int', dc: 13 },
            ok: { t: '你穿上白袍救死扶傷，備受敬重。', e: { wealth: 40, int: 2, cha: 1, happy: 1 } },
            fail: { t: '你熬過血汗實習，身心俱疲。', e: { wealth: 25, int: 1, health: -2 } } },
          { label: '🏗️ 現場工程／工地', career: '工地人員', t: '你在工地揮汗如雨，練就一身筋骨。', e: { wealth: 30, str: 2, health: -1 } },
          { label: '🧑‍🏫 當老師', career: '教師', t: '你站上講台，作育英才、桃李滿門。', e: { wealth: 18, int: 2, cha: 2, happy: 1 } },
          { label: '🎨 當設計師', career: '設計師', t: '你靠創意與美感吃飯，作品受人喜愛。', e: { wealth: 22, cha: 2, int: 1 } },
          { label: '⚖️ 執業律師（智力檢定）', career: '律師', check: { die: 20, stat: 'int', dc: 14 },
            ok: { t: '你成為金牌律師，收費不菲。', e: { wealth: 90, cha: 2, int: 1 } },
            fail: { t: '你在案海中浮沉，勉強立足。', e: { wealth: 20, int: 1 } } },
          { label: '👮 考公職／軍警', career: '公職人員', t: '你捧上鐵飯碗，生活安穩無虞。', e: { wealth: 25, str: 1, happy: 1 } },
          { label: '🚀 自己創業（幸運檢定）', career: '創業家', check: { die: 20, stat: 'cha', dc: 13 },
            ok: { t: '你的新創一炮而紅，估值飛漲！', e: { wealth: 120, cha: 2, happy: 2 } },
            fail: { t: '創業維艱，燒光了積蓄。', e: { wealth: -40, int: 2, happy: -1 } } },
          { label: '🎭 追逐藝術夢', career: '藝術家', t: '你走上創作之路，清貧但自由。', e: { wealth: -10, cha: 2, happy: 3 } },
          { label: '🔬 讀研究所做學問', career: '學者', t: '你踏入學術殿堂，鑽研學問。', e: { int: 3, wealth: -10 } },
        ],
      },
      {
        q: '感情這條路，你怎麼走？',
        opts: [
          { label: '💑 認定一人穩定交往', t: '你有了溫暖的依靠。', e: { happy: 3, cha: 1 }, set: { partner: true } },
          { label: '🦋 享受單身、廣結善緣', t: '你的生活多采多姿。', e: { cha: 2, happy: 1 }, set: { single: true } },
          { label: '🧑‍💻 專注打拚暫不談情', t: '你把重心全放在事業。', e: { wealth: 15, happy: -1 }, set: { single: true } },
        ],
      },
      {
        q: '出社會前的最後一個機會，你？',
        opts: [
          { label: '✈️ 出國壯遊一年', t: '你看見了更大的世界。', e: { int: 1, cha: 2, happy: 2, wealth: -15 } },
          { label: '💼 提早卡位實習', t: '你比別人早一步站穩腳步。', e: { wealth: 15, int: 1 } },
          { label: '🎓 考張高含金證照（智力檢定）', check: { die: 20, stat: 'int', dc: 12 },
            ok: { t: '你一次就考取，身價水漲船高。', e: { int: 3, wealth: 10 } },
            fail: { t: '你落榜了，但過程也學到不少。', e: { int: 1 } } },
        ],
      },
      {
        q: '面對經濟壓力，你？',
        opts: [
          { label: '💳 兼多份工拚命賺', t: '你收入變多，卻累壞了。', e: { wealth: 20, health: -1, happy: -1 } },
          { label: '🧾 精打細算節流', t: '你把每一分錢都用在刀口上。', e: { wealth: 15, int: 1 } },
          { label: '📉 先享受再說', t: '你活在當下，帳單留給未來。', e: { happy: 2, wealth: -10 } },
        ],
      },
    ],
  },
  {
    key: '壯年', age: '26–40 歲',
    events: [
      { t: '你在職場步步高升，成為主管。', e: { wealth: 60, cha: 1 } },
      { t: '你結婚成家，有了牽掛也有了依靠。', e: { happy: 3, wealth: -20 }, set: { partner: true } },
      { t: '投資房產大賺一筆。', e: { wealth: 80 } },
      { t: '過勞倒下，住院了一陣子。', e: { health: -3, wealth: -10 } },
      { t: '你迎來了孩子的誕生。', e: { happy: 3, wealth: -20, health: -1 }, if: S => S.facts.partner, set: { family: true } },
      { t: '被公司裁員，一度陷入低潮。', e: { wealth: -30, happy: -2 } },
      { t: '你出版著作/作品，小有名氣。', e: { cha: 2, int: 1, wealth: 20 } },
      { t: '和老友合夥的事業蒸蒸日上。', e: { wealth: 50, cha: 1 } },
      { t: '一場金融風暴，資產縮水。', e: { wealth: -40 } },
      { t: '你開始固定運動，體態變好。', e: { str: 2, health: 2 } },
    ],
    choices: [
      {
        q: S => S.facts.partner ? '有了另一半，你如何取捨？' : '步入壯年，你如何安排人生？',
        opts: [
          { label: '💼 全力衝刺事業', t: '你賺得盆滿缽滿，卻少了陪伴。', e: { wealth: 80, happy: -2, health: -1 } },
          // 有另一半才有的選項
          { label: '👨‍👩‍👧 生兒育女、以家庭為重', if: S => S.facts.partner, t: '你陪著孩子長大，內心無比富足。', e: { happy: 4, wealth: -20 }, set: { family: true } },
          { label: '⚖️ 事業與家庭盡量兼顧', if: S => S.facts.partner, t: '你蠟燭兩頭燒，但都沒放掉。', e: { wealth: 30, happy: 1, health: -1 }, set: { family: true } },
          // 單身才有的選項
          { label: '💍 決定成家、步入婚姻', if: S => !S.facts.partner, t: '你遇見了對的人，攜手組建家庭。', e: { happy: 3, wealth: -20, cha: 1 }, set: { partner: true, family: true } },
          { label: '🐾 一個人也很精采', if: S => !S.facts.partner, t: '你養了寵物、享受自由，樂在其中。', e: { happy: 3, cha: 1 } },
        ],
      },
      {
        q: '手上多了一筆閒錢，你要？',
        opts: [
          { label: '🏠 買房置產', t: '你有了自己的窩。', e: { wealth: 30, happy: 1 } },
          { label: '📈 重押股市（智力檢定）', check: { die: 20, stat: 'int', dc: 14 },
            ok: { t: '你眼光獨到，資產翻倍！', e: { wealth: 150 } },
            fail: { t: '一夕慘賠，元氣大傷。', e: { wealth: -80, happy: -2 } } },
          { label: '✈️ 帶家人出國圓夢', t: '換來一段珍貴的回憶。', e: { happy: 4, wealth: -30 } },
        ],
      },
      {
        q: '身體開始拉警報，你？',
        opts: [
          { label: '🏃 規律健身養生', t: '你重新找回好體格。', e: { health: 3, str: 2 } },
          { label: '🍜 先拚事業再說', t: '你透支了健康換業績。', e: { wealth: 30, health: -2 } },
          { label: '🎨 培養紓壓的興趣', t: '你找到了生活的出口。', e: { happy: 3, health: 1 } },
        ],
      },
      {
        q: '獵頭挖角你跳槽，你？',
        opts: [
          { label: '🚪 果斷跳槽拚高薪（魅力檢定）', check: { die: 20, stat: 'cha', dc: 13 },
            ok: { t: '你談成漂亮的條件，薪資翻倍。', e: { wealth: 70, cha: 1 } },
            fail: { t: '新環境水土不服，你有點後悔。', e: { wealth: -10, happy: -1 } } },
          { label: '🪑 留在原地求穩定', t: '你選擇了安穩的道路。', e: { wealth: 20, happy: 1 } },
          { label: '🧭 乾脆自立門戶', t: '你開始接案，當自己的老闆。', e: { wealth: 30, happy: 1, health: -1 } },
        ],
      },
      {
        q: '朋友揪你一起投資，你？',
        opts: [
          { label: '🤝 大筆投入（智力檢定）', check: { die: 20, stat: 'int', dc: 14 },
            ok: { t: '你看準趨勢，大賺一筆。', e: { wealth: 90 } },
            fail: { t: '這筆投資血本無歸。', e: { wealth: -60, happy: -1 } } },
          { label: '💵 小額試水溫', t: '你穩健地小賺了些。', e: { wealth: 15 } },
          { label: '🙅 婉拒不碰', t: '你守住了荷包。', e: { happy: 1 } },
        ],
      },
    ],
  },
  {
    key: '中年', age: '41–60 歲',
    events: [
      { t: '你事業有成，是眾人眼中的成功人士。', e: { wealth: 70, cha: 1 } },
      { t: '中年危機，你開始懷疑人生。', e: { happy: -3, int: 1 } },
      { t: '健康檢查亮紅燈，你開始養生。', e: { health: -2 } },
      { t: '孩子長大成人，讓你倍感欣慰。', e: { happy: 3 }, if: S => S.facts.family },
      { t: '你成為業界前輩，桃李滿天下。', e: { cha: 2, int: 1 } },
      { t: '一場官司纏身，勞財傷神。', e: { wealth: -50, happy: -2 } },
      { t: '你開始環遊世界，享受人生。', e: { happy: 3, wealth: -40 } },
      { t: '投資穩健，被動收入可觀。', e: { wealth: 60 } },
      { t: '摯友離世，你感慨萬千。', e: { happy: -3, int: 1 } },
      { t: '你回饋社會，做起了公益。', e: { happy: 2, cha: 2, wealth: -20 } },
    ],
    choices: [
      {
        q: '半百之年，你最在意的是？',
        opts: [
          { label: '🏥 顧好身體（體魄檢定）', check: { die: 20, stat: 'str', dc: 11 },
            ok: { t: '你老當益壯，健步如飛。', e: { health: 4, str: 1 } },
            fail: { t: '你力不從心，毛病漸多。', e: { health: 1 } } },
          { label: '💎 累積財富', t: '你的資產再上一層樓。', e: { wealth: 90, happy: -1 } },
          { label: '🌿 追求心靈平靜', t: '你放下執念，怡然自得。', e: { happy: 4, health: 1 } },
        ],
      },
      {
        q: '職涯進入高原期，你？',
        opts: [
          { label: '👑 爭取更高的位子（魅力檢定）', check: { die: 20, stat: 'cha', dc: 13 },
            ok: { t: '你登上高位，一言九鼎。', e: { wealth: 80, cha: 2 } },
            fail: { t: '一場鬥爭落敗，你心灰意冷。', e: { wealth: 10, happy: -2 } } },
          { label: '🧑‍🏫 轉為提攜後進', t: '你桃李滿門，備受敬重。', e: { cha: 2, int: 1, happy: 1 } },
          { label: '🌱 開創第二人生', t: '你勇敢轉換跑道。', e: { happy: 3, int: 1, wealth: -20 } },
        ],
      },
      {
        q: '面對年邁的父母，你？',
        opts: [
          { label: '🏡 親力親為照顧', t: '你盡了孝道，卻也心力交瘁。', e: { happy: 2, wealth: -20, health: -1 } },
          { label: '🧑‍⚕️ 請看護並常探望', t: '你在孝順與現實間取得平衡。', e: { wealth: -30, happy: 1 } },
          { label: '🙏 珍惜相處的時光', t: '你把握了每一次團聚。', e: { happy: 2 } },
        ],
      },
      {
        q: '後輩來向你請教人生，你？',
        opts: [
          { label: '🧑‍🏫 傾囊相授經驗', t: '你成了眾人敬重的前輩。', e: { cha: 2, int: 1, happy: 1 } },
          { label: '💰 直接贊助他們一把', t: '你的慷慨改變了他們。', e: { wealth: -30, happy: 2 } },
          { label: '🕊️ 讓他們自己去闖', t: '你相信歷練最珍貴。', e: { happy: 1, int: 1 } },
        ],
      },
      {
        q: '你開始思考退休，你？',
        opts: [
          { label: '🏦 積極理財規劃', t: '你為晚年鋪好了金流。', e: { wealth: 50, int: 1 } },
          { label: '🏋️ 趁早投資健康', t: '你要健康地活得長久。', e: { health: 3, str: 1 } },
          { label: '🌏 提早半退休去旅行', t: '你不想把人生留到最後才享受。', e: { happy: 3, wealth: -30 } },
        ],
      },
    ],
  },
  {
    key: '晚年', age: '61 歲起',
    d12: true,
    events: [
      { t: '兒孫滿堂，你成了慈祥的長輩。', e: { happy: 4 }, if: S => S.facts.family },
      { t: '你出了一本回憶錄，暢銷一時。', e: { cha: 2, wealth: 30, happy: 1 } },
      { t: '一場大病讓你元氣大傷。', e: { health: -4 } },
      { t: '你把畢生積蓄捐了出去。', e: { wealth: -60, happy: 3, cha: 2 } },
      { t: '每天下棋散步，晚年悠閒。', e: { happy: 2, health: 1 } },
      { t: '老伴的陪伴讓你安心。', e: { happy: 3 }, if: S => S.facts.partner },
      { t: '你仍活躍於社群，是網路上的傳奇。', e: { cha: 2, happy: 1 } },
      { t: '身體大不如前，行動不便。', e: { health: -3, str: -2 } },
      { t: '你把興趣玩成了小事業。', e: { wealth: 20, happy: 2 } },
      { t: '含飴弄孫，安享天倫。', e: { happy: 3 }, if: S => S.facts.family },
    ],
    choices: [
      {
        q: '走到人生的黃昏，你選擇：',
        opts: [
          { label: '🧘 頤養天年', t: '你安詳地享受每一天。', e: { happy: 3, health: 2 } },
          { label: '✈️ 完成遺願清單', t: '你了無遺憾地走遍想去的地方。', e: { happy: 4, wealth: -30, health: -1 } },
          { label: '📖 傳承畢生所學', t: '你的智慧啟發了無數後人。', e: { int: 2, cha: 3, happy: 2 } },
        ],
      },
      {
        q: '一生的積蓄，你打算？',
        opts: [
          { label: '👨‍👩‍👧‍👦 留給子孫', if: S => hasHeir(S), t: '你為後代留下了依靠。', e: { happy: 2 } },
          { label: '🏛️ 成立基金會傳世', if: S => !hasHeir(S), t: '膝下無子的你，用一生積蓄成立了基金會。', e: { wealth: -40, cha: 3, happy: 2 } },
          { label: '🐾 留給摯友與所愛之物', if: S => !hasHeir(S), t: '你把牽掛都託付給了摯友。', e: { happy: 2, cha: 1 } },
          { label: '❤️ 捐作公益', t: '你的善舉溫暖了無數人。', e: { wealth: -50, cha: 3, happy: 3 } },
          { label: '🎉 及時享受花光', t: '你把每一分錢都活成了回憶。', e: { happy: 4, wealth: -40, health: -1 } },
        ],
      },
      {
        q: '回望這一生，你？',
        opts: [
          { label: '📷 寫下回憶錄', t: '你的故事被後人傳頌。', e: { int: 1, cha: 2, happy: 2 } },
          { label: '🕊️ 放下、釋懷', t: '你與自己和解，心無罣礙。', e: { happy: 4, health: 1 } },
          { label: '🌟 追最後一個夢（幸運檢定）', check: { die: 20, stat: 'cha', dc: 12 },
            ok: { t: '你圓了畢生的夢，死而無憾。', e: { happy: 5, cha: 2 } },
            fail: { t: '雖力有未逮，但你已盡力無悔。', e: { happy: 2 } } },
        ],
      },
      {
        q: '面對身體的老化，你？',
        opts: [
          { label: '🧘 規律作息與復健', t: '你把身體照顧得宜。', e: { health: 3, happy: 1 } },
          { label: '💊 尋求先進醫療', if: S => S.wealth >= 40, t: '你砸重金換來硬朗的身子。', e: { health: 4, wealth: -40 } },
          { label: '🛌 順其自然', t: '你坦然接受歲月的痕跡。', e: { happy: 1, health: -1 } },
        ],
      },
      {
        q: '晚年的一天，你最想？',
        opts: [
          { label: '🎣 培養閒情雅趣', t: '你把日子過得詩意盎然。', e: { happy: 3 } },
          { label: '👨‍👩‍👧 含飴弄孫', if: S => hasHeir(S), t: '兒孫繞膝，是你最大的慰藉。', e: { happy: 4 } },
          { label: '🐕 與寵物相伴', if: S => !hasHeir(S), t: '毛小孩成了你最忠實的家人。', e: { happy: 3, health: 1 } },
          { label: '📚 持續學習新事物', t: '你活到老學到老。', e: { int: 2, happy: 1 } },
        ],
      },
    ],
  },
];

// ── 命運事件 ──（每階段以 d20 觸發：擲出 ≥18 時降臨一件人生大事，正負皆有）
const SPECIAL_EVENTS = [
  { t: '你買的彩券中了頭獎，一夜致富！', e: { wealth: 160, happy: 3 }, flag: 'jackpot', dead: false },
  { t: '遠房長輩留給你一筆可觀的遺產。', e: { wealth: 90 } },
  { t: '你的一個點子爆紅，名利雙收。', e: { wealth: 90, cha: 3, happy: 1 } },
  { t: '你遇見了生命中的貴人，就此改變。', e: { cha: 2, wealth: 30, int: 1, happy: 1 } },
  { t: '你頓悟了某個道理，境界大幅提升。', e: { int: 4, happy: 2 } },
  { t: '你挑戰極限運動，脫胎換骨。', e: { str: 4, health: 1, happy: 1 } },
  { t: '你救助了一隻流浪動物，心靈無比富足。', e: { happy: 4 } },
  { t: '你獲得了一座意義非凡的大獎。', e: { cha: 3, int: 1, happy: 2 } },
  { t: '一場刻骨銘心的旅行洗滌了你的靈魂。', e: { happy: 3, cha: 1, int: 1 } },
  { t: '你被捲入一場騙局，積蓄一夕蒸發。', e: { wealth: -90, int: 1, happy: -2 } },
  { t: '一場天災讓你損失慘重。', e: { wealth: -70, happy: -3 } },
  { t: '你染上重病，臥床許久。', e: { health: -6, wealth: -20, happy: -1 } },
  { t: '一場嚴重意外，讓你元氣大傷。', e: { health: -7, str: -2 } },
  { t: '你背了朋友的債，人財兩失。', e: { wealth: -60, happy: -3, cha: -1 } },
];

function applyEff(S, e) {
  if (!e) return;
  for (const k in e) {
    if (k === 'wealth') S.wealth = Math.max(0, S.wealth + e[k]);
    else if (k === 'health') S.health = clamp(S.health + e[k], 0, 20);
    else S[k] = clamp((S[k] || 0) + e[k], 0, 25);
  }
}

// ── 人生事實：讓前面的選擇影響後面的選項 ──
const F = S => (S.facts || (S.facts = {}));
const hasHeir = S => !!(F(S).partner || F(S).family || F(S).kids);   // 有另一半或子女
// 依當前狀態過濾可見選項（引擎與 UI 共用同一份，索引才會一致）
function optsFor(S, choice) { return choice.opts.filter(o => !o.if || o.if(S)); }
// 題目文字可為字串或函式（依狀態改寫）
function qText(S, choice) { return typeof choice.q === 'function' ? choice.q(S) : choice.q; }

// Fisher–Yates 洗牌（用傳入的 rng，可重現）
function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor((rng ? rng() : Math.random()) * (i + 1));
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}
// 為某階段隨機挑出這一局要出現的抉擇（pin 的必留），並打散抉擇與選項順序
function pickPlan(st, rng) {
  const k = st.pick || 3;
  const pinned = st.choices.filter(c => c.pin);
  const rest = shuffle(st.choices.filter(c => !c.pin).slice(), rng);
  const need = Math.max(0, k - pinned.length);
  const chosen = shuffle(pinned.concat(rest.slice(0, need)), rng);
  // 淺複製每個抉擇並打散其選項順序（不動到原始題庫）
  return chosen.map(c => ({ ...c, opts: shuffle(c.opts.slice(), rng) }));
}

// 進入階段：抽事件、套用、回傳事件＋選項；可能因事件死亡
function enterStage(S, rng) {
  const st = STAGES[S.stage];
  const die = st.d12 ? 12 : 10;
  const roll = rollDie(die, rng);                        // d10／d12 擲骰（呈現用）
  const pool = st.events.filter(e => !e.if || e.if(S));  // 依人生狀態過濾掉不合理的事件
  const ev = pool[rollDie(pool.length, rng) - 1];        // 從合理事件中抽一個
  applyEff(S, ev.e);
  if (ev.set) Object.assign(F(S), ev.set);
  const entry = { stage: st.key, age: st.age, dice: [{ s: die, v: roll }], t: ev.t, eff: ev.e };
  S.log.push(entry);
  S.choiceIdx = 0;
  S.plan = pickPlan(st, rng);   // 這一局本階段隨機抽到的抉擇組合
  // 命運事件：d20 ≥ 18（15% 機率）降臨一件人生大事
  const sroll = rollDie(20, rng);
  if (sroll >= 18 && S.health > 0) {
    const sp = SPECIAL_EVENTS[rollDie(SPECIAL_EVENTS.length, rng) - 1];
    applyEff(S, sp.e);
    if (sp.flag) { (S.flags || (S.flags = {}))[sp.flag] = true; }
    (S.specials || (S.specials = [])).push(sp.t);
    S.log.push({ stage: st.key, dice: [{ s: 20, v: sroll }], t: '✨【命運】' + sp.t, eff: sp.e, special: true });
  }
  if (S.health <= 0) { S.alive = false; S.cause = `在${st.key}時期遭逢劇變離世`; S.diedAt = S.stage; }
  return { st, ev: entry, choice: S.alive ? S.plan[0] : null };
}

// 做選擇：可能有 d20 檢定；套用效果、推進階段
function choose(S, optIdx, rng) {
  const st = STAGES[S.stage];
  const ci = S.choiceIdx || 0;
  const plan = S.plan || st.choices;
  const opt = optsFor(S, plan[ci])[optIdx];
  const out = { label: opt.label };
  if (opt.career) S.career = opt.career;
  if (opt.set) Object.assign(F(S), opt.set);
  if (opt.check) {
    const roll = rollDie(opt.check.die, rng);
    const m = mod(S[opt.check.stat] || 10);
    const total = roll + m;
    const success = total >= opt.check.dc;
    const branch = success ? opt.ok : opt.fail;
    applyEff(S, branch.e);
    out.check = { die: opt.check.die, roll, mod: m, total, dc: opt.check.dc, stat: opt.check.stat, success };
    out.t = branch.t; out.eff = branch.e;
    S.log.push({ stage: st.key, dice: [{ s: opt.check.die, v: roll }], t: `【${opt.label}】${branch.t}`, eff: branch.e, check: out.check });
  } else {
    applyEff(S, opt.e);
    out.t = opt.t; out.eff = opt.e;
    S.log.push({ stage: st.key, t: `【${opt.label}】${opt.t}`, eff: opt.e });
  }
  if (S.health <= 0) { S.alive = false; S.cause = `在${st.key}時期積勞成疾離世`; S.diedAt = S.stage; }
  // 推進到本階段的下一個抉擇；全部做完才進入下一階段
  S.choiceIdx = ci + 1;
  if (!S.alive || S.choiceIdx >= plan.length) {
    S.stage += 1; S.choiceIdx = 0; out.next = null;
  } else {
    out.next = plan[S.choiceIdx];
  }
  return out;
}

const isOver = S => !S.alive || S.stage >= STAGES.length;

// ── 結局總結 ──
function ending(S, rng) {
  const lifespan = S.alive ? (60 + rollDie(12, rng) + Math.floor(S.health * 1.2) + Math.floor(mod(S.health)))
    : null;
  const cause = S.alive ? `壽終正寢，享嵩壽 ${lifespan} 歲` : S.cause;
  const score = Math.round(S.health * 2 + S.int * 3 + S.str * 1.5 + S.cha * 2 + S.happy * 4 + S.wealth * 0.25);
  const title = pickTitle(S);
  const achievements = pickAchievements(S);
  const grade = score >= 340 ? 'S' : score >= 300 ? 'A' : score >= 260 ? 'B' : score >= 215 ? 'C' : 'D';
  return { lifespan, cause, score, grade, title, career: S.career, achievements };
}
function careerTitle(c) {
  return {
    '上班族': '🏢 敬業的上班族', '創業家': '🚀 白手起家的創業家',
    '藝術家': '🎭 純粹的藝術家', '學者': '🔬 埋首學問的學者',
    '工程師': '👨‍💻 資深工程師', '醫療人員': '🩺 仁心仁術的醫者',
    '工地人員': '🏗️ 硬漢現場工程人', '教師': '🧑‍🏫 桃李滿門的良師',
    '設計師': '🎨 創意設計師', '律師': '⚖️ 明察秋毫的律師',
    '公職人員': '👮 安穩的公職人員',
  }[c] || c;
}
// 稱號：由高到低優先，涵蓋極端、雙高組合、單項頂尖、慘澹與平衡
function pickTitle(S) {
  const { health, int, str, cha, happy, wealth, career } = S;
  const hi = v => v >= 18;
  if (wealth >= 400) return '👑 富可敵國的傳奇';
  if (hi(int) && hi(str) && hi(cha) && health >= 16 && happy >= 18) return '🌟 傳說級的六邊形人生';
  if (wealth >= 250) return '💎 一代鉅富';
  if (happy >= 24) return '😇 圓滿無憾的智者';
  if (hi(int) && hi(cha)) return '🎩 名滿天下的通才';
  if (hi(str) && health >= 18) return '🦾 不老的鋼鐵之軀';
  if (hi(int) && career === '學者') return '🔬 名留青史的大學者';
  if (hi(cha) && career === '創業家' && wealth >= 150) return '🚀 商業巨擘';
  if (hi(cha) && career === '藝術家') return '🎨 不朽的藝術大師';
  if (hi(int)) return '🧠 博學的智者';
  if (hi(cha)) return '🌹 萬人迷的名流';
  if (hi(str)) return '💪 強健的鐵人';
  if (health >= 18) return '🌿 健康長壽的人';
  if (wealth <= 5 && happy <= 6) return '🥀 潦倒困頓的一生';
  if (happy <= 6) return '🌧️ 鬱鬱寡歡的一生';
  if (int >= 14 && str >= 14 && cha >= 14) return '⚖️ 面面俱到的一生';
  if (career) return careerTitle(career);
  return '🌾 平凡踏實的一生';
}
// 成就徽章：可同時取得多枚
function pickAchievements(S) {
  const f = S.flags || {}, a = [];
  if (S.wealth >= 350) a.push('💰 富甲一方');
  if (S.wealth === 0) a.push('🕳️ 兩袖清風');
  if (S.happy >= 25 && S.health >= 16) a.push('☀️ 樂天知命');
  if (S.int >= 24) a.push('🧠 絕頂聰明');
  if (S.str >= 22) a.push('🏋️ 體魄超群');
  if (S.cha >= 24) a.push('✨ 魅力爆表');
  if (S.health >= 20) a.push('❤️ 老而彌堅');
  if (S.int >= 18 && S.str >= 18 && S.cha >= 18) a.push('🎖️ 文武雙全');
  if (f.jackpot) a.push('🎰 天選之人');
  if ((S.specials || []).length >= 3) a.push('🎭 大起大落');
  if (!S.alive) a.push('💀 英年早逝');
  return a;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { rollDie, mod, newLife, STAGES, enterStage, choose, isOver, ending, STAT_META, applyEff, optsFor, qText, hasHeir };
}

/* ============================================================
                        UI（瀏覽器）
   ============================================================ */
if (typeof document !== 'undefined') (function () {
  const $ = id => document.getElementById(id);
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
  const DIE_FACE = { 6: '🎲', 10: '🔟', 12: '🎯', 20: '🎰' };
  let S = null, busy = false;

  function start() { S = newLife(); render(); flushBirth(); }

  function statBar() {
    const b = el('div', 'stats');
    for (const k of ['health', 'int', 'str', 'cha', 'happy']) {
      const m = STAT_META[k], v = S[k];
      b.appendChild(el('div', 'stat', `<span class="se">${m.emo}</span><span class="sl">${m.zh}</span>`
        + `<span class="sbar"><i style="width:${v / 25 * 100}%"></i></span><span class="sv">${v}</span>`));
    }
    b.appendChild(el('div', 'stat wealth', `<span class="se">💰</span><span class="sl">財富</span><span class="sv">${S.wealth}</span>`));
    return b;
  }

  function render() {
    const g = $('game'); g.innerHTML = '';
    g.appendChild(statBar());
    const stg = STAGES[S.stage];
    g.appendChild(el('div', 'stagebar', S.alive && stg ? `${stageEmoji(S.stage)} ${stg.key}　<span>${stg.age}</span>` : '👼 人生的起點'));
    g.appendChild(el('div', 'log', '', ));
    const log = g.lastChild; log.id = 'log';
    S.log.forEach(e => log.appendChild(logRow(e)));
    g.appendChild(el('div', 'choices', ''));
    g.lastChild.id = 'choices';
    g.appendChild(progressBar());
    log.scrollTop = log.scrollHeight;
  }
  const stageEmoji = i => ['🧒', '🧑‍🎓', '🎓', '💼', '🏡', '🌇'][i] || '⭐';
  const STAGE_AGES = ['6–12', '13–18', '19–25', '26–40', '41–60', '61+'];

  // 底部人生進度條：各階段 emoji 示意 + 目前進度
  function progressBar() {
    const box = el('div', 'progress');
    const over = !S.alive || S.stage >= STAGES.length;
    box.appendChild(el('div', 'ptitle', !S.alive ? '🕯️ 人生已落幕' : (over ? '🎊 走完了一生' : '人生進度')));
    // 連續進度：階段 + 階段內抉擇比例；死亡停在 diedAt；壽終停在最後
    const inStage = (S.alive && S.plan && S.plan.length) ? (S.choiceIdx || 0) / S.plan.length : 0;
    const cont = !S.alive ? (S.diedAt != null ? S.diedAt : S.stage)
      : Math.min(STAGES.length, S.stage + inStage);
    const frac = Math.max(0, Math.min(1, cont / (STAGES.length - 1)));
    const track = el('div', 'ptrack');
    const fill = el('div', 'pfill'); fill.style.width = (frac * 100) + '%'; track.appendChild(fill);
    box.appendChild(track);
    const nodes = el('div', 'pnodes');
    for (let i = 0; i < STAGES.length; i++) {
      let cls = 'pnode ';
      if (!S.alive) cls += (i < (S.diedAt != null ? S.diedAt : S.stage)) ? 'done' : (i === (S.diedAt != null ? S.diedAt : S.stage) ? 'died' : 'future');
      else if (over) cls += 'done';
      else cls += i < S.stage ? 'done' : (i === S.stage ? 'cur' : 'future');
      const isDeath = !S.alive && i === (S.diedAt != null ? S.diedAt : S.stage);
      const emo = isDeath ? '💀' : stageEmoji(i);
      nodes.appendChild(el('div', cls,
        `<span class="pdot">${emo}</span><span class="pl">${STAGES[i].key}</span><span class="page">${STAGE_AGES[i]}</span>`));
    }
    box.appendChild(nodes);
    return box;
  }

  function logRow(e) {
    const dice = (e.dice || []).map(d => `<span class="die d${d.s}">${DIE_FACE[d.s] || '🎲'}d${d.s}=${d.v}</span>`).join('');
    let chk = '';
    if (e.check) chk = ` <span class="chk ${e.check.success ? 'ok' : 'no'}">d20 ${e.check.roll}${e.check.mod >= 0 ? '+' : ''}${e.check.mod}=${e.check.total} vs ${e.check.dc} ${e.check.success ? '✔成功' : '✘失敗'}</span>`;
    const eff = effStr(e.eff);
    return el('div', 'row' + (e.special ? ' special' : ''), `${dice ? `<div class="dl">${dice}${chk}</div>` : ''}<div class="tx">${e.t}${eff}</div>`);
  }
  function effStr(e) {
    if (!e) return '';
    const parts = [];
    for (const k in e) { const m = STAT_META[k]; if (!m || !e[k]) continue; parts.push(`<b class="${e[k] >= 0 ? 'up' : 'dn'}">${m.emo}${e[k] >= 0 ? '+' : ''}${e[k]}</b>`); }
    return parts.length ? ` <span class="eff">${parts.join(' ')}</span>` : '';
  }

  // 誕生：顯示出生 log 後，出現「開始童年」
  function flushBirth() {
    const c = $('choices'); c.innerHTML = '';
    const b = el('button', 'opt big', '👶 展開人生 →'); b.onclick = () => stepStage(); c.appendChild(b);
  }

  function stepStage() {
    if (isOver(S)) return finish();
    busy = true;
    const { ev, choice } = enterStage(S, undefined);
    appendLog(ev, () => {
      if (!S.alive) { busy = false; return finish(); }
      showChoice(choice);
      busy = false;
    });
  }

  function appendLog(entry, cb) {
    const log = $('log'); const row = logRow(entry); row.classList.add('newrow');
    // 擲骰動畫
    log.appendChild(row); log.scrollTop = log.scrollHeight;
    const dieEls = row.querySelectorAll('.die');
    animateDice(entry.dice || [], dieEls, cb);
    render(); // 更新屬性條
    // render 重建了 DOM；重新滾到底
    $('log').scrollTop = $('log').scrollHeight;
    if (cb) setTimeout(cb, 380);
  }

  function animateDice() { /* render() 會重繪，動畫改用 CSS newrow 淡入 */ }

  function showChoice(choice) {
    const c = $('choices'); c.innerHTML = '';
    if (!choice) { const b = el('button', 'opt big', '➡️ 繼續'); b.onclick = stepStage; c.appendChild(b); return; }
    const n = (S.plan && S.plan.length) || 1, ci = (S.choiceIdx || 0) + 1;
    c.appendChild(el('div', 'q', `❓ ${qText(S, choice)}　<span class="qn">抉擇 ${ci}/${n}</span>`));
    optsFor(S, choice).forEach((o, i) => {
      const tag = o.check ? ` <span class="ck">🎲d20檢定·${STAT_META[o.check.stat].zh}≥${o.check.dc}</span>` : '';
      const b = el('button', 'opt', o.label + tag);
      b.onclick = () => { if (busy) return; busy = true; const out = choose(S, i, undefined); busy = false; afterChoose(out); };
      c.appendChild(b);
    });
  }

  function afterChoose(out) {
    render();
    if (isOver(S)) return finish();
    // 本階段還有下一個抉擇 → 直接接續呈現
    if (out && out.next) { showChoice(out.next); $('log').scrollTop = $('log').scrollHeight; return; }
    const c = $('choices'); c.innerHTML = '';
    const b = el('button', 'opt big', '➡️ 進入下一階段'); b.onclick = stepStage; c.appendChild(b);
    $('log').scrollTop = $('log').scrollHeight;
  }

  /* ---------- localStorage 人生記錄 ---------- */
  const LS_KEY = 'life-sim.history.v1';
  function loadHistory() {
    try { const a = JSON.parse(localStorage.getItem(LS_KEY) || '[]'); return Array.isArray(a) ? a : []; }
    catch (e) { return []; }
  }
  function saveHistory(list) { try { localStorage.setItem(LS_KEY, JSON.stringify(list.slice(-100))); } catch (e) {} }
  function clearHistory() { try { localStorage.removeItem(LS_KEY); } catch (e) {} }
  function recordLife(S, r) {
    const list = loadHistory();
    const d = new Date();
    const pad = n => (n < 10 ? '0' : '') + n;
    list.push({
      ts: d.getTime(),
      date: `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`,
      grade: r.grade, title: r.title, score: r.score, age: r.age != null ? r.age : (r.lifespan != null ? r.lifespan : null),
      career: S.career ? r.career : '', birthFam: S.birthFam, cause: r.cause,
      achievements: r.achievements || [],
      stats: { health: S.health, int: S.int, str: S.str, cha: S.cha, happy: S.happy, wealth: S.wealth },
    });
    saveHistory(list);
  }
  function historyBody() {
    const list = loadHistory().slice().reverse();
    if (!list.length) return `<div class="rulestxt">還沒有任何人生記錄。走完一生後就會自動存進這裡(存在本機瀏覽器 localStorage)。</div>`;
    const best = Math.max.apply(null, list.map(x => x.score || 0));
    const rows = list.map(x => {
      const badge = `<span class="hg g${x.grade}">${x.grade}</span>`;
      const ageTxt = x.age != null ? `享年 ${x.age}` : '';
      const star = (x.score === best) ? ' 👑' : '';
      const ach = (x.achievements && x.achievements.length) ? `<div class="hach">${x.achievements.join(' ')}</div>` : '';
      return `<div class="hrow">${badge}<div class="hmain"><div class="ht">${x.title}${star}</div>`
        + `<div class="hsub">分 ${x.score}・${ageTxt}${x.career ? '・' + x.career : ''}</div>`
        + ach
        + `<div class="hdate">${x.date}・出身 ${x.birthFam}</div></div></div>`;
    }).join('');
    return `<div class="hstat">共 ${list.length} 段人生・最高分 <b>${best}</b></div><div class="hlist">${rows}</div>`;
  }
  function showHistory() {
    overlay('📜 人生記錄', historyBody(), [
      { t: '🗑️ 清除記錄', f: () => { if (confirm('確定清除所有人生記錄?')) { clearHistory(); showHistory(); } } },
      { t: '關閉', f: hideOverlay },
    ]);
  }

  function famStatus(S) { const f = S.facts || {}; return f.family ? '兒孫滿堂' : f.partner ? '有伴相隨' : '單身一生'; }

  function finish() {
    const r = ending(S, undefined);
    if (!S.saved) { S.saved = true; recordLife(S, r); }
    const rows = [
      ['❤️ 健康', S.health], ['🧠 智力', S.int], ['💪 體魄', S.str],
      ['✨ 魅力', S.cha], ['😊 幸福', S.happy], ['💰 財富', S.wealth],
    ].map(([k, v]) => `<div class="er"><span>${k}</span><b>${v}</b></div>`).join('');
    const badges = (r.achievements && r.achievements.length)
      ? `<div class="badges">${r.achievements.map(a => `<span class="badge">${a}</span>`).join('')}</div>` : '';
    const body =
      `<div class="grade g${r.grade}">${r.grade}</div>`
      + `<div class="title">${r.title}</div>`
      + `<div class="cause">${r.cause}</div>`
      + `<div class="ergrid">${rows}</div>`
      + `<div class="scoreline">人生總分 <b>${r.score}</b></div>`
      + badges
      + `<div class="mile">出身：${S.birthFam}${S.career ? '　職涯：' + r.career : ''}　家庭：${famStatus(S)}</div>`;
    overlay('🕯️ 人生總結', body, [
      { t: '🔄 再活一次', f: () => { hideOverlay(); start(); } },
      { t: '📜 人生記錄', f: showHistory },
    ]);
  }

  function overlay(title, body, acts) {
    $('ov-title').innerHTML = title; $('ov-body').innerHTML = body;
    const box = $('ov-actions'); box.innerHTML = '';
    acts.forEach(a => { const b = el('button', 'ovbtn', a.t); b.onclick = a.f; box.appendChild(b); });
    $('overlay').classList.add('show');
  }
  function hideOverlay() { $('overlay').classList.remove('show'); }

  function boot() {
    $('rules').onclick = () => overlay('玩法',
      `<div class="rulestxt">擲骰模擬人生:從出生到晚年,每個階段先<b>擲骰(d10/d12)</b>觸發隨機事件,再做<b>選擇</b>——部分選擇需<b>d20 檢定</b>(骰值＋屬性修正 ≥ 門檻才成功)。<br>選擇會累積 健康/智力/體魄/魅力/幸福/財富。<br>走完晚年會給你一份<b>人生總結</b>(稱號＋評分＋壽命)。每局都不一樣!</div>`,
      [{ t: '開始', f: () => { hideOverlay(); start(); } }]);
    const hb = $('history'); if (hb) hb.onclick = showHistory;
    start();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
