// Racing Telemetry Analysis App
// Clean version without special characters

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
        console.log('Telemetry Analysis App initialized');
        console.log('Webhook URL:', this.webhookUrl);
    }

    checkConfiguration() {
        if (!this.webhookUrl) {
            document.getElementById('config-modal').classList.remove('hidden');
            document.getElementById('config-modal').classList.add('flex');
        }
    }

    setupEventListeners() {
        this.setupFileUpload('ref');
        this.setupFileUpload('curr');

        document.getElementById('analyze-btn').addEventListener('click', () => this.analyzeTelemetry());

        document.getElementById('send-btn').addEventListener('click', () => this.sendChatMessage());
        document.getElementById('chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendChatMessage();
        });

        document.querySelectorAll('.quick-question').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.getElementById('chat-input').value = e.target.textContent.trim();
                this.sendChatMessage();
            });
        });

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        document.getElementById('save-config').addEventListener('click', () => {
            this.webhookUrl = document.getElementById('webhook-url').value;
            localStorage.setItem('n8n_webhook_url', this.webhookUrl);
            document.getElementById('config-modal').classList.add('hidden');
            this.showNotification('Configuration saved!', 'success');
        });
    }

    setupFileUpload(type) {
        var uploadArea = document.getElementById(type + '-upload');
        var fileInput = document.getElementById(type + '-file');
        var self = this;

        uploadArea.addEventListener('click', function() { fileInput.click(); });

        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', function() {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                self.handleFileSelect(e.dataTransfer.files[0], type);
            }
        });

        fileInput.addEventListener('change', function(e) {
            if (e.target.files.length > 0) {
                self.handleFileSelect(e.target.files[0], type);
            }
        });
    }

    handleFileSelect(file, type) {
        var self = this;
        
        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
            this.showNotification('Please upload a CSV file', 'error');
            return;
        }

        var reader = new FileReader();
        reader.onload = function(e) {
            var text = e.target.result;
            var lines = text.split(/\r?\n/);
            
            var headerRowIndex = 0;
            var isMoTeCFormat = false;
            
            if (lines[0] && lines[0].indexOf('MoTeC CSV File') !== -1) {
                isMoTeCFormat = true;
                for (var i = 0; i < Math.min(lines.length, 30); i++) {
                    var cells = lines[i].split(',').map(function(c) { return c.replace(/"/g, '').trim(); });
                    if (cells[0] === 'Time' || cells.indexOf('Time') !== -1) {
                        headerRowIndex = i;
                        console.log('MoTeC format detected. Header row at line ' + (i + 1));
                        break;
                    }
                }
            }
            
            var csvText = text;
            if (isMoTeCFormat && headerRowIndex > 0) {
                var headerLine = lines[headerRowIndex];
                var dataLines = lines.slice(headerRowIndex + 2);
                csvText = [headerLine].concat(dataLines).join('\n');
                console.log('Skipped ' + headerRowIndex + ' metadata rows and 1 units row');
            }
            
            Papa.parse(csvText, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: function(results) {
                    var cleanedData = results.data.filter(function(row) {
                        if (!row || Object.keys(row).length === 0) return false;
                        return Object.values(row).some(function(val) { 
                            return val !== null && val !== '' && val !== undefined; 
                        });
                    });
                    
                    if (type === 'ref') {
                        self.referenceData = cleanedData;
                        self.displayFileInfo('ref', file);
                    } else {
                        self.currentData = cleanedData;
                        self.displayFileInfo('curr', file);
                    }
                    
                    console.log('Parsed ' + cleanedData.length + ' data rows with ' + Object.keys(cleanedData[0] || {}).length + ' columns');
                    
                    if (self.referenceData && self.currentData) {
                        document.getElementById('analyze-btn').disabled = false;
                        self.detectChannels();
                    }
                },
                error: function(error) {
                    self.showNotification('Error parsing CSV: ' + error.message, 'error');
                }
            });
        };
        
        reader.onerror = function() {
            self.showNotification('Error reading file', 'error');
        };
        
        reader.readAsText(file);
    }

    displayFileInfo(type, file) {
        var infoDiv = document.getElementById(type + '-file-info');
        var nameSpan = document.getElementById(type + '-file-name');
        var sizeSpan = document.getElementById(type + '-file-size');
        
        nameSpan.textContent = file.name;
        sizeSpan.textContent = (file.size / 1024).toFixed(1) + ' KB';
        infoDiv.classList.remove('hidden');
        
        var uploadArea = document.getElementById(type + '-upload');
        uploadArea.classList.add('border-green-500', 'bg-green-50');
        uploadArea.innerHTML = '<i class="fas fa-check-circle text-4xl text-green-500 mb-2"></i><p class="text-green-600">' + file.name + '</p>';
    }

    detectChannels() {
        if (!this.referenceData || this.referenceData.length === 0) return;
        
        var columns = Object.keys(this.referenceData[0]);
        var self = this;
        
        // Channel definitions with variants
        var channelDefinitions = {
            required: {
                time: {
                    variants: ['Time', 'Elapsed Time', 'Session Time', 'time'],
                    description: 'Timestamp data',
                    icon: 'fa-clock'
                },
                distance: {
                    variants: ['Lap Distance', 'Distance', 'Dist', 'LapDist', 'distance'],
                    description: 'Position around lap',
                    icon: 'fa-road'
                },
                speed: {
                    variants: ['Ground Speed', 'Speed', 'Drive Speed', 'Vehicle Speed', 'speed'],
                    description: 'Vehicle speed',
                    icon: 'fa-tachometer-alt'
                }
            },
            optional: {
                // Driver Inputs
                throttle: {
                    variants: ['Throttle Pos', 'Throttle', 'TPS', 'throttle', 'Throttle Position'],
                    description: 'Throttle position',
                    icon: 'fa-gas-pump',
                    category: 'Driver Inputs'
                },
                brake: {
                    variants: ['Brake Pres Front', 'Brake Pressure', 'Brake', 'brake', 'Brake Pres Rear'],
                    description: 'Brake pressure',
                    icon: 'fa-hand-paper',
                    category: 'Driver Inputs'
                },
                gear: {
                    variants: ['Gear', 'gear', 'Gear Position'],
                    description: 'Current gear',
                    icon: 'fa-cog',
                    category: 'Driver Inputs'
                },
                steer: {
                    variants: ['Steered Angle', 'Steering Angle', 'Steer', 'steer'],
                    description: 'Steering angle',
                    icon: 'fa-dharmachakra',
                    category: 'Driver Inputs'
                },
                
                // Engine
                rpm: {
                    variants: ['Engine RPM', 'RPM', 'rpm', 'Engine Speed'],
                    description: 'Engine RPM',
                    icon: 'fa-tachometer-alt',
                    category: 'Engine'
                },
                engineTemp: {
                    variants: ['Engine Temp', 'Water Temp', 'Coolant Temp'],
                    description: 'Engine temperature',
                    icon: 'fa-thermometer-full',
                    category: 'Engine'
                },
                oilTemp: {
                    variants: ['Eng Oil Temp', 'Oil Temp', 'Engine Oil Temp'],
                    description: 'Oil temperature',
                    icon: 'fa-oil-can',
                    category: 'Engine'
                },
                fuelLevel: {
                    variants: ['Fuel Level', 'Fuel', 'Fuel Qty'],
                    description: 'Fuel level',
                    icon: 'fa-gas-pump',
                    category: 'Engine'
                },
                
                // G-Forces - Combined/Average
                gLat: {
                    variants: ['G Force Lat', 'Lateral G', 'G_Lat', 'gLat', 'Lat G'],
                    description: 'Lateral G-force (combined)',
                    icon: 'fa-arrows-alt-h',
                    category: 'G-Forces'
                },
                gLong: {
                    variants: ['G Force Long', 'Longitudinal G', 'G_Long', 'gLong', 'Long G'],
                    description: 'Longitudinal G-force (combined)',
                    icon: 'fa-arrows-alt-v',
                    category: 'G-Forces'
                },
                // G-Forces - Front Position
                gLatFront: {
                    variants: ['G Force Lat Front', 'G Force Lat - Front', 'Lat G Front', 'G_Lat_Front'],
                    description: 'Lateral G-force at front axle',
                    icon: 'fa-arrows-alt-h',
                    category: 'G-Forces'
                },
                gLongFront: {
                    variants: ['G Force Long Front', 'G Force Long - Front', 'Long G Front', 'G_Long_Front'],
                    description: 'Longitudinal G-force at front axle',
                    icon: 'fa-arrows-alt-v',
                    category: 'G-Forces'
                },
                // G-Forces - Mid Position
                gLatMid: {
                    variants: ['G Force Lat Mid', 'G Force Lat - Mid', 'Lat G Mid', 'G_Lat_Mid', 'G Force Lat Center'],
                    description: 'Lateral G-force at center/mid',
                    icon: 'fa-arrows-alt-h',
                    category: 'G-Forces'
                },
                gLongMid: {
                    variants: ['G Force Long Mid', 'G Force Long - Mid', 'Long G Mid', 'G_Long_Mid', 'G Force Long Center'],
                    description: 'Longitudinal G-force at center/mid',
                    icon: 'fa-arrows-alt-v',
                    category: 'G-Forces'
                },
                // G-Forces - Rear Position
                gLatRear: {
                    variants: ['G Force Lat Rear', 'G Force Lat - Rear', 'Lat G Rear', 'G_Lat_Rear'],
                    description: 'Lateral G-force at rear axle',
                    icon: 'fa-arrows-alt-h',
                    category: 'G-Forces'
                },
                gLongRear: {
                    variants: ['G Force Long Rear', 'G Force Long - Rear', 'Long G Rear', 'G_Long_Rear'],
                    description: 'Longitudinal G-force at rear axle',
                    icon: 'fa-arrows-alt-v',
                    category: 'G-Forces'
                },
                // G-Forces - Vertical
                gVert: {
                    variants: ['G Force Vert', 'Vertical G', 'G_Vert', 'gVert', 'G Force Vertical'],
                    description: 'Vertical G-force',
                    icon: 'fa-arrows-alt-v',
                    category: 'G-Forces'
                },
                
                // Vehicle Dynamics
                yaw: {
                    variants: ['Gyro Yaw Velocity', 'Yaw Rate', 'Yaw', 'yaw'],
                    description: 'Yaw rate',
                    icon: 'fa-sync',
                    category: 'Vehicle Dynamics'
                },
                pitch: {
                    variants: ['Gyro Pitch Velocity', 'Pitch Rate', 'Pitch'],
                    description: 'Pitch rate',
                    icon: 'fa-sync',
                    category: 'Vehicle Dynamics'
                },
                roll: {
                    variants: ['Gyro Roll Velocity', 'Roll Rate', 'Roll'],
                    description: 'Roll rate',
                    icon: 'fa-sync',
                    category: 'Vehicle Dynamics'
                },
                
                // Wheel Speeds
                wheelSpeedFL: {
                    variants: ['Wheel Speed FL', 'WheelSpeed FL', 'Wheel Speed LF'],
                    description: 'Front left wheel speed',
                    icon: 'fa-circle',
                    category: 'Wheel Speeds'
                },
                wheelSpeedFR: {
                    variants: ['Wheel Speed FR', 'WheelSpeed FR', 'Wheel Speed RF'],
                    description: 'Front right wheel speed',
                    icon: 'fa-circle',
                    category: 'Wheel Speeds'
                },
                wheelSpeedRL: {
                    variants: ['Wheel Speed RL', 'WheelSpeed RL', 'Wheel Speed LR'],
                    description: 'Rear left wheel speed',
                    icon: 'fa-circle',
                    category: 'Wheel Speeds'
                },
                wheelSpeedRR: {
                    variants: ['Wheel Speed RR', 'WheelSpeed RR', 'Wheel Speed RR'],
                    description: 'Rear right wheel speed',
                    icon: 'fa-circle',
                    category: 'Wheel Speeds'
                },
                
                // Wheel Slip
                wheelSlipFL: {
                    variants: ['Wheel Slip FL', 'Slip FL', 'Slip Ratio FL', 'Tyre Slip FL'],
                    description: 'Front left wheel slip',
                    icon: 'fa-wave-square',
                    category: 'Wheel Slip'
                },
                wheelSlipFR: {
                    variants: ['Wheel Slip FR', 'Slip FR', 'Slip Ratio FR', 'Tyre Slip FR'],
                    description: 'Front right wheel slip',
                    icon: 'fa-wave-square',
                    category: 'Wheel Slip'
                },
                wheelSlipRL: {
                    variants: ['Wheel Slip RL', 'Slip RL', 'Slip Ratio RL', 'Tyre Slip RL'],
                    description: 'Rear left wheel slip',
                    icon: 'fa-wave-square',
                    category: 'Wheel Slip'
                },
                wheelSlipRR: {
                    variants: ['Wheel Slip RR', 'Slip RR', 'Slip Ratio RR', 'Tyre Slip RR'],
                    description: 'Rear right wheel slip',
                    icon: 'fa-wave-square',
                    category: 'Wheel Slip'
                },
                slipAngleFL: {
                    variants: ['Slip Angle FL', 'Tyre Slip Angle FL', 'Slip Ang FL'],
                    description: 'Front left slip angle',
                    icon: 'fa-angle-double-right',
                    category: 'Wheel Slip'
                },
                slipAngleFR: {
                    variants: ['Slip Angle FR', 'Tyre Slip Angle FR', 'Slip Ang FR'],
                    description: 'Front right slip angle',
                    icon: 'fa-angle-double-right',
                    category: 'Wheel Slip'
                },
                slipAngleRL: {
                    variants: ['Slip Angle RL', 'Tyre Slip Angle RL', 'Slip Ang RL'],
                    description: 'Rear left slip angle',
                    icon: 'fa-angle-double-right',
                    category: 'Wheel Slip'
                },
                slipAngleRR: {
                    variants: ['Slip Angle RR', 'Tyre Slip Angle RR', 'Slip Ang RR'],
                    description: 'Rear right slip angle',
                    icon: 'fa-angle-double-right',
                    category: 'Wheel Slip'
                },
                
                // Suspension
                suspFL: {
                    variants: ['Susp Pos FL', 'Suspension FL', 'Damper FL', 'Susp Travel FL'],
                    description: 'Front left suspension',
                    icon: 'fa-arrows-alt-v',
                    category: 'Suspension'
                },
                suspFR: {
                    variants: ['Susp Pos FR', 'Suspension FR', 'Damper FR', 'Susp Travel FR'],
                    description: 'Front right suspension',
                    icon: 'fa-arrows-alt-v',
                    category: 'Suspension'
                },
                suspRL: {
                    variants: ['Susp Pos RL', 'Suspension RL', 'Damper RL', 'Susp Travel RL'],
                    description: 'Rear left suspension',
                    icon: 'fa-arrows-alt-v',
                    category: 'Suspension'
                },
                suspRR: {
                    variants: ['Susp Pos RR', 'Suspension RR', 'Damper RR', 'Susp Travel RR'],
                    description: 'Rear right suspension',
                    icon: 'fa-arrows-alt-v',
                    category: 'Suspension'
                },
                rideHeightFront: {
                    variants: ['Ride Height Front', 'Ride Ht Front', 'Front Ride Height'],
                    description: 'Front ride height',
                    icon: 'fa-ruler-vertical',
                    category: 'Suspension'
                },
                rideHeightRear: {
                    variants: ['Ride Height Rear', 'Ride Ht Rear', 'Rear Ride Height'],
                    description: 'Rear ride height',
                    icon: 'fa-ruler-vertical',
                    category: 'Suspension'
                },
                
                // Tire Temperatures - FL (Front Left)
                tyreTempFLCenter: {
                    variants: ['Tyre Temp FL Centre', 'Tire Temp FL Center', 'Tyre Temp FL Mid', 'TyreTemp FL C'],
                    description: 'FL tire center temp',
                    icon: 'fa-thermometer-half',
                    category: 'Tire Temps FL'
                },
                tyreTempFLInner: {
                    variants: ['Tyre Temp FL Inner', 'Tire Temp FL Inner', 'Tyre Temp FL In', 'TyreTemp FL I'],
                    description: 'FL tire inner temp',
                    icon: 'fa-thermometer-half',
                    category: 'Tire Temps FL'
                },
                tyreTempFLOuter: {
                    variants: ['Tyre Temp FL Outer', 'Tire Temp FL Outer', 'Tyre Temp FL Out', 'TyreTemp FL O'],
                    description: 'FL tire outer temp',
                    icon: 'fa-thermometer-half',
                    category: 'Tire Temps FL'
                },
                
                // Tire Temperatures - FR (Front Right)
                tyreTempFRCenter: {
                    variants: ['Tyre Temp FR Centre', 'Tire Temp FR Center', 'Tyre Temp FR Mid', 'TyreTemp FR C'],
                    description: 'FR tire center temp',
                    icon: 'fa-thermometer-half',
                    category: 'Tire Temps FR'
                },
                tyreTempFRInner: {
                    variants: ['Tyre Temp FR Inner', 'Tire Temp FR Inner', 'Tyre Temp FR In', 'TyreTemp FR I'],
                    description: 'FR tire inner temp',
                    icon: 'fa-thermometer-half',
                    category: 'Tire Temps FR'
                },
                tyreTempFROuter: {
                    variants: ['Tyre Temp FR Outer', 'Tire Temp FR Outer', 'Tyre Temp FR Out', 'TyreTemp FR O'],
                    description: 'FR tire outer temp',
                    icon: 'fa-thermometer-half',
                    category: 'Tire Temps FR'
                },
                
                // Tire Temperatures - RL (Rear Left)
                tyreTempRLCenter: {
                    variants: ['Tyre Temp RL Centre', 'Tire Temp RL Center', 'Tyre Temp RL Mid', 'TyreTemp RL C'],
                    description: 'RL tire center temp',
                    icon: 'fa-thermometer-half',
                    category: 'Tire Temps RL'
                },
                tyreTempRLInner: {
                    variants: ['Tyre Temp RL Inner', 'Tire Temp RL Inner', 'Tyre Temp RL In', 'TyreTemp RL I'],
                    description: 'RL tire inner temp',
                    icon: 'fa-thermometer-half',
                    category: 'Tire Temps RL'
                },
                tyreTempRLOuter: {
                    variants: ['Tyre Temp RL Outer', 'Tire Temp RL Outer', 'Tyre Temp RL Out', 'TyreTemp RL O'],
                    description: 'RL tire outer temp',
                    icon: 'fa-thermometer-half',
                    category: 'Tire Temps RL'
                },
                
                // Tire Temperatures - RR (Rear Right)
                tyreTempRRCenter: {
                    variants: ['Tyre Temp RR Centre', 'Tire Temp RR Center', 'Tyre Temp RR Mid', 'TyreTemp RR C'],
                    description: 'RR tire center temp',
                    icon: 'fa-thermometer-half',
                    category: 'Tire Temps RR'
                },
                tyreTempRRInner: {
                    variants: ['Tyre Temp RR Inner', 'Tire Temp RR Inner', 'Tyre Temp RR In', 'TyreTemp RR I'],
                    description: 'RR tire inner temp',
                    icon: 'fa-thermometer-half',
                    category: 'Tire Temps RR'
                },
                tyreTempRROuter: {
                    variants: ['Tyre Temp RR Outer', 'Tire Temp RR Outer', 'Tyre Temp RR Out', 'TyreTemp RR O'],
                    description: 'RR tire outer temp',
                    icon: 'fa-thermometer-half',
                    category: 'Tire Temps RR'
                },
                
                // Brake Temperatures (All 4 corners)
                brakeTempFL: {
                    variants: ['Brake Temp FL', 'BrakeTemp FL', 'Brake Disc Temp FL'],
                    description: 'Front left brake temp',
                    icon: 'fa-fire',
                    category: 'Brake Temps'
                },
                brakeTempFR: {
                    variants: ['Brake Temp FR', 'BrakeTemp FR', 'Brake Disc Temp FR'],
                    description: 'Front right brake temp',
                    icon: 'fa-fire',
                    category: 'Brake Temps'
                },
                brakeTempRL: {
                    variants: ['Brake Temp RL', 'BrakeTemp RL', 'Brake Disc Temp RL'],
                    description: 'Rear left brake temp',
                    icon: 'fa-fire',
                    category: 'Brake Temps'
                },
                brakeTempRR: {
                    variants: ['Brake Temp RR', 'BrakeTemp RR', 'Brake Disc Temp RR'],
                    description: 'Rear right brake temp',
                    icon: 'fa-fire',
                    category: 'Brake Temps'
                },
                
                // Position/GPS
                gpsLat: {
                    variants: ['GPS Latitude', 'Latitude', 'Lat', 'GPS_Lat'],
                    description: 'GPS Latitude',
                    icon: 'fa-map-marker-alt',
                    category: 'Position'
                },
                gpsLon: {
                    variants: ['GPS Longitude', 'Longitude', 'Lon', 'GPS_Long'],
                    description: 'GPS Longitude',
                    icon: 'fa-map-marker-alt',
                    category: 'Position'
                },
                gpsAltitude: {
                    variants: ['GPS Altitude', 'Altitude', 'GPS_Alt', 'GPS Height'],
                    description: 'GPS Altitude',
                    icon: 'fa-mountain',
                    category: 'Position'
                },
                gpsSpeed: {
                    variants: ['GPS Speed', 'GPS_Speed'],
                    description: 'GPS Speed',
                    icon: 'fa-satellite',
                    category: 'Position'
                },
                
                // Lap Info
                lapTime: {
                    variants: ['Lap Time', 'LapTime', 'Running Lap Time'],
                    description: 'Lap timing',
                    icon: 'fa-stopwatch',
                    category: 'Lap Info'
                },
                lapNumber: {
                    variants: ['Lap Number', 'Lap', 'Lap Count', 'Lap Num'],
                    description: 'Current lap number',
                    icon: 'fa-hashtag',
                    category: 'Lap Info'
                },
                sector: {
                    variants: ['Sector', 'Current Sector', 'Track Sector'],
                    description: 'Current sector',
                    icon: 'fa-map-signs',
                    category: 'Lap Info'
                }
            }
        };
        
        var detected = {
            required: {},
            optional: {},
            missing: [],
            unrecognized: [],
            capabilities: [],
            totalColumns: columns.length
        };
        
        var matchedColumns = new Set();
        
        // Check required channels
        Object.keys(channelDefinitions.required).forEach(function(key) {
            var def = channelDefinitions.required[key];
            var found = columns.find(function(col) {
                return def.variants.some(function(variant) {
                    return col.toLowerCase() === variant.toLowerCase();
                });
            });
            if (found) {
                detected.required[key] = {
                    csvColumn: found,
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
        });
        
        // Check optional channels
        Object.keys(channelDefinitions.optional).forEach(function(key) {
            var def = channelDefinitions.optional[key];
            var found = columns.find(function(col) {
                return def.variants.some(function(variant) {
                    return col.toLowerCase() === variant.toLowerCase();
                });
            });
            if (found) {
                detected.optional[key] = {
                    csvColumn: found,
                    description: def.description,
                    icon: def.icon,
                    category: def.category
                };
                matchedColumns.add(found);
            }
        });
        
        // Find unrecognized columns
        columns.forEach(function(col) {
            if (!matchedColumns.has(col)) {
                detected.unrecognized.push(col);
            }
        });
        
        // Determine capabilities
        if (Object.keys(detected.required).length === 3) {
            detected.capabilities.push({
                name: 'Basic Lap Analysis',
                description: 'Speed traces, sector times, lap comparison',
                icon: 'fa-chart-line',
                color: 'green'
            });
        }
        
        if (detected.optional.throttle && detected.optional.brake) {
            detected.capabilities.push({
                name: 'Driver Input Analysis',
                description: 'Throttle/brake traces, pedal overlap detection',
                icon: 'fa-shoe-prints',
                color: 'blue'
            });
        }
        
        // G-Force Analysis - check for any G-force channels
        var hasBasicGForce = detected.optional.gLat && detected.optional.gLong;
        var hasDetailedGForce = (detected.optional.gLatFront || detected.optional.gLatMid || detected.optional.gLatRear) &&
                                (detected.optional.gLongFront || detected.optional.gLongMid || detected.optional.gLongRear);
        
        if (hasBasicGForce || hasDetailedGForce) {
            var gForceDesc = hasDetailedGForce ? 
                'Multi-position G analysis (front/mid/rear), traction circle' : 
                'Traction circle, grip utilization';
            detected.capabilities.push({
                name: hasDetailedGForce ? 'Advanced G-Force Analysis' : 'G-Force Analysis',
                description: gForceDesc,
                icon: 'fa-circle-notch',
                color: 'purple'
            });
        }
        
        if (detected.optional.wheelSpeedFL && detected.optional.wheelSpeedFR) {
            detected.capabilities.push({
                name: 'Wheel Speed Analysis',
                description: 'Speed differential, cornering behavior',
                icon: 'fa-circle',
                color: 'orange'
            });
        }
        
        // Wheel Slip Analysis
        var hasWheelSlip = detected.optional.wheelSlipFL || detected.optional.wheelSlipFR || 
                          detected.optional.wheelSlipRL || detected.optional.wheelSlipRR;
        var hasSlipAngle = detected.optional.slipAngleFL || detected.optional.slipAngleFR ||
                          detected.optional.slipAngleRL || detected.optional.slipAngleRR;
        
        if (hasWheelSlip || hasSlipAngle) {
            var slipDesc = hasSlipAngle ? 
                'Slip ratio and slip angle analysis, tire grip limit detection' :
                'Slip ratio analysis, traction loss detection';
            detected.capabilities.push({
                name: 'Wheel Slip Analysis',
                description: slipDesc,
                icon: 'fa-wave-square',
                color: 'pink'
            });
        }
        
        if (detected.optional.suspFL || detected.optional.suspFR) {
            var hasFourCorner = detected.optional.suspFL && detected.optional.suspFR && 
                               detected.optional.suspRL && detected.optional.suspRR;
            detected.capabilities.push({
                name: hasFourCorner ? 'Full Suspension Analysis' : 'Suspension Analysis',
                description: hasFourCorner ? 'Four-corner damper analysis, weight transfer' : 'Damper travel, weight transfer',
                icon: 'fa-car',
                color: 'cyan'
            });
        }
        
        // Tire Temperature Analysis - check for detailed temps
        var hasFLTireTemps = detected.optional.tyreTempFLCenter || detected.optional.tyreTempFLInner || detected.optional.tyreTempFLOuter;
        var hasFRTireTemps = detected.optional.tyreTempFRCenter || detected.optional.tyreTempFRInner || detected.optional.tyreTempFROuter;
        var hasRLTireTemps = detected.optional.tyreTempRLCenter || detected.optional.tyreTempRLInner || detected.optional.tyreTempRLOuter;
        var hasRRTireTemps = detected.optional.tyreTempRRCenter || detected.optional.tyreTempRRInner || detected.optional.tyreTempRROuter;
        var hasAnyTireTemps = hasFLTireTemps || hasFRTireTemps || hasRLTireTemps || hasRRTireTemps;
        
        var hasDetailedTireTemps = (detected.optional.tyreTempFLInner && detected.optional.tyreTempFLOuter) ||
                                   (detected.optional.tyreTempFRInner && detected.optional.tyreTempFROuter);
        
        if (hasAnyTireTemps) {
            var tireDesc = hasDetailedTireTemps ?
                'Inner/center/outer tire temp analysis, camber optimization' :
                'Tire temperature monitoring, thermal degradation';
            detected.capabilities.push({
                name: hasDetailedTireTemps ? 'Advanced Tire Thermal Analysis' : 'Tire Thermal Analysis',
                description: tireDesc,
                icon: 'fa-thermometer-half',
                color: 'red'
            });
        }
        
        // Brake Temperature Analysis (front only)
        if (detected.optional.brakeTempFL || detected.optional.brakeTempFR) {
            detected.capabilities.push({
                name: 'Brake Thermal Analysis',
                description: 'Front brake temperature monitoring',
                icon: 'fa-fire',
                color: 'amber'
            });
        }
        
        if (detected.optional.steer) {
            detected.capabilities.push({
                name: 'Steering Analysis',
                description: 'Input smoothness, corrections',
                icon: 'fa-dharmachakra',
                color: 'indigo'
            });
        }
        
        if (detected.optional.rpm && detected.optional.gear) {
            detected.capabilities.push({
                name: 'Powertrain Analysis',
                description: 'Shift points, gear usage',
                icon: 'fa-cogs',
                color: 'yellow'
            });
        }
        
        if (detected.optional.gpsLat && detected.optional.gpsLon) {
            detected.capabilities.push({
                name: 'GPS Track Mapping',
                description: 'Accurate track position from GPS',
                icon: 'fa-map-marked-alt',
                color: 'teal'
            });
        }
        
        // Vehicle Dynamics (yaw, pitch, roll)
        if (detected.optional.yaw && (detected.optional.pitch || detected.optional.roll)) {
            detected.capabilities.push({
                name: 'Vehicle Dynamics Analysis',
                description: 'Yaw/pitch/roll rates, vehicle attitude',
                icon: 'fa-sync',
                color: 'gray'
            });
        }
        
        this.detectedChannels = detected;
        this.displayChannelInfo(detected);
    }

    displayChannelInfo(detected) {
        var self = this;
        var existingDisplay = document.getElementById('channel-detection-display');
        if (existingDisplay) existingDisplay.remove();
        
        // Remove existing modal if any
        var existingModal = document.getElementById('channel-mapping-modal');
        if (existingModal) existingModal.remove();
        
        var requiredCount = Object.keys(detected.required).length;
        var optionalCount = Object.keys(detected.optional).length;
        var totalMatched = requiredCount + optionalCount;
        
        var displayContainer = document.createElement('div');
        displayContainer.id = 'channel-detection-display';
        displayContainer.className = 'mt-6 border rounded-lg overflow-hidden';
        
        // Header
        var statusColor = requiredCount === 3 ? 'green' : 'yellow';
        var statusText = requiredCount === 3 ? 'Ready for analysis' : 'Missing required channels';
        
        var html = '<div class="bg-' + statusColor + '-50 p-4 border-b">';
        html += '<div class="flex items-center justify-between">';
        html += '<div>';
        html += '<h3 class="font-bold text-lg flex items-center">';
        html += '<i class="fas fa-search text-' + statusColor + '-500 mr-2"></i>';
        html += 'Channel Detection Results</h3>';
        html += '<p class="text-sm text-gray-600">' + detected.totalColumns + ' columns found - ' + totalMatched + ' channels mapped</p>';
        html += '</div>';
        html += '<button id="toggle-channel-details" class="text-sm bg-white px-3 py-1 rounded border hover:bg-gray-50">';
        html += '<i class="fas fa-chevron-down mr-1"></i>Details</button>';
        html += '</div></div>';
        
        // Capabilities
        if (detected.capabilities.length > 0) {
            html += '<div class="p-4 bg-white border-b">';
            html += '<h4 class="font-semibold text-gray-700 mb-2"><i class="fas fa-bolt text-yellow-500 mr-2"></i>Analysis Capabilities Unlocked</h4>';
            html += '<div class="flex flex-wrap gap-2">';
            detected.capabilities.forEach(function(cap) {
                html += '<span class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-' + cap.color + '-100 text-' + cap.color + '-800">';
                html += '<i class="fas ' + cap.icon + ' mr-1"></i>' + cap.name + '</span>';
            });
            html += '</div></div>';
        }
        
        // Required channels
        html += '<div class="p-4 border-b" id="required-channels-section">';
        html += '<h4 class="font-semibold text-gray-700 mb-2"><i class="fas fa-star text-yellow-500 mr-2"></i>Required Channels (' + requiredCount + '/3)</h4>';
        html += '<div class="grid md:grid-cols-3 gap-2">';
        
        ['time', 'distance', 'speed'].forEach(function(key) {
            if (detected.required[key]) {
                var ch = detected.required[key];
                html += '<div class="bg-green-50 border border-green-200 rounded p-2">';
                html += '<div class="flex items-center justify-between">';
                html += '<span class="font-medium text-green-800"><i class="fas ' + ch.icon + ' mr-1"></i>' + key + '</span>';
                html += '<i class="fas fa-check-circle text-green-500"></i></div>';
                html += '<code class="text-xs text-gray-500">' + ch.csvColumn + '</code></div>';
            } else {
                html += '<div class="bg-red-50 border border-red-200 rounded p-2">';
                html += '<div class="flex items-center justify-between">';
                html += '<span class="font-medium text-red-800">' + key + '</span>';
                html += '<i class="fas fa-times-circle text-red-500"></i></div>';
                html += '<span class="text-xs text-red-500">Missing</span></div>';
            }
        });
        html += '</div></div>';
        
        // Optional channels by category
        html += '<div class="p-4 border-b" id="optional-channels-section" style="display:none;">';
        html += '<h4 class="font-semibold text-gray-700 mb-2"><i class="fas fa-plus-circle text-blue-500 mr-2"></i>Optional Channels (' + optionalCount + ' found)</h4>';
        
        var categories = {};
        Object.keys(detected.optional).forEach(function(key) {
            var ch = detected.optional[key];
            if (!categories[ch.category]) categories[ch.category] = [];
            categories[ch.category].push({ key: key, data: ch });
        });
        
        Object.keys(categories).forEach(function(cat) {
            html += '<div class="mb-3"><h5 class="text-sm font-medium text-gray-600 mb-1">' + cat + '</h5>';
            html += '<div class="flex flex-wrap gap-1">';
            categories[cat].forEach(function(item) {
                html += '<span class="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">';
                html += '<i class="fas ' + item.data.icon + ' mr-1"></i>' + item.key + '</span>';
            });
            html += '</div></div>';
        });
        html += '</div>';
        
        // Unrecognized columns with expand all and manual mapping
        if (detected.unrecognized.length > 0) {
            html += '<div class="p-4 bg-gray-50" id="unrecognized-section" style="display:none;">';
            html += '<div class="flex items-center justify-between mb-3">';
            html += '<h4 class="font-semibold text-gray-600"><i class="fas fa-question-circle text-gray-400 mr-2"></i>Unrecognized Columns (' + detected.unrecognized.length + ')</h4>';
            html += '<button id="expand-all-columns" class="text-sm bg-white px-3 py-1 rounded border hover:bg-gray-100">';
            html += '<i class="fas fa-expand-alt mr-1"></i>Show All</button>';
            html += '</div>';
            html += '<p class="text-xs text-blue-600 mb-3"><i class="fas fa-info-circle mr-1"></i>Click on any column to manually assign it to a telemetry channel</p>';
            html += '<div id="unrecognized-columns-list" class="flex flex-wrap gap-1">';
            
            detected.unrecognized.forEach(function(col, index) {
                var hiddenClass = index >= 20 ? ' hidden-column' : '';
                var displayStyle = index >= 20 ? ' style="display:none;"' : '';
                html += '<button class="unrecognized-col-btn' + hiddenClass + ' bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded hover:bg-blue-200 hover:text-blue-800 cursor-pointer transition"';
                html += ' data-column="' + self.escapeHtml(col) + '"' + displayStyle + '>' + self.escapeHtml(col) + '</button>';
            });
            
            html += '</div>';
            if (detected.unrecognized.length > 20) {
                html += '<p id="columns-count-text" class="text-gray-500 text-xs mt-2">Showing 20 of ' + detected.unrecognized.length + ' columns</p>';
            }
            html += '</div>';
        }
        
        // Custom mappings section
        html += '<div class="p-4 bg-blue-50 border-t" id="custom-mappings-section" style="display:none;">';
        html += '<h4 class="font-semibold text-gray-700 mb-2"><i class="fas fa-link text-blue-500 mr-2"></i>Custom Channel Mappings</h4>';
        html += '<div id="custom-mappings-list" class="space-y-1"></div>';
        html += '<button id="reanalyze-btn" class="mt-3 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition">';
        html += '<i class="fas fa-sync-alt mr-2"></i>Re-Analyze with Custom Mappings</button>';
        html += '</div>';
        
        displayContainer.innerHTML = html;
        
        var uploadSection = document.querySelector('#upload-section .bg-white');
        uploadSection.appendChild(displayContainer);
        
        // Create mapping modal
        this.createMappingModal();
        
        // Setup event listeners
        this.setupChannelMappingEvents(detected);
    }

    escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    createMappingModal() {
        var modal = document.createElement('div');
        modal.id = 'channel-mapping-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50';
        
        var channelOptions = [
            { category: 'Required', channels: [
                { key: 'time', name: 'Time', icon: 'fa-clock' },
                { key: 'distance', name: 'Lap Distance', icon: 'fa-road' },
                { key: 'speed', name: 'Speed', icon: 'fa-tachometer-alt' }
            ]},
            { category: 'Driver Inputs', channels: [
                { key: 'throttle', name: 'Throttle Position', icon: 'fa-gas-pump' },
                { key: 'brake', name: 'Brake Pressure', icon: 'fa-hand-paper' },
                { key: 'gear', name: 'Gear', icon: 'fa-cog' },
                { key: 'steer', name: 'Steering Angle', icon: 'fa-dharmachakra' }
            ]},
            { category: 'Engine', channels: [
                { key: 'rpm', name: 'Engine RPM', icon: 'fa-tachometer-alt' },
                { key: 'engineTemp', name: 'Engine Temperature', icon: 'fa-thermometer-full' },
                { key: 'oilTemp', name: 'Oil Temperature', icon: 'fa-oil-can' },
                { key: 'fuelLevel', name: 'Fuel Level', icon: 'fa-gas-pump' }
            ]},
            { category: 'G-Forces (Combined)', channels: [
                { key: 'gLat', name: 'Lateral G (Combined)', icon: 'fa-arrows-alt-h' },
                { key: 'gLong', name: 'Longitudinal G (Combined)', icon: 'fa-arrows-alt-v' },
                { key: 'gVert', name: 'Vertical G', icon: 'fa-arrows-alt-v' }
            ]},
            { category: 'G-Forces (Front)', channels: [
                { key: 'gLatFront', name: 'Lateral G - Front', icon: 'fa-arrows-alt-h' },
                { key: 'gLongFront', name: 'Longitudinal G - Front', icon: 'fa-arrows-alt-v' }
            ]},
            { category: 'G-Forces (Mid/Center)', channels: [
                { key: 'gLatMid', name: 'Lateral G - Mid', icon: 'fa-arrows-alt-h' },
                { key: 'gLongMid', name: 'Longitudinal G - Mid', icon: 'fa-arrows-alt-v' }
            ]},
            { category: 'G-Forces (Rear)', channels: [
                { key: 'gLatRear', name: 'Lateral G - Rear', icon: 'fa-arrows-alt-h' },
                { key: 'gLongRear', name: 'Longitudinal G - Rear', icon: 'fa-arrows-alt-v' }
            ]},
            { category: 'Vehicle Dynamics', channels: [
                { key: 'yaw', name: 'Yaw Rate', icon: 'fa-sync' },
                { key: 'pitch', name: 'Pitch Rate', icon: 'fa-sync' },
                { key: 'roll', name: 'Roll Rate', icon: 'fa-sync' }
            ]},
            { category: 'Wheel Speeds', channels: [
                { key: 'wheelSpeedFL', name: 'Wheel Speed FL', icon: 'fa-circle' },
                { key: 'wheelSpeedFR', name: 'Wheel Speed FR', icon: 'fa-circle' },
                { key: 'wheelSpeedRL', name: 'Wheel Speed RL', icon: 'fa-circle' },
                { key: 'wheelSpeedRR', name: 'Wheel Speed RR', icon: 'fa-circle' }
            ]},
            { category: 'Wheel Slip Ratio', channels: [
                { key: 'wheelSlipFL', name: 'Slip Ratio FL', icon: 'fa-wave-square' },
                { key: 'wheelSlipFR', name: 'Slip Ratio FR', icon: 'fa-wave-square' },
                { key: 'wheelSlipRL', name: 'Slip Ratio RL', icon: 'fa-wave-square' },
                { key: 'wheelSlipRR', name: 'Slip Ratio RR', icon: 'fa-wave-square' }
            ]},
            { category: 'Slip Angles', channels: [
                { key: 'slipAngleFL', name: 'Slip Angle FL', icon: 'fa-angle-double-right' },
                { key: 'slipAngleFR', name: 'Slip Angle FR', icon: 'fa-angle-double-right' },
                { key: 'slipAngleRL', name: 'Slip Angle RL', icon: 'fa-angle-double-right' },
                { key: 'slipAngleRR', name: 'Slip Angle RR', icon: 'fa-angle-double-right' }
            ]},
            { category: 'Suspension', channels: [
                { key: 'suspFL', name: 'Suspension FL', icon: 'fa-arrows-alt-v' },
                { key: 'suspFR', name: 'Suspension FR', icon: 'fa-arrows-alt-v' },
                { key: 'suspRL', name: 'Suspension RL', icon: 'fa-arrows-alt-v' },
                { key: 'suspRR', name: 'Suspension RR', icon: 'fa-arrows-alt-v' },
                { key: 'rideHeightFront', name: 'Ride Height Front', icon: 'fa-ruler-vertical' },
                { key: 'rideHeightRear', name: 'Ride Height Rear', icon: 'fa-ruler-vertical' }
            ]},
            { category: 'Tire Temps FL', channels: [
                { key: 'tyreTempFLCenter', name: 'FL Center', icon: 'fa-thermometer-half' },
                { key: 'tyreTempFLInner', name: 'FL Inner', icon: 'fa-thermometer-half' },
                { key: 'tyreTempFLOuter', name: 'FL Outer', icon: 'fa-thermometer-half' }
            ]},
            { category: 'Tire Temps FR', channels: [
                { key: 'tyreTempFRCenter', name: 'FR Center', icon: 'fa-thermometer-half' },
                { key: 'tyreTempFRInner', name: 'FR Inner', icon: 'fa-thermometer-half' },
                { key: 'tyreTempFROuter', name: 'FR Outer', icon: 'fa-thermometer-half' }
            ]},
            { category: 'Tire Temps RL', channels: [
                { key: 'tyreTempRLCenter', name: 'RL Center', icon: 'fa-thermometer-half' },
                { key: 'tyreTempRLInner', name: 'RL Inner', icon: 'fa-thermometer-half' },
                { key: 'tyreTempRLOuter', name: 'RL Outer', icon: 'fa-thermometer-half' }
            ]},
            { category: 'Tire Temps RR', channels: [
                { key: 'tyreTempRRCenter', name: 'RR Center', icon: 'fa-thermometer-half' },
                { key: 'tyreTempRRInner', name: 'RR Inner', icon: 'fa-thermometer-half' },
                { key: 'tyreTempRROuter', name: 'RR Outer', icon: 'fa-thermometer-half' }
            ]},
            { category: 'Brake Temps', channels: [
                { key: 'brakeTempFL', name: 'Brake Temp FL', icon: 'fa-fire' },
                { key: 'brakeTempFR', name: 'Brake Temp FR', icon: 'fa-fire' },
                { key: 'brakeTempRL', name: 'Brake Temp RL', icon: 'fa-fire' },
                { key: 'brakeTempRR', name: 'Brake Temp RR', icon: 'fa-fire' }
            ]},
            { category: 'Position', channels: [
                { key: 'gpsLat', name: 'GPS Latitude', icon: 'fa-map-marker-alt' },
                { key: 'gpsLon', name: 'GPS Longitude', icon: 'fa-map-marker-alt' },
                { key: 'gpsAltitude', name: 'GPS Altitude', icon: 'fa-mountain' },
                { key: 'gpsSpeed', name: 'GPS Speed', icon: 'fa-satellite' }
            ]},
            { category: 'Lap Info', channels: [
                { key: 'lapTime', name: 'Lap Time', icon: 'fa-stopwatch' },
                { key: 'lapNumber', name: 'Lap Number', icon: 'fa-hashtag' },
                { key: 'sector', name: 'Sector', icon: 'fa-map-signs' }
            ]}
        ];
        
        var modalHtml = '<div class="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-screen overflow-y-auto">';
        modalHtml += '<div class="flex items-center justify-between mb-4 sticky top-0 bg-white pb-2 border-b">';
        modalHtml += '<h3 class="text-lg font-bold"><i class="fas fa-link text-blue-500 mr-2"></i>Map Column to Channel</h3>';
        modalHtml += '<button id="close-mapping-modal" class="text-gray-500 hover:text-gray-700 text-xl"><i class="fas fa-times"></i></button>';
        modalHtml += '</div>';
        modalHtml += '<div class="mb-4 p-3 bg-blue-50 rounded">';
        modalHtml += '<p class="text-sm text-gray-600">CSV Column:</p>';
        modalHtml += '<p id="mapping-column-name" class="font-bold text-blue-700 text-lg"></p>';
        modalHtml += '</div>';
        modalHtml += '<p class="text-sm text-gray-500 mb-4">Select the telemetry channel this column represents:</p>';
        
        channelOptions.forEach(function(group) {
            modalHtml += '<div class="mb-4">';
            modalHtml += '<h4 class="text-sm font-semibold text-gray-600 mb-2">' + group.category + '</h4>';
            modalHtml += '<div class="grid grid-cols-2 gap-2">';
            group.channels.forEach(function(ch) {
                modalHtml += '<button class="channel-option-btn text-left p-2 border rounded hover:bg-blue-50 hover:border-blue-300 transition text-sm" data-channel="' + ch.key + '">';
                modalHtml += '<i class="fas ' + ch.icon + ' text-gray-400 mr-2"></i>' + ch.name + '</button>';
            });
            modalHtml += '</div></div>';
        });
        
        modalHtml += '<div class="mt-4 pt-4 border-t">';
        modalHtml += '<button id="remove-mapping-btn" class="w-full p-2 border border-red-300 text-red-600 rounded hover:bg-red-50 transition text-sm">';
        modalHtml += '<i class="fas fa-trash mr-2"></i>Remove This Mapping</button>';
        modalHtml += '</div></div>';
        
        modal.innerHTML = modalHtml;
        document.body.appendChild(modal);
    }

    setupChannelMappingEvents(detected) {
        var self = this;
        
        // Initialize custom mappings storage
        if (!this.customMappings) {
            this.customMappings = {};
        }
        
        // Toggle details button
        var toggleBtn = document.getElementById('toggle-channel-details');
        var optionalSection = document.getElementById('optional-channels-section');
        var unrecognizedSection = document.getElementById('unrecognized-section');
        var isExpanded = false;
        
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function() {
                isExpanded = !isExpanded;
                if (optionalSection) optionalSection.style.display = isExpanded ? 'block' : 'none';
                if (unrecognizedSection) unrecognizedSection.style.display = isExpanded ? 'block' : 'none';
                toggleBtn.innerHTML = isExpanded ? 
                    '<i class="fas fa-chevron-up mr-1"></i>Hide' : 
                    '<i class="fas fa-chevron-down mr-1"></i>Details';
            });
        }
        
        // Expand all columns button
        var expandBtn = document.getElementById('expand-all-columns');
        var isAllExpanded = false;
        
        if (expandBtn) {
            expandBtn.addEventListener('click', function() {
                isAllExpanded = !isAllExpanded;
                var hiddenCols = document.querySelectorAll('.hidden-column');
                hiddenCols.forEach(function(col) {
                    col.style.display = isAllExpanded ? 'inline-block' : 'none';
                });
                var countText = document.getElementById('columns-count-text');
                if (countText) {
                    countText.textContent = isAllExpanded ? 
                        'Showing all ' + detected.unrecognized.length + ' columns' :
                        'Showing 20 of ' + detected.unrecognized.length + ' columns';
                }
                expandBtn.innerHTML = isAllExpanded ?
                    '<i class="fas fa-compress-alt mr-1"></i>Show Less' :
                    '<i class="fas fa-expand-alt mr-1"></i>Show All';
            });
        }
        
        // Click on unrecognized column to map it
        var colButtons = document.querySelectorAll('.unrecognized-col-btn');
        colButtons.forEach(function(btn) {
            btn.addEventListener('click', function() {
                var columnName = this.getAttribute('data-column');
                self.openMappingModal(columnName);
            });
        });
        
        // Modal close button
        var closeBtn = document.getElementById('close-mapping-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                self.closeMappingModal();
            });
        }
        
        // Modal background click to close
        var modal = document.getElementById('channel-mapping-modal');
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    self.closeMappingModal();
                }
            });
        }
        
        // Channel option buttons
        var channelBtns = document.querySelectorAll('.channel-option-btn');
        channelBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                var channelKey = this.getAttribute('data-channel');
                var columnName = document.getElementById('mapping-column-name').textContent;
                
                // Check if this channel is already mapped to a different column
                var existingColumnForChannel = null;
                Object.keys(self.customMappings).forEach(function(col) {
                    if (self.customMappings[col] === channelKey && col !== columnName) {
                        existingColumnForChannel = col;
                    }
                });
                
                // Also check auto-detected channels
                var isAutoDetected = false;
                var autoDetectedColumn = null;
                if (self.detectedChannels) {
                    var checkDetected = function(channels) {
                        Object.keys(channels || {}).forEach(function(key) {
                            if (key === channelKey && channels[key].csvColumn) {
                                isAutoDetected = true;
                                autoDetectedColumn = channels[key].csvColumn;
                            }
                        });
                    };
                    checkDetected(self.detectedChannels.required);
                    checkDetected(self.detectedChannels.optional);
                }
                
                if (existingColumnForChannel) {
                    // Show confirmation dialog for overwriting custom mapping
                    var confirmMsg = 'Warning: "' + channelKey + '" is already mapped to "' + existingColumnForChannel + '".\n\n';
                    confirmMsg += 'Do you want to replace it with "' + columnName + '"?';
                    
                    if (confirm(confirmMsg)) {
                        // Remove the old mapping
                        delete self.customMappings[existingColumnForChannel];
                        
                        // Reset the old column button style
                        var oldColBtn = document.querySelector('.unrecognized-col-btn[data-column="' + existingColumnForChannel.replace(/"/g, '\\"') + '"]');
                        if (oldColBtn) {
                            oldColBtn.classList.remove('bg-green-200', 'text-green-800');
                            oldColBtn.classList.add('bg-gray-200', 'text-gray-700');
                        }
                        
                        // Add the new mapping
                        self.addCustomMapping(columnName, channelKey);
                        self.closeMappingModal();
                    }
                } else if (isAutoDetected) {
                    // Show warning for overriding auto-detected mapping
                    var confirmMsg = 'Note: "' + channelKey + '" was auto-detected from "' + autoDetectedColumn + '".\n\n';
                    confirmMsg += 'Your custom mapping will take priority. Continue?';
                    
                    if (confirm(confirmMsg)) {
                        self.addCustomMapping(columnName, channelKey);
                        self.closeMappingModal();
                    }
                } else {
                    // No conflict, just add the mapping
                    self.addCustomMapping(columnName, channelKey);
                    self.closeMappingModal();
                }
            });
        });
        
        // Remove mapping button
        var removeBtn = document.getElementById('remove-mapping-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', function() {
                var columnName = document.getElementById('mapping-column-name').textContent;
                self.removeCustomMapping(columnName);
                self.closeMappingModal();
            });
        }
        
        // Re-analyze button
        var reanalyzeBtn = document.getElementById('reanalyze-btn');
        if (reanalyzeBtn) {
            reanalyzeBtn.addEventListener('click', function() {
                self.reanalyzeWithMappings();
            });
        }
    }

    openMappingModal(columnName) {
        var self = this;
        var modal = document.getElementById('channel-mapping-modal');
        var columnNameEl = document.getElementById('mapping-column-name');
        
        if (modal && columnNameEl) {
            columnNameEl.textContent = columnName;
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            
            // Build a reverse map: channelKey -> columnName (for channels that already have mappings)
            var channelToColumn = {};
            Object.keys(this.customMappings).forEach(function(col) {
                var ch = self.customMappings[col];
                channelToColumn[ch] = col;
            });
            
            // Also check detected channels (auto-mapped)
            if (this.detectedChannels) {
                Object.keys(this.detectedChannels.required || {}).forEach(function(key) {
                    var ch = self.detectedChannels.required[key];
                    if (ch && ch.csvColumn) {
                        channelToColumn[key] = ch.csvColumn + ' (auto-detected)';
                    }
                });
                Object.keys(this.detectedChannels.optional || {}).forEach(function(key) {
                    var ch = self.detectedChannels.optional[key];
                    if (ch && ch.csvColumn) {
                        channelToColumn[key] = ch.csvColumn + ' (auto-detected)';
                    }
                });
            }
            
            // Highlight buttons based on mapping status
            var existingMapping = this.customMappings[columnName];
            var channelBtns = document.querySelectorAll('.channel-option-btn');
            
            channelBtns.forEach(function(btn) {
                var channelKey = btn.getAttribute('data-channel');
                var mappedColumn = channelToColumn[channelKey];
                
                // Reset classes
                btn.classList.remove('bg-green-100', 'border-green-500', 'bg-yellow-100', 'border-yellow-500', 'bg-gray-100');
                
                // Remove old indicator if exists
                var oldIndicator = btn.querySelector('.mapping-indicator');
                if (oldIndicator) oldIndicator.remove();
                
                if (existingMapping && channelKey === existingMapping) {
                    // This is the current mapping for this column
                    btn.classList.add('bg-green-100', 'border-green-500');
                    var indicator = document.createElement('span');
                    indicator.className = 'mapping-indicator ml-1 text-xs text-green-600';
                    indicator.innerHTML = '<i class="fas fa-check"></i> Current';
                    btn.appendChild(indicator);
                } else if (mappedColumn) {
                    // This channel is already mapped to another column
                    btn.classList.add('bg-yellow-100', 'border-yellow-500');
                    var indicator = document.createElement('span');
                    indicator.className = 'mapping-indicator block text-xs text-yellow-700 mt-1 truncate';
                    indicator.style.maxWidth = '120px';
                    indicator.innerHTML = '<i class="fas fa-exclamation-triangle"></i> ' + self.escapeHtml(mappedColumn);
                    indicator.title = 'Currently mapped to: ' + mappedColumn;
                    btn.appendChild(indicator);
                }
            });
        }
    }

    closeMappingModal() {
        var modal = document.getElementById('channel-mapping-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    }

    addCustomMapping(columnName, channelKey) {
        this.customMappings[columnName] = channelKey;
        this.updateCustomMappingsDisplay();
        this.showNotification('Mapped "' + columnName + '" to ' + channelKey, 'success');
        
        // Update the button style for the mapped column
        var colBtn = document.querySelector('.unrecognized-col-btn[data-column="' + columnName.replace(/"/g, '\\"') + '"]');
        if (colBtn) {
            colBtn.classList.remove('bg-gray-200', 'text-gray-700');
            colBtn.classList.add('bg-green-200', 'text-green-800');
        }
    }

    removeCustomMapping(columnName) {
        if (this.customMappings[columnName]) {
            delete this.customMappings[columnName];
            this.updateCustomMappingsDisplay();
            this.showNotification('Removed mapping for "' + columnName + '"', 'info');
            
            // Reset the button style
            var colBtn = document.querySelector('.unrecognized-col-btn[data-column="' + columnName.replace(/"/g, '\\"') + '"]');
            if (colBtn) {
                colBtn.classList.remove('bg-green-200', 'text-green-800');
                colBtn.classList.add('bg-gray-200', 'text-gray-700');
            }
        }
    }

    updateCustomMappingsDisplay() {
        var mappingsSection = document.getElementById('custom-mappings-section');
        var mappingsList = document.getElementById('custom-mappings-list');
        
        var mappingKeys = Object.keys(this.customMappings);
        
        if (mappingKeys.length > 0) {
            mappingsSection.style.display = 'block';
            
            var html = '';
            var self = this;
            mappingKeys.forEach(function(col) {
                var channel = self.customMappings[col];
                html += '<div class="flex items-center justify-between bg-white p-2 rounded border">';
                html += '<div>';
                html += '<code class="text-sm text-gray-600">' + self.escapeHtml(col) + '</code>';
                html += '<span class="text-gray-400 mx-2"><i class="fas fa-arrow-right"></i></span>';
                html += '<span class="text-blue-600 font-medium">' + channel + '</span>';
                html += '</div>';
                html += '<button class="remove-single-mapping text-red-500 hover:text-red-700" data-column="' + self.escapeHtml(col) + '">';
                html += '<i class="fas fa-times"></i></button>';
                html += '</div>';
            });
            
            mappingsList.innerHTML = html;
            
            // Add event listeners to remove buttons
            var removeBtns = mappingsList.querySelectorAll('.remove-single-mapping');
            removeBtns.forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var col = this.getAttribute('data-column');
                    self.removeCustomMapping(col);
                });
            });
        } else {
            mappingsSection.style.display = 'none';
        }
    }

    reanalyzeWithMappings() {
        var self = this;
        
        // Apply custom mappings to the data
        if (Object.keys(this.customMappings).length > 0) {
            console.log('Applying custom mappings:', this.customMappings);
            
            // Create column rename map
            var renameMap = {};
            Object.keys(this.customMappings).forEach(function(originalCol) {
                var targetChannel = self.customMappings[originalCol];
                // Map to the standard column name the system expects
                var standardNames = {
                    'time': 'Time',
                    'distance': 'Lap Distance', 
                    'speed': 'Ground Speed',
                    'throttle': 'Throttle Pos',
                    'brake': 'Brake Pres Front',
                    'gear': 'Gear',
                    'steer': 'Steered Angle',
                    'rpm': 'Engine RPM',
                    'gLat': 'G Force Lat',
                    'gLong': 'G Force Long',
                    'yaw': 'Gyro Yaw Velocity',
                    'gpsLat': 'GPS Latitude',
                    'gpsLon': 'GPS Longitude'
                };
                if (standardNames[targetChannel]) {
                    renameMap[originalCol] = standardNames[targetChannel];
                }
            });
            
            // Apply renames to reference data
            this.referenceData = this.referenceData.map(function(row) {
                var newRow = Object.assign({}, row);
                Object.keys(renameMap).forEach(function(oldName) {
                    if (newRow[oldName] !== undefined) {
                        newRow[renameMap[oldName]] = newRow[oldName];
                    }
                });
                return newRow;
            });
            
            // Apply renames to current data
            this.currentData = this.currentData.map(function(row) {
                var newRow = Object.assign({}, row);
                Object.keys(renameMap).forEach(function(oldName) {
                    if (newRow[oldName] !== undefined) {
                        newRow[renameMap[oldName]] = newRow[oldName];
                    }
                });
                return newRow;
            });
            
            console.log('Data columns remapped');
        }
        
        // Re-detect channels with new mappings
        this.detectChannels();
        
        // Run analysis
        this.analyzeTelemetry();
    }

    async analyzeTelemetry() {
        var self = this;
        
        if (!this.webhookUrl) {
            this.showNotification('Please configure webhook URL first', 'error');
            return;
        }

        document.getElementById('loading-overlay').classList.remove('hidden');
        document.getElementById('loading-overlay').classList.add('flex');

        try {
            var sessionId = 'session_' + Date.now();
            
            var refData = this.referenceData;
            var currData = this.currentData;
            
            var columnCount = Object.keys(refData[0] || {}).length;
            var isLargeDataset = refData.length > 1000 || columnCount > 50;
            
            if (isLargeDataset) {
                console.log('Large dataset detected: ' + refData.length + ' rows, ' + columnCount + ' columns. Optimizing...');
                
                var maxRows = 500;
                var step = Math.ceil(refData.length / maxRows);
                refData = refData.filter(function(_, index) { return index % step === 0; });
                currData = currData.filter(function(_, index) { return index % step === 0; });
                
                console.log('Optimized to: ' + refData.length + ' rows');
            }
            
            var payload = {
                reference_lap: refData,
                current_lap: currData,
                driver_name: document.getElementById('driver-name').value || 'Driver',
                track_name: document.getElementById('track-name').value || 'Track',
                session_id: sessionId,
                timestamp: new Date().toISOString()
            };

            console.log('Sending payload to:', this.webhookUrl + '/webhook/telemetry-analysis');
            console.log('Reference rows:', refData.length);
            console.log('Current rows:', currData.length);

            var response = await fetch(this.webhookUrl + '/webhook/telemetry-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                var errorText = await response.text();
                console.error('Response error:', errorText);
                throw new Error('HTTP error! status: ' + response.status);
            }

            var responseText = await response.text();
            console.log('Raw response length:', responseText.length);
            
            var results;
            try {
                results = JSON.parse(responseText);
            } catch (parseError) {
                console.error('JSON Parse Error:', parseError);
                throw new Error('Invalid JSON response from server');
            }

            this.sessionId = results.session_id || sessionId;
            this.sessionData = results.session_data || results.analysis || {};
            this.analysisResults = results.analysis || {};
            
            console.log('Session stored with ID:', this.sessionId);

            this.displayAnalysisResults(results);
            
            document.getElementById('upload-section').classList.add('hidden');
            document.getElementById('results-section').classList.remove('hidden');

            var ayrtonMessage = results.ayrton_says || results.initial_message || 
                "I have analyzed your data. What do you want to know?";
            this.addAyrtonMessage(ayrtonMessage);

        } catch (error) {
            console.error('Analysis error:', error);
            this.showNotification('Analysis failed: ' + error.message, 'error');
        } finally {
            document.getElementById('loading-overlay').classList.add('hidden');
        }
    }

    displayAnalysisResults(results) {
        var analysis = results.analysis || {};
        
        var lapDelta = analysis.timeDelta || 0;
        document.getElementById('lap-delta').textContent = 
            lapDelta > 0 ? '+' + lapDelta.toFixed(3) + 's' : lapDelta.toFixed(3) + 's';
        
        var gForceUsage = 75;
        if (analysis.avgSpeedCurr && analysis.avgSpeedRef) {
            gForceUsage = (analysis.avgSpeedCurr / analysis.avgSpeedRef * 100);
        }
        document.getElementById('g-force-usage').textContent = Math.min(gForceUsage, 100).toFixed(0) + '%';
        
        var drivingStyle = 'Analyzing';
        if (analysis.timeDelta !== undefined) {
            if (analysis.timeDelta > 2) drivingStyle = 'Conservative';
            else if (analysis.timeDelta > 1) drivingStyle = 'Cautious';
            else if (analysis.timeDelta > 0) drivingStyle = 'Close';
            else drivingStyle = 'Competitive';
        }
        document.getElementById('tire-status').textContent = drivingStyle;
        
        var problemCount = (analysis.problems && analysis.problems.length) || 0;
        document.getElementById('setup-issue').textContent = problemCount + ' Issues';

        this.generateGraphs(analysis);
        this.displaySetupRecommendations(analysis);
        this.generateFullReport(analysis);
    }

    generateGraphs(analysis) {
        this.generateTrackMap();
        this.generateTelemetryOverlays();
        this.generateSectorTimeChart(analysis);
        this.generateSpeedComparison(analysis);
        this.setupCustomOverlayControls();
    }

    generateTrackMap() {
        var self = this;
        
        if (!this.referenceData || !this.currentData) {
            document.getElementById('track-map').innerHTML = '<p class="text-gray-400 text-center py-20">No track data available</p>';
            return;
        }

        var getValue = function(row, names, defaultVal) {
            for (var i = 0; i < names.length; i++) {
                var name = names[i];
                if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
                    var val = parseFloat(row[name]);
                    if (!isNaN(val)) return val;
                }
            }
            return defaultVal !== undefined ? defaultVal : null;
        };

        var speedNames = ['Ground Speed', 'Speed', 'Drive Speed', 'speed'];
        var steerNames = ['Steered Angle', 'Steering Angle', 'Steer'];
        var gLatNames = ['G Force Lat', 'Lateral G', 'G_Lat'];
        var yawNames = ['Gyro Yaw Velocity', 'Yaw Rate', 'Yaw'];
        var latNames = ['GPS Latitude', 'Latitude', 'Lat'];
        var lonNames = ['GPS Longitude', 'Longitude', 'Lon'];

        var sampleRow = this.referenceData[0] || {};
        var hasGPS = getValue(sampleRow, latNames) !== null && getValue(sampleRow, lonNames) !== null;
        var hasSpeed = getValue(sampleRow, speedNames) !== null;

        if (!hasGPS && !hasSpeed) {
            document.getElementById('track-map').innerHTML = '<p class="text-gray-400 text-center py-20">No position or speed data available for track map</p>';
            return;
        }

        var reconstructTrack = function(data) {
            var positions = [];
            var x = 0, y = 0, heading = 0;
            var dt = 0.01;
            var sampleRate = Math.max(1, Math.floor(data.length / 500));
            
            for (var i = 0; i < data.length; i += sampleRate) {
                var row = data[i];
                var speed = getValue(row, speedNames, 100) / 3.6;
                var steer = getValue(row, steerNames, 0) * (Math.PI / 180);
                var gLat = getValue(row, gLatNames, 0);
                var yawRate = getValue(row, yawNames, 0) * (Math.PI / 180);
                
                var turnRate;
                if (Math.abs(yawRate) > 0.001) {
                    turnRate = yawRate * dt * sampleRate;
                } else if (Math.abs(gLat) > 0.05) {
                    turnRate = (gLat * 9.81 / Math.max(speed, 10)) * dt * sampleRate;
                } else {
                    turnRate = (speed * Math.tan(steer * 0.1) / 2.5) * dt * sampleRate;
                }
                
                heading += turnRate;
                var ds = speed * dt * sampleRate;
                x += ds * Math.cos(heading);
                y += ds * Math.sin(heading);
                
                positions.push({
                    x: x,
                    y: y,
                    speed: getValue(row, speedNames, 100)
                });
            }
            
            return positions;
        };

        var refTrack = reconstructTrack(this.referenceData);
        var currTrack = reconstructTrack(this.currentData);

        if (refTrack.length < 10) {
            document.getElementById('track-map').innerHTML = '<p class="text-gray-400 text-center py-20">Insufficient data for track map</p>';
            return;
        }

        var allX = refTrack.map(function(p) { return p.x; }).concat(currTrack.map(function(p) { return p.x; }));
        var allY = refTrack.map(function(p) { return p.y; }).concat(currTrack.map(function(p) { return p.y; }));
        var minX = Math.min.apply(null, allX), maxX = Math.max.apply(null, allX);
        var minY = Math.min.apply(null, allY), maxY = Math.max.apply(null, allY);
        var centerX = (minX + maxX) / 2;
        var centerY = (minY + maxY) / 2;
        var scale = Math.max(maxX - minX, maxY - minY) || 1;

        var normalize = function(track) {
            return track.map(function(p) {
                return {
                    x: (p.x - centerX) / scale,
                    y: (p.y - centerY) / scale,
                    speed: p.speed
                };
            });
        };

        var refNorm = normalize(refTrack);
        var currNorm = normalize(currTrack);

        var allSpeeds = refNorm.map(function(p) { return p.speed; }).concat(currNorm.map(function(p) { return p.speed; }));
        var minSpeed = Math.min.apply(null, allSpeeds);
        var maxSpeed = Math.max.apply(null, allSpeeds);

        var getColor = function(speed) {
            var ratio = Math.max(0, Math.min(1, (speed - minSpeed) / (maxSpeed - minSpeed || 1)));
            if (ratio < 0.5) {
                return 'rgb(255,' + Math.round(ratio * 2 * 255) + ',0)';
            } else {
                return 'rgb(' + Math.round((1 - (ratio - 0.5) * 2) * 255) + ',255,0)';
            }
        };

        var refTrace = {
            x: refNorm.map(function(p) { return p.x; }),
            y: refNorm.map(function(p) { return p.y; }),
            mode: 'lines',
            name: 'Reference',
            line: { color: 'rgba(156, 163, 175, 0.6)', width: 8 }
        };

        var currTraces = [];
        for (var i = 0; i < currNorm.length - 1; i++) {
            currTraces.push({
                x: [currNorm[i].x, currNorm[i + 1].x],
                y: [currNorm[i].y, currNorm[i + 1].y],
                mode: 'lines',
                showlegend: false,
                line: { color: getColor(currNorm[i].speed), width: 4 },
                hoverinfo: 'skip'
            });
        }

        var layout = {
            showlegend: true,
            legend: { x: 0, y: 1, bgcolor: 'rgba(0,0,0,0.5)', font: { color: '#fff' } },
            xaxis: { visible: false, scaleanchor: 'y' },
            yaxis: { visible: false },
            margin: { t: 10, b: 10, l: 10, r: 10 },
            paper_bgcolor: '#1f2937',
            plot_bgcolor: '#1f2937'
        };

        Plotly.newPlot('track-map', [refTrace].concat(currTraces), layout, { responsive: true });
    }

    // Channel definitions for overlays
    getOverlayChannels() {
        return {
            speed: {
                names: ['Ground Speed', 'Speed', 'Drive Speed', 'Vehicle Speed', 'speed'],
                label: 'Speed',
                unit: 'km/h',
                color: { ref: '#6b7280', curr: '#8b5cf6' }
            },
            throttle: {
                names: ['Throttle Pos', 'Throttle', 'TPS', 'throttle'],
                label: 'Throttle',
                unit: '%',
                color: { ref: '#6b7280', curr: '#22c55e' }
            },
            brake: {
                names: ['Brake Pres Front', 'Brake Pressure', 'Brake', 'brake'],
                label: 'Brake',
                unit: '%',
                color: { ref: '#6b7280', curr: '#ef4444' }
            },
            steering: {
                names: ['Steered Angle', 'Steering Angle', 'Steer', 'steer'],
                label: 'Steering',
                unit: 'deg',
                color: { ref: '#6b7280', curr: '#f59e0b' }
            },
            gLat: {
                names: ['G Force Lat', 'Lateral G', 'G_Lat', 'gLat'],
                label: 'Lateral G',
                unit: 'G',
                color: { ref: '#6b7280', curr: '#3b82f6' }
            },
            gLong: {
                names: ['G Force Long', 'Longitudinal G', 'G_Long', 'gLong'],
                label: 'Long G',
                unit: 'G',
                color: { ref: '#6b7280', curr: '#ec4899' }
            },
            gear: {
                names: ['Gear', 'gear', 'Gear Position'],
                label: 'Gear',
                unit: '',
                color: { ref: '#6b7280', curr: '#14b8a6' }
            },
            rpm: {
                names: ['Engine RPM', 'RPM', 'rpm'],
                label: 'RPM',
                unit: 'rpm',
                color: { ref: '#6b7280', curr: '#f97316' }
            },
            wheelSpeedFL: {
                names: ['Wheel Speed FL', 'WheelSpeed FL'],
                label: 'Wheel FL',
                unit: 'km/h',
                color: { ref: '#6b7280', curr: '#8b5cf6' }
            },
            wheelSpeedFR: {
                names: ['Wheel Speed FR', 'WheelSpeed FR'],
                label: 'Wheel FR',
                unit: 'km/h',
                color: { ref: '#6b7280', curr: '#8b5cf6' }
            },
            wheelSpeedRL: {
                names: ['Wheel Speed RL', 'WheelSpeed RL'],
                label: 'Wheel RL',
                unit: 'km/h',
                color: { ref: '#6b7280', curr: '#8b5cf6' }
            },
            wheelSpeedRR: {
                names: ['Wheel Speed RR', 'WheelSpeed RR'],
                label: 'Wheel RR',
                unit: 'km/h',
                color: { ref: '#6b7280', curr: '#8b5cf6' }
            },
            suspFL: {
                names: ['Susp Pos FL', 'Suspension FL', 'Damper FL'],
                label: 'Susp FL',
                unit: 'mm',
                color: { ref: '#6b7280', curr: '#06b6d4' }
            },
            suspFR: {
                names: ['Susp Pos FR', 'Suspension FR', 'Damper FR'],
                label: 'Susp FR',
                unit: 'mm',
                color: { ref: '#6b7280', curr: '#06b6d4' }
            }
        };
    }

    getValue(row, names, defaultVal) {
        for (var i = 0; i < names.length; i++) {
            if (row[names[i]] !== undefined && row[names[i]] !== null && row[names[i]] !== '') {
                var val = parseFloat(row[names[i]]);
                if (!isNaN(val)) return val;
            }
        }
        return defaultVal !== undefined ? defaultVal : null;
    }

    generateTelemetryOverlays() {
        var self = this;
        if (!this.referenceData || !this.currentData) return;

        var distNames = ['Lap Distance', 'Distance', 'Dist', 'LapDist'];
        var channels = this.getOverlayChannels();

        // Sample data for performance
        var sampleRate = Math.max(1, Math.floor(this.referenceData.length / 500));
        var refData = this.referenceData.filter(function(_, i) { return i % sampleRate === 0; });
        var currData = this.currentData.filter(function(_, i) { return i % sampleRate === 0; });

        // Get distance arrays
        var refDist = refData.map(function(row) { return self.getValue(row, distNames, 0); });
        var currDist = currData.map(function(row) { return self.getValue(row, distNames, 0); });

        // Generate each overlay
        this.generateSingleOverlay('speed-overlay', refData, currData, refDist, currDist, channels.speed);
        this.generateSingleOverlay('throttle-overlay', refData, currData, refDist, currDist, channels.throttle);
        this.generateSingleOverlay('brake-overlay', refData, currData, refDist, currDist, channels.brake);
        this.generateSingleOverlay('steering-overlay', refData, currData, refDist, currDist, channels.steering);
        this.generateGForceOverlay('gforce-overlay', refData, currData, refDist, currDist, channels);
        this.generateSingleOverlay('gear-overlay', refData, currData, refDist, currDist, channels.gear);
    }

    generateSingleOverlay(containerId, refData, currData, refDist, currDist, channelConfig) {
        var self = this;
        var container = document.getElementById(containerId);
        if (!container) return;

        // Check if channel data exists
        var sampleRow = refData[0] || {};
        var hasData = channelConfig.names.some(function(name) { return sampleRow[name] !== undefined; });

        if (!hasData) {
            container.innerHTML = '<p class="text-gray-400 text-center py-8 text-sm">No ' + channelConfig.label + ' data available</p>';
            return;
        }

        var refValues = refData.map(function(row) { return self.getValue(row, channelConfig.names, null); });
        var currValues = currData.map(function(row) { return self.getValue(row, channelConfig.names, null); });

        var refTrace = {
            x: refDist,
            y: refValues,
            mode: 'lines',
            name: 'Reference',
            line: { color: channelConfig.color.ref, width: 1.5 },
            hovertemplate: 'Ref: %{y:.1f} ' + channelConfig.unit + '<extra></extra>'
        };

        var currTrace = {
            x: currDist,
            y: currValues,
            mode: 'lines',
            name: 'Your Lap',
            line: { color: channelConfig.color.curr, width: 2 },
            hovertemplate: 'You: %{y:.1f} ' + channelConfig.unit + '<extra></extra>'
        };

        var layout = {
            xaxis: { title: '', showticklabels: true, tickfont: { size: 10 } },
            yaxis: { title: channelConfig.unit, titlefont: { size: 10 }, tickfont: { size: 10 } },
            margin: { t: 5, b: 25, l: 40, r: 10 },
            legend: { orientation: 'h', y: 1.1, x: 0.5, xanchor: 'center', font: { size: 9 } },
            hovermode: 'x unified'
        };

        Plotly.newPlot(containerId, [refTrace, currTrace], layout, { responsive: true, displayModeBar: false });
    }

    generateGForceOverlay(containerId, refData, currData, refDist, currDist, channels) {
        var self = this;
        var container = document.getElementById(containerId);
        if (!container) return;

        var sampleRow = refData[0] || {};
        var hasGLat = channels.gLat.names.some(function(name) { return sampleRow[name] !== undefined; });
        var hasGLong = channels.gLong.names.some(function(name) { return sampleRow[name] !== undefined; });

        if (!hasGLat && !hasGLong) {
            container.innerHTML = '<p class="text-gray-400 text-center py-8 text-sm">No G-Force data available</p>';
            return;
        }

        var traces = [];

        if (hasGLat) {
            var refGLat = refData.map(function(row) { return self.getValue(row, channels.gLat.names, null); });
            var currGLat = currData.map(function(row) { return self.getValue(row, channels.gLat.names, null); });

            traces.push({
                x: refDist,
                y: refGLat,
                mode: 'lines',
                name: 'Ref Lat G',
                line: { color: '#9ca3af', width: 1 },
                hovertemplate: 'Ref Lat: %{y:.2f}G<extra></extra>'
            });
            traces.push({
                x: currDist,
                y: currGLat,
                mode: 'lines',
                name: 'Your Lat G',
                line: { color: '#3b82f6', width: 2 },
                hovertemplate: 'Your Lat: %{y:.2f}G<extra></extra>'
            });
        }

        if (hasGLong) {
            var refGLong = refData.map(function(row) { return self.getValue(row, channels.gLong.names, null); });
            var currGLong = currData.map(function(row) { return self.getValue(row, channels.gLong.names, null); });

            traces.push({
                x: refDist,
                y: refGLong,
                mode: 'lines',
                name: 'Ref Long G',
                line: { color: '#d1d5db', width: 1, dash: 'dot' },
                hovertemplate: 'Ref Long: %{y:.2f}G<extra></extra>'
            });
            traces.push({
                x: currDist,
                y: currGLong,
                mode: 'lines',
                name: 'Your Long G',
                line: { color: '#ec4899', width: 2, dash: 'dot' },
                hovertemplate: 'Your Long: %{y:.2f}G<extra></extra>'
            });
        }

        var layout = {
            xaxis: { title: '', showticklabels: true, tickfont: { size: 10 } },
            yaxis: { title: 'G', titlefont: { size: 10 }, tickfont: { size: 10 }, zeroline: true, zerolinewidth: 1 },
            margin: { t: 5, b: 25, l: 40, r: 10 },
            legend: { orientation: 'h', y: 1.15, x: 0.5, xanchor: 'center', font: { size: 8 } },
            hovermode: 'x unified'
        };

        Plotly.newPlot(containerId, traces, layout, { responsive: true, displayModeBar: false });
    }

    setupCustomOverlayControls() {
        var self = this;
        var select = document.getElementById('custom-channel-select');
        var addBtn = document.getElementById('add-custom-overlay-btn');
        var clearBtn = document.getElementById('clear-custom-overlays-btn');

        if (!select) return;

        // Get available channels from the data
        var sampleRow = this.referenceData ? this.referenceData[0] : {};
        var allColumns = Object.keys(sampleRow);
        var channels = this.getOverlayChannels();

        // Standard channels that already have overlays
        var standardChannels = ['speed', 'throttle', 'brake', 'steering', 'gLat', 'gLong', 'gear'];
        var standardNames = [];
        standardChannels.forEach(function(ch) {
            if (channels[ch]) {
                standardNames = standardNames.concat(channels[ch].names);
            }
        });

        // Populate select with available columns not already shown
        select.innerHTML = '<option value="">-- Select Channel --</option>';
        
        // Add known optional channels first
        var optionalChannels = ['rpm', 'wheelSpeedFL', 'wheelSpeedFR', 'wheelSpeedRL', 'wheelSpeedRR', 'suspFL', 'suspFR'];
        optionalChannels.forEach(function(chKey) {
            var ch = channels[chKey];
            if (ch) {
                var hasData = ch.names.some(function(name) { return sampleRow[name] !== undefined; });
                if (hasData) {
                    var optgroup = select.querySelector('optgroup[label="Common Channels"]');
                    if (!optgroup) {
                        optgroup = document.createElement('optgroup');
                        optgroup.label = 'Common Channels';
                        select.appendChild(optgroup);
                    }
                    var option = document.createElement('option');
                    option.value = chKey;
                    option.textContent = ch.label + ' (' + ch.unit + ')';
                    optgroup.appendChild(option);
                }
            }
        });

        // Add other columns
        var otherOptgroup = document.createElement('optgroup');
        otherOptgroup.label = 'Other Columns';
        var addedCount = 0;

        allColumns.forEach(function(col) {
            // Skip standard channels and distance/time
            var isStandard = standardNames.some(function(name) { return col.toLowerCase() === name.toLowerCase(); });
            var isDistTime = ['Time', 'Lap Distance', 'Distance', 'Elapsed Time'].some(function(name) {
                return col.toLowerCase() === name.toLowerCase();
            });

            if (!isStandard && !isDistTime && addedCount < 50) {
                var option = document.createElement('option');
                option.value = 'custom:' + col;
                option.textContent = col;
                otherOptgroup.appendChild(option);
                addedCount++;
            }
        });

        if (otherOptgroup.children.length > 0) {
            select.appendChild(otherOptgroup);
        }

        // Initialize custom overlays storage
        if (!this.customOverlays) {
            this.customOverlays = [];
        }

        // Add button click handler
        if (addBtn) {
            addBtn.onclick = function() {
                var selectedValue = select.value;
                if (!selectedValue) {
                    self.showNotification('Please select a channel', 'error');
                    return;
                }

                // Check if already added
                if (self.customOverlays.indexOf(selectedValue) !== -1) {
                    self.showNotification('Channel already added', 'error');
                    return;
                }

                self.customOverlays.push(selectedValue);
                self.addCustomOverlayChart(selectedValue);
                select.value = '';
            };
        }

        // Clear button click handler
        if (clearBtn) {
            clearBtn.onclick = function() {
                self.customOverlays = [];
                var container = document.getElementById('custom-overlays-container');
                if (container) container.innerHTML = '';
            };
        }
    }

    addCustomOverlayChart(channelValue) {
        var self = this;
        var container = document.getElementById('custom-overlays-container');
        if (!container) return;

        var channels = this.getOverlayChannels();
        var distNames = ['Lap Distance', 'Distance', 'Dist', 'LapDist'];

        // Sample data
        var sampleRate = Math.max(1, Math.floor(this.referenceData.length / 500));
        var refData = this.referenceData.filter(function(_, i) { return i % sampleRate === 0; });
        var currData = this.currentData.filter(function(_, i) { return i % sampleRate === 0; });
        var refDist = refData.map(function(row) { return self.getValue(row, distNames, 0); });
        var currDist = currData.map(function(row) { return self.getValue(row, distNames, 0); });

        var chartId = 'custom-overlay-' + this.customOverlays.length;
        var chartDiv = document.createElement('div');
        chartDiv.className = 'relative';
        chartDiv.innerHTML = '<button class="absolute top-0 right-0 z-10 bg-red-500 text-white rounded-full w-6 h-6 text-xs hover:bg-red-600" onclick="this.parentElement.remove(); window.telemetryApp.customOverlays = window.telemetryApp.customOverlays.filter(function(c) { return c !== \'' + channelValue + '\'; });">&times;</button>' +
            '<h4 class="font-semibold mb-2 text-sm pr-8"></h4>' +
            '<div id="' + chartId + '" class="h-48 bg-gray-50 rounded border"></div>';
        container.appendChild(chartDiv);

        var label, unit, names, colors;

        if (channelValue.indexOf('custom:') === 0) {
            // Custom column
            var colName = channelValue.replace('custom:', '');
            label = colName;
            unit = '';
            names = [colName];
            colors = { ref: '#6b7280', curr: '#8b5cf6' };
        } else if (channels[channelValue]) {
            // Known channel
            var ch = channels[channelValue];
            label = ch.label;
            unit = ch.unit;
            names = ch.names;
            colors = ch.color;
        } else {
            return;
        }

        chartDiv.querySelector('h4').textContent = label + (unit ? ' (' + unit + ')' : '');

        // Generate chart
        var refValues = refData.map(function(row) { return self.getValue(row, names, null); });
        var currValues = currData.map(function(row) { return self.getValue(row, names, null); });

        var refTrace = {
            x: refDist,
            y: refValues,
            mode: 'lines',
            name: 'Reference',
            line: { color: colors.ref, width: 1.5 }
        };

        var currTrace = {
            x: currDist,
            y: currValues,
            mode: 'lines',
            name: 'Your Lap',
            line: { color: colors.curr, width: 2 }
        };

        var layout = {
            xaxis: { title: '', showticklabels: true, tickfont: { size: 10 } },
            yaxis: { title: unit, titlefont: { size: 10 }, tickfont: { size: 10 } },
            margin: { t: 5, b: 25, l: 45, r: 10 },
            legend: { orientation: 'h', y: 1.1, x: 0.5, xanchor: 'center', font: { size: 9 } },
            hovermode: 'x unified'
        };

        Plotly.newPlot(chartId, [refTrace, currTrace], layout, { responsive: true, displayModeBar: false });
    }

    generateSectorTimeChart(analysis) {
        var container = document.getElementById('sector-time-chart');
        if (!container) return;

        if (!analysis.sectors || analysis.sectors.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-10">No sector data available</p>';
            return;
        }

        // Calculate time deltas for each sector
        var sectorLabels = analysis.sectors.map(function(s) { return 'Sector ' + s.sector; });
        var timeDeltas = analysis.sectors.map(function(s) {
            // Use timeDelta if available, otherwise estimate from speed
            if (s.timeDelta !== undefined && s.timeDelta !== null) {
                return s.timeDelta;
            }
            // Estimate: if slower speed, positive time delta (lost time)
            // Rough estimate: 1 km/h difference over ~1km sector = ~0.1s
            var avgSpeedDelta = s.avgSpeedDelta || 0;
            return -avgSpeedDelta * 0.02; // Rough conversion
        });

        var colors = timeDeltas.map(function(t) {
            return t > 0 ? '#ef4444' : '#22c55e'; // Red if losing time, green if gaining
        });

        var trace = {
            x: sectorLabels,
            y: timeDeltas,
            type: 'bar',
            marker: { color: colors },
            text: timeDeltas.map(function(t) { 
                return (t > 0 ? '+' : '') + t.toFixed(3) + 's'; 
            }),
            textposition: 'outside',
            hovertemplate: '%{x}<br>%{text}<extra></extra>'
        };

        var layout = {
            yaxis: { 
                title: 'Time Delta (seconds)', 
                zeroline: true, 
                zerolinewidth: 2,
                zerolinecolor: '#000'
            },
            margin: { t: 30, b: 40, l: 60, r: 20 },
            annotations: [{
                x: 0.5,
                y: 1.1,
                xref: 'paper',
                yref: 'paper',
                text: 'Green = Time Gained | Red = Time Lost',
                showarrow: false,
                font: { size: 10, color: '#666' }
            }]
        };

        Plotly.newPlot('sector-time-chart', [trace], layout, { responsive: true });
    }

    generateSpeedComparison(analysis) {
        var container = document.getElementById('speed-comparison');
        if (!container) return;

        if (!analysis.avgSpeedCurr) {
            container.innerHTML = '<p class="text-gray-500 text-center py-10">No speed data available</p>';
            return;
        }

        var yourTrace = {
            x: ['Average', 'Top Speed', 'Min Corner'],
            y: [analysis.avgSpeedCurr || 0, analysis.maxSpeedCurr || 0, analysis.minSpeedCurr || 0],
            type: 'bar',
            name: 'Your Lap',
            marker: { color: '#8b5cf6' },
            text: [
                (analysis.avgSpeedCurr || 0).toFixed(1),
                (analysis.maxSpeedCurr || 0).toFixed(0),
                (analysis.minSpeedCurr || 0).toFixed(0)
            ],
            textposition: 'outside'
        };

        var refTrace = {
            x: ['Average', 'Top Speed', 'Min Corner'],
            y: [analysis.avgSpeedRef || 0, analysis.maxSpeedRef || 0, analysis.minSpeedRef || 0],
            type: 'bar',
            name: 'Reference',
            marker: { color: '#6b7280' },
            text: [
                (analysis.avgSpeedRef || 0).toFixed(1),
                (analysis.maxSpeedRef || 0).toFixed(0),
                (analysis.minSpeedRef || 0).toFixed(0)
            ],
            textposition: 'outside'
        };

        var layout = {
            barmode: 'group',
            yaxis: { title: 'Speed (km/h)' },
            margin: { t: 30, b: 40, l: 50, r: 20 },
            legend: { orientation: 'h', y: -0.15 }
        };

        Plotly.newPlot('speed-comparison', [yourTrace, refTrace], layout, { responsive: true });
    }

    displaySetupRecommendations(analysis) {
        var container = document.getElementById('setup-recommendations');
        
        var html = '<div class="bg-white rounded-lg p-4 shadow">';
        html += '<h3 class="font-bold text-lg mb-3">Analysis Summary</h3>';
        
        if (analysis.sectors && analysis.sectors.length > 0) {
            html += '<div class="space-y-2">';
            analysis.sectors.forEach(function(s) {
                var color = (s.avgSpeedDelta || 0) >= 0 ? 'green' : 'red';
                html += '<div class="border-l-4 border-' + color + '-500 pl-3 py-2">';
                html += '<p class="font-medium">Sector ' + s.sector + '</p>';
                html += '<p class="text-sm">Speed Delta: ' + (s.avgSpeedDelta || 0).toFixed(1) + ' km/h</p>';
                html += '</div>';
            });
            html += '</div>';
        } else {
            html += '<p class="text-gray-500">Sector analysis will appear after processing.</p>';
        }
        
        html += '</div>';
        container.innerHTML = html;
    }

    generateFullReport(analysis) {
        var container = document.getElementById('full-report');
        
        var timeDelta = analysis.timeDelta || 0;
        var html = '<h2 class="text-2xl font-bold mb-4">Telemetry Report</h2>';
        html += '<div class="bg-gray-50 p-4 rounded-lg mb-4">';
        html += '<p class="text-lg font-bold">Lap Time Delta: ' + (timeDelta > 0 ? '+' : '') + timeDelta.toFixed(3) + 's</p>';
        html += '<p>Average Speed: ' + (analysis.avgSpeedCurr || 0).toFixed(1) + ' km/h (Ref: ' + (analysis.avgSpeedRef || 0).toFixed(1) + ' km/h)</p>';
        html += '</div>';
        
        if (analysis.sectors && analysis.sectors.length > 0) {
            html += '<h3 class="text-xl font-bold mt-4 mb-2">Sector Analysis</h3>';
            html += '<table class="w-full border-collapse"><thead><tr class="bg-gray-100">';
            html += '<th class="border p-2">Sector</th><th class="border p-2">Speed Delta</th></tr></thead><tbody>';
            analysis.sectors.forEach(function(s) {
                html += '<tr><td class="border p-2">Sector ' + s.sector + '</td>';
                html += '<td class="border p-2">' + (s.avgSpeedDelta || 0).toFixed(1) + ' km/h</td></tr>';
            });
            html += '</tbody></table>';
        }
        
        container.innerHTML = html;
    }

    async sendChatMessage() {
        var input = document.getElementById('chat-input');
        var message = input.value.trim();
        
        if (!message) return;
        
        this.addUserMessage(message);
        input.value = '';
        
        this.showTypingIndicator();

        try {
            var response = await fetch(this.webhookUrl + '/webhook/ayrton-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: this.sessionId,
                    message: message,
                    session_data: this.sessionData,
                    context: { analysis: this.analysisResults }
                })
            });

            if (!response.ok) {
                throw new Error('HTTP error! status: ' + response.status);
            }

            var responseText = await response.text();
            var result;
            try {
                result = JSON.parse(responseText);
            } catch (e) {
                result = { ayrton_says: responseText };
            }
            
            this.hideTypingIndicator();
            
            var responseMessage = result.ayrton_says || result.response || result.message || responseText;
            this.addAyrtonMessage(responseMessage);

        } catch (error) {
            console.error('Chat error:', error);
            this.hideTypingIndicator();
            this.addAyrtonMessage('There was an error processing your message. Please try again.');
        }
    }

    addUserMessage(message) {
        var chatMessages = document.getElementById('chat-messages');
        var messageDiv = document.createElement('div');
        messageDiv.className = 'flex justify-end';
        messageDiv.innerHTML = '<div class="bg-gray-200 rounded-lg p-3 max-w-md"><p class="font-medium">You</p><p>' + message + '</p></div>';
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    addAyrtonMessage(message) {
        var chatMessages = document.getElementById('chat-messages');
        var messageDiv = document.createElement('div');
        messageDiv.className = 'flex items-start';
        
        var cleanMessage = message
            .replace(/<[^>]*>/g, '')
            .replace(/"text-[^"]*">/g, '')
            .replace(/class="[^"]*"/g, '');
        
        messageDiv.innerHTML = '<div class="bg-gradient-to-r from-purple-700 to-purple-900 text-white rounded-lg p-4 max-w-2xl shadow-lg">' +
            '<div class="flex items-center mb-2">' +
            '<div class="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center mr-3">' +
            '<span class="text-purple-900 font-bold text-lg">A</span></div>' +
            '<div><p class="font-bold text-yellow-300">Ayrton</p>' +
            '<p class="text-xs text-purple-200">Racing Coach</p></div></div>' +
            '<div class="text-white">' + cleanMessage.replace(/\n/g, '<br>') + '</div></div>';
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    showTypingIndicator() {
        var chatMessages = document.getElementById('chat-messages');
        var typingDiv = document.createElement('div');
        typingDiv.id = 'typing-indicator';
        typingDiv.className = 'flex items-start';
        typingDiv.innerHTML = '<div class="bg-purple-100 rounded-lg p-3"><p class="text-purple-600">Ayrton is thinking...</p></div>';
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    hideTypingIndicator() {
        var indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(function(tab) {
            tab.classList.remove('active');
        });
        
        var selectedTab = document.getElementById(tabName + '-tab');
        if (selectedTab) selectedTab.classList.add('active');
        
        document.querySelectorAll('.tab-btn').forEach(function(btn) {
            if (btn.dataset.tab === tabName) {
                btn.classList.add('border-purple-500', 'text-purple-600');
                btn.classList.remove('border-transparent', 'text-gray-600');
            } else {
                btn.classList.remove('border-purple-500', 'text-purple-600');
                btn.classList.add('border-transparent', 'text-gray-600');
            }
        });
    }

    showNotification(message, type) {
        var notification = document.createElement('div');
        var bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
        notification.className = 'fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ' + bgColor + ' text-white';
        notification.innerHTML = '<p>' + message + '</p>';
        document.body.appendChild(notification);
        setTimeout(function() { notification.remove(); }, 3000);
    }
}

// Initialize the app
window.telemetryApp = new TelemetryAnalysisApp();
