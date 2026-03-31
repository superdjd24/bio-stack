/**
 * BIOSTACK ELITE v1.7 (Full-Body Layered)
 */

let bpm = 0, targetHR = 0, currentMusc = "", currentEx = "";
let isTrain = false, isCal = false, sMax = 0;

const DB = {
    'Traps': ['Dumbbell Shrugs', 'Barbell Shrugs'],
    'Delts': ['Lateral Raises', 'Overhead Press'],
    'Pecs': ['Bench Press', 'Chest Flys'],
    'Biceps': ['Hammer Curls', 'EZ Bar Curls'],
    'Triceps': ['Skull Crushers', 'Tricep Pushdowns'],
    'Forearms': ['Wrist Curls', 'Reverse Curls'],
    'Abs': ['Weighted Crunches', 'Leg Raises'],
    'Quads': ['Barbell Squats', 'Leg Press']
};

function selectMuscle(m) {
    if (isTrain || isCal) return;
    currentMusc = m.toLowerCase();
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
    document.getElementById('status-bar').innerText = "LIVE BIO-TELEMETRY ACTIVE";
}

function closeAll() {
    document.querySelectorAll('.overlay').forEach(o => o.classList.remove('visible'));
    document.querySelectorAll('.muscle-overlay').forEach(img => {
        img.style.opacity = 0;
        img.classList.remove('throbbing');
    });
    isTrain = false; isCal = false;
    document.getElementById('status-bar').innerText = "Biometric Link Ready";
}

function runEngine() {
    if (isCal && bpm > sMax) sMax = bpm;

    if (isTrain && currentMusc && targetHR > 0) {
        const overlay = document.getElementById(`overlay-${currentMusc}`);
        if (!overlay) return;

        const factor = Math.min(Math.max((bpm - 70) / (targetHR - 70), 0), 1);
        overlay.style.opacity = factor;

        if (factor > 0.92) {
            overlay.classList.add('throbbing');
        } else {
            overlay.classList.remove('throbbing');
        }

        const sb = document.getElementById('status-bar');
        if (bpm >= 110) {
            sb.innerText = "REST / RECOVERY DETECTED";
            sb.style.color = "#58a6ff";
        } else {
            sb.innerText = "MUSCLE PRIMED - START NEXT SET";
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

function startCalibration() {
    isCal = true; sMax = 0;
    document.getElementById('menu-action').classList.remove('visible');
    document.getElementById('status-bar').innerText = "CALIBRATING MAX HR FAILURE POINT...";
}

document.getElementById('conn-btn').onclick = initBluetooth;
