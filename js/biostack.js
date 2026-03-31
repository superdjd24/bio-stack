/**
 * BIOSTACK ELITE v3.9
 * Anchor-Logic Engine
 */

let bpm = 0, targetHR = 0, currentMusc = "", currentEx = "", currentView = "front";
let isTrain = false, totalCal = 0, hrHistory = [], lastMode = "PUSH";

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

window.onload = () => {
    if (sessionStorage.getItem('biostack_connected') === 'true') {
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
        document.getElementById('hr-val').innerText = "--";
    } catch (e) {
        alert("Sync Failed: " + e.message);
    }
}

function updateEngine() {
    document.getElementById('hr-val').innerText = bpm;
    hrHistory.push(bpm);
    if (hrHistory.length > 30) hrHistory.shift();
    drawSparkline();
}

function selectMuscle(m) {
    if (isTrain) return;
    document.querySelectorAll('.muscle-overlay').forEach(img => img.style.opacity = 0);
    currentMusc = m;
    const overlay = document.getElementById(`overlay-${m.toLowerCase()}`);
    if (overlay) overlay.style.opacity = 0.5;
    document.getElementById('musc-header').innerText = m;
    const picker = document.getElementById('exercise-picker');
    picker.innerHTML = "";
    DB[m].forEach(ex => {
        const b = document.createElement('button');
        b.className = "list-btn";
        b.innerText = ex;
        b.onclick = () => {
            currentEx = ex;
            document.getElementById('ex-name-modal').innerText = ex;
            document.getElementById('menu-action').classList.add('visible');
        };
        picker.appendChild(b);
    });
}

function generateHitMap() {
    const map = document.getElementById('touch-map');
    map.innerHTML = "";
    // Adjusted grid for the v3.9 alignment
    const fG = ["", "", "", "Deltoids", "Pectorals", "Deltoids", "Biceps", "Abdominals", "Biceps", "Forearms", "Trapezoids", "Triceps", "Quads", "Quads", "Quads", "", "", ""];
    const bG = ["", "", "", "Lats", "Lats", "Lats", "Triceps", "Trapezoids", "Triceps", "Glutes", "Glutes", "Glutes", "Hamstrings", "", "Hamstrings", "Calves", "", "Calves"];
    const active = (currentView === 'front') ? fG : bG;
    active.forEach(m => {
        const div = document.createElement('div');
        div.className = "hit";
        if (m !== "") div.onclick = () => selectMuscle(m);
        map.appendChild(div);
    });
}

function switchView(view) {
    currentView = view;
    document.getElementById('btn-front').classList.toggle('toggle-active', view === 'front');
    document.getElementById('btn-back').classList.toggle('toggle-active', view === 'back');
    document.querySelectorAll('.stack-layer').forEach(l => l.classList.remove('layer-visible'));
    document.getElementById(`base-${view}`).classList.add('layer-visible');
    const ms = (view === 'front') ? ['trapezoids','deltoids','pectorals','biceps','triceps','forearms','abdominals','quads'] : ['lats','glutes','hamstrings','calves'];
    ms.forEach(m => { const el = document.getElementById(`overlay-${m}`); if(el) el.classList.add('layer-visible'); });
    generateHitMap();
}

function closeAction() { document.getElementById('menu-action').classList.remove('visible'); }

function drawSparkline() {
    const canvas = document.getElementById('sparkline-canvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = 120; canvas.height = 40;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath(); ctx.strokeStyle = '#00f2ff'; ctx.lineWidth = 2;
    const step = canvas.width / 30;
    hrHistory.forEach((val, i) => {
        const x = i * step; const y = canvas.height - ((val - 60) / 140) * canvas.height;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
}
