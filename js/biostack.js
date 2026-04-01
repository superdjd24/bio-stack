/**
 * BIOSTACK ELITE ENGINE v8.9
 * Hard-Paint Unit Fix
 */

let bpm = 0;
let currentView = "front";
let isTrain = false;
let isCalibrating = false;
let activeExercise = null;
let tempMaxHr = 0;
let peakBuffer = [];

let hrHistory = [];
let totalCalories = 0;
let lastTimestamp = null;

const DB = {
    'Trapezoids': ['Dumbbell Shrugs', 'Barbell Shrugs'], 'Deltoids': ['Lateral Raises', 'Military Press'],
    'Pectorals': ['Bench Press', 'Incline Press'], 'Biceps': ['Barbell Curls', 'Hammer Curls'],
    'Triceps': ['Pushdowns', 'Dips'], 'Forearms': ['Wrist Curls'],
    'Abdominals': ['Leg Raises', 'Crunches'], 'Quads': ['Squats', 'Leg Press'],
    'Lats': ['Lat Pulldowns', 'Bent Over Rows'], 'Glutes': ['Hip Thrusts'],
    'Hamstrings': ['Deadlifts'], 'Calves': ['Calf Raises']
};

async function initSystem() {
    const w = document.getElementById('user-weight').value;
    const a = document.getElementById('user-age').value;
    if (!w || !a) return alert("Fields required.");
    try {
        const device = await navigator.bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }] });
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('heart_rate');
        const char = await service.getCharacteristic('heart_rate_measurement');
        await char.startNotifications();
        localStorage.setItem('bio_weight', w);
        localStorage.setItem('bio_age', a);
        document.getElementById('login-screen').style.display = 'none';
        const dash = document.getElementById('main-dashboard');
        dash.style.display = 'block';
        setTimeout(() => { dash.style.opacity = '1'; }, 50);
        generateHitMap();
        char.addEventListener('characteristicvaluechanged', (e) => {
            bpm = e.target.value.getUint8(1);
            document.getElementById('hr-val').innerText = bpm;
            const now = Date.now();
            if (isCalibrating && bpm > tempMaxHr) tempMaxHr = bpm;
            peakBuffer.push({ bpm: bpm, time: now });
            peakBuffer = peakBuffer.filter(p => now - p.time < 20000);
            calculateCals(bpm);
            hrHistory.push(bpm);
            if (hrHistory.length > 55) hrHistory.shift();
            drawSparkline();
        });
    } catch (e) { alert("Link Failed: " + e.message); }
}

function calculateCals(currentBpm) {
    const weight = localStorage.getItem('bio_weight') || 180;
    const age = localStorage.getItem('bio_age') || 30;
    const now = Date.now();
    if (!lastTimestamp) { lastTimestamp = now; return; }
    const durationHours = (now - lastTimestamp) / (1000 * 60 * 60);
    lastTimestamp = now;
    let calPerMinute = ( (age * 0.2017) + (weight * 0.09036) + (currentBpm * 0.6309) - 55.0969 );
    if (calPerMinute < 0) calPerMinute = 0;
    const sliceCals = (calPerMinute / 60) * (durationHours * 60);
    totalCalories += sliceCals;
    const calDisplay = document.getElementById('total-cal');
    if (calDisplay) calDisplay.innerText = Math.round(totalCalories);
}

function calibrateExercise() {
    isCalibrating = true; isTrain = false; tempMaxHr = 0;
    activeExercise = document.getElementById('ex-name-modal').innerText;
    document.getElementById('active-ex-tag').innerText = "CALIBRATING: " + activeExercise;
    closeAction();
    document.getElementById('sidebar').style.display = "none";
    document.getElementById('calibration-hud').style.display = "block";
}

function startCalTimer() {
    document.getElementById('cal-main-btn').style.display = "none";
    const timerText = document.getElementById('cal-timer-display');
    timerText.style.display = "block";
    let timeLeft = 20;
    const countdown = setInterval(() => {
        timeLeft--;
        timerText.innerText = "LOOK-BACK ACTIVE: " + timeLeft + "s";
        if (timeLeft <= 0) { clearInterval(countdown); lockMaxHr(); }
    }, 1000);
}

function lockMaxHr() {
    isCalibrating = false;
    const bufferMax = peakBuffer.length > 0 ? Math.max(...peakBuffer.map(p => p.bpm)) : 0;
    const trueMax = Math.max(tempMaxHr, bufferMax);
    localStorage.setItem('maxhr_' + activeExercise, trueMax);
    document.getElementById('active-ex-tag').innerText = "CALIBRATED: " + trueMax + " BPM";
    document.getElementById('calibration-hud').style.display = "none";
    document.getElementById('sidebar').style.display = "block";
}

function startTraining() {
    isTrain = true;
    const newEx = document.getElementById('ex-name-modal').innerText;
    if (newEx !== activeExercise) { document.getElementById('set-bar-sidebar').innerHTML = ""; }
    activeExercise = newEx;
    document.getElementById('active-ex-tag').innerText = "WORK SET: " + activeExercise;
    document.getElementById('training-hud').style.display = "block";
    document.getElementById('set-main-btn').style.display = "block";
    document.getElementById('set-timer-display').style.display = "none";
    closeAction();
    document.getElementById('sidebar').style.display = "none";
}

function startSetTimer() {
    document.getElementById('set-main-btn').style.display = "none";
    const timerText = document.getElementById('set-timer-display');
    timerText.style.display = "block";
    let timeLeft = 20;
    const countdown = setInterval(() => {
        timeLeft--;
        timerText.innerText = "PEAK CAPTURE: " + timeLeft + "s";
        if (timeLeft <= 0) { clearInterval(countdown); processSetResult(); }
    }, 1000);
}

function processSetResult() {
    const savedMax = localStorage.getItem('maxhr_' + activeExercise) || 190;
    const peakInLast20 = peakBuffer.length > 0 ? Math.max(...peakBuffer.map(p => p.bpm)) : bpm;
    
    // Calculate Pixel width based on 100px sidebar
    const intensityPercent = (peakInLast20 / savedMax);
    const targetPx = Math.round(intensityPercent * 100);
    
    const barContainer = document.getElementById('set-bar-sidebar');
    const bar = document.createElement('div');
    bar.className = 'set-bar';
    bar.style.width = "0px"; // Unit Unit Unit!
    
    if (intensityPercent > 0.85) bar.style.background = '#ff0044';
    else if (intensityPercent > 0.70) bar.style.background = '#ffaa00';
    else bar.style.background = '#00f2ff';

    barContainer.appendChild(bar);
    
    // HARD-PAINT: Force width update in the next frame
    window.requestAnimationFrame(() => {
        setTimeout(() => {
            bar.style.width = Math.max(10, Math.min(targetPx, 100)) + "px";
        }, 50);
    });

    document.getElementById('set-main-btn').style.display = "block";
    document.getElementById('set-timer-display').style.display = "none";
}

function exitTraining() {
    isTrain = false;
    document.getElementById('training-hud').style.display = "none";
    document.getElementById('sidebar').style.display = "block";
    document.getElementById('active-ex-tag').innerText = "NO ACTIVE EXERCISE";
}

function drawSparkline() {
    const canvas = document.getElementById('sparkline-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr); ctx.clearRect(0, 0, rect.width, rect.height);
    if (hrHistory.length < 3) return;
    const savedMax = activeExercise ? localStorage.getItem('maxhr_' + activeExercise) : null;
    const baselineMax = savedMax ? parseInt(savedMax) : 190;
    let color = '#00f2ff'; let glow = 'rgba(0, 242, 255, 0.4)';
    if (bpm > (baselineMax * 0.85)) { color = '#ff0044'; glow = 'rgba(255, 0, 68, 0.4)'; }
    else if (bpm > (baselineMax * 0.70)) { color = '#ffaa00'; glow = 'rgba(255, 170, 0, 0.4)'; }
    const step = rect.width / (hrHistory.length - 1);
    const points = hrHistory.map((val, i) => ({ x: i * step, y: rect.height - ((val - 60) / (baselineMax - 60)) * rect.height }));
    drawCurve(ctx, points, glow, 8); drawCurve(ctx, points, color, 3);
}

function generateHitMap() {
    const map = document.getElementById('touch-map');
    if (!map) return;
    map.innerHTML = "";
    const fG = ["Trapezoids", "Trapezoids", "TOGGLE_BACK", "Deltoids", "Pectorals", "Deltoids", "Biceps", "Abdominals", "Biceps", "Biceps", "Abdominals", "Biceps", "Forearms", "Quads", "Forearms", "", "Quads", ""];
    const bG = ["TOGGLE_FRONT", "Trapezoids", "Trapezoids", "Triceps", "Lats", "Triceps", "Triceps", "Lats", "Triceps", "Glutes", "Glutes", "Glutes", "Hamstrings", "Hamstrings", "Hamstrings", "Hamstrings", "Calves", "Hamstrings"];
    const active = (currentView === "front") ? fG : bG;
    active.forEach((m) => {
        const div = document.createElement('div');
        div.className = "hit";
        if (m === "TOGGLE_BACK") div.onclick = () => switchView('back');
        else if (m === "TOGGLE_FRONT") div.onclick = () => switchView('front');
        else if (m !== "") div.onclick = () => selectMuscle(m);
        map.appendChild(div);
    });
}

function switchView(view) {
    currentView = view;
    document.querySelectorAll('.muscle-overlay').forEach(img => img.style.opacity = 0);
    document.querySelectorAll('.stack-layer').forEach(l => l.classList.remove('layer-visible'));
    if (view === 'front') {
        document.getElementById('btn-to-back').classList.add('layer-visible');
        ['trapezoids','deltoids','pectorals','biceps','forearms','abdominals','quads'].forEach(m => {
            const el = document.getElementById(`overlay-${m}`);
            if (el) el.classList.add('layer-visible');
        });
    } else {
        document.getElementById('base-back').classList.add('layer-visible');
        document.getElementById('btn-to-front').classList.add('layer-visible');
        ['lats','triceps','glutes','hamstrings','calves'].forEach(m => {
            const el = document.getElementById(`overlay-${m}`);
            if (el) el.classList.add('layer-visible');
        });
    }
    generateHitMap();
}

function selectMuscle(m) {
    if ((isTrain || isCalibrating)) return;
    document.querySelectorAll('.muscle-overlay').forEach(img => img.style.opacity = 0);
    const overlay = document.getElementById(`overlay-${m.toLowerCase()}`);
    if (overlay) overlay.style.opacity = 0.5;
    document.getElementById('musc-header').innerText = "TARGET: " + m;
    const picker = document.getElementById('exercise-picker');
    picker.innerHTML = "";
    DB[m].forEach(ex => {
        const b = document.createElement('button');
        b.className = "list-btn";
        b.innerText = ex;
        b.onclick = () => {
            document.getElementById('ex-name-modal').innerText = ex;
            document.getElementById('menu-action').style.display = 'block';
        };
        picker.appendChild(b);
    });
}

function drawCurve(ctx, p, style, width) {
    ctx.beginPath(); ctx.strokeStyle = style; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.moveTo(p[0].x, p[0].y);
    for (let i = 1; i < p.length - 2; i++) {
        const xc = (p[i].x + p[i + 1].x) / 2;
        const yc = (p[i].y + p[i + 1].y) / 2;
        ctx.quadraticCurveTo(p[i].x, p[i].y, xc, yc);
    }
    ctx.quadraticCurveTo(p[p.length-2].x, p[p.length-2].y, p[p.length-1].x, p[p.length-1].y);
    ctx.stroke();
}

function closeAction() { document.getElementById('menu-action').style.display = 'none'; }
