/**
 * BIOSTACK 3D ENGINE v1.1
 * Updated with Pointer Event Support and State Bridges
 */

let scene, camera, renderer, raycaster, mouse;
let muscles = {};
let selectedMuscle = null;
let currentExercise = "";
let liveBPM = 0;
let targetMaxHR = 0;
let isTraining = false;
let isCalibrating = false;
let sessionMax = 0;

// Initialize
init3D();
animate();

function init3D() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.5, 4);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Ensure the canvas sits BEHIND the UI layer
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.zIndex = '1';
    document.body.appendChild(renderer.domElement);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Create Procedural Wireframe Model
    createMuscle('Head', [0, 2.4, 0], [0.4, 0.5, 0.4]);
    createMuscle('Chest', [0, 1.6, 0.1], [0.9, 1.0, 0.5]);
    createMuscle('Biceps', [0.75, 1.6, 0], [0.3, 0.7, 0.3]);
    createMuscle('Biceps', [-0.75, 1.6, 0], [0.3, 0.7, 0.3]);
    createMuscle('Quads', [0.3, 0.5, 0], [0.4, 1.2, 0.4]);
    createMuscle('Quads', [-0.3, 0.5, 0], [0.4, 1.2, 0.4]);
    createMuscle('Back', [0, 1.6, -0.3], [1.0, 1.0, 0.2]);

    // Handle Taps
    window.addEventListener('click', onSelect);
    window.addEventListener('touchstart', (e) => { onSelect(e.touches[0]); });
}

function createMuscle(name, pos, size) {
    const geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
    const wire = new THREE.WireframeGeometry(geo);
    const mat = new THREE.LineBasicMaterial({ color: 0x00f2ff, transparent: true, opacity: 0.6 });
    const mesh = new THREE.LineSegments(wire, mat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.userData = { name: name };
    scene.add(mesh);
    if (!muscles[name]) muscles[name] = [];
    muscles[name].push(mesh);
}

function onSelect(input) {
    if (isTraining || isCalibrating) return;

    mouse.x = (input.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(input.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children);

    if (intersects.length > 0) {
        const name = intersects[0].object.userData.name;
        selectedMuscle = name;
        // Call the UI bridge in index.html
        if (window.openMuscleMenu) window.openMuscleMenu(name);
    }
}

function animate() {
    requestAnimationFrame(animate);
    scene.rotation.y += 0.005;

    if (isTraining && selectedMuscle && targetMaxHR > 0) {
        const factor = Math.min(Math.max((liveBPM - 70) / (targetMaxHR - 70), 0), 1);
        const r = Math.floor(0 + (255 - 0) * factor);
        const g = Math.floor(242 + (0 - 242) * factor);
        const b = Math.floor(255 + (68 - 255) * factor);
        
        muscles[selectedMuscle].forEach(mesh => {
            mesh.material.color.set(`rgb(${r},${g},${b})`);
            mesh.material.opacity = 0.6 + (factor * 0.4);
        });
    }
    renderer.render(scene, camera);
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
            if (document.getElementById('hr-display')) {
                document.getElementById('hr-display').innerText = liveBPM;
            }
            handleHRLogic();
        });
    } catch (err) { console.log(err); }
}

function handleHRLogic() {
    if (isCalibrating && liveBPM > sessionMax) sessionMax = liveBPM;
    const status = document.getElementById('status-msg');
    if (isTraining && liveBPM >= 110) {
        status.innerText = "REST / RECOVERING...";
        status.className = "recovery-alert";
    } else if (isTraining && liveBPM < 110) {
        status.innerText = "MUSCLE PRIMED - START NEXT SET";
        status.className = "";
    }
}
