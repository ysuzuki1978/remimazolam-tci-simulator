/**
 * PK/PD Model System Definitions for Remimazolam TCI TIVA V1.0.0
 * Unified ODE system functions for numerical solvers
 * 
 * Features:
 * - 3-compartment pharmacokinetic model
 * - Effect-site pharmacodynamics
 * - Compatible with all numerical solvers
 * - Masui 2022 model implementation
 */

/**
 * Create unified PK/PD ODE system for 3-compartment + effect-site model
 * @param {Object} pkParams - PK parameters {k10, k12, k21, k13, k31, ke0, V1}
 * @returns {function} - ODE system function
 */
function createPKPDSystem(pkParams) {
    const { k10, k12, k21, k13, k31, ke0, V1 } = pkParams;
    
    // Validate parameters
    if (!k10 || !k12 || !k21 || !k13 || !k31 || !ke0 || !V1) {
        throw new Error('Invalid PK parameters: all rate constants and V1 must be provided');
    }

    /**
     * ODE system function
     * @param {number} t - Current time
     * @param {Array} state - Current state [a1, a2, a3, ce]
     * @param {function} infusionRateFunc - Function to get infusion rate at time t
     * @returns {Array} - Derivatives [da1/dt, da2/dt, da3/dt, dce/dt]
     */
    return function(t, state, infusionRateFunc) {
        const [a1, a2, a3, ce] = state;
        const infusionRate = infusionRateFunc(t);
        
        // Current plasma concentration
        const plasmaConc = a1 / V1;
        
        // Differential equations for 3-compartment model
        const da1dt = infusionRate - (k10 + k12 + k13) * a1 + k21 * a2 + k31 * a3;
        const da2dt = k12 * a1 - k21 * a2;
        const da3dt = k13 * a1 - k31 * a3;
        
        // Effect-site equation
        const dcedt = ke0 * (plasmaConc - ce);
        
        return [da1dt, da2dt, da3dt, dcedt];
    };
}

/**
 * Create infusion rate function from protocol definition
 * @param {Array} doseEvents - Array of dose events {time, bolusMg, continuousMgKgHr}
 * @param {Object} patient - Patient object with weight
 * @returns {function} - Infusion rate function
 */
function createInfusionRateFunction(doseEvents, patient) {
    // Sort dose events by time
    const sortedEvents = [...doseEvents].sort((a, b) => a.timeInMinutes - b.timeInMinutes);
    
    console.log(`=== PKPDIntegrationAdapter createInfusionRateFunction DEBUG ===`);
    console.log(`Sorted dose events:`, sortedEvents.map(e => ({ time: e.timeInMinutes, bolus: e.bolusMg, continuous: e.continuousMgKgHr })));
    console.log(`Patient weight: ${patient.weight}kg`);
    
    return function(t) {
        let currentRate = 0; // mg/min
        let bolusDose = 0;   // mg (instant)
        
        // Find the most recent dose event
        for (const event of sortedEvents) {
            if (t >= event.timeInMinutes) {
                // Continuous infusion rate conversion
                currentRate = (event.continuousMgKgHr * patient.weight) / 60.0; // mg/kg/hr to mg/min
                
                // Bolus dose (only at exact time)
                if (Math.abs(t - event.timeInMinutes) < 0.001) {
                    bolusDose = event.bolusMg;
                    console.log(`=== PKPDIntegrationAdapter BOLUS DETECTED ===`);
                    console.log(`Time t=${t}, event time=${event.timeInMinutes}, bolus dose=${bolusDose}mg`);
                    console.log(`Delta function rate: ${bolusDose / 0.001} mg/min`);
                }
            } else {
                break;
            }
        }
        
        const totalRate = currentRate + (bolusDose > 0 ? bolusDose / 0.001 : 0);
        
        // Log for times around t=0 to see bolus processing
        if (t >= -0.01 && t <= 0.02) {
            console.log(`PKPDIntegrationAdapter rate function: t=${t}, continuous=${currentRate}, bolus=${bolusDose}, total=${totalRate}`);
        }
        
        // Return total rate (continuous + bolus delta function approximation)
        return totalRate;
    };
}

/**
 * Create simplified infusion rate function for testing
 * @param {number} continuousRate - Continuous rate in mg/min
 * @param {number} bolusTime - Time of bolus (optional)
 * @param {number} bolusDose - Bolus dose in mg (optional)
 * @returns {function} - Infusion rate function
 */
function createSimpleInfusionRate(continuousRate = 0, bolusTime = -1, bolusDose = 0) {
    return function(t) {
        let rate = continuousRate;
        
        // Add bolus at specific time
        if (bolusTime >= 0 && Math.abs(t - bolusTime) < 0.001) {
            rate += bolusDose / 0.001; // Delta function approximation
        }
        
        return rate;
    };
}

/**
 * Calculate initial state after bolus administration
 * @param {number} bolusDoseMg - Bolus dose in mg
 * @param {Object} pkParams - PK parameters
 * @returns {Array} - Initial state [a1, a2, a3, ce]
 */
function calculateBolusInitialState(bolusDoseMg, pkParams) {
    // Bolus is instantly distributed in V1
    return [
        bolusDoseMg, // a1: amount in central compartment
        0.0,         // a2: amount in peripheral compartment 2
        0.0,         // a3: amount in peripheral compartment 3
        0.0          // ce: effect-site concentration (takes time to equilibrate)
    ];
}

/**
 * Convert solver results to clinical format
 * @param {Object} solverResult - Result from numerical solver
 * @param {Object} pkParams - PK parameters
 * @param {Object} patient - Patient object
 * @returns {Object} - Clinical results with concentrations
 */
function convertToClinicalResults(solverResult, pkParams, patient, infusionRateFunc = null) {
    const { times, states, stats } = solverResult;
    const timeSeriesData = [];
    
    for (let i = 0; i < times.length; i++) {
        const [a1, a2, a3, ce] = states[i];
        const plasmaConc = a1 / pkParams.V1; // μg/mL
        const currentTime = times[i];
        
        // Calculate infusion rate at this time point
        let infusionRate = 0;
        if (infusionRateFunc) {
            try {
                infusionRate = infusionRateFunc(currentTime);
            } catch (error) {
                console.warn(`Error calculating infusion rate at time ${currentTime}:`, error);
                infusionRate = 0;
            }
        }
        
        timeSeriesData.push({
            time: parseFloat(currentTime.toFixed(2)),
            plasmaConcentration: plasmaConc,
            effectSiteConcentration: ce,
            infusionRate: infusionRate,
            compartmentAmounts: {
                a1: a1,
                a2: a2,
                a3: a3
            }
        });
    }
    
    return {
        timeSeriesData: timeSeriesData,
        stats: stats,
        maxPlasmaConcentration: Math.max(...timeSeriesData.map(d => d.plasmaConcentration)),
        maxEffectSiteConcentration: Math.max(...timeSeriesData.map(d => d.effectSiteConcentration)),
        finalPlasmaConcentration: timeSeriesData[timeSeriesData.length - 1].plasmaConcentration,
        finalEffectSiteConcentration: timeSeriesData[timeSeriesData.length - 1].effectSiteConcentration
    };
}

/**
 * Integration adapter for existing protocol engines
 * Provides compatibility with existing updateSystemStateRK4 interface
 */
class PKPDIntegrationAdapter {
    constructor(pkParams) {
        this.pkParams = pkParams;
        this.solver = new NumericalSolvers();
        this.odeSystem = createPKPDSystem(pkParams);
    }

    /**
     * Set numerical method
     * @param {string} method - Method name (euler, rk4, rk45)
     */
    setMethod(method) {
        return this.solver.setMethod(method);
    }

    /**
     * Compatible with existing updateSystemStateRK4 interface
     * @param {Object} state - Current state {a1, a2, a3}
     * @param {number} infusionRateMgMin - Infusion rate in mg/min
     * @param {number} dt - Time step
     * @returns {Object} - New state {a1, a2, a3}
     */
    updateSystemState(state, infusionRateMgMin, dt) {
        const initialState = [state.a1, state.a2, state.a3, 0]; // ce not used in this interface
        const infusionRateFunc = () => infusionRateMgMin;
        
        const result = this.solver.solve(
            this.odeSystem,
            initialState,
            [0, dt],
            { timeStep: dt, infusionRateFunc: infusionRateFunc }
        );
        
        const finalState = result.states[result.states.length - 1];
        return {
            a1: finalState[0],
            a2: finalState[1],
            a3: finalState[2]
        };
    }

    /**
     * Compatible with existing updateEffectSiteConcentrationRK4 interface
     * @param {number} plasmaConc - Current plasma concentration
     * @param {number} currentCe - Current effect-site concentration
     * @param {number} ke0 - ke0 parameter
     * @param {number} dt - Time step
     * @returns {number} - New effect-site concentration
     */
    updateEffectSiteConcentration(plasmaConc, currentCe, ke0, dt) {
        // Simple effect-site ODE: dCe/dt = ke0 * (Cp - Ce)
        const effectSiteODE = (t, state) => [ke0 * (plasmaConc - state[0])];
        
        const result = this.solver.solve(
            effectSiteODE,
            [currentCe],
            [0, dt],
            { timeStep: dt, infusionRateFunc: () => 0 }
        );
        
        return result.states[result.states.length - 1][0];
    }

    /**
     * Full simulation with unified interface
     * @param {Array} doseEvents - Dose events
     * @param {Object} patient - Patient object
     * @param {number} simulationDuration - Duration in minutes
     * @param {Object} options - Simulation options
     * @returns {Object} - Clinical results
     */
    simulate(doseEvents, patient, simulationDuration, options = {}) {
        const timeStep = options.timeStep || 0.005;
        const initialState = calculateBolusInitialState(
            doseEvents[0]?.bolusMg || 0, 
            this.pkParams
        );
        
        const infusionRateFunc = createInfusionRateFunction(doseEvents, patient);
        
        const result = this.solver.solve(
            this.odeSystem,
            initialState,
            [0, simulationDuration],
            { timeStep: timeStep, infusionRateFunc: infusionRateFunc }
        );
        
        return convertToClinicalResults(result, this.pkParams, patient, infusionRateFunc);
    }

    /**
     * Get current solver information
     */
    getCurrentSolverInfo() {
        return this.solver.getMethodInfo();
    }
}

/**
 * Validation functions for PK/PD parameters
 */
const PKPDValidator = {
    /**
     * Validate PK parameters
     * @param {Object} pkParams - PK parameters
     * @returns {Object} - Validation result
     */
    validatePKParameters(pkParams) {
        const required = ['k10', 'k12', 'k21', 'k13', 'k31', 'ke0', 'V1'];
        const errors = [];
        
        for (const param of required) {
            if (!pkParams[param] || pkParams[param] <= 0) {
                errors.push(`Invalid ${param}: must be positive number`);
            }
        }
        
        // Additional physiological checks
        if (pkParams.V1 && (pkParams.V1 < 1 || pkParams.V1 > 50)) {
            errors.push('V1 outside physiological range (1-50 L)');
        }
        
        if (pkParams.ke0 && (pkParams.ke0 < 0.01 || pkParams.ke0 > 2.0)) {
            errors.push('ke0 outside typical range (0.01-2.0 min⁻¹)');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    },

    /**
     * Validate dose events
     * @param {Array} doseEvents - Dose events
     * @returns {Object} - Validation result
     */
    validateDoseEvents(doseEvents) {
        const errors = [];
        
        if (!Array.isArray(doseEvents) || doseEvents.length === 0) {
            errors.push('At least one dose event required');
            return { isValid: false, errors };
        }
        
        for (let i = 0; i < doseEvents.length; i++) {
            const event = doseEvents[i];
            
            if (typeof event.timeInMinutes !== 'number' || event.timeInMinutes < 0) {
                errors.push(`Event ${i}: Invalid time`);
            }
            
            if (typeof event.bolusMg !== 'number' || event.bolusMg < 0) {
                errors.push(`Event ${i}: Invalid bolus dose`);
            }
            
            if (typeof event.continuousMgKgHr !== 'number' || event.continuousMgKgHr < 0) {
                errors.push(`Event ${i}: Invalid continuous rate`);
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.createPKPDSystem = createPKPDSystem;
    window.createInfusionRateFunction = createInfusionRateFunction;
    window.createSimpleInfusionRate = createSimpleInfusionRate;
    window.calculateBolusInitialState = calculateBolusInitialState;
    window.convertToClinicalResults = convertToClinicalResults;
    window.PKPDIntegrationAdapter = PKPDIntegrationAdapter;
    window.PKPDValidator = PKPDValidator;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createPKPDSystem,
        createInfusionRateFunction,
        createSimpleInfusionRate,
        calculateBolusInitialState,
        convertToClinicalResults,
        PKPDIntegrationAdapter,
        PKPDValidator
    };
}