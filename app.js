// Complete Racing Telemetry Analysis Frontend Application
// Updated to properly store and pass session data for chat functionality

class TelemetryAnalysisApp {
    constructor() {
        this.sessionId = null;
        this.sessionData = null;
        this.referenceData = null;
        this.currentData = null;
        this.analysisResults = null;
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
        const detectedChannels = this.detectChannels(columns);
        
        this.displayChannelDetection(detectedChannels);
    }

    detectChannels(columns) {
        const requiredChannels = {
            time: ['Time', 'time', 'Elapsed Time', 'Session Time', 't'],
            distance: ['Distance', 'Lap Distance', 'Dist', 'distance', 'LapDist'],
            speed: ['Speed', 'Ground Speed', 'Vehicle Speed', 'GPS Speed', 'speed']
        };
        
        const optionalChannels = {
            throttle: ['Throttle', 'Throttle Pos', 'TPS', 'throttle'],
            brake: ['Brake', 'Brake Pressure', 'Brake Pres Front', 'brake'],
            gear: ['Gear', 'gear', 'Gear Position'],
            rpm: ['RPM', 'rpm', 'Engine Speed'],
            steer: ['Steering Angle', 'Steer', 'steer', 'Steering'],
            gLateral: ['G Force Lat', 'Lateral G', 'LatG', 'G_Lat', 'g_lat'],
            gLongitudinal: ['G Force Long', 'Longitudinal G', 'LongG', 'G_Long', 'g_long']
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
        
        return detected;
    }

    displayChannelDetection(detected) {
        let message = '';
        
        if (detected.missing.length > 0) {
            this.showNotification(
                `Missing required channels: ${detected.missing.join(', ')}. Check channel documentation.`, 
                'error'
            );
            document.getElementById('analyze-btn').disabled = true;
            
            message = '<a href="channel_documentation.html" target="_blank" class="text-blue-600 underline">View Channel Documentation</a>';
        } else {
            const channelCount = Object.keys(detected.required).length + Object.keys(detected.optional).length;
            message = `✅ Detected ${channelCount} channels. Analysis capabilities: ${detected.capabilities.join(', ')}`;
            
            this.showNotification(`Channels detected successfully! ${detected.capabilities.length} analysis types available.`, 'success');
        }
        
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
            const sessionId = this.generateSessionId();
            
            const payload = {
                reference_lap: this.referenceData,
                current_lap: this.currentData,
                driver_name: document.getElementById('driver-name').value || 'Driver',
                track_name: document.getElementById('track-name').value || 'Track',
                session_id: sessionId,
                timestamp: new Date().toISOString()
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
                        track: document.getElementById('track-name').value
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Chat response:', result);
            
            // Remove typing indicator
            this.hideTypingIndicator();
            
            // Add AI response
            const responseMessage = result.ayrton_says || result.response || result.message || 
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
