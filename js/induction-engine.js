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

class InductionEngine {
    constructor() {
        this.isRunning = false;
        this.startTime = null;
        this.elapsedTime = 0;
        this.patient = null;
        this.pkParams = null;
        this.state = { a1: 0, a2: 0, a3: 0, ce: 0 };
        this.bolusDose = 0;
        this.continuousDose = 0;
        this.snapshots = [];
        this.timer = null;
        this.useLSODA = true;
        this.lsodaSolver = null;
        this.integrationStats = null;
        this.updateCallbacks = [];
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

        console.log('Starting induction simulation:', { bolusDose, continuousDose });

        this.patient = patient;
        this.pkParams = this.calculatePKParameters(patient);
        this.bolusDose = bolusDose;
        this.continuousDose = continuousDose;
        this.state = { a1: bolusDose, a2: 0, a3: 0, ce: 0 };
        this.startTime = new Date();
        this.elapsedTime = 0;
        this.snapshots = [];
        this.isRunning = true;

        // Initialize LSODA solver if available
        if (this.useLSODA && typeof LSODA !== 'undefined') {
            this.lsodaSolver = new LSODA();
            console.log('Using LSODA integration method');
        } else {
            this.useLSODA = false;
            console.log('Using Euler integration method');
        }

        this.timer = setInterval(() => {
            this.updateSimulation();
            this.notifyCallbacks();
        }, 1000);

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

        this.elapsedTime = (new Date() - this.startTime) / 1000;
        
        if (this.useLSODA && this.lsodaSolver) {
            this.updateSimulationLSODA();
        } else {
            this.updateSimulationEuler();
        }
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

        // Effect site concentration
        const plasmaConc = this.getPlasmaConcentration();
        const dce_dt = ke0 * (plasmaConc - this.state.ce);
        this.state.ce += (dt / 60.0) * dce_dt;

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
        const ke0 = result.ke0_numerical || result.ke0_regression;
        
        return {
            v1: pkParams.V1,
            v2: pkParams.V2,
            v3: pkParams.V3,
            cl: pkParams.CL,
            q2: pkParams.Q2,
            q3: pkParams.Q3,
            ke0: ke0,
            k10: rateConstants.k10,
            k12: rateConstants.k12,
            k21: rateConstants.k21,
            k13: rateConstants.k13,
            k31: rateConstants.k31
        };
    }

    getPlasmaConcentration() {
        return this.state.a1 / this.pkParams.v1;
    }

    getEffectSiteConcentration() {
        return this.state.ce;
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
        return {
            isRunning: this.isRunning,
            elapsedTime: this.elapsedTime,
            elapsedTimeString: this.getElapsedTimeString(),
            plasmaConcentration: this.getPlasmaConcentration(),
            effectSiteConcentration: this.getEffectSiteConcentration(),
            integrationMethod: this.getIntegrationMethod(),
            integrationStats: this.getIntegrationStats(),
            snapshots: [...this.snapshots],
            patient: this.patient,
            dose: {
                bolus: this.bolusDose,
                continuous: this.continuousDose
            }
        };
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