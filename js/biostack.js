/**
 * BIOSTACK ELITE v5.3
 * High-Intensity Graph Engine
 */
let bpm = 0, currentMusc = "", currentView = "front", isTrain = false, hrHistory = [];

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

window.onload = () => { generateHitMap(); };

async function startStream() {
    try {
        const device = await navigator.bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }] });
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('heart_rate');
        const char = await service.getCharacteristic('heart_rate_measurement');
        await char.startNotifications();
        char.addEventListener('characteristicvaluechanged', (e) => {
            bpm = e.target.value.getUint8(1);
            document.getElementById('hr-val').innerText = bpm;
            hrHistory.push(bpm);
            if (hrHistory.length > 50) hrHistory.shift();
            drawSparkline();
        });
    } catch (e) { alert("Sync Error: " + e.message); }
}

function drawSparkline() {
    const canvas = document.getElementById('sparkline-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, rect.height);
    if (hrHistory.length < 2) return;

    const step = rect.width / (hrHistory.length - 1);

    // PASS 1: The "Glow" (Blurry and thick)
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0, 242, 255, 0.3)';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    hrHistory.forEach((val, i) => {
        const x = i * step;
        const y = rect.height - ((val - 60) / 100) * rect.height;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // PASS 2: The "Core" (Sharp and bright)
    ctx.beginPath();
    ctx.strokeStyle = '#00f2ff';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    hrHistory.forEach((val, i) => {
        const x = i * step;
        const y = rect.height - ((val - 60) / 100) * rect.height;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
}

// ... generateHitMap, switchView, selectMuscle functions stay same as v5.2 ...

function generateHitMap() {
    const map = document.getElementById('touch-map');
    map.innerHTML = "";
    const fG = ["", "", "TOGGLE_BACK", "Deltoids", "Pectorals", "Deltoids", "Biceps", "Abdominals", "Biceps", "Forearms", "Trapezoids", "Triceps", "Quads", "Quads", "Quads", "", "", ""];
    const bG = ["TOGGLE_FRONT", "", "", "Lats", "Lats", "Lats", "Triceps", "Trapezoids", "Triceps", "Glutes", "Glutes", "Glutes", "Hamstrings", "", "Hamstrings", "Calves", "", "Calves"];
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
        ['trapezoids','deltoids','pectorals','biceps','triceps','forearms','abdominals','quads'].forEach(m => document.getElementById(`overlay-${m}`).classList.add('layer-visible'));
    } else {
        document.getElementById('base-back').classList.add('layer-visible');
        document.getElementById('btn-to-front').classList.add('layer-visible');
        ['lats','glutes','hamstrings','calves'].forEach(m => document.getElementById(`overlay-${m}`).classList.add('layer-visible'));
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
            document.getElementById('menu-action').classList.add('visible');
        };
        picker.appendChild(b);
    });
}

function closeAction() { document.getElementById('menu-action').classList.remove('visible'); }
function startTraining() { isTrain = true; closeAction(); document.getElementById('exercise-picker').style.display = "none"; }
