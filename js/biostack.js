/**
 * BIOSTACK ELITE v5.7
 * Precision Traps Targeting
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

function generateHitMap() {
    const map = document.getElementById('touch-map');
    map.innerHTML = "";
    
    /** * FRONT GRID FIXED (fG)
     * Row 1: View Toggle
     * Row 2: Precision Trap Target (Neck)
     */
    const fG = [
        "", "", "TOGGLE_BACK",              // Row 1
        "Deltoids", "Trapezoids", "Deltoids", // Row 2: FIX. Added Traps to center (neck).
        "Biceps", "Pectorals", "Biceps",      // Row 3
        "Forearms", "Abdominals", "Forearms", // Row 4
        "Quads", "Quads", "Quads",           // Row 5
        "", "", ""                          // Row 6
    ];

    /** * BACK GRID FIXED (bG)
     * Row 1: View Toggle
     * Row 2: Traps (Shoulders/Upper Neck)
     */
    const bG = [
        "TOGGLE_FRONT", "", "",        // Row 1
        "Deltoids", "Trapezoids", "Deltoids", // Row 2: FIX. Moved Traps from legs to here.
        "Triceps", "Lats", "Triceps",    // Row 3 (Lats centered)
        "Glutes", "Glutes", "Glutes",    // Row 4
        "Hamstrings", "", "Hamstrings",  // Row 5
        "Calves", "", "Calves"           // Row 6
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

// ... Smoothed Graph Engine (v5.5) ...

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
    if (hrHistory.length < 3) return;
    let color = '#00f2ff'; let glow = 'rgba(0, 242, 255, 0.4)';
    if (bpm > 140) { color = '#ff0044'; glow = 'rgba(255, 0, 68, 0.4)'; }
    else if (bpm > 110) { color = '#ffaa00'; glow = 'rgba(255, 170, 0, 0.4)'; }
    const step = rect.width / (hrHistory.length - 1);
    const points = hrHistory.map((val, i) => ({ x: i * step, y: rect.height - ((val - 60) / 100) * rect.height }));
    drawCurve(ctx, points, glow, 7);
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

function closeAction() { document.getElementById('menu-action').classList.remove('visible'); }
function startTraining() { isTrain = true; closeAction(); document.getElementById('exercise-picker').style.display = "none"; }
