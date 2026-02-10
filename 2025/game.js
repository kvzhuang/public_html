// 遊戲狀態
let gameState = {
    money: 1000,
    wins: 0,
    losses: 0,
    pokeballs: 0,
    playerPokemons: [],
    selectedPokemonIndex: -1,
    wildPokemon: null,
    battleState: {
        inBattle: false,
        playerPokemon: null,
        enemyPokemon: null,
        turn: 'player'
    }
};

// 獲取DOM元素
const moneyDisplay = document.getElementById('money');
const pokemonCountDisplay = document.getElementById('pokemon-count');
const winsDisplay = document.getElementById('wins');
const lossesDisplay = document.getElementById('losses');
const exploreBtn = document.getElementById('explore-btn');
const shopBtn = document.getElementById('shop-btn');
const encounterSection = document.getElementById('encounter-section');
const wildPokemonImg = document.getElementById('wild-pokemon-img');
const wildPokemonName = document.getElementById('wild-pokemon-name');
const wildPokemonLevel = document.getElementById('wild-pokemon-level');
const catchBtn = document.getElementById('catch-btn');
const runBtn = document.getElementById('run-btn');
const battleWildBtn = document.getElementById('battle-wild-btn');
const pokemonList = document.getElementById('pokemon-list');
const noPokemonMessage = document.getElementById('no-pokemon-message');
const pokemonDetail = document.getElementById('pokemon-detail');
const detailImage = document.getElementById('detail-image');
const detailName = document.getElementById('detail-name');
const detailLevel = document.getElementById('detail-level');
const detailExp = document.getElementById('detail-exp');
const detailNextLevel = document.getElementById('detail-next-level');
const expProgress = document.getElementById('exp-progress');
const detailHp = document.getElementById('detail-hp');
const detailMaxHp = document.getElementById('detail-max-hp');
const hpProgress = document.getElementById('hp-progress');
const detailAttack = document.getElementById('detail-attack');
const detailDefense = document.getElementById('detail-defense');
const detailSpeed = document.getElementById('detail-speed');
const trainBtn = document.getElementById('train-btn');
const healBtn = document.getElementById('heal-btn');
const releaseBtn = document.getElementById('release-btn');
const battleSection = document.getElementById('battle-section');
const playerPokemonImg = document.getElementById('player-pokemon-img');
const playerPokemonName = document.getElementById('player-pokemon-name');
const playerPokemonLevel = document.getElementById('player-pokemon-level');
const playerPokemonHp = document.getElementById('player-pokemon-hp');
const playerPokemonMaxHp = document.getElementById('player-pokemon-max-hp');
const playerHpBar = document.getElementById('player-hp-bar');
const enemyPokemonImg = document.getElementById('enemy-pokemon-img');
const enemyPokemonName = document.getElementById('enemy-pokemon-name');
const enemyPokemonLevel = document.getElementById('enemy-pokemon-level');
const enemyPokemonHp = document.getElementById('enemy-pokemon-hp');
const enemyPokemonMaxHp = document.getElementById('enemy-pokemon-max-hp');
const enemyHpBar = document.getElementById('enemy-hp-bar');
const battleLog = document.getElementById('battle-log');
const attackBtn = document.getElementById('attack-btn');
const specialBtn = document.getElementById('special-btn');
const fleeBtn = document.getElementById('flee-btn');
const shopModal = document.getElementById('shop-modal');
const closeShop = document.getElementById('close-shop');
const shopMoneyDisplay = document.getElementById('shop-money');
const pokeballCountDisplay = document.getElementById('pokeball-count');
const buyPokeballBtn = document.getElementById('buy-pokeball');
const buyPotionBtn = document.getElementById('buy-potion');
const buyCandyBtn = document.getElementById('buy-candy');
const resultModal = document.getElementById('result-modal');
const resultTitle = document.getElementById('result-title');
const resultMessage = document.getElementById('result-message');
const resultOkBtn = document.getElementById('result-ok');

// 輔助函數
function getExpForNextLevel(level) {
    return level * level * 100;
}

function createPokemon(basePokemon, level) {
    const levelMultiplier = 1 + (level - 1) * 0.1;

    return {
        id: basePokemon.id,
        name: basePokemon.name,
        type: basePokemon.type,
        level: level,
        exp: 0,
        maxHp: Math.floor(basePokemon.baseHp * levelMultiplier),
        currentHp: Math.floor(basePokemon.baseHp * levelMultiplier),
        attack: Math.floor(basePokemon.baseAttack * levelMultiplier),
        defense: Math.floor(basePokemon.baseDefense * levelMultiplier),
        speed: Math.floor(basePokemon.baseSpeed * levelMultiplier),
        image: basePokemon.image
    };
}

function showResult(title, message) {
    resultTitle.textContent = title;
    resultMessage.textContent = message;
    resultModal.style.display = 'flex';
}

function closeResultModal() {
    resultModal.style.display = 'none';
}

// 初始化遊戲
updateStats();

// 事件監聽器
exploreBtn.addEventListener('click', exploreWild);
shopBtn.addEventListener('click', openShop);
catchBtn.addEventListener('click', catchPokemon);
runBtn.addEventListener('click', runFromWild);
battleWildBtn.addEventListener('click', startWildBattle);
trainBtn.addEventListener('click', trainPokemon);
healBtn.addEventListener('click', healPokemon);
releaseBtn.addEventListener('click', releasePokemon);
attackBtn.addEventListener('click', () => attackEnemy('normal'));
specialBtn.addEventListener('click', () => attackEnemy('special'));
fleeBtn.addEventListener('click', fleeBattle);
closeShop.addEventListener('click', closeShopModal);
buyPokeballBtn.addEventListener('click', buyPokeball);
buyPotionBtn.addEventListener('click', buyPotion);
buyCandyBtn.addEventListener('click', buyCandy);
resultOkBtn.addEventListener('click', closeResultModal);

// 更新遊戲狀態顯示
function updateStats() {
    moneyDisplay.textContent = gameState.money;
    pokemonCountDisplay.textContent = gameState.playerPokemons.length;
    winsDisplay.textContent = gameState.wins;
    lossesDisplay.textContent = gameState.losses;
    shopMoneyDisplay.textContent = gameState.money;
    pokeballCountDisplay.textContent = gameState.pokeballs;

    // 更新寶可夢列表
    if (gameState.playerPokemons.length === 0) {
        noPokemonMessage.style.display = 'block';
        pokemonDetail.style.display = 'none';
    } else {
        noPokemonMessage.style.display = 'none';
        renderPokemonList();
    }
}

// 渲染寶可夢列表
function renderPokemonList() {
    pokemonList.innerHTML = '';
    gameState.playerPokemons.forEach((pokemon, index) => {
        const card = document.createElement('div');
        card.className = `pokemon-card ${index === gameState.selectedPokemonIndex ? 'selected' : ''}`;
        card.innerHTML = `
            <img class="pokemon-image" src="${pokemon.image}" alt="${pokemon.name}">
            <div class="pokemon-name">${pokemon.name}</div>
            <div class="pokemon-level">Lv. ${pokemon.level}</div>
            <div class="pokemon-stats">
                <div>HP: ${pokemon.currentHp}/${pokemon.maxHp}</div>
            </div>
        `;
        card.addEventListener('click', () => selectPokemon(index));
        pokemonList.appendChild(card);
    });
}

// 選擇寶可夢
function selectPokemon(index) {
    gameState.selectedPokemonIndex = index;
    renderPokemonList();
    showPokemonDetail(index);
}

// 顯示寶可夢詳情
function showPokemonDetail(index) {
    const pokemon = gameState.playerPokemons[index];
    pokemonDetail.style.display = 'block';
    detailImage.src = pokemon.image;
    detailName.textContent = pokemon.name;
    detailLevel.textContent = `Lv. ${pokemon.level}`;
    detailExp.textContent = pokemon.exp;
    detailNextLevel.textContent = getExpForNextLevel(pokemon.level);
    expProgress.style.width = `${(pokemon.exp / getExpForNextLevel(pokemon.level)) * 100}%`;
    detailHp.textContent = pokemon.currentHp;
    detailMaxHp.textContent = pokemon.maxHp;
    hpProgress.style.width = `${(pokemon.currentHp / pokemon.maxHp) * 100}%`;
    detailAttack.textContent = pokemon.attack;
    detailDefense.textContent = pokemon.defense;
    detailSpeed.textContent = pokemon.speed;
}

// 探索野外
function exploreWild() {
    // 隨機選擇一個寶可夢
    const randomIndex = Math.floor(Math.random() * pokemonData.length);
    const basePokemon = pokemonData[randomIndex];

    // 生成1-5級的野生寶可夢
    const level = Math.floor(Math.random() * 5) + 1;

    gameState.wildPokemon = createPokemon(basePokemon, level);

    // 顯示遇到的寶可夢
    encounterSection.style.display = 'block';
    wildPokemonImg.src = gameState.wildPokemon.image;
    wildPokemonName.textContent = gameState.wildPokemon.name;
    wildPokemonLevel.textContent = `Lv. ${gameState.wildPokemon.level}`;
}

// 嘗試捕捉寶可夢
function catchPokemon() {
    // 計算捕捉成功率
    // 基礎成功率為 40%，每個精靈球增加 10%，寶可夢血量越低越容易捕捉
    const hpPercentage = gameState.wildPokemon.currentHp / gameState.wildPokemon.maxHp;
    let catchRate = 0.4 + (gameState.pokeballs > 0 ? 0.1 : 0) + (1 - hpPercentage) * 0.3;

    // 限制在 0.1 到 0.9 之間
    catchRate = Math.min(0.9, Math.max(0.1, catchRate));

    // 如果有精靈球，使用一個
    if (gameState.pokeballs > 0) {
        gameState.pokeballs--;
        updateStats();
    }

    // 隨機決定是否捕捉成功
    if (Math.random() < catchRate) {
        // 捕捉成功
        gameState.playerPokemons.push(gameState.wildPokemon);

        // 更新遊戲狀態
        encounterSection.style.display = 'none';
        gameState.wildPokemon = null;
        updateStats();

        // 顯示成功消息
        showResult('捕捉成功！', '你成功捕捉了一隻新的寶可夢！');
    } else {
        // 捕捉失敗
        showResult('捕捉失敗', '寶可夢掙脫了！');
    }
}

// 從野生寶可夢處逃跑
function runFromWild() {
    encounterSection.style.display = 'none';
    gameState.wildPokemon = null;
}

// 開始與野生寶可夢的戰鬥
function startWildBattle() {
    if (gameState.playerPokemons.length === 0) {
        showResult('無法戰鬥', '你還沒有寶可夢！');
        return;
    }

    // 選擇第一個有生命值的寶可夢
    let validPokemonIndex = -1;
    for (let i = 0; i < gameState.playerPokemons.length; i++) {
        if (gameState.playerPokemons[i].currentHp > 0) {
            validPokemonIndex = i;
            break;
        }
    }

    if (validPokemonIndex === -1) {
        showResult('無法戰鬥', '你的所有寶可夢都無法戰鬥！');
        return;
    }

    // 設置戰鬥狀態
    gameState.battleState.inBattle = true;
    gameState.battleState.playerPokemon = gameState.playerPokemons[validPokemonIndex];
    gameState.battleState.enemyPokemon = gameState.wildPokemon;
    gameState.battleState.turn = 'player';

    // 顯示戰鬥界面
    encounterSection.style.display = 'none';
    battleSection.style.display = 'block';

    // 更新戰鬥界面
    updateBattleUI();

    // 清空戰鬥日誌
    battleLog.innerHTML = '<p>戰鬥開始！</p>';
}

// 更新戰鬥界面
function updateBattleUI() {
    const playerPokemon = gameState.battleState.playerPokemon;
    const enemyPokemon = gameState.battleState.enemyPokemon;

    playerPokemonImg.src = playerPokemon.image;
    playerPokemonName.textContent = playerPokemon.name;
    playerPokemonLevel.textContent = `Lv. ${playerPokemon.level}`;
    playerPokemonHp.textContent = playerPokemon.currentHp;
    playerPokemonMaxHp.textContent = playerPokemon.maxHp;
    playerHpBar.style.width = `${(playerPokemon.currentHp / playerPokemon.maxHp) * 100}%`;

    enemyPokemonImg.src = enemyPokemon.image;
    enemyPokemonName.textContent = enemyPokemon.name;
    enemyPokemonLevel.textContent = `Lv. ${enemyPokemon.level}`;
    enemyPokemonHp.textContent = enemyPokemon.currentHp;
    enemyPokemonMaxHp.textContent = enemyPokemon.maxHp;
    enemyHpBar.style.width = `${(enemyPokemon.currentHp / enemyPokemon.maxHp) * 100}%`;
}

// 攻擊敵人
function attackEnemy(attackType) {
    if (!gameState.battleState.inBattle || gameState.battleState.turn !== 'player') {
        return;
    }

    const playerPokemon = gameState.battleState.playerPokemon;
    const enemyPokemon = gameState.battleState.enemyPokemon;

    // 計算傷害
    let damage = 0;
    if (attackType === 'normal') {
        // 普通攻擊
        damage = Math.max(1, Math.floor(playerPokemon.attack * (1 - enemyPokemon.defense / 200)));
        addBattleLog(`${playerPokemon.name} 使用了普通攻擊！`);
    } else {
        // 特殊攻擊，有 20% 的機會暴擊，但也有 30% 的機會失敗
        const random = Math.random();
        if (random < 0.3) {
            addBattleLog(`${playerPokemon.name} 的特殊攻擊失敗了！`);
            damage = 0;
        } else if (random < 0.5) {
            damage = Math.max(1, Math.floor(playerPokemon.attack * 1.5 * (1 - enemyPokemon.defense / 200)));
            addBattleLog(`${playerPokemon.name} 的特殊攻擊造成了暴擊！`);
        } else {
            damage = Math.max(1, Math.floor(playerPokemon.attack * 1.2 * (1 - enemyPokemon.defense / 200)));
            addBattleLog(`${playerPokemon.name} 使用了特殊攻擊！`);
        }
    }

    // 應用傷害
    enemyPokemon.currentHp = Math.max(0, enemyPokemon.currentHp - damage);
    addBattleLog(`${enemyPokemon.name} 受到了 ${damage} 點傷害！`);

    // 更新戰鬥界面
    updateBattleUI();

    // 檢查敵人是否被擊敗
    if (enemyPokemon.currentHp <= 0) {
        endBattle(true);
        return;
    }

    // 切換回合
    gameState.battleState.turn = 'enemy';

    // 敵人攻擊
    setTimeout(enemyAttack, 1000);
}

// 敵人攻擊
function enemyAttack() {
    if (!gameState.battleState.inBattle || gameState.battleState.turn !== 'enemy') {
        return;
    }

    const playerPokemon = gameState.battleState.playerPokemon;
    const enemyPokemon = gameState.battleState.enemyPokemon;

    // 計算傷害
    const useSpecial = Math.random() < 0.3; // 30% 的機會使用特殊攻擊
    let damage = 0;

    if (!useSpecial) {
        // 普通攻擊
        damage = Math.max(1, Math.floor(enemyPokemon.attack * (1 - playerPokemon.defense / 200)));
        addBattleLog(`${enemyPokemon.name} 使用了普通攻擊！`);
    } else {
        // 特殊攻擊
        const random = Math.random();
        if (random < 0.3) {
            addBattleLog(`${enemyPokemon.name} 的特殊攻擊失敗了！`);
            damage = 0;
        } else if (random < 0.5) {
            damage = Math.max(1, Math.floor(enemyPokemon.attack * 1.5 * (1 - playerPokemon.defense / 200)));
            addBattleLog(`${enemyPokemon.name} 的特殊攻擊造成了暴擊！`);
        } else {
            damage = Math.max(1, Math.floor(enemyPokemon.attack * 1.2 * (1 - playerPokemon.defense / 200)));
            addBattleLog(`${enemyPokemon.name} 使用了特殊攻擊！`);
        }
    }

    // 應用傷害
    playerPokemon.currentHp = Math.max(0, playerPokemon.currentHp - damage);
    addBattleLog(`${playerPokemon.name} 受到了 ${damage} 點傷害！`);

    // 更新戰鬥界面
    updateBattleUI();

    // 檢查玩家是否被擊敗
    if (playerPokemon.currentHp <= 0) {
        endBattle(false);
        return;
    }

    // 切換回合
    gameState.battleState.turn = 'player';
}

// 添加戰鬥日誌
function addBattleLog(message) {
    const logEntry = document.createElement('p');
    logEntry.textContent = message;
    battleLog.appendChild(logEntry);
    battleLog.scrollTop = battleLog.scrollHeight;
}

// 結束戰鬥
function endBattle(playerWon) {
    gameState.battleState.inBattle = false;

    if (playerWon) {
        // 玩家獲勝
        gameState.wins++;

        // 獲得經驗和金錢
        const expGained = gameState.battleState.enemyPokemon.level * 50;
        const moneyGained = gameState.battleState.enemyPokemon.level * 30;

        // 更新寶可夢經驗
        const playerPokemon = gameState.battleState.playerPokemon;
        playerPokemon.exp += expGained;

        // 檢查是否升級
        checkLevelUp(playerPokemon);

        // 更新金錢
        gameState.money += moneyGained;

        // 顯示勝利消息
        addBattleLog(`${playerPokemon.name} 獲勝！`);
        addBattleLog(`獲得 ${expGained} 經驗和 ${moneyGained} 金錢！`);

        // 如果是野生寶可夢，給予捕捉機會
        if (gameState.wildPokemon) {
            setTimeout(() => {
                battleSection.style.display = 'none';
                encounterSection.style.display = 'block';
            }, 2000);
        } else {
            setTimeout(() => {
                battleSection.style.display = 'none';
                showResult('戰鬥勝利', `你的 ${playerPokemon.name} 獲勝了！獲得 ${expGained} 經驗和 ${moneyGained} 金錢！`);
            }, 2000);
        }
    } else {
        // 玩家失敗
        gameState.losses++;

        // 顯示失敗消息
        addBattleLog(`${gameState.battleState.playerPokemon.name} 被擊敗了！`);

        setTimeout(() => {
            battleSection.style.display = 'none';
            showResult('戰鬥失敗', '你的寶可夢被擊敗了！');

            // 如果是野生寶可夢，結束遭遇
            if (gameState.wildPokemon) {
                gameState.wildPokemon = null;
            }
        }, 2000);
    }

    // 更新遊戲狀態
    updateStats();
}

// 檢查寶可夢是否升級
function checkLevelUp(pokemon) {
    const expForNextLevel = getExpForNextLevel(pokemon.level);

    if (pokemon.exp >= expForNextLevel) {
        // 升級
        pokemon.level++;
        pokemon.exp -= expForNextLevel;

        // 增加屬性
        const statIncrease = 1 + Math.floor(pokemon.level / 5);
        pokemon.maxHp += statIncrease * 2;
        pokemon.currentHp = pokemon.maxHp; // 升級時恢復全部HP
        pokemon.attack += statIncrease;
        pokemon.defense += statIncrease;
        pokemon.speed += statIncrease;

        // 顯示升級消息
        addBattleLog(`${pokemon.name} 升級到 ${pokemon.level} 級！`);

        // 檢查是否可以再次升級
        checkLevelUp(pokemon);
    }
}

// 從戰鬥中逃跑
function fleeBattle() {
    // 計算逃跑成功率，基於速度差
    const playerSpeed = gameState.battleState.playerPokemon.speed;
    const enemySpeed = gameState.battleState.enemyPokemon.speed;

    const fleeRate = 0.5 + (playerSpeed - enemySpeed) * 0.01;

    if (Math.random() < fleeRate) {
        // 逃跑成功
        addBattleLog('成功逃跑！');

        setTimeout(() => {
            battleSection.style.display = 'none';
            gameState.battleState.inBattle = false;

            // 如果是野生寶可夢，結束遭遇
            if (gameState.wildPokemon) {
                gameState.wildPokemon = null;
            }
        }, 1000);
    } else {
        // 逃跑失敗
        addBattleLog('逃跑失敗！');

        // 敵人獲得一次免費攻擊
        gameState.battleState.turn = 'enemy';
        setTimeout(enemyAttack, 1000);
    }
}

// 訓練寶可夢
function trainPokemon() {
    if (gameState.selectedPokemonIndex === -1) {
        showResult('錯誤', '請先選擇一個寶可夢！');
        return;
    }

    if (gameState.money < 50) {
        showResult('金錢不足', '訓練需要 50 金錢！');
        return;
    }

    // 扣除金錢
    gameState.money -= 50;

    // 增加經驗
    const pokemon = gameState.playerPokemons[gameState.selectedPokemonIndex];
    const expGained = 100;
    pokemon.exp += expGained;

    // 檢查是否升級
    const oldLevel = pokemon.level;
    checkLevelUp(pokemon);

    // 更新界面
    updateStats();
    showPokemonDetail(gameState.selectedPokemonIndex);

    // 顯示訓練結果
    if (pokemon.level > oldLevel) {
        showResult('訓練成功', `${pokemon.name} 獲得了 ${expGained} 經驗並升級到了 ${pokemon.level} 級！`);
    } else {
        showResult('訓練成功', `${pokemon.name} 獲得了 ${expGained} 經驗！`);
    }
}

// 治療寶可夢
function healPokemon() {
    if (gameState.selectedPokemonIndex === -1) {
        showResult('錯誤', '請先選擇一個寶可夢！');
        return;
    }

    if (gameState.money < 30) {
        showResult('金錢不足', '治療需要 30 金錢！');
        return;
    }

    const pokemon = gameState.playerPokemons[gameState.selectedPokemonIndex];

    // 如果HP已經是滿的，不需要治療
    if (pokemon.currentHp === pokemon.maxHp) {
        showResult('不需要治療', `${pokemon.name} 的HP已經是滿的！`);
        return;
    }

    // 扣除金錢
    gameState.money -= 30;

    // 恢復HP
    pokemon.currentHp = pokemon.maxHp;

    // 更新界面
    updateStats();
    showPokemonDetail(gameState.selectedPokemonIndex);

    // 顯示治療結果
    showResult('治療成功', `${pokemon.name} 的HP已完全恢復！`);
}

// 釋放寶可夢
function releasePokemon() {
    if (gameState.selectedPokemonIndex === -1) {
        showResult('錯誤', '請先選擇一個寶可夢！');
        return;
    }

    const pokemon = gameState.playerPokemons[gameState.selectedPokemonIndex];

    // 確認釋放
    if (confirm(`確定要釋放 ${pokemon.name} (Lv.${pokemon.level}) 嗎？此操作不可撤銷！`)) {
        // 從列表中移除
        gameState.playerPokemons.splice(gameState.selectedPokemonIndex, 1);

        // 重置選擇
        gameState.selectedPokemonIndex = -1;

        // 更新界面
        updateStats();
        pokemonDetail.style.display = 'none';

        // 顯示釋放結果
        showResult('釋放成功', `你釋放了 ${pokemon.name}。再見了，朋友！`);
    }
}

// 打開商店
function openShop() {
    shopMoneyDisplay.textContent = gameState.money;
    pokeballCountDisplay.textContent = gameState.pokeballs;
    shopModal.style.display = 'flex';
}

// 關閉商店
function closeShopModal() {
    shopModal.style.display = 'none';
}

// 購買精靈球
function buyPokeball() {
    if (gameState.money < 100) {
        showResult('金錢不足', '購買精靈球需要 100 金錢！');
        return;
    }

    // 扣除金錢
    gameState.money -= 100;

    // 增加精靈球
    gameState.pokeballs++;

    // 更新界面
    shopMoneyDisplay.textContent = gameState.money;
    pokeballCountDisplay.textContent = gameState.pokeballs;
    updateStats();

    // 顯示購買結果
    showResult('購買成功', '你購買了一個精靈球！');
}

function buyPotion() {
    if (gameState.money < 200) {
        showResult('金錢不足', '購買恢復藥需要 200 金錢！');
        return;
    }

    // 檢查是否有寶可夢需要治療
    let needsHealing = false;
    for (const pokemon of gameState.playerPokemons) {
        if (pokemon.currentHp < pokemon.maxHp) {
            needsHealing = true;
            break;
        }
    }

    if (!needsHealing) {
        showResult('不需要治療', '你的所有寶可夢都是滿血的！');
        return;
    }

    // 扣除金錢
    gameState.money -= 200;

    // 恢復所有寶可夢的HP
    for (const pokemon of gameState.playerPokemons) {
        pokemon.currentHp = pokemon.maxHp;
    }

    // 更新界面
    shopMoneyDisplay.textContent = gameState.money;
    updateStats();

    if (gameState.selectedPokemonIndex !== -1) {
        showPokemonDetail(gameState.selectedPokemonIndex);
    }

    // 顯示購買結果
    showResult('購買成功', '你的所有寶可夢都恢復了健康！');
}

// 購買經驗糖果
function buyCandy() {
    if (gameState.selectedPokemonIndex === -1) {
        showResult('錯誤', '請先選擇一個寶可夢！');
        return;
    }

    if (gameState.money < 300) {
        showResult('金錢不足', '購買經驗糖果需要 300 金錢！');
        return;
    }

    // 扣除金錢
    gameState.money -= 300;

    // 增加經驗
    const pokemon = gameState.playerPokemons[gameState.selectedPokemonIndex];
    const expGained = 300;
    pokemon.exp += expGained;

    // 檢查是否升級
    const oldLevel = pokemon.level;
    checkLevelUp(pokemon);

    // 更新界面
    shopMoneyDisplay.textContent = gameState.money;
    updateStats();
    showPokemonDetail(gameState.selectedPokemonIndex);

    // 顯示購買結果
    if (pokemon.level > oldLevel) {
        showResult('購買成功', `${pokemon.name} 獲得了 ${expGained} 經驗並升級到了 ${pokemon.level} 級！`);
    } else {
        showResult('購買成功', `${pokemon.name} 獲得了 ${expGained} 經驗！`);
    }
}

// 保存遊戲
function saveGame() {
    try {
        localStorage.setItem('pokemonGame', JSON.stringify(gameState));
        return true;
    } catch (error) {
        console.error('保存遊戲失敗:', error);
        return false;
    }
}

// 載入遊戲
function loadGame() {
    try {
        const savedGame = localStorage.getItem('pokemonGame');
        if (savedGame) {
            gameState = JSON.parse(savedGame);
            updateStats();
            return true;
        }
    } catch (error) {
        console.error('載入遊戲失敗:', error);
    }
    return false;
}

// 自動保存
setInterval(saveGame, 60000); // 每分鐘保存一次

// 嘗試載入保存的遊戲
document.addEventListener('DOMContentLoaded', () => {
    if (loadGame()) {
        console.log('遊戲已從本地存儲載入');
    }
});

// 處理鍵盤快捷鍵
document.addEventListener('keydown', (event) => {
    // 按 ESC 鍵關閉模態框
    if (event.key === 'Escape') {
        closeShopModal();
        closeResultModal();
    }

    // 在戰鬥中的快捷鍵
    if (gameState.battleState.inBattle && gameState.battleState.turn === 'player') {
        if (event.key === 'a' || event.key === 'A') {
            // 按 A 鍵普通攻擊
            attackEnemy('normal');
        } else if (event.key === 's' || event.key === 'S') {
            // 按 S 鍵特殊攻擊
            attackEnemy('special');
        } else if (event.key === 'f' || event.key === 'F') {
            // 按 F 鍵逃跑
            fleeBattle();
        }
    }
});

// 添加觸控支持
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', (event) => {
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
});

document.addEventListener('touchend', (event) => {
    const touchEndX = event.changedTouches[0].clientX;
    const touchEndY = event.changedTouches[0].clientY;

    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    // 判斷是否為滑動手勢
    if (Math.abs(diffX) > 50 || Math.abs(diffY) > 50) {
        // 向左滑動：探索
        if (diffX < -50 && Math.abs(diffY) < 30) {
            exploreWild();
        }

        // 向右滑動：打開商店
        if (diffX > 50 && Math.abs(diffY) < 30) {
            openShop();
        }
    }
});

// 添加新手引導
function showTutorial() {
    const tutorialSteps = [
        '歡迎來到寶可夢養成遊戲！',
        '點擊「探索野外」按鈕尋找野生寶可夢。',
        '遇到寶可夢後，你可以嘗試捕捉它或與它戰鬥。',
        '在商店中購買精靈球可以提高捕捉成功率。',
        '訓練和升級你的寶可夢，讓它們變得更強！',
        '祝你玩得開心！'
    ];

    let currentStep = 0;

    function showStep() {
        if (currentStep < tutorialSteps.length) {
            showResult('新手引導', tutorialSteps[currentStep]);
            currentStep++;
        }
    }

    resultOkBtn.addEventListener('click', showStep, { once: true });
    showStep();
}

// 檢查是否為新玩家
if (!localStorage.getItem('tutorialShown')) {
    // 標記教程已顯示
    localStorage.setItem('tutorialShown', 'true');
    // 顯示教程
    setTimeout(showTutorial, 1000);
}

