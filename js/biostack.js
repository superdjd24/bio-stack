/**
 * BIOSTACK ELITE ENGINE v11.90 STABLE
 * Full File Restore & Ghost Mode (Dev Bypass) Engine Active
 */

let bpm = 0; 
let currentView = "front";
let isTrain = false;
let activeExercise = null;
let currentTargetMuscle = null;
let setCounter = 0;

let currentSessionSets = [];

let readyTriggerBpm = parseInt(localStorage.getItem('bio_ready_trigger')) || 110;
let liftState = 'IDLE'; 
let currentSetMax = 0;
const DROP_THRESHOLD = 6;

let editingSetId = null;

let z1MinPct = parseFloat(localStorage.getItem('bio_z1_min')) || 0.60;
let z1MaxPct = parseFloat(localStorage.getItem('bio_z1_max')) || 0.70;
let z2MinPct = parseFloat(localStorage.getItem('bio_z2_min')) || 0.70;
let z2MaxPct = parseFloat(localStorage.getItem('bio_z2_max')) || 0.80;
let z3MinPct = parseFloat(localStorage.getItem('bio_z3_min')) || 0.80;
let z3MaxPct = parseFloat(localStorage.getItem('bio_z3_max')) || 0.90;

let hrHistory = [];
let totalCalories = 0;
let lastTimestamp = null;

let z1Time = parseInt(localStorage.getItem('bio_z1_time')) || 0;
let z2Time = parseInt(localStorage.getItem('bio_z2_time')) || 0;
let z3Time = parseInt(localStorage.getItem('bio_z3_time')) || 0;

const DB = {
    'Trapezoids': ['Dumbbell Shrugs', 'Barbell Shrugs', 'Upright Rows', 'Farmer Walk', 'Cable Shrugs', 'Trap Bar Shrugs', 'Smith Machine Shrugs', 'Snatch Grip High Pull', 'Overhead Shrugs', 'Kettlebell Shrugs'],
    'Deltoids': ['Lateral Raises', 'Military Press', 'Front Raises', 'Reverse Pec Deck', 'Arnold Press', 'Face Pulls', 'Cable Lateral Raises', 'Seated Dumbbell Press', 'Machine Shoulder Press', 'Upright Rows'],
    'Pectorals': ['Bench Press', 'Incline Press', 'Decline Press', 'Dumbbell Flyes', 'Cable Crossovers', 'Pec Deck Machine', 'Push-ups', 'Dips (Chest Focus)', 'Machine Chest Press', 'Pullovers'],
    'Biceps': ['Barbell Curls', 'Hammer Curls', 'Preacher Curls', 'Concentration Curls', 'Cable Curls', 'Incline Dumbbell Curls', 'Spider Curls', 'EZ Bar Curls', 'Reverse Curls', 'Zottman Curls'],
    'Triceps': ['Pushdowns', 'Dips', 'Skullcrushers', 'Overhead Extension', 'Close-Grip Bench', 'Kickbacks', 'Rope Pushdowns', 'Machine Extension', 'JM Press', 'Tate Press'],
    'Forearms': ['Wrist Curls', 'Reverse Wrist Curls', 'Farmer Walk', 'Plate Pinches', 'Wrist Rollers', 'Reverse Curls', 'Hammer Curls', 'Dead Hangs', 'Gripper Squeezes', 'Towel Rollups'],
    'Abdominals': ['Leg Raises', 'Crunches', 'Planks', 'Russian Twists', 'Cable Crunches', 'Ab Wheel Rollouts', 'Hanging Knee Raises', 'V-Ups', 'Bicycle Twists', 'Decline Crunches'],
    'Quads': ['Squats', 'Leg Press', 'Hack Squats', 'Front Squats', 'Lunges', 'Bulgarian Split Squats', 'Leg Extensions', 'Goblet Squats', 'Sissy Squats', 'Step-ups'],
    'Lats': ['Lat Pulldowns', 'Bent Over Rows', 'Pull-ups', 'T-Bar Rows', 'Seated Cable Rows', 'Single-Arm DB Rows', 'Straight-Arm Pulldowns', 'Meadows Rows', 'Machine Rows', 'Pendlay Rows'],
    'Glutes': ['Hip Thrusts', 'Glute Bridges', 'Romanian Deadlifts', 'Cable Pull-Throughs', 'Kickbacks', 'Bulgarian Split Squats', 'Walking Lunges', 'Reverse Hypers', 'Step-ups', 'Sumo Deadlifts'],
    'Hamstrings': ['Deadlifts', 'Romanian Deadlifts', 'Lying Leg Curls', 'Seated Leg Curls', 'Glute-Ham Raises', 'Good Mornings', 'Stiff-Legged Deadlifts', 'Nordic Curls', 'Kettlebell Swings', 'Swiss Ball Curls'],
    'Calves': ['Standing Calf Raises', 'Seated Calf Raises', 'Donkey Calf Raises', 'Leg Press Calf Raises', 'Single-Leg Calf Raises', 'Jump Rope', 'Tibialis Raises', 'Box Jumps', 'Sled Pushes', 'Toe Walks']
};

function getEliteColor(val) {
    const age = parseInt(localStorage.getItem('bio_age')) || 30;
    const maxHr = 220 - age;
    if (val >= maxHr * z3MinPct) return '#ff3333'; 
    if (val >= maxHr * z2MinPct) return '#ffcc00'; 
    if (val >= maxHr * z1MinPct) return '#33cc33'; 
    return '#00f2ff'; 
}

function updateTriggerSetting(val) {
    readyTriggerBpm = parseInt(val);
    document.getElementById('trigger-val-display').innerText = readyTriggerBpm + ' BPM';
    localStorage.setItem('bio_ready_trigger', readyTriggerBpm);
    const contextBox = document.getElementById('active-ex-context');
    if (contextBox) contextBox.innerText = `Recovery Trigger: ${readyTriggerBpm} BPM`;
}

function saveZoneSettings() {
    const age = parseInt(localStorage.getItem('bio_age')) || 30;
    const maxHr = 220 - age;

    z1MinPct = parseFloat(document.getElementById('set-z1-min').value) / maxHr;
    z1MaxPct = parseFloat(document.getElementById('set-z1-max').value) / maxHr;
    z2MinPct = parseFloat(document.getElementById('set-z2-min').value) / maxHr;
    z2MaxPct = parseFloat(document.getElementById('set-z2-max').value) / maxHr;
    z3MinPct = parseFloat(document.getElementById('set-z3-min').value) / maxHr;
    z3MaxPct = parseFloat(document.getElementById('set-z3-max').value) / maxHr;

    localStorage.setItem('bio_z1_min', z1MinPct);
    localStorage.setItem('bio_z1_max', z1MaxPct);
    localStorage.setItem('bio_z2_min', z2MinPct);
    localStorage.setItem('bio_z2_max', z2MaxPct);
    localStorage.setItem('bio_z3_min', z3MinPct);
    localStorage.setItem('bio_z3_max', z3MaxPct);

    initCardioZones(); 
    alert("Cardio Zone targets securely mapped.");
}

async function initSystem() {
    const w = document.getElementById('user-weight').value;
    const a = document.getElementById('user-age').value;
    
    if (!w || !a) return alert("Weight and Age required.");

    // ---- GHOST MODE BYPASS ----
    if (w === '999') {
        localStorage.setItem('bio_weight', '180');
        localStorage.setItem('bio_age', a);
        document.getElementById('trigger-slider').value = readyTriggerBpm;
        document.getElementById('trigger-val-display').innerText = readyTriggerBpm + ' BPM';
        
        initCardioZones();
        renderLogbook(); 

        document.getElementById('login-screen').style.display = 'none';
        const dash = document.getElementById('main-dashboard');
        dash.style.display = 'block';
        setTimeout(() => { dash.style.opacity = '1'; }, 50);
        generateHitMap();

        // Simulated Heart Rate Generator
        bpm = 85; 
        setInterval(() => {
            let targetBpm = 85;
            if (liftState === 'LIFTING') targetBpm = 145 + (Math.random() * 15);
            else if (liftState === 'RESTING') targetBpm = 105 + (Math.random() * 5);
            else if (liftState === 'READY' && isTrain) targetBpm = 95 + (Math.random() * 5);
            else targetBpm = 85 + (Math.random() * 5);

            bpm += (targetBpm - bpm) * 0.15; // Smooth easing
            let liveBpm = Math.round(bpm);

            const hrEl = document.getElementById('hr-val');
            hrEl.innerText = liveBpm;
            hrEl.style.color = getEliteColor(liveBpm);
            
            calculateTelemetry(liveBpm);
            hrHistory.push(liveBpm);
            if (hrHistory.length > 55) hrHistory.shift();
            
            drawSparkline();
            updateCardioUI(liveBpm); 
            
            // Push simulated BPM to the lift state machine
            let tempBpm = bpm; 
            bpm = liveBpm; 
            processBioState(); 
            bpm = tempBpm;

        }, 1000);

        return; 
    }
    // ---- END GHOST MODE ----

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
        renderLogbook(); 

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
            
            calculateTelemetry(bpm);
            
            hrHistory.push(bpm);
            if (hrHistory.length > 55) hrHistory.shift();
            
            drawSparkline();
            updateCardioUI(bpm); 
            processBioState(); 
        });
    } catch (e) { alert("Link Failed: " + e.message); }
}

function calculateTelemetry(currentBpm) {
    const weight = localStorage.getItem('bio_weight') || 180;
    const age = localStorage.getItem('bio_age') || 30;
    const maxHr = 220 - age;
    const now = Date.now();
    if (!lastTimestamp) { lastTimestamp = now; return; }
    
    const deltaMs = now - lastTimestamp;
    const durationSecs = deltaMs / 1000;
    const durationMinutes = deltaMs / 60000; 
    lastTimestamp = now;
    
    if (currentBpm >= maxHr * z3MinPct) z3Time += durationSecs;
    else if (currentBpm >= maxHr * z2MinPct) z2Time += durationSecs;
    else if (currentBpm >= maxHr * z1MinPct) z1Time += durationSecs;

    localStorage.setItem('bio_z1_time', Math.round(z1Time));
    localStorage.setItem('bio_z2_time', Math.round(z2Time));
    localStorage.setItem('bio_z3_time', Math.round(z3Time));
    
    let calPerMinute = ( (age * 0.2017) + (weight * 0.09036) + (currentBpm * 0.6309) - 55.0969 ) / 4.184;
    if (calPerMinute < 0) calPerMinute = 0;
    
    const sliceCals = calPerMinute * durationMinutes;
    totalCalories += sliceCals;
    
    const calVal = Math.round(totalCalories);
    document.getElementById('total-cal').innerText = calVal;
    
    if(document.getElementById('cardio-stat-cals')) document.getElementById('cardio-stat-cals').innerText = calVal;
    if(document.getElementById('cardio-stat-fat')) document.getElementById('cardio-stat-fat').innerText = (totalCalories / 3500).toFixed(3);
}

function startTraining() {
    activeExercise = document.getElementById('ex-name-modal').innerText;
    closeAction();
    
    isTrain = true; 
    document.getElementById('active-ex-tag').innerText = activeExercise;
    const contextBox = document.getElementById('active-ex-context');
    contextBox.innerText = `Recovery Trigger: ${readyTriggerBpm} BPM`;
    contextBox.style.display = 'block';
    
    setCounter = 0;
    currentSessionSets = [];
    document.getElementById('sets-list').innerHTML = '';
    
    document.getElementById('hud-in-flow').style.display = "block";
    document.getElementById('sidebar').style.display = "none";
    
    liftState = 'READY';
    processBioState(); 
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
            btn.onclick = null; 
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
        btn.onclick = null; 
        if (bpm > currentSetMax) currentSetMax = bpm;
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
        if (bpm > currentSetMax) currentSetMax = bpm; 
        if (bpm <= readyTriggerBpm) {
            finalizeSet();
        }
    }
}

function finalizeSet() {
    setCounter++;
    
    currentSessionSets.push({
        id: setCounter,
        maxBpm: currentSetMax,
        weight: null,
        reps: null,
        volume: 0
    });

    renderDynamicSetList();

    currentSetMax = 0;
    liftState = 'READY';
    processBioState();
}

function renderDynamicSetList() {
    const container = document.getElementById('sets-list');
    container.innerHTML = ''; 
    
    if (currentSessionSets.length === 0) return;

    let globalMaxBpm = 150; 
    let globalMaxVol = 1;

    currentSessionSets.forEach(s => {
        if (s.maxBpm > globalMaxBpm) globalMaxBpm = s.maxBpm;
        if (s.volume > globalMaxVol) globalMaxVol = s.volume;
    });

    currentSessionSets.forEach(set => {
        let barPx = "0%";
        let barLabel = "";
        let hasData = set.volume > 0;

        if (hasData) {
            barPx = Math.min(100, (set.volume / globalMaxVol) * 100) + "%";
            barLabel = set.volume + " EFFORT";
        } else {
            barPx = Math.min(100, (set.maxBpm / globalMaxBpm) * 100) + "%";
            barLabel = set.maxBpm + " BPM";
        }

        const item = document.createElement('div');
        item.className = 'intensity-item';
        
        const label = document.createElement('span');
        label.className = 'intensity-label';
        label.innerText = `Set ${set.id}`;

        const bar = document.createElement('div');
        bar.className = 'set-bar';
        
        const inner = document.createElement('span');
        inner.className = 'bar-inner-label';
        inner.innerText = barLabel;
        bar.appendChild(inner);
        
        const actionContainer = document.createElement('div');
        actionContainer.style.display = 'flex';
        
        const actionBtn = document.createElement('button');
        actionBtn.className = 'edit-set-btn';
        
        if (hasData) {
            actionBtn.innerText = '✓';
            actionBtn.style.background = 'var(--glow-blue)';
            actionBtn.style.color = '#000';
            actionBtn.style.border = 'none';
            actionBtn.style.fontSize = '0.9rem';
        } else {
            actionBtn.innerText = '+';
        }
        
        actionBtn.onclick = () => openSetData(set.id);
        actionContainer.appendChild(actionBtn);

        item.appendChild(label);
        item.appendChild(bar);
        item.appendChild(actionContainer);
        container.appendChild(item);

        requestAnimationFrame(() => {
            setTimeout(() => {
                bar.style.width = barPx;
                bar.classList.add('revealed');
            }, 50);
        });
    });

    setTimeout(() => { container.scrollTop = container.scrollHeight; }, 50);
}

function openSetData(setId) {
    document.getElementById('log-set-num').innerText = setId;
    const setObj = currentSessionSets.find(s => s.id === parseInt(setId));
    
    document.getElementById('log-weight').value = setObj.weight || '';
    document.getElementById('log-reps').value = setObj.reps || '';
    editingSetId = setId;
    
    document.getElementById('set-data-modal').style.display = 'block';
    setTimeout(() => { document.getElementById('log-weight').focus(); }, 100);
}

function closeSetData() {
    document.getElementById('set-data-modal').style.display = 'none';
    editingSetId = null;
}

function saveSetData() {
    const w = parseFloat(document.getElementById('log-weight').value);
    const r = parseFloat(document.getElementById('log-reps').value);
    
    if(!w || !r) return alert('Please enter both weight and reps.');

    const setObj = currentSessionSets.find(s => s.id === parseInt(editingSetId));
    if (setObj) {
        setObj.weight = w;
        setObj.reps = r;
        setObj.volume = w * r; 
    }
    
    closeSetData();
    renderDynamicSetList(); 
}

function clearIntensityBars() {
    const list = document.getElementById('sets-list');
    if (list) list.innerHTML = '';
}

function exitTraining() {
    if (currentSessionSets.length > 0 && activeExercise) {
        let logbook = JSON.parse(localStorage.getItem('bio_logbook')) || [];
        
        let mBpm = 0; let mVol = 0;
        currentSessionSets.forEach(s => {
            if(s.maxBpm > mBpm) mBpm = s.maxBpm;
            if(s.volume > mVol) mVol = s.volume;
        });

        const newEntry = {
            date: new Date().toISOString(),
            exercise: activeExercise,
            muscle: currentTargetMuscle,
            setsCount: currentSessionSets.length,
            maxBpm: mBpm,
            maxVol: mVol
        };
        logbook.push(newEntry);
        localStorage.setItem('bio_logbook', JSON.stringify(logbook));
    }

    isTrain = false;
    liftState = 'IDLE';
    document.getElementById('hud-in-flow').style.display = "none";
    document.getElementById('active-ex-context').style.display = 'none';
    clearIntensityBars();
    document.getElementById('sidebar').style.display = "block";
    document.getElementById('active-ex-tag').innerText = "NO ACTIVE EXERCISE";
}

function formatTime(totalSeconds) {
    if (totalSeconds < 60) return `${Math.round(totalSeconds)}s`;
    return `${Math.floor(totalSeconds / 60)}m`;
}

function renderLogbook() {
    document.getElementById('log-tot-cal').innerText = Math.round(totalCalories);
    document.getElementById('log-tot-fat').innerText = (totalCalories / 3500).toFixed(3);
    
    document.getElementById('log-z1-time').innerText = formatTime(z1Time);
    document.getElementById('log-z2-time').innerText = formatTime(z2Time);
    document.getElementById('log-z3-time').innerText = formatTime(z3Time);

    const container = document.getElementById('logbook-content');
    container.innerHTML = '';
    
    let logbook = JSON.parse(localStorage.getItem('bio_logbook')) || [];
    if (logbook.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:#555; padding-top:30px; font-weight:800; font-size:0.8rem; text-transform:uppercase;">No completed sessions found.</div>';
        return;
    }

    logbook.sort((a, b) => new Date(b.date) - new Date(a.date));

    let currentDateStr = "";

    logbook.forEach(entry => {
        const d = new Date(entry.date);
        const dateString = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        
        if (dateString !== currentDateStr) {
            const h = document.createElement('div');
            h.className = 'log-date-header';
            h.innerText = dateString;
            container.appendChild(h);
            currentDateStr = dateString;
        }

        const card = document.createElement('div');
        card.className = 'log-card';

        let volString = entry.maxVol > 0 ? `<span style="color:var(--glow-blue)">${entry.maxVol} MAX EFFORT</span>` : `<span style="color:#ff0044">${entry.maxBpm} MAX BPM</span>`;

        card.innerHTML = `
            <div class="log-ex-title">${entry.exercise}</div>
            <div class="log-ex-muscle">${entry.muscle}</div>
            <div class="log-set-row">
                <span>Completed Sets:</span>
                <span style="font-weight:900; color:#fff;">${entry.setsCount}</span>
            </div>
            <div class="log-set-row">
                <span>Peak Metric:</span>
                <span style="font-weight:900;">${volString}</span>
            </div>
        `;
        container.appendChild(card);
    });
}

function initCardioZones() {
    const age = parseInt(localStorage.getItem('bio_age')) || 30; 
    const maxHr = 220 - age;
    
    const z1Min = Math.round(maxHr * z1MinPct); const z1Max = Math.round(maxHr * z1MaxPct);
    const z2Min = Math.round(maxHr * z2MinPct); const z2Max = Math.round(maxHr * z2MaxPct);
    const z3Min = Math.round(maxHr * z3MinPct); const z3Max = Math.round(maxHr * z3MaxPct);
    
    document.getElementById('pill-z1').innerText = `${z1Min} - ${z1Max} BPM`;
    document.getElementById('pill-z2').innerText = `${z2Min} - ${z2Max} BPM`;
    document.getElementById('pill-z3').innerText = `${z3Min} - ${z3Max} BPM`;
}

function updateCardioUI(currentBpm) {
    const age = parseInt(localStorage.getItem('bio_age')) || 30;
    const maxHr = 220 - age;
    document.querySelectorAll('.zone-card').forEach(c => c.classList.remove('active-zone'));
    
    if (currentBpm >= maxHr * z3MinPct && currentBpm <= maxHr * z3MaxPct) document.getElementById('zone-3').classList.add('active-zone');
    else if (currentBpm >= maxHr * z2MinPct && currentBpm < maxHr * z2MaxPct) document.getElementById('zone-2').classList.add('active-zone');
    else if (currentBpm >= maxHr * z1MinPct && currentBpm < maxHr * z1MaxPct) document.getElementById('zone-1').classList.add('active-zone');
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
    currentTargetMuscle = m; 
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
    if (tabId === 'logbook') renderLogbook(); 
}

const canvasP = document.getElementById('cardio-particles');
let ctxP = canvasP ? canvasP.getContext('2d') : null;
let particles = [];

const canvasL = document.getElementById('lift-particles');
let ctxL = canvasL ? canvasL.getContext('2d') : null;
let liftParticles = [];

function initPhysicsEngines() {
    if (canvasP) requestAnimationFrame(animateCardioParticles);
    if (canvasL) requestAnimationFrame(animateLiftParticles);
}

function animateCardioParticles() {
    requestAnimationFrame(animateCardioParticles);
    if (!document.getElementById('view-cardio').classList.contains('view-active')) return;
    if (!ctxP) return;

    if (canvasP.width !== window.innerWidth || canvasP.height !== window.innerHeight) {
        canvasP.width = window.innerWidth;
        canvasP.height = window.innerHeight;
    }
    if (canvasP.width === 0) return; 

    ctxP.clearRect(0, 0, canvasP.width, canvasP.height);

    const age = parseInt(localStorage.getItem('bio_age')) || 30;
    const maxHr = 220 - age;
    let intensity = 0;
    const z1BpmThreshold = maxHr * z1MinPct; 
    
    if (bpm >= z1BpmThreshold) {
        intensity = Math.max(0, Math.min(1, (bpm - z1BpmThreshold) / (maxHr - z1BpmThreshold)));
        let spawnRate = 1 + Math.floor(intensity * 4); 
        for (let i = 0; i < spawnRate; i++) {
            if (Math.random() > 0.4) { 
                particles.push({
                    x: canvasP.width * 0.65 + (Math.random() * 20 - 10), 
                    y: canvasP.height * 0.3 + Math.random() * (canvasP.height * 0.45), 
                    vx: -(0.5 + Math.random() * 1.5), 
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

function animateLiftParticles() {
    requestAnimationFrame(animateLiftParticles);
    if (!document.getElementById('view-weights').classList.contains('view-active')) return;
    if (!ctxL || !isTrain) {
        if (ctxL) ctxL.clearRect(0, 0, canvasL.width, canvasL.height);
        return;
    }

    if (canvasL.width !== window.innerWidth || canvasL.height !== window.innerHeight) {
        canvasL.width = window.innerWidth;
        canvasL.height = window.innerHeight;
    }
    if (canvasL.width === 0) return; 

    ctxL.clearRect(0, 0, canvasL.width, canvasL.height);

    let spawnState = 'NONE';
    if (liftState === 'LIFTING') {
        spawnState = 'BURN';
    } else if (liftState === 'RESTING' || (liftState === 'READY' && bpm > readyTriggerBpm)) {
        spawnState = 'REPAIR';
    }

    const muscleBounds = {
        'trapezoids': { t: 0.15, h: 0.08 }, 'deltoids': { t: 0.18, h: 0.10 },
        'pectorals': { t: 0.21, h: 0.08 }, 'biceps': { t: 0.22, h: 0.12 },
        'triceps': { t: 0.22, h: 0.12 }, 'forearms': { t: 0.35, h: 0.10 },
        'abdominals': { t: 0.30, h: 0.12 }, 'lats': { t: 0.25, h: 0.15 },
        'glutes': { t: 0.45, h: 0.10 }, 'quads': { t: 0.48, h: 0.20 },
        'hamstrings': { t: 0.48, h: 0.20 }, 'calves': { t: 0.70, h: 0.15 }
    };

    let spawnArea = { top: canvasL.height * 0.25, height: canvasL.height * 0.4, left: canvasL.width * 0.6, width: canvasL.width * 0.2 };
    const activeOverlay = Array.from(document.querySelectorAll('.muscle-overlay')).find(img => parseFloat(img.style.opacity) > 0);

    if (activeOverlay) {
        const imgRect = activeOverlay.getBoundingClientRect();
        const id = activeOverlay.id.replace('overlay-', '');
        const bounds = muscleBounds[id] || { t: 0.2, h: 0.4 };

        spawnArea.top = imgRect.top + (imgRect.height * bounds.t);
        spawnArea.height = imgRect.height * bounds.h;
        spawnArea.left = imgRect.left + (imgRect.width * 0.3); 
        spawnArea.width = imgRect.width * 0.4;
    }

    if (spawnState !== 'NONE') {
        let spawnRate = (spawnState === 'BURN') ? 3 : 2;
        for (let i = 0; i < spawnRate; i++) {
            if (Math.random() > 0.4) {
                let isBurn = (spawnState === 'BURN');
                let startX, startY, velX;
                
                if (isBurn) {
                    startX = spawnArea.left + Math.random() * (spawnArea.width * 0.3); 
                    startY = spawnArea.top + Math.random() * spawnArea.height;
                    velX = -(0.8 + Math.random() * 1.2); 
                } else {
                    startX = canvasL.width * 0.05; 
                    startY = spawnArea.top + Math.random() * spawnArea.height;
                    velX = (0.8 + Math.random() * 1.2);
                }

                liftParticles.push({
                    x: startX,
                    y: startY,
                    vx: velX,
                    vy: (Math.random() - 0.5) * 0.8, 
                    life: 200 + Math.random() * 100, 
                    maxLife: 300,
                    size: 1.0 + Math.random() * 2.0,
                    color: isBurn ? getEliteColor(bpm) : '#ffffff',
                    type: spawnState,
                    targetX: spawnArea.left + (spawnArea.width * 0.5)
                });
            }
        }
    }

    ctxL.globalCompositeOperation = 'screen';
    for (let i = liftParticles.length - 1; i >= 0; i--) {
        let p = liftParticles[i];
        p.x += p.vx; p.y += p.vy; p.life--;

        let dead = false;
        if (p.life <= 0) dead = true;
        if (p.type === 'BURN' && p.x < 0) dead = true;
        if (p.type === 'REPAIR' && p.x > p.targetX) dead = true; 

        if (dead) { liftParticles.splice(i, 1); continue; }

        ctxL.globalAlpha = Math.max(0, p.life / p.maxLife) * 0.7; 
        ctxL.fillStyle = p.color;
        ctxL.beginPath(); ctxL.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctxL.fill();
    }
    
    ctxL.globalAlpha = 1.0;
    ctxL.globalCompositeOperation = 'source-over';
}

initPhysicsEngines();
