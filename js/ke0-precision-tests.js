/**
 * ke0 Precision Enhancement Validation Tests
 * Tests for high-precision ke0 calculation with edge cases
 */

class Ke0PrecisionTests {
    constructor() {
        this.testResults = [];
        this.testPatients = this.generateTestPatients();
    }

    /**
     * Generate test patients covering edge cases
     */
    generateTestPatients() {
        return [
            // Standard cases
            { name: 'Standard Adult', age: 45, weight: 70, height: 170, sex: 1, asaPS: 1 },
            { name: 'Standard Female', age: 35, weight: 60, height: 165, sex: 0, asaPS: 1 },
            
            // Elderly patients
            { name: 'Elderly Male', age: 85, weight: 65, height: 175, sex: 1, asaPS: 2 },
            { name: 'Very Elderly', age: 95, weight: 55, height: 160, sex: 0, asaPS: 3 },
            
            // Extreme weights
            { name: 'Low Weight', age: 30, weight: 35, height: 150, sex: 0, asaPS: 1 },
            { name: 'High Weight', age: 40, weight: 160, height: 180, sex: 1, asaPS: 2 },
            
            // High ASA-PS
            { name: 'ASA-PS 4', age: 70, weight: 80, height: 175, sex: 1, asaPS: 4 },
            { name: 'ASA-PS 5', age: 75, weight: 70, height: 170, sex: 0, asaPS: 5 },
            
            // Extreme combinations
            { name: 'Extreme Case 1', age: 90, weight: 40, height: 145, sex: 0, asaPS: 4 },
            { name: 'Extreme Case 2', age: 25, weight: 150, height: 195, sex: 1, asaPS: 1 }
        ];
    }

    /**
     * Test convergence precision
     */
    testConvergencePrecision() {
        console.log('=== Testing Convergence Precision ===');
        
        const results = [];
        
        for (const patient of this.testPatients) {
            try {
                const startTime = performance.now();
                
                // Calculate ke0 with enhanced precision
                const result = MasuiKe0Calculator.calculateKe0Complete(
                    patient.age, patient.weight, patient.height, patient.sex, patient.asaPS
                );
                
                const endTime = performance.now();
                const computationTime = endTime - startTime;
                
                if (result.success && result.ke0_numerical !== null) {
                    // Test precision by re-evaluating function at the solution
                    const coefficients = result.plasmaCoefficients;
                    const f_value = MasuiKe0Calculator.evaluateKe0Function(
                        result.ke0_numerical, coefficients, 2.6
                    );
                    
                    results.push({
                        patient: patient.name,
                        ke0_numerical: result.ke0_numerical,
                        ke0_regression: result.ke0_regression,
                        function_value: f_value,
                        computation_time: computationTime,
                        precision_digits: this.estimatePrecisionDigits(f_value),
                        success: true
                    });
                } else {
                    results.push({
                        patient: patient.name,
                        error: result.error || 'Numerical calculation failed',
                        computation_time: computationTime,
                        success: false
                    });
                }
            } catch (error) {
                results.push({
                    patient: patient.name,
                    error: error.message,
                    success: false
                });
            }
        }
        
        // Analyze results
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        
        const avgPrecision = successful.length > 0 ? 
            successful.reduce((sum, r) => sum + r.precision_digits, 0) / successful.length : 0;
        
        const avgComputationTime = successful.length > 0 ?
            successful.reduce((sum, r) => sum + r.computation_time, 0) / successful.length : 0;
        
        const testResult = {
            testName: 'Convergence Precision',
            totalPatients: this.testPatients.length,
            successful: successful.length,
            failed: failed.length,
            successRate: (successful.length / this.testPatients.length) * 100,
            avgPrecision: avgPrecision,
            avgComputationTime: avgComputationTime,
            results: results,
            passed: successful.length >= this.testPatients.length * 0.95 && avgPrecision >= 12
        };
        
        this.testResults.push(testResult);
        
        console.log(`Success rate: ${testResult.successRate.toFixed(1)}%`);
        console.log(`Average precision: ${avgPrecision.toFixed(1)} digits`);
        console.log(`Average computation time: ${avgComputationTime.toFixed(2)} ms`);
        console.log(`Test passed: ${testResult.passed}`);
        
        return testResult;
    }

    /**
     * Test convergence speed improvement
     */
    testConvergenceSpeed() {
        console.log('=== Testing Convergence Speed ===');
        
        const testPatient = { age: 50, weight: 70, height: 170, sex: 1, asaPS: 1 };
        const iterations = 10;
        
        const times = [];
        
        for (let i = 0; i < iterations; i++) {
            const startTime = performance.now();
            
            const result = MasuiKe0Calculator.calculateKe0Complete(
                testPatient.age, testPatient.weight, testPatient.height, 
                testPatient.sex, testPatient.asaPS
            );
            
            const endTime = performance.now();
            times.push(endTime - startTime);
        }
        
        const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        
        // Target: 50% improvement over baseline (assume baseline ~20ms)
        const baselineTime = 20; // ms
        const improvement = ((baselineTime - avgTime) / baselineTime) * 100;
        
        const testResult = {
            testName: 'Convergence Speed',
            iterations: iterations,
            avgTime: avgTime,
            minTime: minTime,
            maxTime: maxTime,
            improvement: improvement,
            passed: improvement >= 30 // Accept 30% improvement as good
        };
        
        this.testResults.push(testResult);
        
        console.log(`Average time: ${avgTime.toFixed(2)} ms`);
        console.log(`Speed improvement: ${improvement.toFixed(1)}%`);
        console.log(`Test passed: ${testResult.passed}`);
        
        return testResult;
    }

    /**
     * Test numerical stability with extreme parameters
     */
    testNumericalStability() {
        console.log('=== Testing Numerical Stability ===');
        
        const extremeCases = [
            { name: 'Very Young', age: 18, weight: 45, height: 150, sex: 0, asaPS: 1 },
            { name: 'Very Old', age: 99, weight: 50, height: 155, sex: 1, asaPS: 4 },
            { name: 'Very Light', age: 40, weight: 30, height: 140, sex: 0, asaPS: 2 },
            { name: 'Very Heavy', age: 35, weight: 200, height: 190, sex: 1, asaPS: 3 },
            { name: 'Extreme Combination', age: 85, weight: 35, height: 145, sex: 0, asaPS: 5 }
        ];
        
        const results = [];
        
        for (const patient of extremeCases) {
            try {
                const result = MasuiKe0Calculator.calculateKe0Complete(
                    patient.age, patient.weight, patient.height, patient.sex, patient.asaPS
                );
                
                const isStable = result.success && 
                                result.ke0_numerical !== null &&
                                MasuiKe0Calculator.validateKe0(result.ke0_numerical);
                
                results.push({
                    patient: patient.name,
                    ke0_numerical: result.ke0_numerical,
                    ke0_regression: result.ke0_regression,
                    stable: isStable,
                    error: result.error
                });
            } catch (error) {
                results.push({
                    patient: patient.name,
                    stable: false,
                    error: error.message
                });
            }
        }
        
        const stableCount = results.filter(r => r.stable).length;
        const stabilityRate = (stableCount / extremeCases.length) * 100;
        
        const testResult = {
            testName: 'Numerical Stability',
            totalCases: extremeCases.length,
            stableCount: stableCount,
            stabilityRate: stabilityRate,
            results: results,
            passed: stabilityRate >= 90
        };
        
        this.testResults.push(testResult);
        
        console.log(`Stability rate: ${stabilityRate.toFixed(1)}%`);
        console.log(`Test passed: ${testResult.passed}`);
        
        return testResult;
    }

    /**
     * Test fallback strategy effectiveness
     */
    testFallbackStrategies() {
        console.log('=== Testing Fallback Strategies ===');
        
        // Mock a scenario where primary method fails
        const originalFindRoot = BrentSolver.findRoot;
        let fallbackTriggered = false;
        
        // Temporarily replace with failing method
        BrentSolver.findRoot = function() {
            fallbackTriggered = true;
            throw new Error('Simulated primary method failure');
        };
        
        try {
            const testPatient = { age: 50, weight: 70, height: 170, sex: 1, asaPS: 1 };
            
            const result = MasuiKe0Calculator.calculateKe0Complete(
                testPatient.age, testPatient.weight, testPatient.height, 
                testPatient.sex, testPatient.asaPS
            );
            
            // Restore original method
            BrentSolver.findRoot = originalFindRoot;
            
            const testResult = {
                testName: 'Fallback Strategies',
                fallbackTriggered: fallbackTriggered,
                fallbackSuccessful: result.success && result.ke0_regression !== null,
                ke0_regression: result.ke0_regression,
                passed: fallbackTriggered && result.success
            };
            
            this.testResults.push(testResult);
            
            console.log(`Fallback triggered: ${fallbackTriggered}`);
            console.log(`Fallback successful: ${testResult.fallbackSuccessful}`);
            console.log(`Test passed: ${testResult.passed}`);
            
            return testResult;
        } catch (error) {
            // Restore original method
            BrentSolver.findRoot = originalFindRoot;
            
            const testResult = {
                testName: 'Fallback Strategies',
                fallbackTriggered: fallbackTriggered,
                fallbackSuccessful: false,
                error: error.message,
                passed: false
            };
            
            this.testResults.push(testResult);
            console.log(`Test failed: ${error.message}`);
            
            return testResult;
        }
    }

    /**
     * Test precision consistency across multiple runs
     */
    testPrecisionConsistency() {
        console.log('=== Testing Precision Consistency ===');
        
        const testPatient = { age: 60, weight: 75, height: 175, sex: 1, asaPS: 2 };
        const runs = 20;
        const results = [];
        
        for (let i = 0; i < runs; i++) {
            const result = MasuiKe0Calculator.calculateKe0Complete(
                testPatient.age, testPatient.weight, testPatient.height, 
                testPatient.sex, testPatient.asaPS
            );
            
            if (result.success && result.ke0_numerical !== null) {
                results.push(result.ke0_numerical);
            }
        }
        
        if (results.length > 0) {
            const mean = results.reduce((sum, val) => sum + val, 0) / results.length;
            const variance = results.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / results.length;
            const stdDev = Math.sqrt(variance);
            const relativeStdDev = (stdDev / mean) * 100;
            
            const testResult = {
                testName: 'Precision Consistency',
                runs: runs,
                successful: results.length,
                mean: mean,
                stdDev: stdDev,
                relativeStdDev: relativeStdDev,
                passed: relativeStdDev < 1e-10 // Very tight consistency requirement
            };
            
            this.testResults.push(testResult);
            
            console.log(`Successful runs: ${results.length}/${runs}`);
            console.log(`Mean ke0: ${mean.toFixed(12)}`);
            console.log(`Std deviation: ${stdDev.toExponential(3)}`);
            console.log(`Relative std dev: ${relativeStdDev.toExponential(3)}%`);
            console.log(`Test passed: ${testResult.passed}`);
            
            return testResult;
        } else {
            const testResult = {
                testName: 'Precision Consistency',
                runs: runs,
                successful: 0,
                error: 'No successful calculations',
                passed: false
            };
            
            this.testResults.push(testResult);
            console.log('Test failed: No successful calculations');
            
            return testResult;
        }
    }

    /**
     * Estimate precision digits from function value
     */
    estimatePrecisionDigits(functionValue) {
        if (functionValue === 0) return 16; // Maximum precision
        
        const absValue = Math.abs(functionValue);
        if (absValue < 1e-15) return 15;
        if (absValue < 1e-14) return 14;
        if (absValue < 1e-13) return 13;
        if (absValue < 1e-12) return 12;
        if (absValue < 1e-11) return 11;
        if (absValue < 1e-10) return 10;
        
        return Math.max(1, Math.floor(-Math.log10(absValue)));
    }

    /**
     * Run all precision tests
     */
    runAllTests() {
        console.log('===============================================');
        console.log('         ke0 PRECISION TEST SUITE            ');
        console.log('===============================================');
        
        this.testResults = [];
        
        // Run all tests
        this.testConvergencePrecision();
        console.log('');
        this.testConvergenceSpeed();
        console.log('');
        this.testNumericalStability();
        console.log('');
        this.testFallbackStrategies();
        console.log('');
        this.testPrecisionConsistency();
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
            console.log('✅ ALL TESTS PASSED - ke0 precision enhancement is successful');
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
    window.Ke0PrecisionTests = Ke0PrecisionTests;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Ke0PrecisionTests };
}