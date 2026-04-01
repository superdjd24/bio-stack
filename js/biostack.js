/**
 * BIOSTACK ELITE ENGINE v9.4
 * Calorie Fix, Color Refinement, Ergo HUD
 */

let bpm = 0;
let currentView = "front";
let isTrain = false;
let isCalibrating = false;
let activeExercise = null;
let tempMaxHr = 0;
let peakBuffer = [];
let setCounter = 0;

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

/** UPDATED COLOR MAP v9.4 **/
function getEliteColor(val) {
    if (val < 80) return '#00f2ff';  // Blue
    if (val < 100) return '#00ff88'; // Green
    if (val < 115) return '#ffff00'; // Yellow
    if (val < 130) return '#ffaa00'; // Orange
    return '#ff0044';                // Red (Over 130/145)
}

async function initSystem() {
    const w = document.getElementById('user-weight').value;
    const a = document.getElementById('user-age').value;
    if (!w || !a) return alert("Weight and Age required.");
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
            const hrEl = document.getElementById('hr-val');
            hrEl.innerText = bpm;
            hrEl.style.color = getEliteColor(bpm);
            
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

/** CALORIE MATH v9.4 - Factor of 10 applied **/
function calculateCals(currentBpm) {
    const weight = localStorage.getItem('bio_weight') || 180;
    const age = localStorage.getItem('bio_age') || 30;
    const now = Date.now();
    if (!lastTimestamp) { lastTimestamp = now; return; }
    const durationHours = (now - lastTimestamp) / (1000 * 60 * 60);
    lastTimestamp = now;
    
    // Base ACSM formula
    let calPerMinute = ( (age * 0.2017) + (weight * 0.09036) + (currentBpm * 0.6309) - 55.0969 ) / 4.184;
    if (calPerMinute < 0) calPerMinute = 0;
    
    // Apply the 10x Correction Factor
    const sliceCals = ((calPerMinute / 60) * (durationHours * 60)) * 10;
    totalCalories += sliceCals;
    document.getElementById('total-cal').innerText = Math.round(totalCalories);
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
        timerText.innerText = "LOOK-BACK: " + timeLeft + "s";
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
    isTrain = true; isCalibrating = false;
    const newEx = document.getElementById('ex-name-modal').innerText;
    activeExercise = newEx;
    document.getElementById('active-ex-tag').innerText = "WORK SET: " + activeExercise;
    const savedMax = localStorage.getItem('maxhr_' + activeExercise) || 190;
    const contextBox = document.getElementById('active-ex-context');
    contextBox.innerText = `Target HR for ${activeExercise}: ${savedMax}`;
    contextBox.style.display = 'block';
    
    setCounter = 0;
    const items = document.querySelectorAll('#set-bar-sidebar .intensity-item');
    items.forEach(i => i.remove());
    
    document.getElementById('hud-in-flow').style.display = "block";
    resetSetHUD();
    closeAction();
    document.getElementById('sidebar').style.display = "none";
}

function resetSetHUD() {
    const btn = document.getElementById('set-main-btn');
    btn.innerText = "END SET";
    btn.style.background = 'var(--glow-blue)';
    btn.onclick = startSetTimer;
    document.getElementById('set-timer-display').style.display = "none";
    peakBuffer = []; 
}

function startSetTimer() {
    document.getElementById('set-main-btn').style.display = "none";
    const timerText = document.getElementById('set-timer-display');
    timerText.style.display = "block";
    let timeLeft = 20;
    const countdown = setInterval(() => {
        timeLeft--;
        timerText.innerText = "CAPTURE: " + timeLeft + "s";
        if (timeLeft <= 0) { clearInterval(countdown); processSetResult(); }
    }, 1000);
}

function processSetResult() {
    const savedMax = localStorage.getItem('maxhr_' + activeExercise) || 190;
    const peakInLast20 = peakBuffer.length > 0 ? Math.max(...peakBuffer.map(p => p.bpm)) : bpm;
    setCounter++;
    const ratio = peakInLast20 / savedMax;
    const percent = Math.round(ratio * 100);
    const barPx = Math.round(ratio * 110); 

    const container = document.getElementById('set-bar-sidebar');
    const hud = document.getElementById('hud-in-flow');
    const item = document.createElement('div');
    item.className = 'intensity-item';
    const label = document.createElement('span');
    label.className = 'intensity-label';
    label.innerText = `Set${setCounter}`;

    const bar = document.createElement('div');
    bar.className = 'set-bar';
    
    // FIX: Set Bars default to Teal/Blue unless logic dictates otherwise
    if (ratio > 0.85) bar.style.background = '#ff0044';
    else if (ratio > 0.70) bar.style.background = '#ffaa00';
    else bar.style.background = 'var(--glow-blue)';

    const inner = document.createElement('span');
    inner.className = 'bar-inner-label';
    inner.innerText = `${percent}%`;
    bar.appendChild(inner);
    item.appendChild(label);
    item.appendChild(bar);
    
    // Insert BEFORE the HUD so buttons stay at bottom
    container.insertBefore(item, hud);

    requestAnimationFrame(() => {
        setTimeout(() => {
            bar.style.width = Math.max(35, barPx) + "px";
            bar.classList.add('revealed');
        }, 50);
    });

    const btn = document.getElementById('set-main-btn');
    btn.innerText = "START NEXT SET";
    btn.style.background = '#00ff88'; 
    btn.style.display = "block";
    btn.onclick = resetSetHUD;
    document.getElementById('set-timer-display').style.display = "none";
}

function exitTraining() {
    isTrain = false;
    document.getElementById('hud-in-flow').style.display = "none";
    document.getElementById('active-ex-context').style.display = 'none';
    document.getElementById('sidebar').style.display = "block";
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
    
    ctx.strokeStyle = getEliteColor(bpm);
    ctx.lineWidth = 3;
    ctx.shadowBlur = 10;
    ctx.shadowColor = getEliteColor(bpm);
    const step = rect.width / (hrHistory.length - 1);
    const points = hrHistory.map((val, i) => ({ x: i * step, y: rect.height - ((val - 60) / 100) * rect.height }));
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) { ctx.lineTo(points[i].x, points[i].y); }
    ctx.stroke();
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

function closeAction() { document.getElementById('menu-action').style.display = 'none'; }
