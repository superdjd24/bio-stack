/**
 * BIOSTACK ELITE ENGINE v7.1
 * RE-CALIBRATED MASTER BUILD
 * Includes: SPA Flow, Bluetooth Fix, and v6.6 Grid Mapping
 */

// Global Variables
let bpm = 0;
let currentMusc = "";
let currentView = "front";
let isTrain = false;
let hrHistory = [];
let totalCalories = 0;
let lastTimestamp = null;

const DB = {
    'Trapezoids': ['Dumbbell Shrugs', 'Barbell Shrugs'],
    'Deltoids': ['Lateral Raises', 'Military Press'],
    'Pectorals': ['Bench Press', 'Incline Press'],
    'Biceps': ['Barbell Curls', 'Hammer Curls'],
    'Triceps': ['Pushdowns', 'Dips'],
    'Forearms': ['Wrist Curls'],
    'Abdominals': ['Leg Raises', 'Crunches'],
    'Quads': ['Squats', 'Leg Press'],
    'Lats': ['Lat Pulldowns', 'Bent Over Rows'],
    'Glutes': ['Hip Thrusts'],
    'Hamstrings': ['Deadlifts'],
    'Calves': ['Calf Raises']
};

/**
 * INITIALIZATION & BLUETOOTH
 */
async function initSystem() {
    const w = document.getElementById('user-weight').value;
    const h = document.getElementById('user-height').value;
    const a = document.getElementById('user-age').value;

    if (!w || !h || !a) {
        alert("Precision tracking requires Weight, Height, and Age.");
        return;
    }

    try {
        const device = await navigator.bluetooth.requestDevice({ 
            filters: [{ services: ['heart_rate'] }] 
        });
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('heart_rate');
        const char = await service.getCharacteristic('heart_rate_measurement');
        
        await char.startNotifications();
        
        localStorage.setItem('bio_weight', w);
        localStorage.setItem('bio_age', a);
        localStorage.setItem('bio_height', h);
        
        document.getElementById('login-screen').style.display = 'none';
        const dash = document.getElementById('main-dashboard');
        dash.style.display = 'block';
        setTimeout(() => { dash.style.opacity = '1'; }, 50);

        generateHitMap();

        char.addEventListener('characteristicvaluechanged', (e) => {
            const val = e.target.value.getUint8(1);
            bpm = val;
            const hrDisplay = document.getElementById('hr-val');
            if (hrDisplay) hrDisplay.innerText = bpm;
            calculateCals(bpm);
            hrHistory.push(bpm);
            if (hrHistory.length > 55) hrHistory.shift();
            drawSparkline();
        });

    } catch (e) {
        alert("Handshake Failed: " + e.message);
    }
}

/**
 * CALORIE ENGINE
 */
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

/**
 * GRID MAPPING - RESTORED v6.6 CALIBRATION
 */
function generateHitMap() {
    const map = document.getElementById('touch-map');
    if (!map) return;
    map.innerHTML = "";
    
    // Front Grid: Calibrated for v6.6 Upward Shift
    const fG = [
        "Trapezoids", "Trapezoids", "TOGGLE_BACK",   // Row 1
        "Deltoids", "Pectorals", "Deltoids",       // Row 2
        "Biceps", "Abdominals", "Biceps",          // Row 3
        "Biceps", "Abdominals", "Biceps",          // Row 4
        "Forearms", "Quads", "Forearms",           // Row 5
        "", "Quads", ""                            // Row 6
    ];

    // Back Grid: Calibrated for Hamstring precision
    const bG = [
        "TOGGLE_FRONT", "Trapezoids", "Trapezoids", // Row 1
        "Triceps", "Lats", "Triceps",              // Row 2
        "Triceps", "Lats", "Triceps",              // Row 3
        "Glutes", "Glutes", "Glutes",              // Row 4
        "Hamstrings", "Hamstrings", "Hamstrings",  // Row 5 (Wide Hamstrings)
        "Hamstrings", "Calves", "Hamstrings"       // Row 6 (Wide Hamstrings)
    ];

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
    if (isTrain) return;
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

/**
 * GRAPH ENGINE
 */
function drawSparkline() {
    const canvas = document.getElementById('sparkline-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);
    if (hrHistory.length < 3) return;
    let color = '#00f2ff'; let glow = 'rgba(0, 242, 255, 0.4)';
    if (bpm > 140) { color = '#ff0044'; glow = 'rgba(255, 0, 68, 0.4)'; }
    else if (bpm > 110) { color = '#ffaa00'; glow = 'rgba(255, 170, 0, 0.4)'; }
    const step = rect.width / (hrHistory.length - 1);
    const points = hrHistory.map((val, i) => ({ x: i * step, y: rect.height - ((val - 60) / 100) * rect.height }));
    drawCurve(ctx, points, glow, 8);
    drawCurve(ctx, points, color, 3);
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
function startTraining() { 
    isTrain = true; closeAction(); 
    document.getElementById('sidebar').style.display = "none"; 
}
