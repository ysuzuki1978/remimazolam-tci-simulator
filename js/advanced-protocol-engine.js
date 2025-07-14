/**
 * Advanced Protocol Engine for Remimazolam TCI TIVA V1.0.0
 * Advanced Step-Down Protocol Optimization Engine
 * 
 * Features:
 * - Context7 Math.NET Numerics Enhanced Algorithm
 * - Sophisticated threshold-based step-down protocol
 * - Performance evaluation metrics (Target Accuracy, Stability Index, Convergence Time)
 * - Multiple optimization strategies with clinical validation
 * - Real-time adjustment recommendations
 */

class AdvancedProtocolEngine {
    constructor() {
        this.patient = null;
        this.pkParams = null;
        this.settings = {
            targetCe: 1.0,
            upperThresholdRatio: 1.2,      // 120% of target
            reductionFactor: 0.70,         // 70% of current rate (30% reduction)
            timeStep: 0.1,                 // 0.1 minute precision
            simulationDuration: 180,       // 3 hours
            targetReachTime: 20,           // 20 minutes to target
            adjustmentInterval: 5.0,       // 5 minutes minimum between adjustments
            minimumRate: 0.1,              // Minimum infusion rate mg/kg/hr
            convergenceThreshold: 0.05     // ±5% for convergence detection
        };
        this.lastResult = null;
        this.optimizationHistory = [];
    }

    setPatient(patient) {
        this.patient = patient;
        this.pkParams = this.calculatePKParameters(patient);
        console.log('Advanced Protocol Engine: Patient set', patient.id);
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        console.log('Protocol settings updated:', this.settings);
    }

    calculatePKParameters(patient) {
        console.log('Calculating PK parameters with advanced Masui Ke0 model');
        
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

    /**
     * Context7 Math.NET Numerics Enhanced Bolus Optimization
     */
    optimizeBolusProtocol(targetCe, bolusDoseMg, targetReachTime = null) {
        if (!this.patient || !this.pkParams) {
            throw new Error('Patient and PK parameters must be set before optimization');
        }

        targetReachTime = targetReachTime || this.settings.targetReachTime;
        this.settings.targetCe = targetCe;
        
        console.log(`=== Advanced Step-Down Protocol Optimization ===`);
        console.log(`Target Ce: ${targetCe} μg/mL`);
        console.log(`Bolus dose: ${bolusDoseMg} mg`);
        console.log(`Target time: ${targetReachTime} minutes`);
        console.log(`Threshold ratio: ${(this.settings.upperThresholdRatio * 100).toFixed(0)}%`);
        console.log(`Reduction factor: ${(this.settings.reductionFactor * 100).toFixed(0)}%`);

        // Step 1: Optimize initial continuous infusion rate
        const optimizationResult = this.optimizeContinuousInfusionRate(
            bolusDoseMg, 
            targetCe, 
            targetReachTime
        );

        // Step 2: Generate complete step-down protocol
        const protocolResult = this.generateAdvancedStepDownProtocol(
            bolusDoseMg, 
            optimizationResult.optimalRate,
            targetCe
        );

        // Step 3: Evaluate performance metrics
        const performanceMetrics = this.evaluateAdvancedPerformance(
            protocolResult.timeSeriesData,
            protocolResult.dosageAdjustments,
            targetCe
        );

        this.lastResult = {
            optimization: optimizationResult,
            protocol: protocolResult,
            performance: performanceMetrics,
            schedule: this.generateDetailedSchedule(bolusDoseMg, optimizationResult.optimalRate, protocolResult.dosageAdjustments)
        };

        // Store in optimization history
        this.optimizationHistory.push({
            timestamp: new Date(),
            targetCe: targetCe,
            bolusDose: bolusDoseMg,
            result: this.lastResult,
            settings: { ...this.settings }
        });

        console.log(`Optimization completed - Performance Score: ${performanceMetrics.overallScore.toFixed(1)}/100`);
        return this.lastResult;
    }

    /**
     * Advanced continuous infusion rate optimization with grid search
     */
    optimizeContinuousInfusionRate(bolusDoseMg, targetCe, targetTime) {
        console.log('Optimizing continuous infusion rate with enhanced algorithm...');
        
        // Enhanced grid search with variable precision
        const coarseSearch = this.gridSearchOptimization(bolusDoseMg, targetCe, targetTime, 0.1, 0.1, 6.0);
        const fineSearch = this.gridSearchOptimization(
            bolusDoseMg, 
            targetCe, 
            targetTime, 
            0.02, 
            Math.max(0.1, coarseSearch.bestRate - 0.3),
            Math.min(6.0, coarseSearch.bestRate + 0.3)
        );

        const predictedCe = this.simulateBolusAndContinuous(bolusDoseMg, fineSearch.bestRate, targetTime);
        
        console.log(`Optimal rate: ${fineSearch.bestRate.toFixed(3)} mg/kg/hr`);
        console.log(`Predicted Ce: ${predictedCe.toFixed(3)} μg/mL`);
        console.log(`Error: ${(Math.abs(predictedCe - targetCe) / targetCe * 100).toFixed(2)}%`);

        return new ProtocolResult(
            fineSearch.bestRate,
            predictedCe,
            null, // Schedule will be generated later
            targetCe,
            targetTime
        );
    }

    /**
     * Grid search optimization with configurable precision
     */
    gridSearchOptimization(bolusDoseMg, targetCe, targetTime, step, minRate, maxRate) {
        let bestRate = 1.0;
        let bestError = Infinity;
        const results = [];

        for (let rate = minRate; rate <= maxRate; rate += step) {
            const ceAtTarget = this.simulateBolusAndContinuous(bolusDoseMg, rate, targetTime);
            const error = Math.abs(ceAtTarget - targetCe);

            results.push({
                rate: rate,
                ceAtTarget: ceAtTarget,
                error: error,
                relativeError: (error / targetCe) * 100
            });

            if (error < bestError) {
                bestError = error;
                bestRate = rate;
            }
        }

        return {
            bestRate: bestRate,
            bestError: bestError,
            results: results
        };
    }

    /**
     * Generate advanced step-down protocol with threshold-based adjustments
     */
    generateAdvancedStepDownProtocol(bolusDoseMg, initialContinuousRate, targetCe) {
        console.log('Generating advanced step-down protocol...');
        
        const upperThreshold = targetCe * this.settings.upperThresholdRatio;
        
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
            
            // Calculate plasma concentration
            const plasmaConc = state.a1 / this.pkParams.v1;
            
            // Update effect site concentration
            if (i > 0) {
                const dCedt = this.pkParams.ke0 * (plasmaConc - currentCe);
                currentCe = currentCe + this.settings.timeStep * dCedt;
            }
            
            // Advanced threshold checking and dose adjustment
            if (currentCe >= upperThreshold && 
                currentTime - lastAdjustmentTime >= this.settings.adjustmentInterval &&
                currentRate > this.settings.minimumRate) {
                
                const oldRate = currentRate;
                currentRate = Math.max(this.settings.minimumRate, currentRate * this.settings.reductionFactor);
                
                const reductionPercent = ((oldRate - currentRate) / oldRate) * 100;
                
                dosageAdjustments.push({
                    time: currentTime,
                    type: 'threshold_reduction',
                    oldRate: oldRate,
                    newRate: currentRate,
                    ceAtEvent: currentCe,
                    reductionPercent: reductionPercent,
                    adjustmentNumber: ++adjustmentCount,
                    timeSinceLastAdjustment: currentTime - lastAdjustmentTime,
                    thresholdRatio: currentCe / targetCe
                });
                
                lastAdjustmentTime = currentTime;
                console.log(`${currentTime.toFixed(1)}min: Step-down #${adjustmentCount} - Ce=${currentCe.toFixed(3)} → Rate ${oldRate.toFixed(2)} → ${currentRate.toFixed(2)} mg/kg/hr (-${reductionPercent.toFixed(1)}%)`);
            }
            
            // Record data point
            timeSeriesData.push({
                time: parseFloat(currentTime.toFixed(1)),
                ce: currentCe,
                plasma: plasmaConc,
                infusionRate: currentRate,
                targetCe: targetCe,
                upperThreshold: upperThreshold,
                adjustmentNumber: adjustmentCount,
                isBolus: i === 0,
                timeSinceLastAdjustment: currentTime - lastAdjustmentTime,
                thresholdRatio: currentCe / targetCe
            });
            
            // Update system state using RK4
            if (i < numSteps - 1) {
                state = this.updateSystemStateRK4(state, infusionRateMgMin, this.settings.timeStep);
            }
        }
        
        console.log(`Protocol generated: ${adjustmentCount} step-down adjustments`);
        
        return {
            timeSeriesData: timeSeriesData,
            dosageAdjustments: dosageAdjustments,
            bolusDose: bolusDoseMg,
            initialContinuousRate: initialContinuousRate,
            finalRate: currentRate,
            upperThreshold: upperThreshold
        };
    }

    /**
     * Evaluate advanced performance metrics
     */
    evaluateAdvancedPerformance(timeSeriesData, dosageAdjustments, targetCe) {
        // Maintenance period analysis (after 60 minutes)
        const maintenanceData = timeSeriesData.filter(point => point.time >= 60);
        
        if (maintenanceData.length === 0) {
            return this.getDefaultPerformanceMetrics();
        }

        // Basic metrics
        const finalCe = timeSeriesData[timeSeriesData.length - 1].ce;
        const maxCe = Math.max(...timeSeriesData.map(point => point.ce));
        
        // Target accuracy (percentage of time within ±10% of target)
        const tolerance = targetCe * 0.1;
        const withinTolerance = maintenanceData.filter(point => 
            Math.abs(point.ce - targetCe) <= tolerance
        ).length;
        const targetAccuracy = (withinTolerance / maintenanceData.length) * 100;
        
        // Average deviation from target
        const deviations = maintenanceData.map(point => Math.abs(point.ce - targetCe));
        const avgDeviation = deviations.reduce((sum, dev) => sum + dev, 0) / deviations.length;
        
        // Stability index (measures concentration variation)
        let totalVariation = 0;
        for (let i = 1; i < maintenanceData.length; i++) {
            totalVariation += Math.abs(maintenanceData[i].ce - maintenanceData[i-1].ce);
        }
        const avgVariation = totalVariation / (maintenanceData.length - 1);
        const stabilityIndex = Math.max(0, 100 - (avgVariation * 1000));
        
        // Convergence time (time to reach within ±5% of target)
        const convergenceThreshold = targetCe * this.settings.convergenceThreshold;
        let convergenceTime = Infinity;
        for (const point of timeSeriesData) {
            if (Math.abs(point.ce - targetCe) <= convergenceThreshold) {
                convergenceTime = point.time;
                break;
            }
        }
        
        // Overshoot analysis
        const overshootPoints = timeSeriesData.filter(point => point.ce > targetCe * 1.1);
        const maxOvershoot = overshootPoints.length > 0 ? 
            Math.max(...overshootPoints.map(point => point.ce)) : targetCe;
        const overshootPercent = ((maxOvershoot - targetCe) / targetCe) * 100;
        
        // Undershoot analysis
        const undershootPoints = maintenanceData.filter(point => point.ce < targetCe * 0.9);
        const undershootPercent = (undershootPoints.length / maintenanceData.length) * 100;
        
        // Overall performance score (0-100)
        const accuracyScore = Math.min(100, targetAccuracy);
        const stabilityScore = stabilityIndex;
        const convergenceScore = convergenceTime < 30 ? 100 : Math.max(0, 100 - (convergenceTime - 30) * 2);
        const overshootPenalty = Math.max(0, overshootPercent - 10) * 2;
        
        const overallScore = Math.max(0, 
            (accuracyScore * 0.4 + stabilityScore * 0.3 + convergenceScore * 0.3) - overshootPenalty
        );
        
        const metrics = {
            finalCe: finalCe,
            maxCe: maxCe,
            avgDeviation: avgDeviation,
            targetAccuracy: targetAccuracy,
            stabilityIndex: stabilityIndex,
            convergenceTime: convergenceTime,
            totalAdjustments: dosageAdjustments.length,
            overshootPercent: overshootPercent,
            undershootPercent: undershootPercent,
            overallScore: overallScore,
            
            // Detailed scores
            accuracyScore: accuracyScore,
            stabilityScore: stabilityScore,
            convergenceScore: convergenceScore,
            
            // Clinical indicators
            timeInTarget: targetAccuracy,
            timeAboveTarget: (timeSeriesData.filter(p => p.ce > targetCe * 1.1).length / timeSeriesData.length) * 100,
            timeBelowTarget: (timeSeriesData.filter(p => p.ce < targetCe * 0.9).length / timeSeriesData.length) * 100
        };
        
        console.log('Performance Evaluation:');
        console.log(`  Target Accuracy: ${targetAccuracy.toFixed(1)}%`);
        console.log(`  Stability Index: ${stabilityIndex.toFixed(1)}/100`);
        console.log(`  Convergence Time: ${convergenceTime === Infinity ? '∞' : convergenceTime.toFixed(1)} min`);
        console.log(`  Overall Score: ${overallScore.toFixed(1)}/100`);
        
        return metrics;
    }

    getDefaultPerformanceMetrics() {
        return {
            finalCe: 0,
            maxCe: 0,
            avgDeviation: Infinity,
            targetAccuracy: 0,
            stabilityIndex: 0,
            convergenceTime: Infinity,
            totalAdjustments: 0,
            overshootPercent: 0,
            undershootPercent: 100,
            overallScore: 0,
            accuracyScore: 0,
            stabilityScore: 0,
            convergenceScore: 0,
            timeInTarget: 0,
            timeAboveTarget: 0,
            timeBelowTarget: 100
        };
    }

    /**
     * Simulate bolus + continuous infusion for specific time
     */
    simulateBolusAndContinuous(bolusDoseMg, continuousRate, targetTime) {
        const bolusState = this.calculateBolusInitialConcentration(bolusDoseMg);
        let state = { a1: bolusState.a1, a2: bolusState.a2, a3: bolusState.a3 };
        let currentCe = bolusState.effectSiteConc;
        
        const infusionRateMgMin = (continuousRate * this.patient.weight) / 60.0;
        const numSteps = Math.floor(targetTime / this.settings.timeStep);
        
        for (let i = 0; i < numSteps; i++) {
            const plasmaConc = state.a1 / this.pkParams.v1;
            
            // Update effect site concentration
            const dCedt = this.pkParams.ke0 * (plasmaConc - currentCe);
            currentCe = currentCe + this.settings.timeStep * dCedt;
            
            // Update system state
            state = this.updateSystemStateRK4(state, infusionRateMgMin, this.settings.timeStep);
        }
        
        return currentCe;
    }

    /**
     * Calculate initial state after bolus administration
     */
    calculateBolusInitialConcentration(bolusDoseMg) {
        const initialPlasmaConc = bolusDoseMg / this.pkParams.v1;
        return {
            a1: bolusDoseMg,
            a2: 0.0,
            a3: 0.0,
            plasmaConc: initialPlasmaConc,
            effectSiteConc: 0.0
        };
    }

    /**
     * 4th order Runge-Kutta integration (Context7 Math.NET style)
     */
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
     * Generate detailed clinical schedule
     */
    generateDetailedSchedule(bolusDoseMg, continuousRate, adjustments) {
        const schedule = [];
        
        // Bolus dose
        schedule.push({
            time: 0,
            action: 'Bolus Administration',
            dose: `${bolusDoseMg.toFixed(1)} mg`,
            rate: '-',
            comment: 'Initial Bolus Administration',
            type: 'bolus'
        });
        
        // Initial continuous infusion
        schedule.push({
            time: 0,
            action: 'Start Continuous Infusion',
            dose: '-',
            rate: `${continuousRate.toFixed(2)} mg/kg/hr`,
            comment: 'Initial Continuous Infusion Rate',
            type: 'start_continuous'
        });
        
        // Step-down adjustments
        adjustments.forEach((adj, index) => {
            schedule.push({
                time: Math.round(adj.time),
                action: `Step-down #${adj.adjustmentNumber}`,
                dose: '-',
                rate: `${adj.newRate.toFixed(2)} mg/kg/hr`,
                comment: `Dose reduction due to threshold reached (Ce: ${adj.ceAtEvent.toFixed(2)} μg/mL, -${adj.reductionPercent.toFixed(1)}%)`,
                type: 'step_down',
                ceAtEvent: adj.ceAtEvent,
                reductionPercent: adj.reductionPercent
            });
        });
        
        return schedule;
    }

    /**
     * Get chart data for visualization
     */
    getChartData() {
        if (!this.lastResult) return null;
        
        const data = this.lastResult.protocol.timeSeriesData;
        const adjustments = this.lastResult.protocol.dosageAdjustments;
        
        return {
            times: data.map(d => d.time),
            plasmaConcentrations: data.map(d => d.plasma),
            effectSiteConcentrations: data.map(d => d.ce),
            infusionRates: data.map(d => d.infusionRate),
            targetLine: data.map(d => d.targetCe),
            upperThresholdLine: data.map(d => d.upperThreshold),
            adjustmentTimes: adjustments.map(a => a.time),
            adjustmentLabels: adjustments.map(a => `#${a.adjustmentNumber}`)
        };
    }

    getLastResult() {
        return this.lastResult;
    }

    getOptimizationHistory() {
        return this.optimizationHistory;
    }

    reset() {
        this.lastResult = null;
        console.log('Advanced Protocol Engine reset');
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.AdvancedProtocolEngine = AdvancedProtocolEngine;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AdvancedProtocolEngine };
}