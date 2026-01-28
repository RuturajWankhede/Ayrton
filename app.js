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
            sessionUpload.addEventListener('dragover', function(e) { e.preventDefault(); sessionUpload.classList.add('border-blue-500', 'bg-blue-900/20'); });
            sessionUpload.addEventListener('dragleave', function() { sessionUpload.classList.remove('border-blue-500', 'bg-blue-900/20'); });
            sessionUpload.addEventListener('drop', function(e) {
                e.preventDefault();
                sessionUpload.classList.remove('border-blue-500', 'bg-blue-900/20');
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
            '<p class="text-xs text-gray-500">' + fileSizeMB.toFixed(1) + ' MB - large files may take a while</p>';
        
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
                    '<p class="text-sm text-gray-400">' + self.detectedLaps.length + ' laps • ' + parsedData.length.toLocaleString() + ' data points</p>';
                
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
            var keepPatterns = ['time', 'distance', 'speed', 'throttle', 'brake', 'gear', 'heading', 'steer', 'lap', 'elapsed', 'yaw', 'lat', 'lon', 'gps'];
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
                    '<p class="text-sm text-gray-400">' + self.detectedLaps.length + ' laps • ' + parsedData.length.toLocaleString() + ' points • ' + fileSizeMB.toFixed(0) + 'MB</p>';
                    
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
            '<p class="text-sm text-gray-500">or click to browse</p>';
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
            container.innerHTML = '<p class="text-gray-400 text-center py-8">No laps detected. Upload a session file above.</p>';
            return;
        }
        
        var html = '<div class="mb-4 flex items-center justify-between">';
        html += '<div class="text-sm text-gray-400">' + this.detectedLaps.length + ' laps detected</div>';
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
            
            html += '<tr class="border-b border-gray-700 hover:bg-gray-700/50 ' + rowClass + '">';
            html += '<td class="px-3 py-2">';
            html += '<span class="font-mono">' + lap.lapNumber + '</span>';
            if (lap.isFastest) html += ' <span class="text-green-400 text-xs">★ FASTEST</span>';
            if (!lap.isComplete) html += ' <span class="text-yellow-400 text-xs">(incomplete)</span>';
            html += '</td>';
            html += '<td class="px-3 py-2 font-mono ' + timeClass + '">' + lap.lapTimeFormatted + '</td>';
            html += '<td class="px-3 py-2 text-center font-mono">' + Math.round(lap.minSpeed) + '</td>';
            html += '<td class="px-3 py-2 text-center font-mono">' + Math.round(lap.maxSpeed) + '</td>';
            html += '<td class="px-3 py-2 text-center font-mono">' + Math.round(lap.avgSpeed) + '</td>';
            html += '<td class="px-3 py-2 text-center text-gray-400">' + lap.dataPoints + '</td>';
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
    // LOCAL CORNER DETECTION - Analyzes telemetry directly
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
        var distNames = ['Distance', 'Lap Distance', 'distance', 'Dist'];
        var brakeNames = ['Brake', 'Brake[%]', 'brake'];
        
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
        for (var i = 0; i < data.length; i += sampleRate) {
            var row = data[i];
            sampledData.push({
                index: i,
                distance: getValue(row, distNames, 0),
                speed: getValue(row, speedNames, 0),
                brake: getValue(row, brakeNames, 0)
            });
        }
        
        console.log('=== CORNER DETECTION ===');
        console.log('Sampled', sampledData.length, 'points from', data.length);
        
        // Find track length
        var trackLength = sampledData[sampledData.length - 1].distance || 5000;
        
        // Get speed statistics
        var speeds = sampledData.map(function(d) { return d.speed; }).filter(function(s) { return s > 1; });
        var avgSpeed = speeds.reduce(function(a, b) { return a + b; }, 0) / speeds.length;
        var maxSpeed = Math.max.apply(null, speeds);
        var minSpeed = Math.min.apply(null, speeds);
        
        // Detect if speed is in m/s or km/h (m/s will be < 100, km/h will be > 100)
        var speedUnit = maxSpeed < 100 ? 'm/s' : 'km/h';
        var speedMultiplier = speedUnit === 'm/s' ? 3.6 : 1; // Convert to km/h for display
        
        console.log('Speed unit detected:', speedUnit);
        console.log('Speed stats (raw): avg=' + avgSpeed.toFixed(1) + ', max=' + maxSpeed.toFixed(1) + ', min=' + minSpeed.toFixed(1));
        console.log('Speed stats (km/h): avg=' + (avgSpeed * speedMultiplier).toFixed(1) + ', max=' + (maxSpeed * speedMultiplier).toFixed(1) + ', min=' + (minSpeed * speedMultiplier).toFixed(1));
        
        // ALGORITHM: Find all local speed minima using derivative analysis
        // A corner is where speed drops significantly and then rises again
        
        var corners = [];
        var windowSize = Math.max(2, Math.floor(sampledData.length / 400)); // ~0.25% of lap - smaller window
        var minCornerSpacing = trackLength / 250; // ~21m for 5.3km track - very tight for chicanes
        
        console.log('Window size:', windowSize, '| Min corner spacing:', minCornerSpacing.toFixed(0) + 'm');
        
        // Calculate speed derivative (rate of change)
        var speedDerivative = [];
        for (var i = 1; i < sampledData.length - 1; i++) {
            var distDelta = sampledData[i + 1].distance - sampledData[i - 1].distance;
            var speedDelta = sampledData[i + 1].speed - sampledData[i - 1].speed;
            speedDerivative.push({
                index: i,
                distance: sampledData[i].distance,
                speed: sampledData[i].speed,
                derivative: distDelta > 0 ? speedDelta / distDelta : 0,
                brake: sampledData[i].brake
            });
        }
        
        // Find zero-crossings in derivative (where decel turns to accel = apex)
        var apexCandidates = [];
        for (var i = windowSize; i < speedDerivative.length - windowSize; i++) {
            var prev = speedDerivative[i - 1].derivative;
            var curr = speedDerivative[i].derivative;
            var next = speedDerivative[i + 1].derivative;
            
            // Look for negative-to-positive transition (braking -> accelerating)
            if (prev < 0 && next > 0) {
                // Verify this is actually a local speed minimum
                var isMinimum = true;
                var localMinSpeed = speedDerivative[i].speed;
                for (var j = i - windowSize; j <= i + windowSize; j++) {
                    if (speedDerivative[j].speed < localMinSpeed - 0.5) {
                        isMinimum = false;
                        break;
                    }
                }
                
                if (isMinimum) {
                    // Calculate how much speed was lost approaching this point
                    var maxSpeedBefore = speedDerivative[i].speed;
                    for (var k = Math.max(0, i - windowSize * 3); k < i; k++) {
                        if (speedDerivative[k].speed > maxSpeedBefore) {
                            maxSpeedBefore = speedDerivative[k].speed;
                        }
                    }
                    var speedLoss = maxSpeedBefore - speedDerivative[i].speed;
                    var speedLossPct = maxSpeedBefore > 0 ? (speedLoss / maxSpeedBefore) * 100 : 0;
                    
                    // Check for braking before this point
                    var hadBraking = false;
                    for (var k = Math.max(0, i - windowSize * 2); k < i; k++) {
                        if (speedDerivative[k].brake > 5) {
                            hadBraking = true;
                            break;
                        }
                    }
                    
                    apexCandidates.push({
                        distance: speedDerivative[i].distance,
                        speed: speedDerivative[i].speed * speedMultiplier,
                        speedLoss: speedLoss * speedMultiplier,
                        speedLossPct: speedLossPct,
                        hadBraking: hadBraking,
                        index: i
                    });
                }
            }
        }
        
        console.log('Found', apexCandidates.length, 'apex candidates');
        if (apexCandidates.length > 0) {
            console.log('Sample candidates:', apexCandidates.slice(0, 5).map(function(c) {
                return c.distance.toFixed(0) + 'm @ ' + c.speed.toFixed(1) + 'km/h (loss:' + c.speedLossPct.toFixed(1) + '%, brake:' + c.hadBraking + ')';
            }));
        }
        
        // Filter and cluster candidates - be more permissive
        var lastCornerDist = -minCornerSpacing;
        var rejectedTooClose = 0, rejectedLowLoss = 0, keptCount = 0;
        
        apexCandidates.forEach(function(candidate) {
            // Keep corners with any speed loss > 0.5% OR braking OR low absolute speed
            var isLowSpeed = candidate.speed < avgSpeed * speedMultiplier * 0.90;
            if (candidate.speedLossPct < 0.5 && !candidate.hadBraking && !isLowSpeed) {
                rejectedLowLoss++;
                return;
            }
            
            if (candidate.distance - lastCornerDist > minCornerSpacing) {
                // Determine corner severity
                var severity = 'kink';
                if (candidate.hadBraking && candidate.speedLossPct > 20) {
                    severity = 'heavy';
                } else if (candidate.hadBraking || candidate.speedLossPct > 10) {
                    severity = 'medium';
                } else if (candidate.speedLossPct > 5) {
                    severity = 'light';
                }
                
                corners.push({
                    distance: candidate.distance,
                    speed: Math.round(candidate.speed),
                    speedLoss: Math.round(candidate.speedLoss),
                    type: 'corner',
                    severity: severity,
                    apex: true
                });
                lastCornerDist = candidate.distance;
                keptCount++;
            } else {
                rejectedTooClose++;
                if (corners.length > 0) {
                    // Merge with previous corner - keep the slower one
                    var lastCorner = corners[corners.length - 1];
                    if (candidate.speed < lastCorner.speed) {
                        lastCorner.distance = candidate.distance;
                        lastCorner.speed = Math.round(candidate.speed);
                        lastCorner.speedLoss = Math.round(candidate.speedLoss);
                    }
                }
            }
        });
        
        console.log('First pass: kept=' + keptCount + ', rejectedTooClose=' + rejectedTooClose + ', rejectedLowLoss=' + rejectedLowLoss);
        console.log('After filtering:', corners.length, 'corners');
        
        // SECOND PASS: If still not enough corners, look for ANY significant speed drops
        if (corners.length < 18) {
            console.log('Running second pass with lower threshold... (have', corners.length, 'need ~18+)');
            var existingDistances = corners.map(function(c) { return c.distance; });
            
            // Look for points where speed is below 99% of average - very sensitive
            var lowSpeedThreshold = avgSpeed * 0.99;
            console.log('Second pass threshold:', (lowSpeedThreshold * speedMultiplier).toFixed(1), 'km/h');
            
            // Also reduce minimum spacing for second pass
            var secondPassSpacing = trackLength / 300; // ~18m - even tighter for chicanes
            var lastSecondPassDist = -secondPassSpacing;
            
            for (var i = windowSize; i < sampledData.length - windowSize; i++) {
                var current = sampledData[i];
                if (current.speed > lowSpeedThreshold) continue;
                
                // Check if already detected (use tighter spacing for second pass)
                var alreadyDetected = existingDistances.some(function(d) {
                    return Math.abs(d - current.distance) < secondPassSpacing;
                });
                if (alreadyDetected) continue;
                
                // Check if this is a local minimum
                var isMinimum = true;
                for (var j = Math.max(0, i - windowSize); j <= Math.min(sampledData.length - 1, i + windowSize); j++) {
                    if (j !== i && sampledData[j].speed < current.speed - 0.5) {
                        isMinimum = false;
                        break;
                    }
                }
                
                if (isMinimum && current.distance - lastSecondPassDist > secondPassSpacing) {
                    corners.push({
                        distance: current.distance,
                        speed: Math.round(current.speed * speedMultiplier),
                        type: 'corner',
                        severity: 'kink',
                        apex: true
                    });
                    lastSecondPassDist = current.distance;
                    existingDistances.push(current.distance);
                }
            }
            
            // Sort by distance
            corners.sort(function(a, b) { return a.distance - b.distance; });
            console.log('After second pass:', corners.length, 'corners');
        }
        
        // THIRD PASS: Still need more? Look at ALL local minima regardless of threshold
        if (corners.length < 18) {
            console.log('Running third pass - scanning all local minima...');
            var existingDistances = corners.map(function(c) { return c.distance; });
            var thirdPassSpacing = trackLength / 400; // ~13m
            var lastThirdPassDist = -thirdPassSpacing;
            var smallWindow = Math.max(1, Math.floor(windowSize / 2));
            
            for (var i = smallWindow; i < sampledData.length - smallWindow; i++) {
                var current = sampledData[i];
                
                // Skip if too close to existing corner
                var tooClose = existingDistances.some(function(d) {
                    return Math.abs(d - current.distance) < thirdPassSpacing;
                });
                if (tooClose) continue;
                
                // Check if this is a local minimum in small window
                var isMinimum = true;
                var beforeSpeed = 0, afterSpeed = 0;
                for (var j = i - smallWindow; j <= i + smallWindow; j++) {
                    if (j < i) beforeSpeed = Math.max(beforeSpeed, sampledData[j].speed);
                    if (j > i) afterSpeed = Math.max(afterSpeed, sampledData[j].speed);
                    if (j !== i && sampledData[j].speed < current.speed - 0.3) {
                        isMinimum = false;
                        break;
                    }
                }
                
                // Must have some speed drop before and rise after (characteristic of apex)
                var hasSpeedDrop = beforeSpeed > current.speed + 1 || afterSpeed > current.speed + 1;
                
                if (isMinimum && hasSpeedDrop && current.distance - lastThirdPassDist > thirdPassSpacing) {
                    corners.push({
                        distance: current.distance,
                        speed: Math.round(current.speed * speedMultiplier),
                        type: 'corner',
                        severity: 'kink',
                        apex: true
                    });
                    lastThirdPassDist = current.distance;
                    existingDistances.push(current.distance);
                }
            }
            
            corners.sort(function(a, b) { return a.distance - b.distance; });
            console.log('After third pass:', corners.length, 'corners');
        }
        
        // Number the corners
        corners.forEach(function(corner, idx) {
            corner.name = 'T' + (idx + 1);
            corner.number = idx + 1;
        });
        
        console.log('=== FINAL CORNER DETECTION: ' + corners.length + ' corners ===');
        corners.forEach(function(c) {
            console.log('  ' + c.name + ': ' + c.distance.toFixed(0) + 'm @ ' + c.speed + 'km/h (' + c.severity + ')');
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
        
        // If lap delta is 0, calculate it from the telemetry data
        if (lapDelta === 0 && this.referenceData && this.currentData) {
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
            
            var refEndTime = getValue(this.referenceData[this.referenceData.length - 1], timeNames);
            var currEndTime = getValue(this.currentData[this.currentData.length - 1], timeNames);
            
            if (refEndTime !== null && currEndTime !== null) {
                lapDelta = currEndTime - refEndTime;
                console.log('Calculated lap delta from telemetry:', lapDelta);
            }
        }
        
        // Store the lap delta for use in the analysis tab
        this.sessionData.lapDelta = lapDelta;
        this.sessionData.timeDelta = lapDelta;
        this.sessionData.driver = sessionData.driver || document.getElementById('driver-name').value || 'Driver';
        this.sessionData.track = sessionData.track || document.getElementById('track-name').value || 'Track';
        
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
        var tireAnalysis = analysis.tireAnalysis || {};
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
            var tabBtnContainer = document.querySelector('.flex.border-b') || document.querySelector('[class*="tab-btn"]').parentElement;
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
        
        // Braking technique - just show smoothness comparison
        if (brakingTechnique.smoothnessVsRef) {
            html += '<div class="bg-gray-700/50 rounded-lg p-3 inline-block"><span class="text-gray-400">Braking:</span> <span class="text-white font-bold">' + brakingTechnique.smoothnessVsRef + '</span></div>';
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
        html += '<h3 class="text-xl font-bold text-gray-800"><i class="fas fa-undo text-red-500 mr-2"></i>' + turnLabel + '</h3>';
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
        html += '<div class="text-center flex-1"><div class="text-[#ff6b9d] font-semibold font-data text-lg">' + entrySpeed + '</div><div class="text-xs text-gray-400">You</div></div>';
        html += '<div class="text-center px-2"><div class="text-' + (deltaEntry >= 0 ? 'green' : 'red') + '-600 font-bold">' + (deltaEntry >= 0 ? '+' : '') + deltaEntry + '</div><div class="text-xs text-gray-400">km/h</div></div>';
        html += '<div class="text-center flex-1"><div class="text-gray-600 font-bold text-lg">' + refEntry + '</div><div class="text-xs text-gray-400">Ref</div></div>';
        html += '</div></div>';
        
        // Apex Speed
        html += '<div class="bg-white rounded-lg p-3 shadow-sm">';
        html += '<div class="text-gray-500 text-sm text-center mb-2">Apex Speed</div>';
        html += '<div class="flex justify-between items-center">';
        html += '<div class="text-center flex-1"><div class="text-[#ff6b9d] font-semibold font-data text-lg">' + apexSpeed + '</div><div class="text-xs text-gray-400">You</div></div>';
        html += '<div class="text-center px-2"><div class="text-' + (deltaApex >= 0 ? 'green' : 'red') + '-600 font-bold">' + (deltaApex >= 0 ? '+' : '') + deltaApex + '</div><div class="text-xs text-gray-400">km/h</div></div>';
        html += '<div class="text-center flex-1"><div class="text-gray-600 font-bold text-lg">' + refApex + '</div><div class="text-xs text-gray-400">Ref</div></div>';
        html += '</div></div>';
        
        // Exit Speed
        html += '<div class="bg-white rounded-lg p-3 shadow-sm">';
        html += '<div class="text-gray-500 text-sm text-center mb-2">Exit Speed</div>';
        html += '<div class="flex justify-between items-center">';
        html += '<div class="text-center flex-1"><div class="text-[#ff6b9d] font-semibold font-data text-lg">' + exitSpeed + '</div><div class="text-xs text-gray-400">You</div></div>';
        html += '<div class="text-center px-2"><div class="text-' + (deltaExit >= 0 ? 'green' : 'red') + '-600 font-bold">' + (deltaExit >= 0 ? '+' : '') + deltaExit + '</div><div class="text-xs text-gray-400">km/h</div></div>';
        html += '<div class="text-center flex-1"><div class="text-gray-600 font-bold text-lg">' + refExit + '</div><div class="text-xs text-gray-400">Ref</div></div>';
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
        html += '<div class="bg-gray-100 rounded p-2">';
        html += '<div class="text-xs text-gray-500 text-center mb-1">Peak Brake</div>';
        html += '<div class="flex justify-between items-center text-sm">';
        html += '<div class="text-center flex-1"><div class="text-[#ff6b9d] font-semibold font-data">' + peakBrake + '%</div><div class="text-xs text-gray-400">You</div></div>';
        if (typeof deltaPeakBrake === 'number' && deltaPeakBrake !== 0) {
            html += '<div class="text-center px-1"><div class="text-' + (deltaPeakBrake >= 0 ? 'green' : 'red') + '-600 font-bold text-xs">' + (deltaPeakBrake >= 0 ? '+' : '') + deltaPeakBrake + '</div></div>';
        }
        html += '<div class="text-center flex-1"><div class="text-gray-600 font-bold">' + refPeakBrake + '%</div><div class="text-xs text-gray-400">Ref</div></div>';
        html += '</div></div>';
        
        // Smoothness - handle string or number (comparative)
        html += '<div class="bg-gray-100 rounded p-2 text-center">';
        html += '<div class="text-xs text-gray-500">Smoothness</div>';
        if (segment.smoothness && typeof segment.smoothness === 'string') {
            var smoothColor = segment.smoothness.includes('rougher') ? 'text-red-600' : segment.smoothness.includes('smoother') ? 'text-green-600' : 'text-gray-800';
            html += '<div class="' + smoothColor + ' font-semibold text-xs mt-1">' + segment.smoothness + '</div>';
        } else if (curr.smoothness !== undefined && curr.smoothness !== null) {
            html += '<div class="text-gray-800 font-semibold">' + (typeof curr.smoothness === 'number' ? curr.smoothness + '/100' : curr.smoothness) + '</div>';
        } else {
            html += '<div class="text-gray-400 font-semibold">-</div>';
        }
        html += '</div>';
        
        // Trail Braking - You / Delta / Ref
        html += '<div class="bg-gray-100 rounded p-2">';
        html += '<div class="text-xs text-gray-500 text-center mb-1">Trail Braking</div>';
        html += '<div class="flex justify-between items-center text-sm">';
        
        // Your trail braking
        html += '<div class="text-center flex-1">';
        if (trailBraking === true) {
            html += '<div class="text-[#ff6b9d] font-semibold font-data">' + (trailDist > 0 ? trailDist + 'm' : 'Yes') + '</div>';
        } else if (trailBraking === false) {
            html += '<div class="text-red-600 font-bold">No</div>';
        } else {
            html += '<div class="text-gray-400 font-bold">-</div>';
        }
        html += '<div class="text-xs text-gray-400">You</div></div>';
        
        // Delta
        if (typeof deltaTrailDist === 'number' && deltaTrailDist !== 0) {
            html += '<div class="text-center px-1"><div class="text-' + (deltaTrailDist >= 0 ? 'green' : 'red') + '-600 font-bold text-xs">' + (deltaTrailDist >= 0 ? '+' : '') + deltaTrailDist + 'm</div></div>';
        }
        
        // Ref trail braking
        html += '<div class="text-center flex-1">';
        if (refTrailBraking === true) {
            html += '<div class="text-gray-600 font-bold">' + (refTrailDist > 0 ? refTrailDist + 'm' : 'Yes') + '</div>';
        } else if (refTrailBraking === false) {
            html += '<div class="text-gray-600 font-bold">No</div>';
        } else {
            html += '<div class="text-gray-400 font-bold">-</div>';
        }
        html += '<div class="text-xs text-gray-400">Ref</div></div>';
        
        html += '</div></div>';
        
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
        html += '<h3 class="text-xl font-bold text-gray-800"><i class="fas fa-road text-blue-500 mr-2"></i>' + straightLabel + '</h3>';
        html += '<span class="text-gray-500">' + (segment.startDistance || segment.distance || 0) + 'm - ' + (segment.endDistance || 0) + 'm (' + (segment.length || 0) + 'm)</span>';
        html += '</div>';
        if (segment.timeLoss > 0) {
            html += '<div class="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium">~' + segment.timeLoss.toFixed(2) + 's lost</div>';
        } else if (lifts.length === 0 && isFullThrottle) {
            html += '<div class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium"><i class="fas fa-check mr-1"></i>Clean</div>';
        }
        html += '</div>';
        
        // Speed comparison grid - You | Delta | Ref format
        html += '<div class="grid grid-cols-3 gap-4 mb-4">';
        
        // Entry Speed
        html += '<div class="bg-white rounded-lg p-3 shadow-sm">';
        html += '<div class="text-gray-500 text-sm mb-2 text-center">Entry Speed</div>';
        html += '<div class="flex justify-between items-center text-sm">';
        html += '<div class="text-center"><div class="text-[#ff6b9d] font-semibold font-data text-lg">' + entrySpeed + '</div><div class="text-gray-400 text-xs">You</div></div>';
        html += '<div class="text-center"><div class="text-' + (deltaEntry >= 0 ? 'green' : 'red') + '-600 font-bold">' + (deltaEntry >= 0 ? '+' : '') + deltaEntry + '</div></div>';
        html += '<div class="text-center"><div class="text-gray-600 font-bold text-lg">' + refEntrySpeed + '</div><div class="text-gray-400 text-xs">Ref</div></div>';
        html += '</div></div>';
        
        // Max Speed
        html += '<div class="bg-white rounded-lg p-3 shadow-sm">';
        html += '<div class="text-gray-500 text-sm mb-2 text-center">Max Speed</div>';
        html += '<div class="flex justify-between items-center text-sm">';
        html += '<div class="text-center"><div class="text-[#ff6b9d] font-semibold font-data text-lg">' + maxSpeed + '</div><div class="text-gray-400 text-xs">You</div></div>';
        html += '<div class="text-center"><div class="text-' + (deltaMax >= 0 ? 'green' : 'red') + '-600 font-bold">' + (deltaMax >= 0 ? '+' : '') + deltaMax + '</div></div>';
        html += '<div class="text-center"><div class="text-gray-600 font-bold text-lg">' + refMaxSpeed + '</div><div class="text-gray-400 text-xs">Ref</div></div>';
        html += '</div></div>';
        
        // Exit Speed
        html += '<div class="bg-white rounded-lg p-3 shadow-sm">';
        html += '<div class="text-gray-500 text-sm mb-2 text-center">Exit Speed</div>';
        html += '<div class="flex justify-between items-center text-sm">';
        html += '<div class="text-center"><div class="text-[#ff6b9d] font-semibold font-data text-lg">' + exitSpeed + '</div><div class="text-gray-400 text-xs">You</div></div>';
        html += '<div class="text-center"><div class="text-' + (deltaExit >= 0 ? 'green' : 'red') + '-600 font-bold">' + (deltaExit >= 0 ? '+' : '') + deltaExit + '</div></div>';
        html += '<div class="text-center"><div class="text-gray-600 font-bold text-lg">' + refExitSpeed + '</div><div class="text-gray-400 text-xs">Ref</div></div>';
        html += '</div></div>';
        
        html += '</div>';
        
        // Throttle info
        html += '<div class="grid grid-cols-2 gap-4 mb-4">';
        html += '<div class="bg-white rounded-lg p-3 shadow-sm">';
        html += '<div class="text-gray-500 text-sm">Avg Throttle</div>';
        html += '<div class="flex justify-between items-center">';
        html += '<span class="text-[#ff6b9d] font-semibold font-data">' + avgThrottle + '%</span>';
        html += '<span class="text-gray-400">vs</span>';
        html += '<span class="text-gray-600 font-bold">' + refAvgThrottle + '%</span>';
        html += '</div></div>';
        
        html += '<div class="bg-white rounded-lg p-3 shadow-sm">';
        html += '<div class="text-gray-500 text-sm">Throttle Lifts</div>';
        html += '<div class="flex justify-between items-center">';
        if (lifts.length > refLifts.length) {
            html += '<span class="text-red-600 font-bold">' + lifts.length + ' lifts</span>';
            html += '<span class="text-gray-400">vs</span>';
            html += '<span class="text-gray-600 font-bold">' + refLifts.length + ' lifts</span>';
        } else if (lifts.length > 0) {
            html += '<span class="text-yellow-600 font-bold">' + lifts.length + ' lifts</span>';
            html += '<span class="text-gray-400">vs</span>';
            html += '<span class="text-gray-600 font-bold">' + refLifts.length + ' lifts</span>';
        } else {
            html += '<span class="text-green-600 font-bold">None</span>';
            html += '<span class="text-gray-400">vs</span>';
            html += '<span class="text-gray-600 font-bold">' + (refLifts.length > 0 ? refLifts.length + ' lifts' : 'None') + '</span>';
        }
        html += '</div></div>';
        html += '</div>';
        
        // Show lift details if there are lifts
        if (lifts.length > 0) {
            html += '<div class="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">';
            html += '<h4 class="font-semibold text-orange-700 mb-2"><i class="fas fa-tachometer-alt-slow mr-2"></i>Throttle Lifts Detected</h4>';
            html += '<div class="space-y-2">';
            lifts.forEach(function(lift) {
                html += '<div class="text-sm text-gray-700">';
                html += '<i class="fas fa-exclamation-circle text-orange-500 mr-2"></i>';
                html += 'Lift at <strong>' + lift.distance + 'm</strong>: throttle dropped to ' + lift.minThrottle + '%, lost ~<strong>' + lift.speedLost + 'km/h</strong>';
                html += '</div>';
            });
            
            // Check if reference also had lifts at similar positions
            if (refLifts.length > 0) {
                html += '<div class="text-sm text-blue-600 mt-2"><i class="fas fa-info-circle mr-2"></i>Note: Reference lap also had lifts - may indicate traffic or track feature</div>';
            } else {
                html += '<div class="text-sm text-red-600 mt-2"><i class="fas fa-flag mr-2"></i>Reference was flat out here - possible traffic, hesitation, or missed opportunity</div>';
            }
            html += '</div></div>';
        }
        
        // Issues and recommendations
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
            document.getElementById('track-map').innerHTML = '<p class="text-gray-400 text-center py-20">No track data</p>'; 
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
        var distNames = ['Distance', 'Dist', 'Lap Distance', 'LapDist', 'Corrected Distance'];
        var distPctNames = ['LapDistPct', 'Lap Distance Pct', 'DistPct'];
        var headingNames = ['Heading', 'Heading[°]', 'Car Heading', 'Yaw', 'Yaw[°]', 'YawRate[°/s]'];
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
        allTraces.push({ x: refNorm.map(function(p) { return p.x; }), y: refNorm.map(function(p) { return p.y; }), mode: 'lines', name: 'Reference', line: { color: '#00d4aa', width: 4 }, hoverinfo: 'name' });
        
        // Your lap - solid magenta line (no speed coloring)
        allTraces.push({ 
            x: currNorm.map(function(p) { return p.x; }), 
            y: currNorm.map(function(p) { return p.y; }), 
            mode: 'lines', 
            name: 'Comparison', 
            line: { color: '#ff6b9d', width: 3 }, 
            hoverinfo: 'name' 
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
        
        // Also add straights from AI analysis if available (local detection doesn't find straights)
        if (this.analysisResults && this.analysisResults.trackSegments) {
            var segments = this.analysisResults.trackSegments;
            
            // Sort straights by startDistance (not midpoint) so S1 = start/finish straight
            var straights = segments.filter(function(s) { return s.type === 'straight'; })
                .sort(function(a, b) { return (a.startDistance || a.distance || 0) - (b.startDistance || b.distance || 0); });
            
            straights.forEach(function(segment, idx) {
                var dist = segment.distance || 0;
                // Use S1 for all straights since they're already ordered correctly
                var label = 'S' + (idx + 1);
                var hasIssues = segment.issues && segment.issues.length > 0;
                var pos = findPositionAtDistance(dist);
                
                segmentMarkers.x.push(pos.x);
                segmentMarkers.y.push(pos.y);
                segmentMarkers.text.push(label);
                segmentMarkers.colors.push(hasIssues ? '#f59e0b' : '#3b82f6');
                
                annotations.push({
                    x: pos.x,
                    y: pos.y,
                    text: label,
                    showarrow: false,
                    font: { color: '#ffffff', size: 10, family: 'Arial Black' },
                    bgcolor: hasIssues ? '#f59e0b' : '#3b82f6',
                    bordercolor: '#ffffff',
                    borderwidth: 1,
                    borderpad: 3,
                    opacity: 0.9
                });
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
        var distNames = ['Distance', 'Dist', 'Lap Distance', 'LapDist', 'Corrected Distance'];
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
        var distNames = ['Distance', 'Dist', 'Lap Distance', 'LapDist', 'Corrected Distance'];
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
        if (refX.length > 0) traces.push({ x: refX, y: refY, mode: 'lines', name: 'Reference', line: { color: '#00d4aa', width: 1.5 } });
        if (currX.length > 0) traces.push({ x: currX, y: currY, mode: 'lines', name: 'Comparison', line: { color: '#ff6b9d', width: 2 } });
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
        var yourTrace = { x: ['Average', 'Top', 'Min Corner'], y: [analysis.avgSpeedCurr || 0, analysis.maxSpeedCurr || 0, analysis.minSpeedCurr || 0], type: 'bar', name: 'Comparison', marker: { color: '#ff6b9d' } };
        var refTrace = { x: ['Average', 'Top', 'Min Corner'], y: [analysis.avgSpeedRef || 0, analysis.maxSpeedRef || 0, analysis.minSpeedRef || 0], type: 'bar', name: 'Reference', marker: { color: '#00d4aa' } };
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
        var container = document.getElementById('lap-analysis');
        if (!container) return;
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
            
            var response = await fetch(this.webhookUrl + '/webhook/ayrton-chat', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    session_id: this.sessionId, 
                    message: message, 
                    session_data: this.sessionData, 
                    context: { analysis: this.analysisResults },
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
        messageDiv.innerHTML = '<div class="chat-message-ai rounded-lg p-4 max-w-2xl"><div class="flex items-center gap-3 mb-3"><div class="w-8 h-8 bg-gradient-to-br from-[#ff6b9d] to-[#ff4777] rounded flex items-center justify-center"><span class="text-white font-bold text-sm font-display">A</span></div><span class="font-display font-semibold text-[#ff6b9d] text-sm tracking-wide">AIRTON</span></div><div class="text-[#f0f6fc] text-sm leading-relaxed">' + cleanMessage.replace(/\n/g, '<br>') + '</div></div>';
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    showTypingIndicator() {
        var chatMessages = document.getElementById('chat-messages');
        var typingDiv = document.createElement('div');
        typingDiv.id = 'typing-indicator';
        typingDiv.className = 'flex items-start';
        typingDiv.innerHTML = '<div class="rounded-lg p-4 bg-[#21262d] border border-[#30363d]"><p class="text-[#8b949e] text-sm font-data"><i class="fas fa-circle-notch fa-spin mr-2 text-[#ff6b9d]"></i>Analyzing data...</p></div>';
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
