/**
 * BIOSTACK ELITE v3.1
 * Anatomy-First & Set Tracking Engine
 */

let bpm = 0, targetHR = 0, currentMusc = "", currentEx = "";
let isTrain = false, isCal = false, totalCal = 0;
let hrHistory = [];
let sets = [0, 0, 0, 0, 0];
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

// --- CONNECT ---

document.getElementById('conn-btn').onclick = async () => {
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
        document.getElementById('menu-init').classList.remove('visible');
        document.getElementById('mode-val').innerText = "SELECT TARGET";
    } catch (e) { alert("Enable Bluetooth in Bluefy."); }
};

// --- NAVIGATION ---

function selectMuscle(m) {
    if (isTrain || isCal) return;
    
    // Clear any previous previews
    document.querySelectorAll('.muscle-overlay').forEach(img => img.style.opacity = 0);
    
    currentMusc = m;
    const overlay = document.getElementById(`overlay-${m.toLowerCase()}`);
    if (overlay) overlay.style.opacity = 0.5;

    document.getElementById('musc-name-modal').innerText = m.toUpperCase();
    const list = document.getElementById('list-container');
    list.innerHTML = "";
    
    DB[m].forEach(ex => {
        const b = document.createElement('button');
        b.className = "btn";
        b.innerText = ex;
        b.onclick = () => showActionMenu(ex);
        list.appendChild(b);
    });
    
    document.getElementById('menu-ex').classList.add('visible');
}

function showActionMenu(ex) {
    currentEx = ex;
    document.getElementById('ex-name-modal').innerText = ex;
    const saved = localStorage.getItem('biostack_max_' + ex) || 150;
    targetHR = parseInt(saved);
    
    document.getElementById('menu-ex').classList.remove('visible');
    document.getElementById('menu-action').classList.add('visible');
}

function startTraining() {
    isTrain = true;
    document.getElementById('menu-action').classList.remove('visible');
    document.getElementById('set-tracker').style.display = "block";
    document.getElementById('nav-controls').style.display = "block";
    
    document.getElementById('musc-header').innerText = currentMusc;
    document.getElementById('ex-header').innerText = currentEx;
    document.getElementById('target-val').innerText = targetHR;
}

function closeModals() {
    document.querySelectorAll('.overlay').forEach(o => o.classList.remove('visible'));
    if (!isTrain) document.querySelectorAll('.muscle-overlay').forEach(img => img.style.opacity = 0);
}

function resetToSelection() {
    isTrain = false;
    currentSetIdx = 0;
    sets = [0,0,0,0,0];
    document.getElementById('set-tracker').style.display = "none";
    document.getElementById('nav-controls').style.display = "none";
    document.querySelectorAll('.progress-bar').forEach(b => b.style.width = '0%');
    document.querySelectorAll('.muscle-overlay').forEach(img => img.style.opacity = 0);
    document.getElementById('mode-val').innerText = "SELECT TARGET";
}

// --- CORE ENGINE ---

function updateEngine() {
    document.getElementById('hr-val').innerText = bpm;

    // 1. Sparkline (30s Rolling)
    hrHistory.push(bpm);
    if (hrHistory.length > 30) hrHistory.shift();
    drawSparkline();

    // 2. Mode & Set Logic
    const modeVal = document.getElementById('mode-val');
    // We treat >110 as REST (Recovery) and <110 as PUSH (Intensity)
    let currentMode = (bpm >= 110) ? "REST" : "PUSH";

    if (currentMode === "REST") {
        modeVal.innerText = "REST / RECOVER";
        modeVal.className = "mode-rest";
    } else {
        modeVal.innerText = "PUSH - GO!";
        modeVal.className = "mode-push";
    }

    // Auto-Set Advance: Transition from PUSH back to REST signals set completion
    if (lastMode === "PUSH" && currentMode === "REST") {
        if (currentSetIdx < 4) currentSetIdx++;
    }
    lastMode = currentMode;

    // 3. Telemetry Updates
    if (isTrain) {
        // Calorie Burn (Approx 42yo Male)
        totalCal += (bpm * 0.012); 
        document.getElementById('total-cal').innerText = Math.floor(totalCal);

        // Update Heatmap Opacity
        const overlay = document.getElementById(`overlay-${currentMusc.toLowerCase()}`);
        if (overlay) {
            const factor = Math.min(Math.max((bpm - 70) / (targetHR - 70), 0), 1);
            overlay.style.opacity = factor;
        }

        // Update Active Set Bar
        if (currentSetIdx < 5) {
            if (bpm > sets[currentSetIdx]) {
                sets[currentSetIdx] = bpm;
                const pct = Math.min((bpm / targetHR) * 100, 100);
                const bar = document.getElementById(`set-${currentSetIdx + 1}-bar`);
                if (bar) bar.style.width = pct + "%";
            }
        }
    }
}

function drawSparkline() {
    const canvas = document.getElementById('sparkline-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 140; canvas.height = 50;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.strokeStyle = '#00f2ff';
    ctx.lineWidth = 2;
    const step = canvas.width / 30;
    hrHistory.forEach((val, i) => {
        const x = i * step;
        const y = canvas.height - ((val - 60) / 140) * canvas.height;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
}
