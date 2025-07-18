/**
 * RK4 Effect-Site Concentration Validation Tests
 * Validates RK4 implementation against analytical solutions and Euler method
 */

class RK4ValidationTests {
    constructor() {
        this.testResults = [];
        this.tolerance = 1e-6;
    }

    /**
     * Test RK4 against analytical solution for constant plasma concentration
     */
    testConstantPlasmaConcentration() {
        console.log('=== Testing RK4 against analytical solution ===');
        
        // Test parameters
        const Cp = 2.0;      // Constant plasma concentration
        const Ce0 = 0.0;     // Initial effect-site concentration
        const ke0 = 0.456;   // Typical ke0 value
        const dt = 0.1;      // Time step
        const totalTime = 10.0;
        
        // Create test engine
        const engine = new ProtocolEngine();
        
        // Simulate RK4
        let currentCe = Ce0;
        const times = [];
        const rk4Results = [];
        const analyticalResults = [];
        
        for (let t = 0; t <= totalTime; t += dt) {
            times.push(t);
            
            // Analytical solution: Ce(t) = Cp * (1 - exp(-ke0 * t))
            const analyticalCe = Cp * (1 - Math.exp(-ke0 * t));
            analyticalResults.push(analyticalCe);
            
            // RK4 solution
            if (t > 0) {
                currentCe = engine.updateEffectSiteConcentrationRK4(Cp, currentCe, ke0, dt);
            }
            rk4Results.push(currentCe);
        }
        
        // Calculate errors
        let maxError = 0;
        let avgError = 0;
        
        for (let i = 0; i < times.length; i++) {
            const error = Math.abs(rk4Results[i] - analyticalResults[i]);
            maxError = Math.max(maxError, error);
            avgError += error;
        }
        avgError /= times.length;
        
        const testResult = {
            testName: 'Constant Plasma Concentration',
            maxError: maxError,
            avgError: avgError,
            tolerance: this.tolerance,
            passed: maxError < this.tolerance
        };
        
        this.testResults.push(testResult);
        
        console.log(`Max error: ${maxError.toExponential(3)}`);
        console.log(`Avg error: ${avgError.toExponential(3)}`);
        console.log(`Test passed: ${testResult.passed}`);
        
        return testResult;
    }

    /**
     * Test RK4 convergence with different time steps
     */
    testConvergence() {
        console.log('=== Testing RK4 convergence ===');
        
        const Cp = 1.5;
        const Ce0 = 0.0;
        const ke0 = 0.456;
        const totalTime = 5.0;
        
        const timeSteps = [0.1, 0.05, 0.025, 0.0125];
        const finalCeValues = [];
        
        const engine = new ProtocolEngine();
        
        for (const dt of timeSteps) {
            let currentCe = Ce0;
            
            for (let t = dt; t <= totalTime; t += dt) {
                currentCe = engine.updateEffectSiteConcentrationRK4(Cp, currentCe, ke0, dt);
            }
            
            finalCeValues.push(currentCe);
        }
        
        // Calculate convergence rate
        const convergenceRates = [];
        for (let i = 1; i < finalCeValues.length; i++) {
            const error1 = Math.abs(finalCeValues[i-1] - finalCeValues[finalCeValues.length-1]);
            const error2 = Math.abs(finalCeValues[i] - finalCeValues[finalCeValues.length-1]);
            const ratio = error1 / error2;
            convergenceRates.push(ratio);
        }
        
        // For RK4, we expect convergence rate ~16 (2^4)
        const expectedRate = 16;
        const rateError = Math.abs(convergenceRates[0] - expectedRate) / expectedRate;
        
        const testResult = {
            testName: 'Convergence Rate',
            convergenceRates: convergenceRates,
            expectedRate: expectedRate,
            rateError: rateError,
            passed: rateError < 0.5 // Allow 50% tolerance
        };
        
        this.testResults.push(testResult);
        
        console.log(`Convergence rates: ${convergenceRates.map(r => r.toFixed(2)).join(', ')}`);
        console.log(`Expected rate: ${expectedRate}`);
        console.log(`Test passed: ${testResult.passed}`);
        
        return testResult;
    }

    /**
     * Test RK4 vs Euler method accuracy
     */
    testVsEulerMethod() {
        console.log('=== Testing RK4 vs Euler method ===');
        
        const Cp = 2.0;
        const Ce0 = 0.0;
        const ke0 = 0.456;
        const dt = 0.1;
        const totalTime = 10.0;
        
        const engine = new ProtocolEngine();
        
        // RK4 simulation
        let rk4Ce = Ce0;
        const rk4Results = [rk4Ce];
        
        // Euler simulation
        let eulerCe = Ce0;
        const eulerResults = [eulerCe];
        
        // Analytical solution
        const analyticalResults = [Ce0];
        
        for (let t = dt; t <= totalTime; t += dt) {
            // RK4
            rk4Ce = engine.updateEffectSiteConcentrationRK4(Cp, rk4Ce, ke0, dt);
            rk4Results.push(rk4Ce);
            
            // Euler
            const dCedt = ke0 * (Cp - eulerCe);
            eulerCe = eulerCe + dt * dCedt;
            eulerResults.push(eulerCe);
            
            // Analytical
            const analyticalCe = Cp * (1 - Math.exp(-ke0 * t));
            analyticalResults.push(analyticalCe);
        }
        
        // Calculate errors
        let rk4MaxError = 0;
        let eulerMaxError = 0;
        
        for (let i = 0; i < analyticalResults.length; i++) {
            const rk4Error = Math.abs(rk4Results[i] - analyticalResults[i]);
            const eulerError = Math.abs(eulerResults[i] - analyticalResults[i]);
            
            rk4MaxError = Math.max(rk4MaxError, rk4Error);
            eulerMaxError = Math.max(eulerMaxError, eulerError);
        }
        
        const improvementRatio = eulerMaxError / rk4MaxError;
        
        const testResult = {
            testName: 'RK4 vs Euler Accuracy',
            rk4MaxError: rk4MaxError,
            eulerMaxError: eulerMaxError,
            improvementRatio: improvementRatio,
            passed: improvementRatio > 10 // RK4 should be at least 10x more accurate
        };
        
        this.testResults.push(testResult);
        
        console.log(`RK4 max error: ${rk4MaxError.toExponential(3)}`);
        console.log(`Euler max error: ${eulerMaxError.toExponential(3)}`);
        console.log(`Improvement ratio: ${improvementRatio.toFixed(1)}x`);
        console.log(`Test passed: ${testResult.passed}`);
        
        return testResult;
    }

    /**
     * Test boundary conditions
     */
    testBoundaryConditions() {
        console.log('=== Testing boundary conditions ===');
        
        const engine = new ProtocolEngine();
        const ke0 = 0.456;
        const dt = 0.1;
        
        // Test 1: Zero plasma concentration
        const ce1 = engine.updateEffectSiteConcentrationRK4(0, 1.0, ke0, dt);
        const test1Passed = ce1 >= 0 && ce1 < 1.0;
        
        // Test 2: Zero effect-site concentration
        const ce2 = engine.updateEffectSiteConcentrationRK4(1.0, 0, ke0, dt);
        const test2Passed = ce2 > 0 && ce2 <= 1.0;
        
        // Test 3: Equal concentrations
        const ce3 = engine.updateEffectSiteConcentrationRK4(1.0, 1.0, ke0, dt);
        const test3Passed = Math.abs(ce3 - 1.0) < 1e-10;
        
        // Test 4: Negative input handling
        const ce4 = engine.updateEffectSiteConcentrationRK4(-1.0, 0.5, ke0, dt);
        const test4Passed = ce4 >= 0;
        
        const testResult = {
            testName: 'Boundary Conditions',
            test1Passed: test1Passed,
            test2Passed: test2Passed,
            test3Passed: test3Passed,
            test4Passed: test4Passed,
            passed: test1Passed && test2Passed && test3Passed && test4Passed
        };
        
        this.testResults.push(testResult);
        
        console.log(`Zero Cp test: ${test1Passed}`);
        console.log(`Zero Ce test: ${test2Passed}`);
        console.log(`Equal Cp=Ce test: ${test3Passed}`);
        console.log(`Negative input test: ${test4Passed}`);
        console.log(`All boundary tests passed: ${testResult.passed}`);
        
        return testResult;
    }

    /**
     * Run all validation tests
     */
    runAllTests() {
        console.log('===============================================');
        console.log('         RK4 VALIDATION TEST SUITE          ');
        console.log('===============================================');
        
        this.testResults = [];
        
        // Run all tests
        this.testConstantPlasmaConcentration();
        console.log('');
        this.testConvergence();
        console.log('');
        this.testVsEulerMethod();
        console.log('');
        this.testBoundaryConditions();
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
            console.log('✅ ALL TESTS PASSED - RK4 implementation is valid');
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
    window.RK4ValidationTests = RK4ValidationTests;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RK4ValidationTests };
}