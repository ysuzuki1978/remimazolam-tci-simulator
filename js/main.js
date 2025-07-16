/**
 * Main Application Controller for Remimazolam TCI TIVA V1.1.0
 * Integrated Application Main Controller
 * 
 * Coordinates:
 * - Induction Engine (Real-time prediction)
 * - Advanced Protocol Engine (Enhanced step-down optimization)
 * - Monitoring Engine (Dose tracking)
 * - UI Management
 * - State Management
 * - Digital Picker Components (Mobile-optimized input)
 */

/**
 * Enhanced Digital Picker Class with Long Press Support
 * モバイル対応デジタルピッカー - 長押し、直接入力、精密な数値制御
 * @param {string|HTMLElement} container - ピッカーを配置するコンテナ要素またはセレクタ
 * @param {object} options - 設定オプション
 * @param {number} options.min - 最小値
 * @param {number} options.max - 最大値
 * @param {number} options.step - 1クリックでの増減量
 * @param {number} options.initialValue - 初期値
 * @param {number} options.decimalPlaces - 表示する小数点以下の桁数
 * @param {number} options.longPressDelay - 長押し判定までの時間(ms) デフォルト: 500
 * @param {number} options.longPressInterval - 長押し中の増減間隔(ms) デフォルト: 100
 */
class DigitalPicker {
    constructor(container, options) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        if (!this.container) {
            throw new Error('DigitalPicker: Container element not found.');
        }

        // デフォルトオプションとユーザー指定オプションをマージ
        this.options = {
            min: 0,
            max: 100,
            step: 1,
            initialValue: 0,
            decimalPlaces: 0,
            longPressDelay: 500,    // 長押し判定時間
            longPressInterval: 100, // 長押し中の増減間隔
            ...options
        };

        // 初期値の設定
        this.options.initialValue = this.options.initialValue || this.options.min;
        this.value = this._clamp(this.options.initialValue);

        // 長押し制御用変数
        this.pressTimer = null;
        this.pressInterval = null;
        this.isLongPressing = false;

        this._createUI();
        this._attachEventListeners();
        this._updateDisplay();
    }

    // UI要素を生成してコンテナに追加
    _createUI() {
        this.container.innerHTML = `
            <div class="digital-picker">
                <button type="button" class="picker-btn picker-decrement" aria-label="Decrement">-</button>
                <input type="number" class="picker-input" inputmode="decimal" step="${this.options.step}">
                <button type="button" class="picker-btn picker-increment" aria-label="Increment">+</button>
            </div>
        `;

        this.decrementBtn = this.container.querySelector('.picker-decrement');
        this.incrementBtn = this.container.querySelector('.picker-increment');
        this.inputEl = this.container.querySelector('.picker-input');
    }

    // イベントリスナーを設定
    _attachEventListeners() {
        // 増減ボタンのイベント
        this._attachButtonEvents(this.incrementBtn, () => this.increment());
        this._attachButtonEvents(this.decrementBtn, () => this.decrement());

        // 入力フィールドのイベント
        this.inputEl.addEventListener('input', (e) => this._handleInputChange(e));
        this.inputEl.addEventListener('blur', () => this._handleInputBlur());
        
        // フォーカス時に全選択（入力しやすくする）
        this.inputEl.addEventListener('focus', (e) => e.target.select());
    }

    // ボタンの長押し対応イベントを設定
    _attachButtonEvents(button, action) {
        // クリックイベント
        button.addEventListener('click', (e) => {
            if (!this.isLongPressing) {
                action();
            }
        });

        // マウスイベント（PC用）
        button.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this._startLongPress(button, action);
        });
        button.addEventListener('mouseup', () => this._stopLongPress(button));
        button.addEventListener('mouseleave', () => this._stopLongPress(button));

        // タッチイベント（モバイル用）
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this._startLongPress(button, action);
        });
        button.addEventListener('touchend', () => this._stopLongPress(button));
        button.addEventListener('touchcancel', () => this._stopLongPress(button));
    }

    // 長押し開始
    _startLongPress(button, action) {
        this._stopLongPress(button); // 既存のタイマーをクリア
        
        this.pressTimer = setTimeout(() => {
            this.isLongPressing = true;
            button.classList.add('pressing');
            
            // 最初の実行
            action();
            
            // 継続的な実行
            this.pressInterval = setInterval(() => {
                action();
            }, this.options.longPressInterval);
        }, this.options.longPressDelay);
    }

    // 長押し終了
    _stopLongPress(button) {
        if (this.pressTimer) {
            clearTimeout(this.pressTimer);
            this.pressTimer = null;
        }
        
        if (this.pressInterval) {
            clearInterval(this.pressInterval);
            this.pressInterval = null;
        }
        
        button.classList.remove('pressing');
        
        // 少し遅延してからlong pressing flagをリセット（clickイベントとの競合を防ぐ）
        setTimeout(() => {
            this.isLongPressing = false;
        }, 50);
    }

    // 値を減らす
    decrement() {
        this._setValue(this.value - this.options.step);
    }

    // 値を増やす
    increment() {
        this._setValue(this.value + this.options.step);
    }

    // ユーザーによる直接入力の処理
    _handleInputChange(event) {
        const rawValue = event.target.value;
        
        // 空文字列や無効な値の場合は何もしない（入力中を許可）
        if (rawValue === '' || rawValue === '.' || rawValue === '-') {
            return;
        }
        
        const parsedValue = parseFloat(rawValue);
        if (!isNaN(parsedValue)) {
            // 入力中は範囲チェックを行わず、内部値のみ更新
            this.value = parsedValue;
        }
    }

    // 入力フィールドからフォーカスが外れた時の処理
    _handleInputBlur() {
        // フォーカスが外れた時に範囲チェックと表示更新を実行
        this.value = this._clamp(this.value);
        this._updateDisplay();
    }

    // 値を更新する内部メソッド
    _setValue(newValue) {
        // JavaScriptの浮動小数点数演算誤差を補正
        const precision = Math.pow(10, this.options.decimalPlaces + 2);
        const roundedValue = Math.round(newValue * precision) / precision;
        
        this.value = this._clamp(roundedValue);
        this._updateDisplay();
    }

    // 値をmin/maxの範囲内に収める
    _clamp(value) {
        return Math.max(this.options.min, Math.min(this.options.max, value));
    }

    // 表示を更新
    _updateDisplay() {
        this.inputEl.value = this.value.toFixed(this.options.decimalPlaces);
        this.decrementBtn.disabled = this.value <= this.options.min;
        this.incrementBtn.disabled = this.value >= this.options.max;
    }

    // 現在の値を取得する公開メソッド
    getValue() {
        return this.value;
    }

    // 外部から値を設定する公開メソッド
    setValue(newValue) {
        if (typeof newValue === 'number' && !isNaN(newValue)) {
            this._setValue(newValue);
        }
    }

    // クリーンアップ（必要に応じて）
    destroy() {
        this._stopLongPress(this.incrementBtn);
        this._stopLongPress(this.decrementBtn);
    }
}

class MainApplicationController {
    constructor() {
        this.appState = new AppState();
        this.inductionEngine = new InductionEngine();
        this.protocolEngine = new ProtocolEngine();
        this.advancedProtocolEngine = new AdvancedProtocolEngine();
        this.enhancedProtocolEngine = new EnhancedProtocolEngine();
        this.monitoringEngine = new MonitoringEngine();
        
        // Chart instances
        this.protocolChart = null;
        this.monitoringChart = null;
        
        // Digital Picker instances - デジタルピッカーインスタンス管理
        this.digitalPickers = {};
        
        // Initialize on DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    initialize() {
        console.log('Initializing Remimazolam TCI TIVA V1.0.0 with Advanced Step-Down Protocol');
        
        // Hide loading screen after short delay
        setTimeout(() => {
            document.getElementById('loadingScreen').classList.add('hidden');
        }, 2000);
        
        // Initialize default patient
        this.initializeDefaultPatient();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize digital pickers - デジタルピッカー初期化
        this.initializeDigitalPickers();
        
        // Setup induction engine callbacks
        this.setupInductionCallbacks();
        
        // Update displays
        this.updatePatientDisplay();
        this.updateAllPanelStates();
        
        console.log('Application initialized successfully');
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
        
        // Set patient for all engines
        this.protocolEngine.setPatient(this.appState.patient);
        this.advancedProtocolEngine.setPatient(this.appState.patient);
        this.enhancedProtocolEngine.setPatient(this.appState.patient);
        this.monitoringEngine.setPatient(this.appState.patient);
        
        console.log('Default patient initialized:', this.appState.patient.id);
    }

    setupEventListeners() {
        try {
            // Disclaimer modal
            const acceptBtn = document.getElementById('acceptDisclaimer');
            if (acceptBtn) {
                acceptBtn.addEventListener('click', () => {
                    this.hideDisclaimer();
                });
            }
            
            // Patient information
            const editPatientBtn = document.getElementById('editPatientBtn');
            if (editPatientBtn) {
                editPatientBtn.addEventListener('click', () => {
                    this.showPatientModal();
                });
            }
            
            const closePatientModalBtn = document.getElementById('closePatientModal');
            if (closePatientModalBtn) {
                closePatientModalBtn.addEventListener('click', () => {
                    this.hidePatientModal();
                });
            }
            
            const cancelPatientEditBtn = document.getElementById('cancelPatientEdit');
            if (cancelPatientEditBtn) {
                cancelPatientEditBtn.addEventListener('click', () => {
                    this.hidePatientModal();
                });
            }
            
            const patientForm = document.getElementById('patientForm');
            if (patientForm) {
                patientForm.addEventListener('submit', (e) => {
                    this.savePatientData(e);
                });
            }
            
            // Patient form sliders
            this.setupPatientFormSliders();
            
            // Induction panel
            const startInductionBtn = document.getElementById('startInductionBtn');
            if (startInductionBtn) {
                startInductionBtn.addEventListener('click', () => {
                    this.startInduction();
                });
            }
            
            const stopInductionBtn = document.getElementById('stopInductionBtn');
            if (stopInductionBtn) {
                stopInductionBtn.addEventListener('click', () => {
                    this.stopInduction();
                });
            }
            
            const recordSnapshotBtn = document.getElementById('recordSnapshotBtn');
            if (recordSnapshotBtn) {
                recordSnapshotBtn.addEventListener('click', () => {
                    this.recordSnapshot();
                });
            }
            
            // Induction dose sliders
            this.setupInductionSliders();
            
            // Protocol panel
            const optimizeProtocolBtn = document.getElementById('optimizeProtocolBtn');
            if (optimizeProtocolBtn) {
                optimizeProtocolBtn.addEventListener('click', () => {
                    this.optimizeProtocol();
                });
            }
            
            // Monitoring panel
            const addDoseBtn = document.getElementById('addDoseBtn');
            if (addDoseBtn) {
                addDoseBtn.addEventListener('click', () => {
                    this.showDoseModal();
                });
            }
            
            const runSimulationBtn = document.getElementById('runSimulationBtn');
            if (runSimulationBtn) {
                runSimulationBtn.addEventListener('click', () => {
                    this.runMonitoringSimulation();
                });
            }
            
            const exportCsvBtn = document.getElementById('exportCsvBtn');
            if (exportCsvBtn) {
                exportCsvBtn.addEventListener('click', () => {
                    this.exportCsv();
                });
            }
            
            // Dose modal
            const closeDoseModalBtn = document.getElementById('closeDoseModal');
            if (closeDoseModalBtn) {
                closeDoseModalBtn.addEventListener('click', () => {
                    this.hideDoseModal();
                });
            }
            
            const cancelDoseAddBtn = document.getElementById('cancelDoseAdd');
            if (cancelDoseAddBtn) {
                cancelDoseAddBtn.addEventListener('click', () => {
                    this.hideDoseModal();
                });
            }
            
            const doseForm = document.getElementById('doseForm');
            if (doseForm) {
                doseForm.addEventListener('submit', (e) => {
                    this.addDoseEvent(e);
                });
            }
            
            // Dose form sliders
            this.setupDoseFormSliders();
            
            // Modal backdrop clicks
            document.querySelectorAll('.modal').forEach(modal => {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.classList.remove('active');
                    }
                });
            });
            
        } catch (error) {
            console.error('Error setting up event listeners:', error);
            // Continue with app initialization even if some event listeners fail
        }
    }

    setupPatientFormSliders() {
        try {
            const ageSlider = document.getElementById('editAge');
            const weightSlider = document.getElementById('editWeight');
            const heightSlider = document.getElementById('editHeight');
            
            if (ageSlider) {
                ageSlider.addEventListener('input', (e) => {
                    const ageValue = document.getElementById('ageValue');
                    if (ageValue) ageValue.textContent = e.target.value;
                    this.updateBMICalculation();
                });
            }
            
            if (weightSlider) {
                weightSlider.addEventListener('input', (e) => {
                    const weightValue = document.getElementById('weightValue');
                    if (weightValue) weightValue.textContent = parseFloat(e.target.value).toFixed(1);
                    this.updateBMICalculation();
                });
            }
            
            if (heightSlider) {
                heightSlider.addEventListener('input', (e) => {
                    const heightValue = document.getElementById('heightValue');
                    if (heightValue) heightValue.textContent = e.target.value;
                    this.updateBMICalculation();
                });
            }
        } catch (error) {
            console.warn('Patient form sliders not available (using digital pickers instead):', error);
        }
    }

    setupInductionSliders() {
        try {
            const bolusSlider = document.getElementById('inductionBolus');
            const continuousSlider = document.getElementById('inductionContinuous');
            
            if (bolusSlider) {
                bolusSlider.addEventListener('input', (e) => {
                    const value = parseFloat(e.target.value);
                    const bolusValue = document.getElementById('inductionBolusValue');
                    if (bolusValue) bolusValue.textContent = value.toFixed(1);
                    if (this.appState.isInductionRunning && continuousSlider) {
                        this.inductionEngine.updateDose(value, parseFloat(continuousSlider.value));
                    }
                });
            }
            
            if (continuousSlider) {
                continuousSlider.addEventListener('input', (e) => {
                    const value = parseFloat(e.target.value);
                    const continuousValue = document.getElementById('inductionContinuousValue');
                    if (continuousValue) continuousValue.textContent = value.toFixed(1);
                    if (this.appState.isInductionRunning && bolusSlider) {
                        this.inductionEngine.updateDose(parseFloat(bolusSlider.value), value);
                    }
                });
            }
        } catch (error) {
            console.warn('Induction sliders not available (using digital pickers instead):', error);
        }
    }

    setupDoseFormSliders() {
        try {
            const bolusSlider = document.getElementById('doseBolusAmount');
            const continuousSlider = document.getElementById('doseContinuousRate');
            
            if (bolusSlider) {
                bolusSlider.addEventListener('input', (e) => {
                    const bolusValue = document.getElementById('doseBolusValue');
                    if (bolusValue) bolusValue.textContent = parseFloat(e.target.value).toFixed(1);
                });
            }
            
            if (continuousSlider) {
                continuousSlider.addEventListener('input', (e) => {
                    const continuousValue = document.getElementById('doseContinuousValue');
                    if (continuousValue) continuousValue.textContent = parseFloat(e.target.value).toFixed(2);
                });
            }
        } catch (error) {
            console.warn('Dose form sliders not available (using digital pickers instead):', error);
        }
    }

    /**
     * デジタルピッカーの初期化
     * Initialize Digital Pickers for mobile-optimized input
     */
    initializeDigitalPickers() {
        console.log('Initializing digital pickers...');
        
        try {
            // 1. Patient Information Digital Pickers - 患者情報デジタルピッカー
            const ageContainer = document.querySelector('#editAgePicker');
            if (ageContainer) {
                this.digitalPickers.age = new DigitalPicker('#editAgePicker', {
                    min: 18, max: 100, step: 1, 
                    initialValue: 50, decimalPlaces: 0
                });
                console.log('Age picker initialized');
            } else {
                console.warn('Age picker container not found');
            }
            
            const weightContainer = document.querySelector('#editWeightPicker');
            if (weightContainer) {
                this.digitalPickers.weight = new DigitalPicker('#editWeightPicker', {
                    min: 30, max: 200, step: 0.1, 
                    initialValue: 70.0, decimalPlaces: 1
                });
                console.log('Weight picker initialized');
            } else {
                console.warn('Weight picker container not found');
            }
            
            const heightContainer = document.querySelector('#editHeightPicker');
            if (heightContainer) {
                this.digitalPickers.height = new DigitalPicker('#editHeightPicker', {
                    min: 120, max: 220, step: 1, 
                    initialValue: 170, decimalPlaces: 0
                });
                console.log('Height picker initialized');
            } else {
                console.warn('Height picker container not found');
            }
            
            // 2. Induction Panel Digital Pickers - 導入パネルデジタルピッカー
            const inductionBolusContainer = document.querySelector('#inductionBolusPicker');
            if (inductionBolusContainer) {
                this.digitalPickers.inductionBolus = new DigitalPicker('#inductionBolusPicker', {
                    min: 1, max: 15, step: 0.5, 
                    initialValue: 7.0, decimalPlaces: 1
                });
                console.log('Induction bolus picker initialized');
            } else {
                console.warn('Induction bolus picker container not found');
            }
            
            const inductionContinuousContainer = document.querySelector('#inductionContinuousPicker');
            if (inductionContinuousContainer) {
                this.digitalPickers.inductionContinuous = new DigitalPicker('#inductionContinuousPicker', {
                    min: 0, max: 12, step: 0.01, 
                    initialValue: 1.20, decimalPlaces: 2  // Updated: 0-12, 2 decimal places
                });
                console.log('Induction continuous picker initialized');
            } else {
                console.warn('Induction continuous picker container not found');
            }
            
            // 3. Dose Event Digital Pickers - 投与イベントデジタルピッカー
            const doseBolusContainer = document.querySelector('#doseBolusPicker');
            if (doseBolusContainer) {
                this.digitalPickers.doseBolus = new DigitalPicker('#doseBolusPicker', {
                    min: 0, max: 20, step: 0.1, 
                    initialValue: 0.0, decimalPlaces: 1  // Updated: 0-20
                });
                console.log('Dose bolus picker initialized');
            } else {
                console.warn('Dose bolus picker container not found');
            }
            
            const doseContinuousContainer = document.querySelector('#doseContinuousPicker');
            if (doseContinuousContainer) {
                this.digitalPickers.doseContinuous = new DigitalPicker('#doseContinuousPicker', {
                    min: 0, max: 12, step: 0.01, 
                    initialValue: 0.00, decimalPlaces: 2  // Updated: 0-12
                });
                console.log('Dose continuous picker initialized');
            } else {
                console.warn('Dose continuous picker container not found');
            }
            
            // Setup change event listeners for critical calculations
            this.setupDigitalPickerEventListeners();
            
            console.log('Digital pickers initialization completed');
        } catch (error) {
            console.error('Error initializing digital pickers:', error);
            // Continue with app initialization even if digital pickers fail
        }
    }

    /**
     * デジタルピッカーのイベントリスナー設定
     * Setup event listeners for digital pickers to maintain functionality
     */
    setupDigitalPickerEventListeners() {
        try {
            // Patient information change handlers - BMI calculation etc.
            if (this.digitalPickers.weight && this.digitalPickers.height) {
                const updateBMI = () => {
                    try {
                        const weight = this.digitalPickers.weight.getValue();
                        const height = this.digitalPickers.height.getValue() / 100; // Convert cm to m
                        const bmi = weight / (height * height);
                        const bmiElement = document.getElementById('bmiCalculated');
                        if (bmiElement) {
                            bmiElement.textContent = bmi.toFixed(1);
                        }
                    } catch (error) {
                        console.warn('Error updating BMI:', error);
                    }
                };
                
                // Add change callbacks via custom events or direct method calls
                if (this.digitalPickers.weight.inputEl) {
                    this.digitalPickers.weight.inputEl.addEventListener('input', updateBMI);
                }
                if (this.digitalPickers.height.inputEl) {
                    this.digitalPickers.height.inputEl.addEventListener('input', updateBMI);
                }
            }
            
            // Induction dose change handlers - Update induction engine
            if (this.digitalPickers.inductionBolus && this.digitalPickers.inductionContinuous) {
                const updateInductionDose = () => {
                    try {
                        const bolus = this.digitalPickers.inductionBolus.getValue();
                        const continuous = this.digitalPickers.inductionContinuous.getValue();
                        if (this.inductionEngine) {
                            this.inductionEngine.updateDose(bolus, continuous);
                        }
                    } catch (error) {
                        console.warn('Error updating induction dose:', error);
                    }
                };
                
                if (this.digitalPickers.inductionBolus.inputEl) {
                    this.digitalPickers.inductionBolus.inputEl.addEventListener('input', updateInductionDose);
                }
                if (this.digitalPickers.inductionContinuous.inputEl) {
                    this.digitalPickers.inductionContinuous.inputEl.addEventListener('input', updateInductionDose);
                }
            }
        } catch (error) {
            console.error('Error setting up digital picker event listeners:', error);
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
        
        // Update digital pickers with current patient data
        if (this.digitalPickers.age) this.digitalPickers.age.setValue(patient.age);
        if (this.digitalPickers.weight) this.digitalPickers.weight.setValue(patient.weight);
        if (this.digitalPickers.height) this.digitalPickers.height.setValue(patient.height);
        const sexRadio = document.querySelector(`input[name="sex"][value="${patient.sex === SexType.MALE ? 'male' : 'female'}"]`);
        if (sexRadio) sexRadio.checked = true;
        
        const asaRadio = document.querySelector(`input[name="asa"][value="${patient.asaPS === AsapsType.CLASS_1_2 ? '1-2' : '3-4'}"]`);
        if (asaRadio) asaRadio.checked = true;
        
        const anesthesiaStartEl = document.getElementById('editAnesthesiaStart');
        if (anesthesiaStartEl) anesthesiaStartEl.value = patient.formattedStartTime;
        
        // Update display values (old slider values - may not exist if using digital pickers)
        const ageValueEl = document.getElementById('ageValue');
        if (ageValueEl) ageValueEl.textContent = patient.age;
        
        const weightValueEl = document.getElementById('weightValue');
        if (weightValueEl) weightValueEl.textContent = patient.weight.toFixed(1);
        
        const heightValueEl = document.getElementById('heightValue');
        if (heightValueEl) heightValueEl.textContent = patient.height;
        
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
        
        // Reset digital pickers if available
        if (this.digitalPickers.doseBolus) {
            this.digitalPickers.doseBolus.setValue(0);
        }
        if (this.digitalPickers.doseContinuous) {
            this.digitalPickers.doseContinuous.setValue(0);
        }
        
        // Fallback for old slider elements
        const bolusAmountEl = document.getElementById('doseBolusAmount');
        if (bolusAmountEl) bolusAmountEl.value = 0;
        const continuousRateEl = document.getElementById('doseContinuousRate');
        if (continuousRateEl) continuousRateEl.value = 0;
        
        const bolusValueEl = document.getElementById('doseBolusValue');
        if (bolusValueEl) bolusValueEl.textContent = '0.0';
        const continuousValueEl = document.getElementById('doseContinuousValue');
        if (continuousValueEl) continuousValueEl.textContent = '0.00';
        
        const startRefEl = document.getElementById('anesthesiaStartReference');
        if (startRefEl) startRefEl.textContent = this.appState.patient.formattedStartTime;
        
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
        
        // Update patient using digital pickers
        this.appState.patient.id = document.getElementById('editPatientId').value;
        this.appState.patient.age = this.digitalPickers.age ? this.digitalPickers.age.getValue() : parseInt(document.getElementById('editAge')?.value || 50);
        this.appState.patient.weight = this.digitalPickers.weight ? this.digitalPickers.weight.getValue() : parseFloat(document.getElementById('editWeight')?.value || 70);
        this.appState.patient.height = this.digitalPickers.height ? this.digitalPickers.height.getValue() : parseFloat(document.getElementById('editHeight')?.value || 170);
        this.appState.patient.sex = formData.get('sex') === 'male' ? SexType.MALE : SexType.FEMALE;
        this.appState.patient.asaPS = formData.get('asa') === '1-2' ? AsapsType.CLASS_1_2 : AsapsType.CLASS_3_4;
        this.appState.patient.anesthesiaStartTime = anesthesiaStart;
        
        // Validate patient data
        const validation = this.appState.patient.validate();
        if (!validation.isValid) {
            alert('Input Error:\n' + validation.errors.join('\n'));
            return;
        }
        
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
        const bolusAmount = this.digitalPickers.doseBolus ? this.digitalPickers.doseBolus.getValue() : parseFloat(document.getElementById('doseBolusAmount')?.value || 0);
        const continuousRate = this.digitalPickers.doseContinuous ? this.digitalPickers.doseContinuous.getValue() : parseFloat(document.getElementById('doseContinuousRate')?.value || 0);
        
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
        const bolusDose = this.digitalPickers.inductionBolus ? this.digitalPickers.inductionBolus.getValue() : parseFloat(document.getElementById('inductionBolus')?.value || 7);
        const continuousDose = this.digitalPickers.inductionContinuous ? this.digitalPickers.inductionContinuous.getValue() : parseFloat(document.getElementById('inductionContinuous')?.value || 1);
        
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
        try {
            let weight, height;
            
            // Try digital pickers first, then fallback to sliders
            if (this.digitalPickers?.weight && this.digitalPickers?.height) {
                weight = this.digitalPickers.weight.getValue();
                height = this.digitalPickers.height.getValue();
            } else {
                const weightEl = document.getElementById('editWeight');
                const heightEl = document.getElementById('editHeight');
                weight = weightEl ? parseFloat(weightEl.value) : 70;
                height = heightEl ? parseFloat(heightEl.value) : 170;
            }
            
            const bmi = weight / Math.pow(height / 100, 2);
            const bmiElement = document.getElementById('bmiCalculated');
            if (bmiElement) {
                bmiElement.textContent = bmi.toFixed(1);
            }
        } catch (error) {
            console.warn('Error updating BMI calculation:', error);
        }
    }

    updateInductionDisplay(state) {
        document.getElementById('plasmaConcentration').textContent = state.plasmaConcentration.toFixed(3);
        document.getElementById('effectConcentration').textContent = state.effectSiteConcentration.toFixed(3);
        document.getElementById('elapsedTime').textContent = state.elapsedTimeString;
        
        if (state.snapshots.length > 0) {
            this.updateSnapshotsDisplay();
        }
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
}

// Initialize application when script loads
const app = new MainApplicationController();

// Export for global access
if (typeof window !== 'undefined') {
    window.app = app;
}