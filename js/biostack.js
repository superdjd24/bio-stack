/**
 * BIOSTACK ELITE v1.3
 * 2D High-Fidelity Logic
 */

const EXERCISES = {
    'Chest': ['Bench Press', 'Incline Press'],
    'Biceps': ['Barbell Curls', 'Hammer Curls'],
    'Quads': ['Squats', 'Leg Extensions'],
    'Back': ['Lat Pulldowns', 'Deadlifts'],
    'Triceps': ['Dips', 'Pushdowns']
};

let liveBPM = 0, targetMaxHR = 0, currentEx = "", currentMusc = "";
let isCal = false, isTrain = false, sessionMax = 0;
let isFrontView = true;

function toggleBodyView() {
    isFrontView = !isFrontView;
    document.getElementById('anatomy-container').style.transform = isFrontView ? 'translateX(0)' : 'translateX(-50%)';
    document.getElementById('toggle-view').innerText = isFrontView ? 'FRONT' : 'BACK';
}

function selectMuscle(m) {
    if (isTrain || isCal) return;
    currentMusc = m;
    document.getElementById('musc-title').innerText = m;
    const list = document.getElementById('ex-list');
    list.innerHTML = "";
    EXERCISES[m].forEach(ex => {
        const b = document.createElement('button');
        b.className = "btn";
        b.innerText = ex;
        b.onclick = () => openAction(ex);
        list.appendChild(b);
    });
    document.getElementById('ex-menu').classList.add('visible');
}

function openAction(ex) {
    currentEx = ex;
    document.getElementById('ex-title').innerText = ex;
    const saved = localStorage.getItem('biostack_max_' + ex) || "--";
    document.getElementById('target-max').innerText = saved;
    targetMaxHR = parseInt(saved) || 0;
    document.getElementById('ex-menu').classList.remove('visible');
    document.getElementById('action-menu').classList.add('visible');
}

function closeOverlays() {
    document.querySelectorAll('.overlay').forEach(o => o.classList.remove('visible'));
    isTrain = false; isCal = false;
    document.querySelectorAll('.muscle').forEach(m => m.classList.remove('active-set'));
}

async function initBluetooth() {
    try {
        const device = await navigator.bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }] });
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('heart_rate');
        const char = await service.getCharacteristic('heart_rate_measurement');
        await char.startNotifications();
        char.addEventListener('characteristicvaluechanged', (e) => {
            liveBPM = e.target.value.getUint8(1);
            document.getElementById('hr-val').innerText = liveBPM;
            updateEngine();
        });
        document.getElementById('status-bar').innerText = "Coospo Connected";
    } catch (e) { alert("Use Bluefy on iOS!"); }
}

function updateEngine() {
    if (isCal && liveBPM > sessionMax) sessionMax = liveBPM;
    
    if (isTrain && targetMaxHR > 0) {
        // Find all paths associated with the current muscle
        const musclePaths = document.querySelectorAll('.muscle');
        musclePaths.forEach(p => {
            if (p.id.includes(currentMusc.toLowerCase())) {
                const factor = Math.min(Math.max((liveBPM - 70) / (targetMaxHR - 70), 0), 1);
                // Transition color from Blue to Red
                const r = Math.floor(0 + 255 * factor);
                const g = Math.floor(242 * (1 - factor));
                const b = Math.floor(255 * (1 - factor));
                p.style.stroke = `rgb(${r},${g},${b})`;
                p.style.fill = `rgba(${r},${g},${b}, ${0.1 + factor * 0.4})`;
            }
        });

        const status = document.getElementById('status-bar');
        if (liveBPM >= 110) status.innerText = "REST / RECOVERING MODE";
        else status.innerText = "MUSCLE PRIMED - START SET";
    }
}

function startCal() {
    isCal = true; sessionMax = 0;
    document.getElementById('action-menu').classList.remove('visible');
    document.getElementById('status-bar').innerText = "PUSH TO FAILURE...";
    // Finish button logic here...
    setTimeout(() => {
        localStorage.setItem('biostack_max_' + currentEx, sessionMax);
        alert("Calibrated: " + sessionMax);
        closeOverlays();
    }, 10000);
}

function startSet() {
    isTrain = true;
    document.getElementById('action-menu').classList.remove('visible');
    document.getElementById('status-bar').innerText = "SET IN PROGRESS";
}

document.getElementById('conn-btn').onclick = initBluetooth;
