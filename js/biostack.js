// Add this to your biostack.js global variables
let totalCalories = 0;
let lastTimestamp = null;

// Replace your current characterEventListener inside startStream()
char.addEventListener('characteristicvaluechanged', (e) => {
    bpm = e.target.value.getUint8(1);
    document.getElementById('hr-val').innerText = bpm;
    
    // CALORIE MATH
    calculateCals(bpm);
    
    hrHistory.push(bpm);
    if (hrHistory.length > 55) hrHistory.shift();
    drawSparkline();
});

function calculateCals(currentBpm) {
    const weight = localStorage.getItem('bio_weight') || 180; // Fallback to 180lbs
    const age = localStorage.getItem('bio_age') || 30;
    
    const now = Date.now();
    if (!lastTimestamp) {
        lastTimestamp = now;
        return;
    }

    // Time elapsed in hours
    const durationHours = (now - lastTimestamp) / (1000 * 60 * 60);
    lastTimestamp = now;

    /**
     * Key-Telfer Formula (General Approximation)
     * Calories = [(Age * 0.2017) + (Weight * 0.09036) + (HR * 0.6309) - 55.0969] * (Time / 4.184)
     */
    let calPerMinute = ( (age * 0.2017) + (weight * 0.09036) + (currentBpm * 0.6309) - 55.0969 );
    
    // Ensure we don't count "negative" calories at rest
    if (calPerMinute < 0) calPerMinute = 0;

    // Convert per-minute rate to the actual time slice elapsed
    const sliceCals = (calPerMinute / 60) * (durationHours * 60);
    
    totalCalories += sliceCals;
    
    // Update UI
    document.getElementById('total-cal').innerText = Math.round(totalCalories);
}
