// Racing Telemetry Analysis Frontend Application
// Connects to N8N backend for professional telemetry analysis

class TelemetryAnalysisApp {
    constructor() {
        this.sessionId = null;
        this.referenceData = null;
        this.currentData = null;
        this.analysisResults = null;
        this.webhookUrl = localStorage.getItem('n8n_webhook_url') || 'https://ruturajw.app.n8n.cloud/webhook/';
        
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
                    this.referenceData = results.data;
                    this.displayFileInfo('ref', file);
                } else {
                    this.currentData = results.data;
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
        // Detect available channels
        if (!this.referenceData || this.referenceData.length === 0) return;
        
        const columns = Object.keys(this.referenceData[0]);
        const detectedChannels = this.detectChannels(columns);
        
        // Display detection results
        this.displayChannelDetection(detectedChannels);
    }

    detectChannels(columns) {
        // Core required channels
        const requiredChannels = {
            time: ['Time', 'time', 'Elapsed Time', 'Session Time', 't'],
            distance: ['Distance', 'Lap Distance', 'Dist', 'distance', 'LapDist'],
            speed: ['Speed', 'Ground Speed', 'Vehicle Speed', 'GPS Speed', 'speed']
        };
        
        // Optional channels that enhance analysis
        const optionalChannels = {
            throttle: ['Throttle', 'Throttle Pos', 'TPS', 'throttle'],
            brake: ['Brake', 'Brake Pressure', 'Brake Pres Front', 'brake'],
            gLateral: ['G Force Lat', 'Lateral G', 'LatG', 'G_Lat'],
            gLongitudinal: ['G Force Long', 'Longitudinal G', 'LongG', 'G_Long'],
            suspensionFL: ['Susp Pos FL', 'Suspension FL', 'Damper FL'],
            tireTempFL: ['Tyre Temp FL Centre', 'Tire Temp FL Center']
        };
        
        const detected = {
            required: {},
            optional: {},
            missing: [],
            capabilities: []
        };
        
        // Check required channels
        for (const [key, possibleNames] of Object.entries(requiredChannels)) {
            const found = columns.find(col => 
                possibleNames.some(name => col.toLowerCase() === name.toLowerCase())
            );
            if (found) {
                detected.required[key] = found;
            } else {
                detected.missing.push(key);
            }
        }
        
        // Check optional channels
        for (const [key, possibleNames] of Object.entries(optionalChannels)) {
            const found = columns.find(col => 
                possibleNames.some(name => col.toLowerCase() === name.toLowerCase())
            );
            if (found) {
                detected.optional[key] = found;
            }
        }
        
        // Determine capabilities
        if (Object.keys(detected.required).length === 3) {
            detected.capabilities.push('Basic lap analysis');
        }
        if (detected.optional.throttle && detected.optional.brake) {
            detected.capabilities.push('Driver input analysis');
        }
        if (detected.optional.gLateral && detected.optional.gLongitudinal) {
            detected.capabilities.push('G-force and traction analysis');
        }
        if (detected.optional.suspensionFL) {
            detected.capabilities.push('Suspension dynamics');
        }
        
        return detected;
    }

    displayChannelDetection(detected) {
        let message = '';
        
        if (detected.missing.length > 0) {
            this.showNotification(
                `Missing required channels: ${detected.missing.join(', ')}. Check channel documentation for accepted names.`, 
                'error'
            );
            document.getElementById('analyze-btn').disabled = true;
            
            // Show link to documentation
            message = '<a href="channel_documentation.html" target="_blank" class="text-blue-600 underline">View Channel Documentation</a>';
        } else {
            const channelCount = Object.keys(detected.required).length + Object.keys(detected.optional).length;
            message = `✅ Detected ${channelCount} channels. Analysis capabilities: ${detected.capabilities.join(', ')}`;
            
            if (Object.keys(detected.optional).length < 3) {
                message += '<br><span class="text-sm text-gray-600">Add more channels for advanced analysis. ';
                message += '<a href="channel_documentation.html" target="_blank" class="text-blue-600 underline">View Documentation</a></span>';
            }
            
            this.showNotification(`Channels detected successfully! ${detected.capabilities.length} analysis types available.`, 'success');
        }
        
        // Display detection info near upload area
        const infoDiv = document.createElement('div');
        infoDiv.className = 'mt-4 p-3 bg-blue-50 rounded text-sm';
        infoDiv.innerHTML = message;
        
        const uploadSection = document.getElementById('upload-section');
        const existingInfo = uploadSection.querySelector('.bg-blue-50');
        if (existingInfo) existingInfo.remove();
        uploadSection.querySelector('.bg-white').appendChild(infoDiv);
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
            // Prepare data for N8N
            const payload = {
                reference_lap: this.referenceData,
                current_lap: this.currentData,
                driver_name: document.getElementById('driver-name').value || 'Driver',
                track_name: document.getElementById('track-name').value || 'Track',
                session_id: this.generateSessionId(),
                timestamp: new Date().toISOString()
            };

            // Send to N8N webhook
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const results = await response.json();
            this.analysisResults = results.analysis;
            this.sessionId = results.session_id;

            // Display results
            this.displayAnalysisResults(results);
            
            // Show results section
            document.getElementById('upload-section').classList.add('hidden');
            document.getElementById('results-section').classList.remove('hidden');

            // Add Ayrton's initial message
            const ayrtonMessage = results.ayrton_says || results.initial_message || 
                "Listen. I've analyzed every data point from your lap. The numbers don't lie, but they don't show heart either. I see both. What do you want to know?";
            this.addAyrtonMessage(ayrtonMessage);

        } catch (error) {
            console.error('Analysis error:', error);
            this.showNotification(`Analysis failed: ${error.message}`, 'error');
        } finally {
            document.getElementById('loading-overlay').classList.add('hidden');
        }
    }

    displayAnalysisResults(results) {
        // Display key metrics
        const analysis = results.analysis || {};
        
        // Lap time delta
        const lapDelta = analysis.lapTimeAnalysis?.totalDelta || 0;
        document.getElementById('lap-delta').textContent = 
            lapDelta > 0 ? `+${lapDelta.toFixed(3)}s` : `${lapDelta.toFixed(3)}s`;
        
        // G-force usage
        const gForceUsage = analysis.vehicleDynamics?.averageUtilization || 0;
        document.getElementById('g-force-usage').textContent = `${gForceUsage.toFixed(0)}%`;
        
        // Tire status
        const tireStatus = analysis.tireAnalysis?.status || 'Unknown';
        document.getElementById('tire-status').textContent = tireStatus;
        
        // Setup issues
        const setupIssues = analysis.setupRecommendations?.priority_changes?.length || 0;
        document.getElementById('setup-issue').textContent = `${setupIssues} Issues`;

        // Generate graphs
        this.generateGraphs(analysis);
        
        // Display setup recommendations
        this.displaySetupRecommendations(analysis.setupRecommendations);
        
        // Generate full report
        this.generateFullReport(analysis);
    }

    generateGraphs(analysis) {
        // Speed trace
        if (analysis.speedTrace) {
            const speedTrace = {
                x: analysis.speedTrace.distance,
                y: analysis.speedTrace.speed,
                type: 'scatter',
                name: 'Speed',
                line: { color: 'blue' }
            };
            
            const speedDelta = {
                x: analysis.speedTrace.distance,
                y: analysis.speedTrace.delta,
                type: 'scatter',
                name: 'Delta',
                yaxis: 'y2',
                line: { color: 'red' }
            };

            const layout = {
                title: 'Speed Comparison',
                xaxis: { title: 'Distance (m)' },
                yaxis: { title: 'Speed (km/h)' },
                yaxis2: {
                    title: 'Delta (km/h)',
                    overlaying: 'y',
                    side: 'right'
                }
            };

            Plotly.newPlot('speed-trace', [speedTrace, speedDelta], layout);
        }

        // G-Force trace
        if (analysis.vehicleDynamics) {
            const gForceData = {
                x: analysis.vehicleDynamics.gForceLateral || [],
                y: analysis.vehicleDynamics.gForceLongitudinal || [],
                mode: 'markers',
                type: 'scatter',
                marker: {
                    color: analysis.vehicleDynamics.speed || [],
                    colorscale: 'Viridis',
                    showscale: true,
                    colorbar: { title: 'Speed (km/h)' }
                }
            };

            const layout = {
                title: 'Traction Circle Utilization',
                xaxis: { title: 'Lateral G', range: [-3, 3] },
                yaxis: { title: 'Longitudinal G', range: [-2, 2] },
                aspectratio: { x: 1, y: 1 }
            };

            Plotly.newPlot('g-force-trace', [gForceData], layout);
        }

        // Suspension travel
        if (analysis.suspensionAnalysis?.travel) {
            const traces = ['FL', 'FR', 'RL', 'RR'].map(corner => ({
                y: analysis.suspensionAnalysis.travel[corner.toLowerCase()] || [],
                name: corner,
                type: 'scatter'
            }));

            const layout = {
                title: 'Suspension Travel',
                xaxis: { title: 'Sample' },
                yaxis: { title: 'Position (mm)' }
            };

            Plotly.newPlot('suspension-travel', traces, layout);
        }

        // Tire temperatures
        if (analysis.tireAnalysis?.temperatures) {
            const temps = analysis.tireAnalysis.temperatures;
            const heatmapData = {
                z: [
                    [temps.fl?.inner || 0, temps.fl?.center || 0, temps.fl?.outer || 0],
                    [temps.fr?.inner || 0, temps.fr?.center || 0, temps.fr?.outer || 0]
                ],
                x: ['Inner', 'Center', 'Outer'],
                y: ['Front Left', 'Front Right'],
                type: 'heatmap',
                colorscale: [
                    [0, 'blue'],
                    [0.5, 'green'],
                    [0.7, 'yellow'],
                    [1, 'red']
                ]
            };

            const layout = {
                title: 'Tire Temperature Distribution',
                xaxis: { title: 'Zone' },
                yaxis: { title: 'Tire' }
            };

            Plotly.newPlot('tire-temps', [heatmapData], layout);
        }
    }

    displaySetupRecommendations(recommendations) {
        if (!recommendations) return;
        
        const container = document.getElementById('setup-recommendations');
        container.innerHTML = '';

        const categories = ['suspension', 'tires', 'aero', 'brake_balance', 'differential'];
        
        categories.forEach(category => {
            if (recommendations[category] && recommendations[category].length > 0) {
                const section = document.createElement('div');
                section.className = 'bg-white rounded-lg p-4 shadow';
                
                section.innerHTML = `
                    <h3 class="font-bold text-lg mb-3 capitalize">${category.replace('_', ' ')}</h3>
                    <div class="space-y-2">
                        ${recommendations[category].map(rec => `
                            <div class="border-l-4 ${rec.priority === 'HIGH' ? 'border-red-500' : 'border-yellow-500'} pl-3">
                                <p class="font-medium">${rec.change}</p>
                                <p class="text-sm text-gray-600">${rec.expected_impact}</p>
                                <p class="text-xs text-gray-500">Issue: ${rec.issue}</p>
                            </div>
                        `).join('')}
                    </div>
                `;
                
                container.appendChild(section);
            }
        });
    }

    generateFullReport(analysis) {
        const reportContainer = document.getElementById('full-report');
        
        const reportHTML = `
            <h2 class="text-2xl font-bold mb-4">Telemetry Analysis Report</h2>
            
            <h3 class="text-xl font-bold mt-6 mb-3">Executive Summary</h3>
            <p>Total lap time delta: ${analysis.lapTimeAnalysis?.totalDelta?.toFixed(3)}s</p>
            <p>Critical issues identified: ${analysis.setupRecommendations?.priority_changes?.length || 0}</p>
            
            <h3 class="text-xl font-bold mt-6 mb-3">Sector Analysis</h3>
            ${this.generateSectorTable(analysis.sectorAnalysis)}
            
            <h3 class="text-xl font-bold mt-6 mb-3">Vehicle Dynamics</h3>
            <p>Average G-force utilization: ${analysis.vehicleDynamics?.averageUtilization?.toFixed(1)}%</p>
            <p>Peak lateral G: ${analysis.vehicleDynamics?.peakLateral?.toFixed(2)}G</p>
            <p>Peak longitudinal G: ${analysis.vehicleDynamics?.peakLongitudinal?.toFixed(2)}G</p>
            
            <h3 class="text-xl font-bold mt-6 mb-3">Suspension Analysis</h3>
            ${this.generateSuspensionReport(analysis.suspensionAnalysis)}
            
            <h3 class="text-xl font-bold mt-6 mb-3">Tire Performance</h3>
            ${this.generateTireReport(analysis.tireAnalysis)}
            
            <h3 class="text-xl font-bold mt-6 mb-3">Recommendations</h3>
            ${this.generateRecommendationsList(analysis.drivingCoaching)}
        `;
        
        reportContainer.innerHTML = reportHTML;
    }

    generateSectorTable(sectorAnalysis) {
        if (!sectorAnalysis || sectorAnalysis.length === 0) return '<p>No sector data available</p>';
        
        return `
            <table class="w-full border-collapse">
                <thead>
                    <tr class="bg-gray-100">
                        <th class="border p-2">Sector</th>
                        <th class="border p-2">Time Delta</th>
                        <th class="border p-2">Speed Delta</th>
                        <th class="border p-2">Issues</th>
                    </tr>
                </thead>
                <tbody>
                    ${sectorAnalysis.map(sector => `
                        <tr>
                            <td class="border p-2">${sector.sector}</td>
                            <td class="border p-2">${sector.timeDelta?.toFixed(3)}s</td>
                            <td class="border p-2">${sector.speedDelta?.toFixed(1)} km/h</td>
                            <td class="border p-2">${sector.issues?.join(', ') || 'None'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    generateSuspensionReport(suspension) {
        if (!suspension) return '<p>No suspension data available</p>';
        
        return `
            <ul class="list-disc pl-5 space-y-1">
                <li>Average pitch: ${suspension.averagePitch?.toFixed(2)}°</li>
                <li>Average roll: ${suspension.averageRoll?.toFixed(2)}°</li>
                <li>Bottoming events: ${suspension.bottomingCount || 0}</li>
                <li>Platform stability: ${suspension.platformStability || 'Unknown'}</li>
            </ul>
        `;
    }

    generateTireReport(tires) {
        if (!tires) return '<p>No tire data available</p>';
        
        return `
            <ul class="list-disc pl-5 space-y-1">
                <li>Average temperature: ${tires.averageTemp?.toFixed(1)}°C</li>
                <li>Temperature spread FL: ${tires.spreadFL?.toFixed(1)}°C</li>
                <li>Temperature spread FR: ${tires.spreadFR?.toFixed(1)}°C</li>
                <li>Pressure recommendation: ${tires.pressureRecommendation || 'No changes needed'}</li>
            </ul>
        `;
    }

    generateRecommendationsList(coaching) {
        if (!coaching || coaching.length === 0) return '<p>No specific recommendations</p>';
        
        return `
            <ol class="list-decimal pl-5 space-y-2">
                ${coaching.map(item => `
                    <li>
                        <strong>${item.area}</strong>: ${item.recommendation}
                        <span class="text-sm text-gray-600">(${item.expectedGain})</span>
                    </li>
                `).join('')}
            </ol>
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
            // Send to N8N chat webhook
            const response = await fetch(`${this.webhookUrl}-chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: this.sessionId,
                    message: message,
                    context: {
                        analysis: this.analysisResults,
                        driver: document.getElementById('driver-name').value,
                        track: document.getElementById('track-name').value
                    }
                })
            });

            const result = await response.json();
            
            // Remove typing indicator
            this.hideTypingIndicator();
            
            // Add AI response
            this.addAIMessage(result.response || result.message);
            
            // If there are visualizations, update them
            if (result.visualizations) {
                this.updateVisualizations(result.visualizations);
            }
            
        } catch (error) {
            console.error('Chat error:', error);
            this.hideTypingIndicator();
            this.addAIMessage('Sorry, I encountered an error processing your question. Please try again.');
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
        // Format Ayrton's message with proper styling
        return message
            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-yellow-300">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n\n/g, '</p><p class="mt-3">')
            .replace(/\n/g, '<br>')
            .replace(/^/, '<p>')
            .replace(/$/, '</p>')
            .replace(/"([^"]+)"/g, '<span class="text-yellow-200 italic">"$1"</span>');
    }

    addAIMessage(message) {
        // Redirect old AI messages to Ayrton format
        this.addAyrtonMessage(message);
    }

    showTypingIndicator() {
        const chatMessages = document.getElementById('chat-messages');
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typing-indicator';
        typingDiv.className = 'message flex items-start';
        typingDiv.innerHTML = `
            <div class="bg-purple-600 text-white rounded-lg p-3">
                <p class="font-medium">AI Race Engineer</p>
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
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.add('hidden');
        });
        
        // Show selected tab
        document.getElementById(`${tabName}-tab`).classList.remove('hidden');
        
        // Update tab buttons
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

    updateVisualizations(visualizations) {
        // Update graphs based on new data from chat response
        if (visualizations.speedTrace) {
            this.updateSpeedTrace(visualizations.speedTrace);
        }
        if (visualizations.cornerAnalysis) {
            this.updateCornerAnalysis(visualizations.cornerAnalysis);
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
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
        
        // Auto remove after 3 seconds
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
});
