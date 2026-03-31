/**
 * BIOSTACK ELITE v3.7.1
 * Hardware & Multi-Anatomy Engine
 */

let bpm = 0, targetHR = 0, currentMusc = "", currentEx = "", currentView = "front";
let isTrain = false, isCal = false, totalCal = 0;
let hrHistory = [], sets = [0, 0, 0], currentSetIdx = 0, lastMode = "PUSH";

const DB = {
    // Front View
    'Trapezoids': ['Dumbbell Shrugs', 'Barbell Shrugs'],
    'Deltoids': ['Lateral Raises', 'Military Press', 'Arnold Press'],
    'Pectorals': ['Bench Press', 'Incline Press', 'Chest Flys'],
    'Biceps': ['Barbell Curls', 'Hammer Curls'],
    'Triceps': ['Skull Crushers', 'Pushdowns'],
    'Forearms': ['Wrist Curls'],
    'Abdominals': ['Leg Raises', 'Weighted Crunches'],
    'Quads': ['Barbell Squats', 'Leg Press'],
    // Back View
    'Lats': ['Lat Pulldowns', 'Bent Over Rows', 'Pull Ups'],
    'Glutes': ['Hip Thrusts', 'Glute Bridges'],
    'Hamstrings': ['Deadlifts', 'Leg Curls'],
    'Calves': ['Calf Raises', 'Seated Calf Raises']
};

window.onload = async () => {
    if (sessionStorage.getItem('biostack_connected') === 'true') {
        connectHardware();
        generateHitMap();
    }
};

async function connectHardware() {
    try {
        const device = await navigator.bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }] });
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('heart_rate');
        const char = await service.getCharacteristic('heart_rate_measurement');
        await char.startNotifications();
        char.addEventListener('characteristicvaluechanged', (e) => {
            bpm = e.target.value.getUint8(1);
            updateEngine();
        });
    } catch (e) {
        sessionStorage.removeItem('biostack_connected');
        window.location.href = 'index.html';
    }
}

function switchView(view) {
    if (isTrain || isCal) return;
    currentView = view;
    document.getElementById('btn-front').classList.toggle('toggle-active', view === 'front');
    document.getElementById('btn-back').classList.toggle('toggle-active', view === 'back');
    document.querySelectorAll('.stack-layer').forEach(l => l.classList.remove('layer-visible'));
    document.getElementById(`base-${view}`).classList.add('layer-visible');
    const viewMuscles = (view === 'front') ? ['trapezoids','deltoids','pectorals','biceps','triceps','forearms','abdominals','quads'] : ['lats','glutes','hamstrings','calves'];
    viewMuscles.forEach(m => { const el = document.getElementById(`overlay-${m}`); if(el) el.classList.add('layer-visible'); });
    generateHitMap();
}

function generateHitMap() {
    const map = document.getElementById('touch-map');
    map.innerHTML = "";
    const frontGrid = ["", "", "", "Deltoids", "Pectorals", "Deltoids", "Biceps", "Abdominals", "Biceps", "Forearms", "Trapezoids", "Triceps", "Quads", "Quads", "Quads", "", "", ""];
    const backGrid = ["", "", "", "Lats", "Lats", "Lats", "Triceps", "Trapezoids", "Triceps", "Glutes", "Glutes", "Glutes", "Hamstrings", "", "Hamstrings", "Calves", "", "Calves"];
    const activeGrid = (currentView === 'front') ? frontGrid : backGrid;
    activeGrid.forEach(m => {
        const div = document.createElement('div');
        div.className = "hit";
        if (m !== "") div.onclick = () => selectMuscle(m);
        map.appendChild(div);
    });
}

function selectMuscle(m) {
    if (isTrain || isCal) return;
    document.querySelectorAll('.muscle-overlay').forEach(img => img.style.opacity = 0);
    currentMusc = m;
    const overlay = document.getElementById(`overlay-${m.toLowerCase()}`);
    if (overlay) overlay.style.opacity = 0.5;
    document.getElementById('musc-header').innerText = m;
    const picker = document.getElementById('exercise-picker');
    picker.innerHTML = ""; picker.style.display = "block";
    DB[m].forEach(ex => {
        const b = document.createElement('button');
        b.className = "list-btn"; b.innerText = ex; b.onclick = () => showActionMenu(ex);
        picker.appendChild(b);
    });
}

function showActionMenu(ex) {
    currentEx = ex; document.getElementById('ex-name-modal').innerText = ex;
    document.getElementById('menu-action').classList.add('visible');
}

function closeAction() { document.getElementById('menu-action').classList.remove('visible'); }

function startTraining() {
    isTrain = true; closeAction();
    document.getElementById('exercise-picker').style.display = "none";
    document.getElementById('set-tracker').style.display = "block";
    document.getElementById('nav-controls').style.display = "block";
    document.getElementById('ex-header').innerText = currentEx;
    const saved = localStorage.getItem('biostack_max_' + currentEx) || 150;
    targetHR = parseInt(saved);
}

function resetToSelection() {
    isTrain = false; currentSetIdx = 0; sets = [0,0,0];
    document.getElementById('set-tracker').style.display = "none";
    document.getElementById('nav-controls').style.display = "none";
    document.getElementById('exercise-picker').style.display = "block";
    document.querySelectorAll('.progress-bar').forEach(b => b.style.width = '0%');
    document.querySelectorAll('.muscle-overlay').forEach(img => img.style.opacity = 0);
    document.getElementById('musc-header').innerText = "SELECT TARGET";
}

function updateEngine() {
    document.getElementById('hr-val').innerText = bpm;
    hrHistory.push(bpm); if (hrHistory.length > 30) hrHistory.shift();
    drawSparkline();
    let currentMode = (bpm >= 110) ? "REST" : "PUSH";
    const mv = document.getElementById('mode-val');
    mv.innerText = (currentMode === "REST") ? "REST / RECOVER" : "PUSH - GO!";
    mv.className = (currentMode === "REST") ? "mode-rest" : "mode-push";
    if (lastMode === "PUSH" && currentMode === "REST") { if (currentSetIdx < 2) currentSetIdx++; }
    lastMode = currentMode;
    if (isTrain) {
        totalCal += (bpm * 0.012); document.getElementById('total-cal').innerText = Math.floor(totalCal);
        const overlay = document.getElementById(`overlay-${currentMusc.toLowerCase()}`);
        if (overlay) { const factor = Math.min(Math.max((bpm - 70) / (targetHR - 70), 0), 1); overlay.style.opacity = factor; }
        if (currentSetIdx < 3) { if (bpm > sets[currentSetIdx]) { sets[currentSetIdx] = bpm; const pct = Math.min((bpm / targetHR) * 100, 100); document.getElementById(`set-${currentSetIdx + 1}-bar`).style.width = pct + "%"; } }
    }
}

function drawSparkline() {
    const canvas = document.getElementById('sparkline-canvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = 140; canvas.height = 50;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath(); ctx.strokeStyle = '#00f2ff'; ctx.lineWidth = 2;
    const step = canvas.width / 30;
    hrHistory.forEach((val, i) => {
        const x = i * step; const y = canvas.height - ((val - 60) / 140) * canvas.height;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
}
