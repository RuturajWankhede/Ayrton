// Complete Racing Telemetry Analysis Frontend Application
// Updated to properly store and pass session data for chat functionality
// Fixed to handle both JSON and text responses from webhook
// Enhanced with detailed channel detection display

class TelemetryAnalysisApp {
    constructor() {
        this.sessionId = null;
        this.sessionData = null;
        this.referenceData = null;
        this.currentData = null;
        this.analysisResults = null;
        this.detectedChannels = null;
        this.webhookUrl = localStorage.getItem('n8n_webhook_url') || 'https://ruturajw.app.n8n.cloud';
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkConfiguration();
    }

    checkConfiguration() {
        if (!this.webhookUrl) {
            document.getElementById('config-modal').classList.remove('hidden');
            document.getElementById('config-modal').classList.add('flex');
        }
    }

    setupEventListeners() {
        // File upload handlers
        this.setupFileUpload('ref');
        this.setupFileUpload('curr');

        // Analyze button
        document.getElementById('analyze-btn').addEventListener('click', () => this.analyzeTelemetry());

        // Chat functionality
        document.getElementById('send-btn').addEventListener('click', () => this.sendChatMessage());
        document.getElementById('chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendChatMessage();
        });

        // Quick questions
        document.querySelectorAll('.quick-question').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.getElementById('chat-input').value = e.target.textContent.trim();
                this.sendChatMessage();
            });
        });

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Configuration
        document.getElementById('save-config').addEventListener('click', () => {
            this.webhookUrl = document.getElementById('webhook-url').value;
            localStorage.setItem('n8n_webhook_url', this.webhookUrl);
            document.getElementById('config-modal').classList.add('hidden');
            this.showNotification('Configuration saved!', 'success');
        });
    }

    setupFileUpload(type) {
        const uploadArea = document.getElementById(`${type}-upload`);
        const fileInput = document.getElementById(`${type}-file`);

        uploadArea.addEventListener('click', () => fileInput.click());

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0], type);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files[0], type);
            }
        });
    }

    handleFileSelect(file, type) {
        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
            this.showNotification('Please upload a CSV file', 'error');
            return;
        }

        // First read the file as text to detect format
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const lines = text.split(/\r?\n/);
            
            // Detect MoTeC format by checking first line
            let headerRowIndex = 0;
            let isMoTeCFormat = false;
            
            if (lines[0] && lines[0].includes('MoTeC CSV File')) {
                isMoTeCFormat = true;
                // Find the actual header row (contains "Time" as first data column)
                for (let i = 0; i < Math.min(lines.length, 30); i++) {
                    const cells = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
                    if (cells[0] === 'Time' || cells.includes('Time')) {
                        headerRowIndex = i;
                        console.log(`MoTeC format detected. Header row at line ${i + 1}`);
                        break;
                    }
                }
            }
            
            // If MoTeC format, skip metadata rows and units row
            let csvText = text;
            if (isMoTeCFormat && headerRowIndex > 0) {
                // Get header row and data rows (skip the units row right after header)
                const headerLine = lines[headerRowIndex];
                const dataLines = lines.slice(headerRowIndex + 2); // +2 to skip units row
                csvText = [headerLine, ...dataLines].join('\n');
                console.log(`Skipped ${headerRowIndex} metadata rows and 1 units row`);
            }
            
            // Now parse the cleaned CSV
            Papa.parse(csvText, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: (results) => {
                    // Filter out empty rows and rows with no valid data
                    const cleanedData = results.data.filter(row => {
                        if (!row || Object.keys(row).length === 0) return false;
                        // Check if row has at least one non-empty value
                        return Object.values(row).some(val => val !== null && val !== '' && val !== undefined);
                    });
                    
                    if (type === 'ref') {
                        this.referenceData = cleanedData;
                        this.displayFileInfo('ref', file);
                        if (isMoTeCFormat) {
                            this.showNotification('MoTeC format detected - metadata skipped', 'info');
                        }
                    } else {
                        this.currentData = cleanedData;
                        this.displayFileInfo('curr', file);
                    }
                    
                    console.log(`Parsed ${cleanedData.length} data rows with ${Object.keys(cleanedData[0] || {}).length} columns`);
                    
                    // Enable analyze button if both files are loaded
                    if (this.referenceData && this.currentData) {
                        document.getElementById('analyze-btn').disabled = false;
                        this.validateAndDetectChannels();
                    }
                },
                error: (error) => {
                    this.showNotification(`Error parsing CSV: ${error.message}`, 'error');
                }
            });
        };
        
        reader.onerror = () => {
            this.showNotification('Error reading file', 'error');
        };
        
        reader.readAsText(file);
    }

    displayFileInfo(type, file) {
        document.getElementById(`${type}-file-info`).classList.remove('hidden');
        document.getElementById(`${type}-file-name`).textContent = file.name;
        document.getElementById(`${type}-file-size`).textContent = `${(file.size / 1024).toFixed(1)} KB`;
    }

    validateAndDetectChannels() {
        if (!this.referenceData || this.referenceData.length === 0) return;
        
        const columns = Object.keys(this.referenceData[0]);
        this.detectedChannels = this.detectChannels(columns);
        
        this.displayChannelDetection(this.detectedChannels);
        this.displayDetailedChannelMapping(columns, this.detectedChannels);
    }

    detectChannels(columns) {
        // Channel mapping definitions with all recognized variants
        // Primary variants are MoTeC standard names from professional data loggers
        const channelDefinitions = {
            required: {
                time: {
                    variants: ['Time', 'time', 'Elapsed Time', 'Session Time', 't', 'TIME'],
                    description: 'Timestamp for each data point',
                    icon: 'fa-clock'
                },
                distance: {
                    variants: ['Lap Distance', 'Distance', 'Dist', 'distance', 'DIST', 'Lap_Distance', 'LapDist'],
                    description: 'Distance traveled around the lap',
                    icon: 'fa-road'
                },
                speed: {
                    variants: ['Ground Speed', 'Speed', 'Drive Speed', 'Speed over Ground', 'Vehicle Speed', 'GPS Speed', 'speed', 'SPEED', 'Velocity'],
                    description: 'Vehicle speed measurement',
                    icon: 'fa-tachometer-alt'
                }
            },
            optional: {
                throttle: {
                    variants: ['Throttle Pos', 'Throttle', 'TPS', 'throttle', 'THROTTLE', 'Throttle Position', 'Accel'],
                    description: 'Throttle pedal position (%)',
                    icon: 'fa-gas-pump',
                    category: 'Driver Inputs'
                },
                brakeFront: {
                    variants: ['Brake Pres Front', 'Brake Pressure', 'Brake', 'brake', 'BRAKE', 'BrakePressure', 'Brake Press'],
                    description: 'Front brake pressure (kPa)',
                    icon: 'fa-hand-paper',
                    category: 'Driver Inputs'
                },
                brakeRear: {
                    variants: ['Brake Pres Rear', 'Rear Brake Pressure', 'Brake Rear'],
                    description: 'Rear brake pressure (kPa)',
                    icon: 'fa-hand-paper',
                    category: 'Driver Inputs'
                },
                gear: {
                    variants: ['Gear', 'gear', 'Gear Position', 'GEAR', 'Gear Pos', 'CurrentGear'],
                    description: 'Current gear selection',
                    icon: 'fa-cog',
                    category: 'Driver Inputs'
                },
                steer: {
                    variants: ['Steered Angle', 'Steering Angle', 'Steer', 'steer', 'Steering', 'SteeringAngle', 'Steering Wheel Angle'],
                    description: 'Steering wheel angle (deg)',
                    icon: 'fa-dharmachakra',
                    category: 'Driver Inputs'
                },
                rpm: {
                    variants: ['Engine RPM', 'RPM', 'rpm', 'Engine Speed', 'EngineRPM', 'Revs'],
                    description: 'Engine revolutions per minute',
                    icon: 'fa-gauge-high',
                    category: 'Engine'
                },
                gLateral: {
                    variants: ['G Force Lat', 'G Force Lat - Front', 'G Force Lat - Mid', 'Lateral G', 'LatG', 'G_Lat', 'g_lat', 'LateralG'],
                    description: 'Lateral (cornering) G-forces',
                    icon: 'fa-arrows-left-right',
                    category: 'Vehicle Dynamics'
                },
                gLongitudinal: {
                    variants: ['G Force Long', 'G Force Long Front', 'G Force Long Mid', 'Longitudinal G', 'LongG', 'G_Long', 'g_long', 'LongitudinalG'],
                    description: 'Longitudinal (accel/braking) G-forces',
                    icon: 'fa-arrows-up-down',
                    category: 'Vehicle Dynamics'
                },
                gVertical: {
                    variants: ['G Force Vert', 'Vertical G', 'VertG', 'G_Vert', 'g_vert'],
                    description: 'Vertical G-forces (bumps/curbs)',
                    icon: 'fa-arrow-up',
                    category: 'Vehicle Dynamics'
                },
                wheelSpeedFL: {
                    variants: ['Wheel Speed FL', 'WheelSpeedFL', 'FL Speed', 'Front Left Wheel Speed'],
                    description: 'Front left wheel speed (km/h)',
                    icon: 'fa-circle',
                    category: 'Wheel Speeds'
                },
                wheelSpeedFR: {
                    variants: ['Wheel Speed FR', 'WheelSpeedFR', 'FR Speed', 'Front Right Wheel Speed'],
                    description: 'Front right wheel speed (km/h)',
                    icon: 'fa-circle',
                    category: 'Wheel Speeds'
                },
                wheelSpeedRL: {
                    variants: ['Wheel Speed RL', 'WheelSpeedRL', 'RL Speed', 'Rear Left Wheel Speed'],
                    description: 'Rear left wheel speed (km/h)',
                    icon: 'fa-circle',
                    category: 'Wheel Speeds'
                },
                wheelSpeedRR: {
                    variants: ['Wheel Speed RR', 'WheelSpeedRR', 'RR Speed', 'Rear Right Wheel Speed'],
                    description: 'Rear right wheel speed (km/h)',
                    icon: 'fa-circle',
                    category: 'Wheel Speeds'
                },
                suspFL: {
                    variants: ['Susp Pos FL', 'Suspension FL', 'Damper FL'],
                    description: 'Front left suspension position (mm)',
                    icon: 'fa-arrows-up-down',
                    category: 'Suspension'
                },
                suspFR: {
                    variants: ['Susp Pos FR', 'Suspension FR', 'Damper FR'],
                    description: 'Front right suspension position (mm)',
                    icon: 'fa-arrows-up-down',
                    category: 'Suspension'
                },
                suspRL: {
                    variants: ['Susp Pos RL', 'Suspension RL', 'Damper RL'],
                    description: 'Rear left suspension position (mm)',
                    icon: 'fa-arrows-up-down',
                    category: 'Suspension'
                },
                suspRR: {
                    variants: ['Susp Pos RR', 'Suspension RR', 'Damper RR'],
                    description: 'Rear right suspension position (mm)',
                    icon: 'fa-arrows-up-down',
                    category: 'Suspension'
                },
                rideHeightFL: {
                    variants: ['Ride Height FL', 'RideHeightFL', 'Front Left Ride Height'],
                    description: 'Front left ride height (mm)',
                    icon: 'fa-ruler-vertical',
                    category: 'Suspension'
                },
                tyreTempFLCentre: {
                    variants: ['Tyre Temp FL Centre', 'Tire Temp FL Center', 'TireTempFLC'],
                    description: 'Front left tire center temperature (°C)',
                    icon: 'fa-temperature-high',
                    category: 'Tyre Temperatures'
                },
                tyreTempFLInner: {
                    variants: ['Tyre Temp FL Inner', 'Tire Temp FL Inner', 'TireTempFLI'],
                    description: 'Front left tire inner temperature (°C)',
                    icon: 'fa-temperature-high',
                    category: 'Tyre Temperatures'
                },
                tyreTempFLOuter: {
                    variants: ['Tyre Temp FL Outer', 'Tire Temp FL Outer', 'TireTempFLO'],
                    description: 'Front left tire outer temperature (°C)',
                    icon: 'fa-temperature-high',
                    category: 'Tyre Temperatures'
                },
                tyreTempFRCenter: {
                    variants: ['Tyre Temp FR Center', 'Tire Temp FR Center', 'TireTempFRC'],
                    description: 'Front right tire center temperature (°C)',
                    icon: 'fa-temperature-high',
                    category: 'Tyre Temperatures'
                },
                tyreTempFRInner: {
                    variants: ['Tyre Temp FR Inner', 'Tire Temp FR Inner', 'TireTempFRI'],
                    description: 'Front right tire inner temperature (°C)',
                    icon: 'fa-temperature-high',
                    category: 'Tyre Temperatures'
                },
                tyreTempFROuter: {
                    variants: ['Tyre Temp FR Outer', 'Tire Temp FR Outer', 'TireTempFRO'],
                    description: 'Front right tire outer temperature (°C)',
                    icon: 'fa-temperature-high',
                    category: 'Tyre Temperatures'
                },
                tyreTempRL: {
                    variants: ['Tyre Temp RL', 'Tire Temp RL', 'TireTempRL'],
                    description: 'Rear left tire temperature (°C)',
                    icon: 'fa-temperature-high',
                    category: 'Tyre Temperatures'
                },
                tyreTempRR: {
                    variants: ['Tyre Temp RR', 'Tire Temp RR', 'TireTempRR'],
                    description: 'Rear right tire temperature (°C)',
                    icon: 'fa-temperature-high',
                    category: 'Tyre Temperatures'
                },
                brakeTempFL: {
                    variants: ['Brake Temp FL', 'BrakeTempFL', 'Front Left Brake Temp'],
                    description: 'Front left brake temperature (°C)',
                    icon: 'fa-fire',
                    category: 'Brake Temperatures'
                },
                brakeTempRL: {
                    variants: ['Brake Temp RL', 'BrakeTempRL', 'Rear Left Brake Temp'],
                    description: 'Rear left brake temperature (°C)',
                    icon: 'fa-fire',
                    category: 'Brake Temperatures'
                },
                engineTemp: {
                    variants: ['Engine Temp', 'Water Temp', 'Coolant Temp', 'EngineTemp'],
                    description: 'Engine/coolant temperature (°C)',
                    icon: 'fa-thermometer-half',
                    category: 'Engine Temperatures'
                },
                oilTemp: {
                    variants: ['Eng Oil Temp', 'Oil Temp', 'OilTemp', 'Engine Oil Temp'],
                    description: 'Engine oil temperature (°C)',
                    icon: 'fa-oil-can',
                    category: 'Engine Temperatures'
                },
                diffOilTemp: {
                    variants: ['Diff Oil Temp', 'Differential Oil Temp', 'DiffOilTemp'],
                    description: 'Differential oil temperature (°C)',
                    icon: 'fa-oil-can',
                    category: 'Engine Temperatures'
                },
                gboxOilTemp: {
                    variants: ['Gbox Oil Temp', 'Gearbox Oil Temp', 'Trans Temp'],
                    description: 'Gearbox oil temperature (°C)',
                    icon: 'fa-oil-can',
                    category: 'Engine Temperatures'
                },
                fuelLevel: {
                    variants: ['Fuel Level', 'FuelLevel', 'Fuel', 'Fuel Remaining'],
                    description: 'Current fuel level (L)',
                    icon: 'fa-gas-pump',
                    category: 'Engine'
                },
                fuelPressure: {
                    variants: ['Fuel Pres', 'Fuel Pressure', 'FuelPres'],
                    description: 'Fuel pressure (kPa)',
                    icon: 'fa-gauge',
                    category: 'Engine'
                },
                oilPressure: {
                    variants: ['Eng Oil Pres', 'Oil Pressure', 'OilPres', 'Engine Oil Pressure'],
                    description: 'Engine oil pressure (kPa)',
                    icon: 'fa-gauge',
                    category: 'Engine'
                },
                manifoldPressure: {
                    variants: ['Manifold Pres', 'Manifold Pressure', 'MAP', 'Boost'],
                    description: 'Manifold/boost pressure (kPa)',
                    icon: 'fa-gauge',
                    category: 'Engine'
                },
                lambda1: {
                    variants: ['Lambda 1', 'Lambda', 'AFR', 'Air Fuel Ratio'],
                    description: 'Air/fuel ratio sensor 1',
                    icon: 'fa-smog',
                    category: 'Engine'
                },
                lambda2: {
                    variants: ['Lambda 2', 'AFR 2'],
                    description: 'Air/fuel ratio sensor 2',
                    icon: 'fa-smog',
                    category: 'Engine'
                },
                fuelInjDuty: {
                    variants: ['Fuel Inj Duty', 'Injector Duty', 'Inj Duty'],
                    description: 'Fuel injector duty cycle (%)',
                    icon: 'fa-percent',
                    category: 'Engine'
                },
                ignAdvance: {
                    variants: ['Ign Advance', 'Ignition Advance', 'Spark Advance'],
                    description: 'Ignition timing advance (°BTDC)',
                    icon: 'fa-bolt',
                    category: 'Engine'
                },
                wheelSlip: {
                    variants: ['Wheel Slip', 'WheelSlip', 'Slip Ratio', 'Traction'],
                    description: 'Wheel slip/traction indicator',
                    icon: 'fa-car-burst',
                    category: 'Vehicle Dynamics'
                },
                yawRate: {
                    variants: ['Gyro Yaw Velocity', 'Gyro Yaw Velocity 1', 'Yaw Rate', 'YawRate'],
                    description: 'Vehicle rotation rate (deg/s)',
                    icon: 'fa-rotate',
                    category: 'Vehicle Dynamics'
                },
                brakeBias: {
                    variants: ['Brake Bias Setting', 'Brake Bias', 'Brake Balance'],
                    description: 'Brake bias setting (%)',
                    icon: 'fa-sliders',
                    category: 'Driver Inputs'
                },
                lapTime: {
                    variants: ['Lap Time', 'LapTime'],
                    description: 'Current lap time (s)',
                    icon: 'fa-stopwatch',
                    category: 'Lap Info'
                },
                runningLapTime: {
                    variants: ['Running Lap Time', 'Running Time'],
                    description: 'Running lap time (s)',
                    icon: 'fa-stopwatch',
                    category: 'Lap Info'
                },
                splitTime: {
                    variants: ['Split Time', 'Sector Time', 'SplitTime'],
                    description: 'Split/sector time (s)',
                    icon: 'fa-stopwatch',
                    category: 'Lap Info'
                },
                lapNumber: {
                    variants: ['Lap Number', 'Lap', 'LapNumber', 'Lap Count'],
                    description: 'Current lap number',
                    icon: 'fa-hashtag',
                    category: 'Lap Info'
                },
                batteryVolts: {
                    variants: ['Battery Volts', 'Bat Volts ADL', 'Battery Voltage', 'Volts'],
                    description: 'Battery voltage (V)',
                    icon: 'fa-car-battery',
                    category: 'Electrical'
                },
                airTempInlet: {
                    variants: ['Air Temp Inlet', 'Inlet Air Temp', 'IAT', 'Air Temp'],
                    description: 'Inlet air temperature (°C)',
                    icon: 'fa-wind',
                    category: 'Environment'
                },
                baroPressure: {
                    variants: ['Baro Pres', 'Barometric Pressure', 'Atmospheric Pressure'],
                    description: 'Barometric pressure (kPa)',
                    icon: 'fa-cloud',
                    category: 'Environment'
                }
            }
        };
        
        const detected = {
            required: {},
            optional: {},
            missing: [],
            unrecognized: [],
            capabilities: [],
            definitions: channelDefinitions,
            totalColumns: columns.length
        };
        
        const matchedColumns = new Set();
        
        // Check required channels
        for (const [key, def] of Object.entries(channelDefinitions.required)) {
            const found = columns.find(col => 
                def.variants.some(variant => col.toLowerCase() === variant.toLowerCase())
            );
            if (found) {
                detected.required[key] = {
                    csvColumn: found,
                    matchedVariant: def.variants.find(v => found.toLowerCase() === v.toLowerCase()),
                    description: def.description,
                    icon: def.icon
                };
                matchedColumns.add(found);
            } else {
                detected.missing.push({
                    channel: key,
                    description: def.description,
                    expectedNames: def.variants.slice(0, 3).join(', ')
                });
            }
        }
        
        // Check optional channels
        for (const [key, def] of Object.entries(channelDefinitions.optional)) {
            const found = columns.find(col => 
                def.variants.some(variant => col.toLowerCase() === variant.toLowerCase())
            );
            if (found) {
                detected.optional[key] = {
                    csvColumn: found,
                    matchedVariant: def.variants.find(v => found.toLowerCase() === v.toLowerCase()),
                    description: def.description,
                    icon: def.icon,
                    category: def.category
                };
                matchedColumns.add(found);
            }
        }
        
        // Find unrecognized columns
        columns.forEach(col => {
            if (!matchedColumns.has(col)) {
                detected.unrecognized.push(col);
            }
        });
        
        // Determine capabilities based on detected channels
        if (Object.keys(detected.required).length === 3) {
            detected.capabilities.push({
                name: 'Basic Lap Analysis',
                description: 'Speed traces, sector times, lap comparison',
                icon: 'fa-chart-line',
                color: 'green'
            });
        }
        
        if (detected.optional.throttle && (detected.optional.brakeFront || detected.optional.brakeRear)) {
            detected.capabilities.push({
                name: 'Driver Input Analysis',
                description: 'Throttle/brake traces, pedal overlap detection',
                icon: 'fa-shoe-prints',
                color: 'blue'
            });
        }
        
        if (detected.optional.gLateral && detected.optional.gLongitudinal) {
            detected.capabilities.push({
                name: 'G-Force Analysis',
                description: 'Traction circle, grip utilization',
                icon: 'fa-circle-notch',
                color: 'purple'
            });
        }
        
        if (detected.optional.wheelSpeedFL && detected.optional.wheelSpeedFR) {
            detected.capabilities.push({
                name: 'Wheel Speed Analysis',
                description: 'Slip detection, differential behavior',
                icon: 'fa-circle',
                color: 'orange'
            });
        }
        
        if (detected.optional.suspFL || detected.optional.suspFR) {
            detected.capabilities.push({
                name: 'Suspension Analysis',
                description: 'Damper travel, weight transfer analysis',
                icon: 'fa-car',
                color: 'cyan'
            });
        }
        
        if (detected.optional.tyreTempFLCentre || detected.optional.tyreTempFRCenter || detected.optional.brakeTempFL) {
            detected.capabilities.push({
                name: 'Thermal Analysis',
                description: 'Tire/brake temperature monitoring',
                icon: 'fa-temperature-high',
                color: 'red'
            });
        }
        
        if (detected.optional.steer) {
            detected.capabilities.push({
                name: 'Steering Analysis',
                description: 'Steering input smoothness, corrections',
                icon: 'fa-dharmachakra',
                color: 'indigo'
            });
        }
        
        if (detected.optional.rpm && detected.optional.gear) {
            detected.capabilities.push({
                name: 'Powertrain Analysis',
                description: 'Shift points, gear usage optimization',
                icon: 'fa-gears',
                color: 'yellow'
            });
        }
        
        if (detected.optional.lambda1 || detected.optional.manifoldPressure) {
            detected.capabilities.push({
                name: 'Engine Tuning Data',
                description: 'AFR, boost, ignition analysis',
                icon: 'fa-microchip',
                color: 'pink'
            });
        }
        
        return detected;
    }

    displayChannelDetection(detected) {
        let message = '';
        
        if (detected.missing.length > 0) {
            this.showNotification(
                `Missing required channels: ${detected.missing.map(m => m.channel).join(', ')}. Check channel documentation.`, 
                'error'
            );
            document.getElementById('analyze-btn').disabled = true;
            
            message = '<a href="channel_documentation.html" target="_blank" class="text-blue-600 underline">View Channel Documentation</a>';
        } else {
            const requiredCount = Object.keys(detected.required).length;
            const optionalCount = Object.keys(detected.optional).length;
            message = `✅ Ready for analysis! ${requiredCount} required + ${optionalCount} optional channels detected.`;
            
            this.showNotification(`Channels detected! ${detected.capabilities.length} analysis types available.`, 'success');
        }
        
        // Update simple info message
        const infoDiv = document.createElement('div');
        infoDiv.className = 'mt-4 p-3 bg-blue-50 rounded text-sm';
        infoDiv.innerHTML = message;
        
        const uploadSection = document.getElementById('upload-section');
        const existingInfo = uploadSection.querySelector('.bg-blue-50');
        if (existingInfo) existingInfo.remove();
        uploadSection.querySelector('.bg-white').appendChild(infoDiv);
    }

    displayDetailedChannelMapping(columns, detected) {
        // Remove existing channel display if present
        const existingDisplay = document.getElementById('channel-detection-display');
        if (existingDisplay) existingDisplay.remove();
        
        // Create the detailed channel mapping display
        const displayContainer = document.createElement('div');
        displayContainer.id = 'channel-detection-display';
        displayContainer.className = 'mt-6 bg-white rounded-lg shadow-lg overflow-hidden';
        
        // Header with summary
        const headerHTML = `
            <div class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
                <div class="flex items-center justify-between">
                    <div>
                        <h3 class="text-lg font-bold flex items-center">
                            <i class="fas fa-microchip mr-2"></i>Channel Detection Results
                        </h3>
                        <p class="text-indigo-200 text-sm mt-1">
                            ${columns.length} columns found in CSV → 
                            ${Object.keys(detected.required).length + Object.keys(detected.optional).length} channels mapped
                        </p>
                    </div>
                    <button id="toggle-channel-details" class="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-sm transition">
                        <i class="fas fa-chevron-down mr-1"></i>Details
                    </button>
                </div>
            </div>
        `;
        
        // Capabilities section
        const capabilitiesHTML = `
            <div class="p-4 border-b bg-gray-50">
                <h4 class="font-semibold text-gray-700 mb-3 flex items-center">
                    <i class="fas fa-bolt text-yellow-500 mr-2"></i>Analysis Capabilities Unlocked
                </h4>
                <div class="flex flex-wrap gap-2">
                    ${detected.capabilities.map(cap => `
                        <div class="bg-white border border-${cap.color}-200 rounded-lg px-3 py-2 flex items-center shadow-sm">
                            <i class="fas ${cap.icon} text-${cap.color}-500 mr-2"></i>
                            <div>
                                <span class="font-medium text-sm">${cap.name}</span>
                                <p class="text-xs text-gray-500">${cap.description}</p>
                            </div>
                        </div>
                    `).join('')}
                    ${detected.capabilities.length === 0 ? '<p class="text-gray-500 text-sm">Upload files with required channels to unlock analysis</p>' : ''}
                </div>
            </div>
        `;
        
        // Required channels section
        const requiredHTML = `
            <div class="p-4 border-b" id="required-channels-section">
                <h4 class="font-semibold text-gray-700 mb-3 flex items-center">
                    <i class="fas fa-asterisk text-red-500 mr-2"></i>Required Channels
                    <span class="ml-2 text-sm font-normal text-gray-500">(Must have all 3)</span>
                </h4>
                <div class="grid md:grid-cols-3 gap-3">
                    ${Object.entries(detected.required).map(([key, info]) => `
                        <div class="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div class="flex items-center justify-between mb-2">
                                <span class="font-medium text-green-800 flex items-center">
                                    <i class="fas ${info.icon} mr-2 text-green-600"></i>${key.charAt(0).toUpperCase() + key.slice(1)}
                                </span>
                                <span class="bg-green-500 text-white text-xs px-2 py-0.5 rounded">✓ Found</span>
                            </div>
                            <div class="text-sm">
                                <p class="text-gray-600 mb-1">${info.description}</p>
                                <div class="bg-white rounded px-2 py-1 border border-green-100">
                                    <span class="text-gray-500 text-xs">CSV Column:</span>
                                    <code class="text-green-700 font-mono text-xs ml-1">${info.csvColumn}</code>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                    ${detected.missing.map(m => `
                        <div class="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div class="flex items-center justify-between mb-2">
                                <span class="font-medium text-red-800">${m.channel.charAt(0).toUpperCase() + m.channel.slice(1)}</span>
                                <span class="bg-red-500 text-white text-xs px-2 py-0.5 rounded">✗ Missing</span>
                            </div>
                            <div class="text-sm">
                                <p class="text-gray-600 mb-1">${m.description}</p>
                                <p class="text-xs text-red-600">Expected: ${m.expectedNames}...</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        // Group optional channels by category
        const optionalByCategory = {};
        Object.entries(detected.optional).forEach(([key, info]) => {
            const category = info.category || 'Other';
            if (!optionalByCategory[category]) {
                optionalByCategory[category] = [];
            }
            optionalByCategory[category].push({ key, ...info });
        });
        
        // Optional channels section
        const optionalHTML = `
            <div class="p-4 border-b" id="optional-channels-section">
                <h4 class="font-semibold text-gray-700 mb-3 flex items-center">
                    <i class="fas fa-plus-circle text-blue-500 mr-2"></i>Optional Channels Detected
                    <span class="ml-2 text-sm font-normal text-gray-500">(${Object.keys(detected.optional).length} found)</span>
                </h4>
                ${Object.keys(optionalByCategory).length > 0 ? `
                    <div class="space-y-4">
                        ${Object.entries(optionalByCategory).map(([category, channels]) => `
                            <div>
                                <h5 class="text-sm font-medium text-gray-600 mb-2 flex items-center">
                                    <i class="fas fa-folder text-gray-400 mr-1"></i>${category}
                                </h5>
                                <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
                                    ${channels.map(ch => `
                                        <div class="bg-blue-50 border border-blue-100 rounded px-3 py-2 flex items-center justify-between">
                                            <div class="flex items-center">
                                                <i class="fas ${ch.icon} text-blue-500 mr-2 text-sm"></i>
                                                <div>
                                                    <span class="text-sm font-medium text-blue-800">${ch.key}</span>
                                                    <code class="text-xs text-gray-500 block font-mono">${ch.csvColumn}</code>
                                                </div>
                                            </div>
                                            <i class="fas fa-check-circle text-green-500 text-sm"></i>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : '<p class="text-gray-500 text-sm">No optional channels detected</p>'}
            </div>
        `;
        
        // Unrecognized columns section (collapsible)
        const unrecognizedHTML = detected.unrecognized.length > 0 ? `
            <div class="p-4 bg-gray-50" id="unrecognized-channels-section">
                <details>
                    <summary class="font-semibold text-gray-600 cursor-pointer flex items-center">
                        <i class="fas fa-question-circle text-gray-400 mr-2"></i>
                        Unrecognized Columns (${detected.unrecognized.length})
                        <span class="ml-2 text-xs font-normal text-gray-400">Click to expand</span>
                    </summary>
                    <div class="mt-3 flex flex-wrap gap-2">
                        ${detected.unrecognized.map(col => `
                            <span class="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded font-mono">${col}</span>
                        `).join('')}
                    </div>
                    <p class="text-xs text-gray-500 mt-2">
                        <i class="fas fa-info-circle mr-1"></i>
                        These columns exist in your CSV but aren't mapped to known telemetry channels. 
                        They may still contain useful data for manual analysis.
                    </p>
                </details>
            </div>
        ` : '';
        
        // Combine all sections
        displayContainer.innerHTML = headerHTML + capabilitiesHTML + requiredHTML + optionalHTML + unrecognizedHTML;
        
        // Insert after the upload section
        const uploadSection = document.getElementById('upload-section');
        uploadSection.querySelector('.bg-white').appendChild(displayContainer);
        
        // Add toggle functionality
        setTimeout(() => {
            const toggleBtn = document.getElementById('toggle-channel-details');
            const detailsSections = [
                document.getElementById('required-channels-section'),
                document.getElementById('optional-channels-section'),
                document.getElementById('unrecognized-channels-section')
            ].filter(Boolean);
            
            let isExpanded = true;
            
            if (toggleBtn) {
                toggleBtn.addEventListener('click', () => {
                    isExpanded = !isExpanded;
                    detailsSections.forEach(section => {
                        section.style.display = isExpanded ? 'block' : 'none';
                    });
                    toggleBtn.innerHTML = isExpanded 
                        ? '<i class="fas fa-chevron-up mr-1"></i>Hide' 
                        : '<i class="fas fa-chevron-down mr-1"></i>Details';
                });
            }
        }, 0);
    }

    async analyzeTelemetry() {
        if (!this.webhookUrl) {
            this.showNotification('Please configure webhook URL first', 'error');
            document.getElementById('config-modal').classList.remove('hidden');
            document.getElementById('config-modal').classList.add('flex');
            return;
        }

        // Show loading overlay
        document.getElementById('loading-overlay').classList.remove('hidden');
        document.getElementById('loading-overlay').classList.add('flex');

        try {
            const sessionId = this.generateSessionId();
            
            // Check if data needs to be reduced for large MoTeC files
            // Only reduce if data is large (>1000 rows or >50 columns)
            let refData = this.referenceData;
            let currData = this.currentData;
            
            const columnCount = Object.keys(refData[0] || {}).length;
            const isLargeDataset = refData.length > 1000 || columnCount > 50;
            
            if (isLargeDataset) {
                console.log(`Large dataset detected: ${refData.length} rows, ${columnCount} columns. Optimizing...`);
                
                // Sample rows to ~500 data points
                const maxRows = 500;
                const sampleData = (data) => {
                    if (data.length <= maxRows) return data;
                    const step = Math.ceil(data.length / maxRows);
                    return data.filter((_, index) => index % step === 0);
                };
                
                // Keep only essential channels for analysis
                const essentialChannels = [
                    'Time', 'Lap Distance', 'Ground Speed', 'Drive Speed',
                    'Throttle Pos', 'Brake Pres Front', 'Brake Pres Rear',
                    'Gear', 'Engine RPM', 'Steered Angle',
                    'G Force Lat', 'G Force Long', 'G Force Vert',
                    'Wheel Speed FL', 'Wheel Speed FR', 'Wheel Speed RL', 'Wheel Speed RR',
                    'Lap Time', 'Running Lap Time'
                ];
                
                const filterChannels = (data) => {
                    const availableChannels = Object.keys(data[0] || {});
                    const channelsToKeep = availableChannels.filter(ch => 
                        essentialChannels.some(essential => 
                            ch.toLowerCase().includes(essential.toLowerCase().replace(' ', '')) || 
                            essential.toLowerCase().includes(ch.toLowerCase())
                        )
                    );
                    
                    // Fallback: if no matches, keep first 15 columns
                    const finalChannels = channelsToKeep.length >= 3 ? channelsToKeep : availableChannels.slice(0, 15);
                    
                    return data.map(row => {
                        const filtered = {};
                        finalChannels.forEach(ch => {
                            if (row[ch] !== undefined) filtered[ch] = row[ch];
                        });
                        return filtered;
                    });
                };
                
                refData = filterChannels(sampleData(this.referenceData));
                currData = filterChannels(sampleData(this.currentData));
                
                console.log(`Optimized to: ${refData.length} rows, ${Object.keys(refData[0] || {}).length} columns`);
                this.showNotification(`Large file optimized: ${refData.length} samples sent`, 'info');
            }
            
            const payload = {
                reference_lap: refData,
                current_lap: currData,
                driver_name: document.getElementById('driver-name').value || 'Driver',
                track_name: document.getElementById('track-name').value || 'Track',
                session_id: sessionId,
                timestamp: new Date().toISOString(),
                detected_channels: this.detectedChannels
            };

            console.log('Sending payload to:', `${this.webhookUrl}/webhook/telemetry-analysis`);
            console.log('Reference rows:', refData.length);
            console.log('Current rows:', currData.length);

            const response = await fetch(`${this.webhookUrl}/webhook/telemetry-analysis`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Response error:', errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Get response text first to debug
            const responseText = await response.text();
            console.log('Raw response length:', responseText.length);
            
            // Try to parse JSON
            let results;
            try {
                results = JSON.parse(responseText);
            } catch (parseError) {
                console.error('JSON Parse Error:', parseError);
                console.error('Response was:', responseText.substring(0, 500));
                throw new Error('Invalid JSON response from server');
            }

            console.log('Analysis results:', results);

            // CRITICAL: Store session data for chat
            this.sessionId = results.session_id || sessionId;
            this.sessionData = results.session_data || results.analysis || {};
            this.analysisResults = results.analysis || results.ai_analysis || {};
            
            console.log('Session stored with ID:', this.sessionId);
            console.log('Session data stored:', this.sessionData);

            // Display results
            this.displayAnalysisResults(results);
            
            // Show results section
            document.getElementById('upload-section').classList.add('hidden');
            document.getElementById('results-section').classList.remove('hidden');

            // Add Ayrton's initial message
            const ayrtonMessage = results.ayrton_says || results.initial_message || 
                "Listen. I've analyzed your data. What do you want to know?";
            this.addAyrtonMessage(ayrtonMessage);

            // If AI insights are available, display them
            if (results.ai_insights) {
                this.displayAIInsights(results.ai_insights);
            }

        } catch (error) {
            console.error('Analysis error:', error);
            this.showNotification(`Analysis failed: ${error.message}`, 'error');
        } finally {
            document.getElementById('loading-overlay').classList.add('hidden');
        }
    }

    displayAnalysisResults(results) {
        const analysis = results.analysis || results.ai_analysis || {};
        
        // Lap time delta
        const lapDelta = analysis.timeDelta || 0;
        document.getElementById('lap-delta').textContent = 
            lapDelta > 0 ? `+${lapDelta.toFixed(3)}s` : `${lapDelta.toFixed(3)}s`;
        
        // G-force usage - calculate from actual G data if available
        let gForceUsage = 75; // default
        if (analysis.gForces && analysis.gForces.maxLatRef && analysis.gForces.maxLatCurr) {
            gForceUsage = (analysis.gForces.maxLatCurr / analysis.gForces.maxLatRef * 100);
        } else if (analysis.avgSpeedCurr && analysis.avgSpeedRef) {
            gForceUsage = (analysis.avgSpeedCurr / analysis.avgSpeedRef * 100);
        }
        document.getElementById('g-force-usage').textContent = `${Math.min(gForceUsage, 100).toFixed(0)}%`;
        
        // Driving style based on throttle data
        let drivingStyle = 'Analyzing';
        if (analysis.throttle) {
            const throttleDiff = (analysis.throttle.fullThrottleCurr || 0) - (analysis.throttle.fullThrottleRef || 0);
            if (throttleDiff < -10) {
                drivingStyle = 'Conservative';
            } else if (throttleDiff < -3) {
                drivingStyle = 'Cautious';
            } else if (throttleDiff > 3) {
                drivingStyle = 'Aggressive';
            } else {
                drivingStyle = 'Balanced';
            }
        } else if (analysis.timeDelta) {
            if (analysis.timeDelta > 2) drivingStyle = 'Very Conservative';
            else if (analysis.timeDelta > 1) drivingStyle = 'Conservative';
            else if (analysis.timeDelta > 0.5) drivingStyle = 'Cautious';
            else if (analysis.timeDelta > 0) drivingStyle = 'Close';
            else drivingStyle = 'Competitive';
        }
        document.getElementById('tire-status').textContent = drivingStyle;
        
        // Problem count from analysis
        const problemCount = analysis.problems?.length || 0;
        document.getElementById('setup-issue').textContent = `${problemCount} Issues`;

        // Generate graphs if data available
        if (analysis.sectors && analysis.sectors.length > 0) {
            this.generateGraphs(analysis);
        }
        
        // Display setup recommendations
        if (analysis.sectors || analysis.problems) {
            this.displaySetupRecommendations(analysis);
        }
        
        // Generate full report
        this.generateFullReport(analysis);
    }

    displayAIInsights(insights) {
        const resultsSection = document.getElementById('results-section');
        let insightsDiv = document.getElementById('ai-insights');
        
        if (!insightsDiv) {
            insightsDiv = document.createElement('div');
            insightsDiv.id = 'ai-insights';
            insightsDiv.className = 'mb-6';
            resultsSection.insertBefore(insightsDiv, resultsSection.firstChild.nextSibling);
        }
        
        insightsDiv.innerHTML = `
            <div class="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-6 text-white shadow-lg">
                <h3 class="text-xl font-bold mb-4 flex items-center">
                    <i class="fas fa-brain mr-2"></i>AI Analysis Insights
                </h3>
                <div class="grid md:grid-cols-3 gap-4">
                    <div>
                        <p class="text-purple-200 text-sm">Driving Style</p>
                        <p class="text-2xl font-bold">${insights.driving_style || 'Analyzing...'}</p>
                        <p class="text-sm mt-1">${insights.archetype || ''}</p>
                    </div>
                    <div>
                        <p class="text-purple-200 text-sm">Potential Gain</p>
                        <p class="text-2xl font-bold text-yellow-300">${insights.potential_gain || '0.0s'}</p>
                        <p class="text-sm mt-1">Achievable improvement</p>
                    </div>
                    <div>
                        <p class="text-purple-200 text-sm">AI Confidence</p>
                        <p class="text-2xl font-bold">${insights.confidence || '85%'}</p>
                        <p class="text-sm mt-1">Analysis accuracy</p>
                    </div>
                </div>
            </div>
        `;
    }

    generateGraphs(analysis) {
        // Generate track map from raw telemetry data
        this.generateTrackMap();
        
        // Generate speed comparison over distance
        this.generateSpeedDistanceChart();
        
        // Generate throttle/brake overlay
        this.generateThrottleBrakeChart();
        
        // Sector Performance chart
        if (analysis.sectors && analysis.sectors.length > 0) {
            const sectorTrace = {
                x: analysis.sectors.map(s => `Sector ${s.sector}`),
                y: analysis.sectors.map(s => s.avgSpeedDelta || 0),
                type: 'bar',
                name: 'Speed Delta',
                marker: {
                    color: analysis.sectors.map(s => (s.avgSpeedDelta || 0) < 0 ? '#ef4444' : '#22c55e')
                },
                text: analysis.sectors.map(s => `${(s.avgSpeedDelta || 0) > 0 ? '+' : ''}${(s.avgSpeedDelta || 0).toFixed(1)} km/h`),
                textposition: 'outside'
            };

            const sectorLayout = {
                title: '',
                xaxis: { title: '' },
                yaxis: { title: 'Speed Delta (km/h)', zeroline: true, zerolinecolor: '#666' },
                margin: { t: 20, b: 40, l: 50, r: 20 },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(249,250,251,1)'
            };

            Plotly.newPlot('throttle-brake', [sectorTrace], sectorLayout, { responsive: true });
        }

        // Speed comparison chart
        if (analysis.avgSpeedCurr && analysis.avgSpeedRef) {
            const speedCompareTrace = {
                x: ['Average', 'Top Speed', 'Min Corner'],
                y: [analysis.avgSpeedCurr, analysis.maxSpeedCurr || 0, analysis.minSpeedCurr || 0],
                type: 'bar',
                name: 'Your Lap',
                marker: { color: '#8b5cf6' }
            };

            const speedCompareRefTrace = {
                x: ['Average', 'Top Speed', 'Min Corner'],
                y: [analysis.avgSpeedRef, analysis.maxSpeedRef || 0, analysis.minSpeedRef || 0],
                type: 'bar',
                name: 'Reference',
                marker: { color: '#6b7280' }
            };

            const compareLayout = {
                title: '',
                barmode: 'group',
                yaxis: { title: 'Speed (km/h)' },
                margin: { t: 20, b: 40, l: 50, r: 20 },
                legend: { orientation: 'h', y: -0.2 },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(249,250,251,1)'
            };

            Plotly.newPlot('sector-times', [speedCompareTrace, speedCompareRefTrace], compareLayout, { responsive: true });
        }
    }

    generateTrackMap() {
        if (!this.referenceData || !this.currentData) {
            document.getElementById('track-map').innerHTML = '<p class="text-gray-400 text-center py-20">No track data available</p>';
            return;
        }

        // Channel name variants for different telemetry systems
        const CHANNELS = {
            // GPS position channels (prioritized)
            lat: ['GPS Latitude', 'Latitude', 'Lat', 'GPS_Lat', 'lat', 'GPS Lat'],
            lon: ['GPS Longitude', 'Longitude', 'Lon', 'Long', 'GPS_Long', 'lon', 'GPS Long'],
            // Alternative position channels
            posX: ['Position X', 'Pos X', 'X', 'GPS X', 'PosX'],
            posY: ['Position Y', 'Pos Y', 'Y', 'GPS Y', 'PosY'],
            // Reconstruction channels (fallback)
            distance: ['Lap Distance', 'Distance', 'Dist', 'LapDist', 'distance'],
            speed: ['Ground Speed', 'Speed', 'Drive Speed', 'Vehicle Speed', 'speed'],
            steer: ['Steered Angle', 'Steering Angle', 'Steer', 'steer'],
            gLat: ['G Force Lat', 'Lateral G', 'G_Lat', 'gLat'],
            yaw: ['Gyro Yaw Velocity', 'Yaw Rate', 'Yaw', 'yaw']
        };

        const getValue = (row, channelList, defaultVal = null) => {
            for (const name of channelList) {
                if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
                    const val = parseFloat(row[name]);
                    if (!isNaN(val)) return val;
                }
            }
            return defaultVal;
        };

        // Check what position data is available
        const sampleRow = this.referenceData[0] || {};
        const hasGPS = getValue(sampleRow, CHANNELS.lat) !== null && getValue(sampleRow, CHANNELS.lon) !== null;
        const hasXY = getValue(sampleRow, CHANNELS.posX) !== null && getValue(sampleRow, CHANNELS.posY) !== null;
        const hasReconstructionData = getValue(sampleRow, CHANNELS.speed) !== null;

        console.log('Track map data detection:', { hasGPS, hasXY, hasReconstructionData });

        let refTrack, currTrack;
        let dataSource = '';

        if (hasGPS) {
            // Method 1: Use GPS Latitude/Longitude (best accuracy)
            dataSource = 'GPS';
            console.log('Using GPS coordinates for track map');
            refTrack = this.extractGPSTrack(this.referenceData, CHANNELS, getValue);
            currTrack = this.extractGPSTrack(this.currentData, CHANNELS, getValue);
        } else if (hasXY) {
            // Method 2: Use X/Y position data
            dataSource = 'XY Position';
            console.log('Using X/Y position data for track map');
            refTrack = this.extractXYTrack(this.referenceData, CHANNELS, getValue);
            currTrack = this.extractXYTrack(this.currentData, CHANNELS, getValue);
        } else if (hasReconstructionData) {
            // Method 3: Reconstruct from speed/steering/G-forces
            dataSource = 'Reconstructed';
            console.log('Reconstructing track from telemetry data');
            refTrack = this.reconstructTrack(this.referenceData, CHANNELS, getValue);
            currTrack = this.reconstructTrack(this.currentData, CHANNELS, getValue);
        } else {
            document.getElementById('track-map').innerHTML = `
                <div class="h-full flex flex-col items-center justify-center text-gray-400">
                    <i class="fas fa-map-marked-alt text-4xl mb-3"></i>
                    <p>No position data available</p>
                    <p class="text-sm mt-2">Required: GPS coordinates, X/Y position, or Speed + Steering data</p>
                </div>
            `;
            return;
        }

        if (refTrack.length < 10 || currTrack.length < 10) {
            document.getElementById('track-map').innerHTML = '<p class="text-gray-400 text-center py-20">Insufficient data to generate track map</p>';
            return;
        }

        // Render the track map
        this.renderTrackMap(refTrack, currTrack, dataSource);
    }

    extractGPSTrack(data, CHANNELS, getValue) {
        // Sample rate to reduce data points for performance
        const sampleRate = Math.max(1, Math.floor(data.length / 500));
        const sampledData = data.filter((_, i) => i % sampleRate === 0);
        
        const positions = [];
        let minLat = Infinity, maxLat = -Infinity;
        let minLon = Infinity, maxLon = -Infinity;
        
        // First pass: get bounds
        for (const row of sampledData) {
            const lat = getValue(row, CHANNELS.lat);
            const lon = getValue(row, CHANNELS.lon);
            if (lat !== null && lon !== null) {
                minLat = Math.min(minLat, lat);
                maxLat = Math.max(maxLat, lat);
                minLon = Math.min(minLon, lon);
                maxLon = Math.max(maxLon, lon);
            }
        }
        
        // Convert lat/lon to local X/Y coordinates (simple equirectangular projection)
        const centerLat = (minLat + maxLat) / 2;
        const centerLon = (minLon + maxLon) / 2;
        const latScale = 111320; // meters per degree latitude
        const lonScale = 111320 * Math.cos(centerLat * Math.PI / 180); // meters per degree longitude
        
        for (const row of sampledData) {
            const lat = getValue(row, CHANNELS.lat);
            const lon = getValue(row, CHANNELS.lon);
            const speed = getValue(row, CHANNELS.speed, 100);
            const distance = getValue(row, CHANNELS.distance, positions.length);
            
            if (lat !== null && lon !== null) {
                positions.push({
                    x: (lon - centerLon) * lonScale,
                    y: (lat - centerLat) * latScale,
                    speed: speed,
                    distance: distance
                });
            }
        }
        
        return positions;
    }

    extractXYTrack(data, CHANNELS, getValue) {
        const sampleRate = Math.max(1, Math.floor(data.length / 500));
        const sampledData = data.filter((_, i) => i % sampleRate === 0);
        
        const positions = [];
        
        for (const row of sampledData) {
            const x = getValue(row, CHANNELS.posX);
            const y = getValue(row, CHANNELS.posY);
            const speed = getValue(row, CHANNELS.speed, 100);
            const distance = getValue(row, CHANNELS.distance, positions.length);
            
            if (x !== null && y !== null) {
                positions.push({ x, y, speed, distance });
            }
        }
        
        return positions;
    }

    reconstructTrack(data, CHANNELS, getValue, sampleRate = 10) {
        const positions = [];
        let x = 0, y = 0, heading = 0;
        const dt = 0.01; // 100Hz data typically
        
        // Sample the data to reduce points
        const sampledData = data.filter((_, i) => i % sampleRate === 0);
        
        for (let i = 0; i < sampledData.length; i++) {
            const row = sampledData[i];
            const speed = getValue(row, CHANNELS.speed, 100) / 3.6; // km/h to m/s
            const steer = getValue(row, CHANNELS.steer, 0) * (Math.PI / 180); // deg to rad
            const gLat = getValue(row, CHANNELS.gLat, 0);
            const yawRate = getValue(row, CHANNELS.yaw, 0) * (Math.PI / 180); // deg/s to rad/s
            const distance = getValue(row, CHANNELS.distance, i);
            
            // Use yaw rate if available, otherwise estimate from steering and speed
            let turnRate;
            if (Math.abs(yawRate) > 0.001) {
                turnRate = yawRate * dt * sampleRate;
            } else if (Math.abs(gLat) > 0.05) {
                // Estimate turn rate from lateral G: a = v²/r, ω = v/r = a/v
                turnRate = (gLat * 9.81 / Math.max(speed, 10)) * dt * sampleRate;
            } else {
                // Estimate from steering angle (simplified bicycle model)
                const wheelbase = 2.5; // Approximate wheelbase in meters
                turnRate = (speed * Math.tan(steer * 0.1) / wheelbase) * dt * sampleRate;
            }
            
            heading += turnRate;
            
            // Calculate position change
            const ds = speed * dt * sampleRate;
            x += ds * Math.cos(heading);
            y += ds * Math.sin(heading);
            
            positions.push({
                x: x,
                y: y,
                speed: getValue(row, CHANNELS.speed, 100),
                distance: distance
            });
        }
        
        return positions;
    }

    renderTrackMap(refTrack, currTrack, dataSource) {
        // Normalize and center tracks
        const allX = [...refTrack.map(p => p.x), ...currTrack.map(p => p.x)];
        const allY = [...refTrack.map(p => p.y), ...currTrack.map(p => p.y)];
        const minX = Math.min(...allX), maxX = Math.max(...allX);
        const minY = Math.min(...allY), maxY = Math.max(...allY);
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const scale = Math.max(maxX - minX, maxY - minY) || 1;

        // Normalize positions
        const normalizeTrack = (track) => track.map(p => ({
            x: (p.x - centerX) / scale,
            y: (p.y - centerY) / scale,
            speed: p.speed,
            distance: p.distance
        }));

        const refNorm = normalizeTrack(refTrack);
        const currNorm = normalizeTrack(currTrack);

        // Create color scale based on speed
        const getSpeedColor = (speed, minSpeed, maxSpeed) => {
            const ratio = Math.max(0, Math.min(1, (speed - minSpeed) / (maxSpeed - minSpeed || 1)));
            // Red (slow) to Yellow to Green (fast)
            if (ratio < 0.5) {
                const r = 255;
                const g = Math.round(ratio * 2 * 255);
                return `rgb(${r},${g},0)`;
            } else {
                const r = Math.round((1 - (ratio - 0.5) * 2) * 255);
                const g = 255;
                return `rgb(${r},${g},0)`;
            }
        };

        const refSpeeds = refNorm.map(p => p.speed);
        const currSpeeds = currNorm.map(p => p.speed);
        const minSpeed = Math.min(...refSpeeds, ...currSpeeds);
        const maxSpeed = Math.max(...refSpeeds, ...currSpeeds);

        // Reference track trace (thicker, semi-transparent)
        const refTrace = {
            x: refNorm.map(p => p.x),
            y: refNorm.map(p => p.y),
            mode: 'lines',
            name: 'Reference Line',
            line: {
                color: 'rgba(156, 163, 175, 0.6)',
                width: 8
            },
            hovertemplate: 'Reference<br>Speed: %{text} km/h<extra></extra>',
            text: refNorm.map(p => p.speed.toFixed(0))
        };

        // Current track trace with speed coloring - create segments for color coding
        const currTraces = [];
        for (let i = 0; i < currNorm.length - 1; i++) {
            currTraces.push({
                x: [currNorm[i].x, currNorm[i + 1].x],
                y: [currNorm[i].y, currNorm[i + 1].y],
                mode: 'lines',
                name: '',
                showlegend: false,
                line: {
                    color: getSpeedColor(currNorm[i].speed, minSpeed, maxSpeed),
                    width: 4
                },
                hovertemplate: `Your Line<br>Speed: ${currNorm[i].speed.toFixed(0)} km/h<extra></extra>`
            });
        }

        // Add start/finish marker
        const startMarker = {
            x: [refNorm[0].x],
            y: [refNorm[0].y],
            mode: 'markers+text',
            name: 'Start/Finish',
            text: ['S/F'],
            textposition: 'top center',
            textfont: { color: '#fff', size: 10 },
            marker: {
                color: '#ffffff',
                size: 12,
                symbol: 'square',
                line: { color: '#000', width: 2 }
            }
        };

        // Sector markers (divide track into 3)
        const s1End = Math.floor(refNorm.length / 3);
        const s2End = Math.floor(refNorm.length * 2 / 3);
        
        const sectorMarkers = {
            x: [refNorm[s1End].x, refNorm[s2End].x],
            y: [refNorm[s1End].y, refNorm[s2End].y],
            mode: 'markers+text',
            name: 'Sectors',
            text: ['S1|S2', 'S2|S3'],
            textposition: 'top center',
            textfont: { color: '#fbbf24', size: 10 },
            marker: {
                color: '#fbbf24',
                size: 8,
                symbol: 'diamond'
            }
        };

        // Speed colorbar legend (as a dummy trace)
        const colorbarTrace = {
            x: [null],
            y: [null],
            mode: 'markers',
            marker: {
                colorscale: [[0, 'red'], [0.5, 'yellow'], [1, 'green']],
                cmin: minSpeed,
                cmax: maxSpeed,
                colorbar: {
                    title: 'Speed (km/h)',
                    titleside: 'right',
                    thickness: 15,
                    len: 0.5,
                    y: 0.75,
                    tickfont: { color: '#fff' },
                    titlefont: { color: '#fff' }
                },
                showscale: true
            },
            showlegend: false,
            hoverinfo: 'skip'
        };

        const layout = {
            title: {
                text: `Track Map (${dataSource})`,
                font: { color: '#9ca3af', size: 14 },
                x: 0.02,
                xanchor: 'left'
            },
            showlegend: true,
            legend: { 
                x: 0.98, 
                y: 0.98,
                xanchor: 'right',
                bgcolor: 'rgba(0,0,0,0.5)',
                font: { color: '#fff', size: 10 }
            },
            xaxis: { 
                visible: false,
                scaleanchor: 'y',
                scaleratio: 1
            },
            yaxis: { 
                visible: false 
            },
            margin: { t: 30, b: 10, l: 10, r: 10 },
            paper_bgcolor: '#1f2937',
            plot_bgcolor: '#1f2937',
            hovermode: 'closest'
        };

        Plotly.newPlot('track-map', [refTrace, ...currTraces, startMarker, sectorMarkers, colorbarTrace], layout, { 
            responsive: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['lasso2d', 'select2d']
        });
    }

    generateSpeedDistanceChart() {
        if (!this.referenceData || !this.currentData) return;

        const CHANNELS = {
            distance: ['Lap Distance', 'Distance', 'Dist', 'distance'],
            speed: ['Ground Speed', 'Speed', 'Drive Speed', 'speed']
        };

        const getValue = (row, channelList, defaultVal = 0) => {
            for (const name of channelList) {
                if (row[name] !== undefined && row[name] !== null) {
                    const val = parseFloat(row[name]);
                    if (!isNaN(val)) return val;
                }
            }
            return defaultVal;
        };

        // Sample data for performance (every 10th point)
        const sampleRate = Math.max(1, Math.floor(this.referenceData.length / 500));
        
        const refData = this.referenceData.filter((_, i) => i % sampleRate === 0);
        const currData = this.currentData.filter((_, i) => i % sampleRate === 0);

        const refTrace = {
            x: refData.map(row => getValue(row, CHANNELS.distance, 0)),
            y: refData.map(row => getValue(row, CHANNELS.speed, 0)),
            mode: 'lines',
            name: 'Reference',
            line: { color: '#6b7280', width: 2 }
        };

        const currTrace = {
            x: currData.map(row => getValue(row, CHANNELS.distance, 0)),
            y: currData.map(row => getValue(row, CHANNELS.speed, 0)),
            mode: 'lines',
            name: 'Your Lap',
            line: { color: '#8b5cf6', width: 2 }
        };

        // Calculate and plot the delta
        const deltaTrace = {
            x: currData.map(row => getValue(row, CHANNELS.distance, 0)),
            y: currData.map((row, i) => {
                const currSpeed = getValue(row, CHANNELS.speed, 0);
                const refSpeed = refData[i] ? getValue(refData[i], CHANNELS.speed, 0) : currSpeed;
                return currSpeed - refSpeed;
            }),
            mode: 'lines',
            name: 'Delta',
            yaxis: 'y2',
            line: { color: '#f59e0b', width: 1, dash: 'dot' },
            fill: 'tozeroy',
            fillcolor: 'rgba(245, 158, 11, 0.1)'
        };

        const layout = {
            title: '',
            xaxis: { title: 'Distance (m)' },
            yaxis: { title: 'Speed (km/h)', side: 'left' },
            yaxis2: { 
                title: 'Delta (km/h)', 
                side: 'right', 
                overlaying: 'y',
                showgrid: false,
                zeroline: true,
                zerolinecolor: '#666'
            },
            margin: { t: 20, b: 50, l: 50, r: 50 },
            legend: { orientation: 'h', y: -0.25 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(249,250,251,1)'
        };

        Plotly.newPlot('speed-trace', [refTrace, currTrace, deltaTrace], layout, { responsive: true });
    }

    generateThrottleBrakeChart() {
        if (!this.referenceData || !this.currentData) return;

        const CHANNELS = {
            distance: ['Lap Distance', 'Distance', 'Dist', 'distance'],
            throttle: ['Throttle Pos', 'Throttle', 'TPS', 'throttle'],
            brake: ['Brake Pres Front', 'Brake Pressure', 'Brake', 'brake']
        };

        const getValue = (row, channelList, defaultVal = null) => {
            for (const name of channelList) {
                if (row[name] !== undefined && row[name] !== null) {
                    const val = parseFloat(row[name]);
                    if (!isNaN(val)) return val;
                }
            }
            return defaultVal;
        };

        // Check if we have throttle/brake data
        const hasThrottle = this.currentData.some(row => getValue(row, CHANNELS.throttle) !== null);
        const hasBrake = this.currentData.some(row => getValue(row, CHANNELS.brake) !== null);

        if (!hasThrottle && !hasBrake) {
            // Fall back to sector chart if no throttle/brake data
            return;
        }

        const sampleRate = Math.max(1, Math.floor(this.currentData.length / 500));
        const currData = this.currentData.filter((_, i) => i % sampleRate === 0);
        const refData = this.referenceData.filter((_, i) => i % sampleRate === 0);

        const traces = [];

        if (hasThrottle) {
            // Reference throttle
            traces.push({
                x: refData.map(row => getValue(row, CHANNELS.distance, 0)),
                y: refData.map(row => getValue(row, CHANNELS.throttle, 0)),
                mode: 'lines',
                name: 'Ref Throttle',
                line: { color: 'rgba(34, 197, 94, 0.4)', width: 2 },
                fill: 'tozeroy',
                fillcolor: 'rgba(34, 197, 94, 0.1)'
            });
            
            // Your throttle
            traces.push({
                x: currData.map(row => getValue(row, CHANNELS.distance, 0)),
                y: currData.map(row => getValue(row, CHANNELS.throttle, 0)),
                mode: 'lines',
                name: 'Your Throttle',
                line: { color: '#22c55e', width: 2 }
            });
        }

        if (hasBrake) {
            // Normalize brake pressure to 0-100 scale
            const maxBrake = Math.max(...currData.map(row => getValue(row, CHANNELS.brake, 0) || 0));
            const brakeScale = maxBrake > 100 ? 100 / maxBrake : 1;

            // Reference brake (inverted for visibility)
            traces.push({
                x: refData.map(row => getValue(row, CHANNELS.distance, 0)),
                y: refData.map(row => -(getValue(row, CHANNELS.brake, 0) || 0) * brakeScale),
                mode: 'lines',
                name: 'Ref Brake',
                line: { color: 'rgba(239, 68, 68, 0.4)', width: 2 },
                fill: 'tozeroy',
                fillcolor: 'rgba(239, 68, 68, 0.1)'
            });
            
            // Your brake
            traces.push({
                x: currData.map(row => getValue(row, CHANNELS.distance, 0)),
                y: currData.map(row => -(getValue(row, CHANNELS.brake, 0) || 0) * brakeScale),
                mode: 'lines',
                name: 'Your Brake',
                line: { color: '#ef4444', width: 2 }
            });
        }

        const layout = {
            title: '',
            xaxis: { title: 'Distance (m)' },
            yaxis: { 
                title: 'Throttle / Brake %',
                range: [-110, 110],
                zeroline: true,
                zerolinecolor: '#666',
                zerolinewidth: 2
            },
            margin: { t: 20, b: 50, l: 50, r: 20 },
            legend: { orientation: 'h', y: -0.25 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(249,250,251,1)',
            annotations: [{
                x: 0.02,
                y: 0.95,
                xref: 'paper',
                yref: 'paper',
                text: 'Throttle ↑',
                showarrow: false,
                font: { color: '#22c55e', size: 10 }
            }, {
                x: 0.02,
                y: 0.05,
                xref: 'paper',
                yref: 'paper',
                text: 'Brake ↓',
                showarrow: false,
                font: { color: '#ef4444', size: 10 }
            }]
        };

        Plotly.newPlot('g-forces', traces, layout, { responsive: true });
    }

    displaySetupRecommendations(analysis) {
        const container = document.getElementById('setup-recommendations');
        container.innerHTML = '';

        // Show problems identified
        if (analysis.problems && analysis.problems.length > 0) {
            const problemsSection = document.createElement('div');
            problemsSection.className = 'bg-white rounded-lg p-4 shadow mb-4';
            
            problemsSection.innerHTML = `
                <h3 class="font-bold text-lg mb-3 text-red-600">
                    <i class="fas fa-exclamation-triangle mr-2"></i>Issues Identified
                </h3>
                <div class="space-y-2">
                    ${analysis.problems.map(problem => `
                        <div class="border-l-4 border-red-500 pl-3 py-2 bg-red-50 rounded-r">
                            <p class="text-red-800">${problem}</p>
                        </div>
                    `).join('')}
                </div>
            `;
            
            container.appendChild(problemsSection);
        }

        // Show sector analysis
        if (analysis.sectors && analysis.sectors.length > 0) {
            const sectorSection = document.createElement('div');
            sectorSection.className = 'bg-white rounded-lg p-4 shadow mb-4';
            
            sectorSection.innerHTML = `
                <h3 class="font-bold text-lg mb-3">
                    <i class="fas fa-road mr-2"></i>Sector Analysis
                </h3>
                <div class="space-y-3">
                    ${analysis.sectors.map(s => {
                        const isGood = s.avgSpeedDelta >= 0;
                        const borderColor = isGood ? 'border-green-500' : 'border-red-500';
                        const bgColor = isGood ? 'bg-green-50' : 'bg-red-50';
                        return `
                        <div class="border-l-4 ${borderColor} pl-3 py-2 ${bgColor} rounded-r">
                            <p class="font-medium">Sector ${s.sector}</p>
                            <div class="grid grid-cols-2 gap-2 text-sm mt-1">
                                <div>
                                    <span class="text-gray-600">Avg Speed Delta:</span>
                                    <span class="${isGood ? 'text-green-600' : 'text-red-600'} font-medium">
                                        ${s.avgSpeedDelta > 0 ? '+' : ''}${s.avgSpeedDelta.toFixed(1)} km/h
                                    </span>
                                </div>
                                <div>
                                    <span class="text-gray-600">Corner Speed Delta:</span>
                                    <span class="${(s.minSpeedDelta || 0) >= 0 ? 'text-green-600' : 'text-red-600'} font-medium">
                                        ${(s.minSpeedDelta || 0) > 0 ? '+' : ''}${(s.minSpeedDelta || 0).toFixed(1)} km/h
                                    </span>
                                </div>
                                ${s.avgSpeedCurr ? `
                                <div>
                                    <span class="text-gray-600">Your Avg:</span>
                                    <span class="font-medium">${s.avgSpeedCurr.toFixed(1)} km/h</span>
                                </div>
                                <div>
                                    <span class="text-gray-600">Reference Avg:</span>
                                    <span class="font-medium">${s.avgSpeedRef.toFixed(1)} km/h</span>
                                </div>
                                ` : ''}
                            </div>
                            <p class="text-xs text-gray-500 mt-1">Time impact: ~${Math.abs(s.timeDelta || 0).toFixed(3)}s</p>
                        </div>
                    `}).join('')}
                </div>
            `;
            
            container.appendChild(sectorSection);
        }

        // Show throttle analysis if available
        if (analysis.throttle && analysis.throttle.fullThrottleCurr !== null) {
            const throttleSection = document.createElement('div');
            throttleSection.className = 'bg-white rounded-lg p-4 shadow mb-4';
            
            const throttleDiff = analysis.throttle.fullThrottleCurr - analysis.throttle.fullThrottleRef;
            
            throttleSection.innerHTML = `
                <h3 class="font-bold text-lg mb-3">
                    <i class="fas fa-gas-pump mr-2"></i>Throttle Analysis
                </h3>
                <div class="grid grid-cols-2 gap-4">
                    <div class="text-center p-3 bg-gray-50 rounded">
                        <p class="text-gray-600 text-sm">Your Full Throttle</p>
                        <p class="text-2xl font-bold ${throttleDiff < -5 ? 'text-red-600' : 'text-green-600'}">
                            ${analysis.throttle.fullThrottleCurr.toFixed(0)}%
                        </p>
                    </div>
                    <div class="text-center p-3 bg-gray-50 rounded">
                        <p class="text-gray-600 text-sm">Reference Full Throttle</p>
                        <p class="text-2xl font-bold">${analysis.throttle.fullThrottleRef.toFixed(0)}%</p>
                    </div>
                </div>
                ${throttleDiff < -5 ? `
                    <p class="text-red-600 text-sm mt-3">
                        <i class="fas fa-exclamation-circle mr-1"></i>
                        You're lifting ${Math.abs(throttleDiff).toFixed(0)}% more than the reference. Commit to the throttle!
                    </p>
                ` : ''}
            `;
            
            container.appendChild(throttleSection);
        }

        // Show worst sector recommendation
        if (analysis.worstSector) {
            const worstSection = document.createElement('div');
            worstSection.className = 'bg-white rounded-lg p-4 shadow mb-4 border-2 border-yellow-400';
            
            worstSection.innerHTML = `
                <h3 class="font-bold text-lg mb-3 text-yellow-600">
                    <i class="fas fa-bullseye mr-2"></i>Priority Focus Area
                </h3>
                <p class="text-gray-700">
                    <strong>Sector ${analysis.worstSector.sector}</strong> is where you're losing the most time.
                    You're ${Math.abs(analysis.worstSector.avgSpeedDelta).toFixed(1)} km/h slower on average here.
                </p>
                <p class="text-sm text-gray-600 mt-2">
                    Focus your practice on this sector first. Study the reference data to understand 
                    where the speed difference comes from - likely corner entry speed or throttle application.
                </p>
            `;
            
            container.appendChild(worstSection);
        }

        // If no data, show message
        if (container.children.length === 0) {
            container.innerHTML = '<p class="text-gray-500">Analysis data will appear here after processing.</p>';
        }
    }

    generateFullReport(analysis) {
        const reportContainer = document.getElementById('full-report');
        
        const timeDelta = analysis.timeDelta || 0;
        const speedDelta = analysis.speedDelta || (analysis.avgSpeedCurr - analysis.avgSpeedRef) || 0;
        
        const reportHTML = `
            <h2 class="text-2xl font-bold mb-4">Telemetry Analysis Report</h2>
            
            <h3 class="text-xl font-bold mt-6 mb-3">Executive Summary</h3>
            <div class="bg-gray-50 p-4 rounded-lg mb-4">
                <p class="text-lg ${timeDelta > 0 ? 'text-red-600' : 'text-green-600'} font-bold">
                    Lap Time Delta: ${timeDelta > 0 ? '+' : ''}${timeDelta.toFixed(3)} seconds
                </p>
                <p class="text-gray-700 mt-2">
                    Your average speed: <strong>${(analysis.avgSpeedCurr || 0).toFixed(1)} km/h</strong> 
                    (Reference: ${(analysis.avgSpeedRef || 0).toFixed(1)} km/h)
                </p>
                <p class="text-gray-700">
                    Speed deficit: <strong>${Math.abs(speedDelta).toFixed(1)} km/h</strong> overall
                </p>
            </div>
            
            <h3 class="text-xl font-bold mt-6 mb-3">Speed Analysis</h3>
            <table class="w-full border-collapse mb-4">
                <thead>
                    <tr class="bg-gray-100">
                        <th class="border p-2 text-left">Metric</th>
                        <th class="border p-2 text-right">Your Lap</th>
                        <th class="border p-2 text-right">Reference</th>
                        <th class="border p-2 text-right">Delta</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="border p-2">Average Speed</td>
                        <td class="border p-2 text-right">${(analysis.avgSpeedCurr || 0).toFixed(1)} km/h</td>
                        <td class="border p-2 text-right">${(analysis.avgSpeedRef || 0).toFixed(1)} km/h</td>
                        <td class="border p-2 text-right ${speedDelta >= 0 ? 'text-green-600' : 'text-red-600'}">
                            ${speedDelta >= 0 ? '+' : ''}${speedDelta.toFixed(1)} km/h
                        </td>
                    </tr>
                    <tr>
                        <td class="border p-2">Top Speed</td>
                        <td class="border p-2 text-right">${(analysis.maxSpeedCurr || 0).toFixed(0)} km/h</td>
                        <td class="border p-2 text-right">${(analysis.maxSpeedRef || 0).toFixed(0)} km/h</td>
                        <td class="border p-2 text-right ${(analysis.maxSpeedCurr - analysis.maxSpeedRef) >= 0 ? 'text-green-600' : 'text-red-600'}">
                            ${((analysis.maxSpeedCurr || 0) - (analysis.maxSpeedRef || 0)).toFixed(0)} km/h
                        </td>
                    </tr>
                    <tr>
                        <td class="border p-2">Min Corner Speed</td>
                        <td class="border p-2 text-right">${(analysis.minSpeedCurr || 0).toFixed(0)} km/h</td>
                        <td class="border p-2 text-right">${(analysis.minSpeedRef || 0).toFixed(0)} km/h</td>
                        <td class="border p-2 text-right ${((analysis.minSpeedCurr || 0) - (analysis.minSpeedRef || 0)) >= 0 ? 'text-green-600' : 'text-red-600'}">
                            ${((analysis.minSpeedCurr || 0) - (analysis.minSpeedRef || 0)).toFixed(0)} km/h
                        </td>
                    </tr>
                </tbody>
            </table>
            
            <h3 class="text-xl font-bold mt-6 mb-3">Sector Analysis</h3>
            ${this.generateSectorTable(analysis.sectors)}
            
            ${analysis.throttle && analysis.throttle.fullThrottleCurr !== null ? `
            <h3 class="text-xl font-bold mt-6 mb-3">Throttle Analysis</h3>
            <table class="w-full border-collapse mb-4">
                <thead>
                    <tr class="bg-gray-100">
                        <th class="border p-2 text-left">Metric</th>
                        <th class="border p-2 text-right">Your Lap</th>
                        <th class="border p-2 text-right">Reference</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="border p-2">Full Throttle Time</td>
                        <td class="border p-2 text-right">${analysis.throttle.fullThrottleCurr.toFixed(0)}%</td>
                        <td class="border p-2 text-right">${analysis.throttle.fullThrottleRef.toFixed(0)}%</td>
                    </tr>
                    <tr>
                        <td class="border p-2">Coasting Time</td>
                        <td class="border p-2 text-right">${(analysis.throttle.coastingCurr || 0).toFixed(1)}%</td>
                        <td class="border p-2 text-right">${(analysis.throttle.coastingRef || 0).toFixed(1)}%</td>
                    </tr>
                </tbody>
            </table>
            ` : ''}
            
            ${analysis.problems && analysis.problems.length > 0 ? `
            <h3 class="text-xl font-bold mt-6 mb-3">Identified Issues</h3>
            <ul class="list-disc pl-5 space-y-2 mb-4">
                ${analysis.problems.map(p => `<li class="text-red-700">${p}</li>`).join('')}
            </ul>
            ` : ''}
            
            <h3 class="text-xl font-bold mt-6 mb-3">Recommendations</h3>
            ${this.generateRecommendationsList(analysis)}
        `;
        
        reportContainer.innerHTML = reportHTML;
    }

    generateSectorTable(sectors) {
        if (!sectors || sectors.length === 0) return '<p class="text-gray-500">No sector data available</p>';
        
        return `
            <table class="w-full border-collapse mb-4">
                <thead>
                    <tr class="bg-gray-100">
                        <th class="border p-2">Sector</th>
                        <th class="border p-2">Avg Speed Delta</th>
                        <th class="border p-2">Corner Speed Delta</th>
                        <th class="border p-2">Est. Time Delta</th>
                        <th class="border p-2">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${sectors.map(sector => {
                        const avgDelta = sector.avgSpeedDelta || 0;
                        const minDelta = sector.minSpeedDelta || 0;
                        const status = avgDelta >= 0 ? '✓ Good' : avgDelta > -5 ? '⚠️ Needs Work' : '❌ Critical';
                        const statusColor = avgDelta >= 0 ? 'text-green-600' : avgDelta > -5 ? 'text-yellow-600' : 'text-red-600';
                        return `
                        <tr>
                            <td class="border p-2 font-medium">Sector ${sector.sector}</td>
                            <td class="border p-2 text-right ${avgDelta >= 0 ? 'text-green-600' : 'text-red-600'}">
                                ${avgDelta >= 0 ? '+' : ''}${avgDelta.toFixed(1)} km/h
                            </td>
                            <td class="border p-2 text-right ${minDelta >= 0 ? 'text-green-600' : 'text-red-600'}">
                                ${minDelta >= 0 ? '+' : ''}${minDelta.toFixed(1)} km/h
                            </td>
                            <td class="border p-2 text-right">${Math.abs(sector.timeDelta || 0).toFixed(3)}s</td>
                            <td class="border p-2 ${statusColor}">${status}</td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
        `;
    }

    generateRecommendationsList(analysis) {
        const recommendations = [];
        
        // Worst sector recommendation
        if (analysis.worstSector && analysis.worstSector.avgSpeedDelta < 0) {
            recommendations.push({
                priority: 'High',
                area: `Sector ${analysis.worstSector.sector}`,
                recommendation: `Focus here first - you're losing ${Math.abs(analysis.worstSector.avgSpeedDelta).toFixed(1)} km/h average speed. Study the reference data for this section.`
            });
        }
        
        // Throttle recommendations
        if (analysis.throttle) {
            if (analysis.throttle.fullThrottleCurr < analysis.throttle.fullThrottleRef - 5) {
                recommendations.push({
                    priority: 'High',
                    area: 'Throttle Application',
                    recommendation: `You're at full throttle ${analysis.throttle.fullThrottleCurr.toFixed(0)}% of the lap vs ${analysis.throttle.fullThrottleRef.toFixed(0)}% reference. Trust the car and commit earlier.`
                });
            }
            if (analysis.throttle.coastingCurr > analysis.throttle.coastingRef + 3) {
                recommendations.push({
                    priority: 'Medium',
                    area: 'Trail Braking',
                    recommendation: `Too much coasting between throttle and brake. Work on smoother transitions and trail braking into corners.`
                });
            }
        }
        
        // Corner speed recommendations
        if (analysis.minSpeedCurr && analysis.minSpeedRef && analysis.minSpeedCurr < analysis.minSpeedRef - 3) {
            recommendations.push({
                priority: 'Medium',
                area: 'Corner Entry',
                recommendation: `Your minimum corner speed is ${(analysis.minSpeedRef - analysis.minSpeedCurr).toFixed(0)} km/h slower. Carry more speed into the corners - the car can handle it.`
            });
        }
        
        // G-Force recommendations
        if (analysis.gForces && analysis.gForces.maxLatRef && analysis.gForces.maxLatCurr < analysis.gForces.maxLatRef - 0.2) {
            recommendations.push({
                priority: 'Medium',
                area: 'Cornering Commitment',
                recommendation: `You're not using all available grip. Reference shows ${analysis.gForces.maxLatRef.toFixed(2)}G lateral, you're only reaching ${analysis.gForces.maxLatCurr.toFixed(2)}G.`
            });
        }
        
        // Default if no specific recommendations
        if (recommendations.length === 0) {
            if (analysis.timeDelta > 0) {
                recommendations.push({
                    priority: 'General',
                    area: 'Overall Pace',
                    recommendation: 'Review each sector carefully. The time loss is spread throughout the lap. Focus on consistent execution.'
                });
            } else {
                recommendations.push({
                    priority: 'General',
                    area: 'Consistency',
                    recommendation: 'Good pace! Now focus on reproducing this lap consistently while looking for small gains.'
                });
            }
        }
        
        return `
            <div class="space-y-3">
                ${recommendations.map(item => `
                    <div class="border-l-4 ${
                        item.priority === 'High' ? 'border-red-500 bg-red-50' : 
                        item.priority === 'Medium' ? 'border-yellow-500 bg-yellow-50' : 
                        'border-blue-500 bg-blue-50'
                    } pl-3 py-2 rounded-r">
                        <p class="font-medium">${item.area} 
                            <span class="text-xs ${
                                item.priority === 'High' ? 'text-red-600' : 
                                item.priority === 'Medium' ? 'text-yellow-600' : 
                                'text-blue-600'
                            }">(${item.priority} Priority)</span>
                        </p>
                        <p class="text-sm text-gray-700">${item.recommendation}</p>
                    </div>
                `).join('')}
            </div>
        `;
    }

    async sendChatMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (!message) return;
        
        // Add user message to chat
        this.addUserMessage(message);
        input.value = '';
        
        // Show typing indicator
        this.showTypingIndicator();
        
        try {
            const url = `${this.webhookUrl}/webhook/ayrton-chat`;
            
            console.log('Sending chat with session:', this.sessionId);
            console.log('Session data available:', !!this.sessionData);

            // CRITICAL: Send session data with chat request
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: this.sessionId,
                    message: message,
                    session_data: this.sessionData,  // Pass the actual analysis data
                    context: {
                        analysis: this.analysisResults,
                        driver: document.getElementById('driver-name').value,
                        track: document.getElementById('track-name').value,
                        detected_channels: this.detectedChannels
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Handle both text and JSON responses
            const responseText = await response.text();
            console.log('Raw chat response:', responseText);
            
            let result;
            try {
                // Try to parse as JSON first
                result = JSON.parse(responseText);
            } catch (e) {
                // If parsing fails, it's plain text - wrap it
                console.log('Response is plain text, wrapping it');
                result = { ayrton_says: responseText };
            }
            
            console.log('Chat response processed:', result);
            
            // Remove typing indicator
            this.hideTypingIndicator();
            
            // Add AI response - try multiple possible field names
            const responseMessage = result.ayrton_says || 
                                  result.response || 
                                  result.message || 
                                  result.text ||
                                  (typeof result === 'string' ? result : null) ||
                                  responseText ||
                                  'I need to analyze your data first. Upload your telemetry.';
                                  
            this.addAyrtonMessage(responseMessage);
            
        } catch (error) {
            console.error('Chat error:', error);
            this.hideTypingIndicator();
            this.addAyrtonMessage('Connection issue. Make sure your telemetry is uploaded and try again.');
        }
    }

    addUserMessage(message) {
        const chatMessages = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message flex items-start justify-end';
        messageDiv.innerHTML = `
            <div class="bg-gray-200 rounded-lg p-3 max-w-2xl">
                <p class="font-medium">You</p>
                <p>${message}</p>
            </div>
        `;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    addAyrtonMessage(message) {
        const chatMessages = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message flex items-start';
        messageDiv.innerHTML = `
            <div class="bg-gradient-to-r from-purple-700 to-purple-900 text-white rounded-lg p-4 max-w-2xl shadow-lg">
                <div class="flex items-center mb-2">
                    <div class="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center mr-3">
                        <span class="text-purple-900 font-bold text-lg">A</span>
                    </div>
                    <div>
                        <p class="font-bold text-yellow-300">Ayrton</p>
                        <p class="text-xs text-purple-200">Legendary Racing Coach</p>
                    </div>
                </div>
                <div class="prose prose-invert text-white">${this.formatAyrtonMessage(message)}</div>
            </div>
        `;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    formatAyrtonMessage(message) {
        // First, strip any HTML tags that might have been included by the AI
        let cleaned = message
            .replace(/<[^>]*>/g, '') // Remove all HTML tags
            .replace(/&lt;/g, '<')   // Decode HTML entities
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/"text-[^"]*">/g, '') // Remove any CSS class remnants
            .replace(/class="[^"]*"/g, ''); // Remove class attributes
        
        // Now apply our formatting
        return cleaned
            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-yellow-300">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n\n/g, '</p><p class="mt-3">')
            .replace(/\n/g, '<br>')
            .replace(/^/, '<p>')
            .replace(/$/, '</p>')
            .replace(/"([^"]+)"/g, '<span class="text-yellow-200 italic">"$1"</span>');
    }

    showTypingIndicator() {
        const chatMessages = document.getElementById('chat-messages');
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typing-indicator';
        typingDiv.className = 'message flex items-start';
        typingDiv.innerHTML = `
            <div class="bg-purple-600 text-white rounded-lg p-3">
                <p class="font-medium">Ayrton</p>
                <p><i class="fas fa-ellipsis-h"></i> Analyzing...</p>
            </div>
        `;
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    hideTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    switchTab(tabName) {
        // Remove active class from all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Add active class to selected tab
        const selectedTab = document.getElementById(`${tabName}-tab`);
        if (selectedTab) {
            selectedTab.classList.add('active');
        }
        
        // Update tab button styles
        document.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.dataset.tab === tabName) {
                btn.classList.add('border-purple-500', 'text-purple-600');
                btn.classList.remove('border-transparent', 'text-gray-600');
            } else {
                btn.classList.remove('border-purple-500', 'text-purple-600');
                btn.classList.add('border-transparent', 'text-gray-600');
            }
        });
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            type === 'success' ? 'bg-green-500' :
            type === 'error' ? 'bg-red-500' :
            type === 'warning' ? 'bg-yellow-500' :
            'bg-blue-500'
        } text-white`;
        
        notification.innerHTML = `
            <div class="flex items-center">
                <i class="fas ${
                    type === 'success' ? 'fa-check-circle' :
                    type === 'error' ? 'fa-exclamation-circle' :
                    type === 'warning' ? 'fa-exclamation-triangle' :
                    'fa-info-circle'
                } mr-2"></i>
                <p>${message}</p>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.telemetryApp = new TelemetryAnalysisApp();
    console.log('Telemetry Analysis App initialized');
    console.log('Webhook URL:', window.telemetryApp.webhookUrl);
});
