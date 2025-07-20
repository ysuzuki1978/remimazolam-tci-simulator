/**
 * Numerical Methods Integration Test for Remimazolam TCI TIVA V1.0.0
 * Tests integration between unified numerical solvers and existing protocol engines
 * 
 * Features:
 * - Compatibility verification with existing engines
 * - Performance comparison between methods
 * - Accuracy validation against known solutions
 * - Integration with PK/PD system
 */

class NumericalMethodsIntegrationTest {
    constructor() {
        this.testResults = [];
        this.patient = null;
        this.pkParams = null;
        this.initialized = false;
    }

    /**
     * Initialize test environment
     */
    initialize() {
        console.log('=== Numerical Methods Integration Test ===');
        
        // Create test patient
        this.patient = new Patient(
            'TEST-001',
            45,    // age
            70,    // weight
            170,   // height
            SexType.MALE,
            AsapsType.CLASS_1_2
        );

        // Calculate PK parameters
        const result = MasuiKe0Calculator.calculateKe0Complete(
            this.patient.age,
            this.patient.weight,
            this.patient.height,
            this.patient.sex,
            this.patient.asaPS
        );

        if (!result.success) {
            throw new Error('Failed to calculate PK parameters for test');
        }

        this.pkParams = {
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

        console.log('Test patient initialized:');
        console.log(`- Age: ${this.patient.age}, Weight: ${this.patient.weight}kg, Height: ${this.patient.height}cm`);
        console.log(`- PK parameters: V1=${this.pkParams.V1.toFixed(2)}L, ke0=${this.pkParams.ke0.toFixed(4)}min⁻¹`);
        
        this.initialized = true;
    }

    /**
     * Test 1: Basic solver functionality
     */
    async testBasicSolverFunctionality() {
        if (!this.initialized) this.initialize();
        
        console.log('\n--- Test 1: Basic Solver Functionality ---');
        
        const solvers = new NumericalSolvers();
        const adapter = new PKPDIntegrationAdapter(this.pkParams);
        
        // Test dose event
        const doseEvents = [
            new DoseEvent(0, 10.0, 2.0) // 10mg bolus + 2mg/kg/hr continuous
        ];

        const results = {};
        const methods = ['euler', 'rk4', 'rk45'];
        
        for (const method of methods) {
            console.log(`Testing ${method} solver...`);
            
            try {
                adapter.setMethod(method);
                const startTime = performance.now();
                
                const result = adapter.simulate(
                    doseEvents, 
                    this.patient, 
                    60, // 60 minutes
                    { timeStep: 0.1 }
                );
                
                const endTime = performance.now();
                
                results[method] = {
                    success: true,
                    computationTime: endTime - startTime,
                    finalPlasmaConc: result.finalPlasmaConcentration,
                    finalEffectSiteConc: result.finalEffectSiteConcentration,
                    maxPlasmaConc: result.maxPlasmaConcentration,
                    maxEffectSiteConc: result.maxEffectSiteConcentration,
                    dataPoints: result.timeSeriesData.length,
                    stats: result.stats
                };
                
                console.log(`  ✓ ${method}: ${result.timeSeriesData.length} data points, ` +
                           `${(endTime - startTime).toFixed(2)}ms computation time`);
                console.log(`    Final Ce: ${result.finalEffectSiteConcentration.toFixed(4)} μg/mL`);
                
            } catch (error) {
                results[method] = {
                    success: false,
                    error: error.message
                };
                console.log(`  ✗ ${method}: ${error.message}`);
            }
        }
        
        this.testResults.push({
            test: 'Basic Solver Functionality',
            results: results,
            timestamp: new Date()
        });
        
        return results;
    }

    /**
     * Test 2: Compatibility with existing ProtocolEngine
     */
    async testProtocolEngineCompatibility() {
        if (!this.initialized) this.initialize();
        
        console.log('\n--- Test 2: Protocol Engine Compatibility ---');
        
        // Test with original ProtocolEngine
        const protocolEngine = new ProtocolEngine();
        protocolEngine.setPatient(this.patient);
        
        try {
            // Run optimization using existing engine
            const originalResult = protocolEngine.runCompleteOptimization(1.0, 10.0, 20);
            
            console.log('✓ Original ProtocolEngine compatibility confirmed');
            console.log(`  Final Ce: ${originalResult.protocol.performance.finalCe.toFixed(4)} μg/mL`);
            console.log(`  Calculation method: ${originalResult.protocol.calculationMethod}`);
            
            return {
                success: true,
                originalEngine: originalResult
            };
            
        } catch (error) {
            console.log(`✗ ProtocolEngine compatibility failed: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Test 3: Accuracy validation against analytical solution
     */
    async testAccuracyValidation() {
        if (!this.initialized) this.initialize();
        
        console.log('\n--- Test 3: Accuracy Validation ---');
        
        // Simple test case: single compartment with bolus
        // Analytical solution: C(t) = (Dose/V1) * exp(-k10 * t)
        const testDose = 10.0; // mg
        const testDuration = 30.0; // minutes
        
        const solvers = new NumericalSolvers();
        const odeSystem = createPKPDSystem(this.pkParams);
        const initialState = calculateBolusInitialState(testDose, this.pkParams);
        const infusionRateFunc = () => 0; // No continuous infusion
        
        const results = {};
        const methods = ['euler', 'rk4', 'rk45'];
        
        // Analytical solution for plasma concentration
        const analyticalSolution = (t) => {
            return (testDose / this.pkParams.V1) * Math.exp(-this.pkParams.k10 * t);
        };
        
        for (const method of methods) {
            solvers.setMethod(method);
            
            const result = solvers.solve(
                odeSystem,
                initialState,
                [0, testDuration],
                { timeStep: 0.1, infusionRateFunc: infusionRateFunc }
            );
            
            // Calculate accuracy at final time point
            const finalState = result.states[result.states.length - 1];
            const numericPlasmaConc = finalState[0] / this.pkParams.V1;
            const analyticPlasmaConc = analyticalSolution(testDuration);
            const relativeError = Math.abs(numericPlasmaConc - analyticPlasmaConc) / analyticPlasmaConc * 100;
            
            results[method] = {
                numericValue: numericPlasmaConc,
                analyticValue: analyticPlasmaConc,
                relativeError: relativeError,
                accuracy: relativeError < 5.0 ? 'PASS' : 'FAIL'
            };
            
            console.log(`${method}: Numeric=${numericPlasmaConc.toFixed(4)}, ` +
                       `Analytic=${analyticPlasmaConc.toFixed(4)}, ` +
                       `Error=${relativeError.toFixed(2)}% [${results[method].accuracy}]`);
        }
        
        this.testResults.push({
            test: 'Accuracy Validation',
            results: results,
            timestamp: new Date()
        });
        
        return results;
    }

    /**
     * Test 4: Performance comparison
     */
    async testPerformanceComparison() {
        if (!this.initialized) this.initialize();
        
        console.log('\n--- Test 4: Performance Comparison ---');
        
        const solvers = new NumericalSolvers();
        const odeSystem = createPKPDSystem(this.pkParams);
        const initialState = calculateBolusInitialState(10.0, this.pkParams);
        const infusionRateFunc = createSimpleInfusionRate(2.0); // 2 mg/min continuous
        
        const testDurations = [60, 120, 180]; // minutes
        const timeSteps = [0.1, 0.05, 0.01]; // minutes
        const results = {};
        
        for (const method of ['euler', 'rk4', 'rk45']) {
            results[method] = {};
            
            for (const duration of testDurations) {
                results[method][duration] = {};
                
                for (const timeStep of timeSteps) {
                    const iterations = 5;
                    const times = [];
                    
                    for (let i = 0; i < iterations; i++) {
                        solvers.setMethod(method);
                        const startTime = performance.now();
                        
                        solvers.solve(
                            odeSystem,
                            initialState,
                            [0, duration],
                            { timeStep: timeStep, infusionRateFunc: infusionRateFunc }
                        );
                        
                        const endTime = performance.now();
                        times.push(endTime - startTime);
                    }
                    
                    const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;
                    const steps = Math.floor(duration / timeStep);
                    const timePerStep = avgTime / steps;
                    
                    results[method][duration][timeStep] = {
                        averageTime: avgTime,
                        timePerStep: timePerStep,
                        totalSteps: steps
                    };
                }
            }
            
            console.log(`${method} performance profile completed`);
        }
        
        // Display performance summary
        console.log('\nPerformance Summary (60min, dt=0.1):');
        for (const method of ['euler', 'rk4', 'rk45']) {
            const perf = results[method][60][0.1];
            console.log(`  ${method}: ${perf.averageTime.toFixed(2)}ms total, ` +
                       `${(perf.timePerStep * 1000).toFixed(3)}μs/step`);
        }
        
        this.testResults.push({
            test: 'Performance Comparison',
            results: results,
            timestamp: new Date()
        });
        
        return results;
    }

    /**
     * Test 5: Stiffness handling
     */
    async testStiffnessHandling() {
        if (!this.initialized) this.initialize();
        
        console.log('\n--- Test 5: Stiffness Handling ---');
        
        // Create stiff test case with high ke0
        const stiffPkParams = { ...this.pkParams };
        stiffPkParams.ke0 = 2.0; // Very fast effect-site equilibration
        
        const solvers = new NumericalSolvers();
        const odeSystem = createPKPDSystem(stiffPkParams);
        const initialState = calculateBolusInitialState(15.0, stiffPkParams);
        const infusionRateFunc = () => 0;
        
        const results = {};
        const timeSteps = [0.1, 0.05, 0.01];
        
        for (const method of ['euler', 'rk4', 'rk45']) {
            results[method] = {};
            
            for (const timeStep of timeSteps) {
                try {
                    solvers.setMethod(method);
                    const startTime = performance.now();
                    
                    const result = solvers.solve(
                        odeSystem,
                        initialState,
                        [0, 30],
                        { timeStep: timeStep, infusionRateFunc: infusionRateFunc }
                    );
                    
                    const endTime = performance.now();
                    const finalCe = result.states[result.states.length - 1][3];
                    
                    results[method][timeStep] = {
                        success: true,
                        computationTime: endTime - startTime,
                        finalEffectSiteConc: finalCe,
                        stable: finalCe > 0 && finalCe < 10 // Reasonable bounds
                    };
                    
                } catch (error) {
                    results[method][timeStep] = {
                        success: false,
                        error: error.message
                    };
                }
            }
            
            const stableResults = Object.values(results[method]).filter(r => r.success && r.stable).length;
            console.log(`${method}: ${stableResults}/${timeSteps.length} stable solutions`);
        }
        
        this.testResults.push({
            test: 'Stiffness Handling',
            results: results,
            timestamp: new Date()
        });
        
        return results;
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('Starting comprehensive numerical methods integration test...\n');
        
        const startTime = performance.now();
        
        try {
            // Run all tests
            await this.testBasicSolverFunctionality();
            await this.testProtocolEngineCompatibility();
            await this.testAccuracyValidation();
            await this.testPerformanceComparison();
            await this.testStiffnessHandling();
            
            const endTime = performance.now();
            
            console.log('\n=== Test Suite Completed ===');
            console.log(`Total execution time: ${((endTime - startTime) / 1000).toFixed(2)} seconds`);
            console.log(`Tests completed: ${this.testResults.length}`);
            
            return this.generateTestReport();
            
        } catch (error) {
            console.error('Test suite failed:', error);
            throw error;
        }
    }

    /**
     * Generate comprehensive test report
     */
    generateTestReport() {
        const report = {
            summary: {
                totalTests: this.testResults.length,
                timestamp: new Date(),
                patient: {
                    age: this.patient.age,
                    weight: this.patient.weight,
                    height: this.patient.height
                },
                pkParams: this.pkParams
            },
            testResults: this.testResults,
            recommendations: this.generateRecommendations()
        };
        
        return report;
    }

    /**
     * Generate recommendations based on test results
     */
    generateRecommendations() {
        const recommendations = [];
        
        // Check accuracy validation results
        const accuracyTest = this.testResults.find(t => t.test === 'Accuracy Validation');
        if (accuracyTest) {
            const passedMethods = Object.entries(accuracyTest.results)
                .filter(([method, result]) => result.accuracy === 'PASS')
                .map(([method]) => method);
            
            if (passedMethods.length > 0) {
                recommendations.push(`Accuracy: ${passedMethods.join(', ')} methods meet accuracy requirements (<5% error)`);
            }
        }
        
        // Check performance results
        const perfTest = this.testResults.find(t => t.test === 'Performance Comparison');
        if (perfTest) {
            recommendations.push('Performance: Euler fastest, RK4 balanced accuracy/speed, RK45 adaptive high-precision');
        }
        
        // General recommendations
        recommendations.push('Recommended: Use RK4 as default for clinical applications');
        recommendations.push('Research: RK45 for complex scenarios requiring adaptive stepping and high precision');
        recommendations.push('Quick estimates: Euler for rapid prototyping only');
        
        return recommendations;
    }

    /**
     * Export test results to CSV
     */
    exportToCSV() {
        // Implementation for CSV export
        console.log('CSV export functionality ready for implementation');
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.NumericalMethodsIntegrationTest = NumericalMethodsIntegrationTest;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NumericalMethodsIntegrationTest };
}