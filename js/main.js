/**
 * Main Application Controller for Remimazolam TCI TIVA V2.0.0
 * Seamless 3-step workflow: Induction -> Protocol -> Monitoring
 */

class MainApplicationController {
    constructor() {
        this.appState = new AppState();
        this.inductionEngine = new InductionEngine();
        this.protocolEngine = new ProtocolEngine();
        this.advancedProtocolEngine = new AdvancedProtocolEngine();
        this.enhancedProtocolEngine = new EnhancedProtocolEngine();
        this.monitoringEngine = new MonitoringEngine();

        // Chart instances
        this.inductionChart = null;
        this.inductionChartData = { times: [], plasma: [], effect: [] };
        this.protocolChart = null;
        this.monitoringChart = null;

        // Wizard state
        this.currentStep = 0;
        this.totalSteps = 3;

        // Workflow data (shared between steps)
        this.locCe = null;           // LOC Ce from induction (Step 1 -> Step 2)
        this.safetyMargin = 0.15;    // Default safety margin
        this.protocolResult = null;  // Protocol result (Step 2 -> Step 3)

        // Touch tracking for swipe
        this.touchStartX = 0;
        this.touchDeltaX = 0;
        this.isSwiping = false;

        // Hold state for stepper long-press
        this.holdState = null;

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    initialize() {
        console.log('Initializing Remimazolam TCI TIVA V2.0.0');

        setTimeout(() => {
            document.getElementById('loadingScreen').classList.add('hidden');
        }, 1500);

        this.initializeDefaultPatient();
        this.setupEventListeners();
        this.setupWizard();
        this.setupStepperControls();
        this.setupInductionCallbacks();
        this.updatePatientDisplay();

        console.log('Application initialized successfully');
    }

    // =============================================
    // Patient Initialization
    // =============================================
    initializeDefaultPatient() {
        const now = new Date();
        now.setHours(8, 0, 0, 0);

        this.appState.patient = new Patient(
            `Patient-${new Date().toISOString().split('T')[0]}`,
            50, 70.0, 170.0,
            SexType.MALE, AsapsType.CLASS_1_2, now
        );

        this.protocolEngine.setPatient(this.appState.patient);
        this.advancedProtocolEngine.setPatient(this.appState.patient);
        this.enhancedProtocolEngine.setPatient(this.appState.patient);
        this.monitoringEngine.setPatient(this.appState.patient);
    }

    // =============================================
    // Wizard Control
    // =============================================
    setupWizard() {
        const track = document.getElementById('wizardTrack');

        // Step tab clicks
        document.querySelectorAll('.step-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.goToStep(parseInt(tab.dataset.step));
            });
        });

        // Next/Back button clicks
        document.querySelectorAll('[data-goto]').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetStep = parseInt(btn.dataset.goto);
                this.goToStep(targetStep);
            });
        });

        // Swipe gesture on wizard viewport
        const viewport = document.querySelector('.wizard-viewport');

        viewport.addEventListener('touchstart', (e) => {
            // Only track horizontal swipe if not interacting with inputs
            const tag = e.target.tagName;
            if (tag === 'INPUT' || tag === 'BUTTON' || tag === 'CANVAS') return;

            this.touchStartX = e.touches[0].clientX;
            this.isSwiping = false;
        }, { passive: true });

        viewport.addEventListener('touchmove', (e) => {
            if (this.touchStartX === 0) return;
            this.touchDeltaX = e.touches[0].clientX - this.touchStartX;

            if (Math.abs(this.touchDeltaX) > 20) {
                this.isSwiping = true;
            }
        }, { passive: true });

        viewport.addEventListener('touchend', () => {
            if (this.isSwiping && Math.abs(this.touchDeltaX) > 60) {
                if (this.touchDeltaX < 0 && this.currentStep < this.totalSteps - 1) {
                    this.goToStep(this.currentStep + 1);
                } else if (this.touchDeltaX > 0 && this.currentStep > 0) {
                    this.goToStep(this.currentStep - 1);
                }
            }
            this.touchStartX = 0;
            this.touchDeltaX = 0;
            this.isSwiping = false;
        });

        // Set initial position
        this.goToStep(0);
    }

    goToStep(step) {
        if (step < 0 || step >= this.totalSteps) return;

        this.currentStep = step;
        const track = document.getElementById('wizardTrack');
        const offset = -(step * 100 / this.totalSteps);
        track.style.transform = `translateX(${offset}%)`;

        // Update tab states
        document.querySelectorAll('.step-tab').forEach((tab, i) => {
            tab.classList.toggle('active', i === step);
            tab.classList.toggle('completed', i < step);
        });

        // Trigger step-specific actions
        if (step === 1) {
            this.onEnterProtocolStep();
        } else if (step === 2) {
            this.onEnterMonitoringStep();
        }
    }

    // =============================================
    // Event Listeners
    // =============================================
    setupEventListeners() {
        // Disclaimer
        const disclaimerBtn = document.getElementById('acceptDisclaimer');
        disclaimerBtn.addEventListener('click', () => this.hideDisclaimer());
        disclaimerBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.hideDisclaimer();
        });

        // Patient modal
        document.getElementById('editPatientBtn').addEventListener('click', () => this.showPatientModal());
        document.getElementById('closePatientModal').addEventListener('click', () => this.hidePatientModal());
        document.getElementById('cancelPatientEdit').addEventListener('click', () => this.hidePatientModal());
        document.getElementById('patientForm').addEventListener('submit', (e) => this.savePatientData(e));

        // Error diagnostics
        document.getElementById('errorDiagnosticsBtn').addEventListener('click', () => {
            if (window.errorDisplayInterface) window.errorDisplayInterface.toggle();
        });
        document.getElementById('errorIndicator').addEventListener('click', () => {
            if (window.errorDisplayInterface) window.errorDisplayInterface.show();
        });

        // Step 1: Induction
        document.getElementById('startInductionBtn').addEventListener('click', () => this.startInduction());
        document.getElementById('stopInductionBtn').addEventListener('click', () => this.stopInduction());
        document.getElementById('recordSnapshotBtn').addEventListener('click', () => this.recordSnapshot());
        document.getElementById('recordLOCBtn').addEventListener('click', () => this.recordLOC());

        // Step 2: Protocol
        document.getElementById('optimizeProtocolBtn').addEventListener('click', () => this.optimizeProtocol());

        // Safety margin change
        document.getElementById('safetyMargin').addEventListener('change', () => this.updateTargetCeFromMargin());

        // Step 3: Monitoring
        document.getElementById('addDoseBtn').addEventListener('click', () => this.showDoseModal());
        document.getElementById('runSimulationBtn').addEventListener('click', () => this.runMonitoringSimulation());
        document.getElementById('exportCsvBtn').addEventListener('click', () => this.exportCsv());

        // Dose modal
        document.getElementById('closeDoseModal').addEventListener('click', () => this.hideDoseModal());
        document.getElementById('cancelDoseAdd').addEventListener('click', () => this.hideDoseModal());
        document.getElementById('doseForm').addEventListener('submit', (e) => this.addDoseEvent(e));

        // Modal backdrop clicks
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('active');
            });
        });
    }

    // =============================================
    // Stepper Controls (unified event delegation)
    // =============================================
    setupStepperControls() {
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.stepper-btn');
            if (btn) this.handleStepperButton(btn);
        });

        // Long-press: pointerdown
        document.addEventListener('pointerdown', (e) => {
            const btn = e.target.closest('.stepper-btn');
            if (btn) {
                e.preventDefault();
                this.startHold(btn);
            }
        });

        ['pointerup', 'pointerleave', 'pointercancel'].forEach(evt => {
            document.addEventListener(evt, () => this.stopHold());
        });

        window.addEventListener('blur', () => this.stopHold());
    }

    handleStepperButton(button) {
        const targetId = button.getAttribute('data-target');
        const step = parseFloat(button.getAttribute('data-step'));
        const input = document.getElementById(targetId);
        if (!input) return;

        const isIncrement = button.classList.contains('stepper-plus');
        const currentValue = parseFloat(input.value) || 0;
        const min = parseFloat(input.min);
        const max = parseFloat(input.max);

        let newValue = isIncrement ? currentValue + step : currentValue - step;
        // Fix floating point
        newValue = Math.round(newValue * 1000) / 1000;
        if (!isNaN(min)) newValue = Math.max(min, newValue);
        if (!isNaN(max)) newValue = Math.min(max, newValue);

        // Display with appropriate precision to avoid floating point artifacts
        const stepStr = button.getAttribute('data-step');
        const decimals = (stepStr.includes('.')) ? stepStr.split('.')[1].length : 0;
        input.value = newValue.toFixed(decimals);
        input.dispatchEvent(new Event('change'));

        this.onStepperValueChanged(targetId, newValue);
    }

    onStepperValueChanged(targetId, value) {
        // Induction dose updates
        if (targetId === 'inductionBolus' || targetId === 'inductionContinuous') {
            if (this.appState.isInductionRunning) {
                const bolus = parseFloat(document.getElementById('inductionBolus').value);
                const continuous = parseFloat(document.getElementById('inductionContinuous').value);
                this.inductionEngine.updateDose(bolus, continuous);
            }
        }

        // BMI update
        if (targetId === 'editWeight' || targetId === 'editHeight') {
            this.updateBMICalculation();
        }

        // Safety margin update
        if (targetId === 'safetyMargin') {
            this.safetyMargin = value;
            this.updateTargetCeFromMargin();
        }

        // Target concentration manual edit
        if (targetId === 'targetConcentration') {
            // Manual override - don't auto-recalculate from margin
        }
    }

    startHold(button) {
        this.stopHold();
        this.holdState = {
            button: button,
            timeout: null,
            interval: null,
            currentInterval: 200
        };

        button.classList.add('holding');

        this.holdState.timeout = setTimeout(() => {
            this.startHoldInterval(button);
        }, 500);
    }

    startHoldInterval(button) {
        this.holdState.interval = setInterval(() => {
            this.handleStepperButton(button);
            this.holdState.currentInterval *= 0.9;
            if (this.holdState.currentInterval < 50) {
                this.holdState.currentInterval = 50;
            }
            clearInterval(this.holdState.interval);
            this.startHoldInterval(button);
        }, this.holdState.currentInterval);
    }

    stopHold() {
        if (this.holdState) {
            clearTimeout(this.holdState.timeout);
            clearInterval(this.holdState.interval);
            if (this.holdState.button) {
                this.holdState.button.classList.remove('holding');
            }
            this.holdState = null;
        }
    }

    // =============================================
    // Induction Callbacks
    // =============================================
    setupInductionCallbacks() {
        this.inductionEngine.addUpdateCallback((state) => {
            this.updateInductionDisplay(state);
        });
    }

    // =============================================
    // Modal Management
    // =============================================
    hideDisclaimer() {
        document.getElementById('disclaimerModal').classList.remove('active');
        document.getElementById('mainApp').classList.remove('hidden');
    }

    showPatientModal() {
        const modal = document.getElementById('patientModal');
        const patient = this.appState.patient;

        document.getElementById('editPatientId').value = patient.id;
        document.getElementById('editAge').value = patient.age;
        document.getElementById('editWeight').value = patient.weight;
        document.getElementById('editHeight').value = patient.height;
        document.querySelector(`input[name="sex"][value="${patient.sex === SexType.MALE ? 'male' : 'female'}"]`).checked = true;
        document.querySelector(`input[name="asa"][value="${patient.asaPS === AsapsType.CLASS_1_2 ? '1-2' : '3-4'}"]`).checked = true;
        document.getElementById('editAnesthesiaStart').value = patient.formattedStartTime;
        this.updateBMICalculation();

        modal.classList.add('active');
    }

    hidePatientModal() {
        document.getElementById('patientModal').classList.remove('active');
    }

    showDoseModal() {
        document.getElementById('doseTime').value = this.appState.patient.formattedStartTime;
        document.getElementById('doseBolusAmount').value = 0;
        document.getElementById('doseContinuousRate').value = 0;
        document.getElementById('anesthesiaStartReference').textContent = this.appState.patient.formattedStartTime;
        document.getElementById('doseModal').classList.add('active');
    }

    hideDoseModal() {
        document.getElementById('doseModal').classList.remove('active');
    }

    // =============================================
    // Patient Data
    // =============================================
    savePatientData(e) {
        e.preventDefault();
        const formData = new FormData(e.target);

        const timeValue = document.getElementById('editAnesthesiaStart').value;
        const anesthesiaStart = new Date(this.appState.patient.anesthesiaStartTime);
        const [hours, minutes] = timeValue.split(':').map(Number);
        anesthesiaStart.setHours(hours, minutes, 0, 0);

        this.appState.patient.id = document.getElementById('editPatientId').value;
        this.appState.patient.age = parseInt(document.getElementById('editAge').value);
        this.appState.patient.weight = parseFloat(document.getElementById('editWeight').value);
        this.appState.patient.height = parseFloat(document.getElementById('editHeight').value);
        this.appState.patient.sex = formData.get('sex') === 'male' ? SexType.MALE : SexType.FEMALE;
        this.appState.patient.asaPS = formData.get('asa') === '1-2' ? AsapsType.CLASS_1_2 : AsapsType.CLASS_3_4;
        this.appState.patient.anesthesiaStartTime = anesthesiaStart;

        const validation = this.appState.patient.validate();
        if (!validation.isValid) {
            alert('Input Error:\n' + validation.errors.join('\n'));
            return;
        }

        this.protocolEngine.setPatient(this.appState.patient);
        this.advancedProtocolEngine.setPatient(this.appState.patient);
        this.enhancedProtocolEngine.setPatient(this.appState.patient);
        this.monitoringEngine.setPatient(this.appState.patient);

        this.updatePatientDisplay();
        this.hidePatientModal();
    }

    updatePatientDisplay() {
        const p = this.appState.patient;
        const summary = `${p.age}y ${p.weight}kg`;
        document.getElementById('headerPatientSummary').textContent = summary;
    }

    updateBMICalculation() {
        const weight = parseFloat(document.getElementById('editWeight').value);
        const height = parseFloat(document.getElementById('editHeight').value);
        const bmi = weight / Math.pow(height / 100, 2);
        document.getElementById('bmiCalculated').textContent = bmi.toFixed(1);
    }

    // =============================================
    // Step 1: Induction
    // =============================================
    startInduction() {
        const bolus = parseFloat(document.getElementById('inductionBolus').value);
        const continuous = parseFloat(document.getElementById('inductionContinuous').value);

        // Reset chart data
        this.inductionChartData = { times: [], plasma: [], effect: [] };
        if (this.inductionChart) {
            this.inductionChart.destroy();
            this.inductionChart = null;
        }

        if (this.inductionEngine.start(this.appState.patient, bolus, continuous)) {
            this.appState.isInductionRunning = true;
            this.updateInductionControls();
        }
    }

    stopInduction() {
        if (this.inductionEngine.stop()) {
            this.appState.isInductionRunning = false;
            this.updateInductionControls();
        }
    }

    recordSnapshot() {
        const snapshot = this.inductionEngine.takeSnapshot();
        if (snapshot) this.updateSnapshotsDisplay();
    }

    recordLOC() {
        // Record the current effect-site concentration as LOC Ce
        const state = this.inductionEngine.getState();
        if (!state) return;

        this.locCe = state.effectSiteConcentration;

        // Update LOC display in Step 1
        document.getElementById('locCeDisplay').classList.remove('hidden');
        document.getElementById('locCeValue').textContent = this.locCe.toFixed(3);

        // Also record as a snapshot
        this.recordSnapshot();

        // Mark Step 1 tab as completed
        document.querySelector('.step-tab[data-step="0"]').classList.add('completed');

        // Update target Ce calculation
        this.updateTargetCeFromMargin();
    }

    updateInductionDisplay(state) {
        document.getElementById('plasmaConcentration').textContent = state.plasmaConcentration.toFixed(3);
        document.getElementById('effectConcentration').textContent = state.effectSiteConcentration.toFixed(3);

        // Format elapsed time as MM:SS
        const totalSec = Math.floor(state.elapsedTime);
        const mm = Math.floor(totalSec / 60).toString().padStart(2, '0');
        const ss = (totalSec % 60).toString().padStart(2, '0');
        document.getElementById('elapsedTime').textContent = `${mm}:${ss}`;

        // Update real-time chart (every ~2 seconds to avoid performance issues)
        if (totalSec % 2 === 0) {
            this.updateInductionChart(state);
        }
    }

    updateInductionChart(state) {
        const totalSec = Math.floor(state.elapsedTime);
        const label = Math.floor(totalSec / 60) + ':' + (totalSec % 60).toString().padStart(2, '0');

        this.inductionChartData.times.push(label);
        this.inductionChartData.plasma.push(state.plasmaConcentration);
        this.inductionChartData.effect.push(state.effectSiteConcentration);

        // Keep last 300 data points (~10 min at 2s interval)
        if (this.inductionChartData.times.length > 300) {
            this.inductionChartData.times.shift();
            this.inductionChartData.plasma.shift();
            this.inductionChartData.effect.shift();
        }

        const ctx = document.getElementById('inductionRealtimeChart');
        if (!ctx) return;

        if (!this.inductionChart) {
            this.inductionChart = new Chart(ctx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: this.inductionChartData.times,
                    datasets: [
                        {
                            label: 'Cp',
                            data: this.inductionChartData.plasma,
                            borderColor: '#3266AD',
                            fill: false, tension: 0.3, pointRadius: 0, borderWidth: 1.5
                        },
                        {
                            label: 'Ce',
                            data: this.inductionChartData.effect,
                            borderColor: '#D4822D',
                            fill: false, tension: 0.3, pointRadius: 0, borderWidth: 2
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: { duration: 0 },
                    interaction: { mode: 'index', intersect: false, axis: 'x' },
                    plugins: {
                        tooltip: { events: ['click', 'touchstart'], padding: 8, cornerRadius: 6, backgroundColor: '#121A16', titleColor: '#E4EDE8', bodyColor: '#C8D5CE' },
                        legend: { labels: { boxWidth: 10, font: { size: 11 }, color: '#8A9B90' } }
                    },
                    scales: {
                        x: { ticks: { maxTicksLimit: 6, font: { size: 10 }, color: '#8A9B90' }, grid: { color: 'rgba(255,255,255,0.06)' } },
                        y: { beginAtZero: true, title: { display: true, text: '\u03BCg/mL', font: { size: 10 }, color: '#8A9B90' }, ticks: { color: '#8A9B90' }, grid: { color: 'rgba(255,255,255,0.06)' } }
                    }
                }
            });
        } else {
            this.inductionChart.update('none');
        }
    }

    updateInductionControls() {
        const isRunning = this.appState.isInductionRunning;
        document.getElementById('startInductionBtn').classList.toggle('hidden', isRunning);
        document.getElementById('stopInductionBtn').classList.toggle('hidden', !isRunning);
        document.getElementById('recordSnapshotBtn').classList.toggle('hidden', !isRunning);
        document.getElementById('recordLOCBtn').classList.toggle('hidden', !isRunning);
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
                        <span>Cp: ${snapshot.plasmaConcentration.toFixed(3)}</span>
                        <span>Ce: ${snapshot.effectSiteConcentration.toFixed(3)} &#956;g/mL</span>
                    </div>
                `;
                container.appendChild(item);
            });
        } else {
            section.classList.add('hidden');
        }
    }

    // =============================================
    // Step 2: Protocol Optimization
    // =============================================
    onEnterProtocolStep() {
        // If LOC Ce is available, show transfer banner and auto-fill target
        if (this.locCe !== null) {
            document.getElementById('locTransferBanner').classList.remove('hidden');
            document.getElementById('transferredLocCe').textContent = this.locCe.toFixed(3);
            this.updateTargetCeFromMargin();
        }
    }

    updateTargetCeFromMargin() {
        if (this.locCe === null) {
            document.getElementById('calculatedTargetCe').textContent = '---';
            return;
        }

        this.safetyMargin = parseFloat(document.getElementById('safetyMargin').value) || 0.15;
        const targetCe = Math.round((this.locCe + this.safetyMargin) * 1000) / 1000;

        document.getElementById('calculatedTargetCe').textContent = targetCe.toFixed(3);

        // Auto-fill the target concentration input
        document.getElementById('targetConcentration').value = targetCe.toFixed(2);
    }

    optimizeProtocol() {
        const targetConcentration = parseFloat(document.getElementById('targetConcentration').value);
        const bolusDose = parseFloat(document.getElementById('protocolBolus').value);
        const targetTime = parseFloat(document.getElementById('targetReachTime').value);
        const upperThresholdRatio = parseFloat(document.getElementById('upperThresholdRatio').value) / 100;
        const reductionFactor = parseFloat(document.getElementById('reductionFactor').value) / 100;
        const adjustmentInterval = parseFloat(document.getElementById('adjustmentInterval').value);

        try {
            this.enhancedProtocolEngine.updateSettings({
                targetCe: targetConcentration,
                targetReachTime: targetTime,
                upperThreshold: targetConcentration * upperThresholdRatio,
                reductionFactor: reductionFactor,
                adjustmentInterval: adjustmentInterval
            });

            const result = this.enhancedProtocolEngine.runEnhancedOptimization(
                targetConcentration, bolusDose, targetTime
            );

            this.protocolResult = result;
            this.appState.protocolResult = result;
            this.updateProtocolDisplay(result);

            // Mark Step 2 as completed
            document.querySelector('.step-tab[data-step="1"]').classList.add('completed');
        } catch (error) {
            console.error('Protocol optimization failed:', error);
            alert('Optimization error:\n' + error.message);
        }
    }

    updateProtocolDisplay(result) {
        document.getElementById('protocolResults').classList.remove('hidden');
        document.getElementById('optimalRate').textContent = result.optimizedRate.toFixed(3);
        document.getElementById('predictedFinalCe').textContent = result.protocol.performance.finalCe.toFixed(3);
        document.getElementById('targetAccuracy').textContent = result.protocol.performance.targetAccuracy.toFixed(1);
        document.getElementById('adjustmentCount').textContent = result.protocol.performance.totalAdjustments;
        document.getElementById('stabilityIndex').textContent = result.protocol.performance.stabilityIndex.toFixed(1);
        document.getElementById('convergenceTime').textContent =
            result.protocol.performance.convergenceTime ? result.protocol.performance.convergenceTime.toFixed(1) : '---';

        this.updateConcentrationEvaluationDisplay(result.protocol.concentrationAtTimePoints);
        this.updateProtocolChart(result);
        this.updateProtocolTable(result.protocol.dosageAdjustments);
    }

    updateConcentrationEvaluationDisplay(concentrationAtTimePoints) {
        const container = document.getElementById('concentrationEvaluationResults');
        if (!container) return;

        container.innerHTML = '<h4>Concentration at Timepoints</h4>';

        const table = document.createElement('table');
        table.className = 'concentration-evaluation-table';

        const headerRow = document.createElement('tr');
        headerRow.innerHTML = `
            <th>Time</th>
            <th>Ce</th>
            <th>Cp</th>
            <th>Rate</th>
            <th>Dev.</th>
        `;
        table.appendChild(headerRow);

        concentrationAtTimePoints.forEach(point => {
            const row = document.createElement('tr');
            const cls = point.percentageDeviation > 10 ? 'high-deviation' :
                        point.percentageDeviation > 5 ? 'medium-deviation' : 'low-deviation';
            row.className = cls;
            row.innerHTML = `
                <td>${point.time}min</td>
                <td>${point.effectSiteConcentration.toFixed(3)}</td>
                <td>${point.plasmaConcentration.toFixed(3)}</td>
                <td>${point.infusionRate.toFixed(2)}</td>
                <td>${point.percentageDeviation.toFixed(1)}%</td>
            `;
            table.appendChild(row);
        });

        container.appendChild(table);
        container.classList.remove('hidden');
    }

    updateProtocolChart(result) {
        const ctx = document.getElementById('protocolChart').getContext('2d');
        if (this.protocolChart) this.protocolChart.destroy();

        const chartData = this.enhancedProtocolEngine.getEnhancedChartData();
        if (!chartData || !chartData.times) return;

        this.protocolChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.times.map(t => {
                    const ct = this.appState.patient.minutesToClockTime(t);
                    return ct.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false });
                }),
                datasets: [
                    {
                        label: 'Cp',
                        data: chartData.plasmaConcentrations,
                        borderColor: '#3266AD',
                        backgroundColor: 'rgba(50,102,173,0.1)',
                        fill: false, tension: 0.1, pointRadius: 0, borderWidth: 1.5
                    },
                    {
                        label: 'Ce',
                        data: chartData.effectSiteConcentrations,
                        borderColor: '#D4822D',
                        backgroundColor: 'rgba(212,130,45,0.1)',
                        fill: false, tension: 0.1, pointRadius: 0, borderWidth: 2
                    },
                    {
                        label: 'Target',
                        data: chartData.targetLine,
                        borderColor: 'rgba(196,91,40,0.8)',
                        borderDash: [5, 5], tension: 0, pointRadius: 0, borderWidth: 1.5, fill: false
                    },
                    {
                        label: 'Upper',
                        data: chartData.upperThresholdLine,
                        borderColor: 'rgba(212,160,23,0.6)',
                        borderDash: [2, 2], tension: 0, pointRadius: 0, borderWidth: 1, fill: false
                    },
                    {
                        label: 'Rate',
                        data: chartData.infusionRates,
                        borderColor: '#7B68AE',
                        tension: 0.1, pointRadius: 0, borderWidth: 1.5, fill: false,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false, axis: 'x' },
                plugins: {
                    tooltip: {
                        events: ['click', 'touchstart'],
                        padding: 10, cornerRadius: 8,
                        backgroundColor: '#121A16', titleColor: '#E4EDE8', bodyColor: '#C8D5CE',
                        titleFont: { size: 12 }, bodyFont: { size: 11 }
                    },
                    legend: { display: true, labels: { boxWidth: 12, font: { size: 11 }, color: '#8A9B90' } }
                },
                scales: {
                    x: { ticks: { maxTicksLimit: 8, font: { size: 10 }, color: '#8A9B90' }, grid: { color: 'rgba(255,255,255,0.06)' } },
                    y: { beginAtZero: true, title: { display: true, text: 'Conc (ug/mL)', font: { size: 10 }, color: '#8A9B90' }, ticks: { color: '#8A9B90' }, grid: { color: 'rgba(255,255,255,0.06)' } },
                    y1: {
                        type: 'linear', display: true, position: 'right', beginAtZero: true,
                        title: { display: true, text: 'Rate', font: { size: 10 }, color: '#8A9B90' },
                        ticks: { color: '#8A9B90' },
                        grid: { drawOnChartArea: false }
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
            <thead><tr>
                <th>Time</th><th>Action</th><th>Rate Change</th><th>Ce</th><th>Reason</th>
            </tr></thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector('tbody');

        const initialRow = document.createElement('tr');
        initialRow.innerHTML = '<td>0 min</td><td>Bolus</td><td>-</td><td>-</td><td>Induction</td>';
        tbody.appendChild(initialRow);

        const startRow = document.createElement('tr');
        startRow.innerHTML = '<td>0 min</td><td>Start Infusion</td><td>-</td><td>-</td><td>Optimized</td>';
        tbody.appendChild(startRow);

        dosageAdjustments.forEach(adj => {
            const row = document.createElement('tr');
            row.className = adj.type === 'predictive_adjustment' ? 'predictive' : 'reactive';
            row.innerHTML = `
                <td>${adj.time.toFixed(1)}</td>
                <td>Adjust</td>
                <td>${adj.oldRate.toFixed(2)} &#8594; ${adj.newRate.toFixed(2)}</td>
                <td>${adj.ceAtEvent.toFixed(3)}</td>
                <td>${adj.reason}</td>
            `;
            tbody.appendChild(row);
        });

        container.appendChild(table);
    }

    // =============================================
    // Step 3: Monitoring
    // =============================================
    onEnterMonitoringStep() {
        // If protocol result exists, offer to transfer
        if (this.protocolResult) {
            this.transferProtocolToMonitoring();
        }
    }

    transferProtocolToMonitoring() {
        const result = this.protocolResult;
        if (!result) return;

        const banner = document.getElementById('protocolTransferBanner');
        const info = document.getElementById('transferredProtocolInfo');

        const bolus = parseFloat(document.getElementById('protocolBolus').value);
        const rate = result.optimizedRate;

        info.textContent = `Bolus ${bolus}mg + ${rate.toFixed(2)} mg/kg/hr`;
        banner.classList.remove('hidden');

        // Only auto-load if monitoring has no events yet
        const events = this.monitoringEngine.getDoseEvents();
        if (events.length === 0) {
            // Add bolus at time 0
            const bolusEvent = new DoseEvent(0, bolus, rate);
            this.monitoringEngine.addDoseEvent(bolusEvent);

            // Add dosage adjustments
            if (result.protocol && result.protocol.dosageAdjustments) {
                result.protocol.dosageAdjustments.forEach(adj => {
                    const adjEvent = new DoseEvent(Math.round(adj.time), 0, adj.newRate);
                    this.monitoringEngine.addDoseEvent(adjEvent);
                });
            }

            this.updateMonitoringDisplay();
        }
    }

    addDoseEvent(e) {
        e.preventDefault();

        const timeValue = document.getElementById('doseTime').value;
        const bolusAmount = parseFloat(document.getElementById('doseBolusAmount').value);
        const continuousRate = parseFloat(document.getElementById('doseContinuousRate').value);

        const doseTime = new Date(this.appState.patient.anesthesiaStartTime);
        const [hours, minutes] = timeValue.split(':').map(Number);
        doseTime.setHours(hours, minutes, 0, 0);

        let minutesFromStart = this.appState.patient.clockTimeToMinutes(doseTime);
        if (minutesFromStart < 0) minutesFromStart += 1440;
        minutesFromStart = Math.max(0, Math.round(minutesFromStart));

        const doseEvent = new DoseEvent(minutesFromStart, bolusAmount, continuousRate);
        const validation = doseEvent.validate();
        if (!validation.isValid) {
            alert('Input Error:\n' + validation.errors.join('\n'));
            return;
        }

        this.monitoringEngine.addDoseEvent(doseEvent);
        this.updateMonitoringDisplay();
        this.hideDoseModal();
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
                const span = document.createElement('span');
                span.textContent = `Bolus: ${event.bolusMg.toFixed(1)}mg`;
                details.appendChild(span);
            }
            if (event.continuousMgKgHr > 0) {
                const span = document.createElement('span');
                span.textContent = `${event.continuousMgKgHr.toFixed(2)}mg/kg/hr`;
                details.appendChild(span);
            }
        } else {
            const span = document.createElement('span');
            span.textContent = 'Discontinued';
            span.className = 'dose-stop';
            details.appendChild(span);
        }

        infoDiv.appendChild(title);
        infoDiv.appendChild(details);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-dose';
        deleteBtn.textContent = '\u00D7';
        deleteBtn.addEventListener('click', () => {
            this.monitoringEngine.removeDoseEvent(index);
            this.updateMonitoringDisplay();
        });

        div.appendChild(infoDiv);
        div.appendChild(deleteBtn);
        return div;
    }

    runMonitoringSimulation() {
        try {
            const result = this.monitoringEngine.runSimulation();
            this.appState.simulationResult = result;
            this.updateMonitoringResults(result);
        } catch (error) {
            console.error('Simulation failed:', error);
            alert('Simulation error:\n' + error.message);
        }
    }

    updateMonitoringResults(result) {
        document.getElementById('simulationResults').classList.remove('hidden');
        document.getElementById('maxPlasmaConc').textContent = result.maxPlasmaConcentration.toFixed(3);
        document.getElementById('maxEffectConc').textContent = result.maxEffectSiteConcentration.toFixed(3);
        document.getElementById('calculationMethod').textContent = result.calculationMethod;

        this.updateMonitoringChart(result);
    }

    updateMonitoringChart(result) {
        const ctx = document.getElementById('monitoringChart').getContext('2d');
        if (this.monitoringChart) this.monitoringChart.destroy();

        const chartData = this.monitoringEngine.getChartData();
        if (!chartData) return;

        this.monitoringChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [
                    {
                        label: 'Cp',
                        data: chartData.plasmaData,
                        borderColor: '#3266AD',
                        fill: false, tension: 0.1, pointRadius: 0, borderWidth: 1.5
                    },
                    {
                        label: 'Ce',
                        data: chartData.effectData,
                        borderColor: '#D4822D',
                        fill: false, tension: 0.1, pointRadius: 0, borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false, axis: 'x' },
                plugins: {
                    tooltip: {
                        events: ['click', 'touchstart'],
                        padding: 10, cornerRadius: 8,
                        backgroundColor: '#121A16', titleColor: '#E4EDE8', bodyColor: '#C8D5CE',
                        titleFont: { size: 12 }, bodyFont: { size: 11 }
                    },
                    legend: { labels: { boxWidth: 12, font: { size: 11 }, color: '#8A9B90' } }
                },
                scales: {
                    x: { ticks: { maxTicksLimit: 8, font: { size: 10 }, color: '#8A9B90' }, grid: { color: 'rgba(255,255,255,0.06)' } },
                    y: { beginAtZero: true, title: { display: true, text: 'Conc (ug/mL)', font: { size: 10 }, color: '#8A9B90' }, ticks: { color: '#8A9B90' }, grid: { color: 'rgba(255,255,255,0.06)' } }
                }
            }
        });
    }

    // =============================================
    // CSV Export
    // =============================================
    exportCsv() {
        try {
            const csvContent = this.monitoringEngine.exportToCSV();
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const patientId = this.appState.patient.id.replace(/[^a-zA-Z0-9]/g, '_');
            const filename = `${patientId}_${dateStr}.csv`;

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
            }
        } catch (error) {
            console.error('CSV export failed:', error);
            alert('Export error:\n' + error.message);
        }
    }
}

// Initialize
const app = new MainApplicationController();

if (typeof window !== 'undefined') {
    window.app = app;
}
