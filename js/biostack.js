async function initSystem() {
    const w = document.getElementById('user-weight').value;
    const h = document.getElementById('user-height').value;
    const a = document.getElementById('user-age').value;

    if(!w || !h || !a) return alert("Fill all fields.");

    try {
        const device = await navigator.bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }] });
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('heart_rate');
        const char = await service.getCharacteristic('heart_rate_measurement');
        
        await char.startNotifications();
        
        // Success: Store and Transition
        localStorage.setItem('bio_weight', w);
        localStorage.setItem('bio_age', a);
        
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-dashboard').style.display = 'block';
        setTimeout(() => document.getElementById('main-dashboard').style.opacity = '1', 50);

        char.addEventListener('characteristicvaluechanged', (e) => {
            bpm = e.target.value.getUint8(1);
            document.getElementById('hr-val').innerText = bpm;
            calculateCals(bpm);
            hrHistory.push(bpm);
            if (hrHistory.length > 55) hrHistory.shift();
            drawSparkline();
        });

    } catch (e) {
        alert("Link Failed: " + e.message);
    }
}
