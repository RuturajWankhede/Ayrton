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

        // Parse CSV
        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            complete: (results) => {
                if (type === 'ref') {
                    this.referenceData = results.data.filter(row => row && Object.keys(row).length > 0);
                    this.displayFileInfo('ref', file);
                } else {
                    this.currentData = results.data.filter(row => row && Object.keys(row).length > 0);
                    this.displayFileInfo('curr', file);
                }
                
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
            
            const payload = {
                reference_lap: this.referenceData,
                current_lap: this.currentData,
                driver_name: document.getElementById('driver-name').value || 'Driver',
                track_name: document.getElementById('track-name').value || 'Track',
                session_id: sessionId,
                timestamp: new Date().toISOString(),
                detected_channels: this.detectedChannels // Include channel mapping in payload
            };

            console.log('Sending payload to:', `${this.webhookUrl}/webhook/telemetry-analysis`);

            const url = `${this.webhookUrl}/webhook/telemetry-analysis`;

            const response = await fetch(url, {
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
        
        // G-force usage or efficiency
        const gForceUsage = analysis.vehicleDynamics?.averageUtilization || 
                          (analysis.efficiency * 100) || 75;
        document.getElementById('g-force-usage').textContent = `${gForceUsage.toFixed(0)}%`;
        
        // Tire status or style
        const tireStatus = analysis.drivingStyle?.primaryStyle || 'Analyzing';
        document.getElementById('tire-status').textContent = tireStatus;
        
        // Setup issues
        const setupIssues = analysis.anomalies?.criticalCount || 0;
        document.getElementById('setup-issue').textContent = `${setupIssues} Issues`;

        // Generate graphs if data available
        if (analysis.speedTrace || analysis.sectors) {
            this.generateGraphs(analysis);
        }
        
        // Display setup recommendations
        if (analysis.racingLine || analysis.setupRecommendations) {
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
        // Speed trace
        if (analysis.sectors) {
            const speedTrace = {
                x: analysis.sectors.map((s, i) => `Sector ${i + 1}`),
                y: analysis.sectors.map(s => s.avgSpeedDelta || 0),
                type: 'bar',
                name: 'Speed Delta',
                marker: {
                    color: analysis.sectors.map(s => s.avgSpeedDelta < 0 ? 'red' : 'green')
                }
            };

            const layout = {
                title: 'Sector Speed Comparison',
                xaxis: { title: 'Sector' },
                yaxis: { title: 'Speed Delta (km/h)' }
            };

            Plotly.newPlot('speed-trace', [speedTrace], layout);
        }
    }

    displaySetupRecommendations(analysis) {
        const container = document.getElementById('setup-recommendations');
        container.innerHTML = '';

        if (analysis.sectors) {
            const section = document.createElement('div');
            section.className = 'bg-white rounded-lg p-4 shadow mb-4';
            
            section.innerHTML = `
                <h3 class="font-bold text-lg mb-3">Sector Analysis</h3>
                <div class="space-y-2">
                    ${analysis.sectors.map(s => `
                        <div class="border-l-4 ${s.avgSpeedDelta < 0 ? 'border-red-500' : 'border-green-500'} pl-3">
                            <p class="font-medium">Sector ${s.sector}</p>
                            <p class="text-sm text-gray-600">Speed Delta: ${s.avgSpeedDelta.toFixed(1)} km/h</p>
                            <p class="text-xs text-gray-500">Time Delta: ${s.timeDelta.toFixed(3)}s</p>
                        </div>
                    `).join('')}
                </div>
            `;
            
            container.appendChild(section);
        }
    }

    generateFullReport(analysis) {
        const reportContainer = document.getElementById('full-report');
        
        const reportHTML = `
            <h2 class="text-2xl font-bold mb-4">Telemetry Analysis Report</h2>
            
            <h3 class="text-xl font-bold mt-6 mb-3">Executive Summary</h3>
            <p>Total lap time delta: ${(analysis.timeDelta || 0).toFixed(3)}s</p>
            <p>Average speed current: ${(analysis.avgSpeedCurr || 0).toFixed(1)} km/h</p>
            <p>Average speed reference: ${(analysis.avgSpeedRef || 0).toFixed(1)} km/h</p>
            
            <h3 class="text-xl font-bold mt-6 mb-3">Sector Analysis</h3>
            ${this.generateSectorTable(analysis.sectors)}
            
            <h3 class="text-xl font-bold mt-6 mb-3">Recommendations</h3>
            ${this.generateRecommendationsList(analysis)}
        `;
        
        reportContainer.innerHTML = reportHTML;
    }

    generateSectorTable(sectors) {
        if (!sectors || sectors.length === 0) return '<p>No sector data available</p>';
        
        return `
            <table class="w-full border-collapse">
                <thead>
                    <tr class="bg-gray-100">
                        <th class="border p-2">Sector</th>
                        <th class="border p-2">Speed Delta</th>
                        <th class="border p-2">Time Delta</th>
                    </tr>
                </thead>
                <tbody>
                    ${sectors.map(sector => `
                        <tr>
                            <td class="border p-2">${sector.sector}</td>
                            <td class="border p-2">${(sector.avgSpeedDelta || 0).toFixed(1)} km/h</td>
                            <td class="border p-2">${(sector.timeDelta || 0).toFixed(3)}s</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    generateRecommendationsList(analysis) {
        const recommendations = [];
        
        if (analysis.sectors) {
            const worstSector = analysis.sectors.reduce((prev, curr) => 
                curr.avgSpeedDelta < prev.avgSpeedDelta ? curr : prev
            );
            
            recommendations.push({
                area: `Focus on Sector ${worstSector.sector}`,
                recommendation: `You're losing ${Math.abs(worstSector.avgSpeedDelta).toFixed(1)} km/h here`
            });
        }
        
        if (recommendations.length === 0) {
            return '<p>Analyzing data for personalized recommendations...</p>';
        }
        
        return `
            <ul class="list-disc pl-5 space-y-2">
                ${recommendations.map(item => `
                    <li>
                        <strong>${item.area}</strong>: ${item.recommendation}
                    </li>
                `).join('')}
            </ul>
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
        return message
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
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.add('hidden');
        });
        
        document.getElementById(`${tabName}-tab`).classList.remove('hidden');
        
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
