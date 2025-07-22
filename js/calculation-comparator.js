/**
 * Calculation Method Comparison Framework
 * Implements Strategy pattern for comparing different numerical methods
 * 
 * Features:
 * - Multiple calculation methods comparison
 * - Performance metrics evaluation
 * - CSV export functionality
 * - Error analysis and clinical indicators
 */

/**
 * Base class for calculation methods (Strategy pattern)
 */
class CalculationMethod {
    constructor(name, description) {
        this.name = name;
        this.description = description;
    }

    /**
     * Execute calculation method
     * @param {object} patient - Patient parameters
     * @param {object} protocol - Protocol parameters
     * @param {object} settings - Method-specific settings
     * @returns {object} Calculation result
     */
    calculate(patient, protocol, settings) {
        throw new Error('calculate() method must be implemented');
    }

    /**
     * Get method-specific settings
     * @returns {object} Default settings for this method
     */
    getDefaultSettings() {
        return {};
    }
}

/**
 * RK4 Standard Method
 */
class RK4StandardMethod extends CalculationMethod {
    constructor() {
        super('RK4 Standard', 'Fourth-order Runge-Kutta with fixed 0.1min time step');
    }

    getDefaultSettings() {
        return {
            timeStep: 0.1,
            simulationDuration: 120,
            method: 'rk4_standard'
        };
    }

    calculate(patient, protocol, settings) {
        const startTime = performance.now();
        
        // Use existing protocol engine
        const engine = new ProtocolEngine();
        engine.setPatient(patient);
        engine.updateSettings({ ...settings, timeStep: 0.1 });
        
        const result = engine.generateCompleteProtocol(
            protocol.bolusDose,
            protocol.continuousRate,
            false // useAdaptive = false
        );
        
        const endTime = performance.now();
        
        return {
            timeSeriesData: result.timeSeriesData,
            dosageAdjustments: result.dosageAdjustments,
            performance: result.performance,
            executionTime: endTime - startTime,
            memoryUsage: this.estimateMemoryUsage(result.timeSeriesData),
            calculationMethod: result.calculationMethod
        };
    }

    estimateMemoryUsage(timeSeriesData) {
        // Estimate memory usage based on data points
        const bytesPerDataPoint = 8 * 10; // Approximate bytes per data point
        return timeSeriesData.length * bytesPerDataPoint;
    }
}

/**
 * RK4 Fine Method
 */
class RK4FineMethod extends CalculationMethod {
    constructor() {
        super('RK4 Fine', 'Fourth-order Runge-Kutta with fine 0.01min time step');
    }

    getDefaultSettings() {
        return {
            timeStep: 0.01,
            simulationDuration: 120,
            method: 'rk4_fine'
        };
    }

    calculate(patient, protocol, settings) {
        const startTime = performance.now();
        
        const engine = new ProtocolEngine();
        engine.setPatient(patient);
        engine.updateSettings({ ...settings, timeStep: 0.01 });
        
        const result = engine.generateCompleteProtocol(
            protocol.bolusDose,
            protocol.continuousRate,
            false
        );
        
        const endTime = performance.now();
        
        return {
            timeSeriesData: result.timeSeriesData,
            dosageAdjustments: result.dosageAdjustments,
            performance: result.performance,
            executionTime: endTime - startTime,
            memoryUsage: this.estimateMemoryUsage(result.timeSeriesData),
            calculationMethod: result.calculationMethod
        };
    }

    estimateMemoryUsage(timeSeriesData) {
        const bytesPerDataPoint = 8 * 10;
        return timeSeriesData.length * bytesPerDataPoint;
    }
}

/**
 * Adaptive RK4 Method
 */
class AdaptiveRK4Method extends CalculationMethod {
    constructor() {
        super('Adaptive RK4', 'Fourth-order Runge-Kutta with adaptive time stepping');
    }

    getDefaultSettings() {
        return {
            timeStep: 0.1,
            simulationDuration: 120,
            method: 'adaptive_rk4'
        };
    }

    calculate(patient, protocol, settings) {
        const startTime = performance.now();
        
        const engine = new ProtocolEngine();
        engine.setPatient(patient);
        engine.updateSettings(settings);
        
        const result = engine.generateCompleteProtocol(
            protocol.bolusDose,
            protocol.continuousRate,
            true // useAdaptive = true
        );
        
        const endTime = performance.now();
        
        return {
            timeSeriesData: result.timeSeriesData,
            dosageAdjustments: result.dosageAdjustments,
            performance: result.performance,
            executionTime: endTime - startTime,
            memoryUsage: this.estimateMemoryUsage(result.timeSeriesData),
            calculationMethod: result.calculationMethod,
            adaptiveStats: result.performance.adaptiveStats
        };
    }

    estimateMemoryUsage(timeSeriesData) {
        const bytesPerDataPoint = 8 * 10;
        return timeSeriesData.length * bytesPerDataPoint;
    }
}

/**
 * Enhanced Protocol Engine Method
 */
class EnhancedProtocolMethod extends CalculationMethod {
    constructor() {
        super('Enhanced Protocol', 'Enhanced protocol engine with predictive control');
    }

    getDefaultSettings() {
        return {
            timeStep: 0.01,
            simulationDuration: 180,
            method: 'enhanced_protocol'
        };
    }

    calculate(patient, protocol, settings) {
        const startTime = performance.now();
        
        // Check if enhanced engine is available
        if (typeof EnhancedProtocolEngine === 'undefined') {
            throw new Error('EnhancedProtocolEngine is not available');
        }
        
        const engine = new EnhancedProtocolEngine();
        engine.setPatient(patient);
        engine.updateSettings(settings);
        
        const result = engine.runEnhancedOptimization(
            protocol.targetCe || 1.0,
            protocol.bolusDose,
            protocol.targetTime || 20
        );
        
        const endTime = performance.now();
        
        return {
            timeSeriesData: result.protocol.timeSeriesData,
            dosageAdjustments: result.protocol.dosageAdjustments,
            performance: result.protocol.performance,
            executionTime: endTime - startTime,
            memoryUsage: this.estimateMemoryUsage(result.protocol.timeSeriesData),
            calculationMethod: result.protocol.calculationMethod,
            optimizedRate: result.optimizedRate
        };
    }

    estimateMemoryUsage(timeSeriesData) {
        const bytesPerDataPoint = 8 * 10;
        return timeSeriesData.length * bytesPerDataPoint;
    }
}

/**
 * Main Calculation Comparator class
 */
class CalculationComparator {
    constructor() {
        this.availableMethods = {
            'rk4_standard': new RK4StandardMethod(),
            'rk4_fine': new RK4FineMethod(),
            'adaptive_rk4': new AdaptiveRK4Method(),
            'enhanced_protocol': new EnhancedProtocolMethod(),
            // Phase1-006: Add unified numerical solver methods
            'euler': new UnifiedEulerMethod(),
            'rk4': new UnifiedRK4Method(),
            'rk45': new UnifiedRK45Method()
        };
        
        this.results = new Map();
        this.comparisonMetrics = [];
        this.referenceMethod = 'rk4_fine'; // Use fine RK4 as reference
    }

    /**
     * Register a new calculation method
     */
    registerMethod(methodKey, method) {
        this.availableMethods[methodKey] = method;
    }

    /**
     * Get available methods
     */
    getAvailableMethods() {
        return Object.keys(this.availableMethods).map(key => ({
            key: key,
            name: this.availableMethods[key].name,
            description: this.availableMethods[key].description
        }));
    }

    /**
     * Run comparison with selected methods
     */
    async runComparison(patient, protocol, selectedMethods = null) {
        console.log('=== Starting Calculation Method Comparison ===');
        
        const methodsToRun = selectedMethods || Object.keys(this.availableMethods);
        this.results.clear();
        
        // Run each method
        for (const methodKey of methodsToRun) {
            const method = this.availableMethods[methodKey];
            
            if (!method) {
                console.warn(`Method ${methodKey} not found`);
                continue;
            }
            
            try {
                console.log(`Running ${method.name}...`);
                const settings = method.getDefaultSettings();
                const result = method.calculate(patient, protocol, settings);
                
                this.results.set(methodKey, {
                    methodKey: methodKey,
                    methodName: method.name,
                    methodDescription: method.description,
                    result: result,
                    settings: settings
                });
                
                const executionTime = result.executionTime || result.computationTime || 0;
                console.log(`✅ ${method.name} completed in ${executionTime.toFixed(2)}ms`);
                
            } catch (error) {
                console.error(`❌ ${method.name} failed:`, error.message);
                this.results.set(methodKey, {
                    methodKey: methodKey,
                    methodName: method.name,
                    methodDescription: method.description,
                    error: error.message,
                    settings: method.getDefaultSettings()
                });
            }
        }
        
        // Calculate comparison metrics
        this.calculateComparisonMetrics();
        
        console.log('=== Comparison Complete ===');
        console.log(`Successfully ran ${this.results.size} methods`);
        
        return this.results;
    }

    /**
     * Calculate comparison metrics
     */
    calculateComparisonMetrics() {
        const successfulResults = Array.from(this.results.values())
            .filter(r => r.result && !r.error);
        
        if (successfulResults.length === 0) {
            console.warn('No successful results to compare');
            return;
        }
        
        // Find reference result
        const referenceResult = this.results.get(this.referenceMethod);
        
        this.comparisonMetrics = successfulResults.map(methodResult => {
            const result = methodResult.result;
            const metrics = this.calculateMethodMetrics(result, referenceResult?.result);
            
            return {
                methodKey: methodResult.methodKey,
                methodName: methodResult.methodName,
                ...metrics
            };
        });
    }

    /**
     * Calculate metrics for a single method
     */
    calculateMethodMetrics(result, referenceResult) {
        // Add safety checks
        if (!result || !result.timeSeriesData || !Array.isArray(result.timeSeriesData)) {
            console.error('Invalid result structure:', result);
            return {
                executionTime: 0,
                memoryUsage: 0,
                dataPoints: 0,
                maxPlasmaConc: 0,
                maxEffectSiteConc: 0,
                finalEffectSiteConc: 0,
                awakeningTime: null,
                totalAdjustments: 0,
                avgTimeStep: 0,
                rmse: null,
                maxError: null,
                relativeError: null
            };
        }
        
        const timeSeriesData = result.timeSeriesData;
        
        // Basic metrics
        const executionTime = result.executionTime || result.computationTime || 0;
        const memoryUsage = result.memoryUsage || 0;
        const dataPoints = timeSeriesData.length;
        
        // Clinical metrics - handle different data structure formats
        const maxPlasmaConc = Math.max(...timeSeriesData.map(d => 
            d.plasma || d.plasmaConcentration || 0));
        const maxEffectSiteConc = Math.max(...timeSeriesData.map(d => 
            d.ce || d.effectSiteConcentration || 0));
        const finalEffectSiteConc = timeSeriesData.length > 0 ? 
            (timeSeriesData[timeSeriesData.length - 1].ce || 
             timeSeriesData[timeSeriesData.length - 1].effectSiteConcentration || 0) : 0;
        
        // Find awakening time (Ce < 1.5 μg/mL)
        const awakeningThreshold = 1.5;
        const awakeningPoint = timeSeriesData.find(d => 
            (d.ce || d.effectSiteConcentration || 0) < awakeningThreshold);
        const awakeningTime = awakeningPoint ? awakeningPoint.time : null;
        
        // Performance metrics
        const totalAdjustments = result.dosageAdjustments?.length || 0;
        const avgTimeStep = dataPoints > 1 ? 
            (timeSeriesData[timeSeriesData.length - 1].time - timeSeriesData[0].time) / (dataPoints - 1) : 0;
        
        // Calculate accuracy metrics if reference is available
        let rmse = null;
        let maxError = null;
        let relativeError = null;
        
        if (referenceResult) {
            const accuracyMetrics = this.calculateAccuracyMetrics(result, referenceResult);
            rmse = accuracyMetrics.rmse;
            maxError = accuracyMetrics.maxError;
            relativeError = accuracyMetrics.relativeError;
        }
        
        return {
            executionTime,
            memoryUsage,
            dataPoints,
            maxPlasmaConc,
            maxEffectSiteConc,
            finalEffectSiteConc,
            awakeningTime,
            totalAdjustments,
            avgTimeStep,
            rmse,
            maxError,
            relativeError
        };
    }

    /**
     * Calculate accuracy metrics compared to reference
     */
    calculateAccuracyMetrics(result, referenceResult) {
        const timeSeriesData = result.timeSeriesData;
        const referenceData = referenceResult.timeSeriesData;
        
        let sumSquaredError = 0;
        let maxError = 0;
        let comparisonCount = 0;
        
        // Compare at common time points
        for (const dataPoint of timeSeriesData) {
            const referencePoint = this.interpolateAtTime(referenceData, dataPoint.time);
            
            if (referencePoint) {
                const error = Math.abs(dataPoint.ce - referencePoint.ce);
                sumSquaredError += error * error;
                maxError = Math.max(maxError, error);
                comparisonCount++;
            }
        }
        
        const rmse = comparisonCount > 0 ? Math.sqrt(sumSquaredError / comparisonCount) : 0;
        const relativeError = rmse / Math.max(...timeSeriesData.map(d => d.ce));
        
        return {
            rmse,
            maxError,
            relativeError
        };
    }

    /**
     * Interpolate value at specific time
     */
    interpolateAtTime(timeSeriesData, targetTime) {
        if (targetTime < timeSeriesData[0].time || targetTime > timeSeriesData[timeSeriesData.length - 1].time) {
            return null;
        }
        
        // Find exact match
        const exactMatch = timeSeriesData.find(d => Math.abs(d.time - targetTime) < 1e-10);
        if (exactMatch) {
            return exactMatch;
        }
        
        // Find surrounding points
        let i = 0;
        while (i < timeSeriesData.length && timeSeriesData[i].time < targetTime) {
            i++;
        }
        
        if (i === 0 || i === timeSeriesData.length) {
            return null;
        }
        
        const before = timeSeriesData[i - 1];
        const after = timeSeriesData[i];
        
        // Linear interpolation
        const ratio = (targetTime - before.time) / (after.time - before.time);
        
        return {
            time: targetTime,
            ce: before.ce + ratio * (after.ce - before.ce),
            plasma: before.plasma + ratio * (after.plasma - before.plasma)
        };
    }

    /**
     * Generate comparison CSV
     */
    generateComparisonCSV() {
        const headers = [
            'Time(min)',
            'Method',
            'PlasmaConc(μg/mL)',
            'EffectSiteConc(μg/mL)',
            'InfusionRate(mg/kg/hr)',
            'CumulativeDose(mg)',
            'TimeStep(min)',
            'Interpolated'
        ];
        
        const rows = [headers];
        
        // Add metadata comments
        const metadata = [
            `# Comparison generated on ${new Date().toISOString()}`,
            `# Number of methods: ${this.results.size}`,
            `# Reference method: ${this.referenceMethod}`,
            ''
        ];
        
        // Collect all time point data
        for (const [methodKey, methodData] of this.results) {
            if (methodData.error) continue;
            
            const timeSeriesData = methodData.result.timeSeriesData;
            let cumulativeDose = 0;
            
            for (const dataPoint of timeSeriesData) {
                // Calculate cumulative dose
                if (dataPoint.isBolus) {
                    cumulativeDose += methodData.result.bolusDose || 0;
                } else {
                    cumulativeDose += dataPoint.infusionRate * 70 / 60 * 0.1; // Approximate
                }
                
                rows.push([
                    dataPoint.time.toFixed(3),
                    methodData.methodName,
                    dataPoint.plasma.toFixed(6),
                    dataPoint.ce.toFixed(6),
                    dataPoint.infusionRate.toFixed(3),
                    cumulativeDose.toFixed(3),
                    dataPoint.adaptiveStep?.toFixed(6) || '0.100',
                    dataPoint.interpolated ? 'Yes' : 'No'
                ]);
            }
        }
        
        const csvContent = metadata.join('\n') + 
                          rows.map(row => row.join(',')).join('\n');
        
        return csvContent;
    }

    /**
     * Generate metrics comparison CSV
     */
    generateMetricsCSV() {
        const headers = ['Metric', ...this.comparisonMetrics.map(m => m.methodName)];
        
        const metricNames = [
            'Execution Time (ms)',
            'Memory Usage (bytes)',
            'Data Points',
            'Max Plasma Conc (μg/mL)',
            'Max Effect-Site Conc (μg/mL)',
            'Final Effect-Site Conc (μg/mL)',
            'Awakening Time (min)',
            'Total Adjustments',
            'Average Time Step (min)',
            'RMSE vs Reference',
            'Max Error vs Reference',
            'Relative Error vs Reference'
        ];
        
        const metricKeys = [
            'executionTime',
            'memoryUsage',
            'dataPoints',
            'maxPlasmaConc',
            'maxEffectSiteConc',
            'finalEffectSiteConc',
            'awakeningTime',
            'totalAdjustments',
            'avgTimeStep',
            'rmse',
            'maxError',
            'relativeError'
        ];
        
        const rows = [headers];
        
        for (let i = 0; i < metricNames.length; i++) {
            const metricName = metricNames[i];
            const metricKey = metricKeys[i];
            
            const values = this.comparisonMetrics.map(m => {
                const value = m[metricKey];
                return value !== null && value !== undefined ? 
                    (typeof value === 'number' ? value.toFixed(6) : value) : 'N/A';
            });
            
            rows.push([metricName, ...values]);
        }
        
        const csvContent = rows.map(row => row.join(',')).join('\n');
        
        return csvContent;
    }

    /**
     * Download CSV file
     */
    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Get comparison results
     */
    getResults() {
        return this.results;
    }

    /**
     * Get comparison metrics
     */
    getMetrics() {
        return this.comparisonMetrics;
    }

    /**
     * Reset comparator
     */
    reset() {
        this.results.clear();
        this.comparisonMetrics = [];
    }
}

/**
 * Unified Euler Method using new numerical solvers
 */
class UnifiedEulerMethod extends CalculationMethod {
    constructor() {
        super('Euler Method', 'First-order explicit method using unified numerical solvers');
    }

    getDefaultSettings() {
        return {
            timeStep: 0.1,
            method: 'euler'
        };
    }

    calculate(patient, protocol, settings) {
        try {
            // Check if required classes are available
            if (typeof PKPDIntegrationAdapter === 'undefined' || typeof DoseEvent === 'undefined') {
                throw new Error('Required classes not available. PKPDIntegrationAdapter or DoseEvent not found.');
            }

            // Check if patient has pkParams
            if (!patient.pkParams) {
                throw new Error('Patient PK parameters not available. Please ensure patient data is properly initialized.');
            }

            const adapter = new PKPDIntegrationAdapter(patient.pkParams);
            adapter.setMethod('euler');
            
            const doseEvents = [new DoseEvent(0, protocol.bolusDose, protocol.continuousRate)];
            
            const startTime = performance.now();
            const result = adapter.simulate(doseEvents, patient, protocol.duration, {
                timeStep: settings.timeStep
            });
            const endTime = performance.now();
            
            return {
                timeSeriesData: result.timeSeriesData,
                finalPlasmaConcentration: result.finalPlasmaConcentration,
                finalEffectSiteConcentration: result.finalEffectSiteConcentration,
                maxPlasmaConcentration: result.maxPlasmaConcentration,
                maxEffectSiteConcentration: result.maxEffectSiteConcentration,
                executionTime: endTime - startTime,
                computationTime: endTime - startTime,
                memoryUsage: result.timeSeriesData ? result.timeSeriesData.length * 8 * 10 : 0,
                stats: result.stats
            };
        } catch (error) {
            console.error('Unified Euler calculation failed:', error);
            throw error;
        }
    }
}

/**
 * Unified RK4 Method using new numerical solvers
 */
class UnifiedRK4Method extends CalculationMethod {
    constructor() {
        super('RK4 Method', 'Fourth-order Runge-Kutta using unified numerical solvers');
    }

    getDefaultSettings() {
        return {
            timeStep: 0.1,
            method: 'rk4'
        };
    }

    calculate(patient, protocol, settings) {
        try {
            // Check if required classes are available
            if (typeof PKPDIntegrationAdapter === 'undefined' || typeof DoseEvent === 'undefined') {
                throw new Error('Required classes not available. PKPDIntegrationAdapter or DoseEvent not found.');
            }

            // Check if patient has pkParams
            if (!patient.pkParams) {
                throw new Error('Patient PK parameters not available. Please ensure patient data is properly initialized.');
            }

            const adapter = new PKPDIntegrationAdapter(patient.pkParams);
            adapter.setMethod('rk4');
            
            const doseEvents = [new DoseEvent(0, protocol.bolusDose, protocol.continuousRate)];
            
            const startTime = performance.now();
            const result = adapter.simulate(doseEvents, patient, protocol.duration, {
                timeStep: settings.timeStep
            });
            const endTime = performance.now();
            
            return {
                timeSeriesData: result.timeSeriesData,
                finalPlasmaConcentration: result.finalPlasmaConcentration,
                finalEffectSiteConcentration: result.finalEffectSiteConcentration,
                maxPlasmaConcentration: result.maxPlasmaConcentration,
                maxEffectSiteConcentration: result.maxEffectSiteConcentration,
                executionTime: endTime - startTime,
                computationTime: endTime - startTime,
                memoryUsage: result.timeSeriesData ? result.timeSeriesData.length * 8 * 10 : 0,
                stats: result.stats
            };
        } catch (error) {
            console.error('Unified RK4 calculation failed:', error);
            throw error;
        }
    }
}

/**
 * Unified RK45 Method (Dormand-Prince) using new numerical solvers
 */
class UnifiedRK45Method extends CalculationMethod {
    constructor() {
        super('RK45 Method', 'Fifth-order Dormand-Prince with adaptive step size using unified numerical solvers');
    }

    getDefaultSettings() {
        return {
            timeStep: 0.01,
            method: 'rk45'
        };
    }

    calculate(patient, protocol, settings) {
        try {
            // Check if required classes are available
            if (typeof PKPDIntegrationAdapter === 'undefined' || typeof DoseEvent === 'undefined') {
                throw new Error('Required classes not available. PKPDIntegrationAdapter or DoseEvent not found.');
            }

            // Check if patient has pkParams
            if (!patient.pkParams) {
                throw new Error('Patient PK parameters not available. Please ensure patient data is properly initialized.');
            }

            const adapter = new PKPDIntegrationAdapter(patient.pkParams);
            adapter.setMethod('rk45');
            
            const doseEvents = [new DoseEvent(0, protocol.bolusDose, protocol.continuousRate)];
            
            const startTime = performance.now();
            const result = adapter.simulate(doseEvents, patient, protocol.duration, {
                timeStep: settings.timeStep
            });
            const endTime = performance.now();
            
            return {
                timeSeriesData: result.timeSeriesData,
                finalPlasmaConcentration: result.finalPlasmaConcentration,
                finalEffectSiteConcentration: result.finalEffectSiteConcentration,
                maxPlasmaConcentration: result.maxPlasmaConcentration,
                maxEffectSiteConcentration: result.maxEffectSiteConcentration,
                executionTime: endTime - startTime,
                computationTime: endTime - startTime,
                memoryUsage: result.timeSeriesData ? result.timeSeriesData.length * 8 * 10 : 0,
                stats: result.stats
            };
        } catch (error) {
            console.error('Unified RK45 calculation failed:', error);
            throw error;
        }
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.CalculationComparator = CalculationComparator;
    window.CalculationMethod = CalculationMethod;
    window.RK4StandardMethod = RK4StandardMethod;
    window.RK4FineMethod = RK4FineMethod;
    window.AdaptiveRK4Method = AdaptiveRK4Method;
    window.EnhancedProtocolMethod = EnhancedProtocolMethod;
    window.UnifiedEulerMethod = UnifiedEulerMethod;
    window.UnifiedRK4Method = UnifiedRK4Method;
    window.UnifiedRK45Method = UnifiedRK45Method;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        CalculationComparator,
        CalculationMethod,
        RK4StandardMethod,
        RK4FineMethod,
        AdaptiveRK4Method,
        EnhancedProtocolMethod
    };
}