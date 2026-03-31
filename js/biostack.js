/**
 * BIOSTACK ELITE v3.6
 * Shared Dashboard Engine
 */

let bpm = 0, targetHR = 0, currentMusc = "", currentEx = "";
let isTrain = false, isCal = false, totalCal = 0;
let hrHistory = [];
let sets = [0, 0, 0];
let currentSetIdx = 0;
let lastMode = "PUSH";

const DB = {
    'Trapezoids': ['Dumbbell Shrugs', 'Barbell Shrugs'],
    'Deltoids': ['Lateral Raises', 'Military Press', 'Arnold Press'],
    'Pectorals': ['Bench Press', 'Incline Press', 'Chest Flys'],
    'Biceps': ['Barbell Curls', 'Hammer Curls'],
    'Triceps': ['Skull Crushers', 'Pushdowns', 'Dips'],
    'Forearms': ['Wrist Curls', 'Reverse Curls'],
    'Abdominals': ['Leg Raises', 'Weighted Crunches'],
    'Quads': ['Barbell Squats', 'Leg Press']
};

// AUTO-LINK ON LOAD
window.onload = async () => {
    if (sessionStorage.getItem('biostack_connected') === 'true') {
        connectHardware();
    }
};

async function connectHardware() {
    try {
        // Re-requesting device to finalize the GATT stream
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ services: ['heart_rate'] }]
        });
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

function updateEngine() {
    const hrDisplay = document.getElementById('hr-val');
    if (hrDisplay) hrDisplay.innerText = bpm;

    hrHistory.push(bpm);
    if (hrHistory.length > 30) hrHistory.shift();
    drawSparkline();

    let currentMode = (bpm >= 110) ? "REST" : "PUSH";
    const mv = document.getElementById('mode-val');
    if (mv) {
        mv.innerText = (currentMode === "REST") ? "REST / RECOVER" : "PUSH - GO!";
        mv.className = (currentMode === "REST") ? "mode-rest" : "mode-push";
    }

    if (lastMode === "PUSH" && currentMode === "REST") { 
        if (currentSetIdx < 2) currentSetIdx++; 
    }
    lastMode = currentMode;

    if (isTrain) {
        totalCal += (bpm * 0.012); 
        const calDisplay = document.getElementById('total-cal');
        if (calDisplay) calDisplay.innerText = Math.floor(totalCal);

        const overlay = document.getElementById(`overlay-${currentMusc.toLowerCase()}`);
        if (overlay) { 
            const factor = Math.min(Math.max((bpm - 70) / (targetHR - 70), 0), 1); 
            overlay.style.opacity = factor; 
        }

        if (currentSetIdx < 3) { 
            if (bpm > sets[currentSetIdx]) { 
                sets[currentSetIdx] = bpm; 
                const pct = Math.min((bpm / targetHR) * 100, 100); 
                const bar = document.getElementById(`set-${currentSetIdx + 1}-bar`);
                if (bar) bar.style.width = pct + "%"; 
            } 
        }
    }
}

function selectMuscle(m) {
    if (isTrain || isCal) return;
    document.querySelectorAll('.muscle-overlay').forEach(img => img.style.opacity = 0);
    currentMusc = m;
    const overlay = document.getElementById(`overlay-${m.toLowerCase()}`);
    if (overlay) overlay.style.opacity = 0.5;

    const header = document.getElementById('musc-header');
    if (header) header.innerText = m;

    const picker = document.getElementById('exercise-picker');
    if (picker) {
        picker.innerHTML = "";
        picker.style.display = "block";
        DB[m].forEach(ex => {
            const b = document.createElement('button');
            b.className = "list-btn";
            b.innerText = ex;
            b.onclick = () => showActionMenu(ex);
            picker.appendChild(b);
        });
    }
}

function showActionMenu(ex) {
    currentEx = ex;
    const modalName = document.getElementById('ex-name-modal');
    if (modalName) modalName.innerText = ex;
    const modal = document.getElementById('menu-action');
    if (modal) modal.classList.add('visible');
}

function closeAction() { 
    const modal = document.getElementById('menu-action');
    if (modal) modal.classList.remove('visible'); 
}

function startTraining() {
    isTrain = true;
    closeAction();
    document.getElementById('exercise-picker').style.display = "none";
    document.getElementById('set-tracker').style.display = "block";
    document.getElementById('nav-controls').style.display = "block";
    const exHeader = document.getElementById('ex-header');
    if (exHeader) exHeader.innerText = currentEx;
    const saved = localStorage.getItem('biostack_max_' + currentEx) || 150;
    targetHR = parseInt(saved);
}

function resetToSelection() {
    isTrain = false; currentSetIdx = 0; sets = [0,0,0];
    document.getElementById('set-tracker').style.display = "none";
    document.getElementById('nav-controls').style.display = "none";
    document.getElementById('exercise-picker').style.display = "block";
    document.querySelectorAll('.progress-bar').forEach(b => b.style.width = '0%');
    const header = document.getElementById('musc-header');
    if (header) header.innerText = "SELECT TARGET";
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
