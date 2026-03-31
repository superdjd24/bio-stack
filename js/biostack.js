/**
 * BIOSTACK ELITE v4.4
 * Icon-Based View Toggling
 */
let bpm = 0, currentMusc = "", currentView = "front", isTrain = false;
let hrHistory = [];

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

function generateHitMap() {
    const map = document.getElementById('touch-map');
    map.innerHTML = "";
    
    // Grid Setup: 3 columns, 6 rows
    // On FRONT: Top Right (index 2) is the toggle to BACK
    const fG = [
        "", "", "TOGGLE_BACK", 
        "Deltoids", "Pectorals", "Deltoids",
        "Biceps", "Abdominals", "Biceps",
        "Forearms", "Trapezoids", "Triceps",
        "Quads", "Quads", "Quads",
        "", "", ""
    ];

    // On BACK: Top Left (index 0) is the toggle to FRONT
    const bG = [
        "TOGGLE_FRONT", "", "", 
        "Lats", "Lats", "Lats",
        "Triceps", "Trapezoids", "Triceps",
        "Glutes", "Glutes", "Glutes",
        "Hamstrings", "", "Hamstrings",
        "Calves", "", "Calves"
    ];

    const active = (currentView === "front") ? fG : bG;

    active.forEach(m => {
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
    
    // Toggle Layer Visibility
    document.querySelectorAll('.stack-layer').forEach(l => l.classList.remove('layer-visible'));
    document.getElementById(`base-${view}`).classList.add('layer-visible');
    
    // Show UI Button for that view
    if (view === 'front') document.getElementById('btn-to-back').classList.add('layer-visible');
    else document.getElementById('btn-to-front').classList.add('layer-visible');

    // Show Muscles for that view
    const ms = (view === 'front') 
        ? ['trapezoids','deltoids','pectorals','biceps','triceps','forearms','abdominals','quads'] 
        : ['lats','glutes','hamstrings','calves'];
    
    ms.forEach(m => {
        const el = document.getElementById(`overlay-${m}`);
        if(el) el.classList.add('layer-visible');
    });

    generateHitMap();
}

// ... (Rest of Engine: startStream, updateEngine, selectMuscle, etc.) ...

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
            // Simplified engine for this test
            hrHistory.push(bpm);
            if (hrHistory.length > 30) hrHistory.shift();
            drawSparkline();
        });
    } catch (e) { alert("Link Error: " + e.message); }
}

function selectMuscle(m) {
    if (isTrain) return;
    document.querySelectorAll('.muscle-overlay').forEach(img => img.style.opacity = 0);
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
            document.getElementById('ex-name-modal').innerText = ex;
            document.getElementById('menu-action').classList.add('visible');
        };
        picker.appendChild(b);
    });
}

function closeAction() { document.getElementById('menu-action').classList.remove('visible'); }
function startTraining() { isTrain = true; closeAction(); document.getElementById('exercise-picker').style.display = "none"; }

function drawSparkline() {
    const canvas = document.getElementById('sparkline-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 100; canvas.height = 30;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath(); ctx.strokeStyle = '#00f2ff'; ctx.lineWidth = 2;
    const step = canvas.width / 30;
    hrHistory.forEach((val, i) => {
        const x = i * step; const y = canvas.height - ((val - 60) / 140) * canvas.height;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
}
