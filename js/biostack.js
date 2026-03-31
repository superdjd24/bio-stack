/**
 * BIOSTACK ELITE v1.4
 */

const DB = {
    'Chest': ['Bench Press', 'Incline Press'],
    'Biceps': ['Barbell Curls', 'Hammer Curls'],
    'Quads': ['Squats', 'Leg Press'],
    'Back': ['Lat Pulldowns', 'Rows'],
    'Abs': ['Crunches', 'Leg Raises'],
    'Triceps': ['Dips', 'Pushdowns'],
    'Glutes': ['Hip Thrusts', 'Deadlifts']
};

let bpm = 0, targetHR = 0, currentEx = "", currentMusc = "";
let isCal = false, isTrain = false, sMax = 0, isFront = true;

function toggleView() {
    isFront = !isFront;
    document.getElementById('anatomy-slider').style.transform = isFront ? 'translateX(0)' : 'translateX(-50%)';
    document.getElementById('toggle-btn').innerText = isFront ? 'BACK' : 'FRONT';
}

function selectMuscle(m) {
    if (isTrain || isCal) return;
    currentMusc = m;
    document.getElementById('musc-name').innerText = m;
    const container = document.getElementById('list-container');
    container.innerHTML = "";
    DB[m].forEach(ex => {
        const btn = document.createElement('button');
        btn.className = "btn";
        btn.innerText = ex;
        btn.onclick = () => openAction(ex);
        container.appendChild(btn);
    });
    document.getElementById('menu-ex').classList.add('visible');
}

function openAction(ex) {
    currentEx = ex;
    document.getElementById('ex-name').innerText = ex;
    const val = localStorage.getItem('biostack_max_' + ex) || "--";
    document.getElementById('max-val').innerText = val;
    targetHR = parseInt(val) || 0;
    document.getElementById('menu-ex').classList.remove('visible');
    document.getElementById('menu-action').classList.add('visible');
}

function closeAll() {
    document.querySelectorAll('.overlay').forEach(o => o.classList.remove('visible'));
    isTrain = false; isCal = false;
    document.querySelectorAll('.muscle').forEach(p => {
        p.style.stroke = ''; p.style.fill = '';
    });
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
        document.getElementById('status-bar').innerText = "LINK ACTIVE";
        document.getElementById('conn-btn').style.display = "none";
    } catch (e) { alert("Use Bluefy on iOS."); }
}

function runEngine() {
    if (isCal && bpm > sMax) sMax = bpm;
    
    if (isTrain && targetHR > 0) {
        const factor = Math.min(Math.max((bpm - 70) / (targetHR - 70), 0), 1);
        const r = Math.floor(0 + 255 * factor);
        const g = Math.floor(242 * (1 - factor));
        const b = Math.floor(255 * (1 - factor));
        
        document.querySelectorAll('.muscle').forEach(p => {
            if (p.id.includes(currentMusc.toLowerCase().substring(0, 4))) {
                p.style.stroke = `rgb(${r},${g},${b})`;
                p.style.fill = `rgba(${r},${g},${b}, ${0.1 + factor * 0.4})`;
            }
        });

        const sb = document.getElementById('status-bar');
        if (bpm >= 110) sb.innerText = "REST / RECOVERY";
        else sb.innerText = "MUSCLE PRIMED - START SET";
    }
}

function triggerCal() {
    isCal = true; sMax = 0;
    document.getElementById('menu-action').classList.remove('visible');
    document.getElementById('status-bar').innerText = "PUSH TO FAILURE...";
    setTimeout(() => {
        localStorage.setItem('biostack_max_' + currentEx, sMax);
        alert("Calibrated: " + sMax + " BPM");
        closeAll();
    }, 10000);
}

function triggerSet() {
    isTrain = true;
    document.getElementById('menu-action').classList.remove('visible');
    document.getElementById('status-bar').innerText = "TRAINING ACTIVE";
}

document.getElementById('conn-btn').onclick = initBluetooth;
