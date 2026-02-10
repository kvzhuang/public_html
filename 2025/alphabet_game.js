// 遊戲狀態變數
let currentLetter = '';
let currentCase = 'upper'; // 'upper' 或 'lower'
let completedLetters = new Set();
let isDrawing = false;
let strokes = [];
let currentStroke = [];
let guideVisible = true;
let animationId = null;
let currentStrokeIndex = 0;
let animationProgress = 0;

// Canvas 元素和上下文
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const guideCanvas = document.getElementById('guideCanvas');
const guideCtx = guideCanvas.getContext('2d');

// Canvas 設定
ctx.lineWidth = 4;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';

// 初始化遊戲
function initGame() {
    createAlphabetGrid();
    updateProgress();
    setupCanvas();

    // 載入已完成的字母（從 localStorage）
    const saved = localStorage.getItem('completedLetters');
    if (saved) {
        completedLetters = new Set(JSON.parse(saved));
        updateProgress();
        createAlphabetGrid();
    }
}

// 創建字母選擇網格
function createAlphabetGrid() {
    const grid = document.getElementById('alphabetGrid');
    grid.innerHTML = '';

    letters.forEach(letter => {
        const btn = document.createElement('button');
        btn.className = 'letter-btn';
        btn.textContent = letter;
        btn.onclick = () => selectLetter(letter);

        if (completedLetters.has(letter)) {
            btn.classList.add('completed');
        }

        grid.appendChild(btn);
    });
}

// 選擇字母開始練習
function selectLetter(letter) {
    currentLetter = letter;
    document.getElementById('upperCase').textContent = letter;
    document.getElementById('lowerCase').textContent = letter.toLowerCase();

    // 切換到練習模式
    document.getElementById('alphabetGrid').style.display = 'none';
    document.getElementById('practiceArea').style.display = 'block';

    // 重置畫布和狀態
    clearCanvas();
    showGuide();
    showMessage(`請練習書寫字母 "${letter}" (${currentCase === 'upper' ? '大寫' : '小寫'})`, 'info');
}

// 切換大小寫模式
function toggleCase() {
    currentCase = currentCase === 'upper' ? 'lower' : 'upper';
    const toggleBtn = document.getElementById('caseToggle');
    toggleBtn.textContent = currentCase === 'upper' ? '大寫' : '小寫';

    clearCanvas();
    showGuide();
    showMessage(`切換到${currentCase === 'upper' ? '大寫' : '小寫'}模式`, 'info');
}

// 返回主選單
function backToMenu() {
    document.getElementById('alphabetGrid').style.display = 'grid';
    document.getElementById('practiceArea').style.display = 'none';
    currentLetter = '';
    hideGuide();
    clearCanvas();
}

// 設定 Canvas 事件監聽
function setupCanvas() {
    // 滑鼠事件
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // 觸控事件
    canvas.addEventListener('touchstart', handleTouch, {passive: false});
    canvas.addEventListener('touchmove', handleTouch, {passive: false});
    canvas.addEventListener('touchend', stopDrawing, {passive: false});

    // 防止預設的觸控行為
    canvas.addEventListener('touchstart', e => e.preventDefault());
    canvas.addEventListener('touchmove', e => e.preventDefault());
}

// 開始繪圖
function startDrawing(e) {
    isDrawing = true;
    currentStroke = [];

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    currentStroke.push({x, y, timestamp: Date.now()});
}

// 繪圖中
function draw(e) {
    if (!isDrawing) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.strokeStyle = '#007bff';
    ctx.lineTo(x, y);
    ctx.stroke();

    currentStroke.push({x, y, timestamp: Date.now()});
}

// 停止繪圖
function stopDrawing() {
    if (isDrawing) {
        isDrawing = false;
        if (currentStroke.length > 2) {
            strokes.push([...currentStroke]);
        }
        currentStroke = [];
    }
}

// 處理觸控事件
function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;

    const mouseEvent = new MouseEvent(
        e.type === 'touchstart' ? 'mousedown' :
        e.type === 'touchmove' ? 'mousemove' : 'mouseup',
        {
            clientX: touch.clientX,
            clientY: touch.clientY
        }
    );
    canvas.dispatchEvent(mouseEvent);
}

// 清除畫布
function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokes = [];
    currentStroke = [];
    document.getElementById('message').innerHTML = '';
}

// 顯示筆順提示
function showGuide() {
    if (!currentLetter) return;

    guideVisible = true;
    const letterData = getLetterStrokes(currentLetter, currentCase);

    if (letterData.length === 0) {
        showMessage('此字母的筆順資料尚未提供', 'info');
        return;
    }

    drawStaticGuide(letterData);
    animateStrokeOrder(letterData);
}

// 繪製靜態提示線
function drawStaticGuide(letterData) {
    guideCtx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);

    // 繪製輔助線
    drawGuideLines();

    // 繪製字母輪廓
    guideCtx.strokeStyle = '#e9ecef';
    guideCtx.lineWidth = 6;
    guideCtx.lineCap = 'round';
    guideCtx.lineJoin = 'round';

    letterData.forEach(stroke => {
        guideCtx.beginPath();
        guideCtx.moveTo(stroke[0].x, stroke[0].y);
        for (let i = 1; i < stroke.length; i++) {
            guideCtx.lineTo(stroke[i].x, stroke[i].y);
        }
        guideCtx.stroke();
    });
}

// 繪製輔助線（格線）
function drawGuideLines() {
    guideCtx.strokeStyle = '#f8f9fa';
    guideCtx.lineWidth = 1;
    guideCtx.setLineDash([5, 5]);

    // 水平線
    for (let y = 0; y <= guideCanvas.height; y += 50) {
        guideCtx.beginPath();
        guideCtx.moveTo(0, y);
        guideCtx.lineTo(guideCanvas.width, y);
        guideCtx.stroke();
    }

    // 垂直線
    for (let x = 0; x <= guideCanvas.width; x += 50) {
        guideCtx.beginPath();
        guideCtx.moveTo(x, 0);
        guideCtx.lineTo(x, guideCanvas.height);
        guideCtx.stroke();
    }

    guideCtx.setLineDash([]);
}

// 動畫顯示筆順
function animateStrokeOrder(letterData) {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }

    currentStrokeIndex = 0;
    animationProgress = 0;

    function animate() {
        if (!guideVisible || currentStrokeIndex >= letterData.length) {
            // 顯示筆順號碼
            showStrokeNumbers(letterData);
            return;
        }

        const currentStrokeData = letterData[currentStrokeIndex];
        const totalPoints = currentStrokeData.length;

        // 計算當前應該繪製到哪個點
        const currentPointIndex = Math.floor(animationProgress * (totalPoints - 1));

        // 重新繪製靜態指南
        drawStaticGuide(letterData);

        // 繪製動畫筆劃
        guideCtx.strokeStyle = '#ff6b6b';
        guideCtx.lineWidth = 4;
        guideCtx.lineCap = 'round';

        // 繪製已完成的筆劃
        for (let i = 0; i < currentStrokeIndex; i++) {
            const stroke = letterData[i];
            guideCtx.beginPath();
            guideCtx.moveTo(stroke[0].x, stroke[0].y);
            for (let j = 1; j < stroke.length; j++) {
                guideCtx.lineTo(stroke[j].x, stroke[j].y);
            }
            guideCtx.stroke();
        }

        // 繪製當前筆劃的部分
        if (currentPointIndex > 0) {
            guideCtx.beginPath();
            guideCtx.moveTo(currentStrokeData[0].x, currentStrokeData[0].y);
            for (let i = 1; i <= currentPointIndex; i++) {
                guideCtx.lineTo(currentStrokeData[i].x, currentStrokeData[i].y);
            }
            guideCtx.stroke();
        }

        // 繪製起始點
        guideCtx.fillStyle = '#28a745';
        guideCtx.beginPath();
        guideCtx.arc(currentStrokeData[0].x, currentStrokeData[0].y, 6, 0, 2 * Math.PI);
        guideCtx.fill();

        animationProgress += 0.02;

        if (animationProgress >= 1) {
            currentStrokeIndex++;
            animationProgress = 0;

            // 在筆劃之間暫停
            setTimeout(() => {
                animationId = requestAnimationFrame(animate);
            }, 500);
        } else {
            animationId = requestAnimationFrame(animate);
        }
    }

    animate();
}

// 顯示筆順號碼
function showStrokeNumbers(letterData) {
    // 清除之前的號碼元素
    const existingNumbers = document.querySelectorAll('.stroke-number');
    existingNumbers.forEach(el => el.remove());

    const canvasContainer = document.querySelector('.canvas-container');
    const canvasRect = guideCanvas.getBoundingClientRect();
    const containerRect = canvasContainer.getBoundingClientRect();

    letterData.forEach((stroke, index) => {
        const numberEl = document.createElement('div');
        numberEl.className = 'stroke-number';
        numberEl.textContent = index + 1;

        // 計算位置（相對於容器）
        const x = stroke[0].x * (canvasRect.width / guideCanvas.width);
        const y = stroke[0].y * (canvasRect.height / guideCanvas.height);

        numberEl.style.left = (x - 12) + 'px';
        numberEl.style.top = (y - 12) + 'px';

        canvasContainer.appendChild(numberEl);
    });
}

// 隱藏提示
function hideGuide() {
    guideVisible = false;
    guideCtx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);

    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    // 清除筆順號碼
    const existingNumbers = document.querySelectorAll('.stroke-number');
    existingNumbers.forEach(el => el.remove());
}

// 檢查筆順
function checkStroke() {
    if (!currentLetter || strokes.length === 0) {
        showMessage('請先書寫字母再檢查', 'info');
        return;
    }

    const letterData = getLetterStrokes(currentLetter, currentCase);
    const minStrokes = getMinStrokes(currentLetter);

    if (letterData.length === 0) {
        showMessage('此字母無法進行筆順檢查', 'info');
        return;
    }

    // 基本檢查
    if (strokes.length < minStrokes) {
        showMessage(`筆劃數不足！${currentLetter} 至少需要 ${minStrokes} 筆`, 'info');
        return;
    }

    // 進階筆順檢查
    const accuracy = calculateStrokeAccuracy(strokes, letterData);

    if (accuracy > 0.7) {
        showMessage('🎉 太棒了！筆順正確！', 'success');
        completedLetters.add(currentLetter);
        saveProgress();
        updateProgress();
        createAlphabetGrid();

        // 自動切換到下一個字母
        setTimeout(() => {
            const nextLetter = getNextLetter();
            if (nextLetter) {
                selectLetter(nextLetter);
            }
        }, 2000);
    } else if (accuracy > 0.5) {
        showMessage('👍 不錯！但筆順還可以更準確', 'info');
    } else {
        showMessage('💪 繼續練習！參考筆順提示', 'info');
    }
}

// 計算筆順準確度
function calculateStrokeAccuracy(userStrokes, correctStrokes) {
    if (userStrokes.length === 0 || correctStrokes.length === 0) {
        return 0;
    }

    let totalAccuracy = 0;
    let validStrokes = 0;

    for (let i = 0; i < Math.min(userStrokes.length, correctStrokes.length); i++) {
        const userStroke = userStrokes[i];
        const correctStroke = correctStrokes[i];

        if (userStroke.length < 2 || correctStroke.length < 2) continue;

        // 計算起點和終點的準確度
        const startAccuracy = calculatePointAccuracy(userStroke[0], correctStroke[0]);
        const endAccuracy = calculatePointAccuracy(
            userStroke[userStroke.length - 1],
            correctStroke[correctStroke.length - 1]
        );

        // 計算路徑相似度
        const pathAccuracy = calculatePathSimilarity(userStroke, correctStroke);

        const strokeAccuracy = (startAccuracy + endAccuracy + pathAccuracy) / 3;
        totalAccuracy += strokeAccuracy;
        validStrokes++;
    }

    return validStrokes > 0 ? totalAccuracy / validStrokes : 0;
}

// 計算點的準確度
function calculatePointAccuracy(userPoint, correctPoint) {
    const distance = calculateDistance(userPoint, correctPoint);
    const maxDistance = 50; // 允許的最大偏差
    return Math.max(0, 1 - distance / maxDistance);
}

// 計算路徑相似度
function calculatePathSimilarity(userStroke, correctStroke) {
    const userLength = calculateStrokeLength(userStroke);
    const correctLength = calculateStrokeLength(correctStroke);

    if (userLength === 0 || correctLength === 0) return 0;

    const lengthRatio = Math.min(userLength, correctLength) / Math.max(userLength, correctLength);
    return lengthRatio;
}

// 獲取下一個未完成的字母
function getNextLetter() {
    const currentIndex = letters.indexOf(currentLetter);
    for (let i = currentIndex + 1; i < letters.length; i++) {
        if (!completedLetters.has(letters[i])) {
            return letters[i];
        }
    }

    // 如果沒有找到，從頭開始找
    for (let i = 0; i < currentIndex; i++) {
        if (!completedLetters.has(letters[i])) {
            return letters[i];
        }
    }

    return null;
}

// 更新進度條
function updateProgress() {
    const progress = (completedLetters.size / letters.length) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
}

// 儲存進度
function saveProgress() {
    localStorage.setItem('completedLetters', JSON.stringify([...completedLetters]));
}

// 顯示訊息
function showMessage(text, type = 'info') {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;

    // 自動隱藏訊息
    setTimeout(() => {
        messageEl.textContent = '';
        messageEl.className = 'message';
    }, 3000);
}

// 重置遊戲進度
function resetProgress() {
    if (confirm('確定要重置所有進度嗎？')) {
        completedLetters.clear();
        localStorage.removeItem('completedLetters');
        updateProgress();
        createAlphabetGrid();
        showMessage('進度已重置', 'info');
    }
}

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', initGame);

// 添加鍵盤快捷鍵
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        backToMenu();
    } else if (e.key === ' ') {
        e.preventDefault();
        if (currentLetter) {
            clearCanvas();
        }
    } else if (e.key === 'Enter') {
        if (currentLetter) {
            checkStroke();
        }
    }
});

// 添加視窗大小調整處理
window.addEventListener('resize', () => {
    // 重新調整 canvas 大小和位置
    if (guideVisible && currentLetter) {
        setTimeout(() => {
            showGuide();
        }, 100);
    }
});

