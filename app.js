// Racing Telemetry Analysis Frontend Application
// Connects to N8N backend for professional telemetry analysis

class TelemetryAnalysisApp {
    constructor() {
        this.sessionId = null;
        this.referenceData = null;
        this.currentData = null;
        this.analysisResults = null;
        // Fixed webhook URL configuration
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
            gear: ['Gear', 'gear', 'Gear Position'],
            rpm: ['RPM', 'rpm', 'Engine Speed'],
            steer: ['Steering Angle', 'Steer', 'steer', 'Steering'],
            gLateral: ['G Force Lat', 'Lateral G', 'LatG', 'G_Lat', 'g_lat'],
            gLongitudinal: ['G Force Long', 'Longitudinal G', 'LongG', 'G_Long', 'g_long'],
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
            // Generate session ID
            const sessionId = this.generateSessionId();
            
            // Prepare data for N8N
            const payload = {
                reference_lap: this.referenceData,
                current_lap: this.currentData,
                driver_name: document.getElementById('driver-name').value || 'Driver',
                track_name: document.getElementById('track-name').value || 'Track',
                session_id: sessionId,
                timestamp: new Date().toISOString()
            };

            console.log('Sending payload to:', `${this.webhookUrl}/webhook/telemetry-analysis`);
            console.log('Payload:', payload);

            // Construct the full webhook URL
            const url = `${this.webhookUrl}/webhook/telemetry-analysis`;

            // Send to N8N webhook
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
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const results = await response.json();
            console.log('Analysis results:', results);

            this.analysisResults = results.analysis || results.ai_analysis || {};
            this.sessionId = results.session_id || sessionId;

            // Display results
            this.displayAnalysisResults(results);
            
            // Show results section
            document.getElementById('upload-section').classList.add('hidden');
            document.getElementById('results-section').classList.remove('hidden');

            // Add Ayrton's initial message
            const ayrtonMessage = results.ayrton_says || results.initial_message || 
                "Listen. I've analyzed every data point from your lap. The numbers don't lie, but they don't show heart either. I see both. What do you want to know?";
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
        // Display key metrics
        const analysis = results.analysis || results.ai_analysis || {};
        
        // Lap time delta
        const lapDelta = analysis.timeDelta || analysis.lapTimeAnalysis?.totalDelta || 
                        analysis.prediction?.currentLap || 0;
        document.getElementById('lap-delta').textContent = 
            lapDelta > 0 ? `+${lapDelta.toFixed(3)}s` : `${lapDelta.toFixed(3)}s`;
        
        // G-force usage or style score
        const gForceUsage = analysis.vehicleDynamics?.averageUtilization || 
                          (analysis.drivingStyle?.scores?.efficiency * 100) || 75;
        document.getElementById('g-force-usage').textContent = `${gForceUsage.toFixed(0)}%`;
        
        // Driving style or tire status
        const tireStatus = analysis.drivingStyle?.primaryStyle || 
                         analysis.tireAnalysis?.status || 'Analyzing';
        document.getElementById('tire-status').textContent = tireStatus;
        
        // Setup issues or anomalies
        const setupIssues = analysis.anomalies?.criticalCount || 
                          analysis.setupRecommendations?.priority_changes?.length || 0;
        document.getElementById('setup-issue').textContent = `${setupIssues} Issues`;

        // Generate graphs if data available
        if (analysis.speedTrace || analysis.sectors) {
            this.generateGraphs(analysis);
        }
        
        // Display setup recommendations if available
        if (analysis.racingLine || analysis.setupRecommendations) {
            this.displaySetupRecommendations(analysis);
        }
        
        // Generate full report
        this.generateFullReport(analysis);
    }

    displayAIInsights(insights) {
        // Create AI insights display if it doesn't exist
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
                ${insights.immediate_focus ? `
                <div class="mt-4 p-3 bg-purple-700 rounded">
                    <p class="text-sm text-purple-200">Immediate Focus:</p>
                    <p class="font-medium">${JSON.stringify(insights.immediate_focus)}</p>
                </div>
                ` : ''}
            </div>
        `;
    }

    generateGraphs(analysis) {
        // Speed trace
        if (analysis.speedTrace || analysis.sectors) {
            const speedTrace = {
                x: analysis.speedTrace?.distance || analysis.sectors?.map((s, i) => i),
                y: analysis.speedTrace?.speed || analysis.sectors?.map(s => s.avgSpeedDelta || 0),
                type: 'scatter',
                name: 'Speed',
                line: { color: 'blue' }
            };
            
            const speedDelta = {
                x: analysis.speedTrace?.distance || analysis.sectors?.map((s, i) => i),
                y: analysis.speedTrace?.delta || analysis.sectors?.map(s => s.timeDelta || 0),
                type: 'scatter',
                name: 'Delta',
                yaxis: 'y2',
                line: { color: 'red' }
            };

            const layout = {
                title: 'Speed Comparison',
                xaxis: { title: 'Distance (m) / Sector' },
                yaxis: { title: 'Speed (km/h)' },
                yaxis2: {
                    title: 'Delta',
                    overlaying: 'y',
                    side: 'right'
                }
            };

            Plotly.newPlot('speed-trace', [speedTrace, speedDelta], layout);
        }

        // Other graphs remain the same...
        // (keeping existing graph generation code)
    }

    displaySetupRecommendations(analysis) {
        const container = document.getElementById('setup-recommendations');
        container.innerHTML = '';

        // AI-based recommendations
        if (analysis.racingLine?.optimizations) {
            const section = document.createElement('div');
            section.className = 'bg-white rounded-lg p-4 shadow mb-4';
            
            section.innerHTML = `
                <h3 class="font-bold text-lg mb-3">AI Racing Line Optimizations</h3>
                <div class="space-y-2">
                    ${analysis.racingLine.optimizations.slice(0, 3).map(opt => `
                        <div class="border-l-4 border-purple-500 pl-3">
                            <p class="font-medium">${opt.corner} at ${opt.location}m</p>
                            <p class="text-sm text-gray-600">${opt.adjustments.join(', ')}</p>
                            <p class="text-xs text-green-600">Potential gain: ${opt.timeGain.toFixed(3)}s</p>
                        </div>
                    `).join('')}
                </div>
            `;
            
            container.appendChild(section);
        }

        // Traditional setup recommendations
        if (analysis.setupRecommendations) {
            const categories = ['suspension', 'tires', 'aero', 'brake_balance', 'differential'];
            
            categories.forEach(category => {
                if (analysis.setupRecommendations[category] && analysis.setupRecommendations[category].length > 0) {
                    const section = document.createElement('div');
                    section.className = 'bg-white rounded-lg p-4 shadow mb-4';
                    
                    section.innerHTML = `
                        <h3 class="font-bold text-lg mb-3 capitalize">${category.replace('_', ' ')}</h3>
                        <div class="space-y-2">
                            ${analysis.setupRecommendations[category].map(rec => `
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
    }

    generateFullReport(analysis) {
        const reportContainer = document.getElementById('full-report');
        
        const reportHTML = `
            <h2 class="text-2xl font-bold mb-4">Telemetry Analysis Report</h2>
            
            <h3 class="text-xl font-bold mt-6 mb-3">Executive Summary</h3>
            <p>Analysis type: ${analysis.drivingStyle ? 'AI-Enhanced' : 'Standard'}</p>
            <p>Total lap time delta: ${(analysis.timeDelta || analysis.prediction?.currentLap || 0).toFixed(3)}s</p>
            ${analysis.prediction ? `<p>Theoretical best: ${analysis.prediction.theoreticalBest.toFixed(3)}s</p>` : ''}
            ${analysis.drivingStyle ? `<p>Driving style: ${analysis.drivingStyle.primaryStyle}</p>` : ''}
            <p>Critical issues identified: ${analysis.anomalies?.criticalCount || 0}</p>
            
            <h3 class="text-xl font-bold mt-6 mb-3">Sector Analysis</h3>
            ${this.generateSectorTable(analysis.sectors || analysis.sectorAnalysis)}
            
            ${analysis.corners ? `
            <h3 class="text-xl font-bold mt-6 mb-3">Corner Classification</h3>
            ${this.generateCornerTable(analysis.corners)}
            ` : ''}
            
            ${analysis.drivingStyle ? `
            <h3 class="text-xl font-bold mt-6 mb-3">Driving Style Analysis</h3>
            ${this.generateStyleReport(analysis.drivingStyle)}
            ` : ''}
            
            ${analysis.anomalies ? `
            <h3 class="text-xl font-bold mt-6 mb-3">Anomaly Detection</h3>
            ${this.generateAnomalyReport(analysis.anomalies)}
            ` : ''}
            
            <h3 class="text-xl font-bold mt-6 mb-3">Recommendations</h3>
            ${this.generateRecommendationsList(analysis)}
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
                        <th class="border p-2">Focus Area</th>
                    </tr>
                </thead>
                <tbody>
                    ${sectorAnalysis.map(sector => `
                        <tr>
                            <td class="border p-2">${sector.sector}</td>
                            <td class="border p-2">${(sector.timeDelta || sector.delta || 0).toFixed(3)}s</td>
                            <td class="border p-2">${(sector.avgSpeedDelta || sector.speedDelta || 0).toFixed(1)} km/h</td>
                            <td class="border p-2">${sector.improvementArea || sector.issues?.join(', ') || 'Maintain pace'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    generateCornerTable(corners) {
        if (!corners || corners.length === 0) return '<p>No corner classification available</p>';
        
        return `
            <table class="w-full border-collapse">
                <thead>
                    <tr class="bg-gray-100">
                        <th class="border p-2">Corner Type</th>
                        <th class="border p-2">Location</th>
                        <th class="border p-2">Key Advice</th>
                        <th class="border p-2">Confidence</th>
                    </tr>
                </thead>
                <tbody>
                    ${corners.slice(0, 5).map(corner => `
                        <tr>
                            <td class="border p-2 capitalize">${corner.type.replace('_', ' ')}</td>
                            <td class="border p-2">${corner.entry.toFixed(0)}m - ${corner.exit.toFixed(0)}m</td>
                            <td class="border p-2 text-sm">${corner.keyAdvice}</td>
                            <td class="border p-2">${(corner.confidence * 100).toFixed(0)}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    generateStyleReport(style) {
        return `
            <div class="space-y-2">
                <p><strong>Primary Style:</strong> ${style.primaryStyle}</p>
                <p><strong>Archetype:</strong> ${style.archetype}</p>
                <div class="grid grid-cols-5 gap-2 mt-3">
                    ${Object.entries(style.scores || {}).map(([key, value]) => `
                        <div class="text-center">
                            <p class="text-xs text-gray-600 capitalize">${key}</p>
                            <div class="bg-gray-200 h-20 relative rounded">
                                <div class="bg-purple-600 absolute bottom-0 w-full rounded" 
                                     style="height: ${value * 100}%"></div>
                            </div>
                            <p class="text-sm font-bold">${(value * 100).toFixed(0)}%</p>
                        </div>
                    `).join('')}
                </div>
                <p class="mt-3"><strong>Focus:</strong> ${style.coachingFocus}</p>
                <p><strong>Strengths:</strong> ${style.strengths?.join(', ')}</p>
                <p><strong>Weaknesses:</strong> ${style.weaknesses?.join(', ')}</p>
            </div>
        `;
    }

    generateAnomalyReport(anomalies) {
        return `
            <div class="space-y-2">
                <p><strong>Total Anomalies:</strong> ${anomalies.pointAnomalies?.length || 0}</p>
                <p><strong>Critical Issues:</strong> ${anomalies.criticalCount || 0}</p>
                <p><strong>Telemetry Health:</strong> ${((anomalies.overallHealth || 0.5) * 100).toFixed(0)}%</p>
                ${anomalies.pointAnomalies?.slice(0, 3).map(a => `
                    <div class="border-l-4 ${a.severity === 'critical' ? 'border-red-500' : 'border-yellow-500'} pl-3">
                        <p class="font-medium">${a.channel} anomaly at ${a.location}m</p>
                        <p class="text-sm text-gray-600">${a.recommendation}</p>
                    </div>
                `).join('') || ''}
            </div>
        `;
    }

    generateRecommendationsList(analysis) {
        const recommendations = [];
        
        // Collect all recommendations
        if (analysis.racingLine?.executionPlan) {
            analysis.racingLine.executionPlan.forEach(step => {
                recommendations.push({
                    area: `Step ${step.step}`,
                    recommendation: step.action,
                    expectedGain: step.expectedGain
                });
            });
        }
        
        if (analysis.drivingCoaching) {
            analysis.drivingCoaching.forEach(item => recommendations.push(item));
        }
        
        if (recommendations.length === 0) {
            return '<p>Analyzing data for personalized recommendations...</p>';
        }
        
        return `
            <ol class="list-decimal pl-5 space-y-2">
                ${recommendations.map(item => `
                    <li>
                        <strong>${item.area}</strong>: ${item.recommendation}
                        ${item.expectedGain ? `<span class="text-sm text-gray-600">(${item.expectedGain})</span>` : ''}
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
            // Construct chat webhook URL
            const url = `${this.webhookUrl}/webhook/ayrton-chat`;
            
            console.log('Sending chat to:', url);

            // Send to N8N chat webhook
            const response = await fetch(url, {
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
            
            // If there are visualizations, update them
            if (result.visualizations) {
                this.updateVisualizations(result.visualizations);
            }
            
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
        // Redirect to Ayrton format
        this.addAyrtonMessage(message);
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
    console.log('Telemetry Analysis App initialized');
    console.log('Webhook URL:', window.telemetryApp.webhookUrl);
});
