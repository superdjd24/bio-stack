/**
 * BIOSTACK ELITE v2.2
 * Latency-Aware Buffer Engine
 */

let bpm = 0, targetHR = 0, currentMusc = "", currentEx = "";
let isTrain = false, isCal = false, sMax = 0;
let bufferInterval = null;

const DB = {
    'Trapezoids': ['Dumbbell Shrugs', 'Barbell Shrugs', 'Upright Rows'],
    'Deltoids': ['Lateral Raises', 'Military Press', 'Arnold Press'],
    'Pectorals': ['Bench Press', 'Incline Press', 'Cable Flys'],
    'Biceps': ['Barbell Curls', 'Hammer Curls', 'Preacher Curls'],
    'Triceps': ['Skull Crushers', 'Pushdowns', 'Dips'],
    'Forearms': ['Wrist Curls', 'Reverse Curls'],
    'Abdominals': ['Leg Raises', 'Weighted Crunches', 'Plank'],
    'Quads': ['Barbell Squats', 'Leg Press', 'Hack Squats']
};

function selectMuscle(m) {
    if (isTrain || isCal) return;
    document.querySelectorAll('.muscle-overlay').forEach(img => img.style.opacity = 0);
    currentMusc = m.toLowerCase();
    const overlay = document.getElementById(`overlay-${currentMusc}`);
    if (overlay) overlay.style.opacity = 0.5;
    document.getElementById('musc-name').innerText = m;
    const container = document.getElementById('list-container');
    container.innerHTML = "";
    DB[m].forEach(ex => {
        const b = document.createElement('button');
        b.className = "btn";
        b.innerText = ex;
        b.onclick = () => openAction(ex);
        container.appendChild(b);
    });
    document.getElementById('menu-ex').classList.add('visible');
}

function openAction(ex) {
    currentEx = ex;
    document.getElementById('ex-name').innerText = ex;
    const saved = localStorage.getItem('biostack_max_' + ex) || "--";
    document.getElementById('max-bpm').innerText = saved + " BPM";
    targetHR = parseInt(saved) || 0;
    document.getElementById('menu-ex').classList.remove('visible');
    document.getElementById('menu-action').classList.add('visible');
}

function startTraining() {
    isTrain = true;
    document.getElementById('menu-action').classList.remove('visible');
    document.getElementById('status-bar').innerText = "MONITORING LIVE BIO-METRICS...";
    document.getElementById('status-bar').style.color = "#00f2ff";
    const overlay = document.getElementById(`overlay-${currentMusc}`);
    if (overlay) overlay.style.opacity = 0;
}

function closeAll() {
    document.querySelectorAll('.overlay').forEach(o => o.classList.remove('visible'));
    document.querySelectorAll('.muscle-overlay').forEach(img => {
        img.style.opacity = 0;
        img.classList.remove('throbbing');
    });
    isTrain = false; isCal = false;
    if(bufferInterval) clearInterval(bufferInterval);
    document.getElementById('status-bar').innerText = "Biometric Link Ready";
    document.getElementById('status-bar').style.color = "#8b949e";
}

// CALIBRATION PHASE 1: Tracking the work
function startCalibration() {
    isCal = true; 
    sMax = 0;
    document.getElementById('menu-action').classList.remove('visible');
    document.getElementById('menu-cal').classList.add('visible');
    document.getElementById('cal-live-max').innerText = "--";
    document.getElementById('cal-action-btn').style.display = "block";
    document.getElementById('cal-timer-box').style.display = "none";
    document.getElementById('cal-instruction').innerText = "Push to absolute failure. System will hold for 20s lag after you finish.";
}

// CALIBRATION PHASE 2: Waiting for the lag peak
function startBuffer() {
    document.getElementById('cal-action-btn').style.display = "none";
    document.getElementById('cal-timer-box').style.display = "block";
    document.getElementById('cal-instruction').innerText = "Reps complete. Capturing physiological peak...";
    
    let timeLeft = 20;
    const timerText = document.getElementById('cal-timer');
    
    bufferInterval = setInterval(() => {
        timeLeft--;
        timerText.innerText = `BUFFERING LAG: ${timeLeft}s`;
        
        if (timeLeft <= 0) {
            clearInterval(bufferInterval);
            finishCalibration();
        }
    }, 1000);
}

function finishCalibration() {
    if (sMax > 0) {
        localStorage.setItem('biostack_max_' + currentEx, sMax);
        document.getElementById('status-bar').innerText = `PEAK CALIBRATED: ${sMax} BPM`;
    }
    isCal = false;
    document.getElementById('menu-cal').classList.remove('visible');
    openAction(currentEx); 
}

function runEngine() {
    // Continuous peak tracking during calibration + buffer window
    if (isCal) {
        if (bpm > sMax) {
            sMax = bpm;
            document.getElementById('cal-live-max').innerText = sMax;
        }
    }

    if (isTrain && currentMusc && targetHR > 0) {
        const overlay = document.getElementById(`overlay-${currentMusc}`);
        if (!overlay) return;
        const factor = Math.min(Math.max((bpm - 70) / (targetHR - 70), 0), 1);
        overlay.style.opacity = factor;
        if (factor > 0.92) overlay.classList.add('throbbing');
        else overlay.classList.remove('throbbing');

        const sb = document.getElementById('status-bar');
        if (bpm >= 110) {
            sb.innerText = "REST / RECOVERY DETECTED";
            sb.style.color = "#58a6ff";
        } else {
            sb.innerText = "READY - START NEXT SET";
            sb.style.color = "#00f2ff";
        }
    }
}

async function initBluetooth() {
    try {
        const device = await navigator.bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }] });
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('heart_rate');
        const char = await service.getCharacteristic('heart_rate_measurement');
        await char.startNotifications();
        char.addEventListener('characteristicvaluechanged', (e) => {
            bpm = e.target.value.getUint8(1);
            document.getElementById('hr-val').innerText = bpm;
            runEngine();
        });
        document.getElementById('conn-btn').style.display = "none";
        document.getElementById('status-bar').innerText = "BODY SCAN COMPLETE";
    } catch (e) { alert("Bluetooth connection failed."); }
}

document.getElementById('conn-btn').onclick = initBluetooth;
