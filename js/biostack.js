/**
 * BIOSTACK ELITE v3.0
 * Mission Control Engine
 */

let bpm = 0, targetHR = 0, currentMusc = "", currentEx = "";
let isTrain = false, isCal = false, totalCal = 0;
let hrHistory = []; // For 30s Sparkline
let sets = [0, 0, 0, 0, 0]; // Max HR achieved per set
let currentSetIdx = 0;
let lastMode = "REST"; // To detect transitions

const DB = {
    'Trapezoids': ['Dumbbell Shrugs', 'Barbell Shrugs'],
    'Deltoids': ['Lateral Raises', 'Military Press'],
    'Pectorals': ['Bench Press', 'Chest Flys'],
    'Biceps': ['Barbell Curls', 'Hammer Curls'],
    'Triceps': ['Pushdowns', 'Dips'],
    'Forearms': ['Wrist Curls'],
    'Abdominals': ['Leg Raises', 'Crunches'],
    'Quads': ['Squats', 'Leg Press']
};

// --- INITIALIZATION ---

document.getElementById('conn-btn').onclick = async () => {
    try {
        const device = await navigator.bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }] });
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('heart_rate');
        const char = await service.getCharacteristic('heart_rate_measurement');
        await char.startNotifications();
        char.addEventListener('characteristicvaluechanged', (e) => {
            bpm = e.target.value.getUint8(1);
            updateUI();
        });
        document.getElementById('menu-init').classList.remove('visible');
        showMuscleSelection();
    } catch (e) { alert("Connect Coospo in Bluefy."); }
};

function showMuscleSelection() {
    const list = document.getElementById('list-container');
    list.innerHTML = "";
    Object.keys(DB).forEach(m => {
        const b = document.createElement('button');
        b.className = "btn";
        b.innerText = m;
        b.onclick = () => {
            currentMusc = m;
            document.getElementById('musc-header').innerText = m;
            showExerciseSelection(m);
        };
        list.appendChild(b);
    });
    document.getElementById('menu-ex').classList.add('visible');
}

function showExerciseSelection(m) {
    const list = document.getElementById('list-container');
    list.innerHTML = "";
    DB[m].forEach(ex => {
        const b = document.createElement('button');
        b.className = "btn";
        b.innerText = ex;
        b.onclick = () => {
            currentEx = ex;
            document.getElementById('ex-header').innerText = ex;
            const saved = localStorage.getItem('biostack_max_' + ex) || 150;
            targetHR = parseInt(saved);
            document.getElementById('target-val').innerText = targetHR;
            document.getElementById('menu-ex').classList.remove('visible');
            document.getElementById('menu-action').classList.add('visible');
        };
        list.appendChild(b);
    });
}

function startTraining() {
    isTrain = true;
    document.getElementById('menu-action').classList.remove('visible');
    // Set initial preview glow
    const overlay = document.getElementById(`overlay-${currentMusc.toLowerCase()}`);
    if (overlay) overlay.style.opacity = 0.5;
}

function resetToSelection() {
    isTrain = false;
    currentSetIdx = 0;
    sets = [0,0,0,0,0];
    document.querySelectorAll('.progress-bar').forEach(b => b.style.width = '0%');
    showMuscleSelection();
}

// --- CORE ENGINE LOGIC ---

function updateUI() {
    document.getElementById('hr-val').innerText = bpm;
    
    // 1. Update Sparkline
    hrHistory.push(bpm);
    if (hrHistory.length > 30) hrHistory.shift();
    drawSparkline();

    // 2. Calorie Estimation (Rough: 42yo Male approx)
    if (isTrain) {
        totalCal += (bpm * 0.015); // Simple iterative burner
        document.getElementById('total-cal').innerText = Math.floor(totalCal);
    }

    // 3. Mode Detection & Set Logic
    const modeVal = document.getElementById('mode-val');
    let currentMode = (bpm >= 110) ? "REST" : "PUSH";

    if (currentMode === "REST") {
        modeVal.innerText = "REST / RECOVER";
        modeVal.className = "mode-rest";
    } else {
        modeVal.innerText = "PUSH - GO!";
        modeVal.className = "mode-push";
    }

    // Detect Transition: PUSH -> REST (End of set)
    if (lastMode === "PUSH" && currentMode === "REST") {
        currentSetIdx++;
    }
    lastMode = currentMode;

    // 4. Update Set Bars
    if (isTrain && currentSetIdx < 5) {
        // Track the highest HR hit in the current set
        if (bpm > sets[currentSetIdx]) {
            sets[currentSetIdx] = bpm;
            const pct = Math.min((bpm / targetHR) * 100, 100);
            document.getElementById(`set-${currentSetIdx + 1}-bar`).style.width = pct + "%";
        }
    }

    // 5. Heatmap Logic
    if (isTrain && currentMusc) {
        const overlay = document.getElementById(`overlay-${currentMusc.toLowerCase()}`);
        if (overlay) {
            const factor = Math.min(Math.max((bpm - 70) / (targetHR - 70), 0), 1);
            overlay.style.opacity = factor;
        }
    }
}

function drawSparkline() {
    const canvas = document.getElementById('sparkline-canvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.beginPath();
    ctx.strokeStyle = '#00f2ff';
    ctx.lineWidth = 2;
    
    const step = canvas.width / 30;
    hrHistory.forEach((val, i) => {
        const x = i * step;
        const y = canvas.height - ((val - 60) / 140) * canvas.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
}

function setView(side) {
    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('toggle-active'));
    event.target.classList.add('toggle-active');
    // Logic for asset swap will go here when Back assets ready
}
