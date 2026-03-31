/**
 * BIOSTACK 3D ENGINE v1.0
 * Procedural Wireframe Model & Heart Rate Integration
 */

let scene, camera, renderer, raycaster, mouse;
let muscles = {}; // Holds the 3D mesh groups
let selectedMuscle = null;
let currentExercise = "";
let liveBPM = 0;
let targetMaxHR = 0;
let isTraining = false;
let isCalibrating = false;
let sessionMax = 0;

// Initialize the 3D Environment
init3D();
animate();

function init3D() {
    // 1. Scene Setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.5, 4); // Positioned to see the full body

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // 2. Build Procedural Wireframe Body (Replacement for anatomy.glb)
    // Format: createMuscle(Name, [x, y, z], [width, height, depth])
    createMuscle('Head', [0, 2.4, 0], [0.4, 0.5, 0.4]);
    createMuscle('Chest', [0, 1.6, 0], [0.9, 1.0, 0.5]);
    createMuscle('Biceps', [0.75, 1.6, 0], [0.3, 0.7, 0.3]);  // Right
    createMuscle('Biceps', [-0.75, 1.6, 0], [0.3, 0.7, 0.3]); // Left
    createMuscle('Quads', [0.3, 0.5, 0], [0.4, 1.2, 0.4]);   // Right
    createMuscle('Quads', [-0.3, 0.5, 0], [0.4, 1.2, 0.4]);  // Left
    createMuscle('Back', [0, 1.6, -0.3], [1.0, 1.0, 0.2]);

    // 3. Interaction Listeners
    window.addEventListener('click', onSelect);
    window.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        onSelect(touch);
    });
}

function createMuscle(name, pos, size) {
    const geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
    const wire = new THREE.WireframeGeometry(geo);
    // Cyan glow material to match your reference image
    const mat = new THREE.LineBasicMaterial({ 
        color: 0x00f2ff, 
        transparent: true, 
        opacity: 0.6 
    });
    const mesh = new THREE.LineSegments(wire, mat);
    
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.userData = { name: name };
    
    scene.add(mesh);
    
    if (!muscles[name]) muscles[name] = [];
    muscles[name].push(mesh);
}

function onSelect(event) {
    // Only allow selection if not currently in a set/calibrating
    if (isTraining || isCalibrating) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children);

    if (intersects.length > 0) {
        const muscleName = intersects[0].object.userData.name;
        selectedMuscle = muscleName;
        document.getElementById('status').innerText = "SELECTED: " + muscleName;
        
        // This triggers the UI logic in your index.html
        if (window.openMuscleMenu) window.openMuscleMenu(muscleName);
    }
}

// --- BIOMETRIC & ANIMATION LOOP ---

function animate() {
    requestAnimationFrame(animate);

    // Slow rotation like the reference image
    scene.rotation.y += 0.005;

    // DYNAMIC MUSCLE GLOW LOGIC
    if (isTraining && selectedMuscle && targetMaxHR > 0) {
        // Map HR to a factor between 0.0 and 1.0
        // (Assumes 70 is rest and targetMaxHR is failure)
        const factor = Math.min(Math.max((liveBPM - 70) / (targetMaxHR - 70), 0), 1);
        
        // Interpolate Cyan (0, 242, 255) to Red (255, 0, 68)
        const r = Math.floor(0 + (255 - 0) * factor);
        const g = Math.floor(242 + (0 - 242) * factor);
        const b = Math.floor(255 + (68 - 255) * factor);
        const colorStr = `rgb(${r},${g},${b})`;

        muscles[selectedMuscle].forEach(mesh => {
            mesh.material.color.set(colorStr);
            mesh.material.opacity = 0.6 + (factor * 0.4); // Get brighter as it gets redder
        });
    }

    renderer.render(scene, camera);
}

// --- BLUETOOTH HOOKS ---
async function initBluetooth() {
    try {
        const device = await navigator.bluetooth.requestDevice({ 
            filters: [{ services: ['heart_rate'] }] 
        });
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('heart_rate');
        const char = await service.getCharacteristic('heart_rate_measurement');
        
        await char.startNotifications();
        char.addEventListener('characteristicvaluechanged', (e) => {
            liveBPM = e.target.value.getUint8(1);
            
            // Link to the UI display if it exists
            const display = document.getElementById('hr-display');
            if (display) display.innerText = liveBPM;
            
            // Pass to 3D engine for color processing
            handleHRLogic();
        });

        document.getElementById('status').innerText = "COOSPO CONNECTED";
    } catch (err) {
        console.error(err);
        alert("Bluetooth connection failed. Ensure you are using Bluefy on iOS.");
    }
}

function handleHRLogic() {
    if (isCalibrating && liveBPM > sessionMax) {
        sessionMax = liveBPM;
    }
    // Recovery Check
    const status = document.getElementById('status');
    if (isTraining && liveBPM >= 110) {
        status.innerText = "REST / RECOVERING...";
    } else if (isTraining && liveBPM < 110) {
        status.innerText = "MUSCLE PRIMED - START NEXT SET";
    }
}
