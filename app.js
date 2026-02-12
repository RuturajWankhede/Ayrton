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
        // Session loader data
        this.fullSessionData = null;
        this.detectedLaps = [];
        this.selectedRefLap = null;
        this.selectedCompLap = null;
        this.detectedCorners = [];
        this.trackRotation = 0; // Track map rotation in degrees
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
        
        // Session loader event listeners
        var sessionUpload = document.getElementById('session-upload');
        var sessionFile = document.getElementById('session-file');
        if (sessionUpload && sessionFile) {
            sessionUpload.addEventListener('click', function() { sessionFile.click(); });
            sessionUpload.addEventListener('dragover', function(e) { e.preventDefault(); sessionUpload.classList.add('border-b border-[#30363d]lue-500', 'bg-blue-900/20'); });
            sessionUpload.addEventListener('dragleave', function() { sessionUpload.classList.remove('border-b border-[#30363d]lue-500', 'bg-blue-900/20'); });
            sessionUpload.addEventListener('drop', function(e) {
                e.preventDefault();
                sessionUpload.classList.remove('border-b border-[#30363d]lue-500', 'bg-blue-900/20');
                if (e.dataTransfer.files.length > 0) self.handleSessionFile(e.dataTransfer.files[0]);
            });
            sessionFile.addEventListener('change', function(e) {
                if (e.target.files.length > 0) self.handleSessionFile(e.target.files[0]);
            });
        }
        
        // Toggle session loader expand/collapse
        var toggleBtn = document.getElementById('toggle-session-loader');
        var sessionContent = document.getElementById('session-loader-content');
        if (toggleBtn && sessionContent) {
            toggleBtn.addEventListener('click', function() {
                var isHidden = sessionContent.classList.contains('hidden');
                sessionContent.classList.toggle('hidden');
                toggleBtn.innerHTML = isHidden ? 
                    '<i class="fas fa-chevron-up mr-1"></i> Collapse' : 
                    '<i class="fas fa-chevron-down mr-1"></i> Expand';
            });
        }
        
        // Track map rotation controls
        var rotateCW = document.getElementById('rotate-cw');
        var rotateCCW = document.getElementById('rotate-ccw');
        var rotateReset = document.getElementById('rotate-reset');
        
        if (rotateCW) {
            rotateCW.addEventListener('click', function() {
                self.trackRotation = (self.trackRotation + 15) % 360;
                self.updateRotationDisplay();
                self.generateTrackMap();
            });
        }
        if (rotateCCW) {
            rotateCCW.addEventListener('click', function() {
                self.trackRotation = (self.trackRotation - 15 + 360) % 360;
                self.updateRotationDisplay();
                self.generateTrackMap();
            });
        }
        if (rotateReset) {
            rotateReset.addEventListener('click', function() {
                self.trackRotation = 0;
                self.updateRotationDisplay();
                self.generateTrackMap();
            });
        }
    }
    
    updateRotationDisplay() {
        var display = document.getElementById('rotation-display');
        if (display) {
            display.textContent = this.trackRotation + '°';
        }
    }
    
    // =====================================================
    // SESSION LOADER - Load full outing and select laps
    // =====================================================
    
    handleSessionFile(file) {
        var self = this;
        if (!file.name.endsWith('.csv')) {
            this.showNotification('Please upload a CSV file', 'error');
            return;
        }
        
        // Check file size
        var fileSizeMB = file.size / (1024 * 1024);
        console.log('=== SESSION FILE UPLOAD ===');
        console.log('File name:', file.name);
        console.log('File size:', fileSizeMB.toFixed(1), 'MB');
        
        document.getElementById('session-upload').innerHTML = 
            '<i class="fas fa-spinner fa-spin text-4xl text-blue-400 mb-2"></i>' +
            '<p>Loading session... <span id="load-progress">0%</span></p>' +
            '<p class="text-xs text-[#8b949e]">' + fileSizeMB.toFixed(1) + ' MB - large files may take a while</p>';
        
        // For large files (>50MB), use chunked reading to avoid memory issues
        if (fileSizeMB > 50) {
            console.log('Using chunked file reader for large file');
            this.handleLargeSessionFile(file);
            return;
        }
        
        // Standard FileReader for smaller files
        var reader = new FileReader();
        reader.onload = function(e) {
            try {
                var text = e.target.result;
                console.log('File loaded successfully');
                console.log('Text length:', text.length, 'chars');
                console.log('First 300 chars:', text.substring(0, 300));
                
                var format = self.detectCSVFormat(text);
                console.log('Detected format:', format);
                
                var parsedData;
                switch(format) {
                    case 'pitoolbox':
                        console.log('Calling parsePiToolbox...');
                        parsedData = self.parsePiToolbox(text);
                        break;
                    case 'motec':
                        console.log('Calling parseMoTeC...');
                        parsedData = self.parseMoTeC(text);
                        break;
                    default:
                        console.log('Calling parseGenericCSV...');
                        parsedData = self.parseGenericCSV(text);
                }
                
                console.log('Parser returned:', parsedData ? parsedData.length + ' rows' : 'null/undefined');
                if (parsedData && parsedData.length > 0) {
                    console.log('Sample row keys:', Object.keys(parsedData[0]));
                    console.log('Sample row:', JSON.stringify(parsedData[0]).substring(0, 200));
                }
                
                if (!parsedData || parsedData.length === 0) {
                    console.error('PARSING FAILED - no data returned');
                    self.showNotification('No data found in session file. Check browser console (F12) for details.', 'error');
                    self.resetSessionUpload();
                    return;
                }
                
                self.fullSessionData = parsedData;
                console.log('Starting lap detection...');
                self.detectLapsInSession();
                console.log('Laps detected:', self.detectedLaps.length);
                
                self.showNotification('Session loaded: ' + self.detectedLaps.length + ' laps detected', 'success');
                
                document.getElementById('session-upload').innerHTML = 
                    '<i class="fas fa-check-circle text-4xl text-green-400 mb-2"></i>' +
                    '<p class="text-green-400 font-medium">' + file.name + '</p>' +
                    '<p class="text-sm text-[#6e7681]">' + self.detectedLaps.length + ' laps • ' + parsedData.length.toLocaleString() + ' data points</p>';
                
            } catch(err) {
                console.error('=== SESSION PARSING ERROR ===');
                console.error('Error:', err.message);
                console.error('Stack:', err.stack);
                self.showNotification('Error parsing session: ' + err.message, 'error');
                self.resetSessionUpload();
            }
        };
        reader.onprogress = function(e) {
            if (e.lengthComputable) {
                var pct = Math.round((e.loaded / e.total) * 100);
                var progressEl = document.getElementById('load-progress');
                if (progressEl) progressEl.textContent = pct + '%';
            }
        };
        reader.onerror = function() { 
            console.error('FileReader error:', reader.error);
            self.showNotification('Error reading file', 'error'); 
            self.resetSessionUpload();
        };
        reader.readAsText(file);
    }
    
    handleLargeSessionFile(file) {
        var self = this;
        var CHUNK_SIZE = 50 * 1024 * 1024; // 50MB chunks for faster reading
        var offset = 0;
        var lineBuffer = '';
        var isPiToolbox = false;
        
        // Key channels we need for lap detection (minimal set)
        function shouldKeepChannel(channelName) {
            var lower = channelName.toLowerCase();
            // Keep essential channels plus a few useful ones
            var keepPatterns = ['time', 'distance', 'speed', 'throttle', 'brake', 'gear', 'heading', 'steer', 'lap', 'elapsed', 'yaw', 'lat', 'lon', 'gps', 'temp', 'tyre', 'tire', 'average'];
            return keepPatterns.some(function(p) { return lower.indexOf(p) !== -1; });
        }
        
        console.log('=== LARGE FILE HANDLER ===');
        console.log('File size:', (file.size / 1024 / 1024).toFixed(1), 'MB');
        console.log('Chunk size:', (CHUNK_SIZE / 1024 / 1024), 'MB');
        
        function processChunk() {
            var slice = file.slice(offset, offset + CHUNK_SIZE);
            var reader = new FileReader();
            
            reader.onload = function(e) {
                var chunk = e.target.result;
                lineBuffer += chunk;
                
                // Update progress
                var pct = Math.round((Math.min(offset + CHUNK_SIZE, file.size) / file.size) * 100);
                var progressEl = document.getElementById('load-progress');
                if (progressEl) progressEl.textContent = pct + '% loading...';
                
                // Check if Pi Toolbox format on first chunk
                if (offset === 0) {
                    console.log('First chunk loaded, checking format...');
                    console.log('First 200 chars:', lineBuffer.substring(0, 200));
                    if (lineBuffer.indexOf('PiToolboxVersionedASCIIDataSet') !== -1) {
                        isPiToolbox = true;
                        console.log('Detected Pi Toolbox format');
                    }
                }
                
                offset += CHUNK_SIZE;
                
                if (offset < file.size) {
                    // More chunks to process
                    setTimeout(processChunk, 10); // Small delay to not block UI
                } else {
                    // Done reading, now parse
                    console.log('All chunks loaded, total buffer size:', lineBuffer.length, 'chars');
                    finalizeParsing();
                }
            };
            
            reader.onerror = function() {
                console.error('Chunk read error:', reader.error);
                self.showNotification('Error reading file chunk', 'error');
                self.resetSessionUpload();
            };
            
            reader.readAsText(slice);
        }
        
        function finalizeParsing() {
            var progressEl = document.getElementById('load-progress');
            if (progressEl) progressEl.textContent = 'Processing data...';
            
            console.log('=== FINALIZE PARSING ===');
            console.log('isPiToolbox:', isPiToolbox);
            console.log('Buffer length:', lineBuffer.length, 'chars');
            
            try {
                var parsedData;
                if (isPiToolbox) {
                    console.log('Calling parsePiToolboxLargeFile with channel filter');
                    parsedData = self.parsePiToolboxLargeFile(lineBuffer, shouldKeepChannel);
                } else {
                    console.log('Calling parseGenericCSVLarge');
                    parsedData = self.parseGenericCSVLarge(lineBuffer, shouldKeepChannel);
                }
                
                console.log('Parser returned:', parsedData ? parsedData.length + ' rows' : 'null');
                
                lineBuffer = ''; // Free memory
                
                if (!parsedData || parsedData.length === 0) {
                    self.showNotification('No data found in session file. Check console for details.', 'error');
                    self.resetSessionUpload();
                    return;
                }
                
                self.fullSessionData = parsedData;
                self.detectLapsInSession();
                
                var fileSizeMB = file.size / (1024 * 1024);
                self.showNotification('Session loaded: ' + self.detectedLaps.length + ' laps detected', 'success');
                
                document.getElementById('session-upload').innerHTML = 
                    '<i class="fas fa-check-circle text-4xl text-green-400 mb-2"></i>' +
                    '<p class="text-green-400 font-medium">' + file.name + '</p>' +
                    '<p class="text-sm text-[#6e7681]">' + self.detectedLaps.length + ' laps • ' + parsedData.length.toLocaleString() + ' points • ' + fileSizeMB.toFixed(0) + 'MB</p>';
                    
            } catch(err) {
                console.error('Large file parsing error:', err);
                console.error('Stack:', err.stack);
                self.showNotification('Error parsing large file: ' + err.message, 'error');
                self.resetSessionUpload();
            }
        }
        
        processChunk();
    }
    
    parsePiToolboxLargeFile(text, channelFilter) {
        console.log('=== parsePiToolboxLargeFile START ===');
        
        // Normalize line endings - handle Windows \r\n
        text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        var lines = text.split('\n');
        var channelBlocks = [];
        var currentBlock = null;
        var metadata = {};
        var inOuting = false;
        var debugLineCount = 0;
        
        console.log('Total lines after split:', lines.length);
        console.log('First 10 lines:', lines.slice(0, 10));
        
        // Parse the file structure
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            
            // Skip empty lines
            if (!line) continue;
            
            // Debug first few interesting lines
            if (debugLineCount < 20 && (line.indexOf('{') !== -1 || line.indexOf('Time') === 0)) {
                console.log('Line ' + i + ':', JSON.stringify(line));
                debugLineCount++;
            }
            
            // Parse outing information
            if (line === '{OutingInformation}') {
                inOuting = true;
                continue;
            }
            
            if (inOuting && line.charAt(0) === '{') {
                inOuting = false;
            }
            
            if (inOuting && line.indexOf('\t') !== -1) {
                var parts = line.split('\t');
                if (parts.length >= 2) {
                    metadata[parts[0]] = parts[1];
                }
                continue;
            }
            
            // Detect channel block start - be more flexible with matching
            if (line === '{ChannelBlock}' || line.indexOf('{ChannelBlock}') === 0) {
                if (currentBlock && currentBlock.data.length > 0) {
                    channelBlocks.push(currentBlock);
                }
                currentBlock = { channelName: null, data: [] };
                continue;
            }
            
            // Parse channel header (Time + ChannelName)
            if (currentBlock && currentBlock.channelName === null && line.indexOf('Time') === 0) {
                var headers = line.split('\t');
                if (headers.length >= 2) {
                    var channelName = headers[1].trim();
                    
                    // Apply filter - skip channels we don't need
                    if (channelFilter && !channelFilter(channelName)) {
                        console.log('Skipping filtered channel:', channelName);
                        currentBlock = null; // Skip this block
                        continue;
                    }
                    
                    console.log('Keeping channel:', channelName);
                    currentBlock.channelName = channelName;
                }
                continue;
            }
            
            // Parse data rows
            if (currentBlock && currentBlock.channelName) {
                var values = line.split('\t');
                if (values.length >= 2) {
                    var time = parseFloat(values[0]);
                    var value = parseFloat(values[1]);
                    if (!isNaN(time) && !isNaN(value)) {
                        currentBlock.data.push({ time: time, value: value });
                    }
                }
            }
        }
        
        // Don't forget the last block
        if (currentBlock && currentBlock.data.length > 0) {
            channelBlocks.push(currentBlock);
        }
        
        console.log('Found', channelBlocks.length, 'channel blocks after filtering');
        console.log('Channel names:', channelBlocks.map(function(b) { return b.channelName + ' (' + b.data.length + ' pts)'; }));
        
        if (channelBlocks.length === 0) {
            console.error('No channel blocks found! Check file format.');
            return [];
        }
        
        // Use the standard merge function
        return this.mergeChannelBlocks(channelBlocks, metadata);
    }
    
    parseGenericCSVLarge(text, channelFilter) {
        // Optimized generic CSV parser for large files
        var lines = text.split(/\r?\n/);
        var headers = null;
        var keepIndices = [];
        var result = [];
        
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line) continue;
            
            var parts = line.split(',');
            
            if (!headers) {
                headers = parts;
                // Determine which columns to keep
                for (var j = 0; j < headers.length; j++) {
                    if (!channelFilter || channelFilter(headers[j])) {
                        keepIndices.push(j);
                    }
                }
                continue;
            }
            
            var row = {};
            keepIndices.forEach(function(idx) {
                row[headers[idx]] = parts[idx];
            });
            result.push(row);
        }
        
        return result;
    }
    
    resetSessionUpload() {
        document.getElementById('session-upload').innerHTML = 
            '<i class="fas fa-folder-open text-4xl text-blue-400 mb-2"></i>' +
            '<p>Drop full session CSV here</p>' +
            '<p class="text-sm text-[#8b949e]">or click to browse</p>';
    }
    
    detectLapsInSession() {
        var self = this;
        var data = this.fullSessionData;
        if (!data || data.length === 0) return;
        
        this.detectedLaps = [];
        
        // Find the lap distance channel
        var distChannel = null;
        var lapTimeChannel = null;
        var elapsedTimeChannel = null;
        var speedChannel = null;
        
        var sampleRow = data[0];
        var columns = Object.keys(sampleRow);
        
        // Find key channels
        columns.forEach(function(col) {
            var colLower = col.toLowerCase();
            if (!distChannel && (colLower.indexOf('lap dist') !== -1 || colLower.indexOf('lapdist') !== -1 || colLower === 'lap distance[m]')) {
                distChannel = col;
            }
            if (!lapTimeChannel && (colLower.indexOf('elapsed lap') !== -1 || colLower.indexOf('laptime') !== -1 || colLower === 'elapsed lap time[s]')) {
                lapTimeChannel = col;
            }
            if (!elapsedTimeChannel && (colLower.indexOf('elapsed time') !== -1 || colLower === 'time' || colLower === 'elapsed time[s]')) {
                elapsedTimeChannel = col;
            }
            if (!speedChannel && (colLower.indexOf('speed') !== -1 && colLower.indexOf('corrected') === -1)) {
                speedChannel = col;
            }
        });
        
        // Fallbacks
        if (!distChannel) distChannel = columns.find(function(c) { return c.toLowerCase().indexOf('distance') !== -1; });
        if (!elapsedTimeChannel) elapsedTimeChannel = columns.find(function(c) { return c.toLowerCase() === 'time'; });
        if (!speedChannel) speedChannel = columns.find(function(c) { return c.toLowerCase().indexOf('speed') !== -1; });
        
        console.log('Lap detection channels:', { distChannel: distChannel, lapTimeChannel: lapTimeChannel, elapsedTimeChannel: elapsedTimeChannel, speedChannel: speedChannel });
        
        if (!distChannel) {
            this.showNotification('Cannot detect laps: no distance channel found', 'error');
            return;
        }
        
        // Detect lap boundaries by looking for distance resets
        var lapStartIndices = [0];
        var lastDist = parseFloat(data[0][distChannel]) || 0;
        var trackLength = 0;
        
        for (var i = 1; i < data.length; i++) {
            var dist = parseFloat(data[i][distChannel]) || 0;
            
            // Track maximum distance for track length estimation
            if (dist > trackLength) trackLength = dist;
            
            // Detect lap boundary: distance drops significantly (more than 50% of track)
            if (lastDist > 1000 && dist < lastDist * 0.5) {
                lapStartIndices.push(i);
            }
            lastDist = dist;
        }
        
        // Add end index
        lapStartIndices.push(data.length);
        
        console.log('Detected ' + (lapStartIndices.length - 1) + ' laps, track length ~' + Math.round(trackLength) + 'm');
        
        // Build lap objects with statistics
        for (var lapNum = 0; lapNum < lapStartIndices.length - 1; lapNum++) {
            var startIdx = lapStartIndices[lapNum];
            var endIdx = lapStartIndices[lapNum + 1];
            var lapData = data.slice(startIdx, endIdx);
            
            if (lapData.length < 50) continue; // Skip very short laps (out/in laps)
            
            // Calculate lap statistics
            var lapTime = null;
            var minSpeed = Infinity, maxSpeed = 0, avgSpeed = 0, speedSum = 0, speedCount = 0;
            var startTime = null, endTime = null;
            var maxDist = 0;
            
            for (var j = 0; j < lapData.length; j++) {
                var row = lapData[j];
                
                // Speed stats
                if (speedChannel) {
                    var spd = parseFloat(row[speedChannel]) || 0;
                    if (spd > 5) { // Ignore very low speeds
                        if (spd < minSpeed) minSpeed = spd;
                        if (spd > maxSpeed) maxSpeed = spd;
                        speedSum += spd;
                        speedCount++;
                    }
                }
                
                // Time tracking
                if (elapsedTimeChannel) {
                    var t = parseFloat(row[elapsedTimeChannel]) || 0;
                    if (j === 0) startTime = t;
                    if (j === lapData.length - 1) endTime = t;
                }
                
                // Distance tracking
                var d = parseFloat(row[distChannel]) || 0;
                if (d > maxDist) maxDist = d;
            }
            
            // Calculate lap time
            if (lapTimeChannel && lapData.length > 0) {
                // Use elapsed lap time from last data point
                var lastLapTime = parseFloat(lapData[lapData.length - 1][lapTimeChannel]) || 0;
                if (lastLapTime > 10 && lastLapTime < 600) { // Reasonable lap time (10s - 10min)
                    lapTime = lastLapTime;
                }
            }
            
            if (!lapTime && startTime !== null && endTime !== null) {
                lapTime = endTime - startTime;
            }
            
            avgSpeed = speedCount > 0 ? speedSum / speedCount : 0;
            
            // Determine if this is a complete lap
            var isComplete = maxDist > trackLength * 0.9;
            
            this.detectedLaps.push({
                lapNumber: this.detectedLaps.length + 1,
                startIndex: startIdx,
                endIndex: endIdx,
                dataPoints: lapData.length,
                lapTime: lapTime,
                lapTimeFormatted: lapTime ? this.formatLapTime(lapTime) : '--:--.---',
                minSpeed: minSpeed === Infinity ? 0 : minSpeed,
                maxSpeed: maxSpeed,
                avgSpeed: avgSpeed,
                distance: maxDist,
                isComplete: isComplete,
                selected: false
            });
        }
        
        // Sort by lap time (fastest first) for reference
        var sortedByTime = this.detectedLaps.slice().sort(function(a, b) {
            if (!a.lapTime) return 1;
            if (!b.lapTime) return -1;
            return a.lapTime - b.lapTime;
        });
        
        // Mark fastest lap
        if (sortedByTime.length > 0 && sortedByTime[0].lapTime) {
            var fastestIdx = this.detectedLaps.findIndex(function(l) { return l === sortedByTime[0]; });
            if (fastestIdx !== -1) this.detectedLaps[fastestIdx].isFastest = true;
        }
        
        this.renderLapSelector();
    }
    
    formatLapTime(seconds) {
        if (!seconds || isNaN(seconds)) return '--:--.---';
        var mins = Math.floor(seconds / 60);
        var secs = seconds % 60;
        return mins + ':' + (secs < 10 ? '0' : '') + secs.toFixed(3);
    }
    
    renderLapSelector() {
        var self = this;
        var container = document.getElementById('lap-selector-container');
        if (!container) return;
        
        if (this.detectedLaps.length === 0) {
            container.innerHTML = '<p class="text-[#6e7681] text-center py-8">No laps detected. Upload a session file above.</p>';
            return;
        }
        
        var html = '<div class="mb-4 flex items-center justify-between">';
        html += '<div class="text-sm text-[#6e7681]">' + this.detectedLaps.length + ' laps detected</div>';
        html += '<div class="flex gap-2">';
        html += '<button id="auto-select-best" class="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm">Auto-select Best</button>';
        html += '<button id="clear-selection" class="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-sm">Clear</button>';
        html += '</div></div>';
        
        html += '<div class="overflow-x-auto">';
        html += '<table class="w-full text-sm">';
        html += '<thead class="bg-gray-700">';
        html += '<tr>';
        html += '<th class="px-3 py-2 text-left">Lap</th>';
        html += '<th class="px-3 py-2 text-left">Time</th>';
        html += '<th class="px-3 py-2 text-center">Min Speed</th>';
        html += '<th class="px-3 py-2 text-center">Max Speed</th>';
        html += '<th class="px-3 py-2 text-center">Avg Speed</th>';
        html += '<th class="px-3 py-2 text-center">Points</th>';
        html += '<th class="px-3 py-2 text-center">Reference</th>';
        html += '<th class="px-3 py-2 text-center">Comparison</th>';
        html += '</tr></thead>';
        html += '<tbody>';
        
        this.detectedLaps.forEach(function(lap, idx) {
            var rowClass = lap.isFastest ? 'bg-green-900/30' : (lap.isComplete ? '' : 'bg-yellow-900/20 opacity-60');
            var timeClass = lap.isFastest ? 'text-green-400 font-bold' : '';
            
            html += '<tr class="border-b border-[#30363d] border-gray-700 hover:bg-gray-700/50 ' + rowClass + '">';
            html += '<td class="px-3 py-2">';
            html += '<span class="font-mono">' + lap.lapNumber + '</span>';
            if (lap.isFastest) html += ' <span class="text-green-400 text-xs">★ FASTEST</span>';
            if (!lap.isComplete) html += ' <span class="text-yellow-400 text-xs">(incomplete)</span>';
            html += '</td>';
            html += '<td class="px-3 py-2 font-mono ' + timeClass + '">' + lap.lapTimeFormatted + '</td>';
            html += '<td class="px-3 py-2 text-center font-mono">' + Math.round(lap.minSpeed) + '</td>';
            html += '<td class="px-3 py-2 text-center font-mono">' + Math.round(lap.maxSpeed) + '</td>';
            html += '<td class="px-3 py-2 text-center font-mono">' + Math.round(lap.avgSpeed) + '</td>';
            html += '<td class="px-3 py-2 text-center text-[#6e7681]">' + lap.dataPoints + '</td>';
            html += '<td class="px-3 py-2 text-center">';
            html += '<input type="radio" name="ref-lap" value="' + idx + '" class="ref-lap-radio w-4 h-4 accent-cyan-500" ' + (self.selectedRefLap === idx ? 'checked' : '') + '>';
            html += '</td>';
            html += '<td class="px-3 py-2 text-center">';
            html += '<input type="radio" name="comp-lap" value="' + idx + '" class="comp-lap-radio w-4 h-4 accent-pink-500" ' + (self.selectedCompLap === idx ? 'checked' : '') + '>';
            html += '</td>';
            html += '</tr>';
        });
        
        html += '</tbody></table></div>';
        
        html += '<div class="mt-4 flex items-center justify-between">';
        html += '<div class="flex gap-4 text-sm">';
        html += '<div><span class="inline-block w-3 h-3 bg-cyan-500 rounded mr-1"></span> Reference: <span id="ref-lap-display" class="font-mono">' + (this.selectedRefLap !== null ? 'Lap ' + this.detectedLaps[this.selectedRefLap].lapNumber : 'None') + '</span></div>';
        html += '<div><span class="inline-block w-3 h-3 bg-pink-500 rounded mr-1"></span> Comparison: <span id="comp-lap-display" class="font-mono">' + (this.selectedCompLap !== null ? 'Lap ' + this.detectedLaps[this.selectedCompLap].lapNumber : 'None') + '</span></div>';
        html += '</div>';
        html += '<button id="load-selected-laps" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed" ' + (this.selectedRefLap === null || this.selectedCompLap === null ? 'disabled' : '') + '>Load Selected Laps</button>';
        html += '</div>';
        
        container.innerHTML = html;
        
        // Add event listeners
        document.querySelectorAll('.ref-lap-radio').forEach(function(radio) {
            radio.addEventListener('change', function(e) {
                self.selectedRefLap = parseInt(e.target.value);
                self.updateLapSelection();
            });
        });
        
        document.querySelectorAll('.comp-lap-radio').forEach(function(radio) {
            radio.addEventListener('change', function(e) {
                self.selectedCompLap = parseInt(e.target.value);
                self.updateLapSelection();
            });
        });
        
        document.getElementById('auto-select-best').addEventListener('click', function() {
            self.autoSelectBestLaps();
        });
        
        document.getElementById('clear-selection').addEventListener('click', function() {
            self.selectedRefLap = null;
            self.selectedCompLap = null;
            self.renderLapSelector();
        });
        
        document.getElementById('load-selected-laps').addEventListener('click', function() {
            self.loadSelectedLaps();
        });
    }
    
    updateLapSelection() {
        var refDisplay = document.getElementById('ref-lap-display');
        var compDisplay = document.getElementById('comp-lap-display');
        var loadBtn = document.getElementById('load-selected-laps');
        
        if (refDisplay) {
            refDisplay.textContent = this.selectedRefLap !== null ? 'Lap ' + this.detectedLaps[this.selectedRefLap].lapNumber : 'None';
        }
        if (compDisplay) {
            compDisplay.textContent = this.selectedCompLap !== null ? 'Lap ' + this.detectedLaps[this.selectedCompLap].lapNumber : 'None';
        }
        if (loadBtn) {
            loadBtn.disabled = this.selectedRefLap === null || this.selectedCompLap === null;
        }
    }
    
    autoSelectBestLaps() {
        // Find fastest complete lap for reference
        var completeLaps = this.detectedLaps.filter(function(l) { return l.isComplete && l.lapTime; });
        if (completeLaps.length < 2) {
            this.showNotification('Need at least 2 complete laps for auto-selection', 'error');
            return;
        }
        
        // Sort by time
        completeLaps.sort(function(a, b) { return a.lapTime - b.lapTime; });
        
        // Fastest lap is reference, second fastest is comparison
        this.selectedRefLap = this.detectedLaps.indexOf(completeLaps[0]);
        this.selectedCompLap = this.detectedLaps.indexOf(completeLaps[1]);
        
        this.renderLapSelector();
        this.showNotification('Auto-selected fastest lap (' + completeLaps[0].lapTimeFormatted + ') as reference', 'success');
    }
    
    loadSelectedLaps() {
        if (this.selectedRefLap === null || this.selectedCompLap === null) {
            this.showNotification('Please select both reference and comparison laps', 'error');
            return;
        }
        
        var refLap = this.detectedLaps[this.selectedRefLap];
        var compLap = this.detectedLaps[this.selectedCompLap];
        
        console.log('=== LOADING SELECTED LAPS ===');
        console.log('Reference lap:', refLap.lapNumber, 'indices:', refLap.startIndex, '-', refLap.endIndex);
        console.log('Comparison lap:', compLap.lapNumber, 'indices:', compLap.startIndex, '-', compLap.endIndex);
        
        // Extract lap data from full session
        var refRawData = this.fullSessionData.slice(refLap.startIndex, refLap.endIndex);
        var compRawData = this.fullSessionData.slice(compLap.startIndex, compLap.endIndex);
        
        console.log('Raw ref data:', refRawData.length, 'rows');
        console.log('Raw ref first row:', JSON.stringify(refRawData[0]).substring(0, 300));
        console.log('Raw comp data:', compRawData.length, 'rows');
        console.log('Raw comp first row:', JSON.stringify(compRawData[0]).substring(0, 300));
        
        // Normalize the data - reset distance and time to start from 0
        this.referenceData = this.normalizeLapData(refRawData);
        this.currentData = this.normalizeLapData(compRawData);
        
        console.log('=== AFTER NORMALIZATION ===');
        console.log('Ref data first row:', JSON.stringify(this.referenceData[0]).substring(0, 300));
        console.log('Ref data last row:', JSON.stringify(this.referenceData[this.referenceData.length-1]).substring(0, 300));
        console.log('Comp data first row:', JSON.stringify(this.currentData[0]).substring(0, 300));
        console.log('Comp data last row:', JSON.stringify(this.currentData[this.currentData.length-1]).substring(0, 300));
        
        // Update file info displays
        this.displayFileInfo('ref', { name: 'Lap ' + refLap.lapNumber + ' (' + refLap.lapTimeFormatted + ')' });
        this.displayFileInfo('curr', { name: 'Lap ' + compLap.lapNumber + ' (' + compLap.lapTimeFormatted + ')' });
        
        // Detect channels and update UI
        this.detectChannels();
        
        // Detect corners from telemetry (for chart markers)
        this.detectCornersFromTelemetry();
        
        this.showNotification('Loaded Lap ' + refLap.lapNumber + ' (ref) vs Lap ' + compLap.lapNumber + ' (comp)', 'success');
        
        // Switch to telemetry tab to show loaded data
        this.switchTab('telemetry');
    }
    
    normalizeLapData(rawData) {
        if (!rawData || rawData.length === 0) return rawData;
        
        // Find distance and time channel names
        var sampleRow = rawData[0];
        var columns = Object.keys(sampleRow);
        
        // Find the primary lap distance channel (resets each lap)
        var lapDistChannel = null;
        var lapDistNames = ['Lap Distance', 'Lap Distance[m]', 'LapDist[m]', 'LapDist'];
        for (var i = 0; i < lapDistNames.length; i++) {
            if (sampleRow[lapDistNames[i]] !== undefined) {
                lapDistChannel = lapDistNames[i];
                break;
            }
        }
        
        // Find ALL distance-type channels that need normalization
        var allDistChannels = columns.filter(function(col) {
            var cl = col.toLowerCase();
            return (cl.indexOf('distance') !== -1 || cl === 'dist') && cl.indexOf('lateral') === -1;
        });
        
        // Find time channel
        var timeChannel = null;
        var timeNames = ['Time', 'time', 'Elapsed Time', 'Elapsed Time[s]'];
        for (var i = 0; i < timeNames.length; i++) {
            if (sampleRow[timeNames[i]] !== undefined) {
                timeChannel = timeNames[i];
                break;
            }
        }
        
        console.log('Normalizing lap data:');
        console.log('  - Lap Distance channel:', lapDistChannel);
        console.log('  - All distance channels to normalize:', allDistChannels);
        console.log('  - Time channel:', timeChannel);
        
        // Get starting values for lap distance (this is the canonical one that resets per lap)
        var startLapDist = lapDistChannel ? (parseFloat(rawData[0][lapDistChannel]) || 0) : 0;
        var startTime = timeChannel ? (parseFloat(rawData[0][timeChannel]) || 0) : 0;
        
        // Get starting values for each distance channel
        var startDistValues = {};
        allDistChannels.forEach(function(ch) {
            startDistValues[ch] = parseFloat(rawData[0][ch]) || 0;
        });
        
        console.log('  - Start lap distance:', startLapDist);
        console.log('  - Start time:', startTime);
        console.log('  - Start values for all dist channels:', startDistValues);
        
        // Create normalized copy of data
        var normalized = rawData.map(function(row) {
            var newRow = {};
            
            // Copy all fields
            columns.forEach(function(col) {
                newRow[col] = row[col];
            });
            
            // Normalize ALL distance channels
            allDistChannels.forEach(function(distCh) {
                if (row[distCh] !== undefined) {
                    var origDist = parseFloat(row[distCh]) || 0;
                    newRow[distCh] = origDist - startDistValues[distCh];
                }
            });
            
            // Also set standardized 'distance' field using lap distance
            if (lapDistChannel && row[lapDistChannel] !== undefined) {
                var normalizedLapDist = (parseFloat(row[lapDistChannel]) || 0) - startLapDist;
                newRow.distance = normalizedLapDist;
                newRow['Lap Distance'] = normalizedLapDist;
                // Also update Distance field to match (for chart compatibility)
                newRow['Distance'] = normalizedLapDist;
            }
            
            // Normalize time to start from 0
            if (timeChannel && row[timeChannel] !== undefined) {
                var origTime = parseFloat(row[timeChannel]) || 0;
                var normalizedTime = origTime - startTime;
                newRow[timeChannel] = normalizedTime;
                newRow.time = normalizedTime;
                newRow['Time'] = normalizedTime;
            }
            
            return newRow;
        });
        
        // Log final range
        if (normalized.length > 0) {
            var lastRow = normalized[normalized.length - 1];
            console.log('  - Normalized lap distance range: 0 to', lastRow['Lap Distance'] || lastRow.distance || 'unknown');
            console.log('  - Normalized Distance range: 0 to', lastRow['Distance'] || 'unknown');
            console.log('  - Normalized time range: 0 to', lastRow.time || lastRow[timeChannel] || 'unknown');
        }
        
        return normalized;
    }
    
    // =====================================================
    // LOCAL CORNER DETECTION - Curvature-based algorithm
    // Uses lateral G and heading to calculate track curvature
    // Corners are detected as peaks in curvature, not just speed minima
    // =====================================================
    
    detectCornersFromTelemetry() {
        if (!this.referenceData || this.referenceData.length < 100) {
            console.log('Not enough data for corner detection');
            return [];
        }
        
        var self = this;
        var data = this.referenceData;
        
        // Find channel names
        var speedNames = ['Speed', 'Speed[kph]', 'Ground Speed', 'Ground Speed_ms', 'speed', 'Speed_ms'];
        var distNames = ['Corrected Distance', 'Corrected Distance[m]', 'Lap Distance', 'Lap Distance[m]', 'Distance', 'distance', 'Dist'];
        var brakeNames = ['Brake', 'Brake[%]', 'brake'];
        var gLatNames = ['G-Force Lat', 'G-Force Lat[G]', 'Lateral G', 'LatG', 'Lat Accel', 'LateralAcceleration', 'G Lat[G]', 'G Lat'];
        var headingNames = ['Yaw[°]', 'Yaw', 'Heading', 'Heading[°]', 'Car Heading', 'YawNorth[°]', 'YawNorth'];
        var steerNames = ['Steering Wheel Angle[°]', 'SteeringWheelAngle[°]', 'Steered Angle', 'Steering (Filtered)[°]', 'Steering', 'steer'];
        
        function getValue(row, names, def) {
            for (var i = 0; i < names.length; i++) {
                if (row[names[i]] !== undefined && row[names[i]] !== null) {
                    var val = parseFloat(row[names[i]]);
                    if (!isNaN(val)) return val;
                }
            }
            return def;
        }
        
        // Sample data at reasonable rate
        var sampleRate = Math.max(1, Math.floor(data.length / 3000));
        var sampledData = [];
        var usedDistChannel = null;
        var hasGLat = false;
        var hasHeading = false;
        
        for (var i = 0; i < data.length; i += sampleRate) {
            var row = data[i];
            var dist = getValue(row, distNames, 0);
            var gLat = getValue(row, gLatNames, null);
            var heading = getValue(row, headingNames, null);
            
            // Log which channels we're using on first iteration
            if (i === 0) {
                for (var d = 0; d < distNames.length; d++) {
                    if (row[distNames[d]] !== undefined) {
                        usedDistChannel = distNames[d];
                        break;
                    }
                }
                hasGLat = gLat !== null;
                hasHeading = heading !== null;
            }
            
            sampledData.push({
                index: i,
                distance: dist,
                speed: getValue(row, speedNames, 0),
                brake: getValue(row, brakeNames, 0),
                gLat: gLat || 0,
                heading: heading || 0,
                steering: getValue(row, steerNames, 0)
            });
        }
        
        console.log('=== CURVATURE-BASED CORNER DETECTION ===');
        console.log('Sampled', sampledData.length, 'points from', data.length);
        console.log('Using distance channel:', usedDistChannel, '| Range: 0 to', sampledData[sampledData.length-1].distance.toFixed(0) + 'm');
        console.log('Has lateral G:', hasGLat, '| Has heading:', hasHeading);
        
        // Find track length
        var trackLength = sampledData[sampledData.length - 1].distance || 5000;
        
        // Get speed statistics
        var speeds = sampledData.map(function(d) { return d.speed; }).filter(function(s) { return s > 1; });
        var avgSpeed = speeds.reduce(function(a, b) { return a + b; }, 0) / speeds.length;
        var maxSpeed = Math.max.apply(null, speeds);
        
        // Detect if speed is in m/s or km/h
        var speedUnit = maxSpeed < 100 ? 'm/s' : 'km/h';
        var speedMultiplier = speedUnit === 'm/s' ? 3.6 : 1;
        var speedToMs = speedUnit === 'm/s' ? 1 : 1/3.6; // Convert to m/s for curvature calc
        
        console.log('Speed unit detected:', speedUnit);
        console.log('Speed stats (km/h): avg=' + (avgSpeed * speedMultiplier).toFixed(1) + ', max=' + (maxSpeed * speedMultiplier).toFixed(1));
        
        // STEP 1: Calculate curvature at each point
        // Curvature κ = lateral_accel / velocity² (from physics)
        // Or from heading: κ = dθ/ds (rate of heading change per distance)
        
        for (var i = 1; i < sampledData.length - 1; i++) {
            var curr = sampledData[i];
            var prev = sampledData[i - 1];
            var next = sampledData[i + 1];
            
            var speedMs = curr.speed * speedToMs;
            if (speedMs < 5) speedMs = 5; // Avoid division by near-zero
            
            // Method 1: From lateral G (preferred if available)
            // κ = g_lat * 9.81 / v²
            if (hasGLat && Math.abs(curr.gLat) > 0.05) {
                curr.curvature = Math.abs(curr.gLat) * 9.81 / (speedMs * speedMs);
            }
            // Method 2: From heading change (if no lateral G)
            else if (hasHeading) {
                var dHeading = next.heading - prev.heading;
                // Handle wraparound (e.g., 359° to 1°)
                if (dHeading > 180) dHeading -= 360;
                if (dHeading < -180) dHeading += 360;
                var dDist = next.distance - prev.distance;
                if (dDist > 0.1) {
                    // Convert to radians and calculate curvature
                    curr.curvature = Math.abs(dHeading * Math.PI / 180) / dDist;
                } else {
                    curr.curvature = 0;
                }
            }
            // Method 3: Fallback - estimate from steering angle
            else if (Math.abs(curr.steering) > 1) {
                // Rough estimate: more steering = more curvature
                curr.curvature = Math.abs(curr.steering) / (speedMs * 50);
            }
            else {
                curr.curvature = 0;
            }
        }
        
        // First and last points
        sampledData[0].curvature = sampledData[1].curvature || 0;
        sampledData[sampledData.length - 1].curvature = sampledData[sampledData.length - 2].curvature || 0;
        
        // STEP 2: Smooth the curvature to reduce noise
        var smoothWindow = Math.max(3, Math.floor(sampledData.length / 500));
        for (var i = smoothWindow; i < sampledData.length - smoothWindow; i++) {
            var sum = 0;
            for (var j = -smoothWindow; j <= smoothWindow; j++) {
                sum += sampledData[i + j].curvature;
            }
            sampledData[i].smoothCurvature = sum / (smoothWindow * 2 + 1);
        }
        // Fill edges
        for (var i = 0; i < smoothWindow; i++) {
            sampledData[i].smoothCurvature = sampledData[i].curvature;
            sampledData[sampledData.length - 1 - i].smoothCurvature = sampledData[sampledData.length - 1 - i].curvature;
        }
        
        // Get curvature statistics
        var curvatures = sampledData.map(function(d) { return d.smoothCurvature || 0; });
        var avgCurvature = curvatures.reduce(function(a, b) { return a + b; }, 0) / curvatures.length;
        var maxCurvature = Math.max.apply(null, curvatures);
        
        console.log('Curvature stats: avg=' + avgCurvature.toFixed(6) + ', max=' + maxCurvature.toFixed(6));
        
        // STEP 3: Find peaks in curvature (these are corners)
        var curvatureThreshold = avgCurvature + (maxCurvature - avgCurvature) * 0.15; // Top 85% of curvature range
        var minCornerSpacing = trackLength / 100; // ~53m minimum between corners
        var peakWindow = Math.max(5, Math.floor(sampledData.length / 400));
        
        console.log('Curvature threshold:', curvatureThreshold.toFixed(6), '| Min spacing:', minCornerSpacing.toFixed(0) + 'm');
        
        var corners = [];
        var lastCornerDist = -minCornerSpacing;
        
        for (var i = peakWindow; i < sampledData.length - peakWindow; i++) {
            var curr = sampledData[i];
            var curv = curr.smoothCurvature || 0;
            
            // Skip if below threshold
            if (curv < curvatureThreshold) continue;
            
            // Skip if too close to last corner
            if (curr.distance - lastCornerDist < minCornerSpacing) continue;
            
            // Check if this is a local maximum in curvature
            var isLocalMax = true;
            for (var j = -peakWindow; j <= peakWindow; j++) {
                if (j === 0) continue;
                if ((sampledData[i + j].smoothCurvature || 0) > curv) {
                    isLocalMax = false;
                    break;
                }
            }
            
            if (isLocalMax) {
                // Find the actual apex (minimum speed) near this curvature peak
                var apexIdx = i;
                var apexSpeed = curr.speed;
                var searchRange = Math.floor(peakWindow * 2);
                
                for (var j = -searchRange; j <= searchRange; j++) {
                    var idx = i + j;
                    if (idx >= 0 && idx < sampledData.length) {
                        if (sampledData[idx].speed < apexSpeed) {
                            apexSpeed = sampledData[idx].speed;
                            apexIdx = idx;
                        }
                    }
                }
                
                var apexPoint = sampledData[apexIdx];
                
                // Determine corner severity based on curvature and speed
                var severity = 'kink';
                var speedKmh = apexPoint.speed * speedMultiplier;
                if (curv > avgCurvature * 4 || speedKmh < avgSpeed * speedMultiplier * 0.5) {
                    severity = 'heavy';
                } else if (curv > avgCurvature * 2 || speedKmh < avgSpeed * speedMultiplier * 0.7) {
                    severity = 'medium';
                } else if (curv > avgCurvature * 1.3) {
                    severity = 'light';
                }
                
                corners.push({
                    distance: apexPoint.distance,
                    speed: Math.round(speedKmh),
                    curvature: curv,
                    type: 'corner',
                    severity: severity,
                    apex: true
                });
                
                lastCornerDist = apexPoint.distance;
            }
        }
        
        console.log('Found', corners.length, 'corners from curvature peaks');
        
        // STEP 4: Also check for speed-based corners that curvature might miss
        var speedThreshold = avgSpeed * 0.75;
        lastCornerDist = -minCornerSpacing;
        var additionalCorners = [];
        
        for (var i = peakWindow; i < sampledData.length - peakWindow; i++) {
            var curr = sampledData[i];
            
            if (curr.speed > speedThreshold) continue;
            
            var nearExisting = corners.some(function(c) {
                return Math.abs(c.distance - curr.distance) < minCornerSpacing * 0.7;
            });
            if (nearExisting) continue;
            
            if (curr.distance - lastCornerDist < minCornerSpacing) continue;
            
            var isLocalMin = true;
            for (var j = -peakWindow; j <= peakWindow; j++) {
                if (j === 0) continue;
                if (sampledData[i + j].speed < curr.speed) {
                    isLocalMin = false;
                    break;
                }
            }
            
            if (isLocalMin) {
                var speedKmh = curr.speed * speedMultiplier;
                var severity = speedKmh < avgSpeed * speedMultiplier * 0.5 ? 'heavy' : 
                               speedKmh < avgSpeed * speedMultiplier * 0.65 ? 'medium' : 'light';
                
                additionalCorners.push({
                    distance: curr.distance,
                    speed: Math.round(speedKmh),
                    curvature: curr.smoothCurvature || 0,
                    type: 'corner',
                    severity: severity,
                    apex: true,
                    source: 'speed'
                });
                
                lastCornerDist = curr.distance;
            }
        }
        
        if (additionalCorners.length > 0) {
            console.log('Found', additionalCorners.length, 'additional corners from speed minima');
            corners = corners.concat(additionalCorners);
        }
        
        // Sort by distance
        corners.sort(function(a, b) { return a.distance - b.distance; });
        
        // STEP 5: Final merge - combine corners that are very close together
        var mergeDistance = trackLength / 120; // ~44m merge threshold
        var mergedCorners = [];
        var i = 0;
        
        while (i < corners.length) {
            var cluster = [corners[i]];
            var j = i + 1;
            
            while (j < corners.length && corners[j].distance - corners[i].distance < mergeDistance) {
                cluster.push(corners[j]);
                j++;
            }
            
            // Keep the corner with highest curvature (or slowest speed if curvature is similar)
            var best = cluster.reduce(function(a, b) {
                if (Math.abs((a.curvature || 0) - (b.curvature || 0)) < 0.001) {
                    return a.speed < b.speed ? a : b;
                }
                return (a.curvature || 0) > (b.curvature || 0) ? a : b;
            });
            
            mergedCorners.push(best);
            i = j;
        }
        
        if (corners.length !== mergedCorners.length) {
            console.log('Merged', corners.length, 'corners down to', mergedCorners.length);
        }
        corners = mergedCorners;
        
        // Number the corners
        corners.forEach(function(corner, idx) {
            corner.name = 'T' + (idx + 1);
            corner.number = idx + 1;
        });
        
        console.log('=== FINAL CORNER DETECTION: ' + corners.length + ' corners ===');
        corners.forEach(function(c) {
            var sourceTag = c.source === 'speed' ? ' [spd]' : '';
            console.log('  ' + c.name + ': ' + c.distance.toFixed(0) + 'm @ ' + c.speed + 'km/h (' + c.severity + ', κ=' + (c.curvature || 0).toFixed(5) + ')' + sourceTag);
        });
        
        // Store detected corners
        this.detectedCorners = corners;
        return corners;
    }
    
    getCorners() {
        // Return detected corners, or fall back to AI analysis results
        if (this.detectedCorners && this.detectedCorners.length > 0) {
            return this.detectedCorners;
        }
        
        // Fall back to AI results if available
        if (this.analysisResults && this.analysisResults.trackSegments) {
            return this.analysisResults.trackSegments
                .filter(function(s) { return s.type === 'corner'; })
                .sort(function(a, b) { return (a.distance || 0) - (b.distance || 0); });
        }
        
        return [];
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
            var formatSelect = document.getElementById('csv-format');
            var selectedFormat = formatSelect ? formatSelect.value : 'auto';
            
            // Detect or use selected format
            var format = selectedFormat === 'auto' ? self.detectCSVFormat(text) : selectedFormat;
            console.log('CSV Format detected/selected:', format);
            
            // Show format detection notification
            if (selectedFormat === 'auto' && format !== 'generic') {
                var formatNames = {
                    'pitoolbox': 'Pi Toolbox',
                    'motec': 'MoTeC i2',
                    'aim': 'AiM RaceStudio',
                    'racebox': 'RaceBox',
                    'iracing': 'iRacing'
                };
                self.showNotification('Auto-detected: ' + (formatNames[format] || format) + ' format', 'success');
            }
            
            var parsedData;
            try {
                switch(format) {
                    case 'pitoolbox':
                        parsedData = self.parsePiToolbox(text);
                        break;
                    case 'motec':
                        parsedData = self.parseMoTeC(text);
                        break;
                    case 'aim':
                        parsedData = self.parseAiM(text);
                        break;
                    default:
                        parsedData = self.parseGenericCSV(text);
                }
                
                if (!parsedData || parsedData.length === 0) {
                    self.showNotification('No data found in CSV file', 'error');
                    return;
                }
                
                if (type === 'ref') { 
                    self.referenceData = parsedData; 
                    self.displayFileInfo('ref', file); 
                } else { 
                    self.currentData = parsedData; 
                    self.displayFileInfo('curr', file); 
                }
                
                if (self.referenceData && self.currentData) {
                    self.detectChannels();
                }
            } catch(err) {
                console.error('CSV parsing error:', err);
                self.showNotification('Error parsing CSV: ' + err.message, 'error');
            }
        };
        reader.onerror = function() { self.showNotification('Error reading file', 'error'); };
        reader.readAsText(file);
    }
    
    detectCSVFormat(text) {
        var lines = text.split(/\r?\n/);
        var firstLine = lines[0] || '';
        var secondLine = lines[1] || '';
        
        // Pi Toolbox detection
        if (firstLine.indexOf('PiToolboxVersionedASCIIDataSet') !== -1) {
            return 'pitoolbox';
        }
        
        // MoTeC detection
        if (firstLine.indexOf('MoTeC CSV File') !== -1 || firstLine.indexOf('MoTeC') !== -1) {
            return 'motec';
        }
        
        // AiM detection
        if (firstLine.indexOf('AiM') !== -1 || firstLine.indexOf('RaceStudio') !== -1) {
            return 'aim';
        }
        
        // RaceBox detection
        if (firstLine.indexOf('RaceBox') !== -1 || text.indexOf('GPS_Latitude') !== -1) {
            return 'racebox';
        }
        
        // iRacing IBT export
        if (text.indexOf('SessionTime') !== -1 && text.indexOf('Lap') !== -1) {
            return 'iracing';
        }
        
        return 'generic';
    }
    
    parsePiToolbox(text) {
        console.log('=== parsePiToolbox START ===');
        var lines = text.split(/\r?\n/);
        console.log('Total lines:', lines.length);
        
        var channelBlocks = [];
        var currentBlock = null;
        var metadata = {};
        var inOuting = false;
        
        // Parse the file structure
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            
            // Skip empty lines
            if (!line) continue;
            
            // Parse outing information
            if (line === '{OutingInformation}') {
                inOuting = true;
                continue;
            }
            
            if (inOuting && line.startsWith('{')) {
                inOuting = false;
            }
            
            if (inOuting && line.indexOf('\t') !== -1) {
                var parts = line.split('\t');
                if (parts.length >= 2) {
                    metadata[parts[0]] = parts[1];
                }
                continue;
            }
            
            // Detect channel block start
            if (line === '{ChannelBlock}') {
                if (currentBlock && currentBlock.data.length > 0) {
                    channelBlocks.push(currentBlock);
                }
                currentBlock = { channelName: null, data: [] };
                continue;
            }
            
            // Parse channel header (Time + ChannelName)
            if (currentBlock && currentBlock.channelName === null && line.indexOf('Time') === 0) {
                var headers = line.split('\t');
                if (headers.length >= 2) {
                    currentBlock.channelName = headers[1].trim();
                }
                continue;
            }
            
            // Parse data rows
            if (currentBlock && currentBlock.channelName) {
                var values = line.split('\t');
                if (values.length >= 2) {
                    var time = parseFloat(values[0]);
                    var value = parseFloat(values[1]);
                    if (!isNaN(time) && !isNaN(value)) {
                        currentBlock.data.push({ time: time, value: value });
                    }
                }
            }
        }
        
        // Don't forget the last block
        if (currentBlock && currentBlock.data.length > 0) {
            channelBlocks.push(currentBlock);
        }
        
        console.log('Pi Toolbox: Found', channelBlocks.length, 'channel blocks');
        console.log('Channels:', channelBlocks.map(function(b) { return b.channelName; }));
        
        // Auto-populate driver and track from metadata
        if (metadata.DriverName) {
            var driverInput = document.getElementById('driver-name');
            if (driverInput && !driverInput.value) {
                driverInput.value = metadata.DriverName;
            }
        }
        if (metadata.TrackName) {
            var trackInput = document.getElementById('track-name');
            if (trackInput && !trackInput.value) {
                // Clean up track name (remove path separators)
                var trackName = metadata.TrackName.replace(/\\/g, ' ').replace(/\//g, ' ').trim();
                trackInput.value = trackName;
            }
        }
        
        // Merge all channels to a common time base
        return this.mergeChannelBlocks(channelBlocks, metadata);
    }
    
    mergeChannelBlocks(channelBlocks, metadata) {
        console.log('=== mergeChannelBlocks START ===');
        console.log('Input channel blocks:', channelBlocks.length);
        
        if (channelBlocks.length === 0) {
            console.log('No channel blocks to merge - returning empty array');
            return [];
        }
        
        // Find the master time channel (use the one with most data points)
        var masterBlock = channelBlocks.reduce(function(max, block) {
            return block.data.length > max.data.length ? block : max;
        }, channelBlocks[0]);
        
        console.log('Master block:', masterBlock.channelName, 'with', masterBlock.data.length, 'points');
        
        var masterTimes = masterBlock.data.map(function(d) { return d.time; });
        
        // Create merged data array
        var mergedData = masterTimes.map(function(time) {
            return { 'Time': time };
        });
        
        console.log('Created merged array with', mergedData.length, 'rows');
        
        // For each channel, interpolate values to master time base
        var self = this;
        channelBlocks.forEach(function(block) {
            var channelName = self.normalizeChannelName(block.channelName);
            
            for (var i = 0; i < masterTimes.length; i++) {
                var t = masterTimes[i];
                var value = self.interpolateValue(block.data, t);
                mergedData[i][channelName] = value;
            }
        });
        
        // Add metadata as properties (can be accessed later)
        if (mergedData.length > 0) {
            mergedData.metadata = metadata;
        }
        
        console.log('Merged data rows:', mergedData.length);
        if (mergedData.length > 0) {
            console.log('Sample row keys:', Object.keys(mergedData[0]));
            console.log('Sample row:', mergedData[0]);
        }
        
        // Convert units (mph/m/s to km/h)
        mergedData = this.convertUnits(mergedData);
        
        return mergedData;
    }
    
    normalizeChannelName(name) {
        // Convert Pi Toolbox names to standard names
        var mappings = {
            'Brake[%]': 'Brake',
            'Throttle[%]': 'Throttle',
            'Clutch[%]': 'Clutch',
            'Speed[mph]': 'Speed_mph',  // Mark for conversion
            'Speed[m/s]': 'Speed_ms',   // Mark for conversion
            'Corrected Speed[m/s]': 'Ground Speed_ms',
            'Distance[m]': 'Distance',
            'Corrected Distance[m]': 'Corrected Distance',
            'Lap Distance[m]': 'Lap Distance',
            'Steering Wheel Angle[°]': 'Steered Angle',
            'Gear': 'Gear',
            'Heading[°]': 'Heading',
            'Pitch[°]': 'Pitch',
            'Roll[°]': 'Roll',
            'Elapsed Time[s]': 'Elapsed Time',
            'Elapsed Lap Time[s]': 'Lap Time',
            'Elapsed Sector Time[s]': 'Sector Time',
            'Lateral Track Pos[mile]': 'Track Position'
        };
        
        return mappings[name] || name;
    }
    
    convertUnits(data) {
        // Convert speed units to km/h for consistency
        var hasSpeedMph = data[0] && data[0]['Speed_mph'] !== undefined;
        var hasSpeedMs = data[0] && (data[0]['Speed_ms'] !== undefined || data[0]['Ground Speed_ms'] !== undefined);
        
        data.forEach(function(row) {
            // Convert mph to km/h
            if (row['Speed_mph'] !== undefined) {
                row['Speed'] = row['Speed_mph'] * 1.60934;
                row['Ground Speed'] = row['Speed'];
            }
            // Convert m/s to km/h
            if (row['Speed_ms'] !== undefined) {
                row['Speed'] = row['Speed_ms'] * 3.6;
            }
            if (row['Ground Speed_ms'] !== undefined) {
                row['Ground Speed'] = row['Ground Speed_ms'] * 3.6;
                if (!row['Speed']) row['Speed'] = row['Ground Speed'];
            }
            
            // Ensure we have a Distance channel
            if (!row['Distance'] && row['Corrected Distance']) {
                row['Distance'] = row['Corrected Distance'];
            }
            if (!row['Distance'] && row['Lap Distance']) {
                row['Distance'] = row['Lap Distance'];
            }
        });
        
        return data;
    }
    
    interpolateValue(data, targetTime) {
        if (data.length === 0) return 0;
        if (data.length === 1) return data[0].value;
        
        // Binary search for closest times
        var low = 0, high = data.length - 1;
        
        // Handle edge cases
        if (targetTime <= data[0].time) return data[0].value;
        if (targetTime >= data[high].time) return data[high].value;
        
        // Find bracketing points
        while (high - low > 1) {
            var mid = Math.floor((low + high) / 2);
            if (data[mid].time <= targetTime) {
                low = mid;
            } else {
                high = mid;
            }
        }
        
        // Linear interpolation
        var t0 = data[low].time, t1 = data[high].time;
        var v0 = data[low].value, v1 = data[high].value;
        
        if (t1 === t0) return v0;
        
        var ratio = (targetTime - t0) / (t1 - t0);
        return v0 + ratio * (v1 - v0);
    }
    
    parseMoTeC(text) {
        var lines = text.split(/\r?\n/);
        var headerRowIndex = 0;
        
        // Find header row (contains "Time")
        for (var i = 0; i < Math.min(lines.length, 30); i++) {
            var cells = lines[i].split(',').map(function(c) { return c.replace(/"/g, '').trim(); });
            if (cells[0] === 'Time' || cells.indexOf('Time') !== -1) {
                headerRowIndex = i;
                break;
            }
        }
        
        // Extract header and data (skip units row after header)
        var headerLine = lines[headerRowIndex];
        var dataLines = lines.slice(headerRowIndex + 2); // +2 to skip units row
        var csvText = [headerLine].concat(dataLines).join('\n');
        
        return this.parseGenericCSV(csvText);
    }
    
    parseAiM(text) {
        // AiM format is similar to generic CSV but may have metadata rows
        var lines = text.split(/\r?\n/);
        var headerRowIndex = 0;
        
        // Find the data header
        for (var i = 0; i < Math.min(lines.length, 50); i++) {
            var line = lines[i];
            if (line.indexOf('Time') !== -1 && (line.indexOf(',') !== -1 || line.indexOf('\t') !== -1)) {
                headerRowIndex = i;
                break;
            }
        }
        
        var csvText = lines.slice(headerRowIndex).join('\n');
        return this.parseGenericCSV(csvText);
    }
    
    parseGenericCSV(text) {
        var result = [];
        var self = this;
        
        Papa.parse(text, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: function(results) {
                result = results.data.filter(function(row) {
                    if (!row || Object.keys(row).length === 0) return false;
                    return Object.values(row).some(function(val) { 
                        return val !== null && val !== '' && val !== undefined; 
                    });
                });
            },
            error: function(error) { 
                self.showNotification('Error parsing CSV: ' + error.message, 'error'); 
            }
        });
        
        return result;
    }
    
    displayFileInfo(type, file) {
        var infoDiv = document.getElementById(type + '-file-info');
        var nameSpan = document.getElementById(type + '-file-name');
        var sizeSpan = document.getElementById(type + '-file-size');
        nameSpan.textContent = file.name;
        sizeSpan.textContent = (file.size / 1024).toFixed(1) + ' KB';
        infoDiv.classList.remove('hidden');
        
        var uploadArea = document.getElementById(type + '-upload');
        var accentColor = type === 'ref' ? '#00d4aa' : '#ff6b9d';
        var label = type === 'ref' ? 'Reference' : 'Comparison';
        uploadArea.style.borderColor = accentColor;
        uploadArea.style.borderStyle = 'solid';
        uploadArea.style.background = 'rgba(' + (type === 'ref' ? '0,212,170' : '255,107,157') + ',0.1)';
        uploadArea.innerHTML = '<i class="fas fa-check-circle text-4xl mb-2" style="color:' + accentColor + '"></i><p style="color:' + accentColor + '">' + file.name + '</p><p class="text-xs text-[var(--text-muted)] mt-1">' + label + ' lap loaded</p>';
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
                heading: { description: 'Car heading/direction', icon: 'fa-compass', category: 'Position' },
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
                distance: ['Distance', 'Dist', 'LapDist', 'Lap Distance', 'distance', 'DISTANCE', 'Lap Dist', 'Corrected Distance'],
                speed: ['Ground Speed', 'Speed', 'Drive Speed', 'Vehicle Speed', 'speed', 'SPEED', 'Velocity', 'Max Straight Speed', 'Speed_mph', 'Speed_ms', 'Ground Speed_ms'],
                throttle: ['Throttle Pos', 'Throttle', 'TPS', 'throttle', 'THROTTLE', 'Throttle %', 'ThrottlePos', 'Error Throttle Pos'],
                brake: ['Brake Pres Front', 'Brake Pressure', 'Brake', 'brake', 'BRAKE', 'BrakePressure', 'Brake Pres', 'Brake Pres Rear'],
                gear: ['Gear', 'gear', 'GEAR', 'Gear Position', 'GearPos', 'Gear Pos Volts'],
                steer: ['Steered Angle', 'Steering Angle', 'Steer', 'steer', 'STEER', 'SteerAngle', 'Steering', 'Wheel Slip', 'Steering Wheel Angle'],
                rpm: ['Engine RPM', 'RPM', 'rpm', 'EngineRPM', 'Engine Speed', 'Error Over RPM'],
                engineTemp: ['Engine Temp', 'Water Temp', 'Coolant Temp', 'EngineTemp', 'WaterTemp', 'Error Engine Temp'],
                oilTemp: ['Eng Oil Temp', 'Oil Temp', 'OilTemp', 'Error Oil Temp', 'Gbox Oil Temp', 'Diff Oil Temp'],
                fuelLevel: ['Fuel Level', 'Fuel', 'FuelLevel', 'Fuel Remaining', 'Fuel Used (Raw)', 'Fuel Pres'],
                gLat: ['G Force Lat', 'Lateral G', 'G_Lat', 'gLat', 'GLat', 'LatG', 'LateralAccel', 'G Force Lat - Front', 'G Force Lat - Mid', 'Error Lateral G'],
                gLong: ['G Force Long', 'Longitudinal G', 'G_Long', 'gLong', 'GLong', 'LongG', 'LongAccel', 'G Force Long Front', 'G Force Long Mid', 'Error Long G'],
                gVert: ['G Force Vert', 'Vertical G', 'G_Vert', 'gVert', 'GVert'],
                yaw: ['Gyro Yaw Velocity', 'Yaw Rate', 'Yaw', 'YawRate', 'yaw', 'G Lat Yaw 1 - velcro mount', 'G Lat Yaw 2 - rubber mount'],
                heading: ['Heading', 'Heading[°]', 'Car Heading', 'Yaw Angle'],
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
        if (detected.optional.heading) detected.capabilities.push({ name: 'Heading Track Mapping', icon: 'fa-compass', color: 'cyan' });
        
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
        displayContainer.className = 'mt-6 rounded-lg overflow-hidden border border-[#30363d] bg-[#161b22]';
        
        var html = '<div class="p-4 border-b border-[#30363d] bg-[#0d1117]"><div class="flex items-center justify-between"><div>';
        html += '<h3 class="font-semibold text-sm text-white flex items-center" style="font-family: Rajdhani, sans-serif; letter-spacing: 0.05em;">';
        if (isAIPowered) {
            html += '<i class="fas fa-robot text-[#00d4aa] mr-2"></i>CHANNEL DETECTION';
        } else {
            html += '<i class="fas fa-search text-[#00d4aa] mr-2"></i>CHANNEL DETECTION';
        }
        html += '</h3>';
        html += '<p class="text-xs text-[#8b949e]" style="font-family: JetBrains Mono, monospace;">' + detected.totalColumns + ' columns · ' + totalMatched + ' mapped';
        if (isAIPowered) {
            html += ' <span class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-[rgba(0,212,170,0.15)] text-[#00d4aa] border border-[rgba(0,212,170,0.3)]">AI</span>';
        }
        html += '</p>';
        html += '</div><button id="toggle-channel-details" class="text-xs px-3 py-1.5 rounded border border-[#30363d] bg-[#21262d] text-[#8b949e] hover:bg-[#30363d] hover:text-white transition" style="font-family: Rajdhani, sans-serif;"><i class="fas fa-chevron-down mr-1"></i>Details</button></div></div>';
        
        if (detected.capabilities.length > 0) {
            html += '<div class="p-4 bg-[#161b22] border-b border-[#30363d]"><h4 class="font-semibold text-[#c9d1d9] mb-2"><i class="fas fa-bolt text-yellow-500 mr-2"></i>Analysis Capabilities</h4><div class="flex flex-wrap gap-2">';
            detected.capabilities.forEach(function(cap) { html += '<span class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-' + cap.color + '-100 text-' + cap.color + '-800"><i class="fas ' + cap.icon + ' mr-1"></i>' + cap.name + '</span>'; });
            html += '</div></div>';
        }
        
        html += '<div class="p-4 border-b border-[#30363d]" id="required-channels-section"><h4 class="font-semibold text-[#c9d1d9] mb-2"><i class="fas fa-star text-yellow-500 mr-2"></i>Required Channels (' + requiredCount + '/3)</h4><div class="grid md:grid-cols-3 gap-2">';
        ['time', 'distance', 'speed'].forEach(function(key) {
            if (detected.required[key]) {
                var ch = detected.required[key];
                html += '<div class="bg-green-900/20 border border-green-700 rounded p-2"><div class="flex items-center justify-between"><span class="font-medium text-green-800"><i class="fas ' + ch.icon + ' mr-1"></i>' + key + '</span><i class="fas fa-check-circle text-green-500"></i></div><code class="text-xs text-[#8b949e]">' + ch.csvColumn + '</code></div>';
            } else {
                html += '<div class="bg-red-900/20 border border-red-700 rounded p-2"><div class="flex items-center justify-between"><span class="font-medium text-red-800">' + key + '</span><i class="fas fa-times-circle text-red-500"></i></div><span class="text-xs text-red-500">Missing</span></div>';
            }
        });
        html += '</div></div>';
        
        html += '<div class="p-4 border-b border-[#30363d]" id="optional-channels-section" style="display:none;"><h4 class="font-semibold text-[#c9d1d9] mb-2"><i class="fas fa-plus-circle text-blue-500 mr-2"></i>Optional Channels (' + optionalCount + ' found)</h4>';
        var categories = {};
        Object.keys(detected.optional).forEach(function(key) { var ch = detected.optional[key]; if (!categories[ch.category]) categories[ch.category] = []; categories[ch.category].push({ key: key, data: ch }); });
        Object.keys(categories).forEach(function(cat) {
            html += '<div class="mb-3"><h5 class="text-sm font-medium text-[#8b949e] mb-1">' + cat + '</h5><div class="flex flex-wrap gap-1">';
            categories[cat].forEach(function(item) { html += '<span class="inline-flex items-center px-2 py-1 bg-blue-900/20 text-blue-700 rounded text-xs"><i class="fas ' + item.data.icon + ' mr-1"></i>' + item.key + '</span>'; });
            html += '</div></div>';
        });
        html += '</div>';
        
        if (detected.unrecognized.length > 0) {
            html += '<div class="p-4 bg-[#21262d]" id="unrecognized-section" style="display:none;">';
            html += '<div class="flex items-center justify-between mb-3"><h4 class="font-semibold text-[#8b949e]"><i class="fas fa-question-circle text-[#6e7681] mr-2"></i>Unrecognized Columns (' + detected.unrecognized.length + ')</h4>';
            html += '<button id="expand-all-columns" class="text-sm bg-[#161b22] px-3 py-1 rounded border hover:bg-[#30363d]"><i class="fas fa-expand-alt mr-1"></i>Show All</button></div>';
            html += '<p class="text-xs text-blue-400 mb-3"><i class="fas fa-info-circle mr-1"></i>Click on any column to manually assign it to a telemetry channel</p>';
            html += '<div id="unrecognized-columns-list" class="flex flex-wrap gap-1">';
            detected.unrecognized.forEach(function(col, index) {
                var hiddenClass = index >= 20 ? ' hidden-column' : '';
                var displayStyle = index >= 20 ? ' style="display:none;"' : '';
                html += '<button class="unrecognized-col-btn' + hiddenClass + ' bg-[#30363d] text-[#c9d1d9] text-xs px-2 py-1 rounded hover:bg-blue-200 hover:text-blue-800 cursor-pointer transition" data-column="' + self.escapeHtml(col) + '"' + displayStyle + '>' + self.escapeHtml(col) + '</button>';
            });
            html += '</div>';
            if (detected.unrecognized.length > 20) html += '<p id="columns-count-text" class="text-[#8b949e] text-xs mt-2">Showing 20 of ' + detected.unrecognized.length + ' columns</p>';
            html += '</div>';
        }
        
        html += '<div class="p-4 bg-blue-900/20 border-t" id="custom-mappings-section" style="display:none;"><h4 class="font-semibold text-[#c9d1d9] mb-2"><i class="fas fa-link text-blue-500 mr-2"></i>Custom Channel Mappings</h4>';
        html += '<div id="custom-mappings-list" class="space-y-1"></div>';
        html += '<button id="apply-mappings-btn" class="mt-3 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"><i class="fas fa-check mr-2"></i>Save Mappings</button></div>';
        
        html += '<div class="p-4 border-t border-[#30363d] bg-[#0d1117]"><button id="start-analysis-btn" class="w-full bg-gradient-to-r from-[#00d4aa] to-[#00b894] text-[#0d1117] px-6 py-4 rounded-lg hover:shadow-[0_0_30px_rgba(0,212,170,0.4)] transition font-semibold text-sm tracking-wider" style="font-family: Rajdhani, sans-serif;"><i class="fas fa-play mr-2"></i>ANALYZE TELEMETRY</button></div>';
        
        displayContainer.innerHTML = html;
        var uploadContainer = document.querySelector('#upload-section .glass') || document.querySelector('#upload-section > div');
        if (uploadContainer) uploadContainer.appendChild(displayContainer);
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
        
        var modalHtml = '<div class="bg-[#161b22] rounded-lg p-6 max-w-lg w-full mx-4 max-h-screen overflow-y-auto">';
        modalHtml += '<div class="flex items-center justify-between mb-4"><h3 class="text-lg font-bold"><i class="fas fa-link text-blue-500 mr-2"></i>Map Column to Channel</h3>';
        modalHtml += '<button id="close-mapping-modal" class="text-[#8b949e] hover:text-[#c9d1d9] text-xl"><i class="fas fa-times"></i></button></div>';
        modalHtml += '<div class="mb-4 p-3 bg-blue-900/20 rounded"><p class="text-sm text-[#8b949e]">CSV Column:</p><p id="mapping-column-name" class="font-bold text-blue-700 text-lg"></p></div>';
        modalHtml += '<p class="text-sm text-[#8b949e] mb-4">Select the telemetry channel:</p>';
        
        channelOptions.forEach(function(group) {
            modalHtml += '<div class="mb-4"><h4 class="text-sm font-semibold text-[#8b949e] mb-2">' + group.category + '</h4><div class="grid grid-cols-2 gap-2">';
            group.channels.forEach(function(ch) { modalHtml += '<button class="channel-option-btn text-left p-2 border rounded hover:bg-blue-900/20 hover:border-b border-[#30363d]lue-300 transition text-sm" data-channel="' + ch.key + '"><i class="fas ' + ch.icon + ' text-[#6e7681] mr-2"></i>' + ch.name + '</button>'; });
            modalHtml += '</div></div>';
        });
        
        modalHtml += '<div class="mt-4 pt-4 border-t"><button id="remove-mapping-btn" class="w-full p-2 border border-red-300 text-red-400 rounded hover:bg-red-900/20 transition text-sm"><i class="fas fa-trash mr-2"></i>Remove Mapping</button></div></div>';
        
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
                        if (oldBtn) { oldBtn.classList.remove('bg-green-200', 'text-green-800'); oldBtn.classList.add('bg-[#30363d]', 'text-[#c9d1d9]'); }
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
                
                btn.classList.remove('bg-green-100', 'border-green-500', 'bg-yellow-900/20', 'border-yellow-400', 'opacity-60');
                btn.style.position = 'relative';
                
                var oldBadge = btn.querySelector('.mapping-badge');
                if (oldBadge) oldBadge.remove();
                
                if (existingMapping && channelKey === existingMapping) {
                    btn.classList.add('bg-green-100', 'border-green-500');
                    var badge = document.createElement('span');
                    badge.className = 'mapping-badge absolute top-1 right-1 bg-green-900/200 text-white text-xs px-1.5 py-0.5 rounded';
                    badge.innerHTML = '<i class="fas fa-check"></i> Current';
                    btn.appendChild(badge);
                } else if (mappedColumn) {
                    btn.classList.add('bg-yellow-900/20', 'border-yellow-400', 'opacity-60');
                    var badge = document.createElement('span');
                    badge.className = 'mapping-badge absolute top-1 right-1 bg-yellow-900/200 text-white text-xs px-1.5 py-0.5 rounded max-w-24 truncate';
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
        if (colBtn) { colBtn.classList.remove('bg-[#30363d]', 'text-[#c9d1d9]'); colBtn.classList.add('bg-green-200', 'text-green-800'); }
    }
    
    removeCustomMapping(columnName) {
        if (this.customMappings[columnName]) {
            delete this.customMappings[columnName];
            this.updateCustomMappingsDisplay();
            this.showNotification('Removed mapping for "' + columnName + '"', 'info');
            var colBtn = document.querySelector('.unrecognized-col-btn[data-column="' + columnName.replace(/"/g, '\\"') + '"]');
            if (colBtn) { colBtn.classList.remove('bg-green-200', 'text-green-800'); colBtn.classList.add('bg-[#30363d]', 'text-[#c9d1d9]'); }
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
                html += '<div class="flex items-center justify-between bg-[#161b22] p-2 rounded border"><div><code class="text-sm text-[#8b949e]">' + self.escapeHtml(col) + '</code>';
                html += '<span class="text-[#6e7681] mx-2"><i class="fas fa-arrow-right"></i></span><span class="text-blue-400 font-medium">' + self.customMappings[col] + '</span></div>';
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
            
            // Always include standard column names (for converted units)
            var standardColumns = ['Time', 'Distance', 'Speed', 'Ground Speed', 'Throttle', 'Brake', 'Gear', 'Steered Angle', 
                                   'Corrected Distance', 'Lap Distance', 'Heading', 'Elapsed Time', 'Lap Time'];
            standardColumns.forEach(function(col) {
                if (columnsToKeep.indexOf(col) === -1) columnsToKeep.push(col);
            });
            
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
            
            // Get detected corners to pass to AI
            var detectedCorners = this.detectedCorners || [];
            console.log('Including ' + detectedCorners.length + ' detected corners in analysis request');
            
            // Format corners for AI consumption
            var cornersForAI = detectedCorners.map(function(c) {
                return {
                    number: c.number,
                    name: c.name,
                    distance_m: Math.round(c.distance),
                    apex_speed_kmh: c.speed,
                    severity: c.severity,
                    curvature: c.curvature ? c.curvature.toFixed(6) : null
                };
            });
            
            var payload = {
                reference_lap: refDataFiltered, current_lap: currDataFiltered,
                driver_name: document.getElementById('driver-name').value || 'Driver',
                track_name: document.getElementById('track-name').value || 'Track',
                channel_mappings: channelMappings,
                detected_corners: cornersForAI,
                corner_count: cornersForAI.length,
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
            this.addAIrtonMessage(results.ayrton_says || results.initial_message || "I have analyzed your data.");
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
        
        // Try to get lap delta from multiple sources
        var lapDelta = sessionData.timeDelta || sessionData.lapDelta || analysis.timeDelta || 0;
        
        // Always calculate lap times from telemetry for grip efficiency
        var refEndTime = null;
        var currEndTime = null;
        
        if (this.referenceData && this.currentData) {
            var timeNames = ['Time', 'Elapsed Time', 'Session Time', 'time'];
            var getValue = function(row, names) {
                for (var i = 0; i < names.length; i++) {
                    if (row[names[i]] !== undefined && row[names[i]] !== null) {
                        var val = parseFloat(row[names[i]]);
                        if (!isNaN(val)) return val;
                    }
                }
                return null;
            };
            
            refEndTime = getValue(this.referenceData[this.referenceData.length - 1], timeNames);
            currEndTime = getValue(this.currentData[this.currentData.length - 1], timeNames);
            
            // If lap delta is 0, calculate it from the telemetry data
            if (lapDelta === 0 && refEndTime !== null && currEndTime !== null) {
                lapDelta = currEndTime - refEndTime;
                console.log('Calculated lap delta from telemetry:', lapDelta);
            }
        }
        
        // Store the lap delta and lap times for use in the analysis tab
        this.sessionData.lapDelta = lapDelta;
        this.sessionData.timeDelta = lapDelta;
        this.sessionData.refLapTime = refEndTime;
        this.sessionData.currLapTime = currEndTime;
        this.sessionData.driver = sessionData.driver || document.getElementById('driver-name').value || 'Driver';
        this.sessionData.track = sessionData.track || document.getElementById('track-name').value || 'Track';
        
        document.getElementById('lap-delta').textContent = (lapDelta > 0 ? '+' : '') + lapDelta.toFixed(3) + 's';
        
        var gripEfficiency = this.calculateGripEfficiency();
        if (gripEfficiency !== null) {
            document.getElementById('g-force-usage').textContent = gripEfficiency.toFixed(0) + '%';
        } else {
            document.getElementById('g-force-usage').textContent = '--';
        }
        
        var drivingStyle = lapDelta > 2 ? 'Learning' : lapDelta > 1 ? 'Building' : lapDelta > 0.5 ? 'Close' : lapDelta > 0 ? 'Competitive' : 'Faster!';
        document.getElementById('tire-status').textContent = drivingStyle;
        document.getElementById('setup-issue').textContent = lapDelta > 1 ? 'Focus Areas' : 'Fine Tuning';
        
        this.generateGraphs(analysis);
        this.displaySetupRecommendations(analysis);
        this.generateFullReport(analysis);
        
        // Generate analysis tab content (NOT popup)
        this.generateAnalysisTab(analysis, this.sessionData);
        
        // Auto-switch to analysis tab
        this.switchTab('analysis');
    }
    
    // ============================================
    // ANALYSIS TAB - Replaces popup
    // ============================================
    generateAnalysisTab(analysis, sessionData) {
        var self = this;
        var trackSegments = analysis.trackSegments || [];
        
        // Use rule-based tire analysis from telemetry data
        var tireAnalysis = this.calculateTireAnalysis() || {};
        var suspensionAnalysis = this.calculateSuspensionAnalysis() || {};
        
        var brakeAnalysis = analysis.brakeAnalysis || {};
        var fuelAnalysis = analysis.fuelAnalysis || {};
        var brakingTechnique = analysis.brakingTechnique || {};
        var summary = analysis.summary || {};
        
        // Get lap delta - try multiple sources
        var lapDelta = sessionData.lapDelta || sessionData.timeDelta || 
                       this.sessionData.lapDelta || this.sessionData.timeDelta ||
                       analysis.timeDelta || 0;
        var driverName = sessionData.driver || this.sessionData.driver || 'Driver';
        var trackName = sessionData.track || this.sessionData.track || 'Track';
        
        // Get or create the analysis tab
        var analysisTab = document.getElementById('analysis-tab');
        if (!analysisTab) {
            analysisTab = document.createElement('div');
            analysisTab.id = 'analysis-tab';
            analysisTab.className = 'tab-content';
            var tabContainer = document.querySelector('.tab-content').parentElement;
            if (tabContainer) tabContainer.appendChild(analysisTab);
            
            // Add tab button
            var tabBtnContainer = document.querySelector('.flex.border-b border-[#30363d]') || document.querySelector('[class*="tab-btn"]').parentElement;
            if (tabBtnContainer && !document.querySelector('[data-tab="analysis"]')) {
                var analysisBtn = document.createElement('button');
                analysisBtn.className = 'tab-btn';
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
        html += '</div>';
        html += '</div>';
        html += '</div>';
        
        // Sub-tabs
        html += '<div class="flex space-x-4 mb-6 border-b border-[#30363d] pb-4">';
        html += '<button id="driving-tab-btn" onclick="document.getElementById(\'driving-section\').classList.remove(\'hidden\');document.getElementById(\'setup-section\').classList.add(\'hidden\');this.classList.add(\'bg-red-600\',\'text-white\');this.classList.remove(\'bg-[#30363d]\',\'text-[#c9d1d9]\');document.getElementById(\'setup-tab-btn\').classList.remove(\'bg-red-600\',\'text-white\');document.getElementById(\'setup-tab-btn\').classList.add(\'bg-[#30363d]\',\'text-[#c9d1d9]\')" class="px-6 py-3 rounded-lg font-semibold bg-red-600 text-white transition"><i class="fas fa-steering-wheel mr-2"></i>Driving Analysis</button>';
        html += '<button id="setup-tab-btn" onclick="document.getElementById(\'setup-section\').classList.remove(\'hidden\');document.getElementById(\'driving-section\').classList.add(\'hidden\');this.classList.add(\'bg-red-600\',\'text-white\');this.classList.remove(\'bg-[#30363d]\',\'text-[#c9d1d9]\');document.getElementById(\'driving-tab-btn\').classList.remove(\'bg-red-600\',\'text-white\');document.getElementById(\'driving-tab-btn\').classList.add(\'bg-[#30363d]\',\'text-[#c9d1d9]\')" class="px-6 py-3 rounded-lg font-semibold bg-[#30363d] text-[#c9d1d9] hover:bg-[#484f58] transition"><i class="fas fa-wrench mr-2"></i>Setup Recommendations</button>';
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
        
        html += '<div class="bg-gray-700 rounded-lg p-4 text-center"><div class="text-3xl font-bold">' + cornerCount + '</div><div class="text-[#6e7681]">Corners</div></div>';
        html += '<div class="bg-gray-700 rounded-lg p-4 text-center"><div class="text-3xl font-bold">' + straightCount + '</div><div class="text-[#6e7681]">Straights</div></div>';
        html += '<div class="bg-gray-700 rounded-lg p-4 text-center"><div class="text-3xl font-bold text-' + (issueCount > 5 ? 'red' : 'yellow') + '-400">' + issueCount + '</div><div class="text-[#6e7681]">Issues</div></div>';
        html += '<div class="bg-gray-700 rounded-lg p-4 text-center"><div class="text-3xl font-bold text-red-400">~' + totalTimeLoss.toFixed(2) + 's</div><div class="text-[#6e7681]">Time Loss</div></div>';
        html += '</div>';
        
        // Braking technique - just show smoothness comparison
        if (brakingTechnique.smoothnessVsRef) {
            html += '<div class="bg-gray-700/50 rounded-lg p-3 inline-block"><span class="text-[#6e7681]">Braking:</span> <span class="text-white font-bold">' + brakingTechnique.smoothnessVsRef + '</span></div>';
        }
        html += '</div>';
        
        // Lap Walkthrough
        html += '<h2 class="text-xl font-bold mb-4"><i class="fas fa-road mr-2 text-blue-500"></i>Lap Walkthrough</h2>';
        
        if (trackSegments.length === 0) {
            html += '<div class="bg-yellow-100 border border-yellow-400 text-yellow-800 p-4 rounded-lg">';
            html += '<i class="fas fa-exclamation-triangle mr-2"></i>No segment data available. Make sure the AI analysis completed and max_tokens is set high enough (4096+).';
            html += '</div>';
        } else {
            // Separate and sort corners and straights by distance
            var corners = trackSegments.filter(function(s) { return s.type === 'corner'; })
                .sort(function(a, b) { return (a.distance || 0) - (b.distance || 0); });
            
            // Sort straights by startDistance so S1 = start/finish straight
            var straights = trackSegments.filter(function(s) { return s.type === 'straight'; })
                .sort(function(a, b) { return (a.startDistance || a.distance || 0) - (b.startDistance || b.distance || 0); });
            
            // Create combined sorted list for sequential display
            var allSegments = [];
            corners.forEach(function(c, i) { allSegments.push({ segment: c, sortDist: c.distance || 0, displayIdx: i + 1, type: 'corner' }); });
            straights.forEach(function(s, i) { allSegments.push({ segment: s, sortDist: s.startDistance || s.distance || 0, displayIdx: i + 1, type: 'straight' }); });
            allSegments.sort(function(a, b) { return a.sortDist - b.sortDist; });
            
            // Render in track order
            allSegments.forEach(function(item) {
                if (item.type === 'corner') {
                    html += self.renderCornerCard(item.segment, item.displayIdx - 1);
                } else if (item.type === 'straight') {
                    html += self.renderStraightCard(item.segment, item.displayIdx - 1);
                }
            });
        }
        
        html += '</div>'; // End driving section
        
        // SETUP SECTION
        html += '<div id="setup-section" class="hidden">';
        html += this.renderSetupSection(tireAnalysis, brakeAnalysis, fuelAnalysis, suspensionAnalysis);
        html += '</div>';
        
        analysisTab.innerHTML = html;
        
        // Render graphs after HTML is in the DOM
        this.renderTireTempGraphs();
        this.renderSuspensionGraphs(suspensionAnalysis);
    }
    
    // ============================================
    // CORNER CARD - Shows current + reference speeds
    // ============================================
    renderCornerCard(segment, idx) {
        var hasIssues = segment.issues && segment.issues.length > 0;
        var bgColor = hasIssues ? 'bg-red-900/30 border-red-700' : 'bg-green-900/20 border-green-700';
        
        // Force correct turn label based on sorted index
        var turnLabel = 'Turn ' + (idx + 1);
        
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
        html += '<h3 class="text-xl font-bold text-[#f0f6fc]"><i class="fas fa-undo text-red-400 mr-2"></i>' + turnLabel + '</h3>';
        
        // Calculate corner type from heading change through the corner (industry standard method)
        // Uses the corner's geometric property rather than speed which varies by car/conditions
        var calculatedCornerType = this.calculateCornerType(segment.distance || 0);
        html += '<span class="text-[#8b949e]">' + calculatedCornerType + ' at ' + (segment.distance || 0) + 'm</span>';
        html += '</div>';
        if (segment.timeLoss > 0) {
            html += '<div class="bg-red-900/50 text-red-300 px-3 py-1 rounded-full text-sm font-medium">-' + segment.timeLoss.toFixed(2) + 's lost</div>';
        } else {
            html += '<div class="bg-green-900/50 text-green-300 px-3 py-1 rounded-full text-sm font-medium"><i class="fas fa-check mr-1"></i>Good</div>';
        }
        html += '</div>';
        
        // Speed comparison grid - shows Your speed, Ref speed, and Delta
        html += '<div class="grid grid-cols-3 gap-4 mb-4">';
        
        // Entry Speed
        html += '<div class="bg-[#21262d] rounded-lg p-3 border border-[#30363d]">';
        html += '<div class="text-[#8b949e] text-sm text-center mb-2">Entry Speed</div>';
        html += '<div class="flex justify-between items-center">';
        html += '<div class="text-center flex-1"><div class="text-[#ff6b9d] font-semibold font-data text-lg">' + entrySpeed + '</div><div class="text-xs text-[#6e7681]">You</div></div>';
        html += '<div class="text-center px-2"><div class="text-' + (deltaEntry >= 0 ? 'green' : 'red') + '-400 font-bold">' + (deltaEntry >= 0 ? '+' : '') + deltaEntry + '</div><div class="text-xs text-[#6e7681]">km/h</div></div>';
        html += '<div class="text-center flex-1"><div class="text-[#f0f6fc] font-bold text-lg">' + refEntry + '</div><div class="text-xs text-[#6e7681]">Ref</div></div>';
        html += '</div></div>';
        
        // Apex Speed
        html += '<div class="bg-[#21262d] rounded-lg p-3 border border-[#30363d]">';
        html += '<div class="text-[#8b949e] text-sm text-center mb-2">Apex Speed</div>';
        html += '<div class="flex justify-between items-center">';
        html += '<div class="text-center flex-1"><div class="text-[#ff6b9d] font-semibold font-data text-lg">' + apexSpeed + '</div><div class="text-xs text-[#6e7681]">You</div></div>';
        html += '<div class="text-center px-2"><div class="text-' + (deltaApex >= 0 ? 'green' : 'red') + '-400 font-bold">' + (deltaApex >= 0 ? '+' : '') + deltaApex + '</div><div class="text-xs text-[#6e7681]">km/h</div></div>';
        html += '<div class="text-center flex-1"><div class="text-[#f0f6fc] font-bold text-lg">' + refApex + '</div><div class="text-xs text-[#6e7681]">Ref</div></div>';
        html += '</div></div>';
        
        // Exit Speed
        html += '<div class="bg-[#21262d] rounded-lg p-3 border border-[#30363d]">';
        html += '<div class="text-[#8b949e] text-sm text-center mb-2">Exit Speed</div>';
        html += '<div class="flex justify-between items-center">';
        html += '<div class="text-center flex-1"><div class="text-[#ff6b9d] font-semibold font-data text-lg">' + exitSpeed + '</div><div class="text-xs text-[#6e7681]">You</div></div>';
        html += '<div class="text-center px-2"><div class="text-' + (deltaExit >= 0 ? 'green' : 'red') + '-400 font-bold">' + (deltaExit >= 0 ? '+' : '') + deltaExit + '</div><div class="text-xs text-[#6e7681]">km/h</div></div>';
        html += '<div class="text-center flex-1"><div class="text-[#f0f6fc] font-bold text-lg">' + refExit + '</div><div class="text-xs text-[#6e7681]">Ref</div></div>';
        html += '</div></div>';
        
        html += '</div>';
        
        // Braking details - also showing You / Delta / Ref
        var refPeakBrake = ref.peakBrake !== undefined ? ref.peakBrake : (ref.peakBrakeNorm !== undefined ? ref.peakBrakeNorm : '--');
        var deltaPeakBrake = delta.peakBrake !== undefined ? delta.peakBrake : (typeof peakBrake === 'number' && typeof refPeakBrake === 'number' ? peakBrake - refPeakBrake : 0);
        
        var refTrailDist = ref.trailDist !== undefined ? ref.trailDist : (ref.trailBrakingDist !== undefined ? ref.trailBrakingDist : 0);
        var refTrailBraking = ref.hasTrailBraking !== undefined ? ref.hasTrailBraking : (ref.trailBraking !== undefined ? ref.trailBraking : (refTrailDist > 0));
        var deltaTrailDist = delta.trailDist !== undefined ? delta.trailDist : (trailDist - refTrailDist);
        
        html += '<div class="grid grid-cols-3 gap-3 mb-4">';
        
        // Peak Brake - You / Delta / Ref
        html += '<div class="bg-[#30363d] rounded p-2">';
        html += '<div class="text-xs text-[#8b949e] text-center mb-1">Peak Brake</div>';
        html += '<div class="flex justify-between items-center text-sm">';
        html += '<div class="text-center flex-1"><div class="text-[#ff6b9d] font-semibold font-data">' + peakBrake + '%</div><div class="text-xs text-[#6e7681]">You</div></div>';
        if (typeof deltaPeakBrake === 'number' && deltaPeakBrake !== 0) {
            html += '<div class="text-center px-1"><div class="text-' + (deltaPeakBrake >= 0 ? 'green' : 'red') + '-400 font-bold text-xs">' + (deltaPeakBrake >= 0 ? '+' : '') + deltaPeakBrake + '</div></div>';
        }
        html += '<div class="text-center flex-1"><div class="text-[#f0f6fc] font-bold">' + refPeakBrake + '%</div><div class="text-xs text-[#6e7681]">Ref</div></div>';
        html += '</div></div>';
        
        // Corner Grip Efficiency - based on time and G-force through corner
        html += '<div class="bg-[#30363d] rounded p-2 text-center">';
        html += '<div class="text-xs text-[#8b949e]">Grip Efficiency</div>';
        
        // Calculate corner grip efficiency using same formula as overall: (RefTime/YourTime) × (RefG/YourG)
        var cornerEfficiency = this.calculateCornerGripEfficiency(segment.distance || 0);
        
        if (cornerEfficiency !== null) {
            var effColor = cornerEfficiency >= 100 ? 'text-green-400' : cornerEfficiency >= 95 ? 'text-yellow-400' : 'text-red-400';
            html += '<div class="' + effColor + ' font-semibold font-data text-lg mt-1">' + cornerEfficiency.toFixed(0) + '%</div>';
        } else {
            html += '<div class="text-[#6e7681] font-semibold mt-1">--</div>';
        }
        html += '</div>';
        
        // Trail Braking - You / Delta / Ref
        html += '<div class="bg-[#30363d] rounded p-2">';
        html += '<div class="text-xs text-[#8b949e] text-center mb-1">Trail Braking</div>';
        html += '<div class="flex justify-between items-center text-sm">';
        
        // Your trail braking
        html += '<div class="text-center flex-1">';
        if (trailBraking === true) {
            html += '<div class="text-[#ff6b9d] font-semibold font-data">' + (trailDist > 0 ? trailDist + 'm' : 'Yes') + '</div>';
        } else if (trailBraking === false) {
            html += '<div class="text-red-400 font-bold">No</div>';
        } else {
            html += '<div class="text-[#6e7681] font-bold">-</div>';
        }
        html += '<div class="text-xs text-[#6e7681]">You</div></div>';
        
        // Delta
        if (typeof deltaTrailDist === 'number' && deltaTrailDist !== 0) {
            html += '<div class="text-center px-1"><div class="text-' + (deltaTrailDist >= 0 ? 'green' : 'red') + '-400 font-bold text-xs">' + (deltaTrailDist >= 0 ? '+' : '') + deltaTrailDist + 'm</div></div>';
        }
        
        // Ref trail braking
        html += '<div class="text-center flex-1">';
        if (refTrailBraking === true) {
            html += '<div class="text-[#f0f6fc] font-bold">' + (refTrailDist > 0 ? refTrailDist + 'm' : 'Yes') + '</div>';
        } else if (refTrailBraking === false) {
            html += '<div class="text-[#f0f6fc] font-bold">No</div>';
        } else {
            html += '<div class="text-[#6e7681] font-bold">-</div>';
        }
        html += '<div class="text-xs text-[#6e7681]">Ref</div></div>';
        
        html += '</div></div>';
        
        html += '</div>';
        
        // Issues & recommendations
        if (hasIssues) {
            html += '<div class="border-t border-[#30363d] pt-4">';
            html += '<h4 class="font-semibold text-red-400 mb-2"><i class="fas fa-exclamation-triangle mr-2"></i>Issues</h4>';
            html += '<ul class="space-y-1 mb-3">';
            segment.issues.forEach(function(issue) {
                html += '<li class="text-[#c9d1d9] text-sm"><i class="fas fa-times text-red-400 mr-2"></i>' + issue + '</li>';
            });
            html += '</ul>';
            
            if (segment.recommendations && segment.recommendations.length > 0) {
                html += '<h4 class="font-semibold text-green-400 mb-2"><i class="fas fa-lightbulb mr-2"></i>Recommendations</h4>';
                html += '<ul class="space-y-1">';
                segment.recommendations.forEach(function(rec) {
                    html += '<li class="text-[#c9d1d9] text-sm"><i class="fas fa-arrow-right text-green-400 mr-2"></i>' + rec + '</li>';
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
        var bgColor = hasIssues ? 'bg-yellow-900/20 border-yellow-700' : 'bg-blue-900/20 border-b border-[#30363d]lue-700';
        
        // Use the name from the segment (e.g., "Start/Finish Straight" or "Straight 2")
        var straightLabel = segment.name || ('Straight ' + (idx + 1));
        
        var curr = segment.curr || {};
        var ref = segment.ref || {};
        var delta = segment.delta || {};
        var lifts = curr.lifts || [];
        var refLifts = ref.lifts || [];
        
        var entrySpeed = curr.entrySpeed !== undefined ? curr.entrySpeed : '--';
        var maxSpeed = curr.maxSpeed !== undefined ? curr.maxSpeed : '--';
        var exitSpeed = curr.exitSpeed !== undefined ? curr.exitSpeed : '--';
        var avgThrottle = curr.avgThrottle !== undefined ? curr.avgThrottle : '--';
        var isFullThrottle = curr.isFullThrottle || false;
        
        // Reference values
        var refEntrySpeed = ref.entrySpeed !== undefined ? ref.entrySpeed : '--';
        var refMaxSpeed = ref.maxSpeed !== undefined ? ref.maxSpeed : '--';
        var refExitSpeed = ref.exitSpeed !== undefined ? ref.exitSpeed : '--';
        var refAvgThrottle = ref.avgThrottle !== undefined ? ref.avgThrottle : '--';
        
        var deltaEntry = delta.entrySpeed !== undefined ? delta.entrySpeed : 0;
        var deltaMax = delta.maxSpeed !== undefined ? delta.maxSpeed : 0;
        var deltaExit = delta.exitSpeed !== undefined ? delta.exitSpeed : 0;
        
        var html = '<div class="' + bgColor + ' border rounded-xl p-5 mb-4">';
        
        // Header
        html += '<div class="flex justify-between items-start mb-4">';
        html += '<div>';
        html += '<h3 class="text-xl font-bold text-[#f0f6fc]"><i class="fas fa-road text-blue-400 mr-2"></i>' + straightLabel + '</h3>';
        html += '<span class="text-[#8b949e]">' + (segment.startDistance || segment.distance || 0) + 'm - ' + (segment.endDistance || 0) + 'm (' + (segment.length || 0) + 'm)</span>';
        html += '</div>';
        if (segment.timeLoss > 0) {
            html += '<div class="bg-yellow-900/50 text-yellow-300 px-3 py-1 rounded-full text-sm font-medium">-' + segment.timeLoss.toFixed(2) + 's lost</div>';
        } else if (lifts.length === 0 && isFullThrottle) {
            html += '<div class="bg-green-900/50 text-green-300 px-3 py-1 rounded-full text-sm font-medium"><i class="fas fa-check mr-1"></i>Clean</div>';
        }
        html += '</div>';
        
        // Speed comparison grid - You | Delta | Ref format
        html += '<div class="grid grid-cols-3 gap-4 mb-4">';
        
        // Entry Speed
        html += '<div class="bg-[#21262d] rounded-lg p-3 border border-[#30363d]">';
        html += '<div class="text-[#8b949e] text-sm mb-2 text-center">Entry Speed</div>';
        html += '<div class="flex justify-between items-center text-sm">';
        html += '<div class="text-center"><div class="text-[#ff6b9d] font-semibold font-data text-lg">' + entrySpeed + '</div><div class="text-[#6e7681] text-xs">You</div></div>';
        html += '<div class="text-center"><div class="text-' + (deltaEntry >= 0 ? 'green' : 'red') + '-400 font-bold">' + (deltaEntry >= 0 ? '+' : '') + deltaEntry + '</div></div>';
        html += '<div class="text-center"><div class="text-[#f0f6fc] font-bold text-lg">' + refEntrySpeed + '</div><div class="text-[#6e7681] text-xs">Ref</div></div>';
        html += '</div></div>';
        
        // Max Speed
        html += '<div class="bg-[#21262d] rounded-lg p-3 border border-[#30363d]">';
        html += '<div class="text-[#8b949e] text-sm mb-2 text-center">Max Speed</div>';
        html += '<div class="flex justify-between items-center text-sm">';
        html += '<div class="text-center"><div class="text-[#ff6b9d] font-semibold font-data text-lg">' + maxSpeed + '</div><div class="text-[#6e7681] text-xs">You</div></div>';
        html += '<div class="text-center"><div class="text-' + (deltaMax >= 0 ? 'green' : 'red') + '-400 font-bold">' + (deltaMax >= 0 ? '+' : '') + deltaMax + '</div></div>';
        html += '<div class="text-center"><div class="text-[#f0f6fc] font-bold text-lg">' + refMaxSpeed + '</div><div class="text-[#6e7681] text-xs">Ref</div></div>';
        html += '</div></div>';
        
        // Exit Speed
        html += '<div class="bg-[#21262d] rounded-lg p-3 border border-[#30363d]">';
        html += '<div class="text-[#8b949e] text-sm mb-2 text-center">Exit Speed</div>';
        html += '<div class="flex justify-between items-center text-sm">';
        html += '<div class="text-center"><div class="text-[#ff6b9d] font-semibold font-data text-lg">' + exitSpeed + '</div><div class="text-[#6e7681] text-xs">You</div></div>';
        html += '<div class="text-center"><div class="text-' + (deltaExit >= 0 ? 'green' : 'red') + '-400 font-bold">' + (deltaExit >= 0 ? '+' : '') + deltaExit + '</div></div>';
        html += '<div class="text-center"><div class="text-[#f0f6fc] font-bold text-lg">' + refExitSpeed + '</div><div class="text-[#6e7681] text-xs">Ref</div></div>';
        html += '</div></div>';
        
        html += '</div>';
        
        // Throttle info
        html += '<div class="grid grid-cols-2 gap-4 mb-4">';
        html += '<div class="bg-[#21262d] rounded-lg p-3 border border-[#30363d]">';
        html += '<div class="text-[#8b949e] text-sm">Avg Throttle</div>';
        html += '<div class="flex justify-between items-center">';
        html += '<span class="text-[#ff6b9d] font-semibold font-data">' + avgThrottle + '%</span>';
        html += '<span class="text-[#6e7681]">vs</span>';
        html += '<span class="text-[#f0f6fc] font-bold">' + refAvgThrottle + '%</span>';
        html += '</div></div>';
        
        html += '<div class="bg-[#21262d] rounded-lg p-3 border border-[#30363d]">';
        html += '<div class="text-[#8b949e] text-sm">Throttle Lifts</div>';
        html += '<div class="flex justify-between items-center">';
        if (lifts.length > refLifts.length) {
            html += '<span class="text-red-400 font-bold">' + lifts.length + ' lifts</span>';
            html += '<span class="text-[#6e7681]">vs</span>';
            html += '<span class="text-[#f0f6fc] font-bold">' + refLifts.length + ' lifts</span>';
        } else if (lifts.length > 0) {
            html += '<span class="text-yellow-400 font-bold">' + lifts.length + ' lifts</span>';
            html += '<span class="text-[#6e7681]">vs</span>';
            html += '<span class="text-[#f0f6fc] font-bold">' + refLifts.length + ' lifts</span>';
        } else {
            html += '<span class="text-green-400 font-bold">None</span>';
            html += '<span class="text-[#6e7681]">vs</span>';
            html += '<span class="text-[#f0f6fc] font-bold">' + (refLifts.length > 0 ? refLifts.length + ' lifts' : 'None') + '</span>';
        }
        html += '</div></div>';
        html += '</div>';
        
        // Show lift details if there are lifts
        if (lifts.length > 0) {
            html += '<div class="bg-orange-900/30 border border-orange-700 rounded-lg p-3 mb-4">';
            html += '<h4 class="font-semibold text-orange-300 mb-2"><i class="fas fa-tachometer-alt-slow mr-2"></i>Throttle Lifts Detected</h4>';
            html += '<div class="space-y-2">';
            lifts.forEach(function(lift) {
                html += '<div class="text-sm text-[#c9d1d9]">';
                html += '<i class="fas fa-exclamation-circle text-orange-400 mr-2"></i>';
                html += 'Lift at <strong>' + lift.distance + 'm</strong>: throttle dropped to ' + lift.minThrottle + '%, lost ~<strong>' + lift.speedLost + 'km/h</strong>';
                html += '</div>';
            });
            
            // Check if reference also had lifts at similar positions
            if (refLifts.length > 0) {
                html += '<div class="text-sm text-blue-400 mt-2"><i class="fas fa-info-circle mr-2"></i>Note: Reference lap also had lifts - may indicate traffic or track feature</div>';
            } else {
                html += '<div class="text-sm text-red-400 mt-2"><i class="fas fa-flag mr-2"></i>Reference was flat out here - possible traffic, hesitation, or missed opportunity</div>';
            }
            html += '</div></div>';
        }
        
        // Issues and recommendations
        if (hasIssues) {
            html += '<div class="border-t border-[#30363d] pt-4">';
            html += '<h4 class="font-semibold text-yellow-400 mb-2"><i class="fas fa-exclamation-triangle mr-2"></i>Issues</h4>';
            html += '<ul class="space-y-1 mb-3">';
            segment.issues.forEach(function(issue) {
                html += '<li class="text-[#c9d1d9] text-sm"><i class="fas fa-times text-yellow-400 mr-2"></i>' + issue + '</li>';
            });
            html += '</ul>';
            
            if (segment.recommendations && segment.recommendations.length > 0) {
                html += '<h4 class="font-semibold text-green-400 mb-2"><i class="fas fa-lightbulb mr-2"></i>Recommendations</h4>';
                html += '<ul class="space-y-1">';
                segment.recommendations.forEach(function(rec) {
                    html += '<li class="text-[#c9d1d9] text-sm"><i class="fas fa-arrow-right text-green-400 mr-2"></i>' + rec + '</li>';
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
    renderSetupSection(tireAnalysis, brakeAnalysis, fuelAnalysis, suspensionAnalysis) {
        var html = '';
        
        html += '<div class="bg-[#161b22] rounded-xl mb-6 border border-[#30363d]">';
        html += '<div class="p-6 pb-0">';
        html += '<h2 class="text-xl font-bold mb-4 text-[#f0f6fc]"><i class="fas fa-cogs mr-2 text-green-400"></i>Setup Recommendations</h2>';
        html += '<p class="text-[#8b949e] mb-6">Rule-based analysis from tire temperatures, brake data, and telemetry patterns:</p>';
        
        // Tire section - Enhanced visualization
        if (tireAnalysis && tireAnalysis.available) {
            html += '<h3 class="text-lg font-semibold text-[#f0f6fc] mb-3"><i class="fas fa-circle text-yellow-500 mr-2"></i>Tire Temperature Analysis</h3>';
            html += '<h4 class="text-sm font-semibold text-[#8b949e] mb-2">Temperature Over Lap Distance</h4>';
            html += '</div>'; // Close padding div
            
            // Graphs at full width within the panel border (outside the p-6 padding div)
            html += '<div class="mb-4">';
            html += '<div id="tire-temp-graph-front" style="height: 300px; width: 100%;"></div>';
            html += '</div>';
            html += '<div class="mb-4">';
            html += '<div id="tire-temp-graph-rear" style="height: 300px; width: 100%;"></div>';
            html += '</div>';
            
            // Reopen padding div for rest of content
            html += '<div class="p-6 pt-2">';
            
            // Tire diagram - 2x2 grid showing car from above
            html += '<div class="grid grid-cols-2 gap-4 mb-4 max-w-lg mx-auto">';
            
            ['lf', 'rf', 'lr', 'rr'].forEach(function(corner) {
                var data = tireAnalysis[corner];
                if (data && data.avg !== null) {
                    // Determine background color based on temperature
                    var bgColor = 'bg-[#21262d]';
                    var borderColor = 'border-[#30363d]';
                    if (data.avg > 105) {
                        bgColor = 'bg-red-900/30';
                        borderColor = 'border-red-500';
                    } else if (data.avg < 75) {
                        bgColor = 'bg-blue-900/30';
                        borderColor = 'border-blue-500';
                    } else {
                        bgColor = 'bg-green-900/30';
                        borderColor = 'border-green-500';
                    }
                    
                    html += '<div class="' + bgColor + ' ' + borderColor + ' border-2 rounded-lg p-4">';
                    html += '<div class="font-bold text-[#f0f6fc] text-center mb-2">' + corner.toUpperCase() + '</div>';
                    
                    // Temperature bar visualization (Inner | Middle | Outer)
                    html += '<div class="flex justify-between text-xs mb-2">';
                    html += '<span class="text-[#6e7681]">In</span>';
                    html += '<span class="text-[#6e7681]">Mid</span>';
                    html += '<span class="text-[#6e7681]">Out</span>';
                    html += '</div>';
                    
                    // Temperature values
                    html += '<div class="flex justify-between text-sm font-mono">';
                    var innerColor = data.inner > 100 ? 'text-red-400' : data.inner < 70 ? 'text-blue-400' : 'text-green-400';
                    var middleColor = data.middle > 100 ? 'text-red-400' : data.middle < 70 ? 'text-blue-400' : 'text-green-400';
                    var outerColor = data.outer > 100 ? 'text-red-400' : data.outer < 70 ? 'text-blue-400' : 'text-green-400';
                    
                    html += '<span class="' + innerColor + '">' + (data.inner !== null ? Math.round(data.inner) + '°' : '--') + '</span>';
                    html += '<span class="' + middleColor + '">' + (data.middle !== null ? Math.round(data.middle) + '°' : '--') + '</span>';
                    html += '<span class="' + outerColor + '">' + (data.outer !== null ? Math.round(data.outer) + '°' : '--') + '</span>';
                    html += '</div>';
                    
                    // Average
                    html += '<div class="text-center mt-2 pt-2 border-t border-[#30363d]">';
                    html += '<span class="text-[#8b949e] text-xs">Avg: </span>';
                    html += '<span class="text-[#f0f6fc] font-bold">' + Math.round(data.avg) + '°C</span>';
                    html += '</div>';
                    
                    html += '</div>';
                } else {
                    html += '<div class="bg-[#21262d] border border-[#30363d] rounded-lg p-4 opacity-50">';
                    html += '<div class="font-bold text-[#8b949e] text-center">' + corner.toUpperCase() + '</div>';
                    html += '<div class="text-center text-[#6e7681] text-sm mt-2">No data</div>';
                    html += '</div>';
                }
            });
            html += '</div>';
            
            // Balance indicators
            if (tireAnalysis.frontAvg !== null || tireAnalysis.leftAvg !== null) {
                html += '<div class="grid grid-cols-2 gap-4 mb-4 max-w-lg mx-auto">';
                
                // Front/Rear balance
                if (tireAnalysis.frontAvg !== null && tireAnalysis.rearAvg !== null) {
                    var frDiff = tireAnalysis.frontAvg - tireAnalysis.rearAvg;
                    var frColor = Math.abs(frDiff) > 10 ? 'text-yellow-400' : 'text-green-400';
                    html += '<div class="bg-[#21262d] rounded-lg p-3 text-center">';
                    html += '<div class="text-[#8b949e] text-xs mb-1">Front/Rear</div>';
                    html += '<div class="' + frColor + ' font-bold">';
                    html += (frDiff > 0 ? 'F+' : 'R+') + Math.round(Math.abs(frDiff)) + '°C';
                    html += '</div>';
                    html += '</div>';
                }
                
                // Left/Right balance
                if (tireAnalysis.leftAvg !== null && tireAnalysis.rightAvg !== null) {
                    var lrDiff = tireAnalysis.leftAvg - tireAnalysis.rightAvg;
                    var lrColor = Math.abs(lrDiff) > 10 ? 'text-yellow-400' : 'text-green-400';
                    html += '<div class="bg-[#21262d] rounded-lg p-3 text-center">';
                    html += '<div class="text-[#8b949e] text-xs mb-1">Left/Right</div>';
                    html += '<div class="' + lrColor + ' font-bold">';
                    html += (lrDiff > 0 ? 'L+' : 'R+') + Math.round(Math.abs(lrDiff)) + '°C';
                    html += '</div>';
                    html += '</div>';
                }
                
                html += '</div>';
            }
            
            // Issues list
            if (tireAnalysis.issues && tireAnalysis.issues.length > 0) {
                html += '<div class="bg-[#21262d] border border-[#30363d] rounded-lg p-4 mb-4">';
                html += '<h4 class="font-semibold text-[#f0f6fc] mb-3"><i class="fas fa-exclamation-triangle text-yellow-500 mr-2"></i>Analysis Findings</h4>';
                html += '<ul class="space-y-2">';
                tireAnalysis.issues.forEach(function(issue) {
                    var iconColor = 'text-yellow-500';
                    var icon = 'fa-info-circle';
                    if (issue.severity === 'high') {
                        iconColor = 'text-red-500';
                        icon = 'fa-exclamation-circle';
                    } else if (issue.severity === 'low' || issue.severity === 'info') {
                        iconColor = 'text-blue-400';
                        icon = 'fa-info-circle';
                    }
                    html += '<li class="text-[#c9d1d9] text-sm"><i class="fas ' + icon + ' ' + iconColor + ' mr-2"></i>' + (issue.issue || issue) + '</li>';
                });
                html += '</ul>';
                html += '</div>';
            }
            
            // Recommendations
            if (tireAnalysis.recommendations && tireAnalysis.recommendations.length > 0) {
                html += '<div class="bg-green-900/20 border border-green-700 rounded-lg p-4">';
                html += '<h4 class="font-semibold text-green-400 mb-3"><i class="fas fa-wrench mr-2"></i>Recommended Setup Changes</h4>';
                html += '<ul class="space-y-2">';
                tireAnalysis.recommendations.forEach(function(rec) {
                    html += '<li class="text-[#c9d1d9] text-sm"><i class="fas fa-chevron-right text-green-500 mr-2"></i>' + (rec.action || rec) + '</li>';
                });
                html += '</ul>';
                html += '</div>';
            }
            
            // Don't close padding div yet - brake and fuel go inside
        } else {
            // No tire data - keep padding consistent
            html += '<div class="bg-[#30363d] border border-[#30363d] rounded-lg p-4 mb-6">';
            html += '<p class="text-[#8b949e]"><i class="fas fa-info-circle mr-2"></i>No tire temperature data available in telemetry. ';
            html += 'Enable tire temp channels in your data export to get camber/pressure recommendations.</p>';
            html += '</div>';
        }
        
        // Brake section (inside padding div)
        if (brakeAnalysis && brakeAnalysis.available) {
            html += '<div class="mb-6 mt-6">';
            html += '<h3 class="text-lg font-semibold text-[#f0f6fc] mb-3"><i class="fas fa-compact-disc text-red-500 mr-2"></i>Brake Setup</h3>';
            html += '<div class="grid grid-cols-4 gap-4 mb-4">';
            if (brakeAnalysis.fl !== null) html += '<div class="bg-[#30363d] rounded-lg p-3 text-center"><div class="text-xl font-bold">' + Math.round(brakeAnalysis.fl) + '°C</div><div class="text-[#8b949e] text-sm">FL</div></div>';
            if (brakeAnalysis.fr !== null) html += '<div class="bg-[#30363d] rounded-lg p-3 text-center"><div class="text-xl font-bold">' + Math.round(brakeAnalysis.fr) + '°C</div><div class="text-[#8b949e] text-sm">FR</div></div>';
            if (brakeAnalysis.rl !== null) html += '<div class="bg-[#30363d] rounded-lg p-3 text-center"><div class="text-xl font-bold">' + Math.round(brakeAnalysis.rl) + '°C</div><div class="text-[#8b949e] text-sm">RL</div></div>';
            if (brakeAnalysis.rr !== null) html += '<div class="bg-[#30363d] rounded-lg p-3 text-center"><div class="text-xl font-bold">' + Math.round(brakeAnalysis.rr) + '°C</div><div class="text-[#8b949e] text-sm">RR</div></div>';
            html += '</div>';
            html += '</div>';
        }
        
        // Fuel section (inside padding div)
        if (fuelAnalysis && fuelAnalysis.available && fuelAnalysis.fuelPerLap) {
            html += '<div class="mb-6">';
            html += '<h3 class="text-lg font-semibold text-[#f0f6fc] mb-3"><i class="fas fa-gas-pump text-blue-500 mr-2"></i>Fuel Strategy</h3>';
            html += '<div class="bg-[#30363d] rounded-lg p-4">';
            html += '<div class="grid grid-cols-3 gap-4">';
            html += '<div class="text-center"><div class="text-xl font-bold">' + fuelAnalysis.fuelPerLap.toFixed(2) + ' L</div><div class="text-[#8b949e] text-sm">Per Lap</div></div>';
            if (fuelAnalysis.estimatedRange) html += '<div class="text-center"><div class="text-xl font-bold">' + fuelAnalysis.estimatedRange + '</div><div class="text-[#8b949e] text-sm">Laps Left</div></div>';
            if (fuelAnalysis.endFuel) html += '<div class="text-center"><div class="text-xl font-bold">' + fuelAnalysis.endFuel.toFixed(1) + ' L</div><div class="text-[#8b949e] text-sm">Current</div></div>';
            html += '</div>';
            html += '</div>';
            html += '</div>';
        }
        
        // Suspension / Ride Height section (inside padding div)
        if (suspensionAnalysis && suspensionAnalysis.available) {
            html += '<div class="mb-6 mt-6">';
            html += '<h3 class="text-lg font-semibold text-[#f0f6fc] mb-3"><i class="fas fa-arrows-alt-v text-purple-400 mr-2"></i>Ride Height & Suspension</h3>';
            
            // Ride Height summary cards
            if (suspensionAnalysis.hasRideHeight) {
                html += '<div class="grid grid-cols-4 gap-3 mb-4">';
                ['lf', 'rf', 'lr', 'rr'].forEach(function(corner) {
                    var rh = suspensionAnalysis.corners[corner] ? suspensionAnalysis.corners[corner].rideHeight : null;
                    if (rh) {
                        var isLow = rh.min < 15;
                        var borderColor = isLow ? 'border-red-500' : 'border-[#30363d]';
                        var bgColor = isLow ? 'bg-red-900/20' : 'bg-[#30363d]';
                        html += '<div class="' + bgColor + ' border ' + borderColor + ' rounded-lg p-3 text-center">';
                        html += '<div class="text-lg font-bold text-[#f0f6fc]">' + rh.avg.toFixed(1) + '<span class="text-xs text-[#8b949e]">mm</span></div>';
                        html += '<div class="text-[#8b949e] text-xs">' + corner.toUpperCase() + ' avg</div>';
                        html += '<div class="text-[10px] text-[#6e7681] mt-1">' + rh.min.toFixed(1) + ' – ' + rh.max.toFixed(1) + '</div>';
                        html += '</div>';
                    }
                });
                html += '</div>';
                
                // Rake display
                if (suspensionAnalysis.rake !== undefined) {
                    var rakeColor = suspensionAnalysis.rake < 0 ? 'text-red-400' : (suspensionAnalysis.rake < 2 ? 'text-yellow-400' : 'text-green-400');
                    html += '<div class="bg-[#21262d] border border-[#30363d] rounded-lg p-3 mb-4">';
                    html += '<div class="flex items-center justify-between">';
                    html += '<div><span class="text-[#8b949e] text-sm">Rake (rear − front):</span> <span class="font-bold ' + rakeColor + '">' + suspensionAnalysis.rake.toFixed(1) + 'mm</span></div>';
                    html += '<div class="text-sm text-[#8b949e]">Front avg: ' + (suspensionAnalysis.frontAvgRH || 0).toFixed(1) + 'mm | Rear avg: ' + (suspensionAnalysis.rearAvgRH || 0).toFixed(1) + 'mm</div>';
                    html += '</div>';
                    html += '</div>';
                }
            }
            
            // Shock Deflection summary
            if (suspensionAnalysis.hasShockDefl) {
                html += '<h4 class="text-sm font-semibold text-[#8b949e] mb-2 mt-4">Shock Deflection (Travel Range)</h4>';
                html += '<div class="grid grid-cols-4 gap-3 mb-4">';
                ['lf', 'rf', 'lr', 'rr'].forEach(function(corner) {
                    var sd = suspensionAnalysis.corners[corner] ? suspensionAnalysis.corners[corner].shockDefl : null;
                    if (sd) {
                        var isExcessive = sd.range > 50;
                        var bgColor = isExcessive ? 'bg-yellow-900/20' : 'bg-[#30363d]';
                        html += '<div class="' + bgColor + ' rounded-lg p-3 text-center">';
                        html += '<div class="text-lg font-bold text-[#f0f6fc]">' + sd.range.toFixed(1) + '<span class="text-xs text-[#8b949e]">mm</span></div>';
                        html += '<div class="text-[#8b949e] text-xs">' + corner.toUpperCase() + ' range</div>';
                        html += '<div class="text-[10px] text-[#6e7681] mt-1">avg ' + sd.avg.toFixed(1) + 'mm</div>';
                        html += '</div>';
                    }
                });
                html += '</div>';
            }
            
            // Shock Velocity histogram summary
            if (suspensionAnalysis.hasShockVel) {
                html += '<h4 class="text-sm font-semibold text-[#8b949e] mb-2 mt-4">Damper Velocity Summary</h4>';
                html += '<div class="grid grid-cols-4 gap-3 mb-4">';
                ['lf', 'rf', 'lr', 'rr'].forEach(function(corner) {
                    var sv = suspensionAnalysis.corners[corner] ? suspensionAnalysis.corners[corner].shockVel : null;
                    if (sv) {
                        var highSpeedColor = sv.pctHighSpeed > 25 ? 'text-yellow-400' : 'text-green-400';
                        html += '<div class="bg-[#30363d] rounded-lg p-3 text-center">';
                        html += '<div class="text-xs text-[#8b949e] mb-1">' + corner.toUpperCase() + '</div>';
                        html += '<div class="text-[10px] text-[#6e7681]">Bump: ' + (sv.avgBump !== null ? Math.abs(sv.avgBump).toFixed(0) : '—') + ' mm/s</div>';
                        html += '<div class="text-[10px] text-[#6e7681]">Rebound: ' + (sv.avgRebound !== null ? sv.avgRebound.toFixed(0) : '—') + ' mm/s</div>';
                        html += '<div class="text-[10px] mt-1 ' + highSpeedColor + '">High-spd: ' + sv.pctHighSpeed.toFixed(0) + '%</div>';
                        html += '</div>';
                    }
                });
                html += '</div>';
            }
            
            // Ride Height graph placeholder
            html += '</div>'; // Close the suspension content wrapper div (mb-6 mt-6)
            html += '</div>'; // Close the padding div (p-6 pt-2) to allow full-width graphs
            
            // Ride Height graph - full width (outside padding)
            if (suspensionAnalysis.hasRideHeight) {
                html += '<div class="mb-4">';
                html += '<div id="ride-height-graph" style="height: 280px; width: 100%;"></div>';
                html += '</div>';
            }
            
            // Shock velocity histogram - full width (outside padding)
            if (suspensionAnalysis.hasShockVel) {
                html += '<div class="mb-4">';
                html += '<div id="shock-histogram" style="height: 280px; width: 100%;"></div>';
                html += '</div>';
            }
            
            // Reopen padding for issues/recommendations
            html += '<div class="p-6 pt-2">';
            
            // Issues
            if (suspensionAnalysis.issues && suspensionAnalysis.issues.length > 0) {
                html += '<div class="mt-2 mb-4">';
                html += '<h4 class="text-sm font-semibold text-[#f0f6fc] mb-2"><i class="fas fa-exclamation-triangle text-yellow-500 mr-2"></i>Suspension Issues (' + suspensionAnalysis.issues.length + ')</h4>';
                suspensionAnalysis.issues.forEach(function(issue) {
                    var color = issue.severity === 'high' ? 'text-red-400' : (issue.severity === 'medium' ? 'text-yellow-400' : 'text-blue-400');
                    var icon = issue.severity === 'high' ? 'fa-times-circle' : (issue.severity === 'medium' ? 'fa-exclamation-circle' : 'fa-info-circle');
                    html += '<div class="flex items-start gap-2 mb-1"><i class="fas ' + icon + ' ' + color + ' mt-0.5 text-xs"></i><span class="text-sm text-[#c9d1d9]">' + issue.issue + '</span></div>';
                });
                html += '</div>';
            }
            
            // Recommendations
            if (suspensionAnalysis.recommendations && suspensionAnalysis.recommendations.length > 0) {
                html += '<div class="mb-4">';
                html += '<h4 class="text-sm font-semibold text-[#f0f6fc] mb-2"><i class="fas fa-wrench text-green-400 mr-2"></i>Setup Recommendations</h4>';
                suspensionAnalysis.recommendations.forEach(function(rec) {
                    html += '<div class="flex items-start gap-2 mb-1"><i class="fas fa-chevron-right text-green-400 mt-0.5 text-xs"></i><span class="text-sm text-[#c9d1d9]">' + rec.action + '</span></div>';
                });
                html += '</div>';
            }
            
            if (suspensionAnalysis.issues.length === 0 && suspensionAnalysis.recommendations.length === 0) {
                html += '<div class="bg-green-900/20 border border-green-700 rounded-lg p-3 mb-4">';
                html += '<p class="text-green-400 text-sm"><i class="fas fa-check-circle mr-2"></i>Suspension looks well-balanced. No major issues detected.</p>';
                html += '</div>';
            }
            
            html += '</div>'; // Close re-opened padding
        }
        
        html += '</div>'; // Close outer container
        return html;
    }
    
    // ============================================
    // RULE-BASED TIRE TEMPERATURE ANALYSIS
    // ============================================
    calculateTireAnalysis() {
        var self = this;
        if (!this.referenceData || this.referenceData.length < 100) {
            return { available: false };
        }
        
        // Tire temp channel patterns for iRacing
        // Core temps (inside carcass): LFtempCL, LFtempCM, LFtempCR
        // Surface temps: LFtempL, LFtempM, LFtempR
        var tireChannels = {
            lf: { inner: null, middle: null, outer: null },
            rf: { inner: null, middle: null, outer: null },
            lr: { inner: null, middle: null, outer: null },
            rr: { inner: null, middle: null, outer: null }
        };
        
        // Channel name patterns to search for
        var patterns = {
            // Left Front - for a car going forward, L=inner, R=outer on left side
            lf: {
                inner: ['LFtempL[°C]', 'LFtempCL[°C]', 'LFtempL', 'LFtempCL', 'LF Temp Inner', 'TireTempLFL'],
                middle: ['LFtempM[°C]', 'LFtempCM[°C]', 'LFtempM', 'LFtempCM', 'LF Temp Middle', 'TireTempLFM'],
                outer: ['LFtempR[°C]', 'LFtempCR[°C]', 'LFtempR', 'LFtempCR', 'LF Temp Outer', 'TireTempLFR']
            },
            // Right Front - R=inner, L=outer on right side
            rf: {
                inner: ['RFtempR[°C]', 'RFtempCR[°C]', 'RFtempR', 'RFtempCR', 'RF Temp Inner', 'TireTempRFR'],
                middle: ['RFtempM[°C]', 'RFtempCM[°C]', 'RFtempM', 'RFtempCM', 'RF Temp Middle', 'TireTempRFM'],
                outer: ['RFtempL[°C]', 'RFtempCL[°C]', 'RFtempL', 'RFtempCL', 'RF Temp Outer', 'TireTempRFL']
            },
            // Left Rear
            lr: {
                inner: ['LRtempL[°C]', 'LRtempCL[°C]', 'LRtempL', 'LRtempCL', 'LR Temp Inner', 'TireTempLRL'],
                middle: ['LRtempM[°C]', 'LRtempCM[°C]', 'LRtempM', 'LRtempCM', 'LR Temp Middle', 'TireTempLRM'],
                outer: ['LRtempR[°C]', 'LRtempCR[°C]', 'LRtempR', 'LRtempCR', 'LR Temp Outer', 'TireTempLRR']
            },
            // Right Rear
            rr: {
                inner: ['RRtempR[°C]', 'RRtempCR[°C]', 'RRtempR', 'RRtempCR', 'RR Temp Inner', 'TireTempRRR'],
                middle: ['RRtempM[°C]', 'RRtempCM[°C]', 'RRtempM', 'RRtempCM', 'RR Temp Middle', 'TireTempRRM'],
                outer: ['RRtempL[°C]', 'RRtempCL[°C]', 'RRtempL', 'RRtempCL', 'RR Temp Outer', 'TireTempRRL']
            }
        };
        
        // Find available channels
        var sampleRow = this.referenceData[0];
        var availableKeys = Object.keys(sampleRow);
        
        function findChannel(nameList) {
            for (var i = 0; i < nameList.length; i++) {
                if (availableKeys.indexOf(nameList[i]) !== -1) {
                    return nameList[i];
                }
            }
            return null;
        }
        
        // Map channels for each tire position
        var channelMap = {};
        var foundAny = false;
        ['lf', 'rf', 'lr', 'rr'].forEach(function(tire) {
            channelMap[tire] = {
                inner: findChannel(patterns[tire].inner),
                middle: findChannel(patterns[tire].middle),
                outer: findChannel(patterns[tire].outer)
            };
            if (channelMap[tire].inner || channelMap[tire].middle || channelMap[tire].outer) {
                foundAny = true;
            }
        });
        
        if (!foundAny) {
            console.log('Tire analysis: No tire temp channels found');
            console.log('Available channels containing "temp":', availableKeys.filter(function(k) { 
                return k.toLowerCase().indexOf('temp') !== -1; 
            }));
            return { available: false };
        }
        
        console.log('Tire analysis: Found channels:', channelMap);
        
        // Calculate average temps for each position (use last 25% of lap for stable temps)
        var startIdx = Math.floor(this.referenceData.length * 0.75);
        var endData = this.referenceData.slice(startIdx);
        
        var temps = {
            lf: { inner: [], middle: [], outer: [] },
            rf: { inner: [], middle: [], outer: [] },
            lr: { inner: [], middle: [], outer: [] },
            rr: { inner: [], middle: [], outer: [] }
        };
        
        endData.forEach(function(row) {
            ['lf', 'rf', 'lr', 'rr'].forEach(function(tire) {
                ['inner', 'middle', 'outer'].forEach(function(pos) {
                    var ch = channelMap[tire][pos];
                    if (ch && row[ch] !== undefined && row[ch] !== null) {
                        var val = parseFloat(row[ch]);
                        if (!isNaN(val) && val > 0 && val < 200) {
                            temps[tire][pos].push(val);
                        }
                    }
                });
            });
        });
        
        // Calculate averages
        function avg(arr) {
            if (arr.length === 0) return null;
            var sum = 0;
            for (var i = 0; i < arr.length; i++) sum += arr[i];
            return sum / arr.length;
        }
        
        var result = {
            available: true,
            lf: { inner: avg(temps.lf.inner), middle: avg(temps.lf.middle), outer: avg(temps.lf.outer) },
            rf: { inner: avg(temps.rf.inner), middle: avg(temps.rf.middle), outer: avg(temps.rf.outer) },
            lr: { inner: avg(temps.lr.inner), middle: avg(temps.lr.middle), outer: avg(temps.lr.outer) },
            rr: { inner: avg(temps.rr.inner), middle: avg(temps.rr.middle), outer: avg(temps.rr.outer) },
            issues: [],
            recommendations: []
        };
        
        // Calculate tire averages
        ['lf', 'rf', 'lr', 'rr'].forEach(function(tire) {
            var t = result[tire];
            var validTemps = [t.inner, t.middle, t.outer].filter(function(v) { return v !== null; });
            t.avg = validTemps.length > 0 ? validTemps.reduce(function(a, b) { return a + b; }, 0) / validTemps.length : null;
        });
        
        // ============================================
        // RULE-BASED ANALYSIS
        // ============================================
        
        // 1. CAMBER ANALYSIS - Inner vs Outer temperature gradient
        // Ideal: Inner slightly hotter (5-15°C) due to negative camber loading
        ['lf', 'rf', 'lr', 'rr'].forEach(function(tire) {
            var t = result[tire];
            if (t.inner !== null && t.outer !== null) {
                var gradient = t.inner - t.outer;
                t.gradient = gradient;
                
                var tireName = tire.toUpperCase();
                var isRear = tire.indexOf('r') === 1;
                
                if (gradient > 20) {
                    result.issues.push({
                        tire: tire,
                        type: 'camber',
                        severity: 'high',
                        issue: tireName + ': Inner edge ' + Math.round(gradient) + '°C hotter - too much negative camber'
                    });
                    result.recommendations.push({
                        tire: tire,
                        action: 'Reduce ' + tireName + ' negative camber by 0.3-0.5°'
                    });
                } else if (gradient > 10) {
                    result.issues.push({
                        tire: tire,
                        type: 'camber',
                        severity: 'medium',
                        issue: tireName + ': Inner edge running ' + Math.round(gradient) + '°C hotter - camber slightly aggressive'
                    });
                } else if (gradient < -10) {
                    result.issues.push({
                        tire: tire,
                        type: 'camber',
                        severity: 'high',
                        issue: tireName + ': Outer edge ' + Math.round(Math.abs(gradient)) + '°C hotter - not enough negative camber or understeering'
                    });
                    result.recommendations.push({
                        tire: tire,
                        action: 'Increase ' + tireName + ' negative camber by 0.3-0.5° or address understeer'
                    });
                } else if (gradient < 0) {
                    result.issues.push({
                        tire: tire,
                        type: 'camber',
                        severity: 'low',
                        issue: tireName + ': Outer edge slightly hotter - consider more negative camber'
                    });
                }
            }
        });
        
        // 2. PRESSURE ANALYSIS - Middle vs average of Inner/Outer
        // Middle hot: Over-inflated | Middle cold: Under-inflated
        ['lf', 'rf', 'lr', 'rr'].forEach(function(tire) {
            var t = result[tire];
            if (t.inner !== null && t.middle !== null && t.outer !== null) {
                var edgeAvg = (t.inner + t.outer) / 2;
                var pressureDiff = t.middle - edgeAvg;
                t.pressureDiff = pressureDiff;
                
                var tireName = tire.toUpperCase();
                
                if (pressureDiff > 8) {
                    result.issues.push({
                        tire: tire,
                        type: 'pressure',
                        severity: 'high',
                        issue: tireName + ': Center ' + Math.round(pressureDiff) + '°C hotter than edges - over-inflated'
                    });
                    result.recommendations.push({
                        tire: tire,
                        action: 'Reduce ' + tireName + ' cold pressure by 1-2 psi'
                    });
                } else if (pressureDiff > 4) {
                    result.issues.push({
                        tire: tire,
                        type: 'pressure',
                        severity: 'medium',
                        issue: tireName + ': Center running slightly hot - consider reducing pressure'
                    });
                } else if (pressureDiff < -8) {
                    result.issues.push({
                        tire: tire,
                        type: 'pressure',
                        severity: 'high',
                        issue: tireName + ': Edges ' + Math.round(Math.abs(pressureDiff)) + '°C hotter than center - under-inflated'
                    });
                    result.recommendations.push({
                        tire: tire,
                        action: 'Increase ' + tireName + ' cold pressure by 1-2 psi'
                    });
                } else if (pressureDiff < -4) {
                    result.issues.push({
                        tire: tire,
                        type: 'pressure',
                        severity: 'medium',
                        issue: tireName + ': Edges hotter than center - pressure may be low'
                    });
                }
            }
        });
        
        // 3. FRONT-REAR BALANCE
        var frontAvg = null, rearAvg = null;
        if (result.lf.avg !== null && result.rf.avg !== null) {
            frontAvg = (result.lf.avg + result.rf.avg) / 2;
        }
        if (result.lr.avg !== null && result.rr.avg !== null) {
            rearAvg = (result.lr.avg + result.rr.avg) / 2;
        }
        
        if (frontAvg !== null && rearAvg !== null) {
            var frBalance = frontAvg - rearAvg;
            result.frontRearBalance = frBalance;
            result.frontAvg = frontAvg;
            result.rearAvg = rearAvg;
            
            if (frBalance > 12) {
                result.issues.push({
                    type: 'balance',
                    severity: 'high',
                    issue: 'Front tires ' + Math.round(frBalance) + '°C hotter than rears - potential understeer, fronts overworking'
                });
                result.recommendations.push({
                    action: 'Consider: More front downforce, softer front springs, or stiffer rear ARB'
                });
            } else if (frBalance > 6) {
                result.issues.push({
                    type: 'balance',
                    severity: 'medium',
                    issue: 'Front tires running ' + Math.round(frBalance) + '°C hotter - slight front bias'
                });
            } else if (frBalance < -12) {
                result.issues.push({
                    type: 'balance',
                    severity: 'high',
                    issue: 'Rear tires ' + Math.round(Math.abs(frBalance)) + '°C hotter than fronts - potential oversteer on exit'
                });
                result.recommendations.push({
                    action: 'Consider: More rear downforce, softer rear springs, or stiffer front ARB'
                });
            } else if (frBalance < -6) {
                result.issues.push({
                    type: 'balance',
                    severity: 'medium',
                    issue: 'Rear tires running ' + Math.round(Math.abs(frBalance)) + '°C hotter - slight rear bias'
                });
            }
        }
        
        // 4. LEFT-RIGHT BALANCE (indicates track direction bias or alignment issues)
        var leftAvg = null, rightAvg = null;
        if (result.lf.avg !== null && result.lr.avg !== null) {
            leftAvg = (result.lf.avg + result.lr.avg) / 2;
        }
        if (result.rf.avg !== null && result.rr.avg !== null) {
            rightAvg = (result.rf.avg + result.rr.avg) / 2;
        }
        
        if (leftAvg !== null && rightAvg !== null) {
            var lrBalance = leftAvg - rightAvg;
            result.leftRightBalance = lrBalance;
            result.leftAvg = leftAvg;
            result.rightAvg = rightAvg;
            
            if (Math.abs(lrBalance) > 15) {
                var hotSide = lrBalance > 0 ? 'Left' : 'Right';
                result.issues.push({
                    type: 'balance',
                    severity: 'info',
                    issue: hotSide + ' tires ' + Math.round(Math.abs(lrBalance)) + '°C hotter - track has more ' + (lrBalance > 0 ? 'right' : 'left') + '-hand corners'
                });
            }
        }
        
        // 5. ABSOLUTE TEMPERATURE CHECKS
        var optimalRange = { min: 75, max: 105 }; // Typical racing tire window
        
        ['lf', 'rf', 'lr', 'rr'].forEach(function(tire) {
            var t = result[tire];
            if (t.avg !== null) {
                var tireName = tire.toUpperCase();
                
                if (t.avg < optimalRange.min - 10) {
                    result.issues.push({
                        tire: tire,
                        type: 'temperature',
                        severity: 'high',
                        issue: tireName + ' at ' + Math.round(t.avg) + '°C - significantly below optimal window'
                    });
                    result.recommendations.push({
                        tire: tire,
                        action: tireName + ': Increase hot pressure or reduce camber to generate more heat'
                    });
                } else if (t.avg < optimalRange.min) {
                    result.issues.push({
                        tire: tire,
                        type: 'temperature',
                        severity: 'low',
                        issue: tireName + ' at ' + Math.round(t.avg) + '°C - running cool'
                    });
                } else if (t.avg > optimalRange.max + 10) {
                    result.issues.push({
                        tire: tire,
                        type: 'temperature',
                        severity: 'high',
                        issue: tireName + ' at ' + Math.round(t.avg) + '°C - overheating, degradation risk'
                    });
                    result.recommendations.push({
                        tire: tire,
                        action: tireName + ': Reduce pressure, consider more downforce, or adjust driving style'
                    });
                } else if (t.avg > optimalRange.max) {
                    result.issues.push({
                        tire: tire,
                        type: 'temperature',
                        severity: 'medium',
                        issue: tireName + ' at ' + Math.round(t.avg) + '°C - running hot'
                    });
                }
            }
        });
        
        // 6. DIAGONAL BALANCE (cross-weight indicator)
        if (result.lf.avg !== null && result.rr.avg !== null && 
            result.rf.avg !== null && result.lr.avg !== null) {
            var diagonal1 = result.lf.avg + result.rr.avg;
            var diagonal2 = result.rf.avg + result.lr.avg;
            var crossDiff = diagonal1 - diagonal2;
            result.crossWeight = crossDiff;
            
            if (Math.abs(crossDiff) > 20) {
                var heavyDiag = crossDiff > 0 ? 'LF+RR' : 'RF+LR';
                result.issues.push({
                    type: 'balance',
                    severity: 'medium',
                    issue: 'Cross-weight imbalance: ' + heavyDiag + ' diagonal ' + Math.round(Math.abs(crossDiff)) + '°C hotter'
                });
            }
        }
        
        console.log('Tire analysis result:', result);
        return result;
    }
    
    // ============================================
    // RULE-BASED SUSPENSION / RIDE HEIGHT ANALYSIS
    // ============================================
    calculateSuspensionAnalysis() {
        var self = this;
        if (!this.referenceData || this.referenceData.length < 100) {
            return { available: false };
        }
        
        var sampleRow = this.referenceData[0];
        var availableKeys = Object.keys(sampleRow);
        
        // Channel name patterns for iRacing suspension data
        var patterns = {
            rideHeight: {
                lf: ['LFrideHeight', 'LFrideHeight[mm]', 'LFrideHeight[m]', 'Ride Height FL', 'RideHeightFL', 'LF Ride Height', 'LF ride height[mm]'],
                rf: ['RFrideHeight', 'RFrideHeight[mm]', 'RFrideHeight[m]', 'Ride Height FR', 'RideHeightFR', 'RF Ride Height', 'RF ride height[mm]'],
                lr: ['LRrideHeight', 'LRrideHeight[mm]', 'LRrideHeight[m]', 'Ride Height RL', 'RideHeightRL', 'LR Ride Height', 'LR ride height[mm]'],
                rr: ['RRrideHeight', 'RRrideHeight[mm]', 'RRrideHeight[m]', 'Ride Height RR', 'RideHeightRR', 'RR Ride Height', 'RR ride height[mm]']
            },
            shockDefl: {
                lf: ['LFshockDefl', 'LFshockDefl[mm]', 'LFshockDefl[m]', 'Damper Pos FL', 'Susp Pos FL', 'LF Shock Defl', 'LF shock deflection[mm]'],
                rf: ['RFshockDefl', 'RFshockDefl[mm]', 'RFshockDefl[m]', 'Damper Pos FR', 'Susp Pos FR', 'RF Shock Defl', 'RF shock deflection[mm]'],
                lr: ['LRshockDefl', 'LRshockDefl[mm]', 'LRshockDefl[m]', 'Damper Pos RL', 'Susp Pos RL', 'LR Shock Defl', 'LR shock deflection[mm]'],
                rr: ['RRshockDefl', 'RRshockDefl[mm]', 'RRshockDefl[m]', 'Damper Pos RR', 'Susp Pos RR', 'RR Shock Defl', 'RR shock deflection[mm]']
            },
            shockVel: {
                lf: ['LFshockVel', 'LFshockVel[m/s]', 'LFshockVel[mm/s]', 'LF Shock Vel', 'LF shock velocity[m/s]'],
                rf: ['RFshockVel', 'RFshockVel[m/s]', 'RFshockVel[mm/s]', 'RF Shock Vel', 'RF shock velocity[m/s]'],
                lr: ['LRshockVel', 'LRshockVel[m/s]', 'LRshockVel[mm/s]', 'LR Shock Vel', 'LR shock velocity[m/s]'],
                rr: ['RRshockVel', 'RRshockVel[m/s]', 'RRshockVel[mm/s]', 'RR Shock Vel', 'RR shock velocity[m/s]']
            }
        };
        
        function findChannel(nameList) {
            // Exact match first
            for (var i = 0; i < nameList.length; i++) {
                if (availableKeys.indexOf(nameList[i]) !== -1) return nameList[i];
            }
            // Case-insensitive exact match
            for (var i = 0; i < nameList.length; i++) {
                var lower = nameList[i].toLowerCase();
                for (var j = 0; j < availableKeys.length; j++) {
                    if (availableKeys[j].toLowerCase() === lower) return availableKeys[j];
                }
            }
            // Substring match - check if available key contains core pattern
            for (var i = 0; i < nameList.length; i++) {
                var lower = nameList[i].toLowerCase().replace(/[\[\]°\/]/g, '');
                for (var j = 0; j < availableKeys.length; j++) {
                    var keyLower = availableKeys[j].toLowerCase().replace(/[\[\]°\/]/g, '');
                    if (keyLower.indexOf(lower) !== -1 || lower.indexOf(keyLower) !== -1) return availableKeys[j];
                }
            }
            return null;
        }
        
        // Map channels
        var channelMap = {
            rideHeight: {}, shockDefl: {}, shockVel: {}
        };
        var hasRideHeight = false, hasShockDefl = false, hasShockVel = false;
        
        ['lf', 'rf', 'lr', 'rr'].forEach(function(corner) {
            channelMap.rideHeight[corner] = findChannel(patterns.rideHeight[corner]);
            channelMap.shockDefl[corner] = findChannel(patterns.shockDefl[corner]);
            channelMap.shockVel[corner] = findChannel(patterns.shockVel[corner]);
            if (channelMap.rideHeight[corner]) hasRideHeight = true;
            if (channelMap.shockDefl[corner]) hasShockDefl = true;
            if (channelMap.shockVel[corner]) hasShockVel = true;
        });
        
        if (!hasRideHeight && !hasShockDefl && !hasShockVel) {
            console.log('Suspension analysis: No suspension channels found');
            console.log('Available channels with ride/shock/susp/damp/height/defl:', availableKeys.filter(function(k) {
                var kl = k.toLowerCase();
                return kl.indexOf('ride') !== -1 || kl.indexOf('shock') !== -1 || kl.indexOf('susp') !== -1 || kl.indexOf('damp') !== -1 || kl.indexOf('height') !== -1 || kl.indexOf('defl') !== -1;
            }));
            console.log('ALL available channel names:', availableKeys);
            return { available: false };
        }
        
        console.log('=== SUSPENSION ANALYSIS ===');
        console.log('Ride height channels:', channelMap.rideHeight);
        console.log('Shock defl channels:', channelMap.shockDefl);
        console.log('Shock vel channels:', channelMap.shockVel);
        
        var data = this.referenceData;
        
        // Detect units - iRacing outputs ride height in meters, need to convert to mm
        function detectAndConvertRH(channel, row) {
            var val = parseFloat(row[channel]);
            if (isNaN(val)) return null;
            // iRacing outputs ride height in meters (values typically 0.02-0.10)
            // If values are all < 1, likely meters → convert to mm
            if (Math.abs(val) < 1) return val * 1000;
            // If values are < 500, likely already mm
            if (Math.abs(val) < 500) return val;
            return val;
        }
        
        function detectAndConvertSD(channel, row) {
            var val = parseFloat(row[channel]);
            if (isNaN(val)) return null;
            // iRacing shock defl in meters → convert to mm
            if (Math.abs(val) < 1) return val * 1000;
            if (Math.abs(val) < 500) return val;
            return val;
        }
        
        function detectAndConvertSV(channel, row) {
            var val = parseFloat(row[channel]);
            if (isNaN(val)) return null;
            // iRacing shock vel in m/s → convert to mm/s
            if (Math.abs(val) < 5) return val * 1000;
            return val;
        }
        
        // Collect data across the lap
        var stats = {
            rideHeight: { lf: [], rf: [], lr: [], rr: [] },
            shockDefl: { lf: [], rf: [], lr: [], rr: [] },
            shockVel: { lf: [], rf: [], lr: [], rr: [] }
        };
        
        data.forEach(function(row) {
            ['lf', 'rf', 'lr', 'rr'].forEach(function(corner) {
                if (channelMap.rideHeight[corner]) {
                    var v = detectAndConvertRH(channelMap.rideHeight[corner], row);
                    if (v !== null) stats.rideHeight[corner].push(v);
                }
                if (channelMap.shockDefl[corner]) {
                    var v = detectAndConvertSD(channelMap.shockDefl[corner], row);
                    if (v !== null) stats.shockDefl[corner].push(v);
                }
                if (channelMap.shockVel[corner]) {
                    var v = detectAndConvertSV(channelMap.shockVel[corner], row);
                    if (v !== null) stats.shockVel[corner].push(v);
                }
            });
        });
        
        // Helper stats functions
        function avg(arr) { return arr.length === 0 ? null : arr.reduce(function(a,b) { return a+b; }, 0) / arr.length; }
        function min(arr) { return arr.length === 0 ? null : Math.min.apply(null, arr); }
        function max(arr) { return arr.length === 0 ? null : Math.max.apply(null, arr); }
        function stdDev(arr) {
            if (arr.length < 2) return null;
            var mean = avg(arr);
            var sq = arr.reduce(function(a, v) { return a + (v - mean) * (v - mean); }, 0);
            return Math.sqrt(sq / (arr.length - 1));
        }
        function percentile(arr, pct) {
            if (arr.length === 0) return null;
            var sorted = arr.slice().sort(function(a,b) { return a - b; });
            var idx = Math.floor(sorted.length * pct / 100);
            return sorted[Math.min(idx, sorted.length - 1)];
        }
        
        var result = {
            available: true,
            hasRideHeight: hasRideHeight,
            hasShockDefl: hasShockDefl,
            hasShockVel: hasShockVel,
            channelMap: channelMap,
            corners: {},
            issues: [],
            recommendations: []
        };
        
        // Calculate per-corner stats
        ['lf', 'rf', 'lr', 'rr'].forEach(function(corner) {
            var rh = stats.rideHeight[corner];
            var sd = stats.shockDefl[corner];
            var sv = stats.shockVel[corner];
            
            result.corners[corner] = {
                rideHeight: rh.length > 0 ? {
                    avg: avg(rh), min: min(rh), max: max(rh), 
                    range: max(rh) - min(rh), stdDev: stdDev(rh),
                    p5: percentile(rh, 5), p95: percentile(rh, 95)
                } : null,
                shockDefl: sd.length > 0 ? {
                    avg: avg(sd), min: min(sd), max: max(sd),
                    range: max(sd) - min(sd), stdDev: stdDev(sd)
                } : null,
                shockVel: sv.length > 0 ? {
                    avg: avg(sv), min: min(sv), max: max(sv),
                    avgBump: avg(sv.filter(function(v) { return v < 0; })),
                    avgRebound: avg(sv.filter(function(v) { return v > 0; })),
                    maxBump: min(sv),
                    maxRebound: max(sv),
                    pctHighSpeed: sv.filter(function(v) { return Math.abs(v) > 100; }).length / sv.length * 100
                } : null
            };
        });
        
        // ============================================
        // RULE-BASED ANALYSIS
        // ============================================
        
        // 1. RIDE HEIGHT ANALYSIS
        if (hasRideHeight) {
            var frontAvgRH = null, rearAvgRH = null;
            var lfRH = result.corners.lf.rideHeight;
            var rfRH = result.corners.rf.rideHeight;
            var lrRH = result.corners.lr.rideHeight;
            var rrRH = result.corners.rr.rideHeight;
            
            if (lfRH && rfRH) frontAvgRH = (lfRH.avg + rfRH.avg) / 2;
            if (lrRH && rrRH) rearAvgRH = (lrRH.avg + rrRH.avg) / 2;
            
            result.frontAvgRH = frontAvgRH;
            result.rearAvgRH = rearAvgRH;
            
            // a) Rake analysis (rear - front ride height)
            if (frontAvgRH !== null && rearAvgRH !== null) {
                var rake = rearAvgRH - frontAvgRH;
                result.rake = rake;
                
                if (rake < -5) {
                    result.issues.push({
                        type: 'rake',
                        severity: 'high',
                        issue: 'Negative rake detected (' + rake.toFixed(1) + 'mm) — front higher than rear. This hurts downforce and increases drag.'
                    });
                    result.recommendations.push({
                        action: 'Increase rear ride height or lower front to achieve positive rake (rear 5-15mm higher than front)'
                    });
                } else if (rake < 2) {
                    result.issues.push({
                        type: 'rake',
                        severity: 'medium',
                        issue: 'Very low rake (' + rake.toFixed(1) + 'mm). Car may lack front downforce.'
                    });
                    result.recommendations.push({
                        action: 'Consider increasing rake by 3-5mm for better aero balance'
                    });
                } else if (rake > 30) {
                    result.issues.push({
                        type: 'rake',
                        severity: 'medium',
                        issue: 'Excessive rake (' + rake.toFixed(1) + 'mm). May cause rear instability under braking.'
                    });
                    result.recommendations.push({
                        action: 'Reduce rake — consider raising front or lowering rear ride height'
                    });
                }
            }
            
            // b) Left-right ride height balance
            ['front', 'rear'].forEach(function(axle) {
                var leftRH = axle === 'front' ? lfRH : lrRH;
                var rightRH = axle === 'front' ? rfRH : rrRH;
                
                if (leftRH && rightRH) {
                    var diff = leftRH.avg - rightRH.avg;
                    if (Math.abs(diff) > 8) {
                        var highSide = diff > 0 ? 'Left' : 'Right';
                        result.issues.push({
                            type: 'rideHeight',
                            severity: 'medium',
                            issue: axle.charAt(0).toUpperCase() + axle.slice(1) + ' ride height imbalance: ' + highSide + ' side ' + Math.abs(diff).toFixed(1) + 'mm higher'
                        });
                        result.recommendations.push({
                            action: 'Check ' + axle + ' spring perch offset or push rod lengths for ' + axle + ' L/R balance'
                        });
                    }
                }
            });
            
            // c) Bottoming out detection — ride height minimum
            ['lf', 'rf', 'lr', 'rr'].forEach(function(corner) {
                var rh = result.corners[corner].rideHeight;
                if (rh && rh.min !== null) {
                    var cornerName = corner.toUpperCase();
                    if (rh.min < 5) {
                        result.issues.push({
                            type: 'bottoming',
                            severity: 'high',
                            issue: cornerName + ' bottoming out — min ride height ' + rh.min.toFixed(1) + 'mm. Car hitting the track surface.'
                        });
                        result.recommendations.push({
                            action: 'Raise ' + cornerName + ' ride height, stiffen springs, or increase bump stop gap'
                        });
                    } else if (rh.min < 15) {
                        result.issues.push({
                            type: 'bottoming',
                            severity: 'medium',
                            issue: cornerName + ' ride height dropping to ' + rh.min.toFixed(1) + 'mm — close to bottoming'
                        });
                    }
                    
                    // Excessive ride height — car too high, losing downforce
                    if (rh.avg > 80) {
                        result.issues.push({
                            type: 'rideHeight',
                            severity: 'low',
                            issue: cornerName + ' avg ride height ' + rh.avg.toFixed(1) + 'mm — running high, may be losing downforce'
                        });
                    }
                }
            });
            
            // d) Ride height range / consistency
            ['lf', 'rf', 'lr', 'rr'].forEach(function(corner) {
                var rh = result.corners[corner].rideHeight;
                if (rh && rh.range > 40) {
                    result.issues.push({
                        type: 'rideHeight',
                        severity: 'low',
                        issue: corner.toUpperCase() + ' ride height variation: ' + rh.range.toFixed(1) + 'mm range — suspension may be too soft'
                    });
                }
            });
        }
        
        // 2. SHOCK DEFLECTION ANALYSIS
        if (hasShockDefl) {
            ['lf', 'rf', 'lr', 'rr'].forEach(function(corner) {
                var sd = result.corners[corner].shockDefl;
                if (sd) {
                    var cornerName = corner.toUpperCase();
                    
                    // Check if shock is running out of travel (topping out or bottoming)
                    if (sd.range > 50) {
                        result.issues.push({
                            type: 'shockTravel',
                            severity: 'medium',
                            issue: cornerName + ' shock travel range ' + sd.range.toFixed(1) + 'mm — suspension using excessive travel'
                        });
                        result.recommendations.push({
                            action: 'Consider stiffer springs or more bump stop support at ' + cornerName
                        });
                    }
                }
            });
            
            // Front vs rear shock travel comparison
            var frontDeflRange = null, rearDeflRange = null;
            if (result.corners.lf.shockDefl && result.corners.rf.shockDefl) {
                frontDeflRange = (result.corners.lf.shockDefl.range + result.corners.rf.shockDefl.range) / 2;
            }
            if (result.corners.lr.shockDefl && result.corners.rr.shockDefl) {
                rearDeflRange = (result.corners.lr.shockDefl.range + result.corners.rr.shockDefl.range) / 2;
            }
            
            if (frontDeflRange !== null && rearDeflRange !== null) {
                result.frontDeflRange = frontDeflRange;
                result.rearDeflRange = rearDeflRange;
                
                if (frontDeflRange > rearDeflRange * 1.5) {
                    result.issues.push({
                        type: 'balance',
                        severity: 'medium',
                        issue: 'Front suspension using significantly more travel than rear (' + frontDeflRange.toFixed(1) + 'mm vs ' + rearDeflRange.toFixed(1) + 'mm)'
                    });
                    result.recommendations.push({
                        action: 'Front springs may be too soft relative to rear, or front ARB needs stiffening'
                    });
                } else if (rearDeflRange > frontDeflRange * 1.5) {
                    result.issues.push({
                        type: 'balance',
                        severity: 'medium',
                        issue: 'Rear suspension using significantly more travel than front (' + rearDeflRange.toFixed(1) + 'mm vs ' + frontDeflRange.toFixed(1) + 'mm)'
                    });
                    result.recommendations.push({
                        action: 'Rear springs may be too soft relative to front, or rear ARB needs stiffening'
                    });
                }
            }
        }
        
        // 3. SHOCK VELOCITY ANALYSIS (Damper tuning insights)
        if (hasShockVel) {
            ['lf', 'rf', 'lr', 'rr'].forEach(function(corner) {
                var sv = result.corners[corner].shockVel;
                if (sv) {
                    var cornerName = corner.toUpperCase();
                    
                    // High-speed shock events (>100 mm/s indicates bumps or aggressive inputs)
                    if (sv.pctHighSpeed > 25) {
                        result.issues.push({
                            type: 'damper',
                            severity: 'medium',
                            issue: cornerName + ' shock spending ' + sv.pctHighSpeed.toFixed(0) + '% time in high-speed zone — bumpy surface or aggressive inputs'
                        });
                        result.recommendations.push({
                            action: 'Consider adjusting ' + cornerName + ' high-speed compression/rebound for better bump absorption'
                        });
                    }
                    
                    // Rebound/Bump imbalance
                    if (sv.avgBump !== null && sv.avgRebound !== null) {
                        var ratio = Math.abs(sv.avgRebound) / (Math.abs(sv.avgBump) || 1);
                        if (ratio > 1.8) {
                            result.issues.push({
                                type: 'damper',
                                severity: 'low',
                                issue: cornerName + ' rebound-dominant — avg rebound ' + Math.abs(sv.avgRebound).toFixed(0) + 'mm/s vs bump ' + Math.abs(sv.avgBump).toFixed(0) + 'mm/s'
                            });
                            result.recommendations.push({
                                action: 'Increase ' + cornerName + ' rebound damping or decrease bump damping for better balance'
                            });
                        } else if (ratio < 0.55) {
                            result.issues.push({
                                type: 'damper',
                                severity: 'low',
                                issue: cornerName + ' bump-dominant — avg bump ' + Math.abs(sv.avgBump).toFixed(0) + 'mm/s vs rebound ' + Math.abs(sv.avgRebound).toFixed(0) + 'mm/s'
                            });
                            result.recommendations.push({
                                action: 'Increase ' + cornerName + ' bump damping or decrease rebound damping'
                            });
                        }
                    }
                }
            });
        }
        
        console.log('Suspension analysis result:', result);
        return result;
    }
    
    calculateGripEfficiency() {
        var self = this;
        if (!this.referenceData || !this.currentData) return null;
        
        // Get lap times from telemetry
        var timeNames = ['Time', 'Time[s]', 'Lap Time', 'Session Time', 'time'];
        function getValue(row, names) {
            for (var i = 0; i < names.length; i++) {
                if (row && row[names[i]] !== undefined && row[names[i]] !== null) {
                    var val = parseFloat(row[names[i]]);
                    if (!isNaN(val)) return val;
                }
            }
            return null;
        }
        
        var refEndTime = getValue(this.referenceData[this.referenceData.length - 1], timeNames);
        var currEndTime = getValue(this.currentData[this.currentData.length - 1], timeNames);
        
        if (!refEndTime || !currEndTime || refEndTime <= 0 || currEndTime <= 0) {
            console.log('Grip efficiency: no lap time data available');
            return null;
        }
        
        // Look for direct lateral G channel
        var gLatChannel = null;
        var channels = this.detectedChannels ? (this.detectedChannels.optional || {}) : {};
        if (channels.gLat) gLatChannel = channels.gLat.csvColumn || channels.gLat;
        
        if (!gLatChannel) {
            var possibleNames = ['G Force Lat', 'G-Force Lat', 'G-Force Lat[G]', 'gLat', 'Lateral G', 'LateralAccel', 'G_Lat', 'LatG', 'G Lat[G]', 'G Lat'];
            var sampleRow = this.referenceData[0];
            for (var i = 0; i < possibleNames.length; i++) {
                if (sampleRow && sampleRow[possibleNames[i]] !== undefined) {
                    gLatChannel = possibleNames[i];
                    break;
                }
            }
        }
        
        var refGLat = [];
        var currGLat = [];
        
        if (gLatChannel) {
            // Use direct lateral G data
            console.log('Grip efficiency: using direct lateral G channel:', gLatChannel);
            refGLat = this.referenceData.map(function(row) {
                var val = parseFloat(row[gLatChannel]);
                return isNaN(val) ? 0 : Math.abs(val);
            }).filter(function(g) { return g > 0.1; });
            
            currGLat = this.currentData.map(function(row) {
                var val = parseFloat(row[gLatChannel]);
                return isNaN(val) ? 0 : Math.abs(val);
            }).filter(function(g) { return g > 0.1; });
        } else {
            // Try to derive lateral G from yaw/heading and speed
            var yawNames = ['Yaw[°]', 'Yaw', 'Heading', 'Heading[°]', 'Car Heading', 'YawNorth[°]', 'YawNorth'];
            var speedNames = ['Ground Speed', 'Speed', 'Speed[kph]', 'Ground Speed_ms', 'speed', 'Speed_ms'];
            var distNames = ['Corrected Distance', 'Corrected Distance[m]', 'Lap Distance', 'Distance', 'Dist'];
            
            var sampleRow = this.referenceData[0];
            var yawChannel = null;
            var speedChannel = null;
            var distChannel = null;
            
            for (var i = 0; i < yawNames.length; i++) {
                if (sampleRow && sampleRow[yawNames[i]] !== undefined) {
                    yawChannel = yawNames[i];
                    break;
                }
            }
            for (var i = 0; i < speedNames.length; i++) {
                if (sampleRow && sampleRow[speedNames[i]] !== undefined) {
                    speedChannel = speedNames[i];
                    break;
                }
            }
            for (var i = 0; i < distNames.length; i++) {
                if (sampleRow && sampleRow[distNames[i]] !== undefined) {
                    distChannel = distNames[i];
                    break;
                }
            }
            
            if (!yawChannel || !speedChannel || !distChannel) {
                console.log('Grip efficiency: insufficient data (no lateral G, yaw, speed, or distance)');
                return null;
            }
            
            console.log('Grip efficiency: deriving lateral G from yaw/speed');
            
            // Calculate derived lateral G for reference lap
            for (var i = 1; i < this.referenceData.length - 1; i++) {
                var prev = this.referenceData[i - 1];
                var curr = this.referenceData[i];
                var next = this.referenceData[i + 1];
                
                var yawPrev = parseFloat(prev[yawChannel]);
                var yawNext = parseFloat(next[yawChannel]);
                var speed = parseFloat(curr[speedChannel]);
                var distPrev = parseFloat(prev[distChannel]);
                var distNext = parseFloat(next[distChannel]);
                
                if (!isNaN(yawPrev) && !isNaN(yawNext) && !isNaN(speed) && !isNaN(distPrev) && !isNaN(distNext)) {
                    var dYaw = yawNext - yawPrev;
                    if (dYaw > 180) dYaw -= 360;
                    if (dYaw < -180) dYaw += 360;
                    
                    var dDist = distNext - distPrev;
                    if (dDist > 0.1) {
                        var speedMs = speed < 100 ? speed : speed / 3.6;
                        var curvature = (dYaw * Math.PI / 180) / dDist;
                        var gLat = Math.abs((speedMs * speedMs * curvature) / 9.81);
                        if (gLat > 0.1 && gLat < 5) {  // Sanity check
                            refGLat.push(gLat);
                        }
                    }
                }
            }
            
            // Calculate derived lateral G for current lap
            for (var i = 1; i < this.currentData.length - 1; i++) {
                var prev = this.currentData[i - 1];
                var curr = this.currentData[i];
                var next = this.currentData[i + 1];
                
                var yawPrev = parseFloat(prev[yawChannel]);
                var yawNext = parseFloat(next[yawChannel]);
                var speed = parseFloat(curr[speedChannel]);
                var distPrev = parseFloat(prev[distChannel]);
                var distNext = parseFloat(next[distChannel]);
                
                if (!isNaN(yawPrev) && !isNaN(yawNext) && !isNaN(speed) && !isNaN(distPrev) && !isNaN(distNext)) {
                    var dYaw = yawNext - yawPrev;
                    if (dYaw > 180) dYaw -= 360;
                    if (dYaw < -180) dYaw += 360;
                    
                    var dDist = distNext - distPrev;
                    if (dDist > 0.1) {
                        var speedMs = speed < 100 ? speed : speed / 3.6;
                        var curvature = (dYaw * Math.PI / 180) / dDist;
                        var gLat = Math.abs((speedMs * speedMs * curvature) / 9.81);
                        if (gLat > 0.1 && gLat < 5) {  // Sanity check
                            currGLat.push(gLat);
                        }
                    }
                }
            }
        }
        
        if (refGLat.length < 10 || currGLat.length < 10) {
            console.log('Grip efficiency: insufficient G data points (ref:', refGLat.length, ', curr:', currGLat.length, ')');
            return null;
        }
        
        // Sort and take top 10% (peak cornering G)
        refGLat.sort(function(a, b) { return b - a; });
        currGLat.sort(function(a, b) { return b - a; });
        
        var top10PercentRef = refGLat.slice(0, Math.ceil(refGLat.length * 0.1));
        var top10PercentCurr = currGLat.slice(0, Math.ceil(currGLat.length * 0.1));
        
        var avgTopRefG = top10PercentRef.reduce(function(a, b) { return a + b; }, 0) / top10PercentRef.length;
        var avgTopCurrG = top10PercentCurr.reduce(function(a, b) { return a + b; }, 0) / top10PercentCurr.length;
        
        if (avgTopRefG < 0.1 || avgTopCurrG < 0.1) {
            console.log('Grip efficiency: G values too low');
            return null;
        }
        
        // Calculate efficiency
        // Efficiency = (RefTime / YourTime) × (RefG / YourG) × 100
        // Faster lap (lower time) + less G = higher efficiency
        // Slower lap (higher time) + more G = lower efficiency
        var timeRatio = refEndTime / currEndTime;  // >1 if you're faster
        var gRatio = avgTopRefG / avgTopCurrG;      // >1 if you use less G
        
        var efficiency = timeRatio * gRatio * 100;
        
        console.log('Grip efficiency: refTime=' + refEndTime.toFixed(3) + 's, currTime=' + currEndTime.toFixed(3) + 's');
        console.log('Grip efficiency: refG=' + avgTopRefG.toFixed(3) + ', currG=' + avgTopCurrG.toFixed(3));
        console.log('Grip efficiency: timeRatio=' + timeRatio.toFixed(3) + ', gRatio=' + gRatio.toFixed(3) + ', efficiency=' + efficiency.toFixed(1) + '%');
        
        return Math.min(Math.max(efficiency, 0), 150);
    }
    
    calculateCornerGripEfficiency(cornerDistance, cornerRadius) {
        // Calculate grip efficiency for a specific corner
        // Formula: (RefTime / YourTime) × (RefG / YourG) × 100
        
        if (!this.referenceData || !this.currentData) return null;
        
        // Define corner zone - use radius if provided, otherwise estimate based on corner type
        var zoneRadius = cornerRadius || 75; // meters before and after apex
        var startDist = cornerDistance - zoneRadius;
        var endDist = cornerDistance + zoneRadius;
        
        // Channel names
        var distNames = ['Corrected Distance', 'Corrected Distance[m]', 'Lap Distance', 'Distance', 'Dist'];
        var timeNames = ['Time', 'Time[s]', 'Lap Time', 'Session Time', 'time'];
        var gLatNames = ['G Force Lat', 'G-Force Lat', 'G-Force Lat[G]', 'gLat', 'Lateral G', 'LateralAccel', 'G_Lat'];
        var yawNames = ['Yaw[°]', 'Yaw', 'Heading', 'Heading[°]', 'Car Heading', 'YawNorth[°]'];
        var speedNames = ['Ground Speed', 'Speed', 'Speed[kph]', 'Ground Speed_ms', 'speed'];
        
        var self = this;
        
        function getValue(row, names) {
            for (var i = 0; i < names.length; i++) {
                if (row && row[names[i]] !== undefined && row[names[i]] !== null) {
                    var val = parseFloat(row[names[i]]);
                    if (!isNaN(val)) return val;
                }
            }
            return null;
        }
        
        function getDataInZone(data, startD, endD) {
            return data.filter(function(row) {
                var dist = getValue(row, distNames);
                return dist !== null && dist >= startD && dist <= endD;
            });
        }
        
        // Get data points within corner zone
        var refZone = getDataInZone(this.referenceData, startDist, endDist);
        var currZone = getDataInZone(this.currentData, startDist, endDist);
        
        if (refZone.length < 3 || currZone.length < 3) {
            return null;
        }
        
        // Calculate time through corner zone
        var refStartTime = getValue(refZone[0], timeNames);
        var refEndTime = getValue(refZone[refZone.length - 1], timeNames);
        var currStartTime = getValue(currZone[0], timeNames);
        var currEndTime = getValue(currZone[currZone.length - 1], timeNames);
        
        if (!refStartTime || !refEndTime || !currStartTime || !currEndTime) {
            return null;
        }
        
        var refCornerTime = refEndTime - refStartTime;
        var currCornerTime = currEndTime - currStartTime;
        
        if (refCornerTime <= 0 || currCornerTime <= 0) {
            return null;
        }
        
        // Get lateral G values in zone
        var refGLat = [];
        var currGLat = [];
        
        // Check if we have direct lateral G
        var hasDirectGLat = getValue(refZone[0], gLatNames) !== null;
        
        if (hasDirectGLat) {
            refGLat = refZone.map(function(row) {
                var val = getValue(row, gLatNames);
                return val !== null ? Math.abs(val) : 0;
            }).filter(function(g) { return g > 0.1; });
            
            currGLat = currZone.map(function(row) {
                var val = getValue(row, gLatNames);
                return val !== null ? Math.abs(val) : 0;
            }).filter(function(g) { return g > 0.1; });
        } else {
            // Derive from yaw/speed
            for (var i = 1; i < refZone.length - 1; i++) {
                var prev = refZone[i - 1];
                var curr = refZone[i];
                var next = refZone[i + 1];
                
                var yawPrev = getValue(prev, yawNames);
                var yawNext = getValue(next, yawNames);
                var speed = getValue(curr, speedNames);
                var distPrev = getValue(prev, distNames);
                var distNext = getValue(next, distNames);
                
                if (yawPrev !== null && yawNext !== null && speed !== null && distPrev !== null && distNext !== null) {
                    var dYaw = yawNext - yawPrev;
                    if (dYaw > 180) dYaw -= 360;
                    if (dYaw < -180) dYaw += 360;
                    
                    var dDist = distNext - distPrev;
                    if (dDist > 0.1) {
                        var speedMs = speed < 100 ? speed : speed / 3.6;
                        var curvature = (dYaw * Math.PI / 180) / dDist;
                        var gLat = Math.abs((speedMs * speedMs * curvature) / 9.81);
                        if (gLat > 0.1 && gLat < 5) {
                            refGLat.push(gLat);
                        }
                    }
                }
            }
            
            for (var i = 1; i < currZone.length - 1; i++) {
                var prev = currZone[i - 1];
                var curr = currZone[i];
                var next = currZone[i + 1];
                
                var yawPrev = getValue(prev, yawNames);
                var yawNext = getValue(next, yawNames);
                var speed = getValue(curr, speedNames);
                var distPrev = getValue(prev, distNames);
                var distNext = getValue(next, distNames);
                
                if (yawPrev !== null && yawNext !== null && speed !== null && distPrev !== null && distNext !== null) {
                    var dYaw = yawNext - yawPrev;
                    if (dYaw > 180) dYaw -= 360;
                    if (dYaw < -180) dYaw += 360;
                    
                    var dDist = distNext - distPrev;
                    if (dDist > 0.1) {
                        var speedMs = speed < 100 ? speed : speed / 3.6;
                        var curvature = (dYaw * Math.PI / 180) / dDist;
                        var gLat = Math.abs((speedMs * speedMs * curvature) / 9.81);
                        if (gLat > 0.1 && gLat < 5) {
                            currGLat.push(gLat);
                        }
                    }
                }
            }
        }
        
        if (refGLat.length < 2 || currGLat.length < 2) {
            return null;
        }
        
        // Use peak G (top 20% average) for corners
        refGLat.sort(function(a, b) { return b - a; });
        currGLat.sort(function(a, b) { return b - a; });
        
        var top20Ref = refGLat.slice(0, Math.max(1, Math.ceil(refGLat.length * 0.2)));
        var top20Curr = currGLat.slice(0, Math.max(1, Math.ceil(currGLat.length * 0.2)));
        
        var avgRefG = top20Ref.reduce(function(a, b) { return a + b; }, 0) / top20Ref.length;
        var avgCurrG = top20Curr.reduce(function(a, b) { return a + b; }, 0) / top20Curr.length;
        
        if (avgRefG < 0.1 || avgCurrG < 0.1) {
            return null;
        }
        
        // Calculate efficiency: (RefTime / YourTime) × (RefG / YourG) × 100
        var timeRatio = refCornerTime / currCornerTime;  // >1 if you're faster
        var gRatio = avgRefG / avgCurrG;                  // >1 if you use less G
        
        var efficiency = timeRatio * gRatio * 100;
        
        return Math.min(Math.max(efficiency, 0), 150);
    }
    
    calculateCornerType(cornerDistance) {
        // Calculate corner type based on telemetry data
        // Priority for severity: 1) Heading change, 2) Lateral G, 3) Speed reduction
        // Direction always from steering wheel data (most reliable)
        
        if (!this.referenceData || this.referenceData.length < 10) return 'corner';
        
        var self = this;
        
        // Get channel mappings from LLM-detected channels
        var channels = this.detectedChannels || {};
        var required = channels.required || {};
        var optional = channels.optional || {};
        
        // Helper to get the actual CSV column name from detected channels
        function getChannelColumn(channelObj) {
            if (!channelObj) return null;
            if (typeof channelObj === 'string') return channelObj;
            return channelObj.csvColumn || channelObj.name || null;
        }
        
        // Get mapped channel names
        var distChannel = getChannelColumn(required.distance);
        var steerChannel = getChannelColumn(optional.steer);
        var gLatChannel = getChannelColumn(optional.gLat);
        var speedChannel = getChannelColumn(required.speed);
        var yawChannel = getChannelColumn(optional.heading); // Use heading for yaw angle
        
        // Fallback channel name arrays if not in detectedChannels
        var distNames = ['Corrected Distance', 'Corrected Distance[m]', 'Lap Distance', 'Distance', 'Dist'];
        var yawNames = ['Heading', 'Heading[°]', 'Car Heading', 'Yaw Angle', 'Yaw[°]', 'Yaw', 'YawNorth[°]', 'YawNorth'];
        var gLatNames = ['G Force Lat', 'G-Force Lat', 'G-Force Lat[G]', 'gLat', 'Lateral G', 'LateralAccel', 'G_Lat', 'LatG', 'G Lat[G]', 'G Lat', 'Lat Accel', 'LateralAcceleration'];
        var speedNames = ['Ground Speed', 'Speed', 'Speed[kph]', 'Ground Speed_ms', 'speed', 'Speed_ms'];
        var steerNames = ['Steered Angle', 'Steering Angle', 'Steer', 'steer', 'STEER', 'SteerAngle', 'Steering', 'Steering Wheel Angle', 'Steering Wheel Angle[°]', 'SteeringWheelAngle[°]', 'Steering (Filtered)[°]', 'Steer Angle[°]', 'Steer Angle'];
        
        function getValue(row, channelName, fallbackNames) {
            // First try the specific channel name
            if (channelName && row[channelName] !== undefined && row[channelName] !== null) {
                var val = parseFloat(row[channelName]);
                if (!isNaN(val)) return val;
            }
            // Fallback to searching through possible names
            if (fallbackNames) {
                for (var i = 0; i < fallbackNames.length; i++) {
                    if (row[fallbackNames[i]] !== undefined && row[fallbackNames[i]] !== null) {
                        var val = parseFloat(row[fallbackNames[i]]);
                        if (!isNaN(val)) return val;
                    }
                }
            }
            return null;
        }
        
        // Find channel if not mapped
        function findChannel(channelName, fallbackNames) {
            if (channelName) return channelName;
            var sampleRow = self.referenceData[0];
            for (var i = 0; i < fallbackNames.length; i++) {
                if (sampleRow && sampleRow[fallbackNames[i]] !== undefined) {
                    return fallbackNames[i];
                }
            }
            return null;
        }
        
        // Ensure we have distance channel
        distChannel = findChannel(distChannel, distNames);
        if (!distChannel) return 'corner';
        
        // Find other channels
        steerChannel = findChannel(steerChannel, steerNames);
        gLatChannel = findChannel(gLatChannel, gLatNames);
        speedChannel = findChannel(speedChannel, speedNames);
        yawChannel = findChannel(yawChannel, yawNames);
        
        console.log('Corner type detection - detectedChannels:', JSON.stringify({
            steer: optional.steer,
            gLat: optional.gLat,
            heading: optional.heading
        }));
        console.log('Corner type detection - resolved channels - steer: ' + steerChannel + ', gLat: ' + gLatChannel + ', heading: ' + yawChannel);
        
        // Define corner zone (75m before and after apex)
        var zoneRadius = 75;
        var startDist = cornerDistance - zoneRadius;
        var endDist = cornerDistance + zoneRadius;
        
        // Get data points within corner zone
        var cornerData = this.referenceData.filter(function(row) {
            var dist = getValue(row, distChannel, distNames);
            return dist !== null && dist >= startDist && dist <= endDist;
        });
        
        if (cornerData.length < 5) return 'corner';
        
        var cornerType = 'corner';
        var direction = '';
        
        // Get peak steering for logging (but don't use for direction - sign convention varies)
        var peakSteer = 0;
        if (steerChannel) {
            var steerAngles = cornerData.map(function(row) {
                return getValue(row, steerChannel, steerNames);
            }).filter(function(s) { return s !== null && Math.abs(s) > 1; });
            
            if (steerAngles.length > 3) {
                for (var i = 0; i < steerAngles.length; i++) {
                    if (Math.abs(steerAngles[i]) > Math.abs(peakSteer)) {
                        peakSteer = steerAngles[i];
                    }
                }
            }
        }
        
        // PRIMARY: Use heading change to determine direction (most reliable)
        // Heading change is independent of sim/logger conventions
        if (yawChannel) {
            var startYaw = getValue(cornerData[0], yawChannel, yawNames);
            var endYaw = getValue(cornerData[cornerData.length - 1], yawChannel, yawNames);
            
            if (startYaw !== null && endYaw !== null) {
                var headingChange = endYaw - startYaw;
                
                // Normalize to -180 to 180 range
                while (headingChange > 180) headingChange -= 360;
                while (headingChange < -180) headingChange += 360;
                
                // Heading/Yaw convention varies by sim:
                // iRacing: Negative change = RIGHT turn, Positive change = LEFT turn
                // (opposite of standard compass convention)
                if (Math.abs(headingChange) > 5) {
                    direction = headingChange < 0 ? 'right' : 'left';
                    console.log('Corner at ' + cornerDistance + 'm: direction from heading = ' + direction + 
                        ' (Δheading: ' + headingChange.toFixed(1) + '°, steering: ' + peakSteer.toFixed(1) + '°)');
                }
            }
        }
        
        // FALLBACK: Use lateral G if no heading data
        if (!direction && gLatChannel) {
            var gLatValues = cornerData.map(function(row) {
                return getValue(row, gLatChannel, gLatNames);
            }).filter(function(g) { return g !== null && Math.abs(g) > 0.1; });
            
            if (gLatValues.length > 3) {
                var sumGLat = 0;
                for (var i = 0; i < gLatValues.length; i++) {
                    sumGLat += gLatValues[i];
                }
                var avgGLat = sumGLat / gLatValues.length;
                if (Math.abs(avgGLat) > 0.2) {
                    // Lateral G convention: positive = right turn (typically)
                    direction = avgGLat > 0 ? 'right' : 'left';
                    console.log('Corner at ' + cornerDistance + 'm: direction from lateral G = ' + direction + ' (avg: ' + avgGLat.toFixed(2) + 'G)');
                }
            }
        }
        
        // LAST RESORT: Use steering with standard convention (may be wrong for some sims)
        if (!direction && Math.abs(peakSteer) > 5) {
            direction = peakSteer > 0 ? 'right' : 'left';
            console.log('Corner at ' + cornerDistance + 'm: direction from steering (fallback) = ' + direction + ' (peak: ' + peakSteer.toFixed(1) + '°)');
        }
        
        if (!direction) {
            console.log('Corner at ' + cornerDistance + 'm: could not determine direction');
        }
        
        // METHOD 1: Heading/Yaw change for severity (most accurate for corner type)
        if (yawChannel) {
            var startYaw = getValue(cornerData[0], yawChannel, yawNames);
            var endYaw = getValue(cornerData[cornerData.length - 1], yawChannel, yawNames);
            
            if (startYaw !== null && endYaw !== null) {
                var headingChange = endYaw - startYaw;
                
                // Normalize to -180 to 180 range (handle wraparound)
                while (headingChange > 180) headingChange -= 360;
                while (headingChange < -180) headingChange += 360;
                
                var absHeadingChange = Math.abs(headingChange);
                
                // Classify based on heading change
                if (absHeadingChange >= 150) {
                    cornerType = 'hairpin';
                } else if (absHeadingChange >= 90) {
                    cornerType = direction ? 'tight ' + direction : 'tight';
                } else if (absHeadingChange >= 60) {
                    cornerType = direction ? 'medium ' + direction : 'medium';
                } else if (absHeadingChange >= 30) {
                    cornerType = direction ? 'fast ' + direction : 'fast';
                } else if (absHeadingChange >= 10) {
                    cornerType = direction ? 'kink ' + direction : 'kink';
                } else {
                    cornerType = 'straight';
                }
                
                return cornerType;
            }
        }
        
        // METHOD 2: Lateral G for severity (fallback)
        if (gLatChannel) {
            var gLatValues = cornerData.map(function(row) {
                return getValue(row, gLatChannel, gLatNames);
            }).filter(function(g) { return g !== null; });
            
            if (gLatValues.length > 3) {
                var peakGLat = 0;
                for (var i = 0; i < gLatValues.length; i++) {
                    if (Math.abs(gLatValues[i]) > Math.abs(peakGLat)) {
                        peakGLat = gLatValues[i];
                    }
                }
                
                var absPeakG = Math.abs(peakGLat);
                
                // Classify based on peak lateral G
                if (absPeakG >= 2.5) {
                    cornerType = 'hairpin';
                } else if (absPeakG >= 1.8) {
                    cornerType = direction ? 'tight ' + direction : 'tight';
                } else if (absPeakG >= 1.2) {
                    cornerType = direction ? 'medium ' + direction : 'medium';
                } else if (absPeakG >= 0.6) {
                    cornerType = direction ? 'fast ' + direction : 'fast';
                } else if (absPeakG >= 0.3) {
                    cornerType = direction ? 'kink ' + direction : 'kink';
                } else {
                    cornerType = 'straight';
                }
                
                return cornerType;
            }
        }
        
        // METHOD 3: Speed reduction for severity (last resort)
        if (speedChannel) {
            var speeds = cornerData.map(function(row) {
                return getValue(row, speedChannel, speedNames);
            }).filter(function(s) { return s !== null && s > 0; });
            
            if (speeds.length > 3) {
                var maxSpeed = Math.max.apply(null, speeds);
                var minSpeed = Math.min.apply(null, speeds);
                
                // Convert to consistent units (assume km/h if > 50)
                if (maxSpeed < 50) {
                    maxSpeed = maxSpeed * 3.6;
                    minSpeed = minSpeed * 3.6;
                }
                
                var speedRatio = minSpeed / maxSpeed;
                var speedReduction = maxSpeed - minSpeed;
                
                // Classify based on speed reduction
                if (speedRatio < 0.35 || speedReduction > 120) {
                    cornerType = 'hairpin';
                } else if (speedRatio < 0.50 || speedReduction > 80) {
                    cornerType = direction ? 'tight ' + direction : 'tight';
                } else if (speedRatio < 0.65 || speedReduction > 50) {
                    cornerType = direction ? 'medium ' + direction : 'medium';
                } else if (speedRatio < 0.80 || speedReduction > 25) {
                    cornerType = direction ? 'fast ' + direction : 'fast';
                } else if (speedReduction > 10) {
                    cornerType = direction ? 'kink ' + direction : 'kink';
                } else {
                    cornerType = 'straight';
                }
                
                return cornerType;
            }
        }
        
        // METHOD 4: Steering angle for severity (if nothing else works)
        if (steerChannel) {
            var steerAngles = cornerData.map(function(row) {
                return getValue(row, steerNames);
            }).filter(function(s) { return s !== null; });
            
            if (steerAngles.length > 3) {
                var peakSteer = 0;
                for (var i = 0; i < steerAngles.length; i++) {
                    if (Math.abs(steerAngles[i]) > Math.abs(peakSteer)) {
                        peakSteer = steerAngles[i];
                    }
                }
                
                var absSteer = Math.abs(peakSteer);
                
                // Classify based on steering angle
                if (absSteer >= 300) {
                    cornerType = 'hairpin';
                } else if (absSteer >= 180) {
                    cornerType = direction ? 'tight ' + direction : 'tight';
                } else if (absSteer >= 90) {
                    cornerType = direction ? 'medium ' + direction : 'medium';
                } else if (absSteer >= 40) {
                    cornerType = direction ? 'fast ' + direction : 'fast';
                } else if (absSteer >= 15) {
                    cornerType = direction ? 'kink ' + direction : 'kink';
                } else {
                    cornerType = 'straight';
                }
                
                return cornerType;
            }
        }
        
        return direction ? cornerType + ' ' + direction : cornerType;
    }
    
    generateGraphs(analysis) {
        // Detect corners from telemetry data (more reliable than AI)
        this.detectCornersFromTelemetry();
        
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
            document.getElementById('track-map').innerHTML = '<p class="text-[#6e7681] text-center py-20">No track data</p>'; 
            return; 
        }
        
        // Pre-built track maps for iRacing circuits
        var TRACK_MAPS = {
            "miami": {
                name: "Miami International Autodrome",
                variants: ["miami", "miami gp", "miami\\gp", "miami international"],
                length: 5412,
                // Miami GP - 19 corners, based on actual track layout
                // Track runs roughly counterclockwise
                points: [
                    // Start/Finish straight (running left to right)
                    {x: 50, y: 500, distPct: 0},
                    {x: 150, y: 500, distPct: 3},
                    {x: 300, y: 500, distPct: 6},
                    {x: 450, y: 500, distPct: 9},
                    {x: 600, y: 500, distPct: 12},
                    // T1 - Hard right braking zone
                    {x: 700, y: 495, distPct: 13},
                    {x: 750, y: 480, distPct: 14},
                    {x: 780, y: 450, distPct: 15},
                    // T2 - Quick left
                    {x: 790, y: 420, distPct: 16},
                    {x: 780, y: 390, distPct: 17},
                    // T3 - Right exit
                    {x: 760, y: 360, distPct: 18},
                    {x: 730, y: 340, distPct: 19},
                    // T4 - Left kink
                    {x: 690, y: 320, distPct: 20},
                    {x: 650, y: 310, distPct: 21},
                    // T5 - Right
                    {x: 610, y: 310, distPct: 22},
                    {x: 570, y: 320, distPct: 23},
                    // T6 - Left
                    {x: 530, y: 310, distPct: 24},
                    {x: 490, y: 290, distPct: 25},
                    // T7 - Tight right hairpin
                    {x: 460, y: 260, distPct: 26},
                    {x: 450, y: 220, distPct: 27},
                    {x: 460, y: 180, distPct: 28},
                    {x: 490, y: 160, distPct: 29},
                    // Back straight section
                    {x: 530, y: 150, distPct: 30},
                    {x: 580, y: 145, distPct: 31},
                    {x: 640, y: 140, distPct: 32},
                    {x: 700, y: 135, distPct: 33},
                    // T8 - Left into chicane
                    {x: 750, y: 130, distPct: 34},
                    {x: 790, y: 140, distPct: 35},
                    // T9 - Right
                    {x: 820, y: 160, distPct: 36},
                    {x: 835, y: 190, distPct: 37},
                    // T10 - Left
                    {x: 830, y: 220, distPct: 38},
                    {x: 810, y: 245, distPct: 39},
                    // T11 - Hard right (marina entry)
                    {x: 780, y: 270, distPct: 40},
                    {x: 750, y: 300, distPct: 41},
                    {x: 730, y: 340, distPct: 42},
                    {x: 720, y: 380, distPct: 43},
                    // Marina section
                    {x: 700, y: 420, distPct: 44},
                    {x: 670, y: 450, distPct: 45},
                    // T12 - Left
                    {x: 630, y: 470, distPct: 46},
                    {x: 580, y: 480, distPct: 47},
                    // T13 - Right
                    {x: 530, y: 475, distPct: 48},
                    {x: 480, y: 460, distPct: 49},
                    // T14 - Right
                    {x: 440, y: 440, distPct: 50},
                    {x: 410, y: 410, distPct: 51},
                    // T15 - Left
                    {x: 390, y: 380, distPct: 52},
                    {x: 380, y: 350, distPct: 53},
                    // Stadium section
                    {x: 360, y: 320, distPct: 54},
                    {x: 330, y: 300, distPct: 55},
                    // T16 - Left
                    {x: 290, y: 290, distPct: 56},
                    {x: 250, y: 295, distPct: 57},
                    // T17 - Right
                    {x: 210, y: 310, distPct: 58},
                    {x: 180, y: 340, distPct: 59},
                    {x: 160, y: 380, distPct: 60},
                    // Back chicane
                    {x: 150, y: 420, distPct: 61},
                    // T18 - Left
                    {x: 130, y: 450, distPct: 62},
                    {x: 100, y: 470, distPct: 63},
                    // T19 - Right onto main straight
                    {x: 70, y: 485, distPct: 64},
                    {x: 50, y: 500, distPct: 65},
                    // Note: The remaining 35% is the long pit straight
                    // which wraps around to the start
                    {x: 50, y: 500, distPct: 100}
                ]
            },
            "spa": {
                name: "Circuit de Spa-Francorchamps",
                variants: ["spa", "spa-francorchamps", "spa francorchamps"],
                length: 7004,
                points: [
                    {x: 800, y: 200, distPct: 0}, {x: 890, y: 260, distPct: 3}, {x: 830, y: 300, distPct: 5},
                    {x: 680, y: 240, distPct: 8}, {x: 590, y: 100, distPct: 11}, {x: 450, y: 30, distPct: 17},
                    {x: 280, y: 70, distPct: 23}, {x: 270, y: 150, distPct: 27}, {x: 220, y: 250, distPct: 33},
                    {x: 130, y: 400, distPct: 42}, {x: 90, y: 540, distPct: 52}, {x: 150, y: 670, distPct: 62},
                    {x: 350, y: 760, distPct: 71}, {x: 600, y: 670, distPct: 82}, {x: 780, y: 450, distPct: 91},
                    {x: 800, y: 260, distPct: 97}, {x: 800, y: 200, distPct: 100}
                ]
            },
            "monza": {
                name: "Autodromo Nazionale Monza",
                variants: ["monza", "autodromo monza"],
                length: 5793,
                points: [
                    {x: 900, y: 400, distPct: 0}, {x: 970, y: 350, distPct: 8}, {x: 900, y: 340, distPct: 12},
                    {x: 700, y: 450, distPct: 25}, {x: 500, y: 470, distPct: 35}, {x: 480, y: 400, distPct: 39},
                    {x: 440, y: 280, distPct: 48}, {x: 320, y: 270, distPct: 55}, {x: 150, y: 420, distPct: 66},
                    {x: 80, y: 580, distPct: 76}, {x: 280, y: 620, distPct: 83}, {x: 520, y: 580, distPct: 89},
                    {x: 750, y: 470, distPct: 95}, {x: 900, y: 400, distPct: 100}
                ]
            },
            "silverstone": {
                name: "Silverstone Circuit",
                variants: ["silverstone", "silverstone gp"],
                length: 5891,
                points: [
                    {x: 700, y: 300, distPct: 0}, {x: 880, y: 260, distPct: 8}, {x: 900, y: 150, distPct: 16},
                    {x: 760, y: 130, distPct: 24}, {x: 600, y: 140, distPct: 32}, {x: 440, y: 90, distPct: 40},
                    {x: 300, y: 180, distPct: 48}, {x: 200, y: 340, distPct: 56}, {x: 120, y: 500, distPct: 64},
                    {x: 240, y: 600, distPct: 72}, {x: 440, y: 540, distPct: 80}, {x: 580, y: 400, distPct: 88},
                    {x: 700, y: 300, distPct: 100}
                ]
            },
            "watkins": {
                name: "Watkins Glen International",
                variants: ["watkins", "watkins glen", "the glen"],
                length: 5430,
                points: [
                    {x: 800, y: 300, distPct: 0}, {x: 920, y: 220, distPct: 10}, {x: 820, y: 100, distPct: 20},
                    {x: 600, y: 100, distPct: 30}, {x: 400, y: 180, distPct: 40}, {x: 200, y: 200, distPct: 50},
                    {x: 180, y: 380, distPct: 60}, {x: 380, y: 500, distPct: 70}, {x: 620, y: 500, distPct: 80},
                    {x: 780, y: 370, distPct: 90}, {x: 800, y: 300, distPct: 100}
                ]
            },
            "roadamerica": {
                name: "Road America",
                variants: ["road america", "roadamerica", "elkhart"],
                length: 6515,
                points: [
                    {x: 700, y: 200, distPct: 0}, {x: 880, y: 140, distPct: 8}, {x: 900, y: 280, distPct: 16},
                    {x: 760, y: 400, distPct: 24}, {x: 580, y: 480, distPct: 32}, {x: 380, y: 540, distPct: 40},
                    {x: 200, y: 460, distPct: 48}, {x: 140, y: 300, distPct: 56}, {x: 220, y: 160, distPct: 64},
                    {x: 420, y: 100, distPct: 72}, {x: 600, y: 160, distPct: 80}, {x: 700, y: 200, distPct: 100}
                ]
            },
            "sebring": {
                name: "Sebring International Raceway",
                variants: ["sebring"],
                length: 6019,
                points: [
                    {x: 500, y: 100, distPct: 0}, {x: 700, y: 120, distPct: 10}, {x: 800, y: 280, distPct: 20},
                    {x: 720, y: 460, distPct: 30}, {x: 500, y: 560, distPct: 40}, {x: 280, y: 480, distPct: 50},
                    {x: 160, y: 300, distPct: 60}, {x: 240, y: 140, distPct: 70}, {x: 400, y: 90, distPct: 80},
                    {x: 500, y: 100, distPct: 100}
                ]
            },
            "daytona": {
                name: "Daytona International Speedway",
                variants: ["daytona", "daytona road"],
                length: 5729,
                points: [
                    {x: 200, y: 400, distPct: 0}, {x: 450, y: 400, distPct: 12}, {x: 750, y: 400, distPct: 26},
                    {x: 900, y: 320, distPct: 34}, {x: 800, y: 200, distPct: 42}, {x: 600, y: 200, distPct: 50},
                    {x: 480, y: 320, distPct: 58}, {x: 300, y: 280, distPct: 66}, {x: 120, y: 350, distPct: 78},
                    {x: 150, y: 420, distPct: 93}, {x: 200, y: 400, distPct: 100}
                ]
            },
            "imola": {
                name: "Autodromo Enzo e Dino Ferrari",
                variants: ["imola", "enzo e dino"],
                length: 4909,
                points: [
                    {x: 500, y: 600, distPct: 0}, {x: 700, y: 540, distPct: 10}, {x: 820, y: 400, distPct: 20},
                    {x: 720, y: 260, distPct: 30}, {x: 520, y: 200, distPct: 40}, {x: 320, y: 200, distPct: 50},
                    {x: 200, y: 340, distPct: 60}, {x: 200, y: 500, distPct: 70}, {x: 340, y: 590, distPct: 80},
                    {x: 500, y: 600, distPct: 100}
                ]
            },
            "nurburgring": {
                name: "Nürburgring Grand Prix",
                variants: ["nurburgring", "nürburgring", "nuerburgring"],
                length: 5148,
                points: [
                    {x: 800, y: 500, distPct: 0}, {x: 950, y: 420, distPct: 10}, {x: 850, y: 300, distPct: 20},
                    {x: 660, y: 290, distPct: 30}, {x: 500, y: 200, distPct: 40}, {x: 300, y: 200, distPct: 50},
                    {x: 180, y: 340, distPct: 60}, {x: 280, y: 480, distPct: 70}, {x: 500, y: 540, distPct: 80},
                    {x: 700, y: 510, distPct: 90}, {x: 800, y: 500, distPct: 100}
                ]
            }
        };
        
        // Function to find matching track map
        var findTrackMap = function(trackName) {
            if (!trackName) return null;
            var searchName = trackName.toLowerCase().replace(/[\\\/]/g, ' ').trim();
            for (var key in TRACK_MAPS) {
                if (searchName.indexOf(key) !== -1) return TRACK_MAPS[key];
                var variants = TRACK_MAPS[key].variants;
                for (var i = 0; i < variants.length; i++) {
                    if (searchName.indexOf(variants[i]) !== -1 || variants[i].indexOf(searchName) !== -1) {
                        return TRACK_MAPS[key];
                    }
                }
            }
            return null;
        };
        
        // Function to interpolate position on pre-built track
        var getPositionOnTrack = function(track, distPct) {
            if (!track || !track.points || track.points.length < 2) return null;
            distPct = distPct % 100;
            if (distPct < 0) distPct += 100;
            
            var p1 = track.points[0], p2 = track.points[1];
            for (var i = 0; i < track.points.length - 1; i++) {
                if (track.points[i].distPct <= distPct && track.points[i + 1].distPct >= distPct) {
                    p1 = track.points[i];
                    p2 = track.points[i + 1];
                    break;
                }
            }
            var range = p2.distPct - p1.distPct;
            var t = range > 0 ? (distPct - p1.distPct) / range : 0;
            return { x: p1.x + (p2.x - p1.x) * t, y: p1.y + (p2.y - p1.y) * t };
        };
        
        var getValue = function(row, names, def) {
            for (var i = 0; i < names.length; i++) {
                if (row[names[i]] !== undefined && row[names[i]] !== null && row[names[i]] !== '') {
                    var val = parseFloat(row[names[i]]);
                    if (!isNaN(val)) return val;
                }
            }
            return def;
        };
        var speedNames = ['Ground Speed', 'Speed', 'Drive Speed', 'Speed_mph', 'Ground Speed_ms', 'Speed_ms'];
        var steerNames = ['Steered Angle', 'Steering Angle', 'Steer'];
        var gLatNames = ['G Force Lat', 'Lateral G'];
        var yawNames = ['Gyro Yaw Velocity', 'Yaw Rate'];
        var latNames = ['GPS Latitude', 'Latitude', 'Lat'];
        var lonNames = ['GPS Longitude', 'Longitude', 'Lon'];
        var distNames = ['Corrected Distance', 'Corrected Distance[m]', 'Distance', 'Dist', 'Lap Distance', 'LapDist'];
        var distPctNames = ['LapDistPct', 'Lap Distance Pct', 'DistPct'];
        var headingNames = ['Heading', 'Heading[°]', 'Car Heading', 'Yaw', 'Yaw[°]', 'YawNorth[°]', 'YawNorth', 'YawRate[°/s]'];
        var iRacingPosXNames = ['CarPosX', 'PosX', 'Car Pos X'];
        var iRacingPosZNames = ['CarPosZ', 'PosZ', 'Car Pos Z'];
        var sampleRate = Math.max(1, Math.floor(this.referenceData.length / 500));
        
        var sampleRow = this.referenceData[0];
        var hasGPS = getValue(sampleRow, latNames, null) !== null && getValue(sampleRow, lonNames, null) !== null;
        var hasIRacingPos = getValue(sampleRow, iRacingPosXNames, null) !== null && getValue(sampleRow, iRacingPosZNames, null) !== null;
        var hasHeading = getValue(sampleRow, headingNames, null) !== null;
        var hasDistance = getValue(sampleRow, distNames, null) !== null;
        var hasDistPct = getValue(sampleRow, distPctNames, null) !== null;
        
        // Debug: which heading channel was found?
        var foundHeadingChannel = null;
        for (var h = 0; h < headingNames.length; h++) {
            if (sampleRow[headingNames[h]] !== undefined) {
                foundHeadingChannel = headingNames[h];
                break;
            }
        }
        console.log('Heading channel search:', foundHeadingChannel || 'none found', '| Sample keys:', Object.keys(sampleRow).filter(function(k) { return k.toLowerCase().indexOf('yaw') !== -1 || k.toLowerCase().indexOf('heading') !== -1; }));
        
        // Check for pre-built track map
        var trackName = document.getElementById('track-name').value || this.selectedTrack?.name || '';
        var prebuiltTrack = findTrackMap(trackName);
        
        // Check if steering data is actually valid (not all zeros)
        var steeringSampleCount = 0;
        var steeringNonZero = 0;
        for (var i = 0; i < Math.min(100, this.referenceData.length); i++) {
            var steer = getValue(this.referenceData[i], steerNames, 0);
            steeringSampleCount++;
            if (Math.abs(steer) > 0.1) steeringNonZero++;
        }
        var hasValidSteering = steeringNonZero > steeringSampleCount * 0.1; // At least 10% non-zero
        
        var positionSource = 'reconstructed';
        
        // Priority: 1. GPS, 2. iRacing coords, 3. Heading+Dist (best for iRacing via Pi Toolbox), 4. Pre-built map, 5. Reconstructed
        if (hasGPS) {
            positionSource = 'GPS';
        } else if (hasIRacingPos) {
            positionSource = 'iRacing';
        } else if (hasHeading && hasDistance) {
            positionSource = 'heading'; // Best for Pi Toolbox iRacing - uses actual telemetry
        } else if (prebuiltTrack && hasDistance) {
            positionSource = 'prebuilt'; // Fallback when no heading available
        }
        
        console.log('Track map source:', positionSource, '| prebuiltTrack:', prebuiltTrack?.name || 'none', '| hasHeading:', hasHeading, '| hasDistance:', hasDistance, '| hasValidSteering:', hasValidSteering);
        if (hasHeading) {
            var sampleHeading = getValue(sampleRow, headingNames, 0);
            console.log('Sample heading value:', sampleHeading, '(should be 0-360 for degrees)');
        }
        
        var buildTrack = function(data, source) {
            var positions = [];
            
            // Pre-built track map - use distance to plot on known track shape
            if (source === 'prebuilt' && prebuiltTrack) {
                var trackLength = prebuiltTrack.length || 5000;
                for (var i = 0; i < data.length; i += sampleRate) {
                    var row = data[i];
                    var dist = getValue(row, distNames, 0);
                    var speed = getValue(row, speedNames, 100);
                    var distPct = (dist / trackLength) * 100;
                    
                    var pos = getPositionOnTrack(prebuiltTrack, distPct);
                    if (pos) {
                        positions.push({ x: pos.x, y: pos.y, speed: speed, heading: 0, distance: dist });
                    }
                }
                return positions;
            }
            
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
            } else if (source === 'heading') {
                // Pi Toolbox iRacing export: use Heading + Distance to reconstruct track
                var x = 0, y = 0;
                var lastDist = 0;
                for (var i = 0; i < data.length; i += sampleRate) {
                    var row = data[i];
                    var headingDeg = getValue(row, headingNames, 0);
                    var headingRad = headingDeg * (Math.PI / 180);
                    var dist = getValue(row, distNames, 0);
                    var speed = getValue(row, speedNames, 100);
                    
                    // Calculate position change based on distance delta and heading
                    var deltaDist = dist - lastDist;
                    if (deltaDist > 0 && deltaDist < 100) { // Sanity check
                        x += deltaDist * Math.cos(headingRad);
                        y += deltaDist * Math.sin(headingRad);
                    }
                    lastDist = dist;
                    
                    positions.push({ x: x, y: y, speed: speed, heading: headingRad, distance: dist });
                }
                return positions;
            } else {
                // Fallback: reconstruct from steering/G-force/yaw
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
            // Calculate heading from position deltas for GPS/iRacing sources
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
            document.getElementById('track-map').innerHTML = '<p class="text-[#6e7681] text-center py-20">Insufficient data</p>'; 
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
        
        // Apply rotation transformation
        var rotationRad = (self.trackRotation || 0) * Math.PI / 180;
        var rotatePoint = function(x, y) {
            var cos = Math.cos(rotationRad);
            var sin = Math.sin(rotationRad);
            return {
                x: x * cos - y * sin,
                y: x * sin + y * cos
            };
        };
        
        if (rotationRad !== 0) {
            refNorm = refNorm.map(function(p) {
                var rotated = rotatePoint(p.x, p.y);
                return { x: rotated.x, y: rotated.y, speed: p.speed, heading: p.heading + rotationRad, distance: p.distance };
            });
            currNorm = currNorm.map(function(p) {
                var rotated = rotatePoint(p.x, p.y);
                return { x: rotated.x, y: rotated.y, speed: p.speed, heading: p.heading + rotationRad, distance: p.distance };
            });
        }
        
        var allTraces = [];
        var trackName = this.selectedTrack ? this.selectedTrack.name : 'Track';
        var sourceLabel = positionSource === 'prebuilt' ? ' (' + (prebuiltTrack?.name || 'Track Map') + ')' : positionSource === 'GPS' ? ' (GPS)' : positionSource === 'iRacing' ? ' (iRacing)' : positionSource === 'heading' ? ' (Heading)' : '';
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
        allTraces.push({ x: refNorm.map(function(p) { return p.x; }), y: refNorm.map(function(p) { return p.y; }), mode: 'lines', name: 'Reference', line: { color: '#00d4aa', width: 4 }, hoverinfo: 'skip' });
        
        // Your lap - solid magenta line (no speed coloring)
        allTraces.push({ 
            x: currNorm.map(function(p) { return p.x; }), 
            y: currNorm.map(function(p) { return p.y; }), 
            mode: 'lines', 
            name: 'Comparison', 
            line: { color: '#ff6b9d', width: 3 }, 
            hoverinfo: 'skip' 
        });
        
        // Add segment markers (Turns and Straights) from LOCAL DETECTION
        var annotations = [];
        var segmentMarkers = { x: [], y: [], text: [], colors: [] };
        
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
        
        // Use locally detected corners (more reliable than AI)
        var corners = this.getCorners();
        if (corners && corners.length > 0) {
            console.log('Track map: placing', corners.length, 'corner markers');
            
            corners.forEach(function(corner, idx) {
                var dist = corner.distance || 0;
                var label = corner.name || ('T' + (idx + 1));
                var hasIssues = corner.issues && corner.issues.length > 0;
                var pos = findPositionAtDistance(dist);
                
                // Color based on severity
                var bgColor = '#22c55e'; // green default
                if (hasIssues) {
                    bgColor = '#ef4444'; // red for issues
                } else if (corner.severity === 'heavy') {
                    bgColor = '#f59e0b'; // orange for heavy braking
                } else if (corner.severity === 'medium') {
                    bgColor = '#eab308'; // yellow for medium
                }
                
                segmentMarkers.x.push(pos.x);
                segmentMarkers.y.push(pos.y);
                segmentMarkers.text.push(label);
                segmentMarkers.colors.push(bgColor);
                
                annotations.push({
                    x: pos.x,
                    y: pos.y,
                    text: label,
                    showarrow: false,
                    font: { color: '#ffffff', size: 10, family: 'Arial Black' },
                    bgcolor: bgColor,
                    bordercolor: '#ffffff',
                    borderwidth: 1,
                    borderpad: 3,
                    opacity: 0.9
                });
            });
        }
        
        // NOTE: Straights are NOT shown on track map - they're just the spaces between corners
        // The AI analysis results show straights in the analysis panel, but not on the map
        
        var layout = { 
            showlegend: true, legend: { x: 0, y: 1, bgcolor: 'rgba(0,0,0,0.7)', font: { color: '#fff', size: 11 } }, 
            xaxis: { visible: false, scaleanchor: 'y' }, yaxis: { visible: false }, 
            margin: { t: 5, b: 5, l: 5, r: 5 }, paper_bgcolor: '#1f2937', plot_bgcolor: '#1f2937', autosize: true,
            annotations: annotations
        };
        Plotly.newPlot('track-map', allTraces, layout, { responsive: true, displayModeBar: false });
    }
    
    getOverlayChannels() {
        var refColor = '#00d4aa', yourColor = '#ff6b9d';  // Cyan for reference, Magenta for comparison
        return {
            speed: { names: ['Ground Speed', 'Speed', 'Drive Speed', 'Speed_mph', 'Speed_ms', 'Ground Speed_ms'], label: 'Speed', unit: 'km/h', color: { ref: refColor, curr: yourColor } },
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
        var distNames = ['Corrected Distance', 'Corrected Distance[m]', 'Distance', 'Dist', 'Lap Distance', 'LapDist'];
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
        
        // Check if we have direct G-force data, otherwise try to derive it
        var hasDirectGLat = refData.some(function(row) { return self.getValue(row, channels.gLat.names, null) !== null; });
        var hasDirectGLong = refData.some(function(row) { return self.getValue(row, channels.gLong.names, null) !== null; });
        
        if (hasDirectGLat) {
            this.generateSingleOverlay('glat-overlay', refData, currData, refDist, currDist, channels.gLat);
        } else {
            // Try to derive lateral G from yaw rate and speed
            var yawNames = ['Yaw[°]', 'Yaw', 'Heading', 'Heading[°]', 'Car Heading', 'YawNorth[°]'];
            var hasYaw = refData.some(function(row) { return self.getValue(row, yawNames, null) !== null; });
            
            if (hasYaw) {
                console.log('Deriving Lateral G from Yaw/Heading data');
                var derivedGLatChannel = { names: ['_derivedGLat'], label: 'Lateral G (from Yaw)', unit: 'G', color: channels.gLat.color };
                
                // Calculate derived lateral G: gLat = v * (dYaw/dt) / 9.81
                // Or equivalently: gLat = v² * curvature / 9.81 where curvature = dYaw/ds
                var timeNames = ['Time', 'Time[s]', 'Lap Time', 'Session Time'];
                
                [refData, currData].forEach(function(dataSet) {
                    for (var i = 1; i < dataSet.length - 1; i++) {
                        var prev = dataSet[i - 1];
                        var curr = dataSet[i];
                        var next = dataSet[i + 1];
                        
                        var yawPrev = self.getValue(prev, yawNames, null);
                        var yawNext = self.getValue(next, yawNames, null);
                        var speed = self.getValue(curr, channels.speed.names, null);
                        var distPrev = self.getValue(prev, distNames, null);
                        var distNext = self.getValue(next, distNames, null);
                        
                        if (yawPrev !== null && yawNext !== null && speed !== null && distPrev !== null && distNext !== null) {
                            var dYaw = yawNext - yawPrev;
                            // Handle angle wraparound
                            if (dYaw > 180) dYaw -= 360;
                            if (dYaw < -180) dYaw += 360;
                            
                            var dDist = distNext - distPrev;
                            if (dDist > 0.1) {
                                // Convert speed to m/s if needed (check if km/h or m/s)
                                var speedMs = speed < 100 ? speed : speed / 3.6;
                                // Curvature = dYaw(radians) / dDistance
                                var curvature = (dYaw * Math.PI / 180) / dDist;
                                // Lateral G = v² × curvature / g
                                var gLat = (speedMs * speedMs * curvature) / 9.81;
                                curr['_derivedGLat'] = gLat;
                            }
                        }
                    }
                    // Fill first and last points
                    if (dataSet.length > 2) {
                        dataSet[0]['_derivedGLat'] = dataSet[1]['_derivedGLat'] || 0;
                        dataSet[dataSet.length - 1]['_derivedGLat'] = dataSet[dataSet.length - 2]['_derivedGLat'] || 0;
                    }
                });
                
                this.generateSingleOverlay('glat-overlay', refData, currData, refDist, currDist, derivedGLatChannel);
            } else {
                this.generateSingleOverlay('glat-overlay', refData, currData, refDist, currDist, channels.gLat);
            }
        }
        
        if (hasDirectGLong) {
            this.generateSingleOverlay('glong-overlay', refData, currData, refDist, currDist, channels.gLong);
        } else {
            // Derive longitudinal G from speed change
            var hasSpeed = refData.some(function(row) { return self.getValue(row, channels.speed.names, null) !== null; });
            
            if (hasSpeed) {
                console.log('Deriving Longitudinal G from Speed data');
                var derivedGLongChannel = { names: ['_derivedGLong'], label: 'Long G (from Speed)', unit: 'G', color: channels.gLong.color };
                
                // Calculate derived long G: gLong = dv/dt / 9.81
                // Using distance: gLong = v * (dv/ds) / 9.81
                [refData, currData].forEach(function(dataSet) {
                    for (var i = 1; i < dataSet.length - 1; i++) {
                        var prev = dataSet[i - 1];
                        var curr = dataSet[i];
                        var next = dataSet[i + 1];
                        
                        var speedPrev = self.getValue(prev, channels.speed.names, null);
                        var speedCurr = self.getValue(curr, channels.speed.names, null);
                        var speedNext = self.getValue(next, channels.speed.names, null);
                        var distPrev = self.getValue(prev, distNames, null);
                        var distNext = self.getValue(next, distNames, null);
                        
                        if (speedPrev !== null && speedNext !== null && distPrev !== null && distNext !== null) {
                            // Convert speeds to m/s if needed
                            var speedPrevMs = speedPrev < 100 ? speedPrev : speedPrev / 3.6;
                            var speedCurrMs = speedCurr < 100 ? speedCurr : speedCurr / 3.6;
                            var speedNextMs = speedNext < 100 ? speedNext : speedNext / 3.6;
                            
                            var dSpeed = speedNextMs - speedPrevMs;
                            var dDist = distNext - distPrev;
                            
                            if (dDist > 0.1 && speedCurrMs > 1) {
                                // gLong = v * (dv/ds) / g
                                var gLong = (speedCurrMs * dSpeed / dDist) / 9.81;
                                curr['_derivedGLong'] = gLong;
                            }
                        }
                    }
                    // Fill first and last points
                    if (dataSet.length > 2) {
                        dataSet[0]['_derivedGLong'] = dataSet[1]['_derivedGLong'] || 0;
                        dataSet[dataSet.length - 1]['_derivedGLong'] = dataSet[dataSet.length - 2]['_derivedGLong'] || 0;
                    }
                });
                
                this.generateSingleOverlay('glong-overlay', refData, currData, refDist, currDist, derivedGLongChannel);
            } else {
                this.generateSingleOverlay('glong-overlay', refData, currData, refDist, currDist, channels.gLong);
            }
        }
        
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
        if (refX.length === 0 && currX.length === 0) { container.innerHTML = '<p class="text-[#6e7681] text-center py-16 text-sm">No ' + channelConfig.label + ' data</p>'; return; }
        var traces = [];
        if (refX.length > 0) traces.push({ x: refX, y: refY, mode: 'lines', name: 'Reference', line: { color: channelConfig.color.ref, width: 1.5 }, hovertemplate: 'Ref: %{y:.2f} ' + channelConfig.unit + '<extra></extra>' });
        if (currX.length > 0) traces.push({ x: currX, y: currY, mode: 'lines', name: 'Your Lap', line: { color: channelConfig.color.curr, width: 2 }, hovertemplate: 'You: %{y:.2f} ' + channelConfig.unit + '<extra></extra>' });
        
        // Add turn markers as vertical lines and annotations
        var shapes = [];
        var annotations = [];
        
        // Use locally detected corners (more reliable than AI truncated results)
        var corners = this.getCorners();
        if (corners && corners.length > 0) {
            var allY = refY.concat(currY);
            var yMin = Math.min.apply(null, allY);
            var yMax = Math.max.apply(null, allY);
            
            corners.forEach(function(corner, idx) {
                var dist = corner.distance || 0;
                var hasIssues = corner.issues && corner.issues.length > 0;
                var severityColor = corner.severity === 'heavy' ? 'rgba(239, 68, 68, 0.5)' : 
                                   corner.severity === 'kink' ? 'rgba(251, 191, 36, 0.4)' : 
                                   'rgba(34, 197, 94, 0.4)';
                var color = hasIssues ? 'rgba(239, 68, 68, 0.6)' : severityColor;
                
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
                    text: corner.name || ('T' + (idx + 1)),
                    showarrow: false,
                    font: { color: hasIssues ? '#ef4444' : '#22c55e', size: 9, family: 'Arial' },
                    yshift: 10
                });
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
        var distNames = ['Corrected Distance', 'Corrected Distance[m]', 'Distance', 'Dist', 'Lap Distance', 'LapDist'];
        var sampleRate = Math.max(1, Math.floor(this.referenceData.length / 500));
        var refData = this.referenceData.filter(function(_, i) { return i % sampleRate === 0; });
        var currData = this.currentData.filter(function(_, i) { return i % sampleRate === 0; });
        var chartId = 'custom-overlay-' + this.customOverlays.length;
        var chartDiv = document.createElement('div');
        chartDiv.className = 'relative';
        var colName = channelValue.replace('custom:', '');
        chartDiv.innerHTML = '<button class="absolute top-0 right-0 z-10 bg-red-900/200 text-white rounded-full w-6 h-6 text-xs hover:bg-red-600" onclick="this.parentElement.remove();">&times;</button><h4 class="font-semibold mb-2 text-sm pr-8">' + colName + '</h4><div id="' + chartId + '" class="bg-[#21262d] rounded border" style="height: 280px; width: 100%;"></div>';
        container.appendChild(chartDiv);
        var refX = [], refY = [], currX = [], currY = [];
        refData.forEach(function(row) { var dist = self.getValue(row, distNames, null); var val = self.getValue(row, [colName], null); if (dist !== null && val !== null) { refX.push(dist); refY.push(val); } });
        currData.forEach(function(row) { var dist = self.getValue(row, distNames, null); var val = self.getValue(row, [colName], null); if (dist !== null && val !== null) { currX.push(dist); currY.push(val); } });
        var traces = [];
        if (refX.length > 0) traces.push({ x: refX, y: refY, mode: 'lines', name: 'Reference', line: { color: '#00d4aa', width: 1.5 } });
        if (currX.length > 0) traces.push({ x: currX, y: currY, mode: 'lines', name: 'Comparison', line: { color: '#ff6b9d', width: 2 } });
        var layout = { xaxis: { title: 'Distance (m)', tickfont: { size: 10 } }, yaxis: { tickfont: { size: 10 } }, margin: { t: 10, b: 40, l: 50, r: 10 }, legend: { orientation: 'h', y: 1.05, x: 0.5, xanchor: 'center', font: { size: 10 } }, hovermode: 'x unified', autosize: true };
        Plotly.newPlot(chartId, traces, layout, { responsive: true, displayModeBar: false });
    }
    
    generateSectorTimeChart(analysis) {
        var container = document.getElementById('sector-time-chart');
        if (!container) return;
        if (!analysis.sectors || analysis.sectors.length === 0) { container.innerHTML = '<p class="text-[#8b949e] text-center py-10">No sector data</p>'; return; }
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
        if (!analysis.avgSpeedCurr) { container.innerHTML = '<p class="text-[#8b949e] text-center py-10">No speed data</p>'; return; }
        var yourTrace = { x: ['Average', 'Top', 'Min Corner'], y: [analysis.avgSpeedCurr || 0, analysis.maxSpeedCurr || 0, analysis.minSpeedCurr || 0], type: 'bar', name: 'Comparison', marker: { color: '#ff6b9d' } };
        var refTrace = { x: ['Average', 'Top', 'Min Corner'], y: [analysis.avgSpeedRef || 0, analysis.maxSpeedRef || 0, analysis.minSpeedRef || 0], type: 'bar', name: 'Reference', marker: { color: '#00d4aa' } };
        var layout = { barmode: 'group', yaxis: { title: 'Speed (km/h)' }, margin: { t: 30, b: 40, l: 50, r: 20 }, legend: { orientation: 'h', y: -0.15 } };
        Plotly.newPlot('speed-comparison', [yourTrace, refTrace], layout, { responsive: true });
    }
    
    displaySetupRecommendations(analysis) {
        var container = document.getElementById('setup-recommendations');
        if (!container) return;
        
        // Use rule-based tire analysis
        var tireAnalysis = this.calculateTireAnalysis();
        var brakeAnalysis = analysis.brakeAnalysis || {};
        var fuelAnalysis = analysis.fuelAnalysis || {};
        var suspensionAnalysis = this.calculateSuspensionAnalysis();
        
        // Render the full setup section
        container.innerHTML = this.renderSetupSection(tireAnalysis, brakeAnalysis, fuelAnalysis, suspensionAnalysis);
        
        // Render tire temperature comparison graphs
        this.renderTireTempGraphs();
        
        // Render suspension graphs
        this.renderSuspensionGraphs(suspensionAnalysis);
    }
    
    renderTireTempGraphs() {
        var self = this;
        if (!this.referenceData || !this.currentData) return;
        
        // Find tire temp and distance channels
        var sampleRow = this.referenceData[0];
        var availableKeys = Object.keys(sampleRow);
        
        console.log('Tire temp graphs - available keys with temp:', availableKeys.filter(function(k) {
            return k.toLowerCase().indexOf('temp') !== -1;
        }));
        
        // Channel patterns for tire temps
        // Prefer surface temps (LFtempM) over carcass temps (LFtempCM) as they vary more during a lap
        // Surface temps respond faster to track conditions and driving
        var tempPatterns = {
            lf: ['LFtempM[°C]', 'LFtempM', 'LFtempCM[°C]', 'LFtempCM', 'AverageLFtyretemp[°C]', 'AverageLFtyretemp'],
            rf: ['RFtempM[°C]', 'RFtempM', 'RFtempCM[°C]', 'RFtempCM', 'AverageRFtyretemp[°C]', 'AverageRFtyretemp'],
            lr: ['LRtempM[°C]', 'LRtempM', 'LRtempCM[°C]', 'LRtempCM', 'AverageLRtyretemp[°C]', 'AverageLRtyretemp'],
            rr: ['RRtempM[°C]', 'RRtempM', 'RRtempCM[°C]', 'RRtempCM', 'AverageRRtyretemp[°C]', 'AverageRRtyretemp']
        };
        
        var distPatterns = ['Corrected Distance', 'Distance', 'Lap Distance', 'LapDist[m]'];
        
        function findChannel(patterns) {
            for (var i = 0; i < patterns.length; i++) {
                if (availableKeys.indexOf(patterns[i]) !== -1) {
                    return patterns[i];
                }
            }
            return null;
        }
        
        var distChannel = findChannel(distPatterns);
        var lfChannel = findChannel(tempPatterns.lf);
        var rfChannel = findChannel(tempPatterns.rf);
        var lrChannel = findChannel(tempPatterns.lr);
        var rrChannel = findChannel(tempPatterns.rr);
        
        console.log('Tire temp graphs using:', { dist: distChannel, lf: lfChannel, rf: rfChannel, lr: lrChannel, rr: rrChannel });
        
        if (!distChannel || (!lfChannel && !rfChannel && !lrChannel && !rrChannel)) {
            console.log('Tire temp graphs: Missing channels');
            return;
        }
        
        // Sample data - use every 10th point for smoother graphs
        var sampleRate = 10;
        
        function extractTempData(data, distCh, tempCh) {
            if (!tempCh) return { dist: [], temp: [] };
            var dist = [], temp = [];
            for (var i = 0; i < data.length; i += sampleRate) {
                var row = data[i];
                var d = parseFloat(row[distCh]);
                var t = parseFloat(row[tempCh]);
                if (!isNaN(d) && !isNaN(t) && t > 0 && t < 200) {
                    dist.push(d);
                    temp.push(t);
                }
            }
            return { dist: dist, temp: temp };
        }
        
        // Extract data for both laps
        var refLF = extractTempData(this.referenceData, distChannel, lfChannel);
        var refRF = extractTempData(this.referenceData, distChannel, rfChannel);
        var refLR = extractTempData(this.referenceData, distChannel, lrChannel);
        var refRR = extractTempData(this.referenceData, distChannel, rrChannel);
        
        var compLF = extractTempData(this.currentData, distChannel, lfChannel);
        var compRF = extractTempData(this.currentData, distChannel, rfChannel);
        var compLR = extractTempData(this.currentData, distChannel, lrChannel);
        var compRR = extractTempData(this.currentData, distChannel, rrChannel);
        
        // Get corners for annotations
        var corners = this.detectedCorners || [];
        
        // Find y-axis range for corner markers
        var allTemps = [].concat(refLF.temp, refRF.temp, compLF.temp, compRF.temp);
        var minTemp = allTemps.length > 0 ? Math.min.apply(null, allTemps) : 40;
        var maxTemp = allTemps.length > 0 ? Math.max.apply(null, allTemps) : 100;
        
        var allTempsRear = [].concat(refLR.temp, refRR.temp, compLR.temp, compRR.temp);
        var minTempRear = allTempsRear.length > 0 ? Math.min.apply(null, allTempsRear) : 40;
        var maxTempRear = allTempsRear.length > 0 ? Math.max.apply(null, allTempsRear) : 100;
        
        // Create corner annotation shapes and labels
        function createCornerAnnotations(minY, maxY) {
            var shapes = [];
            var annotations = [];
            
            corners.forEach(function(corner, idx) {
                // Vertical line at corner
                shapes.push({
                    type: 'line',
                    x0: corner.distance,
                    x1: corner.distance,
                    y0: minY,
                    y1: maxY,
                    line: { color: '#6e7681', width: 1, dash: 'dot' }
                });
                
                // Corner label at top
                annotations.push({
                    x: corner.distance,
                    y: maxY,
                    text: 'T' + (idx + 1),
                    showarrow: false,
                    font: { size: 9, color: '#8b949e' },
                    yshift: 10
                });
            });
            
            return { shapes: shapes, annotations: annotations };
        }
        
        var frontCorners = createCornerAnnotations(minTemp - 5, maxTemp + 5);
        var rearCorners = createCornerAnnotations(minTempRear - 5, maxTempRear + 5);
        
        // Dark theme layout - minimal margins for full width
        var layoutBase = {
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: '#161b22',
            font: { color: '#8b949e', size: 10 },
            margin: { t: 50, b: 40, l: 50, r: 15 },
            xaxis: { 
                title: { text: 'Distance (m)', font: { size: 10 } },
                gridcolor: '#30363d',
                zerolinecolor: '#30363d',
                tickfont: { size: 9 }
            },
            yaxis: { 
                title: { text: 'Temp (°C)', font: { size: 10 } },
                gridcolor: '#30363d',
                zerolinecolor: '#30363d',
                tickfont: { size: 9 }
            },
            legend: { 
                orientation: 'h', 
                y: 1.0,
                x: 0.5,
                xanchor: 'center',
                yanchor: 'bottom',
                font: { size: 9 },
                bgcolor: 'rgba(0,0,0,0)'
            },
            showlegend: true,
            autosize: true
        };
        
        // Front tires graph
        var frontContainer = document.getElementById('tire-temp-graph-front');
        if (frontContainer && (refLF.dist.length > 0 || refRF.dist.length > 0)) {
            var frontTraces = [];
            
            if (refLF.dist.length > 0) {
                frontTraces.push({
                    x: refLF.dist, y: refLF.temp,
                    type: 'scatter', mode: 'lines',
                    name: 'LF Ref',
                    line: { color: '#00d4aa', width: 1.5 }
                });
            }
            if (compLF.dist.length > 0) {
                frontTraces.push({
                    x: compLF.dist, y: compLF.temp,
                    type: 'scatter', mode: 'lines',
                    name: 'LF You',
                    line: { color: '#ff6b9d', width: 1.5 }
                });
            }
            if (refRF.dist.length > 0) {
                frontTraces.push({
                    x: refRF.dist, y: refRF.temp,
                    type: 'scatter', mode: 'lines',
                    name: 'RF Ref',
                    line: { color: '#00d4aa', width: 1.5, dash: 'dot' }
                });
            }
            if (compRF.dist.length > 0) {
                frontTraces.push({
                    x: compRF.dist, y: compRF.temp,
                    type: 'scatter', mode: 'lines',
                    name: 'RF You',
                    line: { color: '#ff6b9d', width: 1.5, dash: 'dot' }
                });
            }
            
            var frontLayout = Object.assign({}, layoutBase, { 
                title: { text: 'Front Tires', font: { size: 13, color: '#f0f6fc' }, y: 0.98 },
                shapes: frontCorners.shapes,
                annotations: frontCorners.annotations,
                yaxis: Object.assign({}, layoutBase.yaxis, { range: [minTemp - 5, maxTemp + 10] })
            });
            Plotly.newPlot('tire-temp-graph-front', frontTraces, frontLayout, { responsive: true, displayModeBar: false });
        }
        
        // Rear tires graph
        var rearContainer = document.getElementById('tire-temp-graph-rear');
        if (rearContainer && (refLR.dist.length > 0 || refRR.dist.length > 0)) {
            var rearTraces = [];
            
            if (refLR.dist.length > 0) {
                rearTraces.push({
                    x: refLR.dist, y: refLR.temp,
                    type: 'scatter', mode: 'lines',
                    name: 'LR Ref',
                    line: { color: '#00d4aa', width: 1.5 }
                });
            }
            if (compLR.dist.length > 0) {
                rearTraces.push({
                    x: compLR.dist, y: compLR.temp,
                    type: 'scatter', mode: 'lines',
                    name: 'LR You',
                    line: { color: '#ff6b9d', width: 1.5 }
                });
            }
            if (refRR.dist.length > 0) {
                rearTraces.push({
                    x: refRR.dist, y: refRR.temp,
                    type: 'scatter', mode: 'lines',
                    name: 'RR Ref',
                    line: { color: '#00d4aa', width: 1.5, dash: 'dot' }
                });
            }
            if (compRR.dist.length > 0) {
                rearTraces.push({
                    x: compRR.dist, y: compRR.temp,
                    type: 'scatter', mode: 'lines',
                    name: 'RR You',
                    line: { color: '#ff6b9d', width: 1.5, dash: 'dot' }
                });
            }
            
            var rearLayout = Object.assign({}, layoutBase, { 
                title: { text: 'Rear Tires', font: { size: 13, color: '#f0f6fc' }, y: 0.98 },
                shapes: rearCorners.shapes,
                annotations: rearCorners.annotations,
                yaxis: Object.assign({}, layoutBase.yaxis, { range: [minTempRear - 5, maxTempRear + 10] })
            });
            Plotly.newPlot('tire-temp-graph-rear', rearTraces, rearLayout, { responsive: true, displayModeBar: false });
        }
    }
    
    renderSuspensionGraphs(suspAnalysis) {
        var self = this;
        if (!suspAnalysis || !suspAnalysis.available) return;
        if (!this.referenceData || this.referenceData.length < 100) return;
        
        var data = this.referenceData;
        var sampleRow = data[0];
        var availableKeys = Object.keys(sampleRow);
        
        // Find distance channel
        var distNames = ['Corrected Distance', 'Corrected Distance[m]', 'Lap Distance', 'Lap Distance[m]', 'Distance', 'distance'];
        var distChannel = null;
        for (var i = 0; i < distNames.length; i++) {
            if (availableKeys.indexOf(distNames[i]) !== -1) { distChannel = distNames[i]; break; }
        }
        if (!distChannel) {
            distChannel = availableKeys.find(function(k) { return k.toLowerCase().indexOf('distance') !== -1; });
        }
        
        var cMap = suspAnalysis.channelMap;
        
        // ========== RIDE HEIGHT GRAPH ==========
        if (suspAnalysis.hasRideHeight && document.getElementById('ride-height-graph')) {
            var rhTraces = [];
            var colors = { lf: '#00d4aa', rf: '#3b82f6', lr: '#f97316', rr: '#ef4444' };
            var names = { lf: 'LF', rf: 'RF', lr: 'LR', rr: 'RR' };
            var dashes = { lf: 'solid', rf: 'dash', lr: 'solid', rr: 'dash' };
            
            // Sample data for performance
            var sampleRate = Math.max(1, Math.floor(data.length / 2000));
            
            ['lf', 'rf', 'lr', 'rr'].forEach(function(corner) {
                var ch = cMap.rideHeight[corner];
                if (!ch) return;
                
                var xArr = [], yArr = [];
                for (var i = 0; i < data.length; i += sampleRate) {
                    var row = data[i];
                    var dist = distChannel ? parseFloat(row[distChannel]) : i;
                    var val = parseFloat(row[ch]);
                    if (isNaN(dist) || isNaN(val)) continue;
                    // Convert m to mm if needed
                    if (Math.abs(val) < 1) val *= 1000;
                    xArr.push(dist);
                    yArr.push(val);
                }
                
                rhTraces.push({
                    x: xArr, y: yArr,
                    type: 'scatter', mode: 'lines',
                    name: names[corner],
                    line: { color: colors[corner], width: 1.5, dash: dashes[corner] }
                });
            });
            
            // Corner markers
            var corners = self.getCorners();
            var shapes = [], annotations = [];
            if (corners && corners.length > 0) {
                corners.forEach(function(c) {
                    shapes.push({
                        type: 'line', x0: c.distance, x1: c.distance,
                        y0: 0, y1: 1, yref: 'paper',
                        line: { color: '#444', width: 1, dash: 'dot' }
                    });
                    annotations.push({
                        x: c.distance, y: 1.02, yref: 'paper',
                        text: c.name, showarrow: false,
                        font: { size: 9, color: '#6e7681' }
                    });
                });
            }
            
            var rhLayout = {
                title: { text: 'Ride Height Over Lap Distance', font: { size: 14, color: '#c9d1d9' } },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: '#161b22',
                font: { color: '#8b949e', size: 10 },
                margin: { t: 50, b: 40, l: 50, r: 15 },
                xaxis: { title: { text: 'Distance (m)', font: { size: 10 } }, color: '#6e7681', gridcolor: '#21262d' },
                yaxis: { title: { text: 'Ride Height (mm)', font: { size: 10 } }, color: '#6e7681', gridcolor: '#21262d' },
                legend: { orientation: 'h', y: 1.12, x: 0.5, xanchor: 'center', font: { size: 10 } },
                shapes: shapes,
                annotations: annotations
            };
            
            Plotly.newPlot('ride-height-graph', rhTraces, rhLayout, { responsive: true, displayModeBar: false });
        }
        
        // ========== SHOCK VELOCITY HISTOGRAM ==========
        if (suspAnalysis.hasShockVel && document.getElementById('shock-histogram')) {
            var histTraces = [];
            var colors = { lf: '#00d4aa', rf: '#3b82f6', lr: '#f97316', rr: '#ef4444' };
            var names = { lf: 'LF', rf: 'RF', lr: 'LR', rr: 'RR' };
            
            // Bin edges for velocity histogram (mm/s)
            var binEdges = [-300, -200, -150, -100, -75, -50, -25, 0, 25, 50, 75, 100, 150, 200, 300];
            var binLabels = binEdges.slice(0, -1).map(function(e, i) {
                return e + ' to ' + binEdges[i + 1];
            });
            
            var sampleRate = Math.max(1, Math.floor(data.length / 3000));
            
            ['lf', 'rf', 'lr', 'rr'].forEach(function(corner) {
                var ch = cMap.shockVel[corner];
                if (!ch) return;
                
                var counts = new Array(binEdges.length - 1).fill(0);
                var total = 0;
                
                for (var i = 0; i < data.length; i += sampleRate) {
                    var val = parseFloat(data[i][ch]);
                    if (isNaN(val)) continue;
                    // Convert m/s to mm/s if needed
                    if (Math.abs(val) < 5) val *= 1000;
                    
                    for (var b = 0; b < binEdges.length - 1; b++) {
                        if (val >= binEdges[b] && val < binEdges[b + 1]) {
                            counts[b]++;
                            break;
                        }
                    }
                    total++;
                }
                
                // Convert to percentages
                var pcts = counts.map(function(c) { return total > 0 ? (c / total * 100) : 0; });
                
                histTraces.push({
                    x: binLabels, y: pcts,
                    type: 'bar',
                    name: names[corner],
                    marker: { color: colors[corner], opacity: 0.7 }
                });
            });
            
            var histLayout = {
                title: { text: 'Shock Velocity Distribution', font: { size: 14, color: '#c9d1d9' } },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: '#161b22',
                font: { color: '#8b949e', size: 10 },
                margin: { t: 50, b: 60, l: 50, r: 15 },
                barmode: 'group',
                xaxis: { 
                    title: { text: 'Velocity Range (mm/s) — Bump ← → Rebound', font: { size: 10 } }, 
                    color: '#6e7681', gridcolor: '#21262d',
                    tickangle: -45, tickfont: { size: 8 }
                },
                yaxis: { title: { text: '% of Time', font: { size: 10 } }, color: '#6e7681', gridcolor: '#21262d' },
                legend: { orientation: 'h', y: 1.12, x: 0.5, xanchor: 'center', font: { size: 10 } }
            };
            
            Plotly.newPlot('shock-histogram', histTraces, histLayout, { responsive: true, displayModeBar: false });
        }
    }
    
    generateFullReport(analysis) {
        var container = document.getElementById('lap-analysis');
        if (!container) return;
        var timeDelta = analysis.timeDelta || 0;
        var html = '<h2 class="text-2xl font-bold mb-4">Telemetry Report</h2>';
        html += '<div class="bg-[#21262d] p-4 rounded-lg mb-4"><p class="text-lg font-bold">Lap Time Delta: ' + (timeDelta > 0 ? '+' : '') + timeDelta.toFixed(3) + 's</p>';
        html += '<p>Average Speed: ' + (analysis.avgSpeedCurr || 0).toFixed(1) + ' km/h (Ref: ' + (analysis.avgSpeedRef || 0).toFixed(1) + ' km/h)</p></div>';
        if (analysis.sectors && analysis.sectors.length > 0) {
            html += '<h3 class="text-xl font-bold mt-4 mb-2">Sector Analysis</h3><table class="w-full border-collapse"><thead><tr class="bg-[#30363d]"><th class="border p-2">Sector</th><th class="border p-2">Speed Delta</th></tr></thead><tbody>';
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
            // Prepare telemetry summary for AIrton (sampled to reduce size)
            var telemetrySummary = null;
            if (this.referenceData && this.currentData) {
                var sampleRate = Math.max(1, Math.floor(this.referenceData.length / 200));
                var sampleData = function(data) {
                    return data.filter(function(_, i) { return i % sampleRate === 0; });
                };
                telemetrySummary = {
                    reference: sampleData(self.referenceData),
                    current: sampleData(self.currentData),
                    channels: self.detectedChannels || {}
                };
            }
            
            // Include detected corners in chat context
            var cornersForChat = (this.detectedCorners || []).map(function(c) {
                return {
                    number: c.number,
                    name: c.name,
                    distance_m: Math.round(c.distance),
                    apex_speed_kmh: c.speed,
                    severity: c.severity
                };
            });
            
            var response = await fetch(this.webhookUrl + '/webhook/ayrton-chat', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    session_id: this.sessionId, 
                    message: message, 
                    session_data: this.sessionData, 
                    context: { 
                        analysis: this.analysisResults,
                        detected_corners: cornersForChat,
                        corner_count: cornersForChat.length
                    },
                    telemetry_data: telemetrySummary
                })
            });
            if (!response.ok) throw new Error('HTTP error: ' + response.status);
            var result = await response.json();
            this.hideTypingIndicator();
            this.addAIrtonMessage(result.ayrton_says || result.response || 'Response received');
        } catch (error) {
            this.hideTypingIndicator();
            this.addAIrtonMessage('Error processing message. Please try again.');
        }
    }
    
    addUserMessage(message) {
        var chatMessages = document.getElementById('chat-messages');
        var messageDiv = document.createElement('div');
        messageDiv.className = 'flex justify-end';
        messageDiv.innerHTML = '<div class="chat-message-user rounded-lg p-4 max-w-md"><p class="text-sm text-[#f0f6fc]">' + message + '</p></div>';
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    addAIrtonMessage(message) {
        var chatMessages = document.getElementById('chat-messages');
        var messageDiv = document.createElement('div');
        messageDiv.className = 'flex items-start';
        var cleanMessage = message.replace(/<[^>]*>/g, '');
        messageDiv.innerHTML = '<div class="chat-message-ai rounded-lg p-4 max-w-2xl"><div class="flex items-center gap-3 mb-3"><div class="w-8 h-8 bg-gradient-to-br from-[#ff6b9d] to-[#ff4777] rounded flex items-center justify-center"><span class="text-white font-bold text-sm font-display">A</span></div><span class="font-display font-semibold text-[#ff85b1] text-sm tracking-wide">AIRTON</span></div><div class="text-[#f0f6fc] text-sm leading-relaxed">' + cleanMessage.replace(/\n/g, '<br>') + '</div></div>';
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    showTypingIndicator() {
        var chatMessages = document.getElementById('chat-messages');
        var typingDiv = document.createElement('div');
        typingDiv.id = 'typing-indicator';
        typingDiv.className = 'flex items-start';
        typingDiv.innerHTML = '<div class="rounded-lg p-4 bg-[#21262d] border border-[#30363d]"><p class="text-[#8b949e] text-sm font-data"><i class="fas fa-circle-notch fa-spin mr-2 text-[#ff85b1]"></i>Analyzing data...</p></div>';
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
                btn.classList.add('active'); 
            } else { 
                btn.classList.remove('active'); 
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
        var colors = {
            success: 'background: rgba(0, 212, 170, 0.95); border-color: #00d4aa; color: #0d1117;',
            error: 'background: rgba(248, 81, 73, 0.95); border-color: #f85149; color: white;',
            info: 'background: rgba(56, 139, 253, 0.95); border-color: #388bfd; color: white;'
        };
        var style = colors[type] || colors.info;
        notification.style.cssText = 'position: fixed; top: 20px; right: 20px; padding: 12px 20px; border-radius: 8px; border: 1px solid; z-index: 9999; font-family: Rajdhani, sans-serif; font-weight: 600; font-size: 14px; letter-spacing: 0.02em; box-shadow: 0 4px 20px rgba(0,0,0,0.3);' + style;
        notification.innerHTML = '<i class="fas fa-' + (type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle') + '" style="margin-right: 8px;"></i>' + message;
        document.body.appendChild(notification);
        setTimeout(function() { 
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s ease';
            setTimeout(function() { notification.remove(); }, 300);
        }, 3000);
    }
}

// Initialize the app
window.telemetryApp = new TelemetryAnalysisApp();
