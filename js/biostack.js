/**
 * BIOSTACK ELITE ENGINE v10.48 STABLE
 * Biological Auto-Cutoff State Machine + Settings Tab
 */

let bpm = 0; 
let currentView = "front";
let isTrain = false;
let activeExercise = null;
let setCounter = 0;

// BIO-LOGIC VARIABLES
let readyTriggerBpm = parseInt(localStorage.getItem('bio_ready_trigger')) || 100;
let liftState = 'IDLE'; // States: IDLE, READY, LIFTING, RESTING
let currentSetMax = 0;
const DROP_THRESHOLD = 6;

let hrHistory = [];
let totalCalories = 0;
let lastTimestamp = null;

const DB = {
    'Trapezoids': ['Dumbbell Shrugs', 'Barbell Shrugs'], 'Deltoids': ['Lateral Raises', 'Military Press'],
    'Pectorals': ['Bench Press', 'Incline Press'], 'Biceps': ['Barbell Curls', 'Hammer Curls'],
    'Triceps': ['Pushdowns', 'Dips'], 'Forearms': ['Wrist Curls'],
    'Abdominals': ['Leg Raises', 'Crunches'], 'Quads': ['Squats', 'Leg Press'],
    'Lats': ['Lat Pulldowns', 'Bent Over Rows'], 'Glutes': ['Hip Thrusts'],
    'Hamstrings': ['Deadlifts'], 'Calves': ['Calf Raises']
};

function getEliteColor(val) {
    const age = parseInt(localStorage.getItem('bio_age')) || 30;
    const maxHr = 220 - age;
    if (val >= maxHr * 0.80) return '#ff3333'; 
    if (val >= maxHr * 0.70) return '#ffcc00'; 
    if (val >= maxHr * 0.60) return '#33cc33'; 
    return '#00f2ff'; 
}

function updateTriggerSetting(val) {
    readyTriggerBpm = parseInt(val);
    document.getElementById('trigger-val-display').innerText = readyTriggerBpm + ' BPM';
    localStorage.setItem('bio_ready_trigger', readyTriggerBpm);
}

async function initSystem() {
    const w = document.getElementById('user-weight').value;
    const a = document.getElementById('user-age').value;
    if (!w || !a) return alert("Weight and Age required.");
    try {
        const device = await navigator.bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }] });
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('heart_rate');
        const char = await service.getCharacteristic('heart_rate_measurement');
        await char.startNotifications();
        
        localStorage.setItem('bio_weight', w);
        localStorage.setItem('bio_age', a);
        
        document.getElementById('trigger-slider').value = readyTriggerBpm;
        document.getElementById('trigger-val-display').innerText = readyTriggerBpm + ' BPM';

        initCardioZones();

        document.getElementById('login-screen').style.display = 'none';
        const dash = document.getElementById('main-dashboard');
        dash.style.display = 'block';
        setTimeout(() => { dash.style.opacity = '1'; }, 50);
        
        generateHitMap();
        
        char.addEventListener('characteristicvaluechanged', (e) => {
            bpm = e.target.value.getUint8(1);
            const hrEl = document.getElementById('hr-val');
            hrEl.innerText = bpm;
            hrEl.style.color = getEliteColor(bpm);
            
            calculateCals(bpm);
            
            hrHistory.push(bpm);
            if (hrHistory.length > 55) hrHistory.shift();
            
            drawSparkline();
            updateCardioUI(bpm); 
            
            processBioState(); // Fire the State Machine
        });
    } catch (e) { alert("Link Failed: " + e.message); }
}

function calculateCals(currentBpm) {
    const weight = localStorage.getItem('bio_weight') || 180;
    const age = localStorage.getItem('bio_age') || 30;
    const now = Date.now();
    if (!lastTimestamp) { lastTimestamp = now; return; }
    
    const durationHours = (now - lastTimestamp) / (1000 * 60 * 60);
    lastTimestamp = now;
    
    let calPerMinute = ( (age * 0.2017) + (weight * 0.09036) + (currentBpm * 0.6309) - 55.0969 ) / 4.184;
    if (calPerMinute < 0) calPerMinute = 0;
    
    const sliceCals = ((calPerMinute / 60) * (durationHours * 60)) * 10;
    totalCalories += sliceCals;
    
    const calVal = Math.round(totalCalories);
    document.getElementById('total-cal').innerText = calVal;
    
    const cardioCal = document.getElementById('cardio-stat-cals');
    const cardioFat = document.getElementById('cardio-stat-fat');
    if(cardioCal) cardioCal.innerText = calVal;
    if(cardioFat) cardioFat.innerText = (totalCalories / 3500).toFixed(3);
}

// --- NEW BIOLOGICAL STATE MACHINE ---
function startTraining() {
    activeExercise = document.getElementById('ex-name-modal').innerText;
    closeAction();
    
    isTrain = true; 
    document.getElementById('active-ex-tag').innerText = activeExercise;
    const contextBox = document.getElementById('active-ex-context');
    contextBox.innerText = `Recovery Trigger: ${readyTriggerBpm} BPM`;
    contextBox.style.display = 'block';
    
    setCounter = 0;
    clearIntensityBars();
    
    document.getElementById('hud-in-flow').style.display = "block";
    document.getElementById('sidebar').style.display = "none";
    
    liftState = 'READY';
    processBioState(); // Force a UI update immediately
}

function processBioState() {
    if (!isTrain) return;

    const btn = document.getElementById('set-main-btn');
    const helper = document.getElementById('rest-helper-text');

    if (liftState === 'READY') {
        if (bpm > readyTriggerBpm) {
            btn.innerText = "COOL DOWN";
            btn.classList.add('blinking-rest');
            btn.style.background = '#ff0044';
            btn.style.color = '#fff';
            btn.onclick = null; // Lock the button
            helper.innerText = "WAIT UNTIL MUSCLES ARE PRIMED";
            helper.style.display = 'block';
        } else {
            btn.innerText = "START SET";
            btn.classList.remove('blinking-rest');
            btn.style.background = 'var(--glow-blue)';
            btn.style.color = '#000';
            btn.onclick = () => { 
                liftState = 'LIFTING'; 
                currentSetMax = bpm; 
                processBioState(); 
            };
            helper.style.display = 'none';
        }
    } 
    else if (liftState === 'LIFTING') {
        btn.innerText = "SET IN PROGRESS...";
        btn.classList.remove('blinking-rest');
        btn.style.background = '#333';
        btn.style.color = '#fff';
        btn.onclick = null; // Prevent accidental tapping
        
        if (bpm > currentSetMax) currentSetMax = bpm;
        
        // Auto-Cutoff Logic
        if (bpm <= currentSetMax - DROP_THRESHOLD && currentSetMax > readyTriggerBpm) {
            liftState = 'RESTING';
            processBioState();
        }
    }
    else if (liftState === 'RESTING') {
        btn.innerText = "REST";
        btn.classList.add('blinking-rest');
        btn.style.background = '#ff0044';
        btn.style.color = '#fff';
        btn.onclick = null;
        helper.innerText = "WAIT UNTIL MUSCLES ARE PRIMED";
        helper.style.display = 'block';

        if (bpm > currentSetMax) currentSetMax = bpm; // Catch delayed peaks
        
        // Auto-Finalize Logic
        if (bpm <= readyTriggerBpm) {
            finalizeSet();
        }
    }
}

function finalizeSet() {
    setCounter++;
    
    // Scale visuals loosely based on a 200 BPM ceiling for UI drawing purposes
    const barPx = Math.min(100, (currentSetMax / 190) * 100) + "%"; 

    const container = document.getElementById('set-bar-sidebar');
    const hud = document.getElementById('hud-in-flow');
    const item = document.createElement('div');
    item.className = 'intensity-item';
    const label = document.createElement('span');
    label.className = 'intensity-label';
    label.innerText = `Set ${setCounter}`;

    const bar = document.createElement('div');
    bar.className = 'set-bar';

    const inner = document.createElement('span');
    inner.className = 'bar-inner-label';
    inner.innerText = `${currentSetMax} BPM`; // Raw data
    bar.appendChild(inner);
    item.appendChild(label);
    item.appendChild(bar);
    container.insertBefore(item, hud);

    requestAnimationFrame(() => {
        setTimeout(() => {
            bar.style.width = barPx;
            bar.classList.add('revealed');
        }, 50);
    });

    currentSetMax = 0;
    liftState = 'READY';
    processBioState();
}

function clearIntensityBars() {
    const items = document.querySelectorAll('#set-bar-sidebar .intensity-item');
    items.forEach(i => i.remove());
}

function exitTraining() {
    isTrain = false;
    liftState = 'IDLE';
    document.getElementById('hud-in-flow').style.display = "none";
    document.getElementById('active-ex-context').style.display = 'none';
    clearIntensityBars();
    document.getElementById('sidebar').style.display = "block";
    document.getElementById('active-ex-tag').innerText = "NO ACTIVE EXERCISE";
}

// --- STANDARD VISUAL & TAB LOGIC ---
function initCardioZones() {
    const age = parseInt(localStorage.getItem('bio_age')) || 30; 
    const maxHr = 220 - age;
    const z1Min = Math.round(maxHr * 0.60); const z1Max = Math.round(maxHr * 0.70);
    const z2Min = Math.round(maxHr * 0.70); const z2Max = Math.round(maxHr * 0.80);
    const z3Min = Math.round(maxHr * 0.80); const z3Max = Math.round(maxHr * 0.90);
    document.getElementById('pill-z1').innerText = `${z1Min} - ${z1Max} BPM`;
    document.getElementById('pill-z2').innerText = `${z2Min} - ${z2Max} BPM`;
    document.getElementById('pill-z3').innerText = `${z3Min} - ${z3Max} BPM`;
}

function updateCardioUI(currentBpm) {
    const age = parseInt(localStorage.getItem('bio_age')) || 30;
    const maxHr = 220 - age;
    document.querySelectorAll('.zone-card').forEach(c => c.classList.remove('active-zone'));
    if (currentBpm >= maxHr * 0.80 && currentBpm <= maxHr * 0.90) document.getElementById('zone-3').classList.add('active-zone');
    else if (currentBpm >= maxHr * 0.70 && currentBpm < maxHr * 0.80) document.getElementById('zone-2').classList.add('active-zone');
    else if (currentBpm >= maxHr * 0.60 && currentBpm < maxHr * 0.70) document.getElementById('zone-1').classList.add('active-zone');
}

function drawSparkline() {
    const canvas = document.getElementById('sparkline-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr); ctx.clearRect(0, 0, rect.width, rect.height);
    
    if (hrHistory.length < 2) return;
    ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    
    const step = rect.width / (hrHistory.length - 1);
    const points = hrHistory.map((val, i) => ({ x: i * step, y: rect.height - ((val - 60) / 100) * rect.height }));
    
    for (let i = 1; i < points.length; i++) {
        ctx.beginPath();
        ctx.moveTo(points[i-1].x, points[i-1].y);
        ctx.lineTo(points[i].x, points[i].y);
        ctx.strokeStyle = getEliteColor(hrHistory[i]);
        ctx.stroke();
    }
}

function generateHitMap() {
    const map = document.getElementById('touch-map');
    if (!map) return;
    map.innerHTML = "";
    
    if (currentView === "front") {
        map.style.gridTemplateRows = '19% 10% 9% 11% 23% 28%';
        const fG = ["", "", "TOGGLE_BACK", "Deltoids", "Pectorals", "Deltoids", "Biceps", "Abdominals", "Biceps", "Forearms", "Abdominals", "Forearms", "", "Quads", "", "", "", ""];
        fG.forEach((m) => {
            const div = document.createElement('div');
            div.className = "hit";
            if (m === "TOGGLE_BACK") div.onclick = () => switchView('back');
            else if (m !== "") div.onclick = () => selectMuscle(m);
            map.appendChild(div);
        });
    } else {
        map.style.gridTemplateRows = '12% 10% 22% 8% 4% 20% 24%';
        const bG = ["TOGGLE_FRONT", "", "", "Trapezoids", "Trapezoids", "Trapezoids", "Triceps", "Lats", "Triceps", "", "", "", "Glutes", "Glutes", "Glutes", "Hamstrings", "Hamstrings", "Hamstrings", "Calves", "Calves", "Calves"];
        bG.forEach((m) => {
            const div = document.createElement('div');
            div.className = "hit";
            if (m === "TOGGLE_FRONT") div.onclick = () => switchView('front');
            else if (m !== "") div.onclick = () => selectMuscle(m);
            map.appendChild(div);
        });
    }
}

function switchView(view) {
    currentView = view;
    document.querySelectorAll('.muscle-overlay').forEach(img => img.style.opacity = 0);
    document.querySelectorAll('.stack-layer').forEach(l => l.classList.remove('layer-visible'));
    if (view === 'front') {
        document.getElementById('btn-to-back').classList.add('layer-visible');
        ['trapezoids','deltoids','pectorals','biceps','forearms','abdominals','quads'].forEach(m => {
            const el = document.getElementById(`overlay-${m}`);
            if (el) el.classList.add('layer-visible');
        });
    } else {
        document.getElementById('base-back').classList.add('layer-visible');
        document.getElementById('btn-to-front').classList.add('layer-visible');
        ['trapezoids', 'lats','triceps','glutes','hamstrings','calves'].forEach(m => {
            const el = document.getElementById(`overlay-${m}`);
            if (el) el.classList.add('layer-visible');
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
            document.getElementById('menu-action').style.display = 'block';
        };
        picker.appendChild(b);
    });
}

function closeAction() { document.getElementById('menu-action').style.display = 'none'; }

function switchAppTab(tabId, btnElement) {
    document.querySelectorAll('.app-view').forEach(view => view.classList.remove('view-active'));
    document.getElementById('view-' + tabId).classList.add('view-active');
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active-nav'));
    btnElement.classList.add('active-nav');
    if (tabId === 'cardio') initCardioZones();
}

// --- PARTICLE PHYSICS ENGINE ---
const canvasP = document.getElementById('cardio-particles');
let ctxP = canvasP ? canvasP.getContext('2d') : null;
let particles = [];

function initCardioParticles() {
    if (!canvasP) return;
    requestAnimationFrame(animateParticles);
}

function animateParticles() {
    requestAnimationFrame(animateParticles);
    
    if (!document.getElementById('view-cardio').classList.contains('view-active')) return;
    if (!ctxP) return;

    const parent = canvasP.parentElement;
    if (canvasP.width !== parent.clientWidth || canvasP.height !== parent.clientHeight) {
        canvasP.width = parent.clientWidth;
        canvasP.height = parent.clientHeight;
    }
    
    if (canvasP.width === 0) return; 

    ctxP.clearRect(0, 0, canvasP.width, canvasP.height);

    const age = parseInt(localStorage.getItem('bio_age')) || 30;
    const maxHr = 220 - age;
    
    let intensity = 0;
    if (bpm >= 107) {
        intensity = Math.max(0, Math.min(1, (bpm - 107) / (maxHr - 107)));
        let spawnRate = 1 + Math.floor(intensity * 4); 
        for (let i = 0; i < spawnRate; i++) {
            if (Math.random() > 0.4) { 
                particles.push({
                    x: canvasP.width * 0.65 + (Math.random() * 20 - 10), 
                    y: canvasP.height * 0.3 + Math.random() * (canvasP.height * 0.45), 
                    vx: -(0.5 + intensity * 1.5) - Math.random(), 
                    vy: (Math.random() - 0.5) * 1.0 - (intensity * 0.3), 
                    life: 150 + Math.random() * 100,
                    maxLife: 250,
                    size: 1.0 + Math.random() * 1.5, 
                    color: getEliteColor(bpm)
                });
            }
        }
    }

    ctxP.globalCompositeOperation = 'screen';

    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx; p.y += p.vy; p.life--;
        if (p.life <= 0 || p.x < 0) { particles.splice(i, 1); continue; }
        ctxP.globalAlpha = Math.max(0, p.life / p.maxLife) * 0.5;
        ctxP.fillStyle = p.color;
        ctxP.beginPath(); ctxP.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctxP.fill();
    }
    
    ctxP.globalAlpha = 1.0;
    ctxP.globalCompositeOperation = 'source-over';
}

initCardioParticles();
