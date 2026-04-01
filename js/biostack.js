/**
 * BIOSTACK ELITE ENGINE v5.8
 * Vertical Calibration & Smoothing
 */

let bpm = 0;
let currentMusc = "";
let currentView = "front";
let isTrain = false;
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

window.onload = () => {
    generateHitMap();
};

async function startStream() {
    try {
        const device = await navigator.bluetooth.requestDevice({ 
            filters: [{ services: ['heart_rate'] }] 
        });
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('heart_rate');
        const char = await service.getCharacteristic('heart_rate_measurement');
        
        await char.startNotifications();
        char.addEventListener('characteristicvaluechanged', (e) => {
            bpm = e.target.value.getUint8(1);
            document.getElementById('hr-val').innerText = bpm;
            
            hrHistory.push(bpm);
            if (hrHistory.length > 55) hrHistory.shift();
            drawSparkline();
        });
    } catch (e) { 
        alert("Link Error: " + e.message); 
    }
}

/**
 * GRID MAPPING
 * Calibrated with a Row 1 Buffer to fix the 20% vertical offset
 */
function generateHitMap() {
    const map = document.getElementById('touch-map');
    map.innerHTML = "";
    
    // Front Grid Mapping
    const fG = [
        "", "", "",                         // Row 1 (Calibration Buffer)
        "", "", "TOGGLE_BACK",              // Row 2
        "Deltoids", "Trapezoids", "Deltoids", // Row 3
        "Biceps", "Pectorals", "Biceps",      // Row 4
        "Forearms", "Abdominals", "Forearms", // Row 5
        "Quads", "Quads", "Quads"            // Row 6
    ];

    // Back Grid Mapping
    const bG = [
        "", "", "",                         // Row 1 (Calibration Buffer)
        "TOGGLE_FRONT", "", "",             // Row 2
        "Deltoids", "Trapezoids", "Deltoids", // Row 3
        "Triceps", "Lats", "Triceps",       // Row 4
        "Glutes", "Glutes", "Glutes",       // Row 5
        "Hamstrings", "Calves", "Hamstrings" // Row 6
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
    // Clear glows
    document.querySelectorAll('.muscle-overlay').forEach(img => img.style.opacity = 0);
    // Switch layers
    document.querySelectorAll('.stack-layer').forEach(l => l.classList.remove('layer-visible'));
    
    if (view === 'front') {
        document.getElementById('btn-to-back').classList.add('layer-visible');
        ['trapezoids','deltoids','pectorals','biceps','triceps','forearms','abdominals','quads'].forEach(m => {
            document.getElementById(`overlay-${m}`).classList.add('layer-visible');
        });
    } else {
        document.getElementById('base-back').classList.add('layer-visible');
        document.getElementById('btn-to-front').classList.add('layer-visible');
        ['lats','glutes','hamstrings','calves'].forEach(m => {
            document.getElementById(`overlay-${m}`).classList.add('layer-visible');
        });
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

/**
 * SMOOTHED SPARKLINE ENGINE
 * Uses Dynamic Heat-Mapping and Quadratic Bezier Curves
 */
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

    // Color Logic
    let color = '#00f2ff';
    let glow = 'rgba(0, 242, 255, 0.4)';
    if (bpm > 140) { color = '#ff0044'; glow = 'rgba(255, 0, 68, 0.4)'; }
    else if (bpm > 110) { color = '#ffaa00'; glow = 'rgba(255, 170, 0, 0.4)'; }

    const step = rect.width / (hrHistory.length - 1);
    const points = hrHistory.map((val, i) => ({ 
        x: i * step, 
        y: rect.height - ((val - 60) / 100) * rect.height 
    }));

    // Glow Pass
    drawCurve(ctx, points, glow, 8);
    // Sharp Pass
    drawCurve(ctx, points, color, 3);
}

function drawCurve(ctx, p, style, width) {
    ctx.beginPath();
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
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
function startTraining() { 
    isTrain = true; 
    closeAction(); 
    document.getElementById('sidebar').style.display = "none"; 
}
