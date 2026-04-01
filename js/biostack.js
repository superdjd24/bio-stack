/**
 * BIOSTACK ELITE v4.7
 */
let bpm = 0, currentMusc = "", currentView = "front", isTrain = false;

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
    console.log("v4.7 Engine Loaded");
    generateHitMap(); 
};

function generateHitMap() {
    const map = document.getElementById('touch-map');
    if (!map) return;
    map.innerHTML = "";
    
    const fG = [
        "", "", "TOGGLE_BACK", 
        "Deltoids", "Pectorals", "Deltoids",
        "Biceps", "Abdominals", "Biceps",
        "Forearms", "Trapezoids", "Triceps",
        "Quads", "Quads", "Quads",
        "", "", ""
    ];

    const bG = [
        "TOGGLE_FRONT", "", "", 
        "Lats", "Lats", "Lats",
        "Triceps", "Trapezoids", "Triceps",
        "Glutes", "Glutes", "Glutes",
        "Hamstrings", "", "Hamstrings",
        "Calves", "", "Calves"
    ];

    const active = (currentView === "front") ? fG : bG;

    active.forEach((m, index) => {
        const div = document.createElement('div');
        div.className = "hit";
        div.dataset.index = index;
        
        div.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log("Tapped index:", index, "Muscle:", m);
            
            if (m === "TOGGLE_BACK") switchView('back');
            else if (m === "TOGGLE_FRONT") switchView('front');
            else if (m !== "") selectMuscle(m);
        };
        map.appendChild(div);
    });
}

function switchView(view) {
    currentView = view;
    document.querySelectorAll('.muscle-overlay').forEach(img => img.style.opacity = 0);
    document.querySelectorAll('.stack-layer').forEach(l => l.classList.remove('layer-visible'));
    
    const baseId = (view === 'front') ? 'base-front-real' : 'base-back';
    document.getElementById(baseId).classList.add('layer-visible');
    
    if (view === 'front') document.getElementById('btn-to-back').classList.add('layer-visible');
    else document.getElementById('btn-to-front').classList.add('layer-visible');

    const ms = (view === 'front') ? ['trapezoids','deltoids','pectorals','biceps','triceps','forearms','abdominals','quads'] : ['lats','glutes','hamstrings','calves'];
    ms.forEach(m => {
        const el = document.getElementById(`overlay-${m}`);
        if(el) el.classList.add('layer-visible');
    });

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

// (Sparkline and startStream remain the same)
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
        });
    } catch (e) { alert("Link Error: " + e.message); }
}
