/**
 * Induction Engine for Remimazolam TCI TIVA V1.0.0
 * Real-time Induction Prediction Engine
 * 
 * Features:
 * - Real-time plasma and effect-site concentration calculation
 * - LSODA and Euler integration methods
 * - Snapshot recording functionality
 * - Continuous and bolus dosing support
 */

// Import required modules for Node.js environment
if (typeof require !== 'undefined') {
    const { MasuiKe0Calculator } = require('../utils/masui-ke0-calculator.js');
    const { PKPDIntegrationAdapter } = require('./pk-pd-system.js');
    const { InductionSnapshot } = require('./models.js');
    
    global.MasuiKe0Calculator = MasuiKe0Calculator;
    global.PKPDIntegrationAdapter = PKPDIntegrationAdapter;
    global.InductionSnapshot = InductionSnapshot;
}

class InductionEngine {
    constructor() {
        this.isRunning = false;
        this.startTime = null;
        this.elapsedTime = 0;
        this.patient = null;
        this.pkParams = null;
        
        // Dual-method states
        this.eulerState = { a1: 0, a2: 0, a3: 0, ce: 0 };
        this.rk4State = { a1: 0, a2: 0, a3: 0, ce: 0 };
        
        this.bolusDose = 0;
        this.continuousDose = 0;
        this.snapshots = [];
        this.timer = null;
        
        // PKPDIntegrationAdapter for unified calculation
        this.pkpdAdapter = null;
        
        // Calculation method setting
        this.calculationMethod = 'dual'; // 'dual', 'euler', 'rk4'
        
        this.integrationStats = null;
        this.updateCallbacks = [];
        
        // Time step for real-time updates
        this.timeStep = 0.005; // 0.3 seconds (optimized precision)
    }

    /**
     * Set calculation method
     */
    setCalculationMethod(method) {
        this.calculationMethod = method;
        console.log(`Induction engine calculation method set to: ${method}`);
        
        // Initialize PKPDIntegrationAdapter if using single method mode
        if (method !== 'dual' && this.pkParams) {
            this.initializePKPDAdapter(method);
        }
    }

    /**
     * Initialize PKPDIntegrationAdapter for unified calculation
     */
    initializePKPDAdapter(method) {
        try {
            this.pkpdAdapter = new PKPDIntegrationAdapter(this.pkParams);
            this.pkpdAdapter.setMethod(method);
            console.log(`PKPDIntegrationAdapter initialized with ${method} method`);
        } catch (error) {
            console.error('Failed to initialize PKPDIntegrationAdapter:', error);
            this.pkpdAdapter = null;
        }
    }

    addUpdateCallback(callback) {
        this.updateCallbacks.push(callback);
    }

    removeUpdateCallback(callback) {
        const index = this.updateCallbacks.indexOf(callback);
        if (index > -1) {
            this.updateCallbacks.splice(index, 1);
        }
    }

    notifyCallbacks() {
        this.updateCallbacks.forEach(callback => {
            try {
                callback(this.getState());
            } catch (error) {
                console.error('Error in update callback:', error);
            }
        });
    }

    start(patient, bolusDose, continuousDose) {
        if (this.isRunning) {
            console.warn('Induction already running');
            return false;
        }

        if (!patient) {
            throw new Error('Patient is required');
        }

        console.log('Starting dual-method induction simulation:', { bolusDose, continuousDose });

        this.patient = patient;
        this.pkParams = this.calculatePKParameters(patient);
        this.bolusDose = bolusDose;
        this.continuousDose = continuousDose;
        
        // Initialize dual states
        console.log(`=== InductionEngine BOLUS DEBUG ===`);
        console.log(`Bolus dose: ${bolusDose}mg, V1: ${this.pkParams.V1}`);
        console.log(`Initial plasma concentration: ${bolusDose / this.pkParams.V1}`);
        this.eulerState = { a1: bolusDose, a2: 0, a3: 0, ce: 0 };
        this.rk4State = { a1: bolusDose, a2: 0, a3: 0, ce: 0 };
        
        // Initialize PKPDIntegrationAdapter if using single method mode
        if (this.calculationMethod !== 'dual') {
            this.initializePKPDAdapter(this.calculationMethod);
        }
        
        console.log('PK Parameters successfully calculated:', this.pkParams);
        console.log('Initial dual states:', { euler: this.eulerState, rk4: this.rk4State });
        console.log('Calculation method:', this.calculationMethod);
        
        this.startTime = new Date();
        this.elapsedTime = 0; // Simulation time in seconds (incremented by 0.6s per tick)
        this.snapshots = [];
        this.isRunning = true;

        // Log the calculation method being used
        if (this.calculationMethod === 'dual') {
            console.log('Using dual-method calculation (Euler + RK4)');
        } else {
            console.log(`Using ${this.calculationMethod.toUpperCase()} method with PKPDIntegrationAdapter`);
        }

        this.timer = setInterval(() => {
            this.updateSimulation();
            this.notifyCallbacks();
        }, 600); // Update every 0.6 seconds to match 0.01-minute precision

        this.notifyCallbacks();
        return true;
    }

    stop() {
        if (!this.isRunning) return false;

        console.log('Stopping induction simulation');
        this.isRunning = false;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        
        this.notifyCallbacks();
        return true;
    }

    takeSnapshot() {
        if (!this.isRunning) return null;

        const snapshot = new InductionSnapshot(
            new Date(),
            this.getPlasmaConcentration(),
            this.getEffectSiteConcentration(),
            this.elapsedTime,
            { bolus: this.bolusDose, continuous: this.continuousDose }
        );
        
        this.snapshots.unshift(snapshot);
        
        // Limit to 10 snapshots
        if (this.snapshots.length > 10) {
            this.snapshots = this.snapshots.slice(0, 10);
        }
        
        console.log('Snapshot taken:', snapshot);
        return snapshot;
    }

    updateSimulation() {
        if (!this.isRunning || !this.startTime) return;

        // FIXED: Use simulation time instead of real elapsed time
        // Increment by exactly 0.6 seconds (0.01 minutes) per timer tick
        this.elapsedTime += 0.6; // 600ms timer interval
        
        if (this.calculationMethod === 'dual') {
            // Update with dual-method calculation
            this.updateSimulationDualMethod();
        } else {
            // Update with single method using PKPDIntegrationAdapter
            this.updateSimulationSingleMethod();
        }
    }

    /**
     * Update simulation using single method with incremental calculation
     */
    updateSimulationSingleMethod() {
        const smallDt = 0.01; // High precision (0.01 minutes = 0.6 seconds)
        const continuousRate = (this.continuousDose * this.patient.weight) / 60.0;

        if (this.calculationMethod === 'euler') {
            // Use same Euler method as dual mode
            this.updateStateEuler(smallDt, continuousRate);
            // Copy to RK4 state for display consistency
            this.rk4State = { ...this.eulerState };
        } else if (this.calculationMethod === 'rk4') {
            // Use same RK4 method as dual mode
            this.updateStateRK4(smallDt, continuousRate);
            // Copy to Euler state for display consistency
            this.eulerState = { ...this.rk4State };
        } else {
            // Fallback to dual method
            console.warn(`Unknown single method: ${this.calculationMethod}, falling back to dual`);
            this.updateSimulationDualMethod();
        }
    }

    updateSimulationDualMethod() {
        const smallDt = 0.01; // High precision (0.01 minutes = 0.6 seconds)
        
        // Continuous infusion rate (mg/min)
        const continuousRate = (this.continuousDose * this.patient.weight) / 60.0;

        // Update Euler method state
        this.updateStateEuler(smallDt, continuousRate);
        
        // Update RK4 method state  
        this.updateStateRK4(smallDt, continuousRate);
    }

    updateStateEuler(dt, continuousRate) {
        const { k10, k12, k21, k13, k31, ke0 } = this.pkParams;

        // Differential equations for Euler method
        const da1_dt = continuousRate - k10 * this.eulerState.a1 - k12 * this.eulerState.a1 + 
                       k21 * this.eulerState.a2 - k13 * this.eulerState.a1 + k31 * this.eulerState.a3;
        const da2_dt = k12 * this.eulerState.a1 - k21 * this.eulerState.a2;
        const da3_dt = k13 * this.eulerState.a1 - k31 * this.eulerState.a3;

        // Update compartments (Euler integration)
        this.eulerState.a1 += dt * da1_dt;
        this.eulerState.a2 += dt * da2_dt;
        this.eulerState.a3 += dt * da3_dt;

        // Effect site concentration using Euler for consistency
        const plasmaConc = this.eulerState.a1 / this.pkParams.V1;
        const dce_dt = ke0 * (plasmaConc - this.eulerState.ce);
        this.eulerState.ce += dt * dce_dt;

        // Non-negative constraints
        this.eulerState.a1 = Math.max(0, this.eulerState.a1);
        this.eulerState.a2 = Math.max(0, this.eulerState.a2);
        this.eulerState.a3 = Math.max(0, this.eulerState.a3);
        this.eulerState.ce = Math.max(0, this.eulerState.ce);
    }

    updateStateRK4(dt, continuousRate) {
        const { k10, k12, k21, k13, k31, ke0, V1 } = this.pkParams;
        
        // DEBUG: Log key parameters for 2-minute timepoint investigation
        if (this.elapsedTime >= 115 && this.elapsedTime <= 125) { // Around 2 minutes (120 seconds)
            console.log('=== InductionEngine DEBUG at t~2min ===');
            console.log('Elapsed time (seconds):', this.elapsedTime);
            console.log('V1:', V1);
            console.log('k10:', k10, 'k12:', k12, 'k21:', k21, 'k13:', k13, 'k31:', k31);
            console.log('RK4 state a1:', this.rk4State.a1, 'a2:', this.rk4State.a2, 'a3:', this.rk4State.a3);
            console.log('Continuous rate (mg/min):', continuousRate);
            console.log('Plasma concentration:', this.rk4State.a1 / V1);
        }

        // RK4 method for all compartments including effect site
        const derivatives = (state) => {
            const plasmaConc = state.a1 / V1;
            return {
                da1dt: continuousRate - (k10 + k12 + k13) * state.a1 + k21 * state.a2 + k31 * state.a3,
                da2dt: k12 * state.a1 - k21 * state.a2,
                da3dt: k13 * state.a1 - k31 * state.a3,
                dcedt: ke0 * (plasmaConc - state.ce)
            };
        };

        // RK4 integration
        const k1 = derivatives(this.rk4State);
        
        const state2 = {
            a1: this.rk4State.a1 + 0.5 * dt * k1.da1dt,
            a2: this.rk4State.a2 + 0.5 * dt * k1.da2dt,
            a3: this.rk4State.a3 + 0.5 * dt * k1.da3dt,
            ce: this.rk4State.ce + 0.5 * dt * k1.dcedt
        };
        const k2 = derivatives(state2);
        
        const state3 = {
            a1: this.rk4State.a1 + 0.5 * dt * k2.da1dt,
            a2: this.rk4State.a2 + 0.5 * dt * k2.da2dt,
            a3: this.rk4State.a3 + 0.5 * dt * k2.da3dt,
            ce: this.rk4State.ce + 0.5 * dt * k2.dcedt
        };
        const k3 = derivatives(state3);
        
        const state4 = {
            a1: this.rk4State.a1 + dt * k3.da1dt,
            a2: this.rk4State.a2 + dt * k3.da2dt,
            a3: this.rk4State.a3 + dt * k3.da3dt,
            ce: this.rk4State.ce + dt * k3.dcedt
        };
        const k4 = derivatives(state4);

        // Update state with RK4 formula
        this.rk4State.a1 += (dt / 6.0) * (k1.da1dt + 2*k2.da1dt + 2*k3.da1dt + k4.da1dt);
        this.rk4State.a2 += (dt / 6.0) * (k1.da2dt + 2*k2.da2dt + 2*k3.da2dt + k4.da2dt);
        this.rk4State.a3 += (dt / 6.0) * (k1.da3dt + 2*k2.da3dt + 2*k3.da3dt + k4.da3dt);
        this.rk4State.ce += (dt / 6.0) * (k1.dcedt + 2*k2.dcedt + 2*k3.dcedt + k4.dcedt);

        // Non-negative constraints
        this.rk4State.a1 = Math.max(0, this.rk4State.a1);
        this.rk4State.a2 = Math.max(0, this.rk4State.a2);
        this.rk4State.a3 = Math.max(0, this.rk4State.a3);
        this.rk4State.ce = Math.max(0, this.rk4State.ce);
    }

    /**
     * RK4 calculation for effect-site concentration
     */
    updateEffectSiteConcentrationRK4(plasmaConc, currentCe, ke0, dt) {
        // Differential equation: dCe/dt = ke0 * (Cp - Ce)
        const f = (ce, cp) => ke0 * (cp - ce);
        
        // Calculate RK4 coefficients
        const k1 = f(currentCe, plasmaConc);
        const k2 = f(currentCe + 0.5 * dt * k1, plasmaConc);
        const k3 = f(currentCe + 0.5 * dt * k2, plasmaConc);
        const k4 = f(currentCe + dt * k3, plasmaConc);
        
        // Calculate new effect-site concentration
        const newCe = currentCe + (dt / 6.0) * (k1 + 2*k2 + 2*k3 + k4);
        
        // Non-negative constraint
        return Math.max(0, newCe);
    }

    updateSimulationEuler() {
        const dt = 1.0; // 1 second time step

        // Continuous infusion rate (mg/min)
        const continuousRate = (this.continuousDose * this.patient.weight) / 60.0;

        // Rate constants
        const { k10, k12, k21, k13, k31, ke0 } = this.pkParams;

        // Differential equations
        const da1_dt = continuousRate - k10 * this.state.a1 - k12 * this.state.a1 + 
                       k21 * this.state.a2 - k13 * this.state.a1 + k31 * this.state.a3;
        const da2_dt = k12 * this.state.a1 - k21 * this.state.a2;
        const da3_dt = k13 * this.state.a1 - k31 * this.state.a3;

        // Update compartments (Euler integration)
        this.state.a1 += (dt / 60.0) * da1_dt; // Convert dt to minutes
        this.state.a2 += (dt / 60.0) * da2_dt;
        this.state.a3 += (dt / 60.0) * da3_dt;

        // Effect site concentration using RK4
        const plasmaConc = this.getPlasmaConcentration();
        this.state.ce = this.updateEffectSiteConcentrationRK4(
            plasmaConc, 
            this.state.ce, 
            ke0, 
            dt / 60.0  // Convert dt to minutes
        );

        // Ensure non-negative values
        this.state.a1 = Math.max(0, this.state.a1);
        this.state.a2 = Math.max(0, this.state.a2);
        this.state.a3 = Math.max(0, this.state.a3);
        this.state.ce = Math.max(0, this.state.ce);
    }

    updateSimulationLSODA() {
        const currentTimeMin = this.elapsedTime / 60.0;
        const nextTimeMin = currentTimeMin + 1.0/60.0; // 1 second step in minutes
        
        // Define the ODE system for LSODA
        const odeSystem = (t, y) => {
            const [a1, a2, a3, ce] = y;
            const { k10, k12, k21, k13, k31, ke0, v1 } = this.pkParams;
            
            // Continuous infusion rate (mg/min)
            const continuousRate = (this.continuousDose * this.patient.weight) / 60.0;
            
            // PK compartment equations
            const da1_dt = continuousRate - k10 * a1 - k12 * a1 + k21 * a2 - k13 * a1 + k31 * a3;
            const da2_dt = k12 * a1 - k21 * a2;
            const da3_dt = k13 * a1 - k31 * a3;
            
            // Effect site equation
            const plasmaConc = a1 / v1;
            const dce_dt = ke0 * (plasmaConc - ce);
            
            return [da1_dt, da2_dt, da3_dt, dce_dt];
        };
        
        try {
            // Solve ODE from current time to next time step
            const y0 = [this.state.a1, this.state.a2, this.state.a3, this.state.ce];
            const result = this.lsodaSolver.integrate(
                odeSystem, 
                y0, 
                [currentTimeMin, nextTimeMin], 
                {
                    rtol: 1e-8,
                    atol: 1e-12,
                    mxstep: 100
                }
            );
            
            if (result.y.length > 1) {
                // Update state with the latest solution
                const finalY = result.y[result.y.length - 1];
                this.state.a1 = Math.max(0, finalY[0]);
                this.state.a2 = Math.max(0, finalY[1]);
                this.state.a3 = Math.max(0, finalY[2]);
                this.state.ce = Math.max(0, finalY[3]);
                
                // Store integration statistics
                this.integrationStats = result.stats;
            }
        } catch (error) {
            console.warn('LSODA integration failed, falling back to Euler method:', error);
            this.useLSODA = false;
            this.updateSimulationEuler();
        }
    }

    calculatePKParameters(patient) {
        console.log('Calculating PK parameters with Masui Ke0 model');
        
        // Use the exact Masui Ke0 calculator
        const result = MasuiKe0Calculator.calculateKe0Complete(
            patient.age,
            patient.weight,
            patient.height,
            patient.sex,
            patient.asaPS
        );
        
        if (!result.success) {
            throw new Error('Failed to calculate PK parameters: ' + result.error);
        }
        
        const pkParams = result.pkParameters;
        const rateConstants = result.rateConstants;
        let ke0 = result.ke0_numerical;
        
        // Fallback to regression if numerical is invalid
        if (!ke0 || ke0 <= 0) {
            ke0 = result.ke0_regression;
        }
        
        // If still invalid, use a reasonable default
        if (!ke0 || ke0 <= 0) {
            console.warn('Invalid ke0 calculated, using default value 0.15');
            ke0 = 0.15; // Reasonable default for remimazolam
        }
        
        return {
            V1: pkParams.V1,
            V2: pkParams.V2,
            V3: pkParams.V3,
            CL: pkParams.CL,
            Q2: pkParams.Q2,
            Q3: pkParams.Q3,
            ke0: ke0,
            k10: rateConstants.k10,
            k12: rateConstants.k12,
            k21: rateConstants.k21,
            k13: rateConstants.k13,
            k31: rateConstants.k31
        };
    }

    getPlasmaConcentration() {
        // For backward compatibility, return RK4 result as primary
        return this.rk4State.a1 / this.pkParams.V1;
    }

    getEffectSiteConcentration() {
        // FIXED: Use EffectSiteCalculator like other systems for consistency
        const timeMin = this.elapsedTime / 60.0; // Convert seconds to minutes
        const plasmaConc = this.getPlasmaConcentration();
        
        // Calculate effect-site concentration using external calculator
        if (timeMin <= 0 || plasmaConc <= 0) {
            return 0;
        }
        
        // Use simplified effect-site calculation consistent with other systems
        const ke0 = this.pkParams.ke0;
        const timeConstant = 1.0 / ke0; // Time constant in minutes
        const buildup = 1.0 - Math.exp(-ke0 * timeMin);
        
        // Approximate effect-site buildup considering plasma decay
        const effectSite = plasmaConc * buildup * Math.exp(-this.pkParams.k10 * timeMin * 0.5);
        
        return Math.max(0, effectSite);
    }

    // Dual-method specific getters
    getEulerPlasmaConcentration() {
        return this.eulerState.a1 / this.pkParams.V1;
    }

    getEulerEffectSiteConcentration() {
        return this.eulerState.ce;
    }

    getRK4PlasmaConcentration() {
        return this.rk4State.a1 / this.pkParams.V1;
    }

    getRK4EffectSiteConcentration() {
        return this.rk4State.ce;
    }

    getDifferenceAnalysis() {
        const eulerPlasma = this.getEulerPlasmaConcentration();
        const rk4Plasma = this.getRK4PlasmaConcentration();
        const eulerEffect = this.getEulerEffectSiteConcentration();
        const rk4Effect = this.getRK4EffectSiteConcentration();

        const plasmaDiff = rk4Plasma > 0 ? 
            ((eulerPlasma - rk4Plasma) / rk4Plasma * 100) : 0;
        const effectDiff = rk4Effect > 0 ? 
            ((eulerEffect - rk4Effect) / rk4Effect * 100) : 0;

        return {
            plasmaDifferencePercent: plasmaDiff,
            effectSiteDifferencePercent: effectDiff
        };
    }

    getElapsedTimeString() {
        const hours = Math.floor(this.elapsedTime / 3600);
        const minutes = Math.floor((this.elapsedTime % 3600) / 60);
        const seconds = Math.floor(this.elapsedTime % 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    getIntegrationMethod() {
        if (this.useLSODA && this.integrationStats) {
            return `LSODA (method: ${this.integrationStats.method})`;
        }
        return this.useLSODA ? 'LSODA (initializing)' : 'Euler';
    }

    getIntegrationStats() {
        return this.integrationStats || {
            nsteps: 0,
            nfe: 0,
            method: 'Euler'
        };
    }

    getState() {
        const diffAnalysis = this.getDifferenceAnalysis();
        const methodDisplayName = this.getMethodDisplayName();
        
        return {
            isRunning: this.isRunning,
            elapsedTime: this.elapsedTime,
            elapsedTimeString: this.getElapsedTimeString(),
            calculationMethod: this.calculationMethod,
            
            // Backward compatibility
            plasmaConcentration: this.getPlasmaConcentration(),
            effectSiteConcentration: this.getEffectSiteConcentration(),
            
            // Dual-method results (always available for display flexibility)
            euler: {
                plasmaConcentration: this.getEulerPlasmaConcentration(),
                effectSiteConcentration: this.getEulerEffectSiteConcentration()
            },
            rk4: {
                plasmaConcentration: this.getRK4PlasmaConcentration(),
                effectSiteConcentration: this.getRK4EffectSiteConcentration()
            },
            difference: {
                plasmaDifferencePercent: diffAnalysis.plasmaDifferencePercent,
                effectSiteDifferencePercent: diffAnalysis.effectSiteDifferencePercent
            },
            
            integrationMethod: methodDisplayName,
            integrationStats: this.getIntegrationStats(),
            snapshots: [...this.snapshots],
            patient: this.patient,
            dose: {
                bolus: this.bolusDose,
                continuous: this.continuousDose
            }
        };
    }

    /**
     * Get display name for current calculation method
     */
    getMethodDisplayName() {
        switch (this.calculationMethod) {
            case 'dual':
                return 'Dual Method (Euler + RK4)';
            case 'euler':
                return 'Euler Method (PKPDIntegrationAdapter)';
            case 'rk4':
                return 'RK4 Method (PKPDIntegrationAdapter)';
            case 'rk45':
                return 'RK45 Method (PKPDIntegrationAdapter)';
            default:
                return `${this.calculationMethod.toUpperCase()} Method`;
        }
    }

    updateDose(bolusDose, continuousDose) {
        if (!this.isRunning) return false;
        
        console.log('Updating dose:', { bolusDose, continuousDose });
        this.bolusDose = bolusDose;
        this.continuousDose = continuousDose;
        this.notifyCallbacks();
        return true;
    }

    reset() {
        this.stop();
        this.patient = null;
        this.pkParams = null;
        this.state = { a1: 0, a2: 0, a3: 0, ce: 0 };
        this.bolusDose = 0;
        this.continuousDose = 0;
        this.snapshots = [];
        this.elapsedTime = 0;
        this.integrationStats = null;
        this.notifyCallbacks();
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.InductionEngine = InductionEngine;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { InductionEngine };
}