// =====================================================
// iRacing Track Maps Database
// =====================================================
// Pre-built track coordinates for accurate track visualization
// Data is normalized X/Y coordinates with distance markers
// =====================================================

const iRacingTrackMaps = {
    
    // Miami International Autodrome - GP Layout
    'miami_gp': {
        name: 'Miami International Autodrome',
        layout: 'Grand Prix',
        length: 5412, // meters
        coordinates: generateMiamiGP()
    },
    
    // Aliases for track matching
    'miami\\gp': 'miami_gp',
    'miami gp': 'miami_gp',
    'miamigp': 'miami_gp',
    
    // Spa-Francorchamps
    'spa': {
        name: 'Circuit de Spa-Francorchamps',
        layout: 'Grand Prix',
        length: 7004,
        coordinates: generateSpa()
    },
    'spa full': 'spa',
    'spa-francorchamps': 'spa',
    
    // Monza
    'monza': {
        name: 'Autodromo Nazionale Monza',
        layout: 'Grand Prix',
        length: 5793,
        coordinates: generateMonza()
    },
    'monza gp': 'monza',
    
    // Suzuka
    'suzuka': {
        name: 'Suzuka International Racing Course',
        layout: 'Grand Prix', 
        length: 5807,
        coordinates: generateSuzuka()
    },
    'suzuka international': 'suzuka',
    
    // Silverstone
    'silverstone': {
        name: 'Silverstone Circuit',
        layout: 'Grand Prix',
        length: 5891,
        coordinates: generateSilverstone()
    },
    'silverstone gp': 'silverstone',
    
    // Nürburgring GP
    'nurburgring gp': {
        name: 'Nürburgring',
        layout: 'Grand Prix',
        length: 5148,
        coordinates: generateNurburgringGP()
    },
    'nurburgring': 'nurburgring gp',
    
    // Laguna Seca
    'laguna': {
        name: 'WeatherTech Raceway Laguna Seca',
        layout: 'Full Course',
        length: 3602,
        coordinates: generateLagunaSeca()
    },
    'laguna seca': 'laguna',
    'weathertech raceway': 'laguna',
    
    // Road America
    'road america': {
        name: 'Road America',
        layout: 'Full Course',
        length: 6515,
        coordinates: generateRoadAmerica()
    },
    'roadamerica': 'road america',
    
    // Watkins Glen
    'watkins glen': {
        name: 'Watkins Glen International',
        layout: 'Full Course',
        length: 5472,
        coordinates: generateWatkinsGlen()
    },
    'watkins': 'watkins glen',
    'the glen': 'watkins glen',
    
    // COTA
    'cota': {
        name: 'Circuit of the Americas',
        layout: 'Grand Prix',
        length: 5513,
        coordinates: generateCOTA()
    },
    'circuit of the americas': 'cota',
    'austin': 'cota'
};

// =====================================================
// Track Coordinate Generators
// =====================================================
// These generate approximate track shapes
// Coordinates are normalized to fit in a reasonable viewport

function generateMiamiGP() {
    // Miami GP - Approximated layout
    const points = [];
    const numPoints = 200;
    
    // Track sections (approximate shape)
    for (let i = 0; i <= numPoints; i++) {
        const pct = i / numPoints;
        const dist = pct * 5412;
        let x, y;
        
        if (pct < 0.08) {
            // Start/finish straight
            x = pct * 12 * 100;
            y = 0;
        } else if (pct < 0.15) {
            // Turn 1-2-3 complex
            const t = (pct - 0.08) / 0.07;
            x = 960 + Math.sin(t * Math.PI) * 150;
            y = t * 300;
        } else if (pct < 0.25) {
            // Back section
            const t = (pct - 0.15) / 0.10;
            x = 960 - t * 400;
            y = 300 + t * 200;
        } else if (pct < 0.35) {
            // Turns 4-5
            const t = (pct - 0.25) / 0.10;
            x = 560 - Math.sin(t * Math.PI * 0.5) * 200;
            y = 500 + t * 100;
        } else if (pct < 0.50) {
            // Long back straight
            const t = (pct - 0.35) / 0.15;
            x = 360 - t * 600;
            y = 600 - t * 100;
        } else if (pct < 0.60) {
            // Chicane section
            const t = (pct - 0.50) / 0.10;
            x = -240 - t * 200;
            y = 500 - Math.sin(t * Math.PI * 2) * 50;
        } else if (pct < 0.75) {
            // Marina section
            const t = (pct - 0.60) / 0.15;
            x = -440 + Math.sin(t * Math.PI) * 300;
            y = 500 - t * 400;
        } else if (pct < 0.90) {
            // Final turns
            const t = (pct - 0.75) / 0.15;
            x = -140 + t * 400;
            y = 100 - Math.sin(t * Math.PI * 0.5) * 100;
        } else {
            // Return to start
            const t = (pct - 0.90) / 0.10;
            x = 260 + t * 700;
            y = 0;
        }
        
        points.push({ x, y, distance: dist, pct: pct });
    }
    
    return points;
}

function generateSpa() {
    const points = [];
    const numPoints = 250;
    
    for (let i = 0; i <= numPoints; i++) {
        const pct = i / numPoints;
        const dist = pct * 7004;
        let x, y;
        
        if (pct < 0.05) {
            // Start to La Source
            x = pct * 20 * 100;
            y = 0;
        } else if (pct < 0.10) {
            // La Source hairpin
            const t = (pct - 0.05) / 0.05;
            x = 100 + Math.cos(t * Math.PI) * 50;
            y = Math.sin(t * Math.PI) * 50;
        } else if (pct < 0.25) {
            // Eau Rouge / Raidillon
            const t = (pct - 0.10) / 0.15;
            x = 50 - t * 300;
            y = 50 + t * 500;
        } else if (pct < 0.40) {
            // Kemmel straight
            const t = (pct - 0.25) / 0.15;
            x = -250 - t * 400;
            y = 550 - t * 100;
        } else if (pct < 0.55) {
            // Les Combes to Malmedy
            const t = (pct - 0.40) / 0.15;
            x = -650 + Math.sin(t * Math.PI) * 200;
            y = 450 - t * 300;
        } else if (pct < 0.70) {
            // Rivage to Pouhon
            const t = (pct - 0.55) / 0.15;
            x = -450 + t * 200;
            y = 150 + Math.sin(t * Math.PI * 2) * 100;
        } else if (pct < 0.85) {
            // Fagnes to Stavelot
            const t = (pct - 0.70) / 0.15;
            x = -250 + t * 400;
            y = 150 - t * 200;
        } else {
            // Blanchimont to Bus Stop
            const t = (pct - 0.85) / 0.15;
            x = 150 + t * 800;
            y = -50 + t * 50;
        }
        
        points.push({ x, y, distance: dist, pct });
    }
    
    return points;
}

function generateMonza() {
    const points = [];
    const numPoints = 200;
    
    for (let i = 0; i <= numPoints; i++) {
        const pct = i / numPoints;
        const dist = pct * 5793;
        let x, y;
        
        // Monza is mostly straights with chicanes
        if (pct < 0.15) {
            // Start straight to first chicane
            x = pct * 6 * 100;
            y = 0;
        } else if (pct < 0.20) {
            // First chicane
            const t = (pct - 0.15) / 0.05;
            x = 900 + t * 100;
            y = Math.sin(t * Math.PI * 2) * 30;
        } else if (pct < 0.30) {
            // Curva Grande
            const t = (pct - 0.20) / 0.10;
            x = 1000 + Math.cos(t * Math.PI * 0.7) * 300;
            y = 30 + Math.sin(t * Math.PI * 0.7) * 300;
        } else if (pct < 0.40) {
            // Second chicane
            const t = (pct - 0.30) / 0.10;
            x = 800 - t * 200;
            y = 280 + Math.sin(t * Math.PI * 2) * 40;
        } else if (pct < 0.55) {
            // Lesmo curves
            const t = (pct - 0.40) / 0.15;
            x = 600 - t * 300;
            y = 280 + Math.sin(t * Math.PI) * 150;
        } else if (pct < 0.70) {
            // Back straight
            const t = (pct - 0.55) / 0.15;
            x = 300 - t * 500;
            y = 280 - t * 100;
        } else if (pct < 0.85) {
            // Ascari chicane
            const t = (pct - 0.70) / 0.15;
            x = -200 + Math.sin(t * Math.PI) * 150;
            y = 180 - t * 200;
        } else {
            // Parabolica to finish
            const t = (pct - 0.85) / 0.15;
            x = -50 + t * 950;
            y = -20 + t * 20;
        }
        
        points.push({ x, y, distance: dist, pct });
    }
    
    return points;
}

function generateSuzuka() {
    const points = [];
    const numPoints = 220;
    
    for (let i = 0; i <= numPoints; i++) {
        const pct = i / numPoints;
        const dist = pct * 5807;
        let x, y;
        
        // Suzuka figure-8 layout
        if (pct < 0.10) {
            // Start to first turn
            x = pct * 10 * 100;
            y = 0;
        } else if (pct < 0.30) {
            // Esses (S curves)
            const t = (pct - 0.10) / 0.20;
            x = 1000 - t * 200;
            y = Math.sin(t * Math.PI * 4) * 80;
        } else if (pct < 0.45) {
            // Dunlop to Degner
            const t = (pct - 0.30) / 0.15;
            x = 800 - t * 400;
            y = Math.sin(t * Math.PI) * 200;
        } else if (pct < 0.55) {
            // Crossover (underpass)
            const t = (pct - 0.45) / 0.10;
            x = 400 + t * 200;
            y = 200 - t * 400;
        } else if (pct < 0.70) {
            // Hairpin section
            const t = (pct - 0.55) / 0.15;
            x = 600 + Math.cos(t * Math.PI) * 150;
            y = -200 - Math.sin(t * Math.PI) * 150;
        } else if (pct < 0.85) {
            // Spoon curve
            const t = (pct - 0.70) / 0.15;
            x = 450 - t * 300;
            y = -350 + t * 200;
        } else {
            // 130R and final chicane
            const t = (pct - 0.85) / 0.15;
            x = 150 + t * 850;
            y = -150 + t * 150;
        }
        
        points.push({ x, y, distance: dist, pct });
    }
    
    return points;
}

function generateSilverstone() {
    const points = [];
    const numPoints = 220;
    
    for (let i = 0; i <= numPoints; i++) {
        const pct = i / numPoints;
        const dist = pct * 5891;
        let x, y;
        
        if (pct < 0.12) {
            // Wellington straight
            x = pct * 8 * 100;
            y = 0;
        } else if (pct < 0.25) {
            // Copse to Maggots
            const t = (pct - 0.12) / 0.13;
            x = 960 + Math.sin(t * Math.PI * 0.5) * 200;
            y = t * 400;
        } else if (pct < 0.40) {
            // Becketts complex
            const t = (pct - 0.25) / 0.15;
            x = 1160 - t * 300;
            y = 400 + Math.sin(t * Math.PI * 3) * 60;
        } else if (pct < 0.55) {
            // Hangar straight
            const t = (pct - 0.40) / 0.15;
            x = 860 - t * 800;
            y = 400 - t * 100;
        } else if (pct < 0.70) {
            // Stowe to Vale
            const t = (pct - 0.55) / 0.15;
            x = 60 - Math.sin(t * Math.PI) * 200;
            y = 300 - t * 200;
        } else if (pct < 0.85) {
            // Loop section
            const t = (pct - 0.70) / 0.15;
            x = 60 + Math.cos(t * Math.PI * 1.5) * 250;
            y = 100 - Math.sin(t * Math.PI * 0.5) * 150;
        } else {
            // Back to start
            const t = (pct - 0.85) / 0.15;
            x = -190 + t * 1150;
            y = -50 + t * 50;
        }
        
        points.push({ x, y, distance: dist, pct });
    }
    
    return points;
}

function generateNurburgringGP() {
    const points = [];
    const numPoints = 200;
    
    for (let i = 0; i <= numPoints; i++) {
        const pct = i / numPoints;
        const dist = pct * 5148;
        let x, y;
        
        if (pct < 0.15) {
            // Start straight
            x = pct * 6 * 100;
            y = 0;
        } else if (pct < 0.30) {
            // First complex
            const t = (pct - 0.15) / 0.15;
            x = 900 + Math.sin(t * Math.PI) * 200;
            y = t * 350;
        } else if (pct < 0.50) {
            // Back section
            const t = (pct - 0.30) / 0.20;
            x = 900 - t * 600;
            y = 350 + Math.sin(t * Math.PI) * 100;
        } else if (pct < 0.70) {
            // Schumacher S
            const t = (pct - 0.50) / 0.20;
            x = 300 - t * 400;
            y = 350 - Math.sin(t * Math.PI * 2) * 80;
        } else if (pct < 0.85) {
            // Final section
            const t = (pct - 0.70) / 0.15;
            x = -100 + t * 300;
            y = 350 - t * 300;
        } else {
            // Back to start
            const t = (pct - 0.85) / 0.15;
            x = 200 + t * 700;
            y = 50 - t * 50;
        }
        
        points.push({ x, y, distance: dist, pct });
    }
    
    return points;
}

function generateLagunaSeca() {
    const points = [];
    const numPoints = 180;
    
    for (let i = 0; i <= numPoints; i++) {
        const pct = i / numPoints;
        const dist = pct * 3602;
        let x, y;
        
        if (pct < 0.10) {
            // Start straight
            x = pct * 10 * 80;
            y = 0;
        } else if (pct < 0.20) {
            // Turn 1-2
            const t = (pct - 0.10) / 0.10;
            x = 800 + Math.sin(t * Math.PI * 0.5) * 100;
            y = t * 200;
        } else if (pct < 0.40) {
            // Corkscrew approach
            const t = (pct - 0.20) / 0.20;
            x = 900 - t * 400;
            y = 200 + t * 300;
        } else if (pct < 0.50) {
            // Corkscrew!
            const t = (pct - 0.40) / 0.10;
            x = 500 - t * 150;
            y = 500 - t * 100;
        } else if (pct < 0.65) {
            // Rainey curve
            const t = (pct - 0.50) / 0.15;
            x = 350 + Math.sin(t * Math.PI) * 200;
            y = 400 - t * 200;
        } else if (pct < 0.80) {
            // Turn 10-11
            const t = (pct - 0.65) / 0.15;
            x = 350 + t * 200;
            y = 200 - Math.sin(t * Math.PI * 0.5) * 150;
        } else {
            // Back to start
            const t = (pct - 0.80) / 0.20;
            x = 550 - t * 550;
            y = 50 - t * 50;
        }
        
        points.push({ x, y, distance: dist, pct });
    }
    
    return points;
}

function generateRoadAmerica() {
    const points = [];
    const numPoints = 230;
    
    for (let i = 0; i <= numPoints; i++) {
        const pct = i / numPoints;
        const dist = pct * 6515;
        let x, y;
        
        if (pct < 0.12) {
            // Start straight
            x = pct * 8 * 100;
            y = 0;
        } else if (pct < 0.25) {
            // Turn 1-3
            const t = (pct - 0.12) / 0.13;
            x = 960 + Math.sin(t * Math.PI) * 200;
            y = t * 400;
        } else if (pct < 0.40) {
            // Kettle bottoms
            const t = (pct - 0.25) / 0.15;
            x = 960 - t * 500;
            y = 400 + Math.sin(t * Math.PI * 2) * 80;
        } else if (pct < 0.55) {
            // Kink to Canada corner
            const t = (pct - 0.40) / 0.15;
            x = 460 - t * 400;
            y = 400 - t * 100;
        } else if (pct < 0.70) {
            // Thunder valley
            const t = (pct - 0.55) / 0.15;
            x = 60 + Math.sin(t * Math.PI) * 150;
            y = 300 - t * 200;
        } else if (pct < 0.85) {
            // Carousel
            const t = (pct - 0.70) / 0.15;
            x = 60 + Math.cos(t * Math.PI) * 200;
            y = 100 - Math.sin(t * Math.PI * 0.5) * 150;
        } else {
            // Kink to finish
            const t = (pct - 0.85) / 0.15;
            x = -140 + t * 1100;
            y = -50 + t * 50;
        }
        
        points.push({ x, y, distance: dist, pct });
    }
    
    return points;
}

function generateWatkinsGlen() {
    const points = [];
    const numPoints = 200;
    
    for (let i = 0; i <= numPoints; i++) {
        const pct = i / numPoints;
        const dist = pct * 5472;
        let x, y;
        
        if (pct < 0.12) {
            // Front straight
            x = pct * 8 * 100;
            y = 0;
        } else if (pct < 0.25) {
            // Turn 1 (90 right)
            const t = (pct - 0.12) / 0.13;
            x = 960 + Math.sin(t * Math.PI * 0.5) * 150;
            y = t * 350;
        } else if (pct < 0.40) {
            // Esses
            const t = (pct - 0.25) / 0.15;
            x = 1110 - t * 300;
            y = 350 + Math.sin(t * Math.PI * 3) * 50;
        } else if (pct < 0.55) {
            // Back straight
            const t = (pct - 0.40) / 0.15;
            x = 810 - t * 600;
            y = 350 - t * 50;
        } else if (pct < 0.70) {
            // Inner loop
            const t = (pct - 0.55) / 0.15;
            x = 210 - Math.sin(t * Math.PI) * 200;
            y = 300 - t * 200;
        } else if (pct < 0.85) {
            // Toe of boot
            const t = (pct - 0.70) / 0.15;
            x = 210 + t * 200;
            y = 100 - Math.sin(t * Math.PI * 0.5) * 100;
        } else {
            // Return to start
            const t = (pct - 0.85) / 0.15;
            x = 410 - t * 410;
            y = 0;
        }
        
        points.push({ x, y, distance: dist, pct });
    }
    
    return points;
}

function generateCOTA() {
    const points = [];
    const numPoints = 220;
    
    for (let i = 0; i <= numPoints; i++) {
        const pct = i / numPoints;
        const dist = pct * 5513;
        let x, y;
        
        if (pct < 0.08) {
            // Start to Turn 1
            x = pct * 12 * 100;
            y = pct * 5 * 100;
        } else if (pct < 0.20) {
            // Turn 1 hairpin and esses
            const t = (pct - 0.08) / 0.12;
            x = 960 + Math.sin(t * Math.PI * 2) * 100;
            y = 500 + t * 200;
        } else if (pct < 0.35) {
            // Back straight
            const t = (pct - 0.20) / 0.15;
            x = 960 - t * 700;
            y = 700 - t * 100;
        } else if (pct < 0.50) {
            // Turns 12-15
            const t = (pct - 0.35) / 0.15;
            x = 260 - Math.sin(t * Math.PI) * 200;
            y = 600 - t * 300;
        } else if (pct < 0.65) {
            // Stadium section
            const t = (pct - 0.50) / 0.15;
            x = 260 + t * 300;
            y = 300 + Math.sin(t * Math.PI * 2) * 80;
        } else if (pct < 0.80) {
            // Turns 16-18
            const t = (pct - 0.65) / 0.15;
            x = 560 - t * 200;
            y = 300 - t * 200;
        } else {
            // Final straight
            const t = (pct - 0.80) / 0.20;
            x = 360 - t * 360;
            y = 100 - t * 100;
        }
        
        points.push({ x, y, distance: dist, pct });
    }
    
    return points;
}

// =====================================================
// Track Lookup Function
// =====================================================

function getTrackMap(trackName) {
    if (!trackName) return null;
    
    // Normalize track name
    const normalized = trackName.toLowerCase()
        .replace(/[\\\/]/g, ' ')
        .replace(/[_-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    
    // Direct lookup
    if (iRacingTrackMaps[normalized]) {
        const result = iRacingTrackMaps[normalized];
        // If it's a string, it's an alias
        if (typeof result === 'string') {
            return iRacingTrackMaps[result];
        }
        return result;
    }
    
    // Partial match
    for (const key of Object.keys(iRacingTrackMaps)) {
        if (normalized.includes(key) || key.includes(normalized)) {
            const result = iRacingTrackMaps[key];
            if (typeof result === 'string') {
                return iRacingTrackMaps[result];
            }
            return result;
        }
    }
    
    return null;
}

// =====================================================
// Position Interpolation
// =====================================================

function getPositionAtDistance(trackData, distance) {
    if (!trackData || !trackData.coordinates || trackData.coordinates.length === 0) {
        return null;
    }
    
    const coords = trackData.coordinates;
    const trackLength = trackData.length;
    
    // Normalize distance to track length
    const normalizedDist = distance % trackLength;
    
    // Find surrounding points
    let lower = coords[0];
    let upper = coords[coords.length - 1];
    
    for (let i = 0; i < coords.length - 1; i++) {
        if (coords[i].distance <= normalizedDist && coords[i + 1].distance >= normalizedDist) {
            lower = coords[i];
            upper = coords[i + 1];
            break;
        }
    }
    
    // Interpolate
    const range = upper.distance - lower.distance;
    const t = range > 0 ? (normalizedDist - lower.distance) / range : 0;
    
    return {
        x: lower.x + (upper.x - lower.x) * t,
        y: lower.y + (upper.y - lower.y) * t,
        distance: normalizedDist
    };
}

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { iRacingTrackMaps, getTrackMap, getPositionAtDistance };
}
