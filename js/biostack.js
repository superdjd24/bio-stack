/**
 * BIOSTACK ELITE ENGINE v6.7
 * Bluetooth Recovery & Calorie Logic
 */
let bpm = 0;
let currentMusc = "";
let currentView = "front";
let isTrain = false;
let hrHistory = [];
let totalCalories = 0;  // FIX: Must be initialized
let lastTimestamp = null; // FIX: Must be initialized

window.onload = () => {
    generateHitMap();
    
    // BACKUP LINK: Manual listener if onclick fails
    const pill = document.getElementById('hr-pill');
    if(pill) {
        pill.addEventListener('click', () => {
            console.log("Bluetooth Initializing...");
            startStream();
        });
    }
};

async function startStream() {
    try {
        const device = await navigator.bluetooth.requestDevice({ 
            filters: [{ services: ['heart_rate'] }] 
        });
        console.log("Device selected:", device.name);
        
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('heart_rate');
        const char = await service.getCharacteristic('heart_rate_measurement');
        
        await char.startNotifications();
        console.log("Notifications started.");
        
        char.addEventListener('characteristicvaluechanged', (e) => {
            const val = e.target.value.getUint8(1);
            bpm = val;
            document.getElementById('hr-val').innerText = bpm;
            
            // Trigger Calorie Logic
            calculateCals(bpm);
            
            hrHistory.push(bpm);
            if (hrHistory.length > 55) hrHistory.shift();
            drawSparkline();
        });
    } catch (e) { 
        console.error("Bluetooth Error:", e);
        alert("Link Error: " + e.message); 
    }
}

function calculateCals(currentBpm) {
    const weight = localStorage.getItem('bio_weight') || 180;
    const age = localStorage.getItem('bio_age') || 30;
    
    const now = Date.now();
    if (!lastTimestamp) {
        lastTimestamp = now;
        return;
    }

    const durationHours = (now - lastTimestamp) / (1000 * 60 * 60);
    lastTimestamp = now;

    // Key-Telfer Formula
    let calPerMinute = ( (age * 0.2017) + (weight * 0.09036) + (currentBpm * 0.6309) - 55.0969 );
    if (calPerMinute < 0) calPerMinute = 0;

    const sliceCals = (calPerMinute / 60) * (durationHours * 60);
    totalCalories += sliceCals;
    
    const calDisplay = document.getElementById('total-cal');
    if(calDisplay) calDisplay.innerText = Math.round(totalCalories);
}

// ... Rest of your functions (generateHitMap, switchView, drawSparkline) stay the same ...
