/**
 * BIOSTACK ELITE v5.1
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
    const ctx = canvas.getContext('2d');
    
    // Scale for High-DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, DPR);

    ctx.clearRect(0, 0, rect.width, rect.height);
    if (hrHistory.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = '#00f2ff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const step = rect.width / (hrHistory.length - 1);

    // FIX #3: Clever Math Algorithm (Exaggerated Fluctuations)
    const savedPeak = localStorage.getItem('biostack_max_' + currentEx) || 160;
    const targetPeak = parseInt(savedPeak);
    
    // Dynamic floor (the quiet zone, e.g., 60-100)
    const restZone = (view === 'front') ? 100 : 90;

    // Use a logarithmic-like power scale to map small high-bpm jumps to big pixel moves
    const powerFactor = 1.3;

    hrHistory.forEach((val, i) => {
        const x = i * step;
        
        // Ignore noise. Normalize 100-160 to 0-1 range.
        let normalizedVal = Math.min(Math.max((val - restZone) / (targetPeak - restZone), 0), 1);
        
        // Exaggerate fluctuations: (0.1 normalized becomes 0.2 power, 0.9 power remains near 0.9)
        let exaggeratedVal = Math.pow(normalizedVal, 1 / powerFactor);
        
        // Map exaggerated 0-1 to canvas height (40-0)
        const y = rect.height - (exaggeratedVal * rect.height);
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
}

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
