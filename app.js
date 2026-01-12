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
                    variants: ['Distance', 'Dist', 'LapDist', 'Lap Distance', 'distance'],
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
                throttle: { variants: ['Throttle Pos', 'Throttle', 'TPS', 'throttle', 'Throttle Position'], description: 'Throttle position', icon: 'fa-gas-pump', category: 'Driver Inputs' },
                brake: { variants: ['Brake Pres Front', 'Brake Pressure', 'Brake', 'brake', 'Brake Pres Rear'], description: 'Brake pressure', icon: 'fa-hand-paper', category: 'Driver Inputs' },
                gear: { variants: ['Gear', 'gear', 'Gear Position'], description: 'Current gear', icon: 'fa-cog', category: 'Driver Inputs' },
                steer: { variants: ['Steered Angle', 'Steering Angle', 'Steer', 'steer'], description: 'Steering angle', icon: 'fa-dharmachakra', category: 'Driver Inputs' },
                rpm: { variants: ['Engine RPM', 'RPM', 'rpm', 'Engine Speed'], description: 'Engine RPM', icon: 'fa-tachometer-alt', category: 'Engine' },
                engineTemp: { variants: ['Engine Temp', 'Water Temp', 'Coolant Temp'], description: 'Engine temperature', icon: 'fa-thermometer-full', category: 'Engine' },
                oilTemp: { variants: ['Eng Oil Temp', 'Oil Temp', 'Engine Oil Temp'], description: 'Oil temperature', icon: 'fa-oil-can', category: 'Engine' },
                fuelLevel: { variants: ['Fuel Level', 'Fuel', 'Fuel Qty'], description: 'Fuel level', icon: 'fa-gas-pump', category: 'Engine' },
                gLat: { variants: ['G Force Lat', 'Lateral G', 'G_Lat', 'gLat', 'Lat G'], description: 'Lateral G-force', icon: 'fa-arrows-alt-h', category: 'G-Forces' },
                gLong: { variants: ['G Force Long', 'Longitudinal G', 'G_Long', 'gLong', 'Long G'], description: 'Longitudinal G-force', icon: 'fa-arrows-alt-v', category: 'G-Forces' },
                gVert: { variants: ['G Force Vert', 'Vertical G', 'G_Vert', 'gVert'], description: 'Vertical G-force', icon: 'fa-arrows-alt-v', category: 'G-Forces' },
                yaw: { variants: ['Gyro Yaw Velocity', 'Yaw Rate', 'Yaw', 'yaw'], description: 'Yaw rate', icon: 'fa-sync', category: 'Vehicle Dynamics' },
                pitch: { variants: ['Gyro Pitch Velocity', 'Pitch Rate', 'Pitch'], description: 'Pitch rate', icon: 'fa-sync', category: 'Vehicle Dynamics' },
                roll: { variants: ['Gyro Roll Velocity', 'Roll Rate', 'Roll'], description: 'Roll rate', icon: 'fa-sync', category: 'Vehicle Dynamics' },
                wheelSpeedFL: { variants: ['Wheel Speed FL', 'WheelSpeed FL', 'Wheel Speed LF'], description: 'Front left wheel speed', icon: 'fa-circle', category: 'Wheel Speeds' },
                wheelSpeedFR: { variants: ['Wheel Speed FR', 'WheelSpeed FR', 'Wheel Speed RF'], description: 'Front right wheel speed', icon: 'fa-circle', category: 'Wheel Speeds' },
                wheelSpeedRL: { variants: ['Wheel Speed RL', 'WheelSpeed RL', 'Wheel Speed LR'], description: 'Rear left wheel speed', icon: 'fa-circle', category: 'Wheel Speeds' },
                wheelSpeedRR: { variants: ['Wheel Speed RR', 'WheelSpeed RR', 'Wheel Speed RR'], description: 'Rear right wheel speed', icon: 'fa-circle', category: 'Wheel Speeds' },
                suspFL: { variants: ['Susp Pos FL', 'Suspension FL', 'Damper FL', 'Susp Travel FL'], description: 'Front left suspension', icon: 'fa-arrows-alt-v', category: 'Suspension' },
                suspFR: { variants: ['Susp Pos FR', 'Suspension FR', 'Damper FR', 'Susp Travel FR'], description: 'Front right suspension', icon: 'fa-arrows-alt-v', category: 'Suspension' },
                suspRL: { variants: ['Susp Pos RL', 'Suspension RL', 'Damper RL', 'Susp Travel RL'], description: 'Rear left suspension', icon: 'fa-arrows-alt-v', category: 'Suspension' },
                suspRR: { variants: ['Susp Pos RR', 'Suspension RR', 'Damper RR', 'Susp Travel RR'], description: 'Rear right suspension', icon: 'fa-arrows-alt-v', category: 'Suspension' },
                gpsLat: { variants: ['GPS Latitude', 'Latitude', 'Lat', 'GPS_Lat'], description: 'GPS Latitude', icon: 'fa-map-marker-alt', category: 'Position' },
                gpsLon: { variants: ['GPS Longitude', 'Longitude', 'Lon', 'GPS_Long'], description: 'GPS Longitude', icon: 'fa-map-marker-alt', category: 'Position' },
                lapTime: { variants: ['Lap Time', 'LapTime', 'Running Lap Time'], description: 'Lap timing', icon: 'fa-stopwatch', category: 'Lap Info' },
                lapNumber: { variants: ['Lap Number', 'Lap', 'Lap Count', 'Lap Num'], description: 'Current lap number', icon: 'fa-hashtag', category: 'Lap Info' }
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
                detected.required[key] = { csvColumn: found, description: def.description, icon: def.icon };
                matchedColumns.add(found);
            } else {
                detected.missing.push({ channel: key, description: def.description, expectedNames: def.variants.slice(0, 3).join(', ') });
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
                detected.optional[key] = { csvColumn: found, description: def.description, icon: def.icon, category: def.category };
                matchedColumns.add(found);
            }
        });
        
        // Find unrecognized columns
        columns.forEach(function(col) {
            if (!matchedColumns.has(col)) detected.unrecognized.push(col);
        });
        
        // Determine capabilities
        if (Object.keys(detected.required).length === 3) {
            detected.capabilities.push({ name: 'Basic Lap Analysis', description: 'Speed traces, sector times, lap comparison', icon: 'fa-chart-line', color: 'green' });
        }
        if (detected.optional.throttle && detected.optional.brake) {
            detected.capabilities.push({ name: 'Driver Input Analysis', description: 'Throttle/brake traces, pedal overlap detection', icon: 'fa-shoe-prints', color: 'blue' });
        }
        if (detected.optional.gLat || detected.optional.gLong) {
            detected.capabilities.push({ name: 'G-Force Analysis', description: 'Traction circle, grip utilization', icon: 'fa-circle-notch', color: 'purple' });
        }
        if (detected.optional.gpsLat && detected.optional.gpsLon) {
            detected.capabilities.push({ name: 'GPS Track Mapping', description: 'Accurate track position from GPS', icon: 'fa-map-marked-alt', color: 'teal' });
        }
        
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
        
        var displayContainer = document.createElement('div');
        displayContainer.id = 'channel-detection-display';
        displayContainer.className = 'mt-6 border rounded-lg overflow-hidden';
        
        var statusColor = requiredCount === 3 ? 'green' : 'yellow';
        
        var html = '<div class="bg-' + statusColor + '-50 p-4 border-b">';
        html += '<div class="flex items-center justify-between"><div>';
        html += '<h3 class="font-bold text-lg flex items-center"><i class="fas fa-search text-' + statusColor + '-500 mr-2"></i>Channel Detection Results</h3>';
        html += '<p class="text-sm text-gray-600">' + detected.totalColumns + ' columns found - ' + totalMatched + ' channels mapped</p>';
        html += '</div><button id="toggle-channel-details" class="text-sm bg-white px-3 py-1 rounded border hover:bg-gray-50"><i class="fas fa-chevron-down mr-1"></i>Details</button></div></div>';
        
        if (detected.capabilities.length > 0) {
            html += '<div class="p-4 bg-white border-b"><h4 class="font-semibold text-gray-700 mb-2"><i class="fas fa-bolt text-yellow-500 mr-2"></i>Analysis Capabilities</h4><div class="flex flex-wrap gap-2">';
            detected.capabilities.forEach(function(cap) {
                html += '<span class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-' + cap.color + '-100 text-' + cap.color + '-800"><i class="fas ' + cap.icon + ' mr-1"></i>' + cap.name + '</span>';
            });
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
        Object.keys(detected.optional).forEach(function(key) {
            var ch = detected.optional[key];
            if (!categories[ch.category]) categories[ch.category] = [];
            categories[ch.category].push({ key: key, data: ch });
        });
        Object.keys(categories).forEach(function(cat) {
            html += '<div class="mb-3"><h5 class="text-sm font-medium text-gray-600 mb-1">' + cat + '</h5><div class="flex flex-wrap gap-1">';
            categories[cat].forEach(function(item) {
                html += '<span class="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"><i class="fas ' + item.data.icon + ' mr-1"></i>' + item.key + '</span>';
            });
            html += '</div></div>';
        });
        html += '</div>';
        
        if (detected.unrecognized.length > 0) {
            html += '<div class="p-4 bg-gray-50" id="unrecognized-section" style="display:none;"><h4 class="font-semibold text-gray-600 mb-2"><i class="fas fa-question-circle text-gray-400 mr-2"></i>Unrecognized (' + detected.unrecognized.length + ')</h4><div class="flex flex-wrap gap-1">';
            detected.unrecognized.slice(0, 30).forEach(function(col) {
                html += '<span class="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded">' + self.escapeHtml(col) + '</span>';
            });
            if (detected.unrecognized.length > 30) html += '<span class="text-gray-500 text-xs">...and ' + (detected.unrecognized.length - 30) + ' more</span>';
            html += '</div></div>';
        }
        
        html += '<div class="p-4 border-t bg-gradient-to-r from-purple-50 to-blue-50"><button id="start-analysis-btn" class="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-blue-700 transition font-semibold text-lg shadow-lg"><i class="fas fa-play-circle mr-2"></i>Analyze Telemetry</button></div>';
        
        displayContainer.innerHTML = html;
        var uploadSection = document.querySelector('#upload-section .bg-white');
        uploadSection.appendChild(displayContainer);
        this.setupChannelMappingEvents(detected);
    }

    escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
        
        var startAnalysisBtn = document.getElementById('start-analysis-btn');
        if (startAnalysisBtn) {
            startAnalysisBtn.addEventListener('click', function() {
                self.analyzeTelemetry();
            });
        }
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
                console.log('Large dataset: ' + refData.length + ' rows, ' + columnCount + ' columns. Optimizing...');
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

            var response = await fetch(this.webhookUrl + '/webhook/telemetry-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('HTTP error! status: ' + response.status);

            var responseText = await response.text();
            var results;
            try {
                results = JSON.parse(responseText);
            } catch (parseError) {
                throw new Error('Invalid JSON response from server');
            }

            this.sessionId = results.session_id || sessionId;
            this.sessionData = results.session_data || results.analysis || {};
            this.analysisResults = results.analysis || {};

            this.displayAnalysisResults(results);
            
            document.getElementById('upload-section').classList.add('hidden');
            document.getElementById('results-section').classList.remove('hidden');

            var ayrtonMessage = results.ayrton_says || results.initial_message || "I have analyzed your data. What do you want to know?";
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
        document.getElementById('lap-delta').textContent = lapDelta > 0 ? '+' + lapDelta.toFixed(3) + 's' : lapDelta.toFixed(3) + 's';
        
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
        var self = this;
        
        this.generateTrackMap();
        this.generateTelemetryOverlays();
        this.generateSectorTimeChart(analysis);
        this.generateSpeedComparison(analysis);
        this.setupCustomOverlayControls();
        
        setTimeout(function() {
            var chartIds = ['track-map', 'speed-overlay', 'throttle-overlay', 'brake-overlay', 
                           'steering-overlay', 'glat-overlay', 'glong-overlay', 'gear-overlay',
                           'sector-time-chart', 'speed-comparison'];
            chartIds.forEach(function(id) {
                var el = document.getElementById(id);
                if (el && el.data) Plotly.Plots.resize(el);
            });
        }, 200);
    }

    generateTrackMap() {
        var self = this;
        
        if (!this.referenceData || !this.currentData) {
            document.getElementById('track-map').innerHTML = '<p class="text-gray-400 text-center py-20">No track data available</p>';
            return;
        }

        var getValue = function(row, names, defaultVal) {
            for (var i = 0; i < names.length; i++) {
                if (row[names[i]] !== undefined && row[names[i]] !== null && row[names[i]] !== '') {
                    var val = parseFloat(row[names[i]]);
                    if (!isNaN(val)) return val;
                }
            }
            return defaultVal !== undefined ? defaultVal : null;
        };

        var latNames = ['GPS Latitude', 'Latitude', 'Lat', 'GPS_Lat'];
        var lonNames = ['GPS Longitude', 'Longitude', 'Lon', 'GPS_Long'];
        var speedNames = ['Ground Speed', 'Speed', 'Drive Speed', 'speed'];
        var steerNames = ['Steered Angle', 'Steering Angle', 'Steer'];
        var gLatNames = ['G Force Lat', 'Lateral G', 'G_Lat'];
        var yawNames = ['Gyro Yaw Velocity', 'Yaw Rate', 'Yaw'];

        var sampleRow = this.referenceData[0] || {};
        var hasGPS = getValue(sampleRow, latNames) !== null && getValue(sampleRow, lonNames) !== null;
        var hasSpeed = getValue(sampleRow, speedNames) !== null;

        if (!hasGPS && !hasSpeed) {
            document.getElementById('track-map').innerHTML = '<p class="text-gray-400 text-center py-20">No position data available</p>';
            return;
        }

        var sampleRate = Math.max(1, Math.floor(this.referenceData.length / 500));

        var buildTrack = function(data) {
            var positions = [];
            if (hasGPS) {
                for (var i = 0; i < data.length; i += sampleRate) {
                    var row = data[i];
                    var lat = getValue(row, latNames, null);
                    var lon = getValue(row, lonNames, null);
                    var speed = getValue(row, speedNames, 100);
                    if (lat !== null && lon !== null) {
                        positions.push({ x: lon, y: lat, speed: speed });
                    }
                }
            } else {
                var x = 0, y = 0, heading = 0, dt = 0.01;
                for (var i = 0; i < data.length; i += sampleRate) {
                    var row = data[i];
                    var speed = getValue(row, speedNames, 100) / 3.6;
                    var steer = getValue(row, steerNames, 0) * (Math.PI / 180);
                    var gLat = getValue(row, gLatNames, 0);
                    var yawRate = getValue(row, yawNames, 0) * (Math.PI / 180);
                    
                    var turnRate;
                    if (Math.abs(yawRate) > 0.001) turnRate = yawRate * dt * sampleRate;
                    else if (Math.abs(gLat) > 0.05) turnRate = (gLat * 9.81 / Math.max(speed, 10)) * dt * sampleRate;
                    else turnRate = (speed * Math.tan(steer * 0.1) / 2.5) * dt * sampleRate;
                    
                    heading += turnRate;
                    var ds = speed * dt * sampleRate;
                    x += ds * Math.cos(heading);
                    y += ds * Math.sin(heading);
                    positions.push({ x: x, y: y, speed: getValue(row, speedNames, 100) });
                }
            }
            return positions;
        };

        var refTrack = buildTrack(this.referenceData);
        var currTrack = buildTrack(this.currentData);

        if (refTrack.length < 10) {
            document.getElementById('track-map').innerHTML = '<p class="text-gray-400 text-center py-20">Insufficient data for track map</p>';
            return;
        }

        // Normalize coordinates
        var allX = refTrack.map(function(p) { return p.x; }).concat(currTrack.map(function(p) { return p.x; }));
        var allY = refTrack.map(function(p) { return p.y; }).concat(currTrack.map(function(p) { return p.y; }));
        var minX = Math.min.apply(null, allX), maxX = Math.max.apply(null, allX);
        var minY = Math.min.apply(null, allY), maxY = Math.max.apply(null, allY);
        var centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2;
        var scale = Math.max(maxX - minX, maxY - minY) || 1;

        var normalize = function(track) {
            return track.map(function(p) { return { x: (p.x - centerX) / scale, y: (p.y - centerY) / scale, speed: p.speed }; });
        };

        var refNorm = normalize(refTrack);
        var currNorm = normalize(currTrack);

        var allSpeeds = currNorm.map(function(p) { return p.speed; });
        var minSpeed = Math.min.apply(null, allSpeeds);
        var maxSpeed = Math.max.apply(null, allSpeeds);

        var getColor = function(speed) {
            var ratio = Math.max(0, Math.min(1, (speed - minSpeed) / (maxSpeed - minSpeed || 1)));
            if (ratio < 0.5) return 'rgb(255,' + Math.round(ratio * 2 * 255) + ',0)';
            else return 'rgb(' + Math.round((1 - (ratio - 0.5) * 2) * 255) + ',255,0)';
        };

        // Reference lap - gray line
        var refTrace = {
            x: refNorm.map(function(p) { return p.x; }),
            y: refNorm.map(function(p) { return p.y; }),
            mode: 'lines',
            name: 'Reference',
            line: { color: '#6b7280', width: 6 },
            hoverinfo: 'name'
        };

        // Current lap - speed-colored segments
        var currTraces = [];
        for (var i = 0; i < currNorm.length - 1; i++) {
            currTraces.push({
                x: [currNorm[i].x, currNorm[i + 1].x],
                y: [currNorm[i].y, currNorm[i + 1].y],
                mode: 'lines',
                showlegend: i === 0,
                name: i === 0 ? 'Your Lap (colored by speed)' : '',
                line: { color: getColor(currNorm[i].speed), width: 3 },
                hoverinfo: 'skip'
            });
        }

        var layout = {
            showlegend: true,
            legend: { x: 0, y: 1, bgcolor: 'rgba(0,0,0,0.5)', font: { color: '#fff', size: 11 } },
            xaxis: { visible: false, scaleanchor: 'y' },
            yaxis: { visible: false },
            margin: { t: 5, b: 5, l: 5, r: 5 },
            paper_bgcolor: '#1f2937',
            plot_bgcolor: '#1f2937',
            autosize: true
        };

        Plotly.newPlot('track-map', [refTrace].concat(currTraces), layout, { responsive: true, displayModeBar: false });
    }

    getOverlayChannels() {
        var refColor = '#6b7280';   // Gray for reference
        var yourColor = '#8b5cf6';  // Purple for your lap
        
        return {
            speed: { names: ['Ground Speed', 'Speed', 'Drive Speed', 'Vehicle Speed', 'speed'], label: 'Speed', unit: 'km/h', color: { ref: refColor, curr: yourColor } },
            throttle: { names: ['Throttle Pos', 'Throttle', 'TPS', 'throttle'], label: 'Throttle', unit: '%', color: { ref: refColor, curr: yourColor } },
            brake: { names: ['Brake Pres Front', 'Brake Pressure', 'Brake', 'brake'], label: 'Brake', unit: '%', color: { ref: refColor, curr: yourColor } },
            steering: { names: ['Steered Angle', 'Steering Angle', 'Steer', 'steer'], label: 'Steering', unit: 'deg', color: { ref: refColor, curr: yourColor } },
            gLat: { names: ['G Force Lat', 'Lateral G', 'G_Lat', 'gLat'], label: 'Lateral G', unit: 'G', color: { ref: refColor, curr: yourColor } },
            gLong: { names: ['G Force Long', 'Longitudinal G', 'G_Long', 'gLong'], label: 'Long G', unit: 'G', color: { ref: refColor, curr: yourColor } },
            gear: { names: ['Gear', 'gear', 'Gear Position'], label: 'Gear', unit: '', color: { ref: refColor, curr: yourColor } },
            rpm: { names: ['Engine RPM', 'RPM', 'rpm'], label: 'RPM', unit: 'rpm', color: { ref: refColor, curr: yourColor } }
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

        var distNames = ['Distance', 'Dist', 'Lap Distance', 'LapDist'];
        var channels = this.getOverlayChannels();

        var sampleRate = Math.max(1, Math.floor(this.referenceData.length / 500));
        var refData = this.referenceData.filter(function(_, i) { return i % sampleRate === 0; });
        var currData = this.currentData.filter(function(_, i) { return i % sampleRate === 0; });

        // Find where each lap's valid data ends (distance stops increasing)
        var findLapEnd = function(data) {
            var lastValidIdx = data.length - 1;
            var lastDist = -Infinity;
            for (var i = 0; i < data.length; i++) {
                var dist = self.getValue(data[i], distNames, null);
                if (dist !== null && dist > lastDist + 0.5) {
                    lastDist = dist;
                    lastValidIdx = i;
                }
            }
            return lastValidIdx;
        };

        var refEndIdx = findLapEnd(refData);
        var currEndIdx = findLapEnd(currData);
        
        var refDataTrim = refData.slice(0, refEndIdx + 1);
        var currDataTrim = currData.slice(0, currEndIdx + 1);

        var refDist = refDataTrim.map(function(row) { return self.getValue(row, distNames, null); });
        var currDist = currDataTrim.map(function(row) { return self.getValue(row, distNames, null); });

        this.generateSingleOverlay('speed-overlay', refDataTrim, currDataTrim, refDist, currDist, channels.speed);
        this.generateSingleOverlay('throttle-overlay', refDataTrim, currDataTrim, refDist, currDist, channels.throttle);
        this.generateSingleOverlay('brake-overlay', refDataTrim, currDataTrim, refDist, currDist, channels.brake);
        this.generateSingleOverlay('steering-overlay', refDataTrim, currDataTrim, refDist, currDist, channels.steering);
        this.generateSingleOverlay('glat-overlay', refDataTrim, currDataTrim, refDist, currDist, channels.gLat);
        this.generateSingleOverlay('glong-overlay', refDataTrim, currDataTrim, refDist, currDist, channels.gLong);
        this.generateSingleOverlay('gear-overlay', refDataTrim, currDataTrim, refDist, currDist, channels.gear);
    }

    generateSingleOverlay(containerId, refData, currData, refDist, currDist, channelConfig) {
        var self = this;
        var container = document.getElementById(containerId);
        if (!container) return;

        // Build data arrays - include all valid points
        var refX = [], refY = [];
        refData.forEach(function(row, i) {
            var dist = refDist[i];
            var val = self.getValue(row, channelConfig.names, null);
            if (dist !== null && val !== null) {
                refX.push(dist);
                refY.push(val);
            }
        });

        var currX = [], currY = [];
        currData.forEach(function(row, i) {
            var dist = currDist[i];
            var val = self.getValue(row, channelConfig.names, null);
            if (dist !== null && val !== null) {
                currX.push(dist);
                currY.push(val);
            }
        });

        // Check if we have any data at all
        if (refX.length === 0 && currX.length === 0) {
            container.innerHTML = '<p class="text-gray-400 text-center py-16 text-sm">No ' + channelConfig.label + ' data available</p>';
            return;
        }

        var traces = [];
        
        // Add reference trace if it has data
        if (refX.length > 0) {
            traces.push({
                x: refX, y: refY,
                mode: 'lines',
                name: 'Reference',
                line: { color: channelConfig.color.ref, width: 1.5 },
                hovertemplate: 'Ref: %{y:.2f} ' + channelConfig.unit + '<extra></extra>'
            });
        }

        // Add current trace if it has data
        if (currX.length > 0) {
            traces.push({
                x: currX, y: currY,
                mode: 'lines',
                name: 'Your Lap',
                line: { color: channelConfig.color.curr, width: 2 },
                hovertemplate: 'You: %{y:.2f} ' + channelConfig.unit + '<extra></extra>'
            });
        }

        var layout = {
            xaxis: { title: 'Distance (m)', showticklabels: true, tickfont: { size: 10 } },
            yaxis: { title: channelConfig.unit, titlefont: { size: 10 }, tickfont: { size: 10 } },
            margin: { t: 10, b: 40, l: 50, r: 10 },
            legend: { orientation: 'h', y: 1.05, x: 0.5, xanchor: 'center', font: { size: 10 } },
            hovermode: 'x unified',
            autosize: true
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

        var standardChannels = ['speed', 'throttle', 'brake', 'steering', 'gLat', 'gLong', 'gear'];
        var standardNames = [];
        standardChannels.forEach(function(ch) {
            if (channels[ch]) standardNames = standardNames.concat(channels[ch].names);
        });

        select.innerHTML = '<option value="">-- Select Channel --</option>';
        
        var optionalChannels = ['rpm'];
        optionalChannels.forEach(function(chKey) {
            var ch = channels[chKey];
            if (ch) {
                var hasData = ch.names.some(function(name) { return sampleRow[name] !== undefined; });
                if (hasData) {
                    var option = document.createElement('option');
                    option.value = chKey;
                    option.textContent = ch.label + ' (' + ch.unit + ')';
                    select.appendChild(option);
                }
            }
        });

        var otherOptgroup = document.createElement('optgroup');
        otherOptgroup.label = 'Other Columns';
        var addedCount = 0;

        allColumns.forEach(function(col) {
            var isStandard = standardNames.some(function(name) { return col.toLowerCase() === name.toLowerCase(); });
            var isDistTime = ['Time', 'Lap Distance', 'Distance', 'Elapsed Time'].some(function(name) { return col.toLowerCase() === name.toLowerCase(); });
            if (!isStandard && !isDistTime && addedCount < 50) {
                var option = document.createElement('option');
                option.value = 'custom:' + col;
                option.textContent = col;
                otherOptgroup.appendChild(option);
                addedCount++;
            }
        });

        if (otherOptgroup.children.length > 0) select.appendChild(otherOptgroup);
        if (!this.customOverlays) this.customOverlays = [];

        if (addBtn) {
            addBtn.onclick = function() {
                var selectedValue = select.value;
                if (!selectedValue) { self.showNotification('Please select a channel', 'error'); return; }
                if (self.customOverlays.indexOf(selectedValue) !== -1) { self.showNotification('Channel already added', 'error'); return; }
                self.customOverlays.push(selectedValue);
                self.addCustomOverlayChart(selectedValue);
                select.value = '';
            };
        }

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
        var distNames = ['Distance', 'Dist', 'Lap Distance', 'LapDist'];
        var sampleRate = Math.max(1, Math.floor(this.referenceData.length / 500));
        var refData = this.referenceData.filter(function(_, i) { return i % sampleRate === 0; });
        var currData = this.currentData.filter(function(_, i) { return i % sampleRate === 0; });

        var chartId = 'custom-overlay-' + this.customOverlays.length;
        var chartDiv = document.createElement('div');
        chartDiv.className = 'relative';
        chartDiv.innerHTML = '<button class="absolute top-0 right-0 z-10 bg-red-500 text-white rounded-full w-6 h-6 text-xs hover:bg-red-600" onclick="this.parentElement.remove();">&times;</button>' +
            '<h4 class="font-semibold mb-2 text-sm pr-8"></h4>' +
            '<div id="' + chartId + '" class="bg-gray-50 rounded border" style="height: 280px; width: 100%;"></div>';
        container.appendChild(chartDiv);

        var label, unit, names;
        var refColor = '#6b7280', yourColor = '#8b5cf6';

        if (channelValue.indexOf('custom:') === 0) {
            var colName = channelValue.replace('custom:', '');
            label = colName; unit = ''; names = [colName];
        } else if (channels[channelValue]) {
            var ch = channels[channelValue];
            label = ch.label; unit = ch.unit; names = ch.names;
        } else { return; }

        chartDiv.querySelector('h4').textContent = label + (unit ? ' (' + unit + ')' : '');

        var refX = [], refY = [], currX = [], currY = [];
        refData.forEach(function(row) {
            var dist = self.getValue(row, distNames, null);
            var val = self.getValue(row, names, null);
            if (dist !== null && val !== null) { refX.push(dist); refY.push(val); }
        });
        currData.forEach(function(row) {
            var dist = self.getValue(row, distNames, null);
            var val = self.getValue(row, names, null);
            if (dist !== null && val !== null) { currX.push(dist); currY.push(val); }
        });

        var traces = [];
        if (refX.length > 0) traces.push({ x: refX, y: refY, mode: 'lines', name: 'Reference', line: { color: refColor, width: 1.5 } });
        if (currX.length > 0) traces.push({ x: currX, y: currY, mode: 'lines', name: 'Your Lap', line: { color: yourColor, width: 2 } });

        var layout = {
            xaxis: { title: 'Distance (m)', tickfont: { size: 10 } },
            yaxis: { title: unit, tickfont: { size: 10 } },
            margin: { t: 10, b: 40, l: 50, r: 10 },
            legend: { orientation: 'h', y: 1.05, x: 0.5, xanchor: 'center', font: { size: 10 } },
            hovermode: 'x unified',
            autosize: true
        };

        Plotly.newPlot(chartId, traces, layout, { responsive: true, displayModeBar: false });
    }

    generateSectorTimeChart(analysis) {
        var container = document.getElementById('sector-time-chart');
        if (!container) return;

        if (!analysis.sectors || analysis.sectors.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-10">No sector data available</p>';
            return;
        }

        var sectorLabels = analysis.sectors.map(function(s) { return 'Sector ' + s.sector; });
        var timeDeltas = analysis.sectors.map(function(s) {
            if (s.timeDelta !== undefined && s.timeDelta !== null) return s.timeDelta;
            var avgSpeedDelta = s.avgSpeedDelta || 0;
            return -avgSpeedDelta * 0.02;
        });

        var colors = timeDeltas.map(function(t) { return t > 0 ? '#ef4444' : '#22c55e'; });

        var trace = {
            x: sectorLabels, y: timeDeltas, type: 'bar',
            marker: { color: colors },
            text: timeDeltas.map(function(t) { return (t > 0 ? '+' : '') + t.toFixed(3) + 's'; }),
            textposition: 'outside',
            hovertemplate: '%{x}<br>%{text}<extra></extra>'
        };

        var layout = {
            yaxis: { title: 'Time Delta (s)', zeroline: true, zerolinewidth: 2, zerolinecolor: '#000' },
            margin: { t: 30, b: 40, l: 60, r: 20 },
            annotations: [{ x: 0.5, y: 1.1, xref: 'paper', yref: 'paper', text: 'Green = Gained | Red = Lost', showarrow: false, font: { size: 10, color: '#666' } }]
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
            type: 'bar', name: 'Your Lap', marker: { color: '#8b5cf6' },
            text: [(analysis.avgSpeedCurr || 0).toFixed(1), (analysis.maxSpeedCurr || 0).toFixed(0), (analysis.minSpeedCurr || 0).toFixed(0)],
            textposition: 'outside'
        };

        var refTrace = {
            x: ['Average', 'Top Speed', 'Min Corner'],
            y: [analysis.avgSpeedRef || 0, analysis.maxSpeedRef || 0, analysis.minSpeedRef || 0],
            type: 'bar', name: 'Reference', marker: { color: '#6b7280' },
            text: [(analysis.avgSpeedRef || 0).toFixed(1), (analysis.maxSpeedRef || 0).toFixed(0), (analysis.minSpeedRef || 0).toFixed(0)],
            textposition: 'outside'
        };

        var layout = {
            barmode: 'group', yaxis: { title: 'Speed (km/h)' },
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

            if (!response.ok) throw new Error('HTTP error! status: ' + response.status);

            var responseText = await response.text();
            var result;
            try { result = JSON.parse(responseText); } catch (e) { result = { ayrton_says: responseText }; }
            
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
        
        var cleanMessage = message.replace(/<[^>]*>/g, '').replace(/"text-[^"]*">/g, '').replace(/class="[^"]*"/g, '');
        
        messageDiv.innerHTML = '<div class="bg-gradient-to-r from-purple-700 to-purple-900 text-white rounded-lg p-4 max-w-2xl shadow-lg">' +
            '<div class="flex items-center mb-2"><div class="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center mr-3">' +
            '<span class="text-purple-900 font-bold text-lg">A</span></div>' +
            '<div><p class="font-bold text-yellow-300">Ayrton</p><p class="text-xs text-purple-200">Racing Coach</p></div></div>' +
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
                var chartIds = ['track-map', 'speed-overlay', 'throttle-overlay', 'brake-overlay', 
                               'steering-overlay', 'glat-overlay', 'glong-overlay', 'gear-overlay',
                               'sector-time-chart', 'speed-comparison'];
                chartIds.forEach(function(id) {
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
