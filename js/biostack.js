/**
 * BIOSTACK 3D ENGINE v1.2
 * High-Fidelity Anatomical Skeleton Integration
 */

let scene, camera, renderer, raycaster, mouse;
let muscleMeshes = []; // Array of meshes for raycasting
let selectedMuscle = null;
let liveBPM = 0, targetMaxHR = 0, isTraining = false, isCalibrating = false, sessionMax = 0;

init3D();
animate();

function init3D() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.2, 3.5);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // Canvas sits in the background
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.zIndex = '1';
    document.body.appendChild(renderer.domElement);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // UPGRADE: Building a "Skeleton" Mesh (Placeholder for GLB)
    // We are using Wireframe Cylinders and Spheres to look like an anatomical mesh
    buildSkeleton();

    window.addEventListener('mousedown', onSelect);
    window.addEventListener('touchstart', (e) => onSelect(e.touches[0]));
}

function buildSkeleton() {
    // Torso/Chest
    addPart('Chest', new THREE.CylinderGeometry(0.5, 0.3, 1, 8, 4, true), [0, 1.5, 0]);
    // Arms
    addPart('Biceps', new THREE.CylinderGeometry(0.12, 0.1, 0.8, 6, 2, true), [0.7, 1.4, 0], [0, 0, 0.3]);
    addPart('Biceps', new THREE.CylinderGeometry(0.12, 0.1, 0.8, 6, 2, true), [-0.7, 1.4, 0], [0, 0, -0.3]);
    // Legs
    addPart('Quads', new THREE.CylinderGeometry(0.2, 0.15, 1.2, 6, 2, true), [0.3, 0.4, 0]);
    addPart('Quads', new THREE.CylinderGeometry(0.2, 0.15, 1.2, 6, 2, true), [-0.3, 0.4, 0]);
    // Head
    addPart('Head', new THREE.IcosahedronGeometry(0.25, 1), [0, 2.2, 0]);
}

function addPart(name, geo, pos, rot = [0,0,0]) {
    const wire = new THREE.WireframeGeometry(geo);
    const mat = new THREE.LineBasicMaterial({ color: 0x00f2ff, transparent: true, opacity: 0.4 });
    const mesh = new THREE.LineSegments(wire, mat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.rotation.set(rot[0], rot[1], rot[2]);
    mesh.userData = { name: name };
    scene.add(mesh);
    muscleMeshes.push(mesh);
}

function onSelect(input) {
    if (isTraining || isCalibrating) return;
    
    mouse.x = (input.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(input.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(muscleMeshes);

    if (intersects.length > 0) {
        const name = intersects[0].object.userData.name;
        selectedMuscle = name;
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
        
        muscleMeshes.forEach(m => {
            if (m.userData.name === selectedMuscle) {
                m.material.color.set(`rgb(${r},${g},${b})`);
                m.material.opacity = 0.4 + (factor * 0.6);
            }
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
            document.getElementById('hr-display').innerText = liveBPM;
            if (isCalibrating && liveBPM > sessionMax) sessionMax = liveBPM;
            
            const status = document.getElementById('status-msg');
            if (isTraining) {
                if (liveBPM >= 110) status.innerText = "REST / RECOVERING...";
                else status.innerText = "MUSCLE PRIMED - START NEXT SET";
            }
        });
    } catch (err) { console.log(err); }
}
