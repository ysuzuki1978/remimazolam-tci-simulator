/**
 * Main Application Controller for Remimazolam TCI TIVA V1.0.0
 * Integrated Application Main Controller
 * 
 * Coordinates:
 * - Induction Engine (Real-time prediction)
 * - Advanced Protocol Engine (Enhanced step-down optimization)
 * - Monitoring Engine (Dose tracking)
 * - UI Management
 * - State Management
 */

class MainApplicationController {
    constructor() {
        this.appState = new AppState();
        this.inductionEngine = new InductionEngine();
        this.protocolEngine = new ProtocolEngine();
        this.advancedProtocolEngine = new AdvancedProtocolEngine();
        this.enhancedProtocolEngine = new EnhancedProtocolEngine();
        this.monitoringEngine = new MonitoringEngine();
        this.calculationComparator = new CalculationComparator();
        
        // Chart instances
        this.protocolChart = null;
        this.monitoringChart = null;
        this.comparisonChart = null;
        
        // Initialize on DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    initialize() {
        console.log('Initializing Remimazolam TCI TIVA V1.1.1 with Advanced Step-Down Protocol and Mobile-Optimized ±Button Controls');
        
        // Hide loading screen after short delay
        setTimeout(() => {
            document.getElementById('loadingScreen').classList.add('hidden');
        }, 2000);
        
        // Initialize default patient
        this.initializeDefaultPatient();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup induction engine callbacks
        this.setupInductionCallbacks();
        
        // Initialize default calculation methods to LSODA
        this.initializeDefaultCalculationMethods();
        
        // Update displays
        this.updatePatientDisplay();
        this.updateAllPanelStates();
        
        console.log('Application initialized successfully');
    }

    /**
     * Initialize default calculation methods to LSODA
     */
    initializeDefaultCalculationMethods() {
        try {
            // Set default calculation methods - RK4 only for consistency
            this.updateInductionNumericalMethod('rk4');  // RK4 for induction
            this.updateProtocolNumericalMethod('rk4');   // RK4 for protocol optimization
            this.updateMonitoringNumericalMethod('rk4'); // RK4 for monitoring
            
            console.log('Default calculation methods set: Induction=RK4, Protocol=RK4, Monitoring=RK4');
        } catch (error) {
            console.error('Failed to initialize default calculation methods:', error);
        }
    }

    initializeDefaultPatient() {
        const now = new Date();
        now.setHours(8, 0, 0, 0); // Default to 8:00 AM
        
        this.appState.patient = new Patient(
            `Patient-${new Date().toISOString().split('T')[0]}`,
            50,
            70.0,
            170.0,
            SexType.MALE,
            AsapsType.CLASS_1_2,
            now
        );
        
        // Calculate PK parameters for the patient
        this.calculatePatientPKParameters();
        
        // Set patient for all engines
        this.protocolEngine.setPatient(this.appState.patient);
        this.advancedProtocolEngine.setPatient(this.appState.patient);
        this.enhancedProtocolEngine.setPatient(this.appState.patient);
        this.monitoringEngine.setPatient(this.appState.patient);
        
        console.log('Default patient initialized:', this.appState.patient.id);
    }

    /**
     * Calculate PK parameters for the current patient
     */
    calculatePatientPKParameters() {
        try {
            const patient = this.appState.patient;
            const result = MasuiKe0Calculator.calculateKe0Complete(
                patient.age,
                patient.weight,
                patient.height,
                patient.sex,
                patient.asaPS
            );

            if (result.success) {
                patient.pkParams = {
                    V1: result.pkParameters.V1,
                    V2: result.pkParameters.V2,
                    V3: result.pkParameters.V3,
                    CL: result.pkParameters.CL,
                    Q2: result.pkParameters.Q2,
                    Q3: result.pkParameters.Q3,
                    ke0: result.ke0_numerical || result.ke0_regression,
                    k10: result.rateConstants.k10,
                    k12: result.rateConstants.k12,
                    k21: result.rateConstants.k21,
                    k13: result.rateConstants.k13,
                    k31: result.rateConstants.k31
                };
                
                console.log('PK parameters calculated for patient:', patient.pkParams);
            } else {
                throw new Error('Failed to calculate PK parameters: ' + result.error);
            }
        } catch (error) {
            console.error('Error calculating PK parameters:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Disclaimer modal with iOS Safari fix
        const disclaimerBtn = document.getElementById('acceptDisclaimer');
        disclaimerBtn.addEventListener('click', () => {
            this.hideDisclaimer();
        });
        disclaimerBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.hideDisclaimer();
        });
        
        // Patient information
        document.getElementById('editPatientBtn').addEventListener('click', () => {
            this.showPatientModal();
        });
        
        document.getElementById('closePatientModal').addEventListener('click', () => {
            this.hidePatientModal();
        });
        
        document.getElementById('cancelPatientEdit').addEventListener('click', () => {
            this.hidePatientModal();
        });
        
        document.getElementById('patientForm').addEventListener('submit', (e) => {
            this.savePatientData(e);
        });
        
        // Patient form sliders
        
        // Induction panel
        document.getElementById('startInductionBtn').addEventListener('click', () => {
            this.startInduction();
        });
        
        document.getElementById('stopInductionBtn').addEventListener('click', () => {
            this.stopInduction();
        });
        
        document.getElementById('recordSnapshotBtn').addEventListener('click', () => {
            this.recordSnapshot();
        });
        
        // Induction dose sliders
        // Setup ±button controls (unified event delegation)
        this.setupAdjustButtonControls();
        
        // Protocol panel
        document.getElementById('optimizeProtocolBtn').addEventListener('click', () => {
            this.optimizeProtocol();
        });
        
        // Comparison panel - REMOVED
        
        // Monitoring panel
        document.getElementById('addDoseBtn').addEventListener('click', () => {
            this.showDoseModal();
        });
        
        document.getElementById('runSimulationBtn').addEventListener('click', () => {
            this.runMonitoringSimulation();
        });
        
        document.getElementById('exportCsvBtn').addEventListener('click', () => {
            this.exportCsv();
        });
        
        // Dose modal
        document.getElementById('closeDoseModal').addEventListener('click', () => {
            this.hideDoseModal();
        });
        
        document.getElementById('cancelDoseAdd').addEventListener('click', () => {
            this.hideDoseModal();
        });
        
        document.getElementById('doseForm').addEventListener('submit', (e) => {
            this.addDoseEvent(e);
        });
        
        // Dose form sliders
        
        // Modal backdrop clicks
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    }


    // ±Button Controls - Unified Event Delegation System
    setupAdjustButtonControls() {
        // Unified event delegation for all ±buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-adjust')) {
                this.handleAdjustButton(e.target);
            }
        });

        // Long-press functionality
        document.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('btn-adjust')) {
                this.startHold(e.target);
            }
        });

        document.addEventListener('touchstart', (e) => {
            if (e.target.classList.contains('btn-adjust')) {
                e.preventDefault();
                this.startHold(e.target);
            }
        });

        // Stop hold events
        ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(event => {
            document.addEventListener(event, () => {
                this.stopHold();
            });
        });

        // Stop hold on window blur or scroll
        window.addEventListener('blur', () => {
            this.stopHold();
        });

        window.addEventListener('scroll', () => {
            this.stopHold();
        });
    }

    handleAdjustButton(button) {
        const targetId = button.getAttribute('data-target');
        const step = parseFloat(button.getAttribute('data-step'));
        const input = document.getElementById(targetId);
        
        if (!input) return;

        const isIncrement = button.classList.contains('btn-plus');
        const currentValue = parseFloat(input.value) || 0;
        const min = parseFloat(input.min);
        const max = parseFloat(input.max);
        
        let newValue = isIncrement ? currentValue + step : currentValue - step;
        
        // Apply min/max constraints
        if (!isNaN(min)) newValue = Math.max(min, newValue);
        if (!isNaN(max)) newValue = Math.min(max, newValue);
        
        // Update input value
        input.value = newValue;
        
        // Trigger change event for any listeners
        input.dispatchEvent(new Event('change'));
        
        // Update specific UI elements and handle induction updates
        this.updateUIAfterAdjustment(targetId, newValue);
    }

    updateUIAfterAdjustment(targetId, value) {
        // Handle induction dose updates
        if (targetId === 'inductionBolus' || targetId === 'inductionContinuous') {
            if (this.appState.isInductionRunning) {
                const bolusDose = parseFloat(document.getElementById('inductionBolus').value);
                const continuousDose = parseFloat(document.getElementById('inductionContinuous').value);
                this.inductionEngine.updateDose(bolusDose, continuousDose);
            }
        }
        
        // Handle BMI calculation for patient form
        if (targetId === 'editWeight' || targetId === 'editHeight') {
            this.updateBMICalculation();
        }
    }

    // Long-press functionality with progressive acceleration
    startHold(button) {
        this.stopHold(); // Clear any existing hold
        
        this.holdState = {
            button: button,
            timeout: null,
            interval: null,
            accelerationFactor: 0.9,
            currentInterval: 200
        };
        
        // Add visual feedback
        button.classList.add('holding');
        
        // Start continuous adjustment after 500ms delay
        this.holdState.timeout = setTimeout(() => {
            this.startHoldInterval(button);
        }, 500);
    }

    startHoldInterval(button) {
        this.holdState.interval = setInterval(() => {
            this.handleAdjustButton(button);
            
            // Progressive acceleration - get faster over time
            this.holdState.currentInterval *= this.holdState.accelerationFactor;
            if (this.holdState.currentInterval < 50) {
                this.holdState.currentInterval = 50; // Minimum interval
            }
            
            // Restart interval with new timing
            clearInterval(this.holdState.interval);
            this.startHoldInterval(button);
        }, this.holdState.currentInterval);
    }

    stopHold() {
        if (this.holdState) {
            if (this.holdState.timeout) {
                clearTimeout(this.holdState.timeout);
            }
            if (this.holdState.interval) {
                clearInterval(this.holdState.interval);
            }
            if (this.holdState.button) {
                this.holdState.button.classList.remove('holding');
            }
            this.holdState = null;
        }
    }


    setupInductionCallbacks() {
        this.inductionEngine.addUpdateCallback((state) => {
            this.updateInductionDisplay(state);
        });
    }

    // Modal management
    hideDisclaimer() {
        document.getElementById('disclaimerModal').classList.remove('active');
        document.getElementById('mainApp').classList.remove('hidden');
    }

    showPatientModal() {
        const modal = document.getElementById('patientModal');
        
        // Populate form with current patient data
        const patient = this.appState.patient;
        document.getElementById('editPatientId').value = patient.id;
        document.getElementById('editAge').value = patient.age;
        document.getElementById('editWeight').value = patient.weight;
        document.getElementById('editHeight').value = patient.height;
        document.querySelector(`input[name="sex"][value="${patient.sex === SexType.MALE ? 'male' : 'female'}"]`).checked = true;
        document.querySelector(`input[name="asa"][value="${patient.asaPS === AsapsType.CLASS_1_2 ? '1-2' : '3-4'}"]`).checked = true;
        document.getElementById('editAnesthesiaStart').value = patient.formattedStartTime;
        
        // Update display values
        // Values are now displayed directly in input fields
        this.updateBMICalculation();
        
        modal.classList.add('active');
    }

    hidePatientModal() {
        document.getElementById('patientModal').classList.remove('active');
    }

    showDoseModal() {
        const modal = document.getElementById('doseModal');
        
        // Reset form
        document.getElementById('doseTime').value = this.appState.patient.formattedStartTime;
        document.getElementById('doseBolusAmount').value = 0;
        document.getElementById('doseContinuousRate').value = 0;
        // Values are now displayed directly in input fields
        document.getElementById('anesthesiaStartReference').textContent = this.appState.patient.formattedStartTime;
        
        modal.classList.add('active');
    }

    hideDoseModal() {
        document.getElementById('doseModal').classList.remove('active');
    }

    // Data management
    savePatientData(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        
        // Parse time
        const timeValue = document.getElementById('editAnesthesiaStart').value;
        const anesthesiaStart = new Date(this.appState.patient.anesthesiaStartTime);
        const [hours, minutes] = timeValue.split(':').map(Number);
        anesthesiaStart.setHours(hours, minutes, 0, 0);
        
        // Update patient
        this.appState.patient.id = document.getElementById('editPatientId').value;
        this.appState.patient.age = parseInt(document.getElementById('editAge').value);
        this.appState.patient.weight = parseFloat(document.getElementById('editWeight').value);
        this.appState.patient.height = parseFloat(document.getElementById('editHeight').value);
        this.appState.patient.sex = formData.get('sex') === 'male' ? SexType.MALE : SexType.FEMALE;
        this.appState.patient.asaPS = formData.get('asa') === '1-2' ? AsapsType.CLASS_1_2 : AsapsType.CLASS_3_4;
        this.appState.patient.anesthesiaStartTime = anesthesiaStart;
        
        // Validate patient data
        const validation = this.appState.patient.validate();
        if (!validation.isValid) {
            alert('Input Error:\n' + validation.errors.join('\n'));
            return;
        }
        
        // Calculate PK parameters for the updated patient
        this.calculatePatientPKParameters();
        
        // Update engines with new patient data
        this.protocolEngine.setPatient(this.appState.patient);
        this.advancedProtocolEngine.setPatient(this.appState.patient);
        this.enhancedProtocolEngine.setPatient(this.appState.patient);
        this.monitoringEngine.setPatient(this.appState.patient);
        
        this.updatePatientDisplay();
        this.hidePatientModal();
        
        console.log('Patient data updated:', this.appState.patient.id);
    }

    addDoseEvent(e) {
        e.preventDefault();
        
        const timeValue = document.getElementById('doseTime').value;
        const bolusAmount = parseFloat(document.getElementById('doseBolusAmount').value);
        const continuousRate = parseFloat(document.getElementById('doseContinuousRate').value);
        
        // Calculate minutes from anesthesia start
        const doseTime = new Date(this.appState.patient.anesthesiaStartTime);
        const [hours, minutes] = timeValue.split(':').map(Number);
        doseTime.setHours(hours, minutes, 0, 0);
        
        let minutesFromStart = this.appState.patient.clockTimeToMinutes(doseTime);
        
        // Handle day crossing
        if (minutesFromStart < 0) {
            minutesFromStart += 1440; // Add 24 hours
        }
        
        minutesFromStart = Math.max(0, Math.round(minutesFromStart));
        
        const doseEvent = new DoseEvent(minutesFromStart, bolusAmount, continuousRate);
        
        // Validate dose event
        const validation = doseEvent.validate();
        if (!validation.isValid) {
            alert('Input Error:\n' + validation.errors.join('\n'));
            return;
        }
        
        this.monitoringEngine.addDoseEvent(doseEvent);
        this.updateMonitoringDisplay();
        this.hideDoseModal();
        
        console.log('Dose event added:', doseEvent);
    }

    // Induction management
    startInduction() {
        const bolusDose = parseFloat(document.getElementById('inductionBolus').value);
        const continuousDose = parseFloat(document.getElementById('inductionContinuous').value);
        
        if (this.inductionEngine.start(this.appState.patient, bolusDose, continuousDose)) {
            this.appState.isInductionRunning = true;
            this.updateInductionControls();
            console.log('Induction started');
        }
    }

    stopInduction() {
        if (this.inductionEngine.stop()) {
            this.appState.isInductionRunning = false;
            this.updateInductionControls();
            console.log('Induction stopped');
        }
    }

    recordSnapshot() {
        const snapshot = this.inductionEngine.takeSnapshot();
        if (snapshot) {
            this.updateSnapshotsDisplay();
            console.log('Snapshot recorded');
        }
    }

    // Advanced Protocol optimization
    optimizeProtocol() {
        const targetConcentration = parseFloat(document.getElementById('targetConcentration').value);
        const bolusDose = parseFloat(document.getElementById('protocolBolus').value);
        const targetTime = parseFloat(document.getElementById('targetReachTime').value);
        const upperThresholdRatio = parseFloat(document.getElementById('upperThresholdRatio').value) / 100;
        const reductionFactor = parseFloat(document.getElementById('reductionFactor').value) / 100;
        const adjustmentInterval = parseFloat(document.getElementById('adjustmentInterval').value);
        
        try {
            // Update enhanced protocol engine settings
            this.enhancedProtocolEngine.updateSettings({
                targetCe: targetConcentration,
                targetReachTime: targetTime,
                upperThreshold: targetConcentration * upperThresholdRatio,
                reductionFactor: reductionFactor,
                adjustmentInterval: adjustmentInterval
            });
            
            // Use enhanced protocol engine for V1.0.0
            const result = this.enhancedProtocolEngine.runEnhancedOptimization(
                targetConcentration,
                bolusDose,
                targetTime
            );
            
            this.appState.protocolResult = result;
            this.updateAdvancedProtocolDisplay(result);
            console.log('Advanced Protocol optimization completed');
        } catch (error) {
            console.error('Protocol optimization failed:', error);
            alert('An error occurred during protocol optimization:\n' + error.message);
        }
    }

    // Monitoring simulation
    runMonitoringSimulation() {
        try {
            const result = this.monitoringEngine.runSimulation();
            this.appState.simulationResult = result;
            this.updateMonitoringResults(result);
            console.log('Monitoring simulation completed');
        } catch (error) {
            console.error('Monitoring simulation failed:', error);
            alert('An error occurred during simulation execution:\n' + error.message);
        }
    }

    // CSV export
    exportCsv() {
        try {
            const csvContent = this.monitoringEngine.exportToCSV();
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            
            // Generate filename
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const timeStr = now.toTimeString().substring(0, 5).replace(':', '-');
            const patientId = this.appState.patient.id.replace(/[^a-zA-Z0-9]/g, '_');
            const filename = `${patientId}_${dateStr}_${timeStr}.csv`;
            
            // Create download link
            const link = document.createElement('a');
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', filename);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                console.log('CSV exported:', filename);
            } else {
                alert('CSV download is not supported in your browser.');
            }
        } catch (error) {
            console.error('CSV export failed:', error);
            alert('An error occurred during CSV export:\n' + error.message);
        }
    }


    // Display updates
    updatePatientDisplay() {
        const patient = this.appState.patient;
        document.getElementById('patientId').textContent = patient.id;
        document.getElementById('patientAge').textContent = `${patient.age} years`;
        document.getElementById('patientWeight').textContent = `${patient.weight.toFixed(1)} kg`;
        document.getElementById('patientHeight').textContent = `${patient.height.toFixed(0)} cm`;
        document.getElementById('patientBMI').textContent = patient.bmi.toFixed(1);
        document.getElementById('patientSex').textContent = SexType.displayName(patient.sex);
        document.getElementById('patientASA').textContent = AsapsType.displayName(patient.asaPS);
        document.getElementById('anesthesiaStartTime').textContent = patient.formattedStartTime;
    }

    updateBMICalculation() {
        const weight = parseFloat(document.getElementById('editWeight').value);
        const height = parseFloat(document.getElementById('editHeight').value);
        const bmi = weight / Math.pow(height / 100, 2);
        document.getElementById('bmiCalculated').textContent = bmi.toFixed(1);
    }

    updateInductionDisplay(state) {
        // Update Euler method values
        const eulerPlasmaElement = document.getElementById('plasmaConcentrationEuler');
        const eulerEffectElement = document.getElementById('effectConcentrationEuler');
        
        if (eulerPlasmaElement && eulerEffectElement) {
            eulerPlasmaElement.textContent = state.euler.plasmaConcentration.toFixed(3);
            eulerEffectElement.textContent = state.euler.effectSiteConcentration.toFixed(3);
            
            // Add animation class for visual feedback
            eulerPlasmaElement.classList.add('updating');
            eulerEffectElement.classList.add('updating');
            setTimeout(() => {
                eulerPlasmaElement.classList.remove('updating');
                eulerEffectElement.classList.remove('updating');
            }, 500);
        }
        
        // Update RK4 method values
        const rk4PlasmaElement = document.getElementById('plasmaConcentrationRK4');
        const rk4EffectElement = document.getElementById('effectConcentrationRK4');
        
        if (rk4PlasmaElement && rk4EffectElement) {
            rk4PlasmaElement.textContent = state.rk4.plasmaConcentration.toFixed(3);
            rk4EffectElement.textContent = state.rk4.effectSiteConcentration.toFixed(3);
            
            // Add animation class for visual feedback
            rk4PlasmaElement.classList.add('updating');
            rk4EffectElement.classList.add('updating');
            setTimeout(() => {
                rk4PlasmaElement.classList.remove('updating');
                rk4EffectElement.classList.remove('updating');
            }, 500);
        }
        
        // Update difference analysis
        const plasmaDiffElement = document.getElementById('plasmaDifference');
        const effectDiffElement = document.getElementById('effectDifference');
        
        if (plasmaDiffElement && effectDiffElement) {
            const plasmaDiff = state.difference.plasmaDifferencePercent;
            const effectDiff = state.difference.effectSiteDifferencePercent;
            
            plasmaDiffElement.textContent = plasmaDiff.toFixed(1);
            effectDiffElement.textContent = effectDiff.toFixed(1);
            
            // Color code the difference values
            plasmaDiffElement.style.color = Math.abs(plasmaDiff) > 10 ? '#f44336' : '#4caf50';
            effectDiffElement.style.color = Math.abs(effectDiff) > 10 ? '#f44336' : '#4caf50';
        }
        
        // Update elapsed time
        document.getElementById('elapsedTime').textContent = state.elapsedTimeString;
        
        // Update snapshots if available
        if (state.snapshots.length > 0) {
            this.updateSnapshotsDisplay();
        }
        
        // Update the real-time chart with dual-method data
        try {
            this.updateInductionRealtimeChart(state);
        } catch (error) {
            console.error('Chart update error:', error);
        }
    }

    updateInductionRealtimeChart(state) {
        if (!this.inductionChart) {
            // Initialize chart if not already created
            try {
                this.initializeInductionChart();
            } catch (error) {
                console.error('Failed to initialize induction chart:', error);
                return;
            }
        }

        if (this.inductionChart) {
            const currentTime = state.elapsedTime / 60; // Convert to minutes
            
            // Add new data points for unified RK4 method
            this.inductionChart.data.labels.push(currentTime.toFixed(1));
            this.inductionChart.data.datasets[0].data.push(state.rk4.plasmaConcentration);
            this.inductionChart.data.datasets[1].data.push(state.rk4.effectSiteConcentration);
            
            // Keep only last 50 data points for performance
            const maxPoints = 50;
            if (this.inductionChart.data.labels.length > maxPoints) {
                this.inductionChart.data.labels.shift();
                this.inductionChart.data.datasets.forEach(dataset => dataset.data.shift());
            }
            
            this.inductionChart.update('none'); // Update without animation for performance
        }
    }

    initializeInductionChart() {
        const ctx = document.getElementById('inductionRealtimeChart').getContext('2d');
        
        this.inductionChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Plasma Concentration',
                        data: [],
                        borderColor: '#4caf50',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        pointRadius: 0,
                        tension: 0.1
                    },
                    {
                        label: 'Effect-site Concentration',
                        data: [],
                        borderColor: '#4caf50',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        borderWidth: 1,
                        borderDash: [5, 5],
                        fill: false,
                        pointRadius: 0,
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 0
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Real-time Concentration Monitoring (RK4)'
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Time (minutes)'
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Concentration (μg/mL)'
                        },
                        min: 0
                    }
                }
            }
        });
    }

    updateInductionControls() {
        const isRunning = this.appState.isInductionRunning;
        document.getElementById('startInductionBtn').classList.toggle('hidden', isRunning);
        document.getElementById('stopInductionBtn').classList.toggle('hidden', !isRunning);
        document.getElementById('recordSnapshotBtn').classList.toggle('hidden', !isRunning);
    }

    updateSnapshotsDisplay() {
        const snapshots = this.inductionEngine.getState().snapshots;
        const container = document.getElementById('snapshotsList');
        const section = document.getElementById('snapshotsSection');
        
        if (snapshots.length > 0) {
            section.classList.remove('hidden');
            container.innerHTML = '';
            
            snapshots.forEach((snapshot, index) => {
                const item = document.createElement('div');
                item.className = 'snapshot-item';
                item.innerHTML = `
                    <div class="snapshot-header">
                        <span class="snapshot-title">Record #${snapshots.length - index}</span>
                        <span class="snapshot-time">${snapshot.formattedTime}</span>
                    </div>
                    <div class="snapshot-values">
                        <span>Plasma: ${snapshot.plasmaConcentration.toFixed(3)} μg/mL</span>
                        <span>Effect-site: ${snapshot.effectSiteConcentration.toFixed(3)} μg/mL</span>
                    </div>
                `;
                container.appendChild(item);
            });
        } else {
            section.classList.add('hidden');
        }
    }

    updateAdvancedProtocolDisplay(result) {
        document.getElementById('protocolResults').classList.remove('hidden');
        document.getElementById('optimalRate').textContent = result.optimizedRate.toFixed(3);
        document.getElementById('predictedFinalCe').textContent = result.protocol.performance.finalCe.toFixed(3);
        
        // Update enhanced metrics
        document.getElementById('targetAccuracy').textContent = result.protocol.performance.targetAccuracy.toFixed(1);
        document.getElementById('adjustmentCount').textContent = result.protocol.performance.totalAdjustments;
        document.getElementById('stabilityIndex').textContent = result.protocol.performance.stabilityIndex.toFixed(1);
        document.getElementById('convergenceTime').textContent = 
            result.protocol.performance.convergenceTime ? result.protocol.performance.convergenceTime.toFixed(1) : '∞';
        
        // Update enhanced concentration evaluation display
        this.updateConcentrationEvaluationDisplay(result.protocol.concentrationAtTimePoints);
        
        // Update chart
        this.updateAdvancedProtocolChart(result);
        
        // Update schedule table
        this.updateProtocolTable(result.protocol.dosageAdjustments);
    }

    // New method for concentration evaluation display
    updateConcentrationEvaluationDisplay(concentrationAtTimePoints) {
        const container = document.getElementById('concentrationEvaluationResults');
        if (!container) {
            console.warn('Concentration evaluation container not found');
            return;
        }
        
        container.innerHTML = '<h4>📊 Concentration Evaluation at Specified Time Points</h4>';
        
        const table = document.createElement('table');
        table.className = 'concentration-evaluation-table';
        
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = `
            <th>Time</th>
            <th>Effect-site Concentration</th>
            <th>Plasma Concentration</th>
            <th>Infusion Rate</th>
            <th>Deviation from Target</th>
            <th>Deviation Rate</th>
        `;
        table.appendChild(headerRow);
        
        concentrationAtTimePoints.forEach(point => {
            const row = document.createElement('tr');
            const deviationClass = point.percentageDeviation > 10 ? 'high-deviation' : 
                                  point.percentageDeviation > 5 ? 'medium-deviation' : 'low-deviation';
            row.className = deviationClass;
            
            row.innerHTML = `
                <td>${point.time} min</td>
                <td>${point.effectSiteConcentration.toFixed(3)} μg/mL</td>
                <td>${point.plasmaConcentration.toFixed(3)} μg/mL</td>
                <td>${point.infusionRate.toFixed(2)} mg/kg/hr</td>
                <td>${point.deviationFromTarget.toFixed(3)} μg/mL</td>
                <td>${point.percentageDeviation.toFixed(1)}%</td>
            `;
            table.appendChild(row);
        });
        
        container.appendChild(table);
        container.classList.remove('hidden');
    }

    updateMonitoringDisplay() {
        const events = this.monitoringEngine.getDoseEvents();
        const container = document.getElementById('doseEventsList');
        container.innerHTML = '';
        
        events.forEach((event, index) => {
            const item = this.createDoseEventElement(event, index);
            container.appendChild(item);
        });
    }

    updateMonitoringResults(result) {
        document.getElementById('simulationResults').classList.remove('hidden');
        document.getElementById('maxPlasmaConc').textContent = result.maxPlasmaConcentration.toFixed(3);
        document.getElementById('maxEffectConc').textContent = result.maxEffectSiteConcentration.toFixed(3);
        document.getElementById('calculationMethod').textContent = result.calculationMethod;
        
        // Update monitoring chart
        this.updateMonitoringChart(result);
    }

    createDoseEventElement(event, index) {
        const div = document.createElement('div');
        div.className = 'dose-event';
        
        const infoDiv = document.createElement('div');
        infoDiv.className = 'dose-info';
        
        const title = document.createElement('h4');
        title.textContent = `${event.timeInMinutes} min (${event.formattedClockTime(this.appState.patient)})`;
        
        const details = document.createElement('div');
        details.className = 'dose-details';
        
        if (event.bolusMg > 0 || event.continuousMgKgHr > 0) {
            if (event.bolusMg > 0) {
                const bolusSpan = document.createElement('span');
                bolusSpan.textContent = `Bolus: ${event.bolusMg.toFixed(1)}mg`;
                details.appendChild(bolusSpan);
            }
            
            if (event.continuousMgKgHr > 0) {
                const continuousSpan = document.createElement('span');
                continuousSpan.textContent = `Continuous: ${event.continuousMgKgHr.toFixed(2)}mg/kg/hr`;
                details.appendChild(continuousSpan);
            }
        } else {
            const stopSpan = document.createElement('span');
            stopSpan.textContent = 'Administration Discontinued';
            stopSpan.className = 'dose-stop';
            details.appendChild(stopSpan);
        }
        
        infoDiv.appendChild(title);
        infoDiv.appendChild(details);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-dose';
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.addEventListener('click', () => {
            this.monitoringEngine.removeDoseEvent(index);
            this.updateMonitoringDisplay();
        });
        
        div.appendChild(infoDiv);
        div.appendChild(deleteBtn);
        
        return div;
    }

    updateAdvancedProtocolChart(result) {
        const ctx = document.getElementById('protocolChart').getContext('2d');
        
        if (this.protocolChart) {
            this.protocolChart.destroy();
        }
        
        const chartData = this.enhancedProtocolEngine.getEnhancedChartData();
        if (!chartData || !chartData.times || !chartData.adjustmentTimes) {
            console.error('Chart data is incomplete:', chartData);
            return;
        }
        
        this.protocolChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.times.map(t => {
                    const clockTime = this.appState.patient.minutesToClockTime(t);
                    return clockTime.toLocaleTimeString('ja-JP', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    });
                }),
                datasets: [
                    {
                        label: 'Plasma Concentration',
                        data: chartData.plasmaConcentrations,
                        borderColor: 'rgba(0, 122, 255, 1)',
                        backgroundColor: 'rgba(0, 122, 255, 0.1)',
                        fill: false,
                        tension: 0.1
                    },
                    {
                        label: 'Effect-site Concentration',
                        data: chartData.effectSiteConcentrations,
                        borderColor: 'rgba(52, 199, 89, 1)',
                        backgroundColor: 'rgba(52, 199, 89, 0.1)',
                        fill: false,
                        tension: 0.1
                    },
                    {
                        label: 'Target Concentration',
                        data: chartData.targetLine,
                        borderColor: 'rgba(255, 59, 48, 0.8)',
                        backgroundColor: 'rgba(255, 59, 48, 0.1)',
                        fill: false,
                        borderDash: [5, 5],
                        tension: 0,
                        pointRadius: 0
                    },
                    {
                        label: 'Upper Threshold',
                        data: chartData.upperThresholdLine,
                        borderColor: 'rgba(255, 149, 0, 0.8)',
                        backgroundColor: 'rgba(255, 149, 0, 0.1)',
                        fill: false,
                        borderDash: [2, 2],
                        tension: 0,
                        pointRadius: 0
                    },
                    {
                        label: 'Infusion Rate (mg/kg/hr)',
                        data: chartData.infusionRates,
                        borderColor: 'rgba(88, 86, 214, 1)',
                        backgroundColor: 'rgba(88, 86, 214, 0.1)',
                        fill: false,
                        tension: 0.1,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Concentration (μg/mL)'
                        },
                        beginAtZero: true
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Infusion Rate (mg/kg/hr)'
                        },
                        beginAtZero: true,
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                },
                plugins: {
                    annotation: {
                        annotations: (chartData.adjustmentTimes || []).map((time, index) => ({
                            type: 'line',
                            mode: 'vertical',
                            scaleID: 'x',
                            value: time,
                            borderColor: 'rgba(255, 59, 48, 0.7)',
                            borderWidth: 2,
                            label: {
                                content: `Adjustment ${index + 1}`,
                                enabled: true,
                                position: 'top'
                            }
                        }))
                    }
                }
            }
        });
    }

    updateMonitoringChart(result) {
        const ctx = document.getElementById('monitoringChart').getContext('2d');
        
        if (this.monitoringChart) {
            this.monitoringChart.destroy();
        }
        
        const chartData = this.monitoringEngine.getChartData();
        if (!chartData) return;
        
        this.monitoringChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [
                    {
                        label: 'Plasma Concentration',
                        data: chartData.plasmaData,
                        borderColor: 'rgba(0, 122, 255, 1)',
                        backgroundColor: 'rgba(0, 122, 255, 0.1)',
                        fill: false,
                        tension: 0.1,
                        pointRadius: 1
                    },
                    {
                        label: 'Effect-site Concentration',
                        data: chartData.effectData,
                        borderColor: 'rgba(52, 199, 89, 1)',
                        backgroundColor: 'rgba(52, 199, 89, 0.1)',
                        fill: false,
                        tension: 0.1,
                        pointRadius: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Concentration (μg/mL)'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    updateProtocolTable(dosageAdjustments) {
        const container = document.getElementById('protocolTable');
        container.innerHTML = '';
        
        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Time</th>
                    <th>Action</th>
                    <th>Dose Change</th>
                    <th>Concentration</th>
                    <th>Reason</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        `;
        
        const tbody = table.querySelector('tbody');
        
        // Add initial bolus row
        const initialRow = document.createElement('tr');
        initialRow.innerHTML = `
            <td>0 min</td>
            <td>Initial Bolus</td>
            <td>-</td>
            <td>-</td>
            <td>Induction Administration</td>
        `;
        tbody.appendChild(initialRow);
        
        // Add continuous infusion start row
        const infusionStartRow = document.createElement('tr');
        infusionStartRow.innerHTML = `
            <td>0 min</td>
            <td>Start Continuous Infusion</td>
            <td>-</td>
            <td>-</td>
            <td>Optimized Initial Infusion Rate</td>
        `;
        tbody.appendChild(infusionStartRow);
        
        // Add dosage adjustments
        dosageAdjustments.forEach(adjustment => {
            const row = document.createElement('tr');
            const typeClass = adjustment.type === 'predictive_adjustment' ? 'predictive' : 'reactive';
            row.className = typeClass;
            row.innerHTML = `
                <td>${adjustment.time.toFixed(1)} min</td>
                <td>Dose Adjustment</td>
                <td>${adjustment.oldRate.toFixed(2)} → ${adjustment.newRate.toFixed(2)} mg/kg/hr</td>
                <td>${adjustment.ceAtEvent.toFixed(3)} μg/mL</td>
                <td>${adjustment.reason}</td>
            `;
            tbody.appendChild(row);
        });
        
        container.appendChild(table);
    }

    updateAllPanelStates() {
        this.updateInductionControls();
        this.updateMonitoringDisplay();
    }

    // === Comparison Framework Methods ===

    /**
     * Run calculation method comparison
     */
    async runComparison() {
        try {
            console.log('Starting calculation method comparison...');
            
            const bolusDose = parseFloat(document.getElementById('comparisonBolus').value);
            const continuousRate = parseFloat(document.getElementById('comparisonRate').value);
            
            if (isNaN(bolusDose) || isNaN(continuousRate)) {
                alert('Please enter valid values for bolus dose and continuous rate.');
                return;
            }
            
            // Get selected methods
            const selectedMethods = [];
            document.querySelectorAll('.method-checkboxes input[type="checkbox"]:checked').forEach(checkbox => {
                selectedMethods.push(checkbox.value);
            });
            
            if (selectedMethods.length === 0) {
                alert('Please select at least one calculation method to compare.');
                return;
            }
            
            // Disable button during comparison
            const runBtn = document.getElementById('runComparisonBtn');
            runBtn.disabled = true;
            runBtn.textContent = 'Running Comparison...';
            
            // Prepare protocol parameters
            const protocol = {
                bolusDose: bolusDose,
                continuousRate: continuousRate,
                targetCe: 1.0,
                simulationDuration: 120
            };
            
            // Debug: Log patient and protocol before comparison
            console.log('Patient for comparison:', this.appState.patient);
            console.log('Patient pkParams:', this.appState.patient.pkParams);
            console.log('Protocol:', protocol);
            console.log('Selected methods:', selectedMethods);
            
            // Run comparison
            const results = await this.calculationComparator.runComparison(
                this.appState.patient,
                protocol,
                selectedMethods
            );
            
            console.log('Comparison results:', results);
            
            // Display results
            this.displayComparisonResults(results);
            
            // Show download buttons
            document.getElementById('downloadComparisonCsvBtn').classList.remove('hidden');
            document.getElementById('downloadMetricsCsvBtn').classList.remove('hidden');
            
            console.log('Comparison completed successfully');
            
        } catch (error) {
            console.error('Comparison failed:', error);
            alert('An error occurred during comparison: ' + error.message);
        } finally {
            // Re-enable button
            const runBtn = document.getElementById('runComparisonBtn');
            runBtn.disabled = false;
            runBtn.textContent = 'Run Comparison';
        }
    }

    /**
     * Display comparison results
     */
    displayComparisonResults(results) {
        const resultsContainer = document.getElementById('comparisonResults');
        const metricsTable = document.getElementById('metrics-tbody');
        
        if (!resultsContainer) {
            console.error('comparisonResults element not found');
            return;
        }
        
        if (!metricsTable) {
            console.error('metrics-tbody element not found');
            return;
        }
        
        // Clear previous results
        metricsTable.innerHTML = '';
        
        // Get metrics
        const metrics = this.calculationComparator.getMetrics();
        console.log('Retrieved metrics:', metrics);
        
        if (metrics.length === 0) {
            if (metricsTable) {
                metricsTable.innerHTML = '<tr><td colspan="8">No comparison metrics available.</td></tr>';
            }
            resultsContainer.classList.remove('hidden');
            return;
        }
        
        // Populate existing metrics table tbody
        if (metricsTable) {
            metrics.forEach(metric => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="method-name">${metric.methodName}</td>
                    <td>${metric.executionTime ? metric.executionTime.toFixed(2) : 'N/A'}</td>
                    <td>${metric.memoryUsage ? metric.memoryUsage.toLocaleString() : 'N/A'}</td>
                    <td>${metric.dataPoints || 'N/A'}</td>
                    <td>${metric.maxEffectSiteConc ? metric.maxEffectSiteConc.toFixed(3) : 'N/A'}</td>
                    <td>${metric.finalEffectSiteConc ? metric.finalEffectSiteConc.toFixed(3) : 'N/A'}</td>
                    <td>${metric.awakeningTime ? metric.awakeningTime.toFixed(1) : 'N/A'}</td>
                    <td>${metric.rmse ? metric.rmse.toFixed(6) : 'N/A'}</td>
                `;
                metricsTable.appendChild(row);
            });
        }
        
        // Update comparison chart
        this.updateComparisonChart(results);
        
        // Show results
        resultsContainer.classList.remove('hidden');
    }

    /**
     * Update comparison chart
     */
    updateComparisonChart(results) {
        const ctx = document.getElementById('comparisonChart').getContext('2d');
        
        // Destroy existing chart
        if (this.comparisonChart) {
            this.comparisonChart.destroy();
        }
        
        // Prepare datasets
        const datasets = [];
        const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
        let colorIndex = 0;
        
        for (const [methodKey, methodData] of results) {
            if (methodData.error) continue;
            
            const timeSeriesData = methodData.result.timeSeriesData;
            const color = colors[colorIndex % colors.length];
            
            datasets.push({
                label: methodData.methodName,
                data: timeSeriesData.map(d => ({ x: d.time, y: d.ce })),
                borderColor: color,
                backgroundColor: color + '20',
                borderWidth: 2,
                fill: false,
                tension: 0.1
            });
            
            colorIndex++;
        }
        
        // Create chart
        this.comparisonChart = new Chart(ctx, {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: 'Time (minutes)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Effect-Site Concentration (μg/mL)'
                        },
                        beginAtZero: true
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Calculation Method Comparison - Effect-Site Concentration'
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });
    }

    /**
     * Download comparison CSV data
     */
    downloadComparisonCsv() {
        try {
            const csvContent = this.calculationComparator.generateComparisonCSV();
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            
            // Generate filename
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const timeStr = now.toTimeString().substring(0, 5).replace(':', '-');
            const patientId = this.appState.patient.id.replace(/[^a-zA-Z0-9]/g, '_');
            const filename = `${patientId}_comparison_data_${dateStr}_${timeStr}.csv`;
            
            this.calculationComparator.downloadCSV(csvContent, filename);
            console.log('Comparison data CSV downloaded:', filename);
            
        } catch (error) {
            console.error('Comparison CSV export failed:', error);
            alert('An error occurred during CSV export: ' + error.message);
        }
    }

    /**
     * Download comparison metrics CSV
     */
    downloadMetricsCsv() {
        try {
            const csvContent = this.calculationComparator.generateMetricsCSV();
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            
            // Generate filename
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const timeStr = now.toTimeString().substring(0, 5).replace(':', '-');
            const patientId = this.appState.patient.id.replace(/[^a-zA-Z0-9]/g, '_');
            const filename = `${patientId}_comparison_metrics_${dateStr}_${timeStr}.csv`;
            
            this.calculationComparator.downloadCSV(csvContent, filename);
            console.log('Comparison metrics CSV downloaded:', filename);
            
        } catch (error) {
            console.error('Metrics CSV export failed:', error);
            alert('An error occurred during CSV export: ' + error.message);
        }
    }

    // === Phase1-005 Numerical Methods Integration ===

    /**
     * Update numerical method for comparison panel
     */
    updateNumericalMethod(method) {
        try {
            // Update current method indicator
            const indicator = document.getElementById('current-method-indicator');
            if (indicator) {
                const methodNames = {
                    euler: 'Euler (Current/Fast)',
                    rk4: 'RK4 (Recommended)',
                    rk45: 'RK45 (Adaptive High-Precision)'
                };
                
                indicator.textContent = `Current Method: ${methodNames[method] || method}`;
                
                // Add performance note for RK45
                if (method === 'rk45') {
                    indicator.innerHTML += ' <span class="info">(Adaptive step size)</span>';
                }
            }

            // Store current method for future use
            this.currentNumericalMethod = method;
            
            console.log(`Numerical method updated to: ${method}`);
            
        } catch (error) {
            console.error('Failed to update numerical method:', error);
        }
    }

    /**
     * Update numerical method for monitoring panel
     */
    updateMonitoringNumericalMethod(method) {
        try {
            // Update monitoring method indicator
            const indicator = document.getElementById('monitoring-method-indicator');
            if (indicator) {
                const methodNames = {
                    euler: 'Euler (Fast)',
                    rk4: 'RK4 (Classic)',
                    rk45: 'RK45 (Adaptive High-Precision)'
                };
                
                indicator.textContent = `Current Method: ${methodNames[method] || method}`;
                
                // Add performance note for RK45
                if (method === 'rk45') {
                    indicator.innerHTML += ' <span class="info">(Higher accuracy)</span>';
                }
            }

            // Update monitoring engine if available
            if (this.monitoringEngine && this.monitoringEngine.setCalculationMethod) {
                this.monitoringEngine.setCalculationMethod(method);
            }

            // Store current monitoring method
            this.currentMonitoringMethod = method;
            
            console.log(`Monitoring numerical method updated to: ${method}`);
            
        } catch (error) {
            console.error('Failed to update monitoring numerical method:', error);
        }
    }

    /**
     * Update Real-time Induction numerical method
     */
    updateInductionNumericalMethod(method) {
        try {
            // Update induction method indicator
            const indicator = document.getElementById('induction-method-indicator');
            if (indicator) {
                const methodNames = {
                    dual: 'Dual Display (Euler + RK4)',
                    euler: 'Euler (Fast)',
                    rk4: 'RK4 (Recommended)',
                    rk45: 'RK45 (Adaptive High-Precision)'
                };
                
                indicator.textContent = `Current Method: ${methodNames[method] || method}`;
                
                // Add performance note for RK45
                if (method === 'rk45') {
                    indicator.innerHTML += ' <span class="info">(Adaptive step size)</span>';
                }
            }

            // Update UI display mode based on method selection
            this.updateInductionDisplayMode(method);
            
            // Force re-render if induction is not running
            if (!this.inductionEngine.isRunning) {
                setTimeout(() => {
                    this.updateInductionDisplayMode(method);
                }, 100);
            }

            // Update induction engine if available
            if (this.inductionEngine && this.inductionEngine.setCalculationMethod) {
                this.inductionEngine.setCalculationMethod(method);
            }

            // Store current induction method
            this.currentInductionMethod = method;
            
            console.log(`Induction numerical method updated to: ${method}`);
            
        } catch (error) {
            console.error('Failed to update induction numerical method:', error);
        }
    }

    /**
     * Update the display mode for induction based on selected method
     */
    updateInductionDisplayMode(method) {
        const dualDisplay = document.querySelector('.dual-concentration-display');
        const multiMethodIndicator = document.querySelector('.multi-method-indicator');
        
        if (method === 'dual') {
            // Show dual comparison display
            if (dualDisplay) dualDisplay.style.display = 'grid';
            if (multiMethodIndicator) multiMethodIndicator.style.display = 'block';
            // Ensure all columns are visible for dual mode
            this.configureSingleMethodDisplay('dual');
        } else {
            // Show single method display - modify the dual display to show only selected method
            if (dualDisplay) {
                dualDisplay.style.display = 'grid';
                this.configureSingleMethodDisplay(method);
            }
            if (multiMethodIndicator) {
                multiMethodIndicator.style.display = 'none';
            }
        }
    }

    /**
     * Configure display for single method mode
     */
    configureSingleMethodDisplay(method) {
        const dualDisplay = document.querySelector('.dual-concentration-display');
        const eulerColumn = document.querySelector('.euler-column');
        const rk4Column = document.querySelector('.rk4-column');
        const diffColumn = document.querySelector('.difference-column');
        
        console.log(`Configuring display for method: ${method}`);
        console.log('Found elements:', { dualDisplay: !!dualDisplay, eulerColumn: !!eulerColumn, rk4Column: !!rk4Column, diffColumn: !!diffColumn });
        
        if (method === 'euler') {
            // Show only Euler column
            if (dualDisplay) {
                dualDisplay.style.gridTemplateColumns = '1fr';
                dualDisplay.style.display = 'grid';
            }
            if (eulerColumn) {
                eulerColumn.style.display = 'block';
                eulerColumn.style.visibility = 'visible';
            }
            if (rk4Column) {
                rk4Column.style.display = 'none';
                rk4Column.style.visibility = 'hidden';
            }
            if (diffColumn) {
                diffColumn.style.display = 'none';
                diffColumn.style.visibility = 'hidden';
            }
        } else if (method === 'rk4') {
            // Show only RK4 column
            if (dualDisplay) {
                dualDisplay.style.gridTemplateColumns = '1fr';
                dualDisplay.style.display = 'grid';
            }
            if (eulerColumn) {
                eulerColumn.style.display = 'none';
                eulerColumn.style.visibility = 'hidden';
            }
            if (rk4Column) {
                rk4Column.style.display = 'block';
                rk4Column.style.visibility = 'visible';
            }
            if (diffColumn) {
                diffColumn.style.display = 'none';
                diffColumn.style.visibility = 'hidden';
            }
        } else if (method === 'dual') {
            // Show all three columns
            if (dualDisplay) {
                dualDisplay.style.gridTemplateColumns = '1fr 1fr 1fr';
                dualDisplay.style.display = 'grid';
            }
            if (eulerColumn) {
                eulerColumn.style.display = 'block';
                eulerColumn.style.visibility = 'visible';
            }
            if (rk4Column) {
                rk4Column.style.display = 'block';
                rk4Column.style.visibility = 'visible';
            }
            if (diffColumn) {
                diffColumn.style.display = 'block';
                diffColumn.style.visibility = 'visible';
            }
        }
        
        console.log(`Display configured for ${method} method`);
    }

    /**
     * Update Advanced Protocol numerical method
     */
    updateProtocolNumericalMethod(method) {
        try {
            // Update protocol method indicator
            const indicator = document.getElementById('protocol-method-indicator');
            if (indicator) {
                const methodNames = {
                    euler: 'Euler (Fast)',
                    rk4: 'RK4 (Classic)',
                    rk45: 'RK45 (Adaptive High-Precision)'
                };
                
                indicator.textContent = `Current Method: ${methodNames[method] || method}`;
                
                // Add performance note for RK45
                if (method === 'rk45') {
                    indicator.innerHTML += ' <span class="info">(Higher precision)</span>';
                }
            }

            // Update protocol engines if available
            if (this.protocolEngine && this.protocolEngine.setCalculationMethod) {
                this.protocolEngine.setCalculationMethod(method);
            }
            
            if (this.advancedProtocolEngine && this.advancedProtocolEngine.setCalculationMethod) {
                this.advancedProtocolEngine.setCalculationMethod(method);
            }
            
            if (this.enhancedProtocolEngine && this.enhancedProtocolEngine.setCalculationMethod) {
                this.enhancedProtocolEngine.setCalculationMethod(method);
            }

            // Store current protocol method
            this.currentProtocolMethod = method;
            
            console.log(`Protocol numerical method updated to: ${method}`);
            
        } catch (error) {
            console.error('Failed to update protocol numerical method:', error);
        }
    }

    /**
     * Show method comparison modal/interface
     */
    showMethodComparison() {
        try {
            if (!this.appState.patient) {
                alert('Please set patient information first');
                return;
            }

            // Show comparison results section
            const comparisonResults = document.getElementById('comparisonResults');
            if (comparisonResults) {
                comparisonResults.classList.remove('hidden');
            }

            // Generate comparative chart
            this.generateComparativeChart();

            console.log('Method comparison interface displayed');
            
        } catch (error) {
            console.error('Failed to show method comparison:', error);
            alert('Failed to show method comparison: ' + error.message);
        }
    }

    /**
     * Generate comparative chart for selected methods
     */
    generateComparativeChart() {
        try {
            // Check if NumericalSolvers is available
            if (typeof NumericalSolvers === 'undefined') {
                console.warn('NumericalSolvers not available, using fallback comparison');
                return;
            }

            // Get selected methods from checkboxes
            const selectedMethods = [];
            ['euler', 'rk4', 'rk45'].forEach(method => {
                const checkbox = document.getElementById(`method-${method}`);
                if (checkbox && checkbox.checked) {
                    selectedMethods.push(method);
                }
            });

            if (selectedMethods.length === 0) {
                alert('Please select at least one method to compare');
                return;
            }

            // Get test parameters
            const bolusDose = parseFloat(document.getElementById('comparisonBolus').value) || 10;
            const continuousRate = parseFloat(document.getElementById('comparisonRate').value) || 2.0;
            const scenario = document.getElementById('test-scenario').value || 'induction';

            // Create test dose events based on scenario
            const doseEvents = this.createTestScenario(scenario, bolusDose, continuousRate);

            // Initialize numerical methods comparison
            const solvers = new NumericalSolvers();
            const adapter = new PKPDIntegrationAdapter(this.getPatientPKParameters());

            const datasets = [];
            const metricsData = [];

            // Compare each selected method
            for (const method of selectedMethods) {
                try {
                    adapter.setMethod(method);
                    const startTime = performance.now();
                    
                    const result = adapter.simulate(
                        doseEvents,
                        this.appState.patient,
                        60, // 60 minutes simulation
                        { timeStep: 0.1 }
                    );
                    
                    const endTime = performance.now();
                    const computationTime = endTime - startTime;

                    // Prepare chart dataset
                    datasets.push({
                        label: `${method.toUpperCase()} - Effect Site`,
                        data: result.timeSeriesData.map(point => ({
                            x: point.time,
                            y: point.effectSiteConcentration
                        })),
                        borderColor: this.getMethodColor(method),
                        backgroundColor: this.getMethodColor(method, 0.1),
                        fill: false
                    });

                    // Calculate metrics
                    const metrics = this.calculateMethodMetrics(result, method, computationTime);
                    metricsData.push(metrics);

                } catch (error) {
                    console.error(`Error with ${method} method:`, error);
                    metricsData.push({
                        method: method.toUpperCase(),
                        maxError: 'ERROR',
                        rmse: 'ERROR',
                        computationTime: 'ERROR',
                        stepsUsed: 'ERROR',
                        stability: 'FAILED'
                    });
                }
            }

            // Update chart
            this.updateComparisonChart(datasets);

            // Update metrics table
            this.updateMetricsTable(metricsData);

            console.log('Comparative chart generated successfully');

        } catch (error) {
            console.error('Failed to generate comparative chart:', error);
            alert('Failed to generate comparison: ' + error.message);
        }
    }

    /**
     * Create test scenario dose events
     */
    createTestScenario(scenario, bolusDose, continuousRate) {
        const scenarios = {
            bolus: [
                new DoseEvent(0, bolusDose, 0) // Bolus only
            ],
            induction: [
                new DoseEvent(0, bolusDose, continuousRate) // Standard induction
            ],
            maintenance: [
                new DoseEvent(0, bolusDose, continuousRate),
                new DoseEvent(30, 0, continuousRate * 0.8) // Rate reduction
            ],
            awakening: [
                new DoseEvent(0, bolusDose, continuousRate),
                new DoseEvent(45, 0, 0) // Stop infusion
            ],
            stiff: [
                new DoseEvent(0, bolusDose * 1.5, continuousRate * 1.2) // High dose for stiffness test
            ]
        };

        return scenarios[scenario] || scenarios.induction;
    }

    /**
     * Get method color for chart
     */
    getMethodColor(method, alpha = 1.0) {
        const colors = {
            euler: alpha < 1 ? `rgba(255, 99, 132, ${alpha})` : '#FF6384',
            rk4: alpha < 1 ? `rgba(54, 162, 235, ${alpha})` : '#36A2EB',
            rk45: alpha < 1 ? `rgba(75, 192, 192, ${alpha})` : '#4BC0C0'
        };
        return colors[method] || '#999999';
    }

    /**
     * Calculate method performance metrics
     */
    calculateMethodMetrics(result, method, computationTime) {
        try {
            const data = result.timeSeriesData;
            const targetCe = 1.0; // Assumed target concentration
            
            // Calculate errors
            const errors = data.map(point => 
                Math.abs(point.effectSiteConcentration - targetCe) / targetCe * 100
            );
            const maxError = Math.max(...errors);
            
            // Calculate RMSE
            const squaredErrors = errors.map(e => e * e);
            const rmse = Math.sqrt(squaredErrors.reduce((sum, e) => sum + e, 0) / squaredErrors.length);
            
            // Stability assessment
            const finalPoints = data.slice(-10); // Last 10 points
            const concentrations = finalPoints.map(p => p.effectSiteConcentration);
            const stability = this.assessStability(concentrations);

            return {
                method: method.toUpperCase(),
                maxError: maxError.toFixed(2) + '%',
                rmse: rmse.toFixed(4),
                computationTime: computationTime.toFixed(1) + 'ms',
                stepsUsed: data.length,
                stability: stability
            };

        } catch (error) {
            console.error('Error calculating metrics:', error);
            return {
                method: method.toUpperCase(),
                maxError: 'ERROR',
                rmse: 'ERROR',
                computationTime: 'ERROR',
                stepsUsed: 'ERROR',
                stability: 'ERROR'
            };
        }
    }

    /**
     * Assess numerical stability
     */
    assessStability(concentrations) {
        if (concentrations.length < 2) return 'UNKNOWN';
        
        const variations = [];
        for (let i = 1; i < concentrations.length; i++) {
            variations.push(Math.abs(concentrations[i] - concentrations[i-1]));
        }
        
        const avgVariation = variations.reduce((sum, v) => sum + v, 0) / variations.length;
        
        if (avgVariation < 0.001) return 'EXCELLENT';
        if (avgVariation < 0.01) return 'GOOD';
        if (avgVariation < 0.1) return 'FAIR';
        return 'POOR';
    }

    /**
     * Update comparison chart
     */
    updateComparisonChart(datasets) {
        try {
            const canvas = document.getElementById('comparisonChart');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');

            // Destroy existing chart
            if (this.comparisonChart) {
                this.comparisonChart.destroy();
            }

            // Create new chart
            this.comparisonChart = new Chart(ctx, {
                type: 'line',
                data: { datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Numerical Method Comparison - Effect Site Concentration'
                        },
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    },
                    scales: {
                        x: {
                            type: 'linear',
                            position: 'bottom',
                            title: {
                                display: true,
                                text: 'Time (minutes)'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Effect Site Concentration (μg/mL)'
                            }
                        }
                    }
                }
            });

        } catch (error) {
            console.error('Failed to update comparison chart:', error);
        }
    }

    /**
     * Update metrics table
     */
    updateMetricsTable(metricsData) {
        try {
            const tbody = document.getElementById('metrics-tbody');
            if (!tbody) return;

            // Clear existing rows
            tbody.innerHTML = '';

            // Add new rows
            for (const metrics of metricsData) {
                const row = tbody.insertRow();
                row.insertCell(0).textContent = metrics.method;
                row.insertCell(1).textContent = metrics.maxError;
                row.insertCell(2).textContent = metrics.rmse;
                row.insertCell(3).textContent = metrics.computationTime;
                row.insertCell(4).textContent = metrics.stepsUsed;
                
                const stabilityCell = row.insertCell(5);
                stabilityCell.textContent = metrics.stability;
                stabilityCell.className = `stability-${metrics.stability.toLowerCase()}`;
            }

        } catch (error) {
            console.error('Failed to update metrics table:', error);
        }
    }

    /**
     * Download comparison CSV data
     */
    downloadComparisonCSV() {
        try {
            if (!this.calculationComparator.getResults() || this.calculationComparator.getResults().size === 0) {
                alert('No comparison data available. Please run a comparison first.');
                return;
            }

            const csvContent = this.calculationComparator.generateComparisonCSV();
            
            // Create download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            
            // Generate filename
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const timeStr = now.toTimeString().substring(0, 5).replace(':', '-');
            const filename = `comparison_data_${dateStr}_${timeStr}.csv`;
            
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            console.log('Comparison CSV downloaded:', filename);

        } catch (error) {
            console.error('Failed to download comparison CSV:', error);
            alert('Failed to download comparison CSV: ' + error.message);
        }
    }

    /**
     * Download method performance report
     */
    downloadMethodReport() {
        try {
            if (!this.calculationComparator.getMetrics() || this.calculationComparator.getMetrics().length === 0) {
                alert('No metrics data available. Please run a comparison first.');
                return;
            }

            const csvContent = this.calculationComparator.generateMetricsCSV();
            
            // Create download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            
            // Generate filename
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const timeStr = now.toTimeString().substring(0, 5).replace(':', '-');
            const filename = `metrics_report_${dateStr}_${timeStr}.csv`;
            
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            console.log('Metrics CSV downloaded:', filename);

        } catch (error) {
            console.error('Failed to download method report:', error);
            alert('Failed to download method report: ' + error.message);
        }
    }

    /**
     * Get patient PK parameters for numerical methods integration
     */
    getPatientPKParameters() {
        if (!this.appState.patient) {
            throw new Error('Patient not set');
        }

        const result = MasuiKe0Calculator.calculateKe0Complete(
            this.appState.patient.age,
            this.appState.patient.weight,
            this.appState.patient.height,
            this.appState.patient.sex,
            this.appState.patient.asaPS
        );

        if (!result.success) {
            throw new Error('Failed to calculate PK parameters');
        }

        return {
            V1: result.pkParameters.V1,
            V2: result.pkParameters.V2,
            V3: result.pkParameters.V3,
            CL: result.pkParameters.CL,
            Q2: result.pkParameters.Q2,
            Q3: result.pkParameters.Q3,
            ke0: result.ke0_numerical || result.ke0_regression,
            k10: result.rateConstants.k10,
            k12: result.rateConstants.k12,
            k21: result.rateConstants.k21,
            k13: result.rateConstants.k13,
            k31: result.rateConstants.k31
        };
    }
}

// Initialize application when script loads
const app = new MainApplicationController();

// Export for global access
if (typeof window !== 'undefined') {
    window.app = app;
    
    // Global functions for HTML onclick events (Phase1-005)
    window.updateNumericalMethod = (method) => app.updateNumericalMethod(method);
    window.updateMonitoringNumericalMethod = (method) => app.updateMonitoringNumericalMethod(method);
    window.updateInductionNumericalMethod = (method) => app.updateInductionNumericalMethod(method);
    window.updateProtocolNumericalMethod = (method) => app.updateProtocolNumericalMethod(method);
    window.showMethodComparison = () => app.showMethodComparison();
    window.downloadComparisonCSV = () => app.downloadComparisonCSV();
    window.downloadMethodReport = () => app.downloadMethodReport();
}