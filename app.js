// =====================================================
// AI_Ayrton1 - FIXED VERSION v3
// =====================================================
// KEY FIX: Now sends ACTUAL VALUES + DELTAS to AI
// So AI can output both curr speeds AND delta comparisons
// =====================================================

const items = $input.all();
const webhookData = items[0].json;
const body = webhookData.body || webhookData;

const referenceLap = body.reference_lap || webhookData.reference_lap;
const currentLap = body.current_lap || webhookData.current_lap;
const driverName = body.driver_name || webhookData.driver_name || 'Driver';
const trackName = body.track_name || webhookData.track_name || 'Track';
const channelMappings = body.channel_mappings || webhookData.channel_mappings || {};

if (!referenceLap || !currentLap || !Array.isArray(referenceLap) || !Array.isArray(currentLap)) {
    return [{ json: { success: false, error: "Invalid lap data" } }];
}

// Channel mapping helpers
function getChannelName(mapping) {
    if (typeof mapping === 'string') return mapping;
    if (mapping && mapping.csvColumn) return mapping.csvColumn;
    return null;
}

const channels = {};
for (const [key, value] of Object.entries(channelMappings)) {
    const colName = getChannelName(value);
    if (colName) channels[key] = colName;
}

function getValue(row, channelKey, defaultVal = null) {
    const colName = channels[channelKey];
    if (!colName || row[colName] === undefined || row[colName] === null) return defaultVal;
    const val = parseFloat(row[colName]);
    return isNaN(val) ? defaultVal : val;
}

// Corner detection
function detectCorners(lapData) {
    const corners = [];
    const speeds = lapData.map(row => getValue(row, 'speed', 0));
    const distances = lapData.map(row => getValue(row, 'distance', 0));
    const brakes = lapData.map(row => getValue(row, 'brake', 0));
    const steers = lapData.map(row => Math.abs(getValue(row, 'steer', 0)));

    const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const minSpeedThreshold = avgSpeed * 0.85;
    const windowSize = Math.max(10, Math.floor(lapData.length / 100));

    for (let i = windowSize; i < speeds.length - windowSize; i++) {
        const localMin = Math.min(...speeds.slice(i - windowSize, i + windowSize + 1));
        
        if (speeds[i] === localMin && speeds[i] < minSpeedThreshold) {
            const hasSteeringInput = steers[i] > 1.0;
            const hasBrakingBefore = brakes.slice(Math.max(0, i - windowSize * 2), i).some(b => b > 5);

            if (hasSteeringInput || hasBrakingBefore) {
                let entryIdx = i;
                for (let j = i - 1; j >= Math.max(0, i - windowSize * 3); j--) {
                    if (speeds[j] > speeds[entryIdx]) entryIdx = j;
                }

                let exitIdx = i;
                for (let j = i + 1; j < Math.min(speeds.length, i + windowSize * 3); j++) {
                    if (speeds[j] > speeds[exitIdx] * 1.1) { exitIdx = j; break; }
                }

                const lastCorner = corners[corners.length - 1];
                if (!lastCorner || distances[i] - lastCorner.apexDistance > 50) {
                    const maxSteer = Math.max(...steers.slice(entryIdx, exitIdx + 1));
                    corners.push({
                        id: corners.length + 1,
                        apexIdx: i,
                        entryIdx: entryIdx,
                        exitIdx: exitIdx,
                        apexDistance: Math.round(distances[i]),
                        type: maxSteer > 30 ? 'hairpin' : maxSteer > 15 ? 'tight' : maxSteer > 5 ? 'medium' : 'fast'
                    });
                }
            }
        }
    }
    return corners;
}

// Calculate brake smoothness
function calculateBrakeSmoothness(brakeValues) {
    if (brakeValues.length < 5) return null;
    const derivatives = [];
    for (let i = 1; i < brakeValues.length; i++) {
        derivatives.push(Math.abs(brakeValues[i] - brakeValues[i - 1]));
    }
    if (derivatives.length === 0) return null;
    const avgDerivative = derivatives.reduce((a, b) => a + b, 0) / derivatives.length;
    const variance = derivatives.reduce((sum, d) => sum + Math.pow(d - avgDerivative, 2), 0) / derivatives.length;
    return Math.sqrt(variance);
}

// Extract metrics
function getCornerMetrics(lapData, corner, maxBrake) {
    const speeds = lapData.map(row => getValue(row, 'speed', 0));
    const brakes = lapData.map(row => getValue(row, 'brake', 0));
    const throttles = lapData.map(row => getValue(row, 'throttle', 0));
    const distances = lapData.map(row => getValue(row, 'distance', 0));
    
    let brakePoint = null;
    let brakePointIdx = null;
    let peakBrake = 0;
    let peakBrakeIdx = corner.entryIdx;
    
    for (let i = corner.apexIdx - 1; i >= Math.max(0, corner.apexIdx - 200); i--) {
        if (brakes[i] > peakBrake) {
            peakBrake = brakes[i];
            peakBrakeIdx = i;
        }
        if (brakes[i] > 5 && (i === 0 || brakes[i - 1] <= 5)) {
            brakePoint = Math.round(distances[i]);
            brakePointIdx = i;
        }
    }
    
    const brakeStartIdx = brakePointIdx || Math.max(0, corner.apexIdx - 100);
    const brakingZone = brakes.slice(brakeStartIdx, corner.apexIdx + 1);
    const smoothnessRaw = calculateBrakeSmoothness(brakingZone);
    
    const trailZone = brakes.slice(peakBrakeIdx, corner.apexIdx + 1);
    const trailValues = trailZone.filter(b => b > peakBrake * 0.05 && b < peakBrake * 0.5);
    const hasTrailBraking = trailValues.length > 3;
    let trailDist = 0;
    if (hasTrailBraking && peakBrakeIdx < corner.apexIdx) {
        trailDist = Math.round(distances[corner.apexIdx] - distances[peakBrakeIdx]);
    }
    
    let throttlePoint = null;
    for (let i = corner.apexIdx; i < Math.min(lapData.length, corner.apexIdx + 200); i++) {
        if (throttles[i] > 20 && (i === corner.apexIdx || throttles[i - 1] < 20)) {
            throttlePoint = Math.round(distances[i]);
            break;
        }
    }
    
    const gLat = lapData.map(row => Math.abs(getValue(row, 'gLat', 0) || getValue(row, 'gLatF', 0) || 0));
    const cornerG = gLat.slice(corner.entryIdx, corner.exitIdx + 1);
    const peakG = cornerG.length > 0 ? Math.max(...cornerG) : 0;
    
    const peakBrakeNorm = maxBrake > 0 ? Math.round((peakBrake / maxBrake) * 100) : 0;
    
    return {
        entrySpeed: Math.round(speeds[corner.entryIdx]),
        apexSpeed: Math.round(speeds[corner.apexIdx]),
        exitSpeed: Math.round(speeds[corner.exitIdx]),
        brakeAt: brakePoint,
        peakBrake: peakBrake,
        peakBrakeNorm: peakBrakeNorm,
        throttleAt: throttlePoint,
        hasTrailBraking: hasTrailBraking,
        trailDist: trailDist,
        peakG: Math.round(peakG * 100) / 100,
        smoothnessRaw: smoothnessRaw
    };
}

const refCorners = detectCorners(referenceLap);
const currCorners = detectCorners(currentLap);

const allBrakes = [...referenceLap, ...currentLap].map(row => getValue(row, 'brake', 0)).filter(b => b > 0);
const maxBrake = allBrakes.length > 0 ? Math.max(...allBrakes) : 100;

const cornerData = refCorners.map((ref, idx) => {
    const curr = currCorners.find(c => Math.abs(c.apexDistance - ref.apexDistance) < 50);
    const refM = getCornerMetrics(referenceLap, ref, maxBrake);
    const currM = curr ? getCornerMetrics(currentLap, curr, maxBrake) : null;
    
    let deltas = null;
    let smoothnessComparison = null;
    
    if (currM) {
        deltas = {
            entrySpeed: currM.entrySpeed - refM.entrySpeed,
            apexSpeed: currM.apexSpeed - refM.apexSpeed,
            exitSpeed: currM.exitSpeed - refM.exitSpeed,
            brakePoint: (currM.brakeAt && refM.brakeAt) ? currM.brakeAt - refM.brakeAt : null,
            throttlePoint: (currM.throttleAt && refM.throttleAt) ? currM.throttleAt - refM.throttleAt : null,
            peakBrake: currM.peakBrakeNorm - refM.peakBrakeNorm,
            trailDist: currM.trailDist - refM.trailDist
        };
        
        if (currM.smoothnessRaw !== null && refM.smoothnessRaw !== null && refM.smoothnessRaw > 0) {
            const smoothnessRatio = currM.smoothnessRaw / refM.smoothnessRaw;
            if (smoothnessRatio > 1.3) smoothnessComparison = 'much rougher than reference';
            else if (smoothnessRatio > 1.1) smoothnessComparison = 'slightly rougher than reference';
            else if (smoothnessRatio < 0.7) smoothnessComparison = 'much smoother than reference';
            else if (smoothnessRatio < 0.9) smoothnessComparison = 'slightly smoother than reference';
            else smoothnessComparison = 'similar to reference';
        }
    }
    
    return {
        turn: idx + 1,
        distance: ref.apexDistance,
        type: ref.type,
        ref: refM,
        curr: currM,
        deltas: deltas,
        smoothnessComparison: smoothnessComparison
    };
});

const refTime = getValue(referenceLap[referenceLap.length - 1], 'time', 0);
const currTime = getValue(currentLap[currentLap.length - 1], 'time', 0);
const lapDelta = currTime - refTime;

const refTrailCount = cornerData.filter(c => c.ref.hasTrailBraking).length;
const currTrailCount = cornerData.filter(c => c.curr?.hasTrailBraking).length;

const smoothnessComparisons = cornerData.filter(c => c.smoothnessComparison).map(c => c.smoothnessComparison);
const rougherCount = smoothnessComparisons.filter(s => s.includes('rougher')).length;
const smootherCount = smoothnessComparisons.filter(s => s.includes('smoother')).length;
let overallSmoothnessAssessment = 'similar to reference';
if (rougherCount > smootherCount + 1) overallSmoothnessAssessment = 'generally rougher than reference';
else if (smootherCount > rougherCount + 1) overallSmoothnessAssessment = 'generally smoother than reference';

// =====================================================
// BUILD PROMPT - NOW INCLUDES ACTUAL VALUES!
// =====================================================
const prompt = `You are a racing engineer. Analyze this telemetry and output JSON only.

CRITICAL: 
1. Use COMPARATIVE language in recommendations ("carry 10km/h more" NOT "target 95km/h")
2. Copy the ACTUAL speed values I provide into the curr object
3. Output raw JSON only - NO markdown, NO code blocks

Driver: ${driverName}, Track: ${trackName}
Lap Delta: ${lapDelta > 0 ? '+' : ''}${lapDelta.toFixed(3)}s (${lapDelta > 0 ? 'SLOWER' : 'FASTER'})
Overall braking: ${overallSmoothnessAssessment}
Trail braking: Driver ${currTrailCount}/${cornerData.length}, Reference ${refTrailCount}/${cornerData.length}

CORNER DATA:
${cornerData.map(c => {
    if (!c.curr || !c.deltas) return `T${c.turn}: No matching corner found`;
    const d = c.deltas;
    return `Turn ${c.turn} @ ${c.distance}m (${c.type}):
  CURRENT LAP VALUES: entrySpeed=${c.curr.entrySpeed}, apexSpeed=${c.curr.apexSpeed}, exitSpeed=${c.curr.exitSpeed}, peakBrake=${c.curr.peakBrakeNorm}%, trailBraking=${c.curr.hasTrailBraking}, trailDist=${c.curr.trailDist}m, gLat=${c.curr.peakG}
  REFERENCE VALUES: entrySpeed=${c.ref.entrySpeed}, apexSpeed=${c.ref.apexSpeed}, exitSpeed=${c.ref.exitSpeed}
  DELTAS vs REF: entry ${d.entrySpeed >= 0 ? '+' : ''}${d.entrySpeed}km/h, apex ${d.apexSpeed >= 0 ? '+' : ''}${d.apexSpeed}km/h, exit ${d.exitSpeed >= 0 ? '+' : ''}${d.exitSpeed}km/h
  Braking: ${d.brakePoint !== null ? (d.brakePoint >= 0 ? d.brakePoint + 'm late' : Math.abs(d.brakePoint) + 'm early') : 'N/A'}, Throttle: ${d.throttlePoint !== null ? (d.throttlePoint > 0 ? d.throttlePoint + 'm late' : d.throttlePoint < 0 ? Math.abs(d.throttlePoint) + 'm early' : 'good') : 'N/A'}
  Trail: Driver=${c.curr.trailDist}m, Ref=${c.ref.trailDist}m (${d.trailDist >= 0 ? '+' : ''}${d.trailDist}m)
  Smoothness: ${c.smoothnessComparison || 'N/A'}`;
}).join('\n\n')}

OUTPUT THIS JSON (fill in values from CURRENT LAP VALUES above):
{"trackSegments":[
${cornerData.filter(c => c.curr).map((c, idx) => {
    return `{"type":"corner","name":"Turn ${c.turn}","cornerType":"${c.type}","distance":${c.distance},"curr":{"entrySpeed":${c.curr.entrySpeed},"apexSpeed":${c.curr.apexSpeed},"exitSpeed":${c.curr.exitSpeed},"peakBrake":${c.curr.peakBrakeNorm},"trailBraking":${c.curr.hasTrailBraking},"trailBrakingDist":${c.curr.trailDist},"gLat":${c.curr.peakG}},"delta":{"entrySpeed":${c.deltas.entrySpeed},"apexSpeed":${c.deltas.apexSpeed},"exitSpeed":${c.deltas.exitSpeed}},"smoothness":"${c.smoothnessComparison || 'similar to reference'}","issues":[],"recommendations":[],"timeLoss":0}`;
}).join(',\n')}
],"summary":{"cornerCount":${cornerData.length},"straightCount":${Math.max(0, cornerData.length - 1)},"totalTimeLoss":${Math.abs(lapDelta).toFixed(2)},"issueCount":0},"brakingTechnique":{"smoothnessVsRef":"${overallSmoothnessAssessment}","trailBrakingCount":${currTrailCount},"trailBrakingRef":${refTrailCount},"totalCorners":${cornerData.length}},"coachingMessage":""}

Now fill in the issues, recommendations, timeLoss, issueCount, and coachingMessage based on the data. Keep issues/recommendations COMPARATIVE (e.g., "14km/h slower", "carry 14km/h more").`;

return [{
    json: {
        success: true,
        analysisPrompt: prompt,
        rawData: {
            driver: driverName,
            track: trackName,
            lapDelta: lapDelta,
            cornerCount: cornerData.length
        }
    }
}];
