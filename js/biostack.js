// --- BIOSTACK STANDALONE 3D ENGINE ---
let scene, camera, renderer, raycaster, mouse;
let muscles = {}; 
let selectedMuscle = null;
let liveBPM = 0;
let targetMaxHR = 0;
let isTraining = false;

// Initialize Scene
init();
animate();

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 4);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // BUILD THE "BIO-STACK" BODY (Procedural Replacement for anatomy.glb)
    // Head
    createBox('Head', [0, 2.3, 0], [0.4, 0.5, 0.4]);
    // Torso (Chest/Abs)
    createBox('Chest', [0, 1.5, 0], [0.9, 1.1, 0.5]);
    // Arms (Biceps/Triceps)
    createBox('Biceps', [0.7, 1.5, 0], [0.3, 0.8, 0.3]);
    createBox('Biceps', [-0.7, 1.5, 0], [0.3, 0.8, 0.3]);
    // Legs (Quads)
    createBox('Quads', [0.3, 0.4, 0], [0.4, 1.2, 0.4]);
    createBox('Quads', [-0.3, 0.4, 0], [0.4, 1.2, 0.4]);

    window.addEventListener('click', onTouch);
    window.addEventListener('touchstart', onTouch);
}

function createBox(name, pos, size) {
    const geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
    const wireframe = new THREE.WireframeGeometry(geometry);
    const material = new THREE.LineBasicMaterial({ color: 0x00f2ff, transparent: true, opacity: 0.6 });
    const line = new THREE.LineSegments(wireframe, material);
    
    line.position.set(pos[0], pos[1], pos[2]);
    line.userData = { name: name };
    
    scene.add(line);
    if (!muscles[name]) muscles[name] = [];
    muscles[name].push(line);
}

function onTouch(event) {
    const clientX = event.clientX || (event.touches ? event.touches[0].clientX : 0);
    const clientY = event.clientY || (event.touches ? event.touches[0].clientY : 0);
    
    mouse.x = (clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children);

    if (intersects.length > 0) {
        const muscleName = intersects[0].object.userData.name;
        // Logic to trigger your Exercise Menu from the previous version
        if (typeof openMuscleMenu === "function") openMuscleMenu(muscleName);
    }
}

function animate() {
    requestAnimationFrame(animate);
    scene.rotation.y += 0.005; // Slow rotation like the image you shared
    
    // THE DYNAMIC GLOW LOGIC
    if (isTraining && selectedMuscle && targetMaxHR > 0) {
        const factor = Math.min(Math.max((liveBPM - 70) / (targetMaxHR - 70), 0), 1);
        
        // Interpolate Cyan (0, 242, 255) to Red (255, 0, 68)
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
