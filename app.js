// Racing Telemetry Analysis App - Complete Version with Channel Mapping
// Updated: Analysis as Tab, Fixed Data Display, Comparative Smoothness
class TelemetryAnalysisApp {
    constructor() {
        this.sessionId = null;
        this.sessionData = null;
        this.referenceData = null;
        this.currentData = null;
        this.analysisResults = null;
        this.detectedChannels = null;
        this.customMappings = {};
        this.customOverlays = [];
        this.selectedTrack = null;
        this.webhookUrl = localStorage.getItem('n8n_webhook_url') || 'https://ruturajw.app.n8n.cloud';
        this.useLLMMapping = true;
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupTrackSelector();
        this.checkConfiguration();
        console.log('Telemetry Analysis App initialized');
    }
    
    // LLM-based channel mapping
    async mapChannelsWithLLM(columns, sampleData) {
        var self = this;
        var dataSample = {};
        columns.forEach(function(col) {
            var values = sampleData.slice(0, 5).map(function(row) { 
                return row[col]; 
            });
            dataSample[col] = values;
        });
        
        var prompt = 'You are a racing telemetry expert. I have CSV columns from a racing data logger that need to be mapped to standard channel names.\n\n' +
            'CSV COLUMNS AND SAMPLE VALUES:\n' + JSON.stringify(dataSample, null, 2) + '\n\n' +
            'MAP THESE TO OUR STANDARD CHANNELS:\n\n' +
            'REQUIRED (must map if present):\n' +
            '- time: Elapsed time or timestamp (seconds)\n' +
            '- distance: Lap distance or position around track (meters)\n' +
            '- speed: Vehicle speed (km/h or mph)\n\n' +
            'DRIVER INPUTS:\n' +
            '- throttle: Throttle position\n' +
            '- brake: Brake pressure/position (use front if multiple)\n' +
            '- gear: Current gear\n' +
            '- steer: Steering angle\n\n' +
            'ENGINE & TEMPS:\n' +
            '- rpm: Engine RPM\n' +
            '- engineTemp: Engine/water/coolant temp\n' +
            '- oilTemp: Engine oil temp\n' +
            '- gboxOilTemp: Gearbox oil temp\n' +
            '- diffOilTemp: Differential oil temp\n' +
            '- oilPres: Oil pressure\n' +
            '- fuelPres: Fuel pressure\n' +
            '- manifoldPres: Manifold/boost pressure\n' +
            '- baroPres: Barometric pressure\n' +
            '- airTemp: Intake air temp\n' +
            '- lambda1: Lambda/AFR sensor 1\n' +
            '- lambda2: Lambda/AFR sensor 2\n' +
            '- fuelLevel: Current fuel level (liters or kg)\n' +
            '- fuelUsed: Fuel used/consumed (liters or kg)\n' +
            '- fuelPressure: Fuel system pressure\n\n' +
            'G-FORCES & DYNAMICS:\n' +
            '- gLatF: Lateral G front (or main lateral G)\n' +
            '- gLatM: Lateral G mid/center\n' +
            '- gLatR: Lateral G rear\n' +
            '- gLongF: Longitudinal G front\n' +
            '- gLongM: Longitudinal G mid\n' +
            '- yaw1: Yaw sensor 1\n' +
            '- yaw2: Yaw sensor 2\n\n' +
            'TIRE TEMPS (map each zone separately - I=Inner, C=Center/Centre, O=Outer):\n' +
            '- tireTempFLI: Front Left Inner\n' +
            '- tireTempFLC: Front Left Center (or single FL temp)\n' +
            '- tireTempFLO: Front Left Outer\n' +
            '- tireTempFRI: Front Right Inner\n' +
            '- tireTempFRC: Front Right Center (or single FR temp)\n' +
            '- tireTempFRO: Front Right Outer\n' +
            '- tireTempRLI: Rear Left Inner\n' +
            '- tireTempRLC: Rear Left Center (or single RL temp)\n' +
            '- tireTempRLO: Rear Left Outer\n' +
            '- tireTempRRI: Rear Right Inner\n' +
            '- tireTempRRC: Rear Right Center (or single RR temp)\n' +
            '- tireTempRRO: Rear Right Outer\n\n' +
            'BRAKE TEMPS & PRESSURES:\n' +
            '- brakeTempFL/FR/RL/RR: Individual brake temps\n' +
            '- brakePresF: Front brake pressure\n' +
            '- brakePresR: Rear brake pressure\n' +
            '- brakeBias: Brake bias setting (front percentage)\n\n' +
            'WHEEL SPEEDS:\n' +
            '- wheelSpeedFL/FR/RL/RR: Individual wheel speeds\n\n' +
            'SUSPENSION:\n' +
            '- suspFL/FR/RL/RR: Suspension travel/position\n' +
            '- rideHeightFL/FR/RL/RR: Ride heights\n\n' +
            'ELECTRICAL:\n' +
            '- batteryVolts: Battery voltage\n' +
            '- batVoltsADL: ADL battery voltage\n\n' +
            'OTHER:\n' +
            '- lapNumber: Current lap\n' +
            '- gpsLat/gpsLon: GPS coordinates\n\n' +
            'RULES:\n' +
            '1. Map as many columns as possible\n' +
            '2. For tire temps with Inner/Centre/Outer, map each to the appropriate I/C/O channel\n' +
            '3. If only one tire temp per corner exists, map it to the C (center) channel\n' +
            '4. Use the sample values to verify your mappings make sense\n\n' +
            'RESPOND WITH ONLY A JSON OBJECT. Example:\n' +
            '{"time":"Time","distance":"Lap Distance","tireTempFLI":"Tyre Temp FL Inner","tireTempFLC":"Tyre Temp FL Centre","tireTempFLO":"Tyre Temp FL Outer"}\n\n' +
            'JSON ONLY, NO OTHER TEXT:';
        
        try {
            console.log('Requesting LLM channel mapping...');
            var response = await fetch(this.webhookUrl + '/webhook/channel-mapping', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    columns: columns,
                    sample_data: dataSample,
                    prompt: prompt
                })
            });
            
            if (!response.ok) {
                console.warn('LLM mapping failed, falling back to rule-based');
                return null;
            }
            
            var result = await response.json();
            if (result.success && result.mappings) {
                console.log('LLM channel mappings:', result.mappings);
                return result.mappings;
            }
            return null;
        } catch (error) {
            console.warn('LLM channel mapping error:', error);
            return null;
        }
    }
    
    setupTrackSelector() {
        var trackSelect = document.getElementById('track-select');
        if (!trackSelect || typeof TRACK_DATABASE === 'undefined') return;
        
        var self = this;
        var tracksByType = {};
        Object.entries(TRACK_DATABASE).forEach(function([key, track]) {
            if (!tracksByType[track.type]) tracksByType[track.type] = [];
            tracksByType[track.type].push({ key: key, name: track.name, location: track.location });
        });
        
        var html = '<option value="">-- Select Track (Optional) --</option>';
        var typeOrder = ['F1', 'IMSA', 'WEC', 'IndyCar', 'NASCAR', 'MotoGP', 'DTM', 'BTCC', 'V8Supercars', 'Club'];
        
        typeOrder.forEach(function(type) {
            if (tracksByType[type] && tracksByType[type].length > 0) {
                html += '<optgroup label="' + type + '">';
                tracksByType[type].sort(function(a, b) { return a.name.localeCompare(b.name); });
                tracksByType[type].forEach(function(track) {
                    html += '<option value="' + track.key + '">' + track.name + ' (' + track.location + ')</option>';
                });
                html += '</optgroup>';
            }
        });
        
        trackSelect.innerHTML = html;
        trackSelect.addEventListener('change', function() {
            if (this.value && TRACK_DATABASE[this.value]) {
                self.selectedTrack = TRACK_DATABASE[this.value];
                self.selectedTrack.key = this.value;
                self.showNotification('Track selected: ' + self.selectedTrack.name, 'success');
            } else {
                self.selectedTrack = null;
            }
        });
    }
    
    checkConfiguration() {
        if (!this.webhookUrl) {
            document.getElementById('config-modal').classList.remove('hidden');
            document.getElementById('config-modal').classList.add('flex');
        }
    }
    
    setupEventListeners() {
        var self = this;
        this.setupFileUpload('ref');
        this.setupFileUpload('curr');
        
        document.getElementById('send-btn').addEventListener('click', function() { self.sendChatMessage(); });
        document.getElementById('chat-input').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') self.sendChatMessage();
        });
        
        document.querySelectorAll('.quick-question').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                document.getElementById('chat-input').value = e.target.textContent.trim();
                self.sendChatMessage();
            });
        });
        
        document.querySelectorAll('.tab-btn').forEach(function(btn) {
            btn.addEventListener('click', function(e) { self.switchTab(e.target.dataset.tab); });
        });
        
        document.getElementById('save-config').addEventListener('click', function() {
            self.webhookUrl = document.getElementById('webhook-url').value;
            localStorage.setItem('n8n_webhook_url', self.webhookUrl);
            document.getElementById('config-modal').classList.add('hidden');
            self.showNotification('Configuration saved!', 'success');
        });
    }
    
    setupFileUpload(type) {
        var uploadArea = document.getElementById(type + '-upload');
        var fileInput = document.getElementById(type + '-file');
        var self = this;
        
        uploadArea.addEventListener('click', function() { fileInput.click(); });
        uploadArea.addEventListener('dragover', function(e) { e.preventDefault(); uploadArea.classList.add('dragover'); });
        uploadArea.addEventListener('dragleave', function() { uploadArea.classList.remove('dragover'); });
        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) self.handleFileSelect(e.dataTransfer.files[0], type);
        });
        fileInput.addEventListener('change', function(e) {
            if (e.target.files.length > 0) self.handleFileSelect(e.target.files[0], type);
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
                        break;
                    }
                }
            }
            
            var csvText = text;
            if (isMoTeCFormat && headerRowIndex > 0) {
                var headerLine = lines[headerRowIndex];
                var dataLines = lines.slice(headerRowIndex + 2);
                csvText = [headerLine].concat(dataLines).join('\n');
            }
            
            Papa.parse(csvText, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: function(results) {
                    var cleanedData = results.data.filter(function(row) {
                        if (!row || Object.keys(row).length === 0) return false;
                        return Object.values(row).some(function(val) { return val !== null && val !== '' && val !== undefined; });
                    });
                    
                    if (type === 'ref') { self.referenceData = cleanedData; self.displayFileInfo('ref', file); }
                    else { self.currentData = cleanedData; self.displayFileInfo('curr', file); }
                    
                    if (self.referenceData && self.currentData) {
                        self.detectChannels();
                    }
                },
                error: function(error) { self.showNotification('Error parsing CSV: ' + error.message, 'error'); }
            });
        };
        reader.onerror = function() { self.showNotification('Error reading file', 'error'); };
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
    
    escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    async detectChannels() {
        if (!this.referenceData || this.referenceData.length === 0) return;
        var columns = Object.keys(this.referenceData[0]);
        var self = this;
        
        var channelDefinitions = {
            required: {
                time: { description: 'Timestamp data', icon: 'fa-clock' },
                distance: { description: 'Position around lap', icon: 'fa-road' },
                speed: { description: 'Vehicle speed', icon: 'fa-tachometer-alt' }
            },
            optional: {
                throttle: { description: 'Throttle position', icon: 'fa-gas-pump', category: 'Driver Inputs' },
                brake: { description: 'Brake pressure', icon: 'fa-hand-paper', category: 'Driver Inputs' },
                gear: { description: 'Current gear', icon: 'fa-cog', category: 'Driver Inputs' },
                steer: { description: 'Steering angle', icon: 'fa-dharmachakra', category: 'Driver Inputs' },
                rpm: { description: 'Engine RPM', icon: 'fa-tachometer-alt', category: 'Engine' },
                engineTemp: { description: 'Engine temperature', icon: 'fa-thermometer-full', category: 'Engine' },
                oilTemp: { description: 'Oil temperature', icon: 'fa-oil-can', category: 'Engine' },
                gboxOilTemp: { description: 'Gearbox oil temp', icon: 'fa-oil-can', category: 'Engine' },
                diffOilTemp: { description: 'Diff oil temp', icon: 'fa-oil-can', category: 'Engine' },
                oilPres: { description: 'Oil pressure', icon: 'fa-tint', category: 'Engine' },
                fuelPres: { description: 'Fuel pressure', icon: 'fa-gas-pump', category: 'Engine' },
                manifoldPres: { description: 'Manifold pressure', icon: 'fa-compress-arrows-alt', category: 'Engine' },
                baroPres: { description: 'Barometric pressure', icon: 'fa-cloud', category: 'Engine' },
                airTemp: { description: 'Air intake temp', icon: 'fa-wind', category: 'Engine' },
                lambda1: { description: 'Lambda 1', icon: 'fa-burn', category: 'Engine' },
                lambda2: { description: 'Lambda 2', icon: 'fa-burn', category: 'Engine' },
                fuelLevel: { description: 'Fuel level', icon: 'fa-gas-pump', category: 'Fuel' },
                fuelUsed: { description: 'Fuel used', icon: 'fa-gas-pump', category: 'Fuel' },
                gLatF: { description: 'Lateral G (Front)', icon: 'fa-arrows-alt-h', category: 'G-Forces' },
                gLatM: { description: 'Lateral G (Mid)', icon: 'fa-arrows-alt-h', category: 'G-Forces' },
                gLatR: { description: 'Lateral G (Rear)', icon: 'fa-arrows-alt-h', category: 'G-Forces' },
                gLongF: { description: 'Long G (Front)', icon: 'fa-arrows-alt-v', category: 'G-Forces' },
                gLongM: { description: 'Long G (Mid)', icon: 'fa-arrows-alt-v', category: 'G-Forces' },
                gLat: { description: 'Lateral G-force', icon: 'fa-arrows-alt-h', category: 'G-Forces' },
                gLong: { description: 'Longitudinal G-force', icon: 'fa-arrows-alt-v', category: 'G-Forces' },
                gVert: { description: 'Vertical G-force', icon: 'fa-arrows-alt-v', category: 'G-Forces' },
                yaw1: { description: 'Yaw sensor 1', icon: 'fa-sync', category: 'G-Forces' },
                yaw2: { description: 'Yaw sensor 2', icon: 'fa-sync', category: 'G-Forces' },
                tireTempFLI: { description: 'FL Tire Inner', icon: 'fa-temperature-high', category: 'Tire Temps' },
                tireTempFLC: { description: 'FL Tire Center', icon: 'fa-temperature-high', category: 'Tire Temps' },
                tireTempFLO: { description: 'FL Tire Outer', icon: 'fa-temperature-high', category: 'Tire Temps' },
                tireTempFRI: { description: 'FR Tire Inner', icon: 'fa-temperature-high', category: 'Tire Temps' },
                tireTempFRC: { description: 'FR Tire Center', icon: 'fa-temperature-high', category: 'Tire Temps' },
                tireTempFRO: { description: 'FR Tire Outer', icon: 'fa-temperature-high', category: 'Tire Temps' },
                tireTempRLI: { description: 'RL Tire Inner', icon: 'fa-temperature-high', category: 'Tire Temps' },
                tireTempRLC: { description: 'RL Tire Center', icon: 'fa-temperature-high', category: 'Tire Temps' },
                tireTempRLO: { description: 'RL Tire Outer', icon: 'fa-temperature-high', category: 'Tire Temps' },
                tireTempRRI: { description: 'RR Tire Inner', icon: 'fa-temperature-high', category: 'Tire Temps' },
                tireTempRRC: { description: 'RR Tire Center', icon: 'fa-temperature-high', category: 'Tire Temps' },
                tireTempRRO: { description: 'RR Tire Outer', icon: 'fa-temperature-high', category: 'Tire Temps' },
                brakeTempFL: { description: 'FL Brake temp', icon: 'fa-fire', category: 'Brakes' },
                brakeTempFR: { description: 'FR Brake temp', icon: 'fa-fire', category: 'Brakes' },
                brakeTempRL: { description: 'RL Brake temp', icon: 'fa-fire', category: 'Brakes' },
                brakeTempRR: { description: 'RR Brake temp', icon: 'fa-fire', category: 'Brakes' },
                brakePresF: { description: 'Front brake pressure', icon: 'fa-compress', category: 'Brakes' },
                brakePresR: { description: 'Rear brake pressure', icon: 'fa-compress', category: 'Brakes' },
                brakeBias: { description: 'Brake bias setting', icon: 'fa-sliders-h', category: 'Brakes' },
                wheelSpeedFL: { description: 'FL wheel speed', icon: 'fa-circle', category: 'Wheel Speeds' },
                wheelSpeedFR: { description: 'FR wheel speed', icon: 'fa-circle', category: 'Wheel Speeds' },
                wheelSpeedRL: { description: 'RL wheel speed', icon: 'fa-circle', category: 'Wheel Speeds' },
                wheelSpeedRR: { description: 'RR wheel speed', icon: 'fa-circle', category: 'Wheel Speeds' },
                suspFL: { description: 'FL suspension', icon: 'fa-arrows-alt-v', category: 'Suspension' },
                suspFR: { description: 'FR suspension', icon: 'fa-arrows-alt-v', category: 'Suspension' },
                suspRL: { description: 'RL suspension', icon: 'fa-arrows-alt-v', category: 'Suspension' },
                suspRR: { description: 'RR suspension', icon: 'fa-arrows-alt-v', category: 'Suspension' },
                rideHeightFL: { description: 'FL ride height', icon: 'fa-ruler-vertical', category: 'Suspension' },
                rideHeightFR: { description: 'FR ride height', icon: 'fa-ruler-vertical', category: 'Suspension' },
                rideHeightRL: { description: 'RL ride height', icon: 'fa-ruler-vertical', category: 'Suspension' },
                rideHeightRR: { description: 'RR ride height', icon: 'fa-ruler-vertical', category: 'Suspension' },
                batteryVolts: { description: 'Battery voltage', icon: 'fa-battery-full', category: 'Electrical' },
                batVoltsADL: { description: 'ADL battery', icon: 'fa-battery-full', category: 'Electrical' },
                gpsLat: { description: 'GPS Latitude', icon: 'fa-map-marker-alt', category: 'Position' },
                gpsLon: { description: 'GPS Longitude', icon: 'fa-map-marker-alt', category: 'Position' },
                lapNumber: { description: 'Lap number', icon: 'fa-flag-checkered', category: 'Position' }
            }
        };
        
        var detected = { required: {}, optional: {}, missing: [], unrecognized: [], capabilities: [], totalColumns: columns.length, mappingMethod: 'rule-based' };
        var matchedColumns = new Set();
        
        var llmMappings = null;
        if (this.useLLMMapping) {
            try {
                this.showNotification('AI is analyzing your CSV columns...', 'info');
                llmMappings = await this.mapChannelsWithLLM(columns, this.referenceData);
                if (llmMappings) {
                    detected.mappingMethod = 'AI-powered';
                    console.log('Using LLM mappings:', llmMappings);
                }
            } catch (e) {
                console.warn('LLM mapping failed:', e);
            }
        }
        
        if (llmMappings) {
            Object.keys(channelDefinitions.required).forEach(function(key) {
                var def = channelDefinitions.required[key];
                if (llmMappings[key] && columns.includes(llmMappings[key])) {
                    detected.required[key] = { csvColumn: llmMappings[key], description: def.description, icon: def.icon };
                    matchedColumns.add(llmMappings[key]);
                } else {
                    detected.missing.push({ channel: key, description: def.description });
                }
            });
            
            Object.keys(channelDefinitions.optional).forEach(function(key) {
                var def = channelDefinitions.optional[key];
                if (llmMappings[key] && columns.includes(llmMappings[key])) {
                    detected.optional[key] = { csvColumn: llmMappings[key], description: def.description, icon: def.icon, category: def.category };
                    matchedColumns.add(llmMappings[key]);
                }
            });
        } else {
            var ruleVariants = {
                time: ['Time', 'Elapsed Time', 'Session Time', 'time', 'TIME', 'elapsed', 'Elapsed', 'Lap Time', 'Running Lap Time'],
                distance: ['Distance', 'Dist', 'LapDist', 'Lap Distance', 'distance', 'DISTANCE', 'Lap Dist'],
                speed: ['Ground Speed', 'Speed', 'Drive Speed', 'Vehicle Speed', 'speed', 'SPEED', 'Velocity', 'Max Straight Speed'],
                throttle: ['Throttle Pos', 'Throttle', 'TPS', 'throttle', 'THROTTLE', 'Throttle %', 'ThrottlePos', 'Error Throttle Pos'],
                brake: ['Brake Pres Front', 'Brake Pressure', 'Brake', 'brake', 'BRAKE', 'BrakePressure', 'Brake Pres', 'Brake Pres Rear'],
                gear: ['Gear', 'gear', 'GEAR', 'Gear Position', 'GearPos', 'Gear Pos Volts'],
                steer: ['Steered Angle', 'Steering Angle', 'Steer', 'steer', 'STEER', 'SteerAngle', 'Steering', 'Wheel Slip'],
                rpm: ['Engine RPM', 'RPM', 'rpm', 'EngineRPM', 'Engine Speed', 'Error Over RPM'],
                engineTemp: ['Engine Temp', 'Water Temp', 'Coolant Temp', 'EngineTemp', 'WaterTemp', 'Error Engine Temp'],
                oilTemp: ['Eng Oil Temp', 'Oil Temp', 'OilTemp', 'Error Oil Temp', 'Gbox Oil Temp', 'Diff Oil Temp'],
                fuelLevel: ['Fuel Level', 'Fuel', 'FuelLevel', 'Fuel Remaining', 'Fuel Used (Raw)', 'Fuel Pres'],
                gLat: ['G Force Lat', 'Lateral G', 'G_Lat', 'gLat', 'GLat', 'LatG', 'LateralAccel', 'G Force Lat - Front', 'G Force Lat - Mid', 'Error Lateral G'],
                gLong: ['G Force Long', 'Longitudinal G', 'G_Long', 'gLong', 'GLong', 'LongG', 'LongAccel', 'G Force Long Front', 'G Force Long Mid', 'Error Long G'],
                gVert: ['G Force Vert', 'Vertical G', 'G_Vert', 'gVert', 'GVert'],
                yaw: ['Gyro Yaw Velocity', 'Yaw Rate', 'Yaw', 'YawRate', 'yaw', 'G Lat Yaw 1 - velcro mount', 'G Lat Yaw 2 - rubber mount'],
                tireTempFL: ['Tyre Temp FL Centre', 'Tyre Temp FL Inner', 'Tyre Temp FL Outer', 'Tire Temp FL', 'TireTempFL'],
                tireTempFR: ['Tyre Temp FR Centre', 'Tyre Temp FR Center', 'Tyre Temp FR Inner', 'Tyre Temp FR Outer', 'Tire Temp FR'],
                tireTempRL: ['Tyre Temp RL', 'Tire Temp RL'],
                tireTempRR: ['Tyre Temp RR', 'Tire Temp RR'],
                brakeTempFL: ['Brake Temp FL', 'BrakeTempFL'],
                brakeTempFR: ['Brake Temp FR', 'BrakeTempFR'],
                brakeTempRL: ['Brake Temp RL', 'BrakeTempRL'],
                brakeTempRR: ['Brake Temp RR', 'BrakeTempRR'],
                wheelSpeedFL: ['Wheel Speed FL', 'WheelSpeed FL', 'WheelSpeedFL', 'Dig In 1 Speed'],
                wheelSpeedFR: ['Wheel Speed FR', 'WheelSpeed FR', 'WheelSpeedFR', 'Dig In 2 Speed'],
                wheelSpeedRL: ['Wheel Speed RL', 'WheelSpeed RL', 'WheelSpeedRL'],
                wheelSpeedRR: ['Wheel Speed RR', 'WheelSpeed RR', 'WheelSpeedRR'],
                suspFL: ['Susp Pos FL', 'Suspension FL', 'SuspFL', 'Ride Height FL'],
                suspFR: ['Susp Pos FR', 'Suspension FR', 'SuspFR', 'Ride Height FR'],
                suspRL: ['Susp Pos RL', 'Suspension RL', 'SuspRL', 'Ride Height RL'],
                suspRR: ['Susp Pos RR', 'Suspension RR', 'SuspRR', 'Ride Height RR'],
                gpsLat: ['GPS Latitude', 'Latitude', 'Lat', 'lat'],
                gpsLon: ['GPS Longitude', 'Longitude', 'Lon', 'lon'],
                lambda: ['Lambda 1', 'Lambda 2', 'La1 Closed Loop', 'La2 Closed Loop'],
                boost: ['Manifold Pres', 'Error Over Boost', 'Baro Pres'],
                batteryVolts: ['Battery Volts', 'Bat Volts ADL', 'Error Low Bat Volts'],
                airTemp: ['Air Temp Inlet', 'Error Inlet Air Temp']
            };
            
            var fuzzyMatch = function(col, variants) {
                var colLower = col.toLowerCase().replace(/[^a-z0-9]/g, '');
                for (var i = 0; i < variants.length; i++) {
                    if (col.toLowerCase() === variants[i].toLowerCase()) return true;
                }
                for (var i = 0; i < variants.length; i++) {
                    var varLower = variants[i].toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (colLower.indexOf(varLower) !== -1 || varLower.indexOf(colLower) !== -1) {
                        var matchRatio = Math.min(colLower.length, varLower.length) / Math.max(colLower.length, varLower.length);
                        if (matchRatio > 0.6) return true;
                    }
                }
                return false;
            };
            
            Object.keys(channelDefinitions.required).forEach(function(key) {
                var def = channelDefinitions.required[key];
                var variants = ruleVariants[key] || [];
                var found = columns.find(function(col) { return fuzzyMatch(col, variants); });
                if (found) { detected.required[key] = { csvColumn: found, description: def.description, icon: def.icon }; matchedColumns.add(found); }
                else { detected.missing.push({ channel: key, description: def.description }); }
            });
            
            Object.keys(channelDefinitions.optional).forEach(function(key) {
                var def = channelDefinitions.optional[key];
                var variants = ruleVariants[key] || [];
                var found = columns.find(function(col) { return fuzzyMatch(col, variants); });
                if (found) { detected.optional[key] = { csvColumn: found, description: def.description, icon: def.icon, category: def.category }; matchedColumns.add(found); }
            });
        }
        
        columns.forEach(function(col) { if (!matchedColumns.has(col)) detected.unrecognized.push(col); });
        
        if (Object.keys(detected.required).length === 3) detected.capabilities.push({ name: 'Basic Lap Analysis', icon: 'fa-chart-line', color: 'green' });
        if (detected.optional.throttle && detected.optional.brake) detected.capabilities.push({ name: 'Driver Input Analysis', icon: 'fa-shoe-prints', color: 'blue' });
        if (detected.optional.gLat || detected.optional.gLong) detected.capabilities.push({ name: 'G-Force Analysis', icon: 'fa-circle-notch', color: 'purple' });
        if (detected.optional.gpsLat && detected.optional.gpsLon) detected.capabilities.push({ name: 'GPS Track Mapping', icon: 'fa-map-marked-alt', color: 'teal' });
        
        this.detectedChannels = detected;
        this.displayChannelInfo(detected);
    }
    
    displayChannelInfo(detected) {
        var self = this;
        var existingDisplay = document.getElementById('channel-detection-display');
        if (existingDisplay) existingDisplay.remove();
        var existingModal = document.getElementById('channel-mapping-modal');
        if (existingModal) existingModal.remove();
        
        var requiredCount = Object.keys(detected.required).length;
        var optionalCount = Object.keys(detected.optional).length;
        var totalMatched = requiredCount + optionalCount;
        var statusColor = requiredCount === 3 ? 'green' : 'yellow';
        var mappingMethod = detected.mappingMethod || 'rule-based';
        var isAIPowered = mappingMethod === 'AI-powered';
        
        var displayContainer = document.createElement('div');
        displayContainer.id = 'channel-detection-display';
        displayContainer.className = 'mt-6 border rounded-lg overflow-hidden';
        
        var html = '<div class="bg-' + statusColor + '-50 p-4 border-b"><div class="flex items-center justify-between"><div>';
        html += '<h3 class="font-bold text-lg flex items-center">';
        if (isAIPowered) {
            html += '<i class="fas fa-robot text-purple-500 mr-2"></i>AI Channel Detection';
        } else {
            html += '<i class="fas fa-search text-' + statusColor + '-500 mr-2"></i>Channel Detection Results';
        }
        html += '</h3>';
        html += '<p class="text-sm text-gray-600">' + detected.totalColumns + ' columns found - ' + totalMatched + ' channels mapped';
        if (isAIPowered) {
            html += ' <span class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800"><i class="fas fa-sparkles mr-1"></i>AI-Powered</span>';
        }
        html += '</p>';
        html += '</div><button id="toggle-channel-details" class="text-sm bg-white px-3 py-1 rounded border hover:bg-gray-50"><i class="fas fa-chevron-down mr-1"></i>Details</button></div></div>';
        
        if (detected.capabilities.length > 0) {
            html += '<div class="p-4 bg-white border-b"><h4 class="font-semibold text-gray-700 mb-2"><i class="fas fa-bolt text-yellow-500 mr-2"></i>Analysis Capabilities</h4><div class="flex flex-wrap gap-2">';
            detected.capabilities.forEach(function(cap) { html += '<span class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-' + cap.color + '-100 text-' + cap.color + '-800"><i class="fas ' + cap.icon + ' mr-1"></i>' + cap.name + '</span>'; });
            html += '</div></div>';
        }
        
        html += '<div class="p-4 border-b" id="required-channels-section"><h4 class="font-semibold text-gray-700 mb-2"><i class="fas fa-star text-yellow-500 mr-2"></i>Required Channels (' + requiredCount + '/3)</h4><div class="grid md:grid-cols-3 gap-2">';
        ['time', 'distance', 'speed'].forEach(function(key) {
            if (detected.required[key]) {
                var ch = detected.required[key];
                html += '<div class="bg-green-50 border border-green-200 rounded p-2"><div class="flex items-center justify-between"><span class="font-medium text-green-800"><i class="fas ' + ch.icon + ' mr-1"></i>' + key + '</span><i class="fas fa-check-circle text-green-500"></i></div><code class="text-xs text-gray-500">' + ch.csvColumn + '</code></div>';
            } else {
                html += '<div class="bg-red-50 border border-red-200 rounded p-2"><div class="flex items-center justify-between"><span class="font-medium text-red-800">' + key + '</span><i class="fas fa-times-circle text-red-500"></i></div><span class="text-xs text-red-500">Missing</span></div>';
            }
        });
        html += '</div></div>';
        
        html += '<div class="p-4 border-b" id="optional-channels-section" style="display:none;"><h4 class="font-semibold text-gray-700 mb-2"><i class="fas fa-plus-circle text-blue-500 mr-2"></i>Optional Channels (' + optionalCount + ' found)</h4>';
        var categories = {};
        Object.keys(detected.optional).forEach(function(key) { var ch = detected.optional[key]; if (!categories[ch.category]) categories[ch.category] = []; categories[ch.category].push({ key: key, data: ch }); });
        Object.keys(categories).forEach(function(cat) {
            html += '<div class="mb-3"><h5 class="text-sm font-medium text-gray-600 mb-1">' + cat + '</h5><div class="flex flex-wrap gap-1">';
            categories[cat].forEach(function(item) { html += '<span class="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"><i class="fas ' + item.data.icon + ' mr-1"></i>' + item.key + '</span>'; });
            html += '</div></div>';
        });
        html += '</div>';
        
        if (detected.unrecognized.length > 0) {
            html += '<div class="p-4 bg-gray-50" id="unrecognized-section" style="display:none;">';
            html += '<div class="flex items-center justify-between mb-3"><h4 class="font-semibold text-gray-600"><i class="fas fa-question-circle text-gray-400 mr-2"></i>Unrecognized Columns (' + detected.unrecognized.length + ')</h4>';
            html += '<button id="expand-all-columns" class="text-sm bg-white px-3 py-1 rounded border hover:bg-gray-100"><i class="fas fa-expand-alt mr-1"></i>Show All</button></div>';
            html += '<p class="text-xs text-blue-600 mb-3"><i class="fas fa-info-circle mr-1"></i>Click on any column to manually assign it to a telemetry channel</p>';
            html += '<div id="unrecognized-columns-list" class="flex flex-wrap gap-1">';
            detected.unrecognized.forEach(function(col, index) {
                var hiddenClass = index >= 20 ? ' hidden-column' : '';
                var displayStyle = index >= 20 ? ' style="display:none;"' : '';
                html += '<button class="unrecognized-col-btn' + hiddenClass + ' bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded hover:bg-blue-200 hover:text-blue-800 cursor-pointer transition" data-column="' + self.escapeHtml(col) + '"' + displayStyle + '>' + self.escapeHtml(col) + '</button>';
            });
            html += '</div>';
            if (detected.unrecognized.length > 20) html += '<p id="columns-count-text" class="text-gray-500 text-xs mt-2">Showing 20 of ' + detected.unrecognized.length + ' columns</p>';
            html += '</div>';
        }
        
        html += '<div class="p-4 bg-blue-50 border-t" id="custom-mappings-section" style="display:none;"><h4 class="font-semibold text-gray-700 mb-2"><i class="fas fa-link text-blue-500 mr-2"></i>Custom Channel Mappings</h4>';
        html += '<div id="custom-mappings-list" class="space-y-1"></div>';
        html += '<button id="apply-mappings-btn" class="mt-3 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"><i class="fas fa-check mr-2"></i>Save Mappings</button></div>';
        
        html += '<div class="p-4 border-t bg-gradient-to-r from-purple-50 to-blue-50"><button id="start-analysis-btn" class="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-blue-700 transition font-semibold text-lg shadow-lg"><i class="fas fa-play-circle mr-2"></i>Analyze Telemetry</button></div>';
        
        displayContainer.innerHTML = html;
        document.querySelector('#upload-section .bg-white').appendChild(displayContainer);
        this.createMappingModal();
        this.setupChannelMappingEvents(detected);
    }
    
    createMappingModal() {
        var modal = document.createElement('div');
        modal.id = 'channel-mapping-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50';
        
        var channelOptions = [
            { category: 'Required', channels: [{ key: 'time', name: 'Time', icon: 'fa-clock' }, { key: 'distance', name: 'Distance', icon: 'fa-road' }, { key: 'speed', name: 'Speed', icon: 'fa-tachometer-alt' }]},
            { category: 'Driver Inputs', channels: [{ key: 'throttle', name: 'Throttle', icon: 'fa-gas-pump' }, { key: 'brake', name: 'Brake', icon: 'fa-hand-paper' }, { key: 'gear', name: 'Gear', icon: 'fa-cog' }, { key: 'steer', name: 'Steering', icon: 'fa-dharmachakra' }]},
            { category: 'Engine', channels: [{ key: 'rpm', name: 'RPM', icon: 'fa-tachometer-alt' }, { key: 'engineTemp', name: 'Engine Temp', icon: 'fa-thermometer-full' }, { key: 'oilTemp', name: 'Oil Temp', icon: 'fa-oil-can' }]},
            { category: 'G-Forces', channels: [{ key: 'gLat', name: 'Lateral G', icon: 'fa-arrows-alt-h' }, { key: 'gLong', name: 'Longitudinal G', icon: 'fa-arrows-alt-v' }, { key: 'gVert', name: 'Vertical G', icon: 'fa-arrows-alt-v' }]},
            { category: 'Wheel Speeds', channels: [{ key: 'wheelSpeedFL', name: 'FL', icon: 'fa-circle' }, { key: 'wheelSpeedFR', name: 'FR', icon: 'fa-circle' }, { key: 'wheelSpeedRL', name: 'RL', icon: 'fa-circle' }, { key: 'wheelSpeedRR', name: 'RR', icon: 'fa-circle' }]},
            { category: 'Suspension', channels: [{ key: 'suspFL', name: 'FL', icon: 'fa-arrows-alt-v' }, { key: 'suspFR', name: 'FR', icon: 'fa-arrows-alt-v' }, { key: 'suspRL', name: 'RL', icon: 'fa-arrows-alt-v' }, { key: 'suspRR', name: 'RR', icon: 'fa-arrows-alt-v' }]},
            { category: 'Tire Temps - Front Left', channels: [{ key: 'tyreTempFLInner', name: 'FL Inner', icon: 'fa-thermometer-half' }, { key: 'tyreTempFLCenter', name: 'FL Center', icon: 'fa-thermometer-half' }, { key: 'tyreTempFLOuter', name: 'FL Outer', icon: 'fa-thermometer-half' }]},
            { category: 'Tire Temps - Front Right', channels: [{ key: 'tyreTempFRInner', name: 'FR Inner', icon: 'fa-thermometer-half' }, { key: 'tyreTempFRCenter', name: 'FR Center', icon: 'fa-thermometer-half' }, { key: 'tyreTempFROuter', name: 'FR Outer', icon: 'fa-thermometer-half' }]},
            { category: 'Tire Temps - Rear Left', channels: [{ key: 'tyreTempRLInner', name: 'RL Inner', icon: 'fa-thermometer-half' }, { key: 'tyreTempRLCenter', name: 'RL Center', icon: 'fa-thermometer-half' }, { key: 'tyreTempRLOuter', name: 'RL Outer', icon: 'fa-thermometer-half' }]},
            { category: 'Tire Temps - Rear Right', channels: [{ key: 'tyreTempRRInner', name: 'RR Inner', icon: 'fa-thermometer-half' }, { key: 'tyreTempRRCenter', name: 'RR Center', icon: 'fa-thermometer-half' }, { key: 'tyreTempRROuter', name: 'RR Outer', icon: 'fa-thermometer-half' }]},
            { category: 'Brake Temps', channels: [{ key: 'brakeTempFL', name: 'FL', icon: 'fa-fire' }, { key: 'brakeTempFR', name: 'FR', icon: 'fa-fire' }, { key: 'brakeTempRL', name: 'RL', icon: 'fa-fire' }, { key: 'brakeTempRR', name: 'RR', icon: 'fa-fire' }]},
            { category: 'Position', channels: [{ key: 'gpsLat', name: 'GPS Lat', icon: 'fa-map-marker-alt' }, { key: 'gpsLon', name: 'GPS Lon', icon: 'fa-map-marker-alt' }]}
        ];
        
        var modalHtml = '<div class="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-screen overflow-y-auto">';
        modalHtml += '<div class="flex items-center justify-between mb-4"><h3 class="text-lg font-bold"><i class="fas fa-link text-blue-500 mr-2"></i>Map Column to Channel</h3>';
        modalHtml += '<button id="close-mapping-modal" class="text-gray-500 hover:text-gray-700 text-xl"><i class="fas fa-times"></i></button></div>';
        modalHtml += '<div class="mb-4 p-3 bg-blue-50 rounded"><p class="text-sm text-gray-600">CSV Column:</p><p id="mapping-column-name" class="font-bold text-blue-700 text-lg"></p></div>';
        modalHtml += '<p class="text-sm text-gray-500 mb-4">Select the telemetry channel:</p>';
        
        channelOptions.forEach(function(group) {
            modalHtml += '<div class="mb-4"><h4 class="text-sm font-semibold text-gray-600 mb-2">' + group.category + '</h4><div class="grid grid-cols-2 gap-2">';
            group.channels.forEach(function(ch) { modalHtml += '<button class="channel-option-btn text-left p-2 border rounded hover:bg-blue-50 hover:border-blue-300 transition text-sm" data-channel="' + ch.key + '"><i class="fas ' + ch.icon + ' text-gray-400 mr-2"></i>' + ch.name + '</button>'; });
            modalHtml += '</div></div>';
        });
        
        modalHtml += '<div class="mt-4 pt-4 border-t"><button id="remove-mapping-btn" class="w-full p-2 border border-red-300 text-red-600 rounded hover:bg-red-50 transition text-sm"><i class="fas fa-trash mr-2"></i>Remove Mapping</button></div></div>';
        
        modal.innerHTML = modalHtml;
        document.body.appendChild(modal);
    }
    
    setupChannelMappingEvents(detected) {
        var self = this;
        
        var toggleBtn = document.getElementById('toggle-channel-details');
        var optionalSection = document.getElementById('optional-channels-section');
        var unrecognizedSection = document.getElementById('unrecognized-section');
        var isExpanded = false;
        
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function() {
                isExpanded = !isExpanded;
                if (optionalSection) optionalSection.style.display = isExpanded ? 'block' : 'none';
                if (unrecognizedSection) unrecognizedSection.style.display = isExpanded ? 'block' : 'none';
                toggleBtn.innerHTML = isExpanded ? '<i class="fas fa-chevron-up mr-1"></i>Hide' : '<i class="fas fa-chevron-down mr-1"></i>Details';
            });
        }
        
        var expandBtn = document.getElementById('expand-all-columns');
        var isAllExpanded = false;
        if (expandBtn) {
            expandBtn.addEventListener('click', function() {
                isAllExpanded = !isAllExpanded;
                document.querySelectorAll('.hidden-column').forEach(function(col) { col.style.display = isAllExpanded ? 'inline-block' : 'none'; });
                var countText = document.getElementById('columns-count-text');
                if (countText) countText.textContent = isAllExpanded ? 'Showing all ' + detected.unrecognized.length + ' columns' : 'Showing 20 of ' + detected.unrecognized.length + ' columns';
                expandBtn.innerHTML = isAllExpanded ? '<i class="fas fa-compress-alt mr-1"></i>Show Less' : '<i class="fas fa-expand-alt mr-1"></i>Show All';
            });
        }
        
        document.querySelectorAll('.unrecognized-col-btn').forEach(function(btn) {
            btn.addEventListener('click', function() { self.openMappingModal(this.getAttribute('data-column')); });
        });
        
        var closeBtn = document.getElementById('close-mapping-modal');
        if (closeBtn) closeBtn.addEventListener('click', function() { self.closeMappingModal(); });
        
        var modal = document.getElementById('channel-mapping-modal');
        if (modal) modal.addEventListener('click', function(e) { if (e.target === modal) self.closeMappingModal(); });
        
        document.querySelectorAll('.channel-option-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var channelKey = this.getAttribute('data-channel');
                var columnName = document.getElementById('mapping-column-name').textContent;
                
                var existingColumnForChannel = null;
                Object.keys(self.customMappings).forEach(function(col) {
                    if (self.customMappings[col] === channelKey && col !== columnName) existingColumnForChannel = col;
                });
                
                if (existingColumnForChannel) {
                    if (confirm('"' + channelKey + '" is mapped to "' + existingColumnForChannel + '". Replace?')) {
                        delete self.customMappings[existingColumnForChannel];
                        var oldBtn = document.querySelector('.unrecognized-col-btn[data-column="' + existingColumnForChannel.replace(/"/g, '\\"') + '"]');
                        if (oldBtn) { oldBtn.classList.remove('bg-green-200', 'text-green-800'); oldBtn.classList.add('bg-gray-200', 'text-gray-700'); }
                        self.addCustomMapping(columnName, channelKey);
                        self.closeMappingModal();
                    }
                } else {
                    self.addCustomMapping(columnName, channelKey);
                    self.closeMappingModal();
                }
            });
        });
        
        var removeBtn = document.getElementById('remove-mapping-btn');
        if (removeBtn) removeBtn.addEventListener('click', function() { self.removeCustomMapping(document.getElementById('mapping-column-name').textContent); self.closeMappingModal(); });
        
        var applyMappingsBtn = document.getElementById('apply-mappings-btn');
        if (applyMappingsBtn) applyMappingsBtn.addEventListener('click', function() { self.applyMappings(); });
        
        var startAnalysisBtn = document.getElementById('start-analysis-btn');
        if (startAnalysisBtn) startAnalysisBtn.addEventListener('click', function() { self.analyzeTelemetry(); });
    }
    
    openMappingModal(columnName) {
        var self = this;
        var modal = document.getElementById('channel-mapping-modal');
        var columnNameEl = document.getElementById('mapping-column-name');
        if (modal && columnNameEl) {
            columnNameEl.textContent = columnName;
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            
            var channelToColumn = {};
            Object.keys(this.customMappings).forEach(function(col) {
                channelToColumn[self.customMappings[col]] = col;
            });
            
            if (this.detectedChannels) {
                Object.keys(this.detectedChannels.required || {}).forEach(function(key) {
                    var ch = self.detectedChannels.required[key];
                    if (ch && ch.csvColumn && !channelToColumn[key]) channelToColumn[key] = ch.csvColumn + ' (auto)';
                });
                Object.keys(this.detectedChannels.optional || {}).forEach(function(key) {
                    var ch = self.detectedChannels.optional[key];
                    if (ch && ch.csvColumn && !channelToColumn[key]) channelToColumn[key] = ch.csvColumn + ' (auto)';
                });
            }
            
            var existingMapping = this.customMappings[columnName];
            document.querySelectorAll('.channel-option-btn').forEach(function(btn) {
                var channelKey = btn.getAttribute('data-channel');
                var mappedColumn = channelToColumn[channelKey];
                
                btn.classList.remove('bg-green-100', 'border-green-500', 'bg-yellow-50', 'border-yellow-400', 'opacity-60');
                btn.style.position = 'relative';
                
                var oldBadge = btn.querySelector('.mapping-badge');
                if (oldBadge) oldBadge.remove();
                
                if (existingMapping && channelKey === existingMapping) {
                    btn.classList.add('bg-green-100', 'border-green-500');
                    var badge = document.createElement('span');
                    badge.className = 'mapping-badge absolute top-1 right-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded';
                    badge.innerHTML = '<i class="fas fa-check"></i> Current';
                    btn.appendChild(badge);
                } else if (mappedColumn) {
                    btn.classList.add('bg-yellow-50', 'border-yellow-400', 'opacity-60');
                    var badge = document.createElement('span');
                    badge.className = 'mapping-badge absolute top-1 right-1 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded max-w-24 truncate';
                    badge.title = 'Mapped to: ' + mappedColumn;
                    badge.innerHTML = '<i class="fas fa-link"></i> ' + (mappedColumn.length > 10 ? mappedColumn.substring(0, 10) + '...' : mappedColumn);
                    btn.appendChild(badge);
                }
            });
        }
    }
    
    closeMappingModal() {
        var modal = document.getElementById('channel-mapping-modal');
        if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
    }
    
    addCustomMapping(columnName, channelKey) {
        this.customMappings[columnName] = channelKey;
        this.updateCustomMappingsDisplay();
        this.showNotification('Mapped "' + columnName + '" to ' + channelKey, 'success');
        var colBtn = document.querySelector('.unrecognized-col-btn[data-column="' + columnName.replace(/"/g, '\\"') + '"]');
        if (colBtn) { colBtn.classList.remove('bg-gray-200', 'text-gray-700'); colBtn.classList.add('bg-green-200', 'text-green-800'); }
    }
    
    removeCustomMapping(columnName) {
        if (this.customMappings[columnName]) {
            delete this.customMappings[columnName];
            this.updateCustomMappingsDisplay();
            this.showNotification('Removed mapping for "' + columnName + '"', 'info');
            var colBtn = document.querySelector('.unrecognized-col-btn[data-column="' + columnName.replace(/"/g, '\\"') + '"]');
            if (colBtn) { colBtn.classList.remove('bg-green-200', 'text-green-800'); colBtn.classList.add('bg-gray-200', 'text-gray-700'); }
        }
    }
    
    updateCustomMappingsDisplay() {
        var mappingsSection = document.getElementById('custom-mappings-section');
        var mappingsList = document.getElementById('custom-mappings-list');
        var mappingKeys = Object.keys(this.customMappings);
        var self = this;
        
        if (mappingKeys.length > 0) {
            mappingsSection.style.display = 'block';
            var html = '';
            mappingKeys.forEach(function(col) {
                html += '<div class="flex items-center justify-between bg-white p-2 rounded border"><div><code class="text-sm text-gray-600">' + self.escapeHtml(col) + '</code>';
                html += '<span class="text-gray-400 mx-2"><i class="fas fa-arrow-right"></i></span><span class="text-blue-600 font-medium">' + self.customMappings[col] + '</span></div>';
                html += '<button class="remove-single-mapping text-red-500 hover:text-red-700" data-column="' + self.escapeHtml(col) + '"><i class="fas fa-times"></i></button></div>';
            });
            mappingsList.innerHTML = html;
            mappingsList.querySelectorAll('.remove-single-mapping').forEach(function(btn) {
                btn.addEventListener('click', function() { self.removeCustomMapping(this.getAttribute('data-column')); });
            });
        } else {
            mappingsSection.style.display = 'none';
        }
    }
    
    applyMappings() {
        var self = this;
        if (Object.keys(this.customMappings).length > 0) {
            var standardNames = { 'time': 'Time', 'distance': 'Distance', 'speed': 'Ground Speed', 'throttle': 'Throttle Pos', 'brake': 'Brake Pres Front', 'gear': 'Gear', 'steer': 'Steered Angle', 'rpm': 'Engine RPM', 'gLat': 'G Force Lat', 'gLong': 'G Force Long', 'gpsLat': 'GPS Latitude', 'gpsLon': 'GPS Longitude',
                'tyreTempFLInner': 'Tyre Temp FL Inner', 'tyreTempFLCenter': 'Tyre Temp FL Centre', 'tyreTempFLOuter': 'Tyre Temp FL Outer',
                'tyreTempFRInner': 'Tyre Temp FR Inner', 'tyreTempFRCenter': 'Tyre Temp FR Center', 'tyreTempFROuter': 'Tyre Temp FR Outer',
                'tyreTempRLInner': 'Tyre Temp RL Inner', 'tyreTempRLCenter': 'Tyre Temp RL Centre', 'tyreTempRLOuter': 'Tyre Temp RL Outer',
                'tyreTempRRInner': 'Tyre Temp RR Inner', 'tyreTempRRCenter': 'Tyre Temp RR Centre', 'tyreTempRROuter': 'Tyre Temp RR Outer',
                'brakeTempFL': 'Brake Temp FL', 'brakeTempFR': 'Brake Temp FR', 'brakeTempRL': 'Brake Temp RL', 'brakeTempRR': 'Brake Temp RR'
            };
            var renameMap = {};
            Object.keys(this.customMappings).forEach(function(originalCol) {
                var targetChannel = self.customMappings[originalCol];
                if (standardNames[targetChannel]) renameMap[originalCol] = standardNames[targetChannel];
            });
            
            this.referenceData = this.referenceData.map(function(row) {
                var newRow = Object.assign({}, row);
                Object.keys(renameMap).forEach(function(oldName) { if (newRow[oldName] !== undefined) newRow[renameMap[oldName]] = newRow[oldName]; });
                return newRow;
            });
            this.currentData = this.currentData.map(function(row) {
                var newRow = Object.assign({}, row);
                Object.keys(renameMap).forEach(function(oldName) { if (newRow[oldName] !== undefined) newRow[renameMap[oldName]] = newRow[oldName]; });
                return newRow;
            });
            
            this.showNotification('Mappings saved! Click "Analyze Telemetry" to process.', 'success');
        }
        this.detectChannels();
    }
    
    async analyzeTelemetry() {
        var self = this;
        if (!this.webhookUrl) { this.showNotification('Please configure webhook URL first', 'error'); return; }
        document.getElementById('loading-overlay').classList.remove('hidden');
        document.getElementById('loading-overlay').classList.add('flex');
        
        try {
            var sessionId = 'session_' + Date.now();
            var refData = this.referenceData;
            var currData = this.currentData;
            
            var channelMappings = {};
            if (this.detectedChannels) {
                Object.assign(channelMappings, this.detectedChannels.required || {});
                Object.assign(channelMappings, this.detectedChannels.optional || {});
            }
            Object.assign(channelMappings, this.customMappings || {});
            
            var columnsToKeep = [];
            for (var key in channelMappings) {
                var mapping = channelMappings[key];
                var colName = typeof mapping === 'string' ? mapping : (mapping && mapping.csvColumn) ? mapping.csvColumn : null;
                if (colName) columnsToKeep.push(colName);
            }
            
            var filterColumns = function(data) {
                return data.map(function(row) {
                    var filtered = {};
                    columnsToKeep.forEach(function(col) {
                        if (row[col] !== undefined) filtered[col] = row[col];
                    });
                    return filtered;
                });
            };
            
            var refDataFiltered = filterColumns(refData);
            var currDataFiltered = filterColumns(currData);
            
            var maxRows = 2000;
            if (refDataFiltered.length > maxRows) {
                var step = Math.ceil(refDataFiltered.length / maxRows);
                refDataFiltered = refDataFiltered.filter(function(_, i) { return i % step === 0; });
                currDataFiltered = currDataFiltered.filter(function(_, i) { return i % step === 0; });
            }
            
            console.log('Sending ' + refDataFiltered.length + ' rows with ' + columnsToKeep.length + ' channels');
            
            var payload = {
                reference_lap: refDataFiltered, current_lap: currDataFiltered,
                driver_name: document.getElementById('driver-name').value || 'Driver',
                track_name: document.getElementById('track-name').value || 'Track',
                channel_mappings: channelMappings,
                session_id: sessionId, timestamp: new Date().toISOString()
            };
            
            var response = await fetch(this.webhookUrl + '/webhook/telemetry-analysis', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error('HTTP error! status: ' + response.status);
            var results = await response.json();
            
            this.sessionId = results.session_id || sessionId;
            this.sessionData = results.session_data || results.analysis || {};
            this.analysisResults = results.analysis || {};
            this.displayAnalysisResults(results);
            document.getElementById('upload-section').classList.add('hidden');
            document.getElementById('results-section').classList.remove('hidden');
            this.addAyrtonMessage(results.ayrton_says || results.initial_message || "I have analyzed your data.");
        } catch (error) {
            console.error('Analysis error:', error);
            this.showNotification('Analysis failed: ' + error.message, 'error');
        } finally {
            document.getElementById('loading-overlay').classList.add('hidden');
        }
    }
    
    displayAnalysisResults(results) {
        var analysis = results.analysis || {};
        var sessionData = results.session_data || this.sessionData || {};
        
        var lapDelta = sessionData.timeDelta || sessionData.lapDelta || analysis.timeDelta || 0;
        document.getElementById('lap-delta').textContent = (lapDelta > 0 ? '+' : '') + lapDelta.toFixed(3) + 's';
        
        var gripUsage = this.calculateGripUsage();
        document.getElementById('g-force-usage').textContent = gripUsage.toFixed(0) + '%';
        
        var drivingStyle = lapDelta > 2 ? 'Learning' : lapDelta > 1 ? 'Building' : lapDelta > 0.5 ? 'Close' : lapDelta > 0 ? 'Competitive' : 'Faster!';
        document.getElementById('tire-status').textContent = drivingStyle;
        document.getElementById('setup-issue').textContent = lapDelta > 1 ? 'Focus Areas' : 'Fine Tuning';
        
        this.generateGraphs(analysis);
        this.displaySetupRecommendations(analysis);
        this.generateFullReport(analysis);
        
        // Generate analysis tab content (NOT popup)
        this.generateAnalysisTab(analysis, sessionData);
        
        // Auto-switch to analysis tab
        this.switchTab('analysis');
    }
    
    // ============================================
    // ANALYSIS TAB - Replaces popup
    // ============================================
    generateAnalysisTab(analysis, sessionData) {
        var self = this;
        var trackSegments = analysis.trackSegments || [];
        var tireAnalysis = analysis.tireAnalysis || {};
        var brakeAnalysis = analysis.brakeAnalysis || {};
        var fuelAnalysis = analysis.fuelAnalysis || {};
        var brakingTechnique = analysis.brakingTechnique || {};
        var summary = analysis.summary || {};
        var lapDelta = sessionData.lapDelta || sessionData.timeDelta || analysis.timeDelta || 0;
        var driverName = sessionData.driver || 'Driver';
        var trackName = sessionData.track || 'Track';
        
        // Get or create the analysis tab
        var analysisTab = document.getElementById('analysis-tab');
        if (!analysisTab) {
            analysisTab = document.createElement('div');
            analysisTab.id = 'analysis-tab';
            analysisTab.className = 'tab-content';
            var tabContainer = document.querySelector('.tab-content').parentElement;
            if (tabContainer) tabContainer.appendChild(analysisTab);
            
            // Add tab button
            var tabBtnContainer = document.querySelector('.flex.border-b') || document.querySelector('[class*="tab-btn"]').parentElement;
            if (tabBtnContainer && !document.querySelector('[data-tab="analysis"]')) {
                var analysisBtn = document.createElement('button');
                analysisBtn.className = 'tab-btn px-4 py-2 font-medium border-b-2 border-transparent text-gray-600 hover:text-purple-600';
                analysisBtn.setAttribute('data-tab', 'analysis');
                analysisBtn.innerHTML = '<i class="fas fa-clipboard-check mr-2"></i>Lap Analysis';
                analysisBtn.addEventListener('click', function() { self.switchTab('analysis'); });
                tabBtnContainer.appendChild(analysisBtn);
            }
        }
        
        var html = '';
        
        // Header
        html += '<div class="bg-gradient-to-r from-red-600 to-red-800 text-white p-6 rounded-lg mb-6">';
        html += '<div class="flex justify-between items-center">';
        html += '<div>';
        html += '<h1 class="text-2xl font-bold"><i class="fas fa-flag-checkered mr-3"></i>Lap Analysis Report</h1>';
        html += '<p class="text-red-200 mt-1">' + driverName + ' at ' + trackName + '</p>';
        html += '</div>';
        html += '<div class="text-right">';
        html += '<div class="text-3xl font-bold">' + (lapDelta > 0 ? '+' : '') + lapDelta.toFixed(3) + 's</div>';
        html += '<div class="text-red-200">' + (lapDelta > 0 ? 'Behind Reference' : 'Ahead of Reference') + '</div>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        
        // Sub-tabs
        html += '<div class="flex space-x-4 mb-6 border-b border-gray-200 pb-4">';
        html += '<button id="driving-tab-btn" onclick="document.getElementById(\'driving-section\').classList.remove(\'hidden\');document.getElementById(\'setup-section\').classList.add(\'hidden\');this.classList.add(\'bg-red-600\',\'text-white\');this.classList.remove(\'bg-gray-200\',\'text-gray-700\');document.getElementById(\'setup-tab-btn\').classList.remove(\'bg-red-600\',\'text-white\');document.getElementById(\'setup-tab-btn\').classList.add(\'bg-gray-200\',\'text-gray-700\')" class="px-6 py-3 rounded-lg font-semibold bg-red-600 text-white transition"><i class="fas fa-steering-wheel mr-2"></i>Driving Analysis</button>';
        html += '<button id="setup-tab-btn" onclick="document.getElementById(\'setup-section\').classList.remove(\'hidden\');document.getElementById(\'driving-section\').classList.add(\'hidden\');this.classList.add(\'bg-red-600\',\'text-white\');this.classList.remove(\'bg-gray-200\',\'text-gray-700\');document.getElementById(\'driving-tab-btn\').classList.remove(\'bg-red-600\',\'text-white\');document.getElementById(\'driving-tab-btn\').classList.add(\'bg-gray-200\',\'text-gray-700\')" class="px-6 py-3 rounded-lg font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition"><i class="fas fa-wrench mr-2"></i>Setup Recommendations</button>';
        html += '</div>';
        
        // DRIVING SECTION
        html += '<div id="driving-section">';
        
        // Summary card
        html += '<div class="bg-gray-800 rounded-xl p-6 mb-6 text-white">';
        html += '<h2 class="text-xl font-bold mb-4"><i class="fas fa-chart-line mr-2 text-yellow-400"></i>Overall Lap Summary</h2>';
        html += '<div class="grid grid-cols-4 gap-4 mb-4">';
        
        var cornerCount = summary.cornerCount || trackSegments.filter(function(s) { return s.type === 'corner'; }).length;
        var straightCount = summary.straightCount || trackSegments.filter(function(s) { return s.type === 'straight'; }).length;
        var totalTimeLoss = summary.totalTimeLoss || trackSegments.reduce(function(sum, s) { return sum + (s.timeLoss || 0); }, 0);
        var issueCount = summary.issueCount || trackSegments.reduce(function(sum, s) { return sum + (s.issues ? s.issues.length : 0); }, 0);
        
        html += '<div class="bg-gray-700 rounded-lg p-4 text-center"><div class="text-3xl font-bold">' + cornerCount + '</div><div class="text-gray-400">Corners</div></div>';
        html += '<div class="bg-gray-700 rounded-lg p-4 text-center"><div class="text-3xl font-bold">' + straightCount + '</div><div class="text-gray-400">Straights</div></div>';
        html += '<div class="bg-gray-700 rounded-lg p-4 text-center"><div class="text-3xl font-bold text-' + (issueCount > 5 ? 'red' : 'yellow') + '-400">' + issueCount + '</div><div class="text-gray-400">Issues</div></div>';
        html += '<div class="bg-gray-700 rounded-lg p-4 text-center"><div class="text-3xl font-bold text-red-400">~' + totalTimeLoss.toFixed(2) + 's</div><div class="text-gray-400">Time Loss</div></div>';
        html += '</div>';
        
        // Braking technique - comparative
        if (brakingTechnique.smoothnessVsRef || brakingTechnique.trailBrakingCount !== undefined) {
            html += '<div class="grid grid-cols-3 gap-4">';
            if (brakingTechnique.smoothnessVsRef) {
                html += '<div class="bg-gray-700/50 rounded-lg p-3"><span class="text-gray-400">Braking:</span> <span class="text-white font-bold">' + brakingTechnique.smoothnessVsRef + '</span></div>';
            }
            if (brakingTechnique.trailBrakingCount !== undefined) {
                html += '<div class="bg-gray-700/50 rounded-lg p-3"><span class="text-gray-400">Trail Braking:</span> <span class="text-white font-bold">' + brakingTechnique.trailBrakingCount + '/' + (brakingTechnique.totalCorners || cornerCount) + ' corners</span></div>';
            }
            if (brakingTechnique.trailBrakingRef !== undefined) {
                html += '<div class="bg-gray-700/50 rounded-lg p-3"><span class="text-gray-400">Ref Trail:</span> <span class="text-white font-bold">' + brakingTechnique.trailBrakingRef + '/' + (brakingTechnique.totalCorners || cornerCount) + '</span></div>';
            }
            html += '</div>';
        }
        html += '</div>';
        
        // Lap Walkthrough
        html += '<h2 class="text-xl font-bold mb-4"><i class="fas fa-road mr-2 text-blue-500"></i>Lap Walkthrough</h2>';
        
        if (trackSegments.length === 0) {
            html += '<div class="bg-yellow-100 border border-yellow-400 text-yellow-800 p-4 rounded-lg">';
            html += '<i class="fas fa-exclamation-triangle mr-2"></i>No segment data available. Make sure the AI analysis completed and max_tokens is set high enough (4096+).';
            html += '</div>';
        } else {
            trackSegments.forEach(function(segment, idx) {
                if (segment.type === 'corner') {
                    html += self.renderCornerCard(segment, idx);
                } else if (segment.type === 'straight') {
                    html += self.renderStraightCard(segment, idx);
                }
            });
        }
        
        html += '</div>'; // End driving section
        
        // SETUP SECTION
        html += '<div id="setup-section" class="hidden">';
        html += this.renderSetupSection(tireAnalysis, brakeAnalysis, fuelAnalysis);
        html += '</div>';
        
        analysisTab.innerHTML = html;
    }
    
    // ============================================
    // CORNER CARD - Shows current + reference speeds
    // ============================================
    renderCornerCard(segment, idx) {
        var hasIssues = segment.issues && segment.issues.length > 0;
        var bgColor = hasIssues ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200';
        
        var curr = segment.curr || {};
        var delta = segment.delta || {};
        var ref = segment.ref || {};
        
        var entrySpeed = curr.entrySpeed !== undefined ? curr.entrySpeed : '--';
        var apexSpeed = curr.apexSpeed !== undefined ? curr.apexSpeed : '--';
        var exitSpeed = curr.exitSpeed !== undefined ? curr.exitSpeed : '--';
        var peakBrake = curr.peakBrake !== undefined ? curr.peakBrake : '--';
        var trailBraking = curr.trailBraking;
        var trailDist = curr.trailBrakingDist || curr.trailBrakingDistance || 0;
        var gLat = curr.gLat;
        
        var deltaEntry = delta.entrySpeed !== undefined ? delta.entrySpeed : 0;
        var deltaApex = delta.apexSpeed !== undefined ? delta.apexSpeed : 0;
        var deltaExit = delta.exitSpeed !== undefined ? delta.exitSpeed : 0;
        
        // Calculate reference speeds (ref = curr - delta)
        var refEntry = ref.entrySpeed !== undefined ? ref.entrySpeed : (typeof entrySpeed === 'number' ? entrySpeed - deltaEntry : '--');
        var refApex = ref.apexSpeed !== undefined ? ref.apexSpeed : (typeof apexSpeed === 'number' ? apexSpeed - deltaApex : '--');
        var refExit = ref.exitSpeed !== undefined ? ref.exitSpeed : (typeof exitSpeed === 'number' ? exitSpeed - deltaExit : '--');
        
        var html = '<div class="' + bgColor + ' border rounded-xl p-5 mb-4">';
        
        // Header
        html += '<div class="flex justify-between items-start mb-4">';
        html += '<div>';
        html += '<h3 class="text-xl font-bold text-gray-800"><i class="fas fa-undo text-red-500 mr-2"></i>' + (segment.name || 'Turn ' + (idx + 1)) + '</h3>';
        html += '<span class="text-gray-500">' + (segment.cornerType || 'corner') + ' corner at ' + (segment.distance || 0) + 'm</span>';
        html += '</div>';
        if (segment.timeLoss > 0) {
            html += '<div class="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">~' + segment.timeLoss.toFixed(2) + 's lost</div>';
        } else {
            html += '<div class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium"><i class="fas fa-check mr-1"></i>Good</div>';
        }
        html += '</div>';
        
        // Speed comparison grid - shows Your speed, Ref speed, and Delta
        html += '<div class="grid grid-cols-3 gap-4 mb-4">';
        
        // Entry Speed
        html += '<div class="bg-white rounded-lg p-3 shadow-sm">';
        html += '<div class="text-gray-500 text-sm text-center mb-2">Entry Speed</div>';
        html += '<div class="flex justify-between items-center">';
        html += '<div class="text-center flex-1"><div class="text-purple-600 font-bold text-lg">' + entrySpeed + '</div><div class="text-xs text-gray-400">You</div></div>';
        html += '<div class="text-center px-2"><div class="text-' + (deltaEntry >= 0 ? 'green' : 'red') + '-600 font-bold">' + (deltaEntry >= 0 ? '+' : '') + deltaEntry + '</div><div class="text-xs text-gray-400">km/h</div></div>';
        html += '<div class="text-center flex-1"><div class="text-gray-600 font-bold text-lg">' + refEntry + '</div><div class="text-xs text-gray-400">Ref</div></div>';
        html += '</div></div>';
        
        // Apex Speed
        html += '<div class="bg-white rounded-lg p-3 shadow-sm">';
        html += '<div class="text-gray-500 text-sm text-center mb-2">Apex Speed</div>';
        html += '<div class="flex justify-between items-center">';
        html += '<div class="text-center flex-1"><div class="text-purple-600 font-bold text-lg">' + apexSpeed + '</div><div class="text-xs text-gray-400">You</div></div>';
        html += '<div class="text-center px-2"><div class="text-' + (deltaApex >= 0 ? 'green' : 'red') + '-600 font-bold">' + (deltaApex >= 0 ? '+' : '') + deltaApex + '</div><div class="text-xs text-gray-400">km/h</div></div>';
        html += '<div class="text-center flex-1"><div class="text-gray-600 font-bold text-lg">' + refApex + '</div><div class="text-xs text-gray-400">Ref</div></div>';
        html += '</div></div>';
        
        // Exit Speed
        html += '<div class="bg-white rounded-lg p-3 shadow-sm">';
        html += '<div class="text-gray-500 text-sm text-center mb-2">Exit Speed</div>';
        html += '<div class="flex justify-between items-center">';
        html += '<div class="text-center flex-1"><div class="text-purple-600 font-bold text-lg">' + exitSpeed + '</div><div class="text-xs text-gray-400">You</div></div>';
        html += '<div class="text-center px-2"><div class="text-' + (deltaExit >= 0 ? 'green' : 'red') + '-600 font-bold">' + (deltaExit >= 0 ? '+' : '') + deltaExit + '</div><div class="text-xs text-gray-400">km/h</div></div>';
        html += '<div class="text-center flex-1"><div class="text-gray-600 font-bold text-lg">' + refExit + '</div><div class="text-xs text-gray-400">Ref</div></div>';
        html += '</div></div>';
        
        html += '</div>';
        
        // Braking details
        html += '<div class="grid grid-cols-3 gap-3 mb-4">';
        
        html += '<div class="bg-gray-100 rounded p-2 text-center">';
        html += '<div class="text-xs text-gray-500">Peak Brake</div>';
        html += '<div class="text-gray-800 font-semibold">' + peakBrake + '%</div>';
        html += '</div>';
        
        // Smoothness - handle string or number
        html += '<div class="bg-gray-100 rounded p-2 text-center">';
        html += '<div class="text-xs text-gray-500">Smoothness</div>';
        if (segment.smoothness && typeof segment.smoothness === 'string') {
            var smoothColor = segment.smoothness.includes('rougher') ? 'text-red-600' : segment.smoothness.includes('smoother') ? 'text-green-600' : 'text-gray-800';
            html += '<div class="' + smoothColor + ' font-semibold text-xs">' + segment.smoothness + '</div>';
        } else if (curr.smoothness !== undefined && curr.smoothness !== null) {
            html += '<div class="text-gray-800 font-semibold">' + (typeof curr.smoothness === 'number' ? curr.smoothness + '/100' : curr.smoothness) + '</div>';
        } else {
            html += '<div class="text-gray-400 font-semibold">-</div>';
        }
        html += '</div>';
        
        html += '<div class="bg-gray-100 rounded p-2 text-center">';
        html += '<div class="text-xs text-gray-500">Trail Braking</div>';
        if (trailBraking === true) {
            html += '<div class="text-green-600 font-semibold">' + (trailDist > 0 ? trailDist + 'm' : 'Yes') + '</div>';
        } else if (trailBraking === false) {
            html += '<div class="text-red-600 font-semibold">None</div>';
        } else {
            html += '<div class="text-gray-400 font-semibold">-</div>';
        }
        html += '</div>';
        
        html += '</div>';
        
        // Issues & recommendations
        if (hasIssues) {
            html += '<div class="border-t border-gray-200 pt-4">';
            html += '<h4 class="font-semibold text-red-600 mb-2"><i class="fas fa-exclamation-triangle mr-2"></i>Issues</h4>';
            html += '<ul class="space-y-1 mb-3">';
            segment.issues.forEach(function(issue) {
                html += '<li class="text-gray-700 text-sm"><i class="fas fa-times text-red-500 mr-2"></i>' + issue + '</li>';
            });
            html += '</ul>';
            
            if (segment.recommendations && segment.recommendations.length > 0) {
                html += '<h4 class="font-semibold text-green-600 mb-2"><i class="fas fa-lightbulb mr-2"></i>Recommendations</h4>';
                html += '<ul class="space-y-1">';
                segment.recommendations.forEach(function(rec) {
                    html += '<li class="text-gray-700 text-sm"><i class="fas fa-arrow-right text-green-500 mr-2"></i>' + rec + '</li>';
                });
                html += '</ul>';
            }
            html += '</div>';
        }
        
        html += '</div>';
        return html;
    }
    
    // ============================================
    // STRAIGHT CARD - Fixed data access
    // ============================================
    renderStraightCard(segment, idx) {
        var hasIssues = segment.issues && segment.issues.length > 0;
        var bgColor = hasIssues ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200';
        
        var curr = segment.curr || {};
        var delta = segment.delta || {};
        
        var entrySpeed = curr.entrySpeed !== undefined ? curr.entrySpeed : '--';
        var maxSpeed = curr.maxSpeed !== undefined ? curr.maxSpeed : '--';
        var fullThrottle = curr.fullThrottlePercent !== undefined ? curr.fullThrottlePercent : (curr.fullThrottlePct !== undefined ? curr.fullThrottlePct : '--');
        
        var deltaEntry = delta.entrySpeed !== undefined ? delta.entrySpeed : 0;
        var deltaMax = delta.maxSpeed !== undefined ? delta.maxSpeed : 0;
        
        var html = '<div class="' + bgColor + ' border rounded-xl p-5 mb-4">';
        
        html += '<div class="flex justify-between items-start mb-4">';
        html += '<div>';
        html += '<h3 class="text-xl font-bold text-gray-800"><i class="fas fa-road text-blue-500 mr-2"></i>' + (segment.name || 'Straight ' + (idx + 1)) + '</h3>';
        html += '<span class="text-gray-500">' + (segment.length || 0) + 'm long</span>';
        html += '</div>';
        if (segment.timeLoss > 0) {
            html += '<div class="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium">~' + segment.timeLoss.toFixed(2) + 's lost</div>';
        } else {
            html += '<div class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium"><i class="fas fa-check mr-1"></i>Good</div>';
        }
        html += '</div>';
        
        html += '<div class="grid grid-cols-3 gap-4 mb-4">';
        
        html += '<div class="bg-white rounded-lg p-3 text-center shadow-sm">';
        html += '<div class="text-gray-500 text-sm">Entry Speed</div>';
        html += '<div class="text-gray-800 font-bold text-lg">' + entrySpeed + ' <span class="text-xs font-normal">km/h</span></div>';
        if (deltaEntry !== 0) html += '<div class="text-' + (deltaEntry >= 0 ? 'green' : 'red') + '-600 text-sm font-medium">' + (deltaEntry >= 0 ? '+' : '') + deltaEntry + '</div>';
        html += '</div>';
        
        html += '<div class="bg-white rounded-lg p-3 text-center shadow-sm">';
        html += '<div class="text-gray-500 text-sm">Top Speed</div>';
        html += '<div class="text-gray-800 font-bold text-lg">' + maxSpeed + ' <span class="text-xs font-normal">km/h</span></div>';
        if (deltaMax !== 0) html += '<div class="text-' + (deltaMax >= 0 ? 'green' : 'red') + '-600 text-sm font-medium">' + (deltaMax >= 0 ? '+' : '') + deltaMax + '</div>';
        html += '</div>';
        
        html += '<div class="bg-white rounded-lg p-3 text-center shadow-sm">';
        html += '<div class="text-gray-500 text-sm">Full Throttle</div>';
        html += '<div class="text-gray-800 font-bold text-lg">' + fullThrottle + '%</div>';
        html += '</div>';
        
        html += '</div>';
        
        if (hasIssues) {
            html += '<div class="border-t border-gray-200 pt-4">';
            html += '<h4 class="font-semibold text-yellow-600 mb-2"><i class="fas fa-exclamation-triangle mr-2"></i>Issues</h4>';
            html += '<ul class="space-y-1 mb-3">';
            segment.issues.forEach(function(issue) {
                html += '<li class="text-gray-700 text-sm"><i class="fas fa-times text-yellow-500 mr-2"></i>' + issue + '</li>';
            });
            html += '</ul>';
            
            if (segment.recommendations && segment.recommendations.length > 0) {
                html += '<h4 class="font-semibold text-green-600 mb-2"><i class="fas fa-lightbulb mr-2"></i>Recommendations</h4>';
                html += '<ul class="space-y-1">';
                segment.recommendations.forEach(function(rec) {
                    html += '<li class="text-gray-700 text-sm"><i class="fas fa-arrow-right text-green-500 mr-2"></i>' + rec + '</li>';
                });
                html += '</ul>';
            }
            html += '</div>';
        }
        
        html += '</div>';
        return html;
    }
    
    // ============================================
    // SETUP SECTION
    // ============================================
    renderSetupSection(tireAnalysis, brakeAnalysis, fuelAnalysis) {
        var html = '';
        
        html += '<div class="bg-white rounded-xl p-6 mb-6 shadow">';
        html += '<h2 class="text-xl font-bold mb-4 text-gray-800"><i class="fas fa-cogs mr-2 text-green-500"></i>Setup Recommendations</h2>';
        html += '<p class="text-gray-500 mb-6">Based on tire temperatures, brake data, and driving patterns:</p>';
        
        // Tire section
        if (tireAnalysis && tireAnalysis.available) {
            html += '<div class="mb-6">';
            html += '<h3 class="text-lg font-semibold text-gray-800 mb-3"><i class="fas fa-circle text-yellow-500 mr-2"></i>Tire Setup</h3>';
            html += '<div class="grid grid-cols-2 gap-4 mb-4">';
            
            ['fl', 'fr', 'rl', 'rr'].forEach(function(corner) {
                var data = tireAnalysis[corner];
                if (data && data.avg) {
                    var bgColor = data.avg > 100 ? 'bg-red-100 border-red-300' : data.avg < 70 ? 'bg-blue-100 border-blue-300' : 'bg-green-100 border-green-300';
                    html += '<div class="' + bgColor + ' border rounded-lg p-4">';
                    html += '<div class="font-bold text-gray-800">' + corner.toUpperCase() + ' Tire</div>';
                    if (data.inner !== null) html += '<div class="text-sm text-gray-600">Inner: ' + Math.round(data.inner) + '°C</div>';
                    if (data.center !== null) html += '<div class="text-sm text-gray-600">Center: ' + Math.round(data.center) + '°C</div>';
                    if (data.outer !== null) html += '<div class="text-sm text-gray-600">Outer: ' + Math.round(data.outer) + '°C</div>';
                    html += '</div>';
                }
            });
            html += '</div>';
            
            if (tireAnalysis.issues && tireAnalysis.issues.length > 0) {
                html += '<div class="bg-yellow-50 border border-yellow-300 rounded-lg p-4">';
                html += '<h4 class="font-semibold text-yellow-700 mb-2">Recommended Changes:</h4>';
                html += '<ul class="space-y-2">';
                tireAnalysis.issues.forEach(function(issue) {
                    html += '<li class="text-gray-700"><i class="fas fa-wrench text-yellow-500 mr-2"></i>' + (issue.issue || issue) + '</li>';
                });
                html += '</ul>';
                html += '</div>';
            }
            html += '</div>';
        } else {
            html += '<div class="bg-gray-100 border border-gray-300 rounded-lg p-4 mb-6">';
            html += '<p class="text-gray-500"><i class="fas fa-info-circle mr-2"></i>No tire temperature data available</p>';
            html += '</div>';
        }
        
        // Brake section
        if (brakeAnalysis && brakeAnalysis.available) {
            html += '<div class="mb-6">';
            html += '<h3 class="text-lg font-semibold text-gray-800 mb-3"><i class="fas fa-compact-disc text-red-500 mr-2"></i>Brake Setup</h3>';
            html += '<div class="grid grid-cols-4 gap-4 mb-4">';
            if (brakeAnalysis.fl !== null) html += '<div class="bg-gray-100 rounded-lg p-3 text-center"><div class="text-xl font-bold">' + Math.round(brakeAnalysis.fl) + '°C</div><div class="text-gray-500 text-sm">FL</div></div>';
            if (brakeAnalysis.fr !== null) html += '<div class="bg-gray-100 rounded-lg p-3 text-center"><div class="text-xl font-bold">' + Math.round(brakeAnalysis.fr) + '°C</div><div class="text-gray-500 text-sm">FR</div></div>';
            if (brakeAnalysis.rl !== null) html += '<div class="bg-gray-100 rounded-lg p-3 text-center"><div class="text-xl font-bold">' + Math.round(brakeAnalysis.rl) + '°C</div><div class="text-gray-500 text-sm">RL</div></div>';
            if (brakeAnalysis.rr !== null) html += '<div class="bg-gray-100 rounded-lg p-3 text-center"><div class="text-xl font-bold">' + Math.round(brakeAnalysis.rr) + '°C</div><div class="text-gray-500 text-sm">RR</div></div>';
            html += '</div>';
            html += '</div>';
        }
        
        // Fuel section
        if (fuelAnalysis && fuelAnalysis.available && fuelAnalysis.fuelPerLap) {
            html += '<div class="mb-6">';
            html += '<h3 class="text-lg font-semibold text-gray-800 mb-3"><i class="fas fa-gas-pump text-blue-500 mr-2"></i>Fuel Strategy</h3>';
            html += '<div class="bg-gray-100 rounded-lg p-4">';
            html += '<div class="grid grid-cols-3 gap-4">';
            html += '<div class="text-center"><div class="text-xl font-bold">' + fuelAnalysis.fuelPerLap.toFixed(2) + ' L</div><div class="text-gray-500 text-sm">Per Lap</div></div>';
            if (fuelAnalysis.estimatedRange) html += '<div class="text-center"><div class="text-xl font-bold">' + fuelAnalysis.estimatedRange + '</div><div class="text-gray-500 text-sm">Laps Left</div></div>';
            if (fuelAnalysis.endFuel) html += '<div class="text-center"><div class="text-xl font-bold">' + fuelAnalysis.endFuel.toFixed(1) + ' L</div><div class="text-gray-500 text-sm">Current</div></div>';
            html += '</div>';
            html += '</div>';
            html += '</div>';
        }
        
        html += '</div>';
        return html;
    }
    
    calculateGripUsage() {
        var self = this;
        if (!this.referenceData || !this.currentData || !this.detectedChannels) return 75;
        
        var gLatChannel = null;
        var channels = this.detectedChannels.optional || {};
        if (channels.gLat) gLatChannel = channels.gLat.csvColumn || channels.gLat;
        
        if (!gLatChannel) {
            var possibleNames = ['G Force Lat', 'gLat', 'Lateral G', 'LateralAccel', 'G_Lat'];
            var sampleRow = this.referenceData[0];
            for (var i = 0; i < possibleNames.length; i++) {
                if (sampleRow && sampleRow[possibleNames[i]] !== undefined) {
                    gLatChannel = possibleNames[i];
                    break;
                }
            }
        }
        
        if (!gLatChannel) return 75;
        
        var refGLat = this.referenceData.map(function(row) {
            var val = parseFloat(row[gLatChannel]);
            return isNaN(val) ? 0 : Math.abs(val);
        }).filter(function(g) { return g > 0.1; });
        
        var currGLat = this.currentData.map(function(row) {
            var val = parseFloat(row[gLatChannel]);
            return isNaN(val) ? 0 : Math.abs(val);
        }).filter(function(g) { return g > 0.1; });
        
        if (refGLat.length === 0 || currGLat.length === 0) return 75;
        
        refGLat.sort(function(a, b) { return b - a; });
        currGLat.sort(function(a, b) { return b - a; });
        
        var top10PercentRef = refGLat.slice(0, Math.ceil(refGLat.length * 0.1));
        var top10PercentCurr = currGLat.slice(0, Math.ceil(currGLat.length * 0.1));
        
        var avgTopRefG = top10PercentRef.reduce(function(a, b) { return a + b; }, 0) / top10PercentRef.length;
        var avgTopCurrG = top10PercentCurr.reduce(function(a, b) { return a + b; }, 0) / top10PercentCurr.length;
        
        if (avgTopRefG > 0) {
            var gripUsage = (avgTopCurrG / avgTopRefG) * 100;
            return Math.min(Math.max(gripUsage, 0), 120);
        }
        return 75;
    }
    
    generateGraphs(analysis) {
        this.generateTrackMap();
        this.generateTelemetryOverlays();
        this.generateSectorTimeChart(analysis);
        this.generateSpeedComparison(analysis);
        this.setupCustomOverlayControls();
        
        setTimeout(function() {
            ['track-map', 'speed-overlay', 'throttle-overlay', 'brake-overlay', 'steering-overlay', 'glat-overlay', 'glong-overlay', 'gear-overlay', 'sector-time-chart', 'speed-comparison'].forEach(function(id) {
                var el = document.getElementById(id);
                if (el && el.data) Plotly.Plots.resize(el);
            });
        }, 200);
    }
    
    generateTrackMap() {
        var self = this;
        if (!this.referenceData || !this.currentData) { 
            document.getElementById('track-map').innerHTML = '<p class="text-gray-400 text-center py-20">No track data</p>'; 
            return; 
        }
        var getValue = function(row, names, def) {
            for (var i = 0; i < names.length; i++) {
                if (row[names[i]] !== undefined && row[names[i]] !== null && row[names[i]] !== '') {
                    var val = parseFloat(row[names[i]]);
                    if (!isNaN(val)) return val;
                }
            }
            return def;
        };
        var speedNames = ['Ground Speed', 'Speed', 'Drive Speed'];
        var steerNames = ['Steered Angle', 'Steering Angle', 'Steer'];
        var gLatNames = ['G Force Lat', 'Lateral G'];
        var yawNames = ['Gyro Yaw Velocity', 'Yaw Rate'];
        var latNames = ['GPS Latitude', 'Latitude', 'Lat'];
        var lonNames = ['GPS Longitude', 'Longitude', 'Lon'];
        var distNames = ['Distance', 'Dist', 'Lap Distance', 'LapDist'];
        var iRacingPosXNames = ['CarPosX', 'PosX', 'Car Pos X'];
        var iRacingPosZNames = ['CarPosZ', 'PosZ', 'Car Pos Z'];
        var sampleRate = Math.max(1, Math.floor(this.referenceData.length / 500));
        
        var sampleRow = this.referenceData[0];
        var hasGPS = getValue(sampleRow, latNames, null) !== null && getValue(sampleRow, lonNames, null) !== null;
        var hasIRacingPos = getValue(sampleRow, iRacingPosXNames, null) !== null && getValue(sampleRow, iRacingPosZNames, null) !== null;
        
        var positionSource = 'reconstructed';
        if (hasGPS) positionSource = 'GPS';
        else if (hasIRacingPos) positionSource = 'iRacing';
        
        var buildTrack = function(data, source) {
            var positions = [];
            if (source === 'GPS') {
                for (var i = 0; i < data.length; i += sampleRate) {
                    var row = data[i];
                    var lat = getValue(row, latNames, null);
                    var lon = getValue(row, lonNames, null);
                    var speed = getValue(row, speedNames, 100);
                    var dist = getValue(row, distNames, 0);
                    if (lat !== null && lon !== null) positions.push({ x: lon, y: lat, speed: speed, heading: 0, distance: dist });
                }
            } else if (source === 'iRacing') {
                for (var i = 0; i < data.length; i += sampleRate) {
                    var row = data[i];
                    var posX = getValue(row, iRacingPosXNames, null);
                    var posZ = getValue(row, iRacingPosZNames, null);
                    var speed = getValue(row, speedNames, 100);
                    var dist = getValue(row, distNames, 0);
                    if (posX !== null && posZ !== null) positions.push({ x: posX, y: posZ, speed: speed, heading: 0, distance: dist });
                }
            } else {
                var x = 0, y = 0, heading = 0, dt = 0.01;
                for (var i = 0; i < data.length; i += sampleRate) {
                    var row = data[i];
                    var speed = getValue(row, speedNames, 100) / 3.6;
                    var steer = getValue(row, steerNames, 0) * (Math.PI / 180);
                    var gLat = getValue(row, gLatNames, 0);
                    var yawRate = getValue(row, yawNames, 0) * (Math.PI / 180);
                    var dist = getValue(row, distNames, 0);
                    var turnRate;
                    if (Math.abs(yawRate) > 0.001) turnRate = yawRate * dt * sampleRate;
                    else if (Math.abs(gLat) > 0.05) turnRate = (gLat * 9.81 / Math.max(speed, 10)) * dt * sampleRate;
                    else turnRate = (speed * Math.tan(steer * 0.1) / 2.5) * dt * sampleRate;
                    heading += turnRate;
                    var ds = speed * dt * sampleRate;
                    x += ds * Math.cos(heading);
                    y += ds * Math.sin(heading);
                    positions.push({ x: x, y: y, speed: getValue(row, speedNames, 100), heading: heading, distance: dist });
                }
                return positions;
            }
            for (var i = 0; i < positions.length - 1; i++) {
                var dx = positions[i + 1].x - positions[i].x;
                var dy = positions[i + 1].y - positions[i].y;
                positions[i].heading = Math.atan2(dy, dx);
            }
            if (positions.length > 1) positions[positions.length - 1].heading = positions[positions.length - 2].heading;
            return positions;
        };
        
        var refTrack = buildTrack(this.referenceData, positionSource);
        var currTrack = buildTrack(this.currentData, positionSource);
        
        if (refTrack.length < 10) { 
            document.getElementById('track-map').innerHTML = '<p class="text-gray-400 text-center py-20">Insufficient data</p>'; 
            return; 
        }
        
        var allX = refTrack.map(function(p) { return p.x; }).concat(currTrack.map(function(p) { return p.x; }));
        var allY = refTrack.map(function(p) { return p.y; }).concat(currTrack.map(function(p) { return p.y; }));
        var minX = Math.min.apply(null, allX), maxX = Math.max.apply(null, allX);
        var minY = Math.min.apply(null, allY), maxY = Math.max.apply(null, allY);
        var centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2;
        var scale = Math.max(maxX - minX, maxY - minY) || 1;
        var normalize = function(track) { 
            return track.map(function(p) { return { x: (p.x - centerX) / scale, y: (p.y - centerY) / scale, speed: p.speed, heading: p.heading, distance: p.distance }; }); 
        };
        
        var refNorm = normalize(refTrack);
        var currNorm = normalize(currTrack);
        var allTraces = [];
        var trackName = this.selectedTrack ? this.selectedTrack.name : 'Track';
        var sourceLabel = positionSource === 'GPS' ? ' (GPS)' : positionSource === 'iRacing' ? ' (iRacing)' : '';
        var trackWidth = 0.03;
        var outerEdge = { x: [], y: [] };
        var innerEdge = { x: [], y: [] };
        
        for (var i = 0; i < refNorm.length; i++) {
            var p = refNorm[i];
            var perpX = Math.cos(p.heading + Math.PI / 2);
            var perpY = Math.sin(p.heading + Math.PI / 2);
            outerEdge.x.push(p.x + perpX * trackWidth);
            outerEdge.y.push(p.y + perpY * trackWidth);
            innerEdge.x.push(p.x - perpX * trackWidth);
            innerEdge.y.push(p.y - perpY * trackWidth);
        }
        
        var trackSurfaceX = outerEdge.x.concat(innerEdge.x.slice().reverse());
        var trackSurfaceY = outerEdge.y.concat(innerEdge.y.slice().reverse());
        
        allTraces.push({
            x: trackSurfaceX, y: trackSurfaceY, fill: 'toself', fillcolor: 'rgba(55, 65, 81, 0.8)',
            line: { color: 'rgba(55, 65, 81, 0.8)', width: 0 }, mode: 'lines', name: trackName + sourceLabel, hoverinfo: 'skip', showlegend: true
        });
        allTraces.push({ x: outerEdge.x, y: outerEdge.y, mode: 'lines', line: { color: '#ffffff', width: 2 }, hoverinfo: 'skip', showlegend: false });
        allTraces.push({ x: innerEdge.x, y: innerEdge.y, mode: 'lines', line: { color: '#ffffff', width: 2 }, hoverinfo: 'skip', showlegend: false });
        allTraces.push({ x: refNorm.map(function(p) { return p.x; }), y: refNorm.map(function(p) { return p.y; }), mode: 'lines', name: 'Reference', line: { color: '#9ca3af', width: 4 }, hoverinfo: 'name' });
        
        var allSpeeds = currNorm.map(function(p) { return p.speed; });
        var minSpeed = Math.min.apply(null, allSpeeds);
        var maxSpeed = Math.max.apply(null, allSpeeds);
        var getColor = function(speed) {
            var ratio = Math.max(0, Math.min(1, (speed - minSpeed) / (maxSpeed - minSpeed || 1)));
            if (ratio < 0.5) return 'rgb(255,' + Math.round(ratio * 2 * 255) + ',0)';
            return 'rgb(' + Math.round((1 - (ratio - 0.5) * 2) * 255) + ',255,0)';
        };
        
        for (var i = 0; i < currNorm.length - 1; i++) {
            allTraces.push({ 
                x: [currNorm[i].x, currNorm[i + 1].x], y: [currNorm[i].y, currNorm[i + 1].y], 
                mode: 'lines', showlegend: i === 0, name: i === 0 ? 'Your Lap (colored by speed)' : '', 
                line: { color: getColor(currNorm[i].speed), width: 3 }, hoverinfo: 'skip' 
            });
        }
        
        // Add segment markers (Turns and Straights) from analysis
        var annotations = [];
        var segmentMarkers = { x: [], y: [], text: [], colors: [] };
        
        if (this.analysisResults && this.analysisResults.trackSegments) {
            var segments = this.analysisResults.trackSegments;
            
            // Helper function to find track position for a given distance
            var findPositionAtDistance = function(targetDist) {
                var bestIdx = 0;
                var bestDiff = Infinity;
                for (var i = 0; i < refNorm.length; i++) {
                    var diff = Math.abs((refNorm[i].distance || 0) - targetDist);
                    if (diff < bestDiff) {
                        bestDiff = diff;
                        bestIdx = i;
                    }
                }
                return refNorm[bestIdx] || refNorm[0];
            };
            
            var turnCount = 0;
            var straightCount = 0;
            
            segments.forEach(function(segment) {
                var dist = segment.distance || 0;
                var pos = findPositionAtDistance(dist);
                
                if (segment.type === 'corner') {
                    turnCount++;
                    var label = 'T' + turnCount;
                    var hasIssues = segment.issues && segment.issues.length > 0;
                    
                    segmentMarkers.x.push(pos.x);
                    segmentMarkers.y.push(pos.y);
                    segmentMarkers.text.push(label);
                    segmentMarkers.colors.push(hasIssues ? '#ef4444' : '#22c55e');
                    
                    annotations.push({
                        x: pos.x,
                        y: pos.y,
                        text: label,
                        showarrow: false,
                        font: { color: '#ffffff', size: 10, family: 'Arial Black' },
                        bgcolor: hasIssues ? '#ef4444' : '#22c55e',
                        bordercolor: '#ffffff',
                        borderwidth: 1,
                        borderpad: 3,
                        opacity: 0.9
                    });
                } else if (segment.type === 'straight') {
                    straightCount++;
                    var label = 'S' + straightCount;
                    
                    segmentMarkers.x.push(pos.x);
                    segmentMarkers.y.push(pos.y);
                    segmentMarkers.text.push(label);
                    segmentMarkers.colors.push('#3b82f6');
                    
                    annotations.push({
                        x: pos.x,
                        y: pos.y,
                        text: label,
                        showarrow: false,
                        font: { color: '#ffffff', size: 10, family: 'Arial Black' },
                        bgcolor: '#3b82f6',
                        bordercolor: '#ffffff',
                        borderwidth: 1,
                        borderpad: 3,
                        opacity: 0.9
                    });
                }
            });
        }
        
        var layout = { 
            showlegend: true, legend: { x: 0, y: 1, bgcolor: 'rgba(0,0,0,0.7)', font: { color: '#fff', size: 11 } }, 
            xaxis: { visible: false, scaleanchor: 'y' }, yaxis: { visible: false }, 
            margin: { t: 5, b: 5, l: 5, r: 5 }, paper_bgcolor: '#1f2937', plot_bgcolor: '#1f2937', autosize: true,
            annotations: annotations
        };
        Plotly.newPlot('track-map', allTraces, layout, { responsive: true, displayModeBar: false });
    }
    
    getOverlayChannels() {
        var refColor = '#6b7280', yourColor = '#8b5cf6';
        return {
            speed: { names: ['Ground Speed', 'Speed', 'Drive Speed'], label: 'Speed', unit: 'km/h', color: { ref: refColor, curr: yourColor } },
            throttle: { names: ['Throttle Pos', 'Throttle', 'TPS'], label: 'Throttle', unit: '%', color: { ref: refColor, curr: yourColor } },
            brake: { names: ['Brake Pres Front', 'Brake Pressure', 'Brake'], label: 'Brake', unit: '%', color: { ref: refColor, curr: yourColor } },
            steering: { names: ['Steered Angle', 'Steering Angle', 'Steer'], label: 'Steering', unit: 'deg', color: { ref: refColor, curr: yourColor } },
            gLat: { names: ['G Force Lat', 'Lateral G'], label: 'Lateral G', unit: 'G', color: { ref: refColor, curr: yourColor } },
            gLong: { names: ['G Force Long', 'Longitudinal G'], label: 'Long G', unit: 'G', color: { ref: refColor, curr: yourColor } },
            gear: { names: ['Gear', 'gear'], label: 'Gear', unit: '', color: { ref: refColor, curr: yourColor } },
            rpm: { names: ['Engine RPM', 'RPM'], label: 'RPM', unit: 'rpm', color: { ref: refColor, curr: yourColor } }
        };
    }
    
    getValue(row, names, def) {
        for (var i = 0; i < names.length; i++) {
            if (row[names[i]] !== undefined && row[names[i]] !== null && row[names[i]] !== '') {
                var val = parseFloat(row[names[i]]);
                if (!isNaN(val)) return val;
            }
        }
        return def;
    }
    
    generateTelemetryOverlays() {
        var self = this;
        if (!this.referenceData || !this.currentData) return;
        var distNames = ['Distance', 'Dist', 'Lap Distance', 'LapDist'];
        var channels = this.getOverlayChannels();
        var sampleRate = Math.max(1, Math.floor(this.referenceData.length / 500));
        var refData = this.referenceData.filter(function(_, i) { return i % sampleRate === 0; });
        var currData = this.currentData.filter(function(_, i) { return i % sampleRate === 0; });
        var refDist = refData.map(function(row) { return self.getValue(row, distNames, null); });
        var currDist = currData.map(function(row) { return self.getValue(row, distNames, null); });
        
        this.generateSingleOverlay('speed-overlay', refData, currData, refDist, currDist, channels.speed);
        this.generateSingleOverlay('throttle-overlay', refData, currData, refDist, currDist, channels.throttle);
        this.generateSingleOverlay('brake-overlay', refData, currData, refDist, currDist, channels.brake);
        this.generateSingleOverlay('steering-overlay', refData, currData, refDist, currDist, channels.steering);
        this.generateSingleOverlay('glat-overlay', refData, currData, refDist, currDist, channels.gLat);
        this.generateSingleOverlay('glong-overlay', refData, currData, refDist, currDist, channels.gLong);
        
        var hasGear = refData.some(function(row) { return self.getValue(row, channels.gear.names, null) !== null; });
        var gearContainer = document.getElementById('gear-overlay');
        if (hasGear) {
            this.generateSingleOverlay('gear-overlay', refData, currData, refDist, currDist, channels.gear);
        } else if (gearContainer) {
            gearContainer.parentElement.style.display = 'none';
        }
    }
    
    generateSingleOverlay(containerId, refData, currData, refDist, currDist, channelConfig) {
        var self = this;
        var container = document.getElementById(containerId);
        if (!container) return;
        var refX = [], refY = [];
        refData.forEach(function(row, i) { var dist = refDist[i]; var val = self.getValue(row, channelConfig.names, null); if (dist !== null && val !== null) { refX.push(dist); refY.push(val); } });
        var currX = [], currY = [];
        currData.forEach(function(row, i) { var dist = currDist[i]; var val = self.getValue(row, channelConfig.names, null); if (dist !== null && val !== null) { currX.push(dist); currY.push(val); } });
        if (refX.length === 0 && currX.length === 0) { container.innerHTML = '<p class="text-gray-400 text-center py-16 text-sm">No ' + channelConfig.label + ' data</p>'; return; }
        var traces = [];
        if (refX.length > 0) traces.push({ x: refX, y: refY, mode: 'lines', name: 'Reference', line: { color: channelConfig.color.ref, width: 1.5 }, hovertemplate: 'Ref: %{y:.2f} ' + channelConfig.unit + '<extra></extra>' });
        if (currX.length > 0) traces.push({ x: currX, y: currY, mode: 'lines', name: 'Your Lap', line: { color: channelConfig.color.curr, width: 2 }, hovertemplate: 'You: %{y:.2f} ' + channelConfig.unit + '<extra></extra>' });
        
        // Add turn markers as vertical lines and annotations
        var shapes = [];
        var annotations = [];
        if (this.analysisResults && this.analysisResults.trackSegments) {
            var turnCount = 0;
            var allY = refY.concat(currY);
            var yMin = Math.min.apply(null, allY);
            var yMax = Math.max.apply(null, allY);
            
            this.analysisResults.trackSegments.forEach(function(segment) {
                if (segment.type === 'corner') {
                    turnCount++;
                    var dist = segment.distance || 0;
                    var hasIssues = segment.issues && segment.issues.length > 0;
                    var color = hasIssues ? 'rgba(239, 68, 68, 0.6)' : 'rgba(34, 197, 94, 0.4)';
                    
                    // Vertical line at turn location
                    shapes.push({
                        type: 'line',
                        x0: dist, x1: dist,
                        y0: yMin, y1: yMax,
                        line: { color: color, width: 2, dash: 'dot' }
                    });
                    
                    // Label at top
                    annotations.push({
                        x: dist,
                        y: yMax,
                        text: 'T' + turnCount,
                        showarrow: false,
                        font: { color: hasIssues ? '#ef4444' : '#22c55e', size: 9, family: 'Arial' },
                        yshift: 10
                    });
                }
            });
        }
        
        var layout = { 
            xaxis: { title: 'Distance (m)', tickfont: { size: 10 } }, 
            yaxis: { title: channelConfig.unit, tickfont: { size: 10 } }, 
            margin: { t: 20, b: 40, l: 50, r: 10 }, 
            legend: { orientation: 'h', y: 1.1, x: 0.5, xanchor: 'center', font: { size: 10 } }, 
            hovermode: 'x unified', 
            autosize: true,
            shapes: shapes,
            annotations: annotations
        };
        Plotly.newPlot(containerId, traces, layout, { responsive: true, displayModeBar: false });
    }
    
    setupCustomOverlayControls() {
        var self = this;
        var select = document.getElementById('custom-channel-select');
        var addBtn = document.getElementById('add-custom-overlay-btn');
        var clearBtn = document.getElementById('clear-custom-overlays-btn');
        if (!select) return;
        var sampleRow = this.referenceData ? this.referenceData[0] : {};
        var allColumns = Object.keys(sampleRow);
        var channels = this.getOverlayChannels();
        var standardNames = [];
        ['speed', 'throttle', 'brake', 'steering', 'gLat', 'gLong', 'gear'].forEach(function(ch) { if (channels[ch]) standardNames = standardNames.concat(channels[ch].names); });
        select.innerHTML = '<option value="">-- Select Channel --</option>';
        var otherOptgroup = document.createElement('optgroup');
        otherOptgroup.label = 'Other Columns';
        var addedCount = 0;
        allColumns.forEach(function(col) {
            var isStandard = standardNames.some(function(name) { return col.toLowerCase() === name.toLowerCase(); });
            var isDistTime = ['Time', 'Distance', 'Lap Distance'].some(function(name) { return col.toLowerCase() === name.toLowerCase(); });
            if (!isStandard && !isDistTime && addedCount < 50) { var option = document.createElement('option'); option.value = 'custom:' + col; option.textContent = col; otherOptgroup.appendChild(option); addedCount++; }
        });
        if (otherOptgroup.children.length > 0) select.appendChild(otherOptgroup);
        if (addBtn) addBtn.onclick = function() {
            var selectedValue = select.value;
            if (!selectedValue) { self.showNotification('Select a channel', 'error'); return; }
            if (self.customOverlays.indexOf(selectedValue) !== -1) { self.showNotification('Already added', 'error'); return; }
            self.customOverlays.push(selectedValue);
            self.addCustomOverlayChart(selectedValue);
            select.value = '';
        };
        if (clearBtn) clearBtn.onclick = function() { self.customOverlays = []; var container = document.getElementById('custom-overlays-container'); if (container) container.innerHTML = ''; };
    }
    
    addCustomOverlayChart(channelValue) {
        var self = this;
        var container = document.getElementById('custom-overlays-container');
        if (!container) return;
        var distNames = ['Distance', 'Dist', 'Lap Distance', 'LapDist'];
        var sampleRate = Math.max(1, Math.floor(this.referenceData.length / 500));
        var refData = this.referenceData.filter(function(_, i) { return i % sampleRate === 0; });
        var currData = this.currentData.filter(function(_, i) { return i % sampleRate === 0; });
        var chartId = 'custom-overlay-' + this.customOverlays.length;
        var chartDiv = document.createElement('div');
        chartDiv.className = 'relative';
        var colName = channelValue.replace('custom:', '');
        chartDiv.innerHTML = '<button class="absolute top-0 right-0 z-10 bg-red-500 text-white rounded-full w-6 h-6 text-xs hover:bg-red-600" onclick="this.parentElement.remove();">&times;</button><h4 class="font-semibold mb-2 text-sm pr-8">' + colName + '</h4><div id="' + chartId + '" class="bg-gray-50 rounded border" style="height: 280px; width: 100%;"></div>';
        container.appendChild(chartDiv);
        var refX = [], refY = [], currX = [], currY = [];
        refData.forEach(function(row) { var dist = self.getValue(row, distNames, null); var val = self.getValue(row, [colName], null); if (dist !== null && val !== null) { refX.push(dist); refY.push(val); } });
        currData.forEach(function(row) { var dist = self.getValue(row, distNames, null); var val = self.getValue(row, [colName], null); if (dist !== null && val !== null) { currX.push(dist); currY.push(val); } });
        var traces = [];
        if (refX.length > 0) traces.push({ x: refX, y: refY, mode: 'lines', name: 'Reference', line: { color: '#6b7280', width: 1.5 } });
        if (currX.length > 0) traces.push({ x: currX, y: currY, mode: 'lines', name: 'Your Lap', line: { color: '#8b5cf6', width: 2 } });
        var layout = { xaxis: { title: 'Distance (m)', tickfont: { size: 10 } }, yaxis: { tickfont: { size: 10 } }, margin: { t: 10, b: 40, l: 50, r: 10 }, legend: { orientation: 'h', y: 1.05, x: 0.5, xanchor: 'center', font: { size: 10 } }, hovermode: 'x unified', autosize: true };
        Plotly.newPlot(chartId, traces, layout, { responsive: true, displayModeBar: false });
    }
    
    generateSectorTimeChart(analysis) {
        var container = document.getElementById('sector-time-chart');
        if (!container) return;
        if (!analysis.sectors || analysis.sectors.length === 0) { container.innerHTML = '<p class="text-gray-500 text-center py-10">No sector data</p>'; return; }
        var sectorLabels = analysis.sectors.map(function(s) { return 'Sector ' + s.sector; });
        var timeDeltas = analysis.sectors.map(function(s) { return s.timeDelta !== undefined ? s.timeDelta : -(s.avgSpeedDelta || 0) * 0.02; });
        var colors = timeDeltas.map(function(t) { return t > 0 ? '#ef4444' : '#22c55e'; });
        var trace = { x: sectorLabels, y: timeDeltas, type: 'bar', marker: { color: colors }, text: timeDeltas.map(function(t) { return (t > 0 ? '+' : '') + t.toFixed(3) + 's'; }), textposition: 'outside' };
        var layout = { yaxis: { title: 'Time Delta (s)', zeroline: true, zerolinewidth: 2, zerolinecolor: '#000' }, margin: { t: 30, b: 40, l: 60, r: 20 } };
        Plotly.newPlot('sector-time-chart', [trace], layout, { responsive: true });
    }
    
    generateSpeedComparison(analysis) {
        var container = document.getElementById('speed-comparison');
        if (!container) return;
        if (!analysis.avgSpeedCurr) { container.innerHTML = '<p class="text-gray-500 text-center py-10">No speed data</p>'; return; }
        var yourTrace = { x: ['Average', 'Top', 'Min Corner'], y: [analysis.avgSpeedCurr || 0, analysis.maxSpeedCurr || 0, analysis.minSpeedCurr || 0], type: 'bar', name: 'Your Lap', marker: { color: '#8b5cf6' } };
        var refTrace = { x: ['Average', 'Top', 'Min Corner'], y: [analysis.avgSpeedRef || 0, analysis.maxSpeedRef || 0, analysis.minSpeedRef || 0], type: 'bar', name: 'Reference', marker: { color: '#6b7280' } };
        var layout = { barmode: 'group', yaxis: { title: 'Speed (km/h)' }, margin: { t: 30, b: 40, l: 50, r: 20 }, legend: { orientation: 'h', y: -0.15 } };
        Plotly.newPlot('speed-comparison', [yourTrace, refTrace], layout, { responsive: true });
    }
    
    displaySetupRecommendations(analysis) {
        var container = document.getElementById('setup-recommendations');
        var html = '<div class="bg-white rounded-lg p-4 shadow"><h3 class="font-bold text-lg mb-3">Analysis Summary</h3>';
        if (analysis.sectors && analysis.sectors.length > 0) {
            html += '<div class="space-y-2">';
            analysis.sectors.forEach(function(s) { var color = (s.avgSpeedDelta || 0) >= 0 ? 'green' : 'red'; html += '<div class="border-l-4 border-' + color + '-500 pl-3 py-2"><p class="font-medium">Sector ' + s.sector + '</p><p class="text-sm">Speed Delta: ' + (s.avgSpeedDelta || 0).toFixed(1) + ' km/h</p></div>'; });
            html += '</div>';
        } else { html += '<p class="text-gray-500">Sector analysis will appear after processing.</p>'; }
        html += '</div>';
        container.innerHTML = html;
    }
    
    generateFullReport(analysis) {
        var container = document.getElementById('full-report');
        var timeDelta = analysis.timeDelta || 0;
        var html = '<h2 class="text-2xl font-bold mb-4">Telemetry Report</h2>';
        html += '<div class="bg-gray-50 p-4 rounded-lg mb-4"><p class="text-lg font-bold">Lap Time Delta: ' + (timeDelta > 0 ? '+' : '') + timeDelta.toFixed(3) + 's</p>';
        html += '<p>Average Speed: ' + (analysis.avgSpeedCurr || 0).toFixed(1) + ' km/h (Ref: ' + (analysis.avgSpeedRef || 0).toFixed(1) + ' km/h)</p></div>';
        if (analysis.sectors && analysis.sectors.length > 0) {
            html += '<h3 class="text-xl font-bold mt-4 mb-2">Sector Analysis</h3><table class="w-full border-collapse"><thead><tr class="bg-gray-100"><th class="border p-2">Sector</th><th class="border p-2">Speed Delta</th></tr></thead><tbody>';
            analysis.sectors.forEach(function(s) { html += '<tr><td class="border p-2">Sector ' + s.sector + '</td><td class="border p-2">' + (s.avgSpeedDelta || 0).toFixed(1) + ' km/h</td></tr>'; });
            html += '</tbody></table>';
        }
        container.innerHTML = html;
    }
    
    async sendChatMessage() {
        var self = this;
        var input = document.getElementById('chat-input');
        var message = input.value.trim();
        if (!message) return;
        this.addUserMessage(message);
        input.value = '';
        this.showTypingIndicator();
        try {
            var response = await fetch(this.webhookUrl + '/webhook/ayrton-chat', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: this.sessionId, message: message, session_data: this.sessionData, context: { analysis: this.analysisResults } })
            });
            if (!response.ok) throw new Error('HTTP error: ' + response.status);
            var result = await response.json();
            this.hideTypingIndicator();
            this.addAyrtonMessage(result.ayrton_says || result.response || 'Response received');
        } catch (error) {
            this.hideTypingIndicator();
            this.addAyrtonMessage('Error processing message. Please try again.');
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
        var cleanMessage = message.replace(/<[^>]*>/g, '');
        messageDiv.innerHTML = '<div class="bg-gradient-to-r from-purple-700 to-purple-900 text-white rounded-lg p-4 max-w-2xl shadow-lg"><div class="flex items-center mb-2"><div class="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center mr-3"><span class="text-purple-900 font-bold text-lg">A</span></div><div><p class="font-bold text-yellow-300">Ayrton</p><p class="text-xs text-purple-200">Racing Coach</p></div></div><div class="text-white">' + cleanMessage.replace(/\n/g, '<br>') + '</div></div>';
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
        var self = this;
        document.querySelectorAll('.tab-content').forEach(function(tab) { tab.classList.remove('active'); });
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
        
        if (tabName === 'graphs') {
            setTimeout(function() {
                ['track-map', 'speed-overlay', 'throttle-overlay', 'brake-overlay', 'steering-overlay', 'glat-overlay', 'glong-overlay', 'gear-overlay', 'sector-time-chart', 'speed-comparison'].forEach(function(id) {
                    var el = document.getElementById(id);
                    if (el && el.data) Plotly.Plots.resize(el);
                });
            }, 100);
        }
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
