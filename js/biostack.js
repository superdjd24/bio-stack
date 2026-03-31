// --- BIOSTACK 3D ENGINE & LOGIC ---

let scene, camera, renderer, raycaster, mouse;
let muscles = {}; // Stores 3D mesh objects
let selectedMuscle = null;
let currentExercise = "";
let isCalibrating = false;
let isTraining = false;
let targetMaxHR = 0;
let sessionMax = 0;
let liveBPM = 0;

const EXERCISES = {
    'Chest': ['Bench Press', 'Dumbbell Flys'],
    'Biceps': ['Barbell Curls', 'Hammer Curls'],
    'Quads': ['Squats', 'Leg Press'],
    'Back': ['Lat Pulldown', 'Deadlift']
};

init3D();
animate();

function init3D() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Create Procedural Wireframe Human
    createMuscle('Chest', [0, 1.2, 0.3], [0.8, 0.5, 0.2]);
    createMuscle('Biceps', [0.6, 0.8, 0], [0.2, 0.6, 0.2]);
    createMuscle('Biceps', [-0.6, 0.8, 0], [0.2, 0.6, 0.2]);
    createMuscle('Quads', [0.3, -0.5, 0], [0.3, 1, 0.3]);
    createMuscle('Quads', [-0.3, -0.5, 0], [0.3, 1, 0.3]);
    createMuscle('Back', [0, 1.2, -0.3], [0.9, 0.8, 0.2]);

    camera.position.z = 4;
    camera.position.y = 0.5;

    window.addEventListener('click', onDocumentMouseDown, false);
    window.addEventListener('touchstart', (e) => {
        mouse.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
        checkIntersection();
    });
}

function createMuscle(name, pos, size) {
    const geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
    const wire = new THREE.WireframeGeometry(geo);
    const mat = new THREE.LineBasicMaterial({ color: 0x00f2ff, transparent: true, opacity: 0.5 });
    const mesh = new THREE.LineSegments(wire, mat);
    
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.userData = { name: name, baseColor: 0x00f2ff };
    
    scene.add(mesh);
    if (!muscles[name]) muscles[name] = [];
    muscles[name].push(mesh);
}

function onDocumentMouseDown(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    checkIntersection();
}

function checkIntersection() {
    if (isTraining || isCalibrating) return;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children);
    
    if (intersects.length > 0) {
        const name = intersects[0].object.userData.name;
        openMuscleMenu(name);
    }
}

function openMuscleMenu(name) {
    selectedMuscle = name;
    document.getElementById('target-title').innerText = "Target: " + name;
    const list = document.getElementById('exercise-list');
    list.innerHTML = "";
    EXERCISES[name].forEach(ex => {
        const b = document.createElement('button');
        b.className = "btn";
        b.innerText = ex;
        b.onclick = () => openActionMenu(ex);
        list.appendChild(b);
    });
    document.getElementById('exercise-menu').classList.add('active');
}

function openActionMenu(ex) {
    currentExercise = ex;
    document.getElementById('action-title').innerText = ex;
    const saved = localStorage.getItem('biostack_max_' + ex) || "--";
    document.getElementById('target-max').innerText = saved;
    targetMaxHR = parseInt(saved) || 0;
    
    document.getElementById('exercise-menu').classList.remove('active');
    document.getElementById('action-menu').classList.add('active');
}

// --- BIOMETRIC HANDLERS ---

async function connect() {
    try {
        const device = await navigator.bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }] });
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('heart_rate');
        const char = await service.getCharacteristic('heart_rate_measurement');
        await char.startNotifications();
        char.addEventListener('characteristicvaluechanged', (e) => {
            liveBPM = e.target.value.getUint8(1);
            updateUI();
        });
        document.getElementById('initBtn').style.display = 'none';
    } catch (e) { alert("Use Bluefy on iOS!"); }
}

function updateUI() {
    document.getElementById('hr-display').innerText = liveBPM;
    
    if (isCalibrating && liveBPM > sessionMax) sessionMax = liveBPM;

    if (isTraining && targetMaxHR > 0) {
        // THE GRADIENT MATH: Blue (0x00f2ff) to Red (0xff0044)
        const factor = Math.min(Math.max((liveBPM - 70) / (targetMaxHR - 70), 0), 1);
        const r = Math.floor(0 + (255 - 0) * factor);
        const g = Math.floor(242 + (0 - 242) * factor);
        const b = Math.floor(255 + (68 - 255) * factor);
        const colorStr = `rgb(${r},${g},${b})`;

        muscles[selectedMuscle].forEach(m => {
            m.material.color.set(colorStr);
            m.material.opacity = 0.5 + (factor * 0.5);
        });

        const status = document.getElementById('status-indicator');
        if (liveBPM >= 110) {
            status.innerText = "Rest / Recovery Mode";
            status.className = "recovery";
        } else {
            status.innerText = "Muscle Primed - Start Next Set";
            status.className = "";
        }
    }
}

// Button Events
document.getElementById('initBtn').onclick = connect;
document.getElementById('cal-btn').onclick = () => {
    isCalibrating = true; sessionMax = 0;
    document.getElementById('action-menu').classList.remove('active');
    document.getElementById('status-indicator').innerText = "PUSH TO FAILURE...";
    // In a real app, add a "Finish" button here
    setTimeout(() => {
        localStorage.setItem('biostack_max_' + currentExercise, sessionMax);
        alert("Calibrated at " + sessionMax);
        isCalibrating = false;
        backToExercises();
    }, 10000); // 10s test window
};

document.getElementById('start-btn').onclick = () => {
    isTraining = true;
    document.getElementById('action-menu').classList.remove('active');
};

function closeMenu() { document.getElementById('exercise-menu').classList.remove('active'); }
function backToExercises() { 
    document.getElementById('action-menu').classList.remove('active');
    openMuscleMenu(selectedMuscle);
}

function animate() {
    requestAnimationFrame(animate);
    scene.rotation.y += 0.005; // Gentle rotation
    renderer.render(scene, camera);
}
