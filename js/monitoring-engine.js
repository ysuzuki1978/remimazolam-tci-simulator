/**
 * Monitoring Engine for Remimazolam TCI TIVA V1.0.0
 * Actual Dosage Monitoring Engine
 * 
 * Features:
 * - VHAC (Variable-step Hybrid Algorithm for Ce) effect-site calculation
 * - LSODA integration with high precision
 * - Multiple calculation methods for effect-site concentrations
 * - Real-time dose event management
 * - Advanced pharmacokinetic simulation
 */

// Import required modules for Node.js environment
if (typeof require !== 'undefined') {
    const { MasuiKe0Calculator } = require('../utils/masui-ke0-calculator.js');
    const { calculateEffectSiteConcentrations } = require('../utils/vhac.js');
    const { NumericalSolvers } = require('./numerical-solvers.js');
    const { PKPDIntegrationAdapter } = require('./pk-pd-system.js');
    const { SystemState, TimePoint, SimulationResult } = require('./models.js');
    
    global.MasuiKe0Calculator = MasuiKe0Calculator;
    global.calculateEffectSiteConcentrations = calculateEffectSiteConcentrations;
    global.NumericalSolvers = NumericalSolvers;
    global.PKPDIntegrationAdapter = PKPDIntegrationAdapter;
    global.SystemState = SystemState;
    global.TimePoint = TimePoint;
    global.SimulationResult = SimulationResult;
}

// VHAC functions are now imported from utils/vhac.js

/**
 * Alternative effect-site concentration calculation using discrete time steps
 */
function calculateEffectSiteDiscrete(plasmaConcentrations, timePoints, ke0, dt = 0.1) {
    if (plasmaConcentrations.length !== timePoints.length) {
        throw new Error("Plasma concentrations and time points must have the same length");
    }
    
    if (ke0 <= 0) {
        throw new Error("ke0 must be positive");
    }
    
    const ceValues = new Array(timePoints.length).fill(0);
    ceValues[0] = 0.0; // Start with zero effect-site concentration
    
    for (let i = 1; i < timePoints.length; i++) {
        const timeDiff = timePoints[i] - timePoints[i-1];
        const cpStart = plasmaConcentrations[i-1];
        const cpEnd = plasmaConcentrations[i];
        const cePrev = ceValues[i-1];
        
        const numSubsteps = Math.max(1, Math.ceil(timeDiff / dt));
        const substepDt = timeDiff / numSubsteps;
        
        let ceCurrent = cePrev;
        
        for (let step = 1; step <= numSubsteps; step++) {
            const progress = (step - 0.5) / numSubsteps;
            const cpSubstep = cpStart + progress * (cpEnd - cpStart);
            
            const dce_dt = ke0 * (cpSubstep - ceCurrent);
            ceCurrent = ceCurrent + substepDt * dce_dt;
        }
        
        ceValues[i] = ceCurrent;
    }
    
    return ceValues;
}

class MonitoringEngine {
    constructor() {
        this.patient = null;
        this.doseEvents = [];
        this.lastSimulationResult = null;
        this.calculationMethod = 'RK4 Engine (High Precision)';
        this.precision = 0.01; // 0.01-minute high precision
    }

    setPatient(patient) {
        this.patient = patient;
        
        // Calculate and set PK parameters if not already set
        if (!this.patient.pkParams) {
            this.calculatePKParameters();
        }
        
        console.log('Patient set for monitoring engine:', patient.id);
    }

    /**
     * Calculate PK parameters for the patient using MasuiKe0Calculator
     */
    calculatePKParameters() {
        try {
            const result = MasuiKe0Calculator.calculateKe0Complete(
                this.patient.age,
                this.patient.weight,
                this.patient.height,
                this.patient.sex,
                this.patient.asaPS
            );

            if (result.success) {
                this.patient.pkParams = {
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
                
                console.log('PK parameters calculated for patient:', this.patient.pkParams);
            } else {
                throw new Error('Failed to calculate PK parameters: ' + result.error);
            }
        } catch (error) {
            console.error('Error calculating PK parameters:', error);
            throw error;
        }
    }

    addDoseEvent(doseEvent) {
        if (!doseEvent.validate().isValid) {
            throw new Error('Invalid dose event: ' + doseEvent.validate().errors.join(', '));
        }
        
        this.doseEvents.push(doseEvent);
        this.doseEvents.sort((a, b) => a.timeInMinutes - b.timeInMinutes);
        console.log('Dose event added:', doseEvent);
    }

    removeDoseEvent(index) {
        if (index >= 0 && index < this.doseEvents.length) {
            const removed = this.doseEvents.splice(index, 1)[0];
            console.log('Dose event removed:', removed);
            return removed;
        }
        return null;
    }

    getDoseEvents() {
        return [...this.doseEvents];
    }

    clearDoseEvents() {
        this.doseEvents = [];
        console.log('All dose events cleared');
    }


    /**
     * Perform high-precision pharmacokinetic simulation
     */
    runSimulation(simulationDurationMin = null) {
        if (!this.patient || !this.patient.pkParams) {
            throw new Error('Patient and PK parameters must be set before simulation');
        }

        if (!this.doseEvents || this.doseEvents.length === 0) {
            throw new Error('At least one dose event is required for simulation');
        }

        console.log('Running monitoring simulation with VHAC + RK4 engine');

        // Determine simulation duration
        const maxEventTime = Math.max(...this.doseEvents.map(event => event.timeInMinutes));
        const finalDuration = simulationDurationMin || (maxEventTime + 120.0);

        // Create high-precision time sequence
        const timeStep = this.precision;
        const times = [];
        for (let t = 0; t <= finalDuration; t += timeStep) {
            times.push(t);
        }

        // Calculate plasma concentrations using selected numerical method
        const plasmaResult = this.calculatePlasmaConcentrationsWithMethod(times);

        // Calculate effect-site concentrations using VHAC method
        const effectSiteResult = calculateEffectSiteConcentrations(
            plasmaResult.concentrations,
            times,
            this.patient.pkParams.ke0,
            true  // Use VHAC method
        );
        
        const effectSiteConcentrations = effectSiteResult.concentrations;

        // Create time points (sample every 1 minute for display)
        const timePoints = [];
        const sampleInterval = Math.round(1.0 / timeStep);

        for (let i = 0; i < times.length; i += sampleInterval) {
            if (i >= times.length) break;

            const currentTime = times[i];
            const plasma = plasmaResult.concentrations[i];
            const effectSite = effectSiteConcentrations[i];

            // Find corresponding dose event
            const doseEvent = this.doseEvents.find(event => 
                Math.abs(event.timeInMinutes - currentTime) < 0.5);

            const timePoint = new TimePoint(
                Math.round(currentTime),
                doseEvent || null,
                plasma,
                effectSite
            );
            timePoints.push(timePoint);
        }

        console.log('Creating SimulationResult with calculationMethod:', this.calculationMethod);
        
        this.lastSimulationResult = new SimulationResult(
            timePoints,
            this.patient,
            this.doseEvents,
            this.calculationMethod + " (V1.0.0)",
            new Date(),
            plasmaResult.concentrations,
            effectSiteConcentrations,
            times
        );

        console.log('Monitoring simulation completed');
        console.log(`Max plasma concentration: ${this.lastSimulationResult.maxPlasmaConcentration.toFixed(3)} μg/mL`);
        console.log(`Max effect site concentration: ${this.lastSimulationResult.maxEffectSiteConcentration.toFixed(3)} μg/mL`);

        return this.lastSimulationResult;
    }

    /**
     * Calculate plasma concentrations using selected numerical method
     */
    calculatePlasmaConcentrationsWithMethod(times) {
        // Extract simple method name from calculation method string, defaulting to RK4 for precision
        let selectedMethod = 'rk4';
        if (this.calculationMethod) {
            const methodLower = this.calculationMethod.toLowerCase();
            if (methodLower.includes('euler')) {
                selectedMethod = 'euler';
            } else if (methodLower.includes('rk4')) {
                selectedMethod = 'rk4';
            }
        }
        
        console.log(`=== MonitoringEngine UNIFIED INCREMENTAL Path ===`);
        console.log(`Using ${selectedMethod.toUpperCase()} integration with initial condition bolus processing`);
        console.log(`Dose events:`, this.doseEvents.map(e => ({ time: e.timeInMinutes, bolus: e.bolusMg, continuous: e.continuousMgKgHr })));
        console.log(`Patient weight: ${this.patient.weight}kg, V1: ${this.patient.pkParams.V1}`);
        
        // FIXED: Use incremental approach instead of PKPDIntegrationAdapter.simulate()
        // Initialize state with bolus dose as initial condition (like Real-time/Advanced systems)
        let state = new SystemState();
        
        // Apply bolus dose at t=0 as initial condition
        const initialBolus = this.doseEvents.find(e => e.timeInMinutes === 0 && e.bolusMg > 0);
        if (initialBolus) {
            state.a1 = initialBolus.bolusMg; // Set initial amount in central compartment
            console.log(`MonitoringEngine: Applied bolus as initial condition: a1=${state.a1}mg`);
        }
        
        // Find continuous rate from dose events
        let continuousRate = 0; // mg/min
        const continuousEvent = this.doseEvents.find(e => e.timeInMinutes === 0 && e.continuousMgKgHr > 0);
        if (continuousEvent) {
            continuousRate = (continuousEvent.continuousMgKgHr * this.patient.weight) / 60.0; // mg/kg/hr to mg/min
        }
        
        console.log(`MonitoringEngine: Continuous infusion rate: ${continuousRate} mg/min`);
        
        const concentrations = [];
        const timeStep = 0.01; // Use same timestep as other systems
        
        for (let i = 0; i < times.length; i++) {
            const targetTime = times[i];
            
            // Integrate from previous time to current time using small timesteps
            let currentTime = i > 0 ? times[i-1] : 0;
            
            while (currentTime < targetTime) {
                const dt = Math.min(timeStep, targetTime - currentTime);
                
                // Use RK4 integration for consistency
                if (selectedMethod === 'rk4') {
                    state = this.updateSystemStateRK4(state, continuousRate, dt);
                } else {
                    state = this.updateSystemStateEuler(state, continuousRate, dt);
                }
                
                currentTime += dt;
            }
            
            const plasmaConcentration = state.a1 / this.patient.pkParams.V1;
            concentrations.push(plasmaConcentration);
            
            // Debug logging for key timepoints
            if (Math.abs(targetTime - 2.0) < 0.01) {
                console.log(`MonitoringEngine at t=${targetTime}min: a1=${state.a1.toFixed(6)}mg, plasma=${plasmaConcentration.toFixed(6)} μg/mL`);
            }
        }
        
        console.log(`MonitoringEngine unified result: ${concentrations.length} data points`);
        console.log(`Sample concentrations:`, concentrations.slice(0, 3).map((c, i) => ({ 
            time: times[i], 
            plasma: c.toFixed(6)
        })));
        
        return {
            concentrations: concentrations,
            method: selectedMethod.toUpperCase()
        };
    }

    /**
     * RK4 integration for system state update (added for unified processing)
     */
    updateSystemStateRK4(state, infusionRateMgMin, dt) {
        const { k10, k12, k21, k13, k31 } = this.patient.pkParams;
        
        const derivatives = (s) => ({
            da1dt: infusionRateMgMin - (k10 + k12 + k13) * s.a1 + k21 * s.a2 + k31 * s.a3,
            da2dt: k12 * s.a1 - k21 * s.a2,
            da3dt: k13 * s.a1 - k31 * s.a3
        });
        
        const k1 = derivatives(state);
        const k2 = derivatives({
            a1: state.a1 + 0.5 * dt * k1.da1dt,
            a2: state.a2 + 0.5 * dt * k1.da2dt,
            a3: state.a3 + 0.5 * dt * k1.da3dt
        });
        const k3 = derivatives({
            a1: state.a1 + 0.5 * dt * k2.da1dt,
            a2: state.a2 + 0.5 * dt * k2.da2dt,
            a3: state.a3 + 0.5 * dt * k2.da3dt
        });
        const k4 = derivatives({
            a1: state.a1 + dt * k3.da1dt,
            a2: state.a2 + dt * k3.da2dt,
            a3: state.a3 + dt * k3.da3dt
        });
        
        return {
            a1: state.a1 + (dt / 6.0) * (k1.da1dt + 2*k2.da1dt + 2*k3.da1dt + k4.da1dt),
            a2: state.a2 + (dt / 6.0) * (k1.da2dt + 2*k2.da2dt + 2*k3.da2dt + k4.da2dt),
            a3: state.a3 + (dt / 6.0) * (k1.da3dt + 2*k2.da3dt + 2*k3.da3dt + k4.da3dt)
        };
    }

    /**
     * Euler integration for system state update
     */
    updateSystemStateEuler(state, infusionRateMgMin, dt) {
        const { k10, k12, k21, k13, k31 } = this.patient.pkParams;
        
        const da1dt = infusionRateMgMin - (k10 + k12 + k13) * state.a1 + k21 * state.a2 + k31 * state.a3;
        const da2dt = k12 * state.a1 - k21 * state.a2;
        const da3dt = k13 * state.a1 - k31 * state.a3;
        
        return {
            a1: state.a1 + dt * da1dt,
            a2: state.a2 + dt * da2dt,
            a3: state.a3 + dt * da3dt
        };
    }

    /**
     * Calculate plasma concentrations using 3-compartment model with high precision
     * DEPRECATED: Use calculatePlasmaConcentrationsWithMethod instead
     */
    calculatePlasmaConcentrationsAdvanced(times) {
        const timeStep = times.length > 1 ? times[1] - times[0] : this.precision;
        
        let state = new SystemState();
        const plasmaConcentrations = [];
        
        // Process events into bolus and infusion schedules
        const bolusEvents = [];
        const infusionEvents = [];
        
        for (const event of this.doseEvents) {
            const eventTime = event.timeInMinutes;
            
            if (event.bolusMg > 0) {
                bolusEvents.push({ time: eventTime, dose: event.bolusMg });
            }
            
            // Add infusion rate changes (including rate = 0 for stopping infusion)
            const newRate = event.continuousMgKgHr;
            if (infusionEvents.length === 0 || 
                newRate !== infusionEvents[infusionEvents.length - 1].rate) {
                infusionEvents.push({ time: eventTime, rate: newRate });
            }
        }
        
        // Sort events
        bolusEvents.sort((a, b) => a.time - b.time);
        infusionEvents.sort((a, b) => a.time - b.time);
        
        // Add initial zero infusion if needed
        if (infusionEvents.length === 0 || infusionEvents[0].time > 0) {
            infusionEvents.unshift({ time: 0.0, rate: 0.0 });
        }
        
        let bolusIndex = 0;
        let infusionIndex = 0;
        let currentInfusionRate = 0.0;
        
        // Use RK4 for now due to LSODA stability issues
        // TODO: Fix LSODA implementation in future version
        console.log('Using RK4 integration for monitoring simulation');
        console.log('Bolus events to process:', bolusEvents);
        console.log('Infusion events to process:', infusionEvents);
        return this.calculatePlasmaConcentrationsRK4(times, bolusEvents, infusionEvents);
        
        // LSODA implementation commented out temporarily
        /*
        if (typeof LSODA !== 'undefined') {
            return this.calculatePlasmaConcentrationsLSODA(times, bolusEvents, infusionEvents);
        } else {
            return this.calculatePlasmaConcentrationsRK4(times, bolusEvents, infusionEvents);
        }
        */
    }

    /**
     * LSODA-based plasma concentration calculation
     */
    calculatePlasmaConcentrationsLSODA(times, bolusEvents, infusionEvents) {
        const solver = new PKLSODASolver();
        const pkParams = {
            k10: this.patient.pkParams.k10,
            k12: this.patient.pkParams.k12,
            k21: this.patient.pkParams.k21,
            k13: this.patient.pkParams.k13,
            k31: this.patient.pkParams.k31
        };

        // Prepare infusion rates array
        const infusionRates = times.map(t => {
            const currentEvent = infusionEvents.slice().reverse().find(event => t >= event.time);
            const rate = currentEvent ? currentEvent.rate : 0.0;
            return (rate * this.patient.weight) / 60.0; // Convert to mg/min
        });

        try {
            // Convert bolus events to proper format for LSODA
            const bolusDoses = bolusEvents.map(event => ({
                time: event.time,
                amount: event.dose
            }));
            
            console.log('Debug LSODA inputs:');
            console.log('Times length:', times.length, 'First/Last:', times[0], times[times.length-1]);
            console.log('Infusion rates length:', infusionRates.length, 'First few:', infusionRates.slice(0, 3));
            console.log('Bolus doses:', bolusDoses);
            console.log('PK params:', pkParams);
            
            const result = solver.solve3Compartment(
                pkParams,
                times,
                infusionRates,
                bolusDoses,
                [0, 0, 0]
            );

            const concentrations = result.y.map(state => 
                Math.max(0.0, state[0] / this.patient.pkParams.V1)
            );

            console.log('LSODA simulation completed successfully');
            console.log('LSODA result length:', result.y.length);
            console.log('First few states:', result.y.slice(0, 3));
            console.log('First few concentrations:', concentrations.slice(0, 3));
            console.log('Max concentration:', Math.max(...concentrations));
            return {
                concentrations: concentrations,
                method: 'LSODA'
            };
        } catch (error) {
            console.warn('LSODA failed, falling back to RK4:', error);
            return this.calculatePlasmaConcentrationsRK4(times, bolusEvents, infusionEvents);
        }
    }

    /**
     * RK4-based plasma concentration calculation (fallback)
     */
    calculatePlasmaConcentrationsRK4(times, bolusEvents, infusionEvents) {
        const timeStep = times.length > 1 ? times[1] - times[0] : this.precision;
        let state = new SystemState(0.0, 0.0, 0.0); // Explicit initialization
        const plasmaConcentrations = [];
        
        console.log('RK4 starting with timeStep:', timeStep, 'initial state:', state);
        
        let bolusIndex = 0;
        let infusionIndex = 0;
        let currentInfusionRate = 0.0;
        
        for (let index = 0; index < times.length; index++) {
            const currentTime = times[index];
            
            // Apply bolus doses - same logic as original app
            while (bolusIndex < bolusEvents.length && 
                   Math.abs(bolusEvents[bolusIndex].time - currentTime) < timeStep / 2) {
                console.log(`=== MonitoringEngine BOLUS DEBUG ===`);
                console.log(`Before bolus: a1=${state.a1}, V1=${this.patient.pkParams.V1}`);
                console.log(`Before bolus plasma concentration: ${state.a1 / this.patient.pkParams.V1}`);
                state.a1 += bolusEvents[bolusIndex].dose;
                console.log(`Applied bolus: ${bolusEvents[bolusIndex].dose}mg at time ${currentTime} (bolus time: ${bolusEvents[bolusIndex].time})`);
                console.log(`After bolus: a1=${state.a1}`);
                console.log(`After bolus plasma concentration: ${state.a1 / this.patient.pkParams.V1}`);
                bolusIndex++;
            }
            
            // Update infusion rate
            while (infusionIndex < infusionEvents.length && 
                   currentTime >= infusionEvents[infusionIndex].time) {
                currentInfusionRate = infusionEvents[infusionIndex].rate;
                infusionIndex++;
            }
            
            // Calculate plasma concentration
            const plasmaConc = Math.max(0.0, state.a1 / this.patient.pkParams.V1);
            plasmaConcentrations.push(plasmaConc);
            
            // Update state for next time step using RK4
            if (index < times.length - 1) {
                const infusionRateMgMin = (currentInfusionRate * this.patient.weight) / 60.0;
                state = this.updateStateRK4(state, infusionRateMgMin, timeStep, currentTime);
            }
        }
        
        console.log('RK4 simulation completed');
        console.log('RK4 result length:', plasmaConcentrations.length);
        console.log('First few concentrations:', plasmaConcentrations.slice(0, 5));
        console.log('Max concentration:', Math.max(...plasmaConcentrations));
        console.log('Final concentration:', plasmaConcentrations[plasmaConcentrations.length - 1]);
        
        return {
            concentrations: plasmaConcentrations,
            method: 'RK4'
        };
    }

    /**
     * 4th order Runge-Kutta integration for state update
     */
    updateStateRK4(state, infusionRateMgMin, dt, currentTime = 0) {
        const { k10, k12, k21, k13, k31 } = this.patient.pkParams;
        
        // DEBUG: Log key parameters for 2-minute timepoint investigation
        if (currentTime >= 1.99 && currentTime <= 2.01) {
            console.log('=== MonitoringEngine DEBUG at t=2min ===');
            console.log('Current time:', currentTime);
            console.log('V1:', this.patient.pkParams.V1);
            console.log('k10:', k10, 'k12:', k12, 'k21:', k21, 'k13:', k13, 'k31:', k31);
            console.log('Current state a1:', state.a1, 'a2:', state.a2, 'a3:', state.a3);
            console.log('Infusion rate (mg/min):', infusionRateMgMin);
            console.log('Plasma concentration:', state.a1 / this.patient.pkParams.V1);
        }
        
        const derivatives = (s) => ({
            da1dt: infusionRateMgMin - (k10 + k12 + k13) * s.a1 + k21 * s.a2 + k31 * s.a3,
            da2dt: k12 * s.a1 - k21 * s.a2,
            da3dt: k13 * s.a1 - k31 * s.a3
        });
        
        // 4th order Runge-Kutta integration
        const k1 = derivatives(state);
        const k2 = derivatives({
            a1: state.a1 + 0.5 * dt * k1.da1dt,
            a2: state.a2 + 0.5 * dt * k1.da2dt,
            a3: state.a3 + 0.5 * dt * k1.da3dt
        });
        const k3 = derivatives({
            a1: state.a1 + 0.5 * dt * k2.da1dt,
            a2: state.a2 + 0.5 * dt * k2.da2dt,
            a3: state.a3 + 0.5 * dt * k2.da3dt
        });
        const k4 = derivatives({
            a1: state.a1 + dt * k3.da1dt,
            a2: state.a2 + dt * k3.da2dt,
            a3: state.a3 + dt * k3.da3dt
        });
        
        return new SystemState(
            state.a1 + (dt / 6.0) * (k1.da1dt + 2*k2.da1dt + 2*k3.da1dt + k4.da1dt),
            state.a2 + (dt / 6.0) * (k1.da2dt + 2*k2.da2dt + 2*k3.da2dt + k4.da2dt),
            state.a3 + (dt / 6.0) * (k1.da3dt + 2*k2.da3dt + 2*k3.da3dt + k4.da3dt)
        );
    }

    getLastResult() {
        return this.lastSimulationResult;
    }

    getChartData() {
        if (!this.lastSimulationResult) return null;
        
        const timePoints = this.lastSimulationResult.timePoints;
        
        return {
            labels: timePoints.map(tp => tp.formattedClockTime(this.patient)),
            plasmaData: timePoints.map(tp => tp.plasmaConcentration),
            effectData: timePoints.map(tp => tp.effectSiteConcentration),
            doseEvents: this.doseEvents.map(event => ({
                time: event.timeInMinutes,
                clockTime: event.formattedClockTime(this.patient),
                bolus: event.bolusMg,
                continuous: event.continuousMgKgHr
            }))
        };
    }

    exportToCSV() {
        if (!this.lastSimulationResult) {
            throw new Error('No simulation result available for export');
        }
        
        return this.lastSimulationResult.toCSV();
    }

    /**
     * Generate time points for simulation
     */
    generateTimePoints(durationMin) {
        const timeStep = 0.5; // 0.5 minute intervals
        const times = [];
        for (let t = 0; t <= durationMin; t += timeStep) {
            times.push(t);
        }
        return times;
    }

    /**
     * Get current infusion rate at a specific time
     */
    getCurrentInfusionRate(time) {
        let currentRate = 0;
        for (const event of this.doseEvents) {
            if (event.timeInMinutes <= time) {
                currentRate = event.continuousMgKgHr * this.patient.weight / 60.0; // Convert to mg/min
            }
        }
        return currentRate;
    }

    /**
     * Export CSV with results from all calculation methods
     * Phase1-006: Multi-method comparison CSV export
     */
    exportAllMethodsToCSV() {
        if (!this.doseEvents || this.doseEvents.length === 0) {
            throw new Error('No dose events available for multi-method export');
        }

        if (!this.patient) {
            throw new Error('Patient information not available for simulation');
        }

        console.log('Starting multi-method CSV export...');
        console.log('PKPDIntegrationAdapter type:', typeof PKPDIntegrationAdapter);
        console.log('DoseEvent type:', typeof DoseEvent);
        
        const methods = ['euler', 'rk4'];
        const allResults = {};
        
        console.log('Methods to process:', methods);
        
        // Calculate results for each method
        for (const method of methods) {
            try {
                console.log(`Calculating with ${method} method...`);
                console.log(`Processing method: ${method} (${typeof method})`);
                
                // Temporarily store current method (will be restored later)
                this.calculationMethod = method;
                
                // Debug: Check if PKPDIntegrationAdapter is available and method is supported
                console.log(`PKPDIntegrationAdapter available: ${typeof PKPDIntegrationAdapter !== 'undefined'}`);
                if (typeof PKPDIntegrationAdapter !== 'undefined') {
                    const testAdapter = new PKPDIntegrationAdapter(this.patient.pkParams);
                    console.log(`Method ${method} set result:`, testAdapter.setMethod(method));
                    console.log(`Available methods:`, testAdapter.solver.listMethods().map(m => m.key));
                }
                
                // Run simulation with current method using unified numerical solvers
                const startTime = performance.now();
                
                // Use the same calculation method as regular simulation (runSimulation)
                // This ensures consistency between graph display and CSV export
                
                console.log(`Method ${method} set successfully, starting simulation...`);
                
                // Create time sequence with appropriate precision for the method
                let timeStep;
                switch(method) {
                    case 'euler':
                        timeStep = 0.01;  // Smaller step for Euler stability
                        break;
                    case 'rk4':
                        timeStep = this.precision; // Use same precision as normal simulation
                        break;
                    default:
                        timeStep = 0.1;
                }
                
                console.log(`Using timeStep ${timeStep} for method ${method}`);
                
                const simulationDuration = this.simulationDuration || 240;
                const times = [];
                for (let t = 0; t <= simulationDuration; t += timeStep) {
                    times.push(t);
                }
                
                // Temporarily change calculation method for this specific simulation
                const originalMethod = this.calculationMethod;
                this.calculationMethod = method;
                
                let result;
                if (method === 'euler' || method === 'rk4') {
                    // Use PKPDIntegrationAdapter to get real method-specific calculations
                    const adapter = new PKPDIntegrationAdapter(this.patient.pkParams);
                    adapter.setMethod(method);
                    
                    const adapterResult = adapter.simulate(this.doseEvents, this.patient, simulationDuration, {
                        timeStep: timeStep
                    });
                    
                    console.log(`${method} adapter simulation completed:`, {
                        dataPoints: adapterResult.timeSeriesData.length,
                        firstPlasma: adapterResult.timeSeriesData[0]?.plasmaConcentration,
                        maxPlasma: adapterResult.maxPlasmaConcentration,
                        method: adapterResult.stats?.method
                    });
                    
                    // Use adapter results directly - they already contain proper time series data
                    result = {
                        timeSeriesData: adapterResult.timeSeriesData,
                        finalPlasmaConcentration: adapterResult.finalPlasmaConcentration || 0,
                        finalEffectSiteConcentration: adapterResult.finalEffectSiteConcentration || 0,
                        maxPlasmaConcentration: adapterResult.maxPlasmaConcentration || 0,
                        maxEffectSiteConcentration: adapterResult.maxEffectSiteConcentration || 0,
                        stats: {
                            method: method,
                            totalSteps: adapterResult.timeSeriesData.length,
                            timeStep: timeStep
                        }
                    };
                } else {
                    // Fallback for other methods (shouldn't happen with current setup)
                    console.warn(`Unknown method ${method}, using default calculation`);
                    result = { timeSeriesData: [], maxPlasmaConcentration: 0, maxEffectSiteConcentration: 0 };
                }
                
                const endTime = performance.now();
                
                const formattedResult = {
                    timeSeriesData: result.timeSeriesData,
                    finalPlasmaConcentration: result.finalPlasmaConcentration,
                    finalEffectSiteConcentration: result.finalEffectSiteConcentration,
                    maxPlasmaConcentration: result.maxPlasmaConcentration,
                    maxEffectSiteConcentration: result.maxEffectSiteConcentration,
                    computationTime: endTime - startTime,
                    stats: result.stats
                };
                
                // Restore original method (removed restoration since not critical for CSV export)
                
                allResults[method] = formattedResult;
                
                console.log(`${method} calculation completed: ${allResults[method].timeSeriesData.length} data points`);
                console.log(`${method} first plasma concentration:`, formattedResult.timeSeriesData[0]?.plasmaConcentration);
                console.log(`${method} max plasma concentration:`, formattedResult.maxPlasmaConcentration);
                
            } catch (error) {
                console.error(`Failed to calculate with ${method} method:`, error);
                console.error(`${method} error details:`, error.message, error.stack);
                allResults[method] = null;
            }
        }

        // Generate combined CSV
        return this.generateMultiMethodCSV(allResults);
    }

    /**
     * Generate CSV with data from multiple calculation methods
     */
    generateMultiMethodCSV(allResults) {
        console.log('generateMultiMethodCSV called with results:', Object.keys(allResults));
        console.log('allResults values:', Object.keys(allResults).map(k => ({ [k]: allResults[k] !== null })));
        
        const validMethods = Object.keys(allResults).filter(method => allResults[method] !== null);
        
        console.log('Valid methods for CSV:', validMethods);
        
        if (validMethods.length === 0) {
            throw new Error('No valid calculation results for CSV export');
        }

        // Use the first valid method as the time reference
        const referenceMethod = validMethods[0];
        const referenceData = allResults[referenceMethod].timeSeriesData;
        
        // Build CSV header
        const headers = [
            'Time(min)',
            'InfusionRate(mg/min)'
        ];
        
        // Add method-specific columns
        for (const method of validMethods) {
            const methodName = method.toUpperCase();
            headers.push(
                `PlasmaConc_${methodName}(ug/mL)`,
                `EffectSiteConc_${methodName}(ug/mL)`
            );
        }
        
        // Add comparison columns
        if (validMethods.length > 1) {
            const baseMethod = validMethods[0].toUpperCase();
            for (let i = 1; i < validMethods.length; i++) {
                const compareMethod = validMethods[i].toUpperCase();
                headers.push(
                    `PlasmaConc_Diff_${compareMethod}_vs_${baseMethod}(%)`,
                    `EffectSiteConc_Diff_${compareMethod}_vs_${baseMethod}(%)`
                );
            }
        }
        
        // Add metadata columns
        for (const method of validMethods) {
            const methodName = method.toUpperCase();
            headers.push(`ComputationTime_${methodName}(ms)`);
            
            if (allResults[method].stats) {
                if (allResults[method].stats.totalSteps) {
                    headers.push(`TotalSteps_${methodName}`);
                }
                if (allResults[method].stats.acceptanceRate) {
                    headers.push(`AcceptanceRate_${methodName}`);
                }
            }
        }

        // Build CSV rows - filter to 1-minute intervals for readability
        const csvRows = [headers.join(',')];
        
        for (let i = 0; i < referenceData.length; i++) {
            const time = referenceData[i].time;
            
            // Only include data points at 1-minute intervals (0, 1, 2, 3...)
            if (Math.abs(time - Math.round(time)) > 0.001) {
                continue; // Skip non-integer minute times
            }
            
            const row = [];
            
            // Time and infusion rate
            row.push(time.toFixed(3));
            row.push((referenceData[i].infusionRate || 0).toFixed(6));
            
            // Method-specific concentrations with safe array access
            const methodValues = {};
            let hasValidData = false;
            
            for (const method of validMethods) {
                const methodData = allResults[method].timeSeriesData;
                let data = null;
                
                // Find data point closest to current time
                if (methodData && methodData.length > 0) {
                    // Try direct index first
                    if (i < methodData.length) {
                        data = methodData[i];
                    } else {
                        // Find closest time match if array lengths differ
                        data = methodData.find(d => Math.abs(d.time - time) < 0.01) || null;
                    }
                }
                
                const plasmaConc = data ? (data.plasmaConcentration || 0) : 0;
                const effectConc = data ? (data.effectSiteConcentration || 0) : 0;
                
                if (plasmaConc > 0 || effectConc > 0) {
                    hasValidData = true;
                }
                
                methodValues[method] = { plasmaConc, effectConc };
                
                row.push(plasmaConc.toFixed(6));
                row.push(effectConc.toFixed(6));
            }
            
            // Skip rows where all methods have zero values (likely beyond simulation time)
            if (!hasValidData) {
                continue;
            }
            
            // Comparison columns (percentage differences)
            if (validMethods.length > 1) {
                const baseMethod = validMethods[0];
                const baseValues = methodValues[baseMethod];
                
                for (let j = 1; j < validMethods.length; j++) {
                    const compareMethod = validMethods[j];
                    const compareValues = methodValues[compareMethod];
                    
                    const plasmaDiff = baseValues.plasmaConc > 0 ? 
                        ((compareValues.plasmaConc - baseValues.plasmaConc) / baseValues.plasmaConc * 100) : 0;
                    const effectDiff = baseValues.effectConc > 0 ? 
                        ((compareValues.effectConc - baseValues.effectConc) / baseValues.effectConc * 100) : 0;
                    
                    row.push(plasmaDiff.toFixed(3));
                    row.push(effectDiff.toFixed(3));
                }
            }
            
            // Metadata (only add once per row, not per time point)
            if (i === 0) {
                for (const method of validMethods) {
                    const result = allResults[method];
                    row.push((result.computationTime || 0).toFixed(2));
                    
                    if (result.stats) {
                        if (result.stats.totalSteps !== undefined) {
                            row.push(result.stats.totalSteps);
                        }
                        if (result.stats.acceptanceRate !== undefined) {
                            row.push(result.stats.acceptanceRate);
                        }
                    }
                }
            } else {
                // Fill metadata columns with empty values for subsequent rows
                const metadataColumns = validMethods.length + 
                    validMethods.filter(m => allResults[m].stats?.totalSteps !== undefined).length + 
                    validMethods.filter(m => allResults[m].stats?.acceptanceRate !== undefined).length;
                for (let k = 0; k < metadataColumns; k++) {
                    row.push('');
                }
            }
            
            csvRows.push(row.join(','));
        }
        
        // Add summary information at the end
        csvRows.push('');
        csvRows.push('=== SIMULATION SUMMARY ===');
        csvRows.push(`Patient: Age ${this.patient.age}, Weight ${this.patient.weight}kg, Height ${this.patient.height}cm`);
        csvRows.push(`Dose Events: ${this.doseEvents.length}`);
        csvRows.push(`Duration: ${this.simulationDuration || 240} minutes`);
        csvRows.push(`Methods Compared: ${validMethods.join(', ')}`);
        csvRows.push(`Export Time: ${new Date().toISOString()}`);
        
        // Add method-specific performance summary
        csvRows.push('');
        csvRows.push('=== METHOD PERFORMANCE ===');
        for (const method of validMethods) {
            const result = allResults[method];
            const methodName = method.toUpperCase();
            csvRows.push(`${methodName}: ${(result.computationTime || 0).toFixed(2)}ms, ${result.timeSeriesData.length} points`);
            
            if (result.stats) {
                let statsInfo = '';
                if (result.stats.totalSteps) statsInfo += `, ${result.stats.totalSteps} steps`;
                if (result.stats.acceptanceRate) statsInfo += `, ${result.stats.acceptanceRate} acceptance rate`;
                if (result.stats.method) statsInfo += `, ${result.stats.method}`;
                csvRows.push(`${methodName} Stats: ${statsInfo.substring(2)}`); // Remove leading ', '
            }
        }
        
        const dataRows = csvRows.length - 1 - 6; // Subtract header and summary rows
        console.log(`Multi-method CSV generated: ${dataRows} data rows (1-minute intervals), ${validMethods.length} methods`);
        console.log(`Methods included: ${validMethods.join(', ')}`);
        
        return csvRows.join('\n');
    }

    reset() {
        this.doseEvents = [];
        this.lastSimulationResult = null;
        console.log('Monitoring engine reset');
    }

    /**
     * Set calculation method for display
     * Phase1-006: Support method selection display
     */
    setCalculationMethod(method) {
        const methodNames = {
            'euler': 'Euler Method',
            'rk4': 'VHAC + RK4 Engine',
            'rk45': 'VHAC + RK45 Engine (Adaptive)'
        };
        
        this.calculationMethod = methodNames[method] || `VHAC + ${method.toUpperCase()} Engine`;
        console.log(`Monitoring calculation method set to: ${this.calculationMethod}`);
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.MonitoringEngine = MonitoringEngine;
    // calculateEffectSiteHybrid is imported from vhac.js, don't redefine it
    window.calculateEffectSiteDiscrete = calculateEffectSiteDiscrete;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        MonitoringEngine, 
        calculateEffectSiteDiscrete 
    };
}