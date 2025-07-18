/**
 * Adaptive Time Step Performance and Accuracy Tests
 * Validates adaptive time stepping implementation against fixed step methods
 */

class AdaptiveTimeStepTests {
    constructor() {
        this.testResults = [];
        this.testEngine = null;
        this.testPatient = {
            id: 'test-patient',
            age: 50,
            weight: 70,
            height: 170,
            sex: 1,
            asaPS: 1
        };
    }

    /**
     * Initialize test engine
     */
    setupTestEngine() {
        this.testEngine = new ProtocolEngine();
        this.testEngine.setPatient(this.testPatient);
        this.testEngine.updateSettings({
            targetCe: 1.0,
            upperThreshold: 1.2,
            reductionFactor: 0.70,
            timeStep: 0.1,
            simulationDuration: 120,
            targetReachTime: 20,
            adjustmentInterval: 5.0
        });
    }

    /**
     * Test computation speed comparison
     */
    testComputationSpeed() {
        console.log('=== Testing Computation Speed ===');
        
        this.setupTestEngine();
        
        const testCases = [
            { bolus: 10, rate: 2.0, name: 'Standard Case' },
            { bolus: 15, rate: 3.0, name: 'High Dose Case' },
            { bolus: 5, rate: 1.0, name: 'Low Dose Case' }
        ];
        
        const results = [];
        
        for (const testCase of testCases) {
            // Fixed step timing
            const fixedStartTime = performance.now();
            const fixedResult = this.testEngine.generateCompleteProtocol(
                testCase.bolus, 
                testCase.rate, 
                false // useAdaptive = false
            );
            const fixedEndTime = performance.now();
            const fixedTime = fixedEndTime - fixedStartTime;
            
            // Adaptive step timing
            const adaptiveStartTime = performance.now();
            const adaptiveResult = this.testEngine.generateCompleteProtocol(
                testCase.bolus, 
                testCase.rate, 
                true // useAdaptive = true
            );
            const adaptiveEndTime = performance.now();
            const adaptiveTime = adaptiveEndTime - adaptiveStartTime;
            
            // Calculate speedup
            const speedup = fixedTime / adaptiveTime;
            const memoryReduction = ((fixedResult.timeSeriesData.length - adaptiveResult.timeSeriesData.length) / fixedResult.timeSeriesData.length) * 100;
            
            results.push({
                testCase: testCase.name,
                fixedTime: fixedTime,
                adaptiveTime: adaptiveTime,
                speedup: speedup,
                fixedDataPoints: fixedResult.timeSeriesData.length,
                adaptiveDataPoints: adaptiveResult.timeSeriesData.length,
                memoryReduction: memoryReduction,
                adaptiveStats: adaptiveResult.performance.adaptiveStats
            });
        }
        
        // Calculate averages
        const avgSpeedup = results.reduce((sum, r) => sum + r.speedup, 0) / results.length;
        const avgMemoryReduction = results.reduce((sum, r) => sum + r.memoryReduction, 0) / results.length;
        
        const testResult = {
            testName: 'Computation Speed',
            results: results,
            avgSpeedup: avgSpeedup,
            avgMemoryReduction: avgMemoryReduction,
            passed: avgSpeedup >= 2.0 && avgMemoryReduction >= 20, // Target: 2x speedup, 20% memory reduction
            targetSpeedup: 3.0,
            targetMemoryReduction: 30
        };
        
        this.testResults.push(testResult);
        
        console.log(`Average speedup: ${avgSpeedup.toFixed(2)}x`);
        console.log(`Average memory reduction: ${avgMemoryReduction.toFixed(1)}%`);
        console.log(`Test passed: ${testResult.passed}`);
        
        return testResult;
    }

    /**
     * Test accuracy maintenance
     */
    testAccuracyMaintenance() {
        console.log('=== Testing Accuracy Maintenance ===');
        
        this.setupTestEngine();
        
        const testScenarios = [
            { bolus: 12, rate: 2.5, name: 'Bolus + Continuous' },
            { bolus: 0, rate: 3.0, name: 'Continuous Only' },
            { bolus: 20, rate: 1.5, name: 'High Bolus' }
        ];
        
        const results = [];
        
        for (const scenario of testScenarios) {
            // Fixed step simulation (reference)
            const fixedResult = this.testEngine.generateCompleteProtocol(
                scenario.bolus, 
                scenario.rate, 
                false
            );
            
            // Adaptive step simulation
            const adaptiveResult = this.testEngine.generateCompleteProtocol(
                scenario.bolus, 
                scenario.rate, 
                true
            );
            
            // Compare key metrics
            const accuracy = this.compareAccuracy(fixedResult, adaptiveResult);
            
            results.push({
                scenario: scenario.name,
                ...accuracy
            });
        }
        
        // Calculate overall accuracy
        const avgConcentrationError = results.reduce((sum, r) => sum + r.avgConcentrationError, 0) / results.length;
        const maxConcentrationError = Math.max(...results.map(r => r.maxConcentrationError));
        
        const testResult = {
            testName: 'Accuracy Maintenance',
            results: results,
            avgConcentrationError: avgConcentrationError,
            maxConcentrationError: maxConcentrationError,
            passed: avgConcentrationError < 0.01 && maxConcentrationError < 0.05, // <1% avg, <5% max error
            targetAccuracy: 99.9
        };
        
        this.testResults.push(testResult);
        
        console.log(`Average concentration error: ${(avgConcentrationError * 100).toFixed(3)}%`);
        console.log(`Maximum concentration error: ${(maxConcentrationError * 100).toFixed(3)}%`);
        console.log(`Test passed: ${testResult.passed}`);
        
        return testResult;
    }

    /**
     * Test event detection and precision
     */
    testEventDetection() {
        console.log('=== Testing Event Detection ===');
        
        this.setupTestEngine();
        
        // Test with multiple events
        const bolusDose = 15;
        const initialRate = 2.0;
        
        // Fixed step simulation
        const fixedResult = this.testEngine.generateCompleteProtocol(bolusDose, initialRate, false);
        
        // Adaptive step simulation
        const adaptiveResult = this.testEngine.generateCompleteProtocol(bolusDose, initialRate, true);
        
        // Analyze event detection
        const eventAnalysis = this.analyzeEventDetection(fixedResult, adaptiveResult);
        
        const testResult = {
            testName: 'Event Detection',
            eventAnalysis: eventAnalysis,
            passed: eventAnalysis.eventDetectionAccuracy >= 0.995, // >99.5% accuracy
            targetAccuracy: 99.9
        };
        
        this.testResults.push(testResult);
        
        console.log(`Event detection accuracy: ${(eventAnalysis.eventDetectionAccuracy * 100).toFixed(2)}%`);
        console.log(`Critical points captured: ${eventAnalysis.criticalPointsCaptured}`);
        console.log(`Test passed: ${testResult.passed}`);
        
        return testResult;
    }

    /**
     * Test adaptability in different scenarios
     */
    testAdaptability() {
        console.log('=== Testing Adaptability ===');
        
        this.setupTestEngine();
        
        const scenarios = [
            { 
                name: 'Rapid Changes',
                bolus: 20,
                rate: 1.0,
                description: 'High bolus with low continuous rate'
            },
            {
                name: 'Gradual Changes',
                bolus: 5,
                rate: 2.0,
                description: 'Low bolus with steady continuous rate'
            },
            {
                name: 'Mixed Pattern',
                bolus: 12,
                rate: 2.5,
                description: 'Moderate bolus with moderate continuous rate'
            }
        ];
        
        const results = [];
        
        for (const scenario of scenarios) {
            const adaptiveResult = this.testEngine.generateCompleteProtocol(
                scenario.bolus, 
                scenario.rate, 
                true
            );
            
            const adaptiveStats = adaptiveResult.performance.adaptiveStats;
            
            // Analyze step size distribution
            const stepAnalysis = this.analyzeStepSizeDistribution(adaptiveResult);
            
            results.push({
                scenario: scenario.name,
                description: scenario.description,
                acceptanceRate: adaptiveStats.acceptanceRate,
                computationalSavings: adaptiveStats.computationalSavings,
                stepAnalysis: stepAnalysis,
                adaptabilityScore: this.calculateAdaptabilityScore(stepAnalysis)
            });
        }
        
        const avgAdaptabilityScore = results.reduce((sum, r) => sum + r.adaptabilityScore, 0) / results.length;
        
        const testResult = {
            testName: 'Adaptability',
            results: results,
            avgAdaptabilityScore: avgAdaptabilityScore,
            passed: avgAdaptabilityScore >= 0.7, // 70% adaptability score
            targetScore: 0.8
        };
        
        this.testResults.push(testResult);
        
        console.log(`Average adaptability score: ${(avgAdaptabilityScore * 100).toFixed(1)}%`);
        console.log(`Test passed: ${testResult.passed}`);
        
        return testResult;
    }

    /**
     * Test memory usage optimization
     */
    testMemoryOptimization() {
        console.log('=== Testing Memory Optimization ===');
        
        this.setupTestEngine();
        
        // Test with longer simulation
        this.testEngine.updateSettings({ simulationDuration: 300 }); // 5 hours
        
        const testCases = [
            { bolus: 10, rate: 2.0, name: 'Long Simulation' },
            { bolus: 15, rate: 1.5, name: 'Extended Protocol' }
        ];
        
        const results = [];
        
        for (const testCase of testCases) {
            // Fixed step simulation
            const fixedResult = this.testEngine.generateCompleteProtocol(
                testCase.bolus, 
                testCase.rate, 
                false
            );
            
            // Adaptive step simulation
            const adaptiveResult = this.testEngine.generateCompleteProtocol(
                testCase.bolus, 
                testCase.rate, 
                true
            );
            
            // Calculate memory usage
            const fixedMemoryUsage = this.estimateMemoryUsage(fixedResult);
            const adaptiveMemoryUsage = this.estimateMemoryUsage(adaptiveResult);
            const memorySavings = ((fixedMemoryUsage - adaptiveMemoryUsage) / fixedMemoryUsage) * 100;
            
            results.push({
                testCase: testCase.name,
                fixedMemoryUsage: fixedMemoryUsage,
                adaptiveMemoryUsage: adaptiveMemoryUsage,
                memorySavings: memorySavings,
                interpolationCount: adaptiveResult.performance.adaptiveStats.interpolationCount
            });
        }
        
        const avgMemorySavings = results.reduce((sum, r) => sum + r.memorySavings, 0) / results.length;
        
        const testResult = {
            testName: 'Memory Optimization',
            results: results,
            avgMemorySavings: avgMemorySavings,
            passed: avgMemorySavings >= 30, // Target: 30% memory savings
            targetSavings: 40
        };
        
        this.testResults.push(testResult);
        
        console.log(`Average memory savings: ${avgMemorySavings.toFixed(1)}%`);
        console.log(`Test passed: ${testResult.passed}`);
        
        return testResult;
    }

    /**
     * Compare accuracy between fixed and adaptive methods
     */
    compareAccuracy(fixedResult, adaptiveResult) {
        const fixedData = fixedResult.timeSeriesData;
        const adaptiveData = adaptiveResult.timeSeriesData;
        
        let totalError = 0;
        let maxError = 0;
        let comparisonCount = 0;
        
        // Compare at common time points
        for (const fixedPoint of fixedData) {
            const adaptivePoint = adaptiveData.find(p => Math.abs(p.time - fixedPoint.time) < 1e-6);
            
            if (adaptivePoint) {
                const concentrationError = Math.abs(adaptivePoint.ce - fixedPoint.ce) / Math.max(fixedPoint.ce, 0.1);
                totalError += concentrationError;
                maxError = Math.max(maxError, concentrationError);
                comparisonCount++;
            }
        }
        
        return {
            avgConcentrationError: totalError / comparisonCount,
            maxConcentrationError: maxError,
            comparisonCount: comparisonCount
        };
    }

    /**
     * Analyze event detection capabilities
     */
    analyzeEventDetection(fixedResult, adaptiveResult) {
        const fixedEvents = fixedResult.dosageAdjustments;
        const adaptiveEvents = adaptiveResult.dosageAdjustments;
        
        let matchedEvents = 0;
        const timeTolerance = 0.1; // 0.1 minute tolerance
        
        for (const fixedEvent of fixedEvents) {
            const matchingAdaptiveEvent = adaptiveEvents.find(e => 
                Math.abs(e.time - fixedEvent.time) < timeTolerance
            );
            
            if (matchingAdaptiveEvent) {
                matchedEvents++;
            }
        }
        
        return {
            eventDetectionAccuracy: matchedEvents / Math.max(fixedEvents.length, 1),
            criticalPointsCaptured: matchedEvents,
            totalEvents: fixedEvents.length
        };
    }

    /**
     * Analyze step size distribution
     */
    analyzeStepSizeDistribution(adaptiveResult) {
        const timeSeriesData = adaptiveResult.timeSeriesData;
        const stepSizes = [];
        
        for (let i = 1; i < timeSeriesData.length; i++) {
            const stepSize = timeSeriesData[i].time - timeSeriesData[i-1].time;
            stepSizes.push(stepSize);
        }
        
        const minStep = Math.min(...stepSizes);
        const maxStep = Math.max(...stepSizes);
        const avgStep = stepSizes.reduce((sum, s) => sum + s, 0) / stepSizes.length;
        const stepVariance = stepSizes.reduce((sum, s) => sum + Math.pow(s - avgStep, 2), 0) / stepSizes.length;
        
        return {
            minStep: minStep,
            maxStep: maxStep,
            avgStep: avgStep,
            stepVariance: stepVariance,
            stepCount: stepSizes.length
        };
    }

    /**
     * Calculate adaptability score
     */
    calculateAdaptabilityScore(stepAnalysis) {
        const stepRange = stepAnalysis.maxStep - stepAnalysis.minStep;
        const normalizedRange = stepRange / stepAnalysis.maxStep;
        const variabilityScore = Math.min(stepAnalysis.stepVariance * 1000, 1.0);
        
        return (normalizedRange + variabilityScore) / 2;
    }

    /**
     * Estimate memory usage
     */
    estimateMemoryUsage(result) {
        const dataPoints = result.timeSeriesData.length;
        const bytesPerDataPoint = 8 * 10; // Approximate bytes per data point
        return dataPoints * bytesPerDataPoint;
    }

    /**
     * Run all adaptive time step tests
     */
    runAllTests() {
        console.log('===============================================');
        console.log('       ADAPTIVE TIME STEP TEST SUITE        ');
        console.log('===============================================');
        
        this.testResults = [];
        
        // Run all tests
        this.testComputationSpeed();
        console.log('');
        this.testAccuracyMaintenance();
        console.log('');
        this.testEventDetection();
        console.log('');
        this.testAdaptability();
        console.log('');
        this.testMemoryOptimization();
        console.log('');
        
        // Summary
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.passed).length;
        
        console.log('===============================================');
        console.log('                TEST SUMMARY                 ');
        console.log('===============================================');
        console.log(`Total tests: ${totalTests}`);
        console.log(`Passed: ${passedTests}`);
        console.log(`Failed: ${totalTests - passedTests}`);
        console.log(`Success rate: ${(passedTests/totalTests*100).toFixed(1)}%`);
        
        if (passedTests === totalTests) {
            console.log('✅ ALL TESTS PASSED - Adaptive time step implementation is successful');
        } else {
            console.log('❌ SOME TESTS FAILED - Please review implementation');
        }
        
        return {
            totalTests: totalTests,
            passedTests: passedTests,
            successRate: passedTests/totalTests*100,
            allPassed: passedTests === totalTests,
            results: this.testResults
        };
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.AdaptiveTimeStepTests = AdaptiveTimeStepTests;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AdaptiveTimeStepTests };
}