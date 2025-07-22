/**
 * Unified Numerical Solvers for Remimazolam TCI TIVA V1.2.1
 * Implements multiple numerical methods for PK/PD model solving
 * 
 * Features:
 * - Unified interface for all numerical methods
 * - Euler, RK4, and Dormand-Prince RK45 implementations
 * - Enable method switching in all simulation modes
 * - Compatible with existing protocol engines
 */

/**
 * Abstract base class for all numerical solvers
 */
class NumericalSolver {
    constructor(name, order) {
        this.name = name;
        this.order = order;
        this.adaptive = false;
    }

    /**
     * Solve ODE system over time span
     * @param {function} odeSystem - Function (t, state, infusionRateFunc) => derivatives
     * @param {Array} initialState - Initial state [a1, a2, a3, ce]
     * @param {number} tStart - Start time
     * @param {number} tEnd - End time
     * @param {Object} options - Solver options {timeStep, infusionRateFunc, etc.}
     * @returns {Object} - {times: Array, states: Array, stats: Object}
     */
    solve(odeSystem, initialState, tStart, tEnd, options = {}) {
        throw new Error('Solver.solve() must be implemented by subclasses');
    }

    /**
     * Get solver metadata
     */
    getMetadata() {
        return {
            name: this.name,
            order: this.order,
            adaptive: this.adaptive,
            description: this.getDescription()
        };
    }

    getDescription() {
        return 'Base numerical solver';
    }
}

/**
 * Euler Method Solver
 * First-order explicit method
 */
class EulerSolver extends NumericalSolver {
    constructor() {
        super('Euler Method', 1);
    }

    solve(odeSystem, initialState, tStart, tEnd, options = {}) {
        const timeStep = options.timeStep || 0.1;
        const infusionRateFunc = options.infusionRateFunc || (() => 0);

        const times = [];
        const states = [];
        let currentState = [...initialState];
        let currentTime = tStart;

        // Record initial state
        times.push(currentTime);
        states.push([...currentState]);

        const numSteps = Math.floor((tEnd - tStart) / timeStep);
        let actualSteps = 0;

        for (let i = 0; i < numSteps; i++) {
            // Calculate derivatives
            const derivatives = odeSystem(currentTime, currentState, infusionRateFunc);
            
            // Euler step: y_{n+1} = y_n + h * f(t_n, y_n)
            for (let j = 0; j < currentState.length; j++) {
                currentState[j] += timeStep * derivatives[j];
                // Non-negative constraint for PK/PD state variables (amounts and concentrations)
                currentState[j] = Math.max(0, currentState[j]);
            }

            currentTime += timeStep;
            actualSteps++;

            // Record state
            times.push(currentTime);
            states.push([...currentState]);
        }

        return {
            times: times,
            states: states,
            stats: {
                method: 'Euler',
                totalSteps: actualSteps,
                timeStep: timeStep,
                order: this.order
            }
        };
    }

    getDescription() {
        return 'First-order explicit method (Current)';
    }
}

/**
 * Runge-Kutta 4th Order Solver
 * Fourth-order fixed-step method
 */
class RK4Solver extends NumericalSolver {
    constructor() {
        super('Runge-Kutta 4th Order', 4);
    }

    solve(odeSystem, initialState, tStart, tEnd, options = {}) {
        const timeStep = options.timeStep || 0.1;
        const infusionRateFunc = options.infusionRateFunc || (() => 0);

        const times = [];
        const states = [];
        let currentState = [...initialState];
        let currentTime = tStart;

        // Record initial state
        times.push(currentTime);
        states.push([...currentState]);

        const numSteps = Math.floor((tEnd - tStart) / timeStep);
        let actualSteps = 0;

        for (let i = 0; i < numSteps; i++) {
            // RK4 method implementation
            const k1 = odeSystem(currentTime, currentState, infusionRateFunc);
            
            const state2 = this.addStates(currentState, this.scaleState(k1, timeStep / 2));
            const k2 = odeSystem(currentTime + timeStep / 2, state2, infusionRateFunc);
            
            const state3 = this.addStates(currentState, this.scaleState(k2, timeStep / 2));
            const k3 = odeSystem(currentTime + timeStep / 2, state3, infusionRateFunc);
            
            const state4 = this.addStates(currentState, this.scaleState(k3, timeStep));
            const k4 = odeSystem(currentTime + timeStep, state4, infusionRateFunc);

            // Update state: y_{n+1} = y_n + (h/6)(k1 + 2k2 + 2k3 + k4)
            for (let j = 0; j < currentState.length; j++) {
                currentState[j] += (timeStep / 6.0) * (k1[j] + 2*k2[j] + 2*k3[j] + k4[j]);
                // Non-negative constraint
                currentState[j] = Math.max(0, currentState[j]);
            }

            currentTime += timeStep;
            actualSteps++;

            // Record state
            times.push(currentTime);
            states.push([...currentState]);
        }

        return {
            times: times,
            states: states,
            stats: {
                method: 'RK4',
                totalSteps: actualSteps,
                timeStep: timeStep,
                order: this.order
            }
        };
    }

    addStates(state1, state2) {
        const result = [];
        for (let i = 0; i < state1.length; i++) {
            result[i] = state1[i] + state2[i];
        }
        return result;
    }

    scaleState(state, factor) {
        const result = [];
        for (let i = 0; i < state.length; i++) {
            result[i] = state[i] * factor;
        }
        return result;
    }

    getDescription() {
        return 'Fourth-order fixed-step method';
    }
}

/**
 * LSODA Implementation (replacing problematic RK45)
 * Livermore Solver with automatic stiffness detection
 */
class LSODASolver extends NumericalSolver {
    constructor() {
        super('LSODA', 5);
        this.adaptive = true;
        
        // Import LSODA if available
        if (typeof LSODA !== 'undefined') {
            this.lsoda = new LSODA();
        } else {
            console.warn('LSODA not available, falling back to RK4');
        }
        
        // Always initialize fallback solver for error cases
        this.fallbackSolver = new RK4Solver();
    }

    solve(odeSystem, initialState, tStart, tEnd, options = {}) {
        const infusionRateFunc = options.infusionRateFunc || (() => 0);

        // Fallback to RK4 if LSODA not available
        if (!this.lsoda) {
            console.warn('Using RK4 fallback for LSODA solver');
            return this.fallbackSolver.solve(odeSystem, initialState, tStart, tEnd, options);
        }

        const timeStep = options.timeStep || 0.01;
        const numSteps = Math.floor((tEnd - tStart) / timeStep);
        const times = [];
        
        // Generate time points
        for (let i = 0; i <= numSteps; i++) {
            times.push(tStart + i * timeStep);
        }
        
        // Ensure we include the end time
        if (times[times.length - 1] < tEnd) {
            times.push(tEnd);
        }

        try {
            // Adapt ODE system for LSODA interface
            const lsodaOdeSystem = (t, y) => {
                return odeSystem(t, y, infusionRateFunc);
            };

            const result = this.lsoda.integrate(lsodaOdeSystem, initialState, times, {
                rtol: options.rtol || 1e-3,  // Very relaxed for PK stability
                atol: options.atol || 1e-5,  // 10 μg/mL precision
                mxstep: options.mxstep || 5000  // Many more steps allowed
            });

            return {
                times: result.t,
                states: result.y,
                stats: {
                    method: 'LSODA',
                    totalSteps: result.stats.nsteps || times.length,
                    functionEvaluations: result.stats.nfe || 0,
                    adaptiveOrder: 5,
                    stiffnessDetected: result.stats.method === 2
                }
            };
        } catch (error) {
            console.error(`LSODA failed: ${error.message}`);
            console.error('LSODA Error Stack:', error.stack);
            throw new Error(`LSODA computation failed: ${error.message}`);
        }
    }

    getDescription() {
        return 'LSODA with automatic stiffness detection (recommended for PK models)';
    }
}

/**
 * Dormand-Prince RK45 Implementation (Legacy - Known Issues)
 * Fifth-order adaptive step-size method
 * Note: This implementation has known issues with stiff PK systems
 */
class RK45Solver extends NumericalSolver {
    constructor() {
        super('Dormand-Prince RK45', 5);
        this.adaptive = true;
        
        // Dormand-Prince 5(4) Butcher Tableau
        this.c = [0, 1/5, 3/10, 4/5, 8/9, 1, 1];
        this.a = [
            [],
            [1/5],
            [3/40, 9/40],
            [44/45, -56/15, 32/9],
            [19372/6561, -25360/2187, 64448/6561, -212/729],
            [9017/3168, -355/33, 46732/5247, 49/176, -5103/18656],
            [35/384, 0, 500/1113, 125/192, -2187/6784, 11/84]
        ];
        
        // 5th order coefficients
        this.b5 = [35/384, 0, 500/1113, 125/192, -2187/6784, 11/84, 0];
        // 4th order coefficients (for error estimation)
        this.b4 = [5179/57600, 0, 7571/16695, 393/640, -92097/339200, 187/2100, 1/40];
        
        // Error calculation coefficients
        this.e = this.b5.map((b5i, i) => b5i - this.b4[i]);
        
        // Adaptive step control parameters - Adjusted for clinical PK data
        this.tolerances = {
            absolute: 1e-4,  // 100 ng/mL precision (still clinically useful)
            relative: 1e-2   // 1% relative error (more tolerant for PK)
        };
        this.safety = 0.9;
        this.minFactor = 0.2;
        this.maxFactor = 10.0;
        this.minStep = 1e-3;  // 0.06 seconds (1/1000 minute)
        this.maxStep = 1.0;   // 1 minute maximum
    }

    solve(odeSystem, initialState, tStart, tEnd, options = {}) {
        const infusionRateFunc = options.infusionRateFunc || (() => 0);

        const times = [];
        const states = [];
        let currentState = [...initialState];
        let currentTime = tStart;
        let h = options.timeStep || 0.01; // Initial step size

        // Statistics
        let totalSteps = 0;
        let acceptedSteps = 0;
        let rejectedSteps = 0;
        let minStepSize = h;
        let maxStepSize = h;

        // Record initial state
        times.push(currentTime);
        states.push([...currentState]);

        while (currentTime < tEnd) {
            const tNext = Math.min(currentTime + h, tEnd);
            const actualH = tNext - currentTime;

            // Take RK45 step
            const stepResult = this.rk45Step(odeSystem, currentTime, currentState, actualH, infusionRateFunc);
            
            // Compute error norm
            const errorNorm = this.computeErrorNorm(stepResult.error, currentState);
            
            totalSteps++;

            if (errorNorm <= 1.0) {
                // Accept step
                currentState = stepResult.y5;
                currentTime = tNext;
                acceptedSteps++;

                // Apply non-negative constraint
                for (let i = 0; i < currentState.length; i++) {
                    currentState[i] = Math.max(0, currentState[i]);
                }

                // Record state
                times.push(currentTime);
                states.push([...currentState]);

                // Update step size for next iteration
                h = this.computeNewStepSize(h, errorNorm);
                minStepSize = Math.min(minStepSize, h);
                maxStepSize = Math.max(maxStepSize, h);
            } else {
                // Reject step and reduce step size
                h = this.computeNewStepSize(h, errorNorm);
                rejectedSteps++;
            }

            // Prevent infinite loops
            if (totalSteps > 500000) {
                console.warn('RK45: Maximum steps exceeded, terminating');
                break;
            }
            
            // Prevent step size from becoming too small
            if (h < this.minStep) {
                console.warn(`RK45: Step size ${h} below minimum ${this.minStep}, terminating`);
                break;
            }
        }

        return {
            times: times,
            states: states,
            stats: {
                method: 'Dormand-Prince RK45',
                totalSteps: totalSteps,
                acceptedSteps: acceptedSteps,
                rejectedSteps: rejectedSteps,
                acceptanceRate: ((acceptedSteps / totalSteps) * 100).toFixed(1) + '%',
                minStepSize: minStepSize,
                maxStepSize: maxStepSize,
                adaptiveOrder: 5
            }
        };
    }

    /**
     * Single RK45 step using Dormand-Prince method
     */
    rk45Step(odeSystem, t, y, h, infusionRateFunc) {
        const n = y.length;
        const k = new Array(7);

        // Stage calculations
        k[0] = odeSystem(t, y, infusionRateFunc);

        for (let i = 1; i < 7; i++) {
            const yi = new Array(n);
            for (let j = 0; j < n; j++) {
                yi[j] = y[j];
                for (let l = 0; l < i; l++) {
                    if (this.a[i][l] !== undefined) {
                        yi[j] += h * this.a[i][l] * k[l][j];
                    }
                }
            }
            k[i] = odeSystem(t + this.c[i] * h, yi, infusionRateFunc);
        }

        // 4th and 5th order solutions
        const y4 = new Array(n);
        const y5 = new Array(n);
        const error = new Array(n);

        for (let i = 0; i < n; i++) {
            y4[i] = y[i];
            y5[i] = y[i];
            for (let j = 0; j < 7; j++) {
                y4[i] += h * this.b4[j] * k[j][i];
                y5[i] += h * this.b5[j] * k[j][i];
            }
            error[i] = y5[i] - y4[i];
        }

        return { y4: y4, y5: y5, error: error };
    }

    /**
     * Compute error norm for step size control
     */
    computeErrorNorm(error, y) {
        let norm = 0;
        for (let i = 0; i < error.length; i++) {
            const scale = this.tolerances.absolute + this.tolerances.relative * Math.abs(y[i]);
            norm += Math.pow(error[i] / scale, 2);
        }
        return Math.sqrt(norm / error.length);
    }

    /**
     * Compute new step size based on error
     */
    computeNewStepSize(h, errorNorm) {
        if (errorNorm < Number.EPSILON) {
            return Math.min(this.maxStep, h * this.maxFactor);
        }

        // Optimal step size formula for 5th order method
        const factor = this.safety * Math.pow(1.0 / errorNorm, 1.0 / 5.0);

        // Apply constraints
        const newFactor = Math.max(this.minFactor, Math.min(this.maxFactor, factor));
        const newStep = h * newFactor;

        return Math.max(this.minStep, Math.min(this.maxStep, newStep));
    }

    getDescription() {
        return 'Fifth-order adaptive step-size method (Dormand-Prince)';
    }
}

/**
 * Unified Numerical Solvers Manager
 * Provides interface for all numerical methods
 */
class NumericalSolvers {
    constructor() {
        this.methods = {
            euler: {
                name: "Euler Method",
                description: "First-order explicit method",
                solver: new EulerSolver(),
                order: 1,
                adaptive: false
            },
            rk4: {
                name: "Runge-Kutta 4th Order",
                description: "Fourth-order fixed-step method",
                solver: new RK4Solver(),
                order: 4,
                adaptive: false
            },
            rk45: {
                name: "Dormand-Prince RK45",
                description: "Fifth-order adaptive step-size method (high precision)",
                solver: new RK45Solver(),
                order: 5,
                adaptive: true
            }
        };

        this.currentMethod = 'rk4'; // Default to RK4 for stability
    }

    /**
     * Set current numerical method
     * @param {string} methodName - Method name (euler, rk4, rk45)
     * @returns {boolean} - Success status
     */
    setMethod(methodName) {
        if (this.methods[methodName]) {
            this.currentMethod = methodName;
            return true;
        }
        return false;
    }

    /**
     * Get current method name
     */
    getCurrentMethod() {
        return this.currentMethod;
    }

    /**
     * Get method metadata
     */
    getMethodInfo(methodName = null) {
        const method = methodName || this.currentMethod;
        if (this.methods[method]) {
            return {
                ...this.methods[method],
                metadata: this.methods[method].solver.getMetadata()
            };
        }
        return null;
    }

    /**
     * List all available methods
     */
    listMethods() {
        return Object.keys(this.methods).map(key => ({
            key: key,
            ...this.methods[key],
            metadata: this.methods[key].solver.getMetadata()
        }));
    }

    /**
     * Solve ODE system using current method
     * @param {function} odeSystem - ODE system function
     * @param {Array} initialState - Initial state
     * @param {Array} timeSpan - [startTime, endTime]
     * @param {Object} options - Solver options
     * @returns {Object} - Solution object
     */
    solve(odeSystem, initialState, timeSpan, options = {}) {
        const solver = this.methods[this.currentMethod].solver;
        const [tStart, tEnd] = timeSpan;
        
        const result = solver.solve(odeSystem, initialState, tStart, tEnd, options);
        
        // Add method information to result
        result.method = this.currentMethod;
        result.methodInfo = this.getMethodInfo();
        
        return result;
    }

    /**
     * Compare multiple methods on the same problem
     * @param {function} odeSystem - ODE system function
     * @param {Array} initialState - Initial state
     * @param {Array} timeSpan - [startTime, endTime]
     * @param {Object} options - Solver options
     * @param {Array} methods - Methods to compare (default: all)
     * @returns {Object} - Comparison results
     */
    comparemethods(odeSystem, initialState, timeSpan, options = {}, methods = null) {
        const methodsToCompare = methods || Object.keys(this.methods);
        const results = {};
        const originalMethod = this.currentMethod;

        for (const method of methodsToCompare) {
            if (this.methods[method]) {
                try {
                    this.setMethod(method);
                    const startTime = performance.now();
                    const result = this.solve(odeSystem, initialState, timeSpan, options);
                    const endTime = performance.now();
                    
                    results[method] = {
                        ...result,
                        computationTime: endTime - startTime,
                        success: true
                    };
                } catch (error) {
                    results[method] = {
                        success: false,
                        error: error.message
                    };
                }
            }
        }

        // Restore original method
        this.setMethod(originalMethod);

        return results;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.NumericalSolver = NumericalSolver;
    window.EulerSolver = EulerSolver;
    window.RK4Solver = RK4Solver;
    window.LSODASolver = LSODASolver;
    window.RK45Solver = RK45Solver;
    window.NumericalSolvers = NumericalSolvers;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        NumericalSolver,
        EulerSolver,
        RK4Solver,
        LSODASolver,
        RK45Solver,
        NumericalSolvers
    };
}