let video;
let handPose;
let hands = [];

// 系統狀態：START_SCREEN (遊戲說明首頁), LOADING (載入中), PLAYING (進行中)
let systemState = "START_SCREEN"; 
let bootProgress = 0; 
let isModelReady = false; 

// 遊戲邏輯與計分
let score = 0;
let itemX, itemY;
let itemSpeed = 4;
let itemType = ""; 
let itemName = "";

let bucketX;
let bucketTargetX;
let bucketY;
let bucketWidth, bucketHeight;

// 點擊按鈕偵測範圍
let btnX, btnY, btnW, btnH;

// 【優化】將名稱與類型綁定成物件陣列，徹底根除字串比對造成的感應錯誤 Bug
const recyclablePool = [
    { name: "⚡ 鋰電池核心", type: "RECYCLABLE" },
    { name: "💾 量子磁碟", type: "RECYCLABLE" },
    { name: "🔌 奈米線材", type: "RECYCLABLE" },
    { name: "📱 壞處理器", type: "RECYCLABLE" }
];

const trashPool = [
    { name: "☢️ 輻射廢料", type: "TRASH" },
    { name: "⚠️ 工業機油", type: "TRASH" },
    { name: "📦 裂解塑料", type: "TRASH" },
    { name: "🧪 實驗殘渣", type: "TRASH" }
];

let currentGesture = "防禦系統準備就緒...";

function preload() {
    handPose = ml5.handPose(modelReady);
}

function modelReady() {
    console.log("AI 模型加載成功！");
    isModelReady = true;
}

function setup() {
    let canvasW = min(windowWidth - 20, 640);
    let canvasH = (canvasW / 4) * 3; 
    
    let canvas = createCanvas(canvasW, canvasH);
    canvas.parent('game-container');
    rectMode(CENTER);

    bucketWidth = width * 0.23;
    bucketHeight = height * 0.1;

    // 設定按鈕座標
    btnX = width / 2;
    btnY = height * 0.75;
    btnW = width * 0.4;
    btnH = height * 0.12;

    // 開啟攝影機
    video = createCapture(VIDEO);
    video.size(canvasW, canvasH);
    video.hide();

    // 啟動 AI 手勢追蹤
    handPose.detectStart(video, gotHands);

    resetItem();
    bucketX = width / 2;
    bucketY = height - (bucketHeight / 2 + 25); // 【修正】精準修正桶子 Y 軸核心物理判定點
    bucketTargetX = width / 2;
}

function gotHands(results) {
    hands = results;
}

function draw() {
    // 攝影機水平鏡像翻轉
    push();
    translate(width, 0);
    scale(-1, 1);
    image(video, 0, 0, width, height);
    pop();

    background(10, 10, 20, 215);

    if (systemState === "START_SCREEN") {
        drawStartScreen();
    } else if (systemState === "LOADING") {
        drawLoadingScreen();
    } else if (systemState === "PLAYING") {
        drawGameCore();
    }
}

// 📄 1. 遊戲說明首頁
function drawStartScreen() {
    fill(0, 242, 254);
    noStroke();
    textSize(width * 0.055);
    textAlign(CENTER, CENTER);
    text("🛸 賽博垃圾分類大挑戰", width / 2, height * 0.2);

    stroke(0, 242, 254, 50);
    fill(255, 255, 255, 10);
    rect(width / 2, height * 0.48, width * 0.85, height * 0.32, 8);

    noStroke();
    fill(255);
    textSize(width * 0.035);
    textAlign(LEFT, CENTER);
    
    let textSpacing = height * 0.06;
    text("【互動核心規則】", width * 0.12, height * 0.37);
    
    fill(0, 255, 153);
    text("🖐️ 張開手掌：控制光盾往 【左邊】（回收電池/晶片）", width * 0.12, height * 0.37 + textSpacing);
    
    fill(255, 0, 127);
    text("✊ 捏緊拳頭：控制光盾往 【右邊】（丟棄輻射/廢料）", width * 0.12, height * 0.37 + textSpacing * 2);
    
    fill(255, 200);
    textSize(width * 0.03);
    text("※ 提示：請伸出單手面對鏡頭，無須點擊鍵盤滑鼠。", width * 0.12, height * 0.37 + textSpacing * 3);

    stroke(0, 242, 254);
    strokeWeight(2);
    if (mouseX > btnX - btnW/2 && mouseX < btnX + btnW/2 && mouseY > btnY - btnH/2 && mouseY < btnY + btnH/2) {
        fill(0, 242, 254, 60); 
        cursor(HAND);
    } else {
        fill(0, 242, 254, 20);
        cursor(ARROW);
    }
    rect(btnX, btnY, btnW, btnH, 6);

    noStroke();
    fill(0, 242, 254);
    textSize(width * 0.04);
    textAlign(CENTER, CENTER);
    text("進入系統 ➔", btnX, btnY);
}

function mousePressed() {
    if (systemState === "START_SCREEN") {
        if (mouseX > btnX - btnW/2 && mouseX < btnX + btnW/2 && mouseY > btnY - btnH/2 && mouseY < btnY + btnH/2) {
            systemState = "LOADING"; 
        }
    }
}

// 🤖 2. 預備開始畫面
function drawLoadingScreen() {
    cursor(ARROW);
    if (bootProgress < 75) {
        bootProgress += 2.0; 
    } else if (bootProgress >= 75 && bootProgress < 99 && isModelReady) {
        bootProgress += 3.5; 
    } else if (isModelReady && bootProgress >= 99) {
        bootProgress = 100;  
    }

    if (bootProgress >= 100) {
        systemState = "PLAYING";
        return;
    }

    stroke(0, 242, 254, 80);
    strokeWeight(1);
    noFill();
    rect(width / 2, height / 2, width * 0.8, height * 0.5, 8);

    noStroke();
    fill(0, 242, 254);
    textSize(width * 0.045);
    textAlign(CENTER, CENTER);
    text("// AI 神經網路同步中 //", width / 2, height / 2 - (height * 0.1));
    
    textSize(width * 0.032);
    fill(255, 200);
    let displayPercent = floor(bootProgress);
    text("影像矩陣讀取中... " + displayPercent + "%", width / 2, height / 2);

    noFill();
    stroke(0, 242, 254, 50);
    rect(width / 2, height / 2 + (height * 0.1), width * 0.5, 12, 6);
    
    fill(0, 242, 254, 200);
    noStroke();
    let maxBarW = width * 0.5 - 4;
    let currentBarWidth = map(displayPercent, 0, 100, 0, maxBarW);
    
    rectMode(LEFT); 
    rect(width / 2 - maxBarW/2, height / 2 + (height * 0.1), currentBarWidth, 8, 4);
    rectMode(CENTER); 
}

// 🎮 3. 遊戲核心主體
function drawGameCore() {
    drawTechHUD();
    processHandTracking();
    manageFallingObjects();
    updateTechBucket();
    drawUI();
}

function drawTechHUD() {
    strokeWeight(1);
    fill(0, 255, 153, 12);
    stroke(0, 255, 153, 60);
    rect(width * 0.25, height / 2, width / 2 - 12, height - 20, 8);
    
    fill(255, 0, 127, 12);
    stroke(255, 0, 127, 60);
    rect(width * 0.75, height / 2, width / 2 - 12, height - 20, 8);

    noStroke();
    textSize(width * 0.028); 
    fill(0, 255, 153);
    textAlign(LEFT, TOP);
    text(">>【核心回收】\n🖐️ 請張開手掌\n(電池/晶片/線材)", 15, 20);

    fill(255, 0, 127);
    textAlign(RIGHT, TOP);
    text("【終端廢料】 <<\n✊ 請握拳/捏緊\n(輻射/機油/塑料)", width - 15, 20);
}

function processHandTracking() {
    if (hands.length > 0) {
        let hand = hands[0];
        
        let thumbX = width - hand.thumb_tip.x;
        let thumbY = hand.thumb_tip.y;
        let indexX = width - hand.index_finger_tip.x;
        let indexY = hand.index_finger_tip.y;

        let d = dist(thumbX, thumbY, indexX, indexY);

        for (let i = 0; i < hand.keypoints.length; i++) {
            let kp = hand.keypoints[i];
            let kX = width - kp.x;
            let kY = kp.y;
            fill(0, 242, 254, 220);
            noStroke();
            ellipse(kX, kY, 5, 5);
        }

        let closeThresh = width * 0.08;
        let openThresh = width * 0.14;

        if (d < closeThresh) { 
            currentGesture = "系統狀態: 偵測到脈衝拳壓 // 磁場調向右側";
            bucketTargetX = width * 0.75;
            
            stroke(255, 0, 127, 230);
            strokeWeight(3);
            line(thumbX, thumbY, indexX, indexY);
            
            fill(255, 0, 127);
            noStroke();
            ellipse((thumbX + indexX) / 2, (thumbY + indexY) / 2, 8, 8);
        } else if (d > openThresh) {
            currentGesture = "系統狀態: 偵測到全面張力 // 磁場調向左側";
            bucketTargetX = width * 0.25;
            
            stroke(0, 255, 153, 230);
            strokeWeight(2);
            line(thumbX, thumbY, indexX, indexY);
        }
    } else {
        currentGesture = "安全警告: 未偵測到生物手勢訊號...";
    }
}

function resetItem() {
    itemY = -30;
    itemX = random(width * 0.15, width * 0.85);
    itemSpeed = (height * 0.009) + (score * 0.04); // 微調掉落速度，讓感應時間更充裕

    // 【修正】改用明確的物件屬性選取，不使用隨機字串比對
    if (random(1) > 0.5) {
        let selected = random(recyclablePool);
        itemName = selected.name;
        itemType = selected.type; // 綁定為 "RECYCLABLE"
    } else {
        let selected = random(trashPool);
        itemName = selected.name;
        itemType = selected.type; // 綁定為 "TRASH"
    }
}

function manageFallingObjects() {
    itemY += itemSpeed;

    push();
    stroke(0, 242, 254, 200);
    strokeWeight(1.2);
    fill(5, 10, 25, 240);
    let cardW = width * 0.28;
    rect(itemX, itemY, cardW, 32, 4);

    noStroke();
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(width * 0.026);
    text(itemName, itemX, itemY);
    pop();

    // 【核心修復】重新優化 AABB 盒子碰撞演算法，擴大桶子判定的物理緩衝區，確保絕對感應得到
    let withinX = (itemX > bucketX - bucketWidth / 2 - 10) && (itemX < bucketX + bucketWidth / 2 + 10);
    let withinY = (itemY >= bucketY - bucketHeight / 2 - 15) && (itemY <= bucketY + bucketHeight / 2 + 15);

    if (withinX && withinY) {
        // 直接用寫死的底層 Tag 比對，杜絕中文編碼不符的錯誤
        if ((itemType === "RECYCLABLE" && bucketX < width / 2) || 
            (itemType === "TRASH" && bucketX > width / 2)) {
            score += 10;
        } else {
            score = max(0, score - 5);
        }
        resetItem();
    }

    if (itemY > height + 40) {
        resetItem();
    }
}

function updateTechBucket() {
    bucketX = lerp(bucketX, bucketTargetX, 0.16);

    push();
    if (bucketX < width / 2) {
        stroke(0, 255, 153);
        fill(0, 255, 153, 35);
        drawingContext.shadowBlur = 15;
        drawingContext.shadowColor = 'rgba(0, 255, 153, 0.7)';
    } else {
        stroke(255, 0, 127);
        fill(255, 0, 127, 35);
        drawingContext.shadowBlur = 15;
        drawingContext.shadowColor = 'rgba(255, 0, 127, 0.7)';
    }
    
    strokeWeight(2);
    rect(bucketX, bucketY, bucketWidth, bucketHeight, 5);

    drawingContext.shadowBlur = 0;
    noStroke();
    fill(255);
    textSize(width * 0.025);
    textAlign(CENTER, CENTER);
    text(bucketX < width / 2 ? "【 資源回收 】" : " 【 一般廢料 】", bucketX, bucketY);
    pop();
}

function drawUI() {
    fill(0, 242, 254);
    noStroke();
    textSize(width * 0.035);
    textAlign(CENTER, TOP);
    text("核心同步積分: " + score, width / 2, height * 0.18); 

    rectMode(CENTER);
    fill(5, 5, 12, 240);
    stroke(0, 242, 254, 70);
    strokeWeight(1);
    rect(width / 2, height - 20, width * 0.85, 22, 4);

    noStroke();
    fill(0, 242, 254);
    textSize(width * 0.022);
    textAlign(CENTER, CENTER);
    text(currentGesture, width / 2, height - 20);
}

function windowResized() {
    let canvasW = min(windowWidth - 20, 640);
    let canvasH = (canvasW / 4) * 3;
    resizeCanvas(canvasW, canvasH);
    bucketWidth = width * 0.23;
    bucketHeight = height * 0.1;
    bucketY = height - (bucketHeight / 2 + 25);
    btnX = width / 2;
    btnY = height * 0.75;
    btnW = width * 0.4;
    btnH = height * 0.12;
}