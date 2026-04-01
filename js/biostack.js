/**
 * BIOSTACK ELITE ENGINE v7.5
 * Exercise-Specific Calibration Engine
 */

let bpm = 0;
let currentView = "front";
let isTrain = false;
let isCalibrating = false;
let activeExercise = null;
let tempMaxHr = 0;

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

async function initSystem() {
    const w = document.getElementById('user-weight').value;
    const h = document.getElementById('user-height').value;
    const a = document.getElementById('user-age').value;
    if (!w || !h || !a) return alert("All fields required.");

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
            
            // If calibrating, track the highest value seen
            if (isCalibrating && bpm > tempMaxHr) {
                tempMaxHr = bpm;
            }

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
    isCalibrating = true;
    isTrain = true;
    tempMaxHr = 0;
    activeExercise = document.getElementById('ex-name-modal').innerText;
    document.getElementById('active-ex-tag').innerText = "CALIBRATING: " + activeExercise;
    closeAction();
    document.getElementById('sidebar').style.display = "none";
    
    // Add a finish button or time-out? Let's use a "Done" click on the pill
    document.getElementById('hr-pill').onclick = stopCalibration;
    alert("Calibration Mode: Perform your heaviest set of " + activeExercise + ". Tapping the Heart Rate Pill when finished will save your peak.");
}

function stopCalibration() {
    if (!isCalibrating) return;
    isCalibrating = false;
    isTrain = false;
    localStorage.setItem('maxhr_' + activeExercise, tempMaxHr);
    document.getElementById('active-ex-tag').innerText = "CALIBRATED: " + activeExercise + " (" + tempMaxHr + " BPM)";
    document.getElementById('sidebar').style.display = "block";
    document.getElementById('hr-pill').onclick = null; // Remove the listener
}

function startTraining() {
    isTrain = true;
    activeExercise = document.getElementById('ex-name-modal').innerText;
    const savedMax = localStorage.getItem('maxhr_' + activeExercise);
    document.getElementById('active-ex-tag').innerText = "ACTIVE: " + activeExercise + (savedMax ? " (Max: " + savedMax + ")" : "");
    closeAction();
    document.getElementById('sidebar').style.display = "none";
}

/**
 * GRAPH ENGINE - Using specific Max HR
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

    // Pull specific max HR or fallback to generic
    const specificMax = activeExercise ? localStorage.getItem('maxhr_' + activeExercise) : null;
    const baselineMax = specificMax ? parseInt(specificMax) : 190;

    let color = '#00f2ff'; let glow = 'rgba(0, 242, 255, 0.4)';
    if (bpm > (baselineMax * 0.85)) { color = '#ff0044'; glow = 'rgba(255, 0, 68, 0.4)'; }
    else if (bpm > (baselineMax * 0.70)) { color = '#ffaa00'; glow = 'rgba(255, 170, 0, 0.4)'; }

    const step = rect.width / (hrHistory.length - 1);
    const points = hrHistory.map((val, i) => ({ 
        x: i * step, 
        y: rect.height - ((val - 60) / (baselineMax - 60)) * rect.height 
    }));

    drawCurve(ctx, points, glow, 8);
    drawCurve(ctx, points, color, 3);
}

// ... Grid Logic v6.6 ...
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
    if (isTrain && !isCalibrating) return;
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
