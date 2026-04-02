/**
 * BIOSTACK ELITE ENGINE v10.36 STABLE
 * Cardio Module with Live Dynamic Zones + Cache Bust
 */

let bpm = 0;
let currentView = "front";
let isTrain = false;
let isCalibrating = false;
let activeExercise = null;
let tempMaxHr = 0;
let peakBuffer = [];
let setCounter = 0;

let hrHistory = [];
let totalCalories = 0;
let lastTimestamp = null;

// REST TRACKING VARIABLES
let isResting = false;
let isLatchedReady = false;
let peakHrAtSetEnd = 0;
const REST_TARGET_BPM = 105;

const DB = {
    'Trapezoids': ['Dumbbell Shrugs', 'Barbell Shrugs'], 'Deltoids': ['Lateral Raises', 'Military Press'],
    'Pectorals': ['Bench Press', 'Incline Press'], 'Biceps': ['Barbell Curls', 'Hammer Curls'],
    'Triceps': ['Pushdowns', 'Dips'], 'Forearms': ['Wrist Curls'],
    'Abdominals': ['Leg Raises', 'Crunches'], 'Quads': ['Squats', 'Leg Press'],
    'Lats': ['Lat Pulldowns', 'Bent Over Rows'], 'Glutes': ['Hip Thrusts'],
    'Hamstrings': ['Deadlifts'], 'Calves': ['Calf Raises']
};

function getEliteColor(val) {
    if (val < 80) return '#00f2ff';
    if (val < 100) return '#00ff88';
    if (val < 115) return '#ffff00';
    if (val < 130) return '#ffaa00';
    return '#ff0044';
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
        
        // Save Context
        localStorage.setItem('bio_weight', w);
        localStorage.setItem('bio_age', a);
        
        // Initialize dynamic cardio math based on user age
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
            
            const now = Date.now();
            if (isCalibrating && bpm > tempMaxHr) tempMaxHr = bpm;
            
            peakBuffer.push({ bpm: bpm, time: now });
            peakBuffer = peakBuffer.filter(p => now - p.time < 20000);
            
            calculateCals(bpm);
            
            hrHistory.push(bpm);
            if (hrHistory.length > 55) hrHistory.shift();
            
            drawSparkline();
            updateCardioUI(bpm); // Update the active Cardio zone tracker
            
            if (isResting) {
                updateRestUI();
            }
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
    
    // Update calories globally across tabs
    const calVal = Math.round(totalCalories);
    document.getElementById('total-cal').innerText = calVal;
    
    // Safety check just in case cardio view isn't fully loaded yet
    const cardioCal = document.getElementById('cardio-total-cal-display');
    if(cardioCal) cardioCal.innerText = calVal;
}

// NEW: DYNAMIC CARDIO ZONE INITIALIZATION
function initCardioZones() {
    // Dynamic math utilizing user's profile age
    const age = parseInt(localStorage.getItem('bio_age')) || 30; 
    const maxHr = 220 - age;

    const z1Min = Math.round(maxHr * 0.60);
    const z1Max = Math.round(maxHr * 0.70);
    const z2Min = Math.round(maxHr * 0.70);
    const z2Max = Math.round(maxHr * 0.80);
    const z3Min = Math.round(maxHr * 0.80);
    const z3Max = Math.round(maxHr * 0.90);

    document.getElementById('pill-z1').innerText = `${z1Min} - ${z1Max} BPM`;
    document.getElementById('pill-z2').innerText = `${z2Min} - ${z2Max} BPM`;
    document.getElementById('pill-z3').innerText = `${z3Min} - ${z3Max} BPM`;
}

// NEW: LIVE ZONE TRACKER
function updateCardioUI(currentBpm) {
    const age = parseInt(localStorage.getItem('bio_age')) || 30;
    const maxHr = 220 - age;

    // Reset all zone highlights
    document.querySelectorAll('.zone-card').forEach(c => c.classList.remove('active-zone'));

    // Highlight active zone based on current BPM threshold
    if (currentBpm >= maxHr * 0.80 && currentBpm <= maxHr * 0.90) {
        document.getElementById('zone-3').classList.add('active-zone');
    } else if (currentBpm >= maxHr * 0.70 && currentBpm < maxHr * 0.80) {
        document.getElementById('zone-2').classList.add('active-zone');
    } else if (currentBpm >= maxHr * 0.60 && currentBpm < maxHr * 0.70) {
        document.getElementById('zone-1').classList.add('active-zone');
    }
}

function startTraining() {
    const newEx = document.getElementById('ex-name-modal').innerText;
    activeExercise = newEx;
    closeAction();
    
    if (!localStorage.getItem('maxhr_' + newEx)) { 
        isCalibrating = true; 
        isTrain = false; 
        tempMaxHr = 0;
        document.getElementById('active-ex-tag').innerText = "CALIBRATING: " + activeExercise;
        document.getElementById('sidebar').style.display = "none";
        document.getElementById('calibration-hud').style.display = "block";
        startCalTimer();
        return; 
    }
    
    isTrain = true; 
    isCalibrating = false;
    document.getElementById('active-ex-tag').innerText = "WORK SET: " + activeExercise;
    const savedMax = localStorage.getItem('maxhr_' + activeExercise);
    const contextBox = document.getElementById('active-ex-context');
    contextBox.innerText = `Target HR for ${activeExercise}: ${savedMax}`;
    contextBox.style.display = 'block';
    setCounter = 0;
    clearIntensityBars();
    document.getElementById('hud-in-flow').style.display = "block";
    resetSetHUD();
    document.getElementById('sidebar').style.display = "none";
}

function startCalTimer() {
    const timerText = document.getElementById('cal-timer-display');
    timerText.style.display = "block";
    let timeLeft = 20;
    const countdown = setInterval(() => {
        timeLeft--;
        timerText.innerText = `Analyzing vitals... ${timeLeft}s`;
        if (timeLeft <= 0) { 
            clearInterval(countdown); 
            lockMaxHr(); 
        }
    }, 1000);
}

function lockMaxHr() {
    isCalibrating = false;
    const bufferMax = peakBuffer.length > 0 ? Math.max(...peakBuffer.map(p => p.bpm)) : 0;
    const trueMax = Math.max(tempMaxHr, bufferMax, bpm);
    
    if (trueMax < 60) { 
        alert("Calibration failed: Vitals too low."); 
        document.getElementById('calibration-hud').style.display = "none";
        document.getElementById('sidebar').style.display = "block";
        return; 
    }
    
    localStorage.setItem('maxhr_' + activeExercise, trueMax);
    document.getElementById('calibration-hud').style.display = "none";
    
    isTrain = true;
    document.getElementById('active-ex-tag').innerText = "WORK SET: " + activeExercise;
    const contextBox = document.getElementById('active-ex-context');
    contextBox.innerText = `Target HR for ${activeExercise}: ${trueMax}`;
    contextBox.style.display = 'block';
    setCounter = 0;
    clearIntensityBars();
    document.getElementById('hud-in-flow').style.display = "block";
    resetSetHUD();
    
    processSetResult(); 
}

function resetSetHUD() {
    isResting = false;
    isLatchedReady = false;
    const btn = document.getElementById('set-main-btn');
    btn.classList.remove('blinking-rest');
    btn.innerText = "END SET";
    btn.style.background = 'var(--glow-blue)';
    btn.style.color = '#000';
    btn.style.webkitTextStroke = '0px'; 
    btn.onclick = startSetTimer;
    btn.style.display = "block";
    document.getElementById('set-timer-display').style.display = "none";
    
    document.getElementById('in-progress-badge').style.display = 'flex';
    
    peakBuffer = []; 
}

function startSetTimer() {
    document.getElementById('set-main-btn').style.display = "none";
    document.getElementById('in-progress-badge').style.display = "none"; 
    
    const timerText = document.getElementById('set-timer-display');
    timerText.style.display = "block";
    let timeLeft = 20;
    const countdown = setInterval(() => {
        timeLeft--;
        timerText.innerText = `Analyzing vitals... ${timeLeft}s`;
        if (timeLeft <= 0) { clearInterval(countdown); processSetResult(); }
    }, 1000);
}

function processSetResult() {
    const savedMax = localStorage.getItem('maxhr_' + activeExercise) || 190;
    const peakInLast20 = peakBuffer.length > 0 ? Math.max(...peakBuffer.map(p => p.bpm)) : bpm;
    setCounter++;
    const ratio = peakInLast20 / savedMax;
    const percent = Math.round(ratio * 100);
    const barPx = Math.round(ratio * 115); 

    const container = document.getElementById('set-bar-sidebar');
    const hud = document.getElementById('hud-in-flow');
    const item = document.createElement('div');
    item.className = 'intensity-item';
    const label = document.createElement('span');
    label.className = 'intensity-label';
    label.innerText = `Set${setCounter}`;

    const bar = document.createElement('div');
    bar.className = 'set-bar';

    const inner = document.createElement('span');
    inner.className = 'bar-inner-label';
    inner.innerText = `${percent}%`;
    bar.appendChild(inner);
    item.appendChild(label);
    item.appendChild(bar);
    container.insertBefore(item, hud);

    requestAnimationFrame(() => {
        setTimeout(() => {
            bar.style.width = Math.max(35, barPx) + "px";
            bar.classList.add('revealed');
        }, 50);
    });

    isResting = true;
    isLatchedReady = false;
    peakHrAtSetEnd = peakInLast20;
    
    if (peakHrAtSetEnd <= REST_TARGET_BPM) peakHrAtSetEnd = REST_TARGET_BPM + 20; 

    const btn = document.getElementById('set-main-btn');
    btn.onclick = resetSetHUD; 
    btn.style.display = "block";
    document.getElementById('set-timer-display').style.display = "none";
    
    updateRestUI();
}

function updateRestUI() {
    const btn = document.getElementById('set-main-btn');
    
    if (isLatchedReady) return; 

    if (bpm <= REST_TARGET_BPM) {
        isLatchedReady = true;
        isResting = false;
        btn.classList.remove('blinking-rest');
        btn.innerText = "START NEXT SET";
        btn.style.background = 'var(--glow-blue)';
        btn.style.color = '#000';
        btn.style.webkitTextStroke = '0px'; 
        return;
    }

    let range = peakHrAtSetEnd - REST_TARGET_BPM;
    let currentDrop = peakHrAtSetEnd - bpm;
    let pct = Math.max(0, Math.min(100, (currentDrop / Math.max(1, range)) * 100));

    let fillColor = '#ff0044'; 
    if (pct > 25) fillColor = '#ffaa00'; 
    if (pct > 50) fillColor = '#ffff00'; 
    if (pct > 75) fillColor = '#00ff88'; 
    
    btn.innerText = "REST";
    btn.classList.add('blinking-rest');
    btn.style.color = '#000'; 
    btn.style.webkitTextStroke = '0px'; 
    btn.style.background = `linear-gradient(90deg, ${fillColor} ${pct}%, #222 ${pct}%)`;
}

function clearIntensityBars() {
    const items = document.querySelectorAll('#set-bar-sidebar .intensity-item');
    items.forEach(i => i.remove());
}

function exitTraining() {
    isTrain = false;
    isResting = false;
    isLatchedReady = false;
    document.getElementById('hud-in-flow').style.display = "none";
    document.getElementById('in-progress-badge').style.display = "none";
    document.getElementById('active-ex-context').style.display = 'none';
    clearIntensityBars();
    document.getElementById('sidebar').style.display = "block";
    document.getElementById('active-ex-tag').innerText = "NO ACTIVE EXERCISE";
}

function drawSparkline() {
    const canvas = document.getElementById('sparkline-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr); ctx.clearRect(0, 0, rect.width, rect.height);
    if (hrHistory.length < 3) return;
    ctx.strokeStyle = getEliteColor(bpm); ctx.lineWidth = 3;
    const step = rect.width / (hrHistory.length - 1);
    const points = hrHistory.map((val, i) => ({ x: i * step, y: rect.height - ((val - 60) / 100) * rect.height }));
    ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) { ctx.lineTo(points[i].x, points[i].y); }
    ctx.stroke();
}

function generateHitMap() {
    const map = document.getElementById('touch-map');
    if (!map) return;
    map.innerHTML = "";
    
    if (currentView === "front") {
        map.style.gridTemplateRows = '19% 10% 9% 11% 23% 28%';
        const fG = [
            "", "", "TOGGLE_BACK",                   // R1 (19%) 
            "Deltoids", "Pectorals", "Deltoids",     // R2 (10%) 
            "Biceps", "Abdominals", "Biceps",        // R3 (9%) 
            "Forearms", "Abdominals", "Forearms",    // R4 (11%) 
            "", "Quads", "",                         // R5 (23%) 
            "", "", ""                               // R6 (28%) 
        ];
        fG.forEach((m) => {
            const div = document.createElement('div');
            div.className = "hit";
            if (m === "TOGGLE_BACK") div.onclick = () => switchView('back');
            else if (m !== "") div.onclick = () => selectMuscle(m);
            map.appendChild(div);
        });
    } else {
        map.style.gridTemplateRows = '12% 10% 22% 8% 4% 20% 24%';
        const bG = [
            "TOGGLE_FRONT", "", "",                   
            "Trapezoids", "Trapezoids", "Trapezoids", 
            "Triceps", "Lats", "Triceps",             
            "", "", "",                               
            "Glutes", "Glutes", "Glutes",             
            "Hamstrings", "Hamstrings", "Hamstrings", 
            "Calves", "Calves", "Calves"              
        ];
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
    if ((isTrain || isCalibrating)) return;
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
    document.querySelectorAll('.app-view').forEach(view => {
        view.classList.remove('view-active');
    });
    
    document.getElementById('view-' + tabId).classList.add('view-active');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active-nav');
    });
    btnElement.classList.add('active-nav');
    
    // Only fetch/calculate the exact ranges when opening the cardio tab 
    // to ensure they use the most current localstorage age.
    if (tabId === 'cardio') {
        initCardioZones();
    }
}
