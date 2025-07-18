/**
 * Enhanced Protocol Engine for Remimazolam TCI TIVA V1.0.0
 * Enhanced Protocol Optimization Engine
 * 
 * Features:
 * - 180-minute simulation support
 * - Predictive step-down control
 * - Efficient optimization via binary search
 * - Concentration evaluation at 6 time points
 * - Compatibility with existing Masui Ke0 Calculator
 */

class EnhancedProtocolEngine {
    constructor() {
        this.patient = null;
        this.pkParams = null;
        this.settings = {
            targetCe: 1.0,
            upperThreshold: 1.2,
            reductionFactor: 0.70,
            timeStep: 0.01, // 0.01-minute intervals for high-precision calculation
            simulationDuration: 180, // Extended to 180 minutes
            targetReachTime: 20,
            adjustmentInterval: 5.0,
            predictionTime: 5.0, // Prediction time
            evaluationTimePoints: [30, 60, 90, 120, 150, 180] // Evaluation time points
        };
        this.lastResult = null;
    }

    setPatient(patient) {
        this.patient = patient;
        this.pkParams = this.calculatePKParameters(patient);
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
    }

    calculatePKParameters(patient) {
        console.log('Calculating PK parameters for enhanced protocol optimization');
        
        // Use existing Masui Ke0 Calculator
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

    /**
     * Efficient continuous infusion rate optimization via binary search
     */
    optimizeInfusionRateEnhanced(bolusDoseMg, targetCe, timeToTarget = null, options = {}) {
        if (!this.patient || !this.pkParams) {
            throw new Error('Patient and PK parameters must be set before optimization');
        }

        timeToTarget = timeToTarget || this.settings.targetReachTime;
        const tolerance = options.tolerance || 0.01;
        const maxIterations = options.maxIterations || 50;
        
        console.log(`=== Enhanced Protocol Optimization ===`);
        console.log(`Bolus dose: ${bolusDoseMg} mg`);
        console.log(`Target concentration: ${targetCe} μg/mL`);
        console.log(`Target time: ${timeToTarget} minutes`);

        let lowRate = 0.1;
        let highRate = 6.0;
        let bestRate = 1.0;
        let bestError = Infinity;

        // Optimization via binary search
        for (let iteration = 0; iteration < maxIterations; iteration++) {
            const midRate = (lowRate + highRate) / 2;
            const ceAtTarget = this.simulateBolusAndContinuousRK4(bolusDoseMg, midRate, timeToTarget);
            const error = Math.abs(ceAtTarget - targetCe);

            if (error < bestError) {
                bestError = error;
                bestRate = midRate;
            }

            if (error < tolerance) {
                console.log(`Converged after ${iteration + 1} iterations`);
                break;
            }

            if (ceAtTarget < targetCe) {
                lowRate = midRate;
            } else {
                highRate = midRate;
            }
        }

        const predictedCe = this.simulateBolusAndContinuousRK4(bolusDoseMg, bestRate, timeToTarget);
        
        console.log(`Optimal continuous rate: ${bestRate.toFixed(3)} mg/kg/hr`);
        console.log(`Predicted concentration: ${predictedCe.toFixed(4)} μg/mL`);
        console.log(`Error: ${bestError.toFixed(4)} μg/mL (${(bestError/targetCe*100).toFixed(2)}%)`);

        return bestRate;
    }

    /**
     * Complete protocol generation with predictive control
     */
    generatePredictiveProtocol(bolusDoseMg, initialContinuousRate) {
        if (!this.patient || !this.pkParams) {
            throw new Error('Patient and PK parameters must be set before protocol generation');
        }

        console.log(`=== Predictive Protocol Generation ===`);
        
        const bolusState = this.calculateBolusInitialConcentration(bolusDoseMg);
        let state = { a1: bolusState.a1, a2: bolusState.a2, a3: bolusState.a3 };
        let currentCe = bolusState.effectSiteConc;
        let currentRate = initialContinuousRate;
        
        const timeSeriesData = [];
        const dosageAdjustments = [];
        let lastAdjustmentTime = -this.settings.adjustmentInterval;
        let adjustmentCount = 0;
        
        const numSteps = Math.floor(this.settings.simulationDuration / this.settings.timeStep) + 1;
        
        for (let i = 0; i < numSteps; i++) {
            const currentTime = i * this.settings.timeStep;
            const infusionRateMgMin = (currentRate * this.patient.weight) / 60.0;
            
            // Plasma concentration calculation
            const plasmaConc = Math.max(0.0, state.a1 / this.pkParams.V1);
            
            // Effect-site concentration update using RK4
            if (i > 0) {
                currentCe = this.updateEffectSiteConcentrationRK4(
                    plasmaConc, 
                    currentCe, 
                    this.pkParams.ke0, 
                    this.settings.timeStep
                );
            }
            
            // Consider predictive adjustments (every 5 minutes)
            if (currentTime > 0 && currentTime % 5 === 0 && 
                currentTime - lastAdjustmentTime >= this.settings.adjustmentInterval) {
                
                const predictedAdjustment = this.calculatePredictiveAdjustments(
                    { a1: state.a1, a2: state.a2, a3: state.a3, ce: currentCe },
                    currentRate,
                    this.settings.targetCe,
                    this.settings.predictionTime
                );
                
                if (Math.abs(predictedAdjustment - currentRate) > 0.05) {
                    const oldRate = currentRate;
                    currentRate = Math.max(0.1, predictedAdjustment);
                    
                    dosageAdjustments.push({
                        time: currentTime,
                        type: 'predictive_adjustment',
                        oldRate: oldRate,
                        newRate: currentRate,
                        ceAtEvent: currentCe,
                        adjustmentNumber: ++adjustmentCount,
                        reason: 'Predictive control'
                    });
                    
                    lastAdjustmentTime = currentTime;
                    console.log(`${currentTime.toFixed(1)}min: Predictive adjustment Ce=${currentCe.toFixed(3)} → Rate ${oldRate.toFixed(2)} → ${currentRate.toFixed(2)} mg/kg/hr`);
                }
            }
            
            // Emergency threshold check (conventional reactive control)
            if (currentCe >= this.settings.upperThreshold && 
                currentTime - lastAdjustmentTime >= 1.0 && 
                currentRate > 0.1) {
                
                const oldRate = currentRate;
                currentRate = Math.max(0.1, currentRate * this.settings.reductionFactor);
                
                dosageAdjustments.push({
                    time: currentTime,
                    type: 'emergency_reduction',
                    oldRate: oldRate,
                    newRate: currentRate,
                    ceAtEvent: currentCe,
                    adjustmentNumber: ++adjustmentCount,
                    reason: 'Emergency threshold response'
                });
                
                lastAdjustmentTime = currentTime;
                console.log(`${currentTime.toFixed(1)}min: Emergency reduction Ce=${currentCe.toFixed(3)} → Rate ${oldRate.toFixed(2)} → ${currentRate.toFixed(2)} mg/kg/hr`);
            }
            
            // Data recording
            timeSeriesData.push({
                time: parseFloat(currentTime.toFixed(2)),
                ce: currentCe,
                plasma: plasmaConc,
                infusionRate: currentRate,
                targetCe: this.settings.targetCe,
                upperThreshold: this.settings.upperThreshold,
                adjustmentNumber: adjustmentCount,
                isBolus: i === 0
            });
            
            // System state update
            if (i < numSteps - 1) {
                state = this.updateSystemStateRK4(state, infusionRateMgMin, this.settings.timeStep);
            }
        }
        
        // Performance evaluation
        const performance = this.evaluateEnhancedProtocolPerformance(timeSeriesData, dosageAdjustments);
        
        // Concentration evaluation at specified time points
        const concentrationAtTimePoints = this.evaluateConcentrationAtTimePoints(timeSeriesData);
        
        console.log("");
        console.log("=== Enhanced Performance Evaluation ===");
        console.log(`Final effect site concentration: ${performance.finalCe.toFixed(3)} μg/mL`);
        console.log(`Target accuracy: ${performance.targetAccuracy.toFixed(1)}%`);
        console.log(`Time in therapeutic range: ${performance.timeInTarget.toFixed(1)}%`);
        console.log(`Total adjustments: ${performance.totalAdjustments}`);
        console.log(`Stability index: ${performance.stabilityIndex.toFixed(1)}/100`);
        console.log(`Overall score: ${performance.overallScore.toFixed(1)}/100`);
        
        return {
            timeSeriesData: timeSeriesData,
            dosageAdjustments: dosageAdjustments,
            performance: performance,
            concentrationAtTimePoints: concentrationAtTimePoints,
            bolusDose: bolusDoseMg,
            initialContinuousRate: initialContinuousRate,
            calculationMethod: 'Enhanced RK4 + Predictive Control'
        };
    }

    /**
     * Predictive adjustment calculation
     */
    calculatePredictiveAdjustments(currentState, currentRate, targetCe, predictionTime) {
        // Simulate state after prediction time from current state
        let predictedState = { ...currentState };
        const infusionRateMgMin = (currentRate * this.patient.weight) / 60.0;
        
        const numPredictionSteps = Math.floor(predictionTime / this.settings.timeStep);
        
        for (let i = 0; i < numPredictionSteps; i++) {
            // Plasma concentration
            const plasmaConc = Math.max(0.0, predictedState.a1 / this.pkParams.V1);
            
            // Effect-site concentration update using RK4
            predictedState.ce = this.updateEffectSiteConcentrationRK4(
                plasmaConc, 
                predictedState.ce, 
                this.pkParams.ke0, 
                this.settings.timeStep
            );
            
            // System state update
            const newState = this.updateSystemStateRK4(
                { a1: predictedState.a1, a2: predictedState.a2, a3: predictedState.a3 },
                infusionRateMgMin,
                this.settings.timeStep
            );
            predictedState.a1 = newState.a1;
            predictedState.a2 = newState.a2;
            predictedState.a3 = newState.a3;
        }
        
        const predictedCe = predictedState.ce;
        const predictedPlasma = predictedState.a1 / this.pkParams.V1;
        const predicted_dCedt = this.pkParams.ke0 * (predictedPlasma - predictedCe);
        
        // Predictive control logic
        if (predictedCe > targetCe * 1.05 && predicted_dCedt > 0) {
            // Concentration rising and predicted to exceed target → reduce dose
            return currentRate * 0.8;
        } else if (predictedCe > targetCe * 0.95 && predicted_dCedt < this.pkParams.ke0 * 0.1) {
            // Concentration near target with slowing rise rate → minor reduction
            return currentRate * 0.9;
        } else if (predictedCe < targetCe * 0.9) {
            // Concentration significantly below target → increase
            return Math.min(currentRate * 1.1, 6.0);
        }
        
        return currentRate; // No adjustment needed
    }

    /**
     * Concentration evaluation at specified time points
     */
    evaluateConcentrationAtTimePoints(timeSeriesData) {
        const results = [];
        
        for (const targetTime of this.settings.evaluationTimePoints) {
            // Search for data at the closest time point
            const closestDataPoint = timeSeriesData.reduce((prev, curr) => 
                Math.abs(curr.time - targetTime) < Math.abs(prev.time - targetTime) ? curr : prev
            );
            
            results.push({
                time: targetTime,
                effectSiteConcentration: closestDataPoint.ce,
                plasmaConcentration: closestDataPoint.plasma,
                infusionRate: closestDataPoint.infusionRate,
                deviationFromTarget: Math.abs(closestDataPoint.ce - this.settings.targetCe),
                percentageDeviation: (Math.abs(closestDataPoint.ce - this.settings.targetCe) / this.settings.targetCe) * 100
            });
        }
        
        return results;
    }

    /**
     * Enhanced performance evaluation
     */
    evaluateEnhancedProtocolPerformance(timeSeriesData, dosageAdjustments) {
        // Maintenance period data (after 60 minutes)
        const maintenanceData = timeSeriesData.filter(point => point.time >= 60);
        
        if (maintenanceData.length === 0) {
            return this.getDefaultPerformanceMetrics();
        }
        
        // Basic metrics
        const finalCe = timeSeriesData[timeSeriesData.length - 1].ce;
        const maxCe = Math.max(...timeSeriesData.map(point => point.ce));
        
        // Target accuracy (percentage of time within ±10%)
        const tolerance = this.settings.targetCe * 0.1;
        const withinTolerance = maintenanceData.filter(point => 
            Math.abs(point.ce - this.settings.targetCe) <= tolerance
        ).length;
        const targetAccuracy = (withinTolerance / maintenanceData.length) * 100;
        
        // Time in therapeutic range (percentage of time within ±5%)
        const therapeuticTolerance = this.settings.targetCe * 0.05;
        const withinTherapeuticRange = maintenanceData.filter(point => 
            Math.abs(point.ce - this.settings.targetCe) <= therapeuticTolerance
        ).length;
        const timeInTarget = (withinTherapeuticRange / maintenanceData.length) * 100;
        
        // Stability index
        const deviations = maintenanceData.map(point => Math.abs(point.ce - this.settings.targetCe));
        const avgVariation = deviations.reduce((sum, dev) => sum + dev, 0) / deviations.length;
        const stabilityIndex = Math.max(0, 100 - avgVariation * 1000);
        
        // Convergence time
        let convergenceTime = null;
        const convergenceTolerance = this.settings.targetCe * 0.05;
        for (let i = 0; i < timeSeriesData.length; i++) {
            const point = timeSeriesData[i];
            if (Math.abs(point.ce - this.settings.targetCe) <= convergenceTolerance && point.time > 10) {
                convergenceTime = point.time;
                break;
            }
        }
        
        // Overshoot evaluation
        const overshootPercent = maxCe > this.settings.targetCe ? 
            ((maxCe - this.settings.targetCe) / this.settings.targetCe) * 100 : 0;
        
        // Overall score calculation
        const accuracyScore = Math.min(100, targetAccuracy);
        const stabilityScore = stabilityIndex;
        const convergenceScore = convergenceTime && convergenceTime < 30 ? 
            100 : Math.max(0, 100 - (convergenceTime - 30) * 2);
        const overshootPenalty = Math.max(0, overshootPercent - 10) * 2;
        
        const overallScore = Math.max(0, 
            (accuracyScore * 0.4 + stabilityScore * 0.3 + convergenceScore * 0.3) - overshootPenalty
        );
        
        return {
            finalCe: finalCe,
            maxCe: maxCe,
            targetAccuracy: targetAccuracy,
            timeInTarget: timeInTarget,
            totalAdjustments: dosageAdjustments.length,
            stabilityIndex: stabilityIndex,
            convergenceTime: convergenceTime,
            overshootPercent: overshootPercent,
            overallScore: overallScore,
            avgVariation: avgVariation
        };
    }

    getDefaultPerformanceMetrics() {
        return {
            finalCe: 0,
            maxCe: 0,
            targetAccuracy: 0,
            timeInTarget: 0,
            totalAdjustments: 0,
            stabilityIndex: 0,
            convergenceTime: null,
            overshootPercent: 0,
            overallScore: 0,
            avgVariation: 0
        };
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

    // Inherit existing methods
    simulateBolusAndContinuousRK4(bolusDoseMg, continuousRate, targetTime) {
        const bolusState = this.calculateBolusInitialConcentration(bolusDoseMg);
        let state = { a1: bolusState.a1, a2: bolusState.a2, a3: bolusState.a3 };
        let currentCe = bolusState.effectSiteConc;
        
        const infusionRateMgMin = (continuousRate * this.patient.weight) / 60.0;
        const numSteps = Math.floor(targetTime / this.settings.timeStep);
        
        for (let i = 0; i < numSteps; i++) {
            const plasmaConc = Math.max(0.0, state.a1 / this.pkParams.V1);
            
            currentCe = this.updateEffectSiteConcentrationRK4(
                plasmaConc, 
                currentCe, 
                this.pkParams.ke0, 
                this.settings.timeStep
            );
            
            state = this.updateSystemStateRK4(state, infusionRateMgMin, this.settings.timeStep);
        }
        
        return currentCe;
    }

    calculateBolusInitialConcentration(bolusDoseMg) {
        const initialPlasmaConc = bolusDoseMg / this.pkParams.V1;
        return {
            a1: bolusDoseMg,
            a2: 0.0,
            a3: 0.0,
            plasmaConc: initialPlasmaConc,
            effectSiteConc: 0.0
        };
    }

    updateSystemStateRK4(state, infusionRateMgMin, dt) {
        const { k10, k12, k21, k13, k31 } = this.pkParams;
        
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
     * Complete optimization execution
     */
    runEnhancedOptimization(targetConcentration, bolusDose, targetTime) {
        if (!this.patient) {
            throw new Error('Patient must be set before optimization');
        }

        this.settings.targetCe = targetConcentration;
        
        // Step 1: Optimization via binary search
        const optimizedRate = this.optimizeInfusionRateEnhanced(
            bolusDose, 
            targetConcentration, 
            targetTime
        );
        
        // Step 2: Predictive control protocol generation
        const protocolResult = this.generatePredictiveProtocol(
            bolusDose, 
            optimizedRate
        );
        
        this.lastResult = protocolResult;
        
        return {
            optimizedRate: optimizedRate,
            protocol: protocolResult
        };
    }

    /**
     * Get chart data
     */
    getEnhancedChartData() {
        if (!this.lastResult) return null;
        
        const data = this.lastResult.timeSeriesData;
        
        return {
            times: data.map(d => d.time),
            plasmaConcentrations: data.map(d => d.plasma),
            effectSiteConcentrations: data.map(d => d.ce),
            infusionRates: data.map(d => d.infusionRate),
            targetConcentrations: data.map(d => d.targetCe),
            adjustmentTimes: this.lastResult.dosageAdjustments.map(a => a.time),
            evaluationTimePoints: this.settings.evaluationTimePoints
        };
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.EnhancedProtocolEngine = EnhancedProtocolEngine;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EnhancedProtocolEngine };
}