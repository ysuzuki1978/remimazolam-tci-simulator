/**
 * RK4 Effect-Site Calculator for Comparison Framework
 * Implements the RK4 method for effect-site concentration calculation
 * Compatible with the comparison framework defined in phase1-004-comparison-framework.yml
 */

class RK4EffectSiteCalculator {
    constructor() {
        this.name = 'RK4 Effect-Site';
        this.version = '1.0.0';
        this.description = 'Fourth-order Runge-Kutta method for effect-site concentration calculation';
    }

    /**
     * Register with CalculationComparator
     */
    static register(comparator) {
        comparator.registerMethod('rk4_effect_site', {
            name: 'RK4 Effect-Site',
            calculator: this.calculate,
            settings: { 
                timeStep: 0.1,
                method: 'rk4',
                precision: 'high'
            },
            metadata: {
                order: 4,
                stability: 'high',
                accuracy: 'O(h^4)',
                description: 'Fourth-order Runge-Kutta method with non-negative constraint'
            }
        });
    }

    /**
     * Calculate effect-site concentration using RK4 method
     */
    static calculate(state, params, dt) {
        const { plasmaConc, effectSiteConc } = state;
        const { ke0 } = params;
        
        // Validation
        if (!ke0 || ke0 <= 0) {
            throw new Error('Invalid ke0 parameter');
        }
        
        if (dt <= 0) {
            throw new Error('Invalid time step');
        }
        
        return this.updateEffectSiteConcentrationRK4(
            plasmaConc,
            effectSiteConc,
            ke0,
            dt
        );
    }

    /**
     * RK4 calculation implementation
     */
    static updateEffectSiteConcentrationRK4(plasmaConc, currentCe, ke0, dt) {
        // Input validation
        if (isNaN(plasmaConc) || isNaN(currentCe) || isNaN(ke0) || isNaN(dt)) {
            throw new Error('Invalid input parameters: all values must be numbers');
        }
        
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
        const result = Math.max(0, newCe);
        
        // Additional validation
        if (isNaN(result) || !isFinite(result)) {
            console.warn('RK4 calculation produced invalid result, returning safe value');
            return Math.max(0, currentCe);
        }
        
        return result;
    }

    /**
     * Estimate local truncation error for RK4
     */
    static estimateLocalError(plasmaConc, currentCe, ke0, dt) {
        // Use embedded RK4/RK5 method for error estimation
        const rk4Result = this.updateEffectSiteConcentrationRK4(plasmaConc, currentCe, ke0, dt);
        const rk5Result = this.updateEffectSiteConcentrationRK5(plasmaConc, currentCe, ke0, dt);
        
        return Math.abs(rk5Result - rk4Result);
    }

    /**
     * RK5 implementation for error estimation
     */
    static updateEffectSiteConcentrationRK5(plasmaConc, currentCe, ke0, dt) {
        const f = (ce, cp) => ke0 * (cp - ce);
        
        const k1 = f(currentCe, plasmaConc);
        const k2 = f(currentCe + 0.25 * dt * k1, plasmaConc);
        const k3 = f(currentCe + 0.25 * dt * k1 + 0.25 * dt * k2, plasmaConc);
        const k4 = f(currentCe + dt * k3, plasmaConc);
        const k5 = f(currentCe + 0.5 * dt * (k1 + k3), plasmaConc);
        const k6 = f(currentCe + dt * (k1 + 4*k4 + k5) / 6.0, plasmaConc);
        
        const newCe = currentCe + (dt / 90.0) * (7*k1 + 32*k3 + 12*k4 + 32*k5 + 7*k6);
        
        return Math.max(0, newCe);
    }

    /**
     * Adaptive time step RK4 implementation
     */
    static adaptiveRK4(plasmaConc, currentCe, ke0, targetDt, tolerance = 1e-6) {
        let dt = targetDt;
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
            const error = this.estimateLocalError(plasmaConc, currentCe, ke0, dt);
            
            if (error < tolerance) {
                // Accept the step
                const result = this.updateEffectSiteConcentrationRK4(plasmaConc, currentCe, ke0, dt);
                return {
                    value: result,
                    actualDt: dt,
                    error: error,
                    accepted: true
                };
            } else {
                // Reduce time step
                dt *= 0.5;
                attempts++;
            }
        }
        
        // If we can't meet tolerance, use the smallest step
        console.warn('Adaptive RK4 failed to meet tolerance, using reduced step size');
        const result = this.updateEffectSiteConcentrationRK4(plasmaConc, currentCe, ke0, dt);
        return {
            value: result,
            actualDt: dt,
            error: this.estimateLocalError(plasmaConc, currentCe, ke0, dt),
            accepted: false
        };
    }

    /**
     * Get method information for comparison framework
     */
    static getMethodInfo() {
        return {
            name: 'RK4 Effect-Site',
            version: '1.0.0',
            order: 4,
            stability: 'A-stable',
            accuracy: 'O(h^4)',
            features: [
                'Non-negative constraint',
                'Error estimation',
                'Adaptive time stepping',
                'Robust input validation'
            ],
            references: [
                'Runge-Kutta methods for ordinary differential equations',
                'Pharmacokinetic modeling best practices'
            ]
        };
    }

    /**
     * Performance benchmark
     */
    static benchmark(iterations = 1000) {
        const plasmaConc = 2.0;
        const currentCe = 0.5;
        const ke0 = 0.456;
        const dt = 0.1;
        
        const startTime = performance.now();
        
        for (let i = 0; i < iterations; i++) {
            this.updateEffectSiteConcentrationRK4(plasmaConc, currentCe, ke0, dt);
        }
        
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        
        return {
            iterations: iterations,
            totalTime: totalTime,
            averageTime: totalTime / iterations,
            calculationsPerSecond: iterations / (totalTime / 1000)
        };
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.RK4EffectSiteCalculator = RK4EffectSiteCalculator;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RK4EffectSiteCalculator };
}