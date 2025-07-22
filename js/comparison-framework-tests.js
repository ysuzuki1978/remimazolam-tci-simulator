/**
 * Comparison Framework Tests
 * Tests for the calculation method comparison functionality
 */

class ComparisonFrameworkTests {
    constructor() {
        this.testResults = [];
        this.testPatient = {
            id: 'test-patient-comparison',
            age: 45,
            weight: 75,
            height: 175,
            sex: 1,
            asaPS: 1
        };
    }

    /**
     * Test CalculationComparator initialization
     */
    testCalculationComparatorInitialization() {
        console.log('=== Testing CalculationComparator Initialization ===');
        
        try {
            const comparator = new CalculationComparator();
            const availableMethods = comparator.getAvailableMethods();
            
            const testResult = {
                testName: 'CalculationComparator Initialization',
                passed: availableMethods.length > 0 && 
                       availableMethods.some(m => m.key === 'rk4_standard') &&
                       availableMethods.some(m => m.key === 'rk4_fine') &&
                       availableMethods.some(m => m.key === 'adaptive_rk4'),
                details: {
                    availableMethodsCount: availableMethods.length,
                    methods: availableMethods.map(m => m.key)
                }
            };
            
            this.testResults.push(testResult);
            
            console.log(`✅ Available methods: ${availableMethods.length}`);
            console.log(`Methods: ${availableMethods.map(m => m.key).join(', ')}`);
            console.log(`Test passed: ${testResult.passed}`);
            
            return testResult;
            
        } catch (error) {
            const testResult = {
                testName: 'CalculationComparator Initialization',
                passed: false,
                error: error.message
            };
            
            this.testResults.push(testResult);
            console.error('❌ Initialization test failed:', error);
            return testResult;
        }
    }

    /**
     * Test comparison execution
     */
    async testComparisonExecution() {
        console.log('=== Testing Comparison Execution ===');
        
        try {
            const comparator = new CalculationComparator();
            
            const protocol = {
                bolusDose: 10,
                continuousRate: 2.0,
                targetCe: 1.0,
                simulationDuration: 60
            };
            
            const methodsToTest = ['rk4_standard', 'rk4_fine'];
            
            // Mock patient with required PK parameters
            const mockPatient = {
                ...this.testPatient,
                weight: 70 // Ensure consistent weight for PK calculations
            };
            
            const results = await comparator.runComparison(
                mockPatient,
                protocol,
                methodsToTest
            );
            
            const testResult = {
                testName: 'Comparison Execution',
                passed: results.size === methodsToTest.length,
                details: {
                    expectedMethods: methodsToTest.length,
                    actualResults: results.size,
                    resultKeys: Array.from(results.keys()),
                    hasErrors: Array.from(results.values()).some(r => r.error)
                }
            };
            
            this.testResults.push(testResult);
            
            console.log(`✅ Comparison executed for ${results.size} methods`);
            console.log(`Results: ${Array.from(results.keys()).join(', ')}`);
            console.log(`Test passed: ${testResult.passed}`);
            
            return testResult;
            
        } catch (error) {
            const testResult = {
                testName: 'Comparison Execution',
                passed: false,
                error: error.message
            };
            
            this.testResults.push(testResult);
            console.error('❌ Comparison execution test failed:', error);
            return testResult;
        }
    }

    /**
     * Test CSV export functionality
     */
    testCsvExport() {
        console.log('=== Testing CSV Export ===');
        
        try {
            const comparator = new CalculationComparator();
            
            // Mock some results for CSV generation
            const mockResults = new Map();
            mockResults.set('rk4_standard', {
                methodKey: 'rk4_standard',
                methodName: 'RK4 Standard',
                methodDescription: 'Fourth-order Runge-Kutta with fixed 0.1min time step',
                result: {
                    timeSeriesData: [
                        { time: 0, ce: 0.0, plasma: 0.0, infusionRate: 2.0, adaptiveStep: 0.1 },
                        { time: 0.1, ce: 0.1, plasma: 0.2, infusionRate: 2.0, adaptiveStep: 0.1 },
                        { time: 0.2, ce: 0.2, plasma: 0.3, infusionRate: 2.0, adaptiveStep: 0.1 }
                    ],
                    executionTime: 15.5,
                    memoryUsage: 1024,
                    dosageAdjustments: []
                }
            });
            
            // Set mock results
            comparator.results = mockResults;
            
            // Test comparison CSV generation
            const comparisonCsv = comparator.generateComparisonCSV();
            const csvHasHeaders = comparisonCsv.includes('Time(min)') && 
                                 comparisonCsv.includes('Method') && 
                                 comparisonCsv.includes('PlasmaConc(μg/mL)');
            
            // Test metrics CSV generation
            comparator.calculateComparisonMetrics();
            const metricsCsv = comparator.generateMetricsCSV();
            const metricsHasHeaders = metricsCsv.includes('Execution Time') && 
                                    metricsCsv.includes('Memory Usage');
            
            const testResult = {
                testName: 'CSV Export',
                passed: csvHasHeaders && metricsHasHeaders,
                details: {
                    comparisonCsvLength: comparisonCsv.length,
                    metricsCsvLength: metricsCsv.length,
                    hasComparisonHeaders: csvHasHeaders,
                    hasMetricsHeaders: metricsHasHeaders
                }
            };
            
            this.testResults.push(testResult);
            
            console.log(`✅ Comparison CSV generated (${comparisonCsv.length} chars)`);
            console.log(`✅ Metrics CSV generated (${metricsCsv.length} chars)`);
            console.log(`Test passed: ${testResult.passed}`);
            
            return testResult;
            
        } catch (error) {
            const testResult = {
                testName: 'CSV Export',
                passed: false,
                error: error.message
            };
            
            this.testResults.push(testResult);
            console.error('❌ CSV export test failed:', error);
            return testResult;
        }
    }

    /**
     * Test metrics calculation
     */
    testMetricsCalculation() {
        console.log('=== Testing Metrics Calculation ===');
        
        try {
            const comparator = new CalculationComparator();
            
            // Mock comparison results
            const mockResults = new Map();
            mockResults.set('rk4_standard', {
                methodKey: 'rk4_standard',
                methodName: 'RK4 Standard',
                result: {
                    timeSeriesData: [
                        { time: 0, ce: 0.0, plasma: 0.0 },
                        { time: 30, ce: 0.8, plasma: 1.0 },
                        { time: 60, ce: 1.0, plasma: 1.2 },
                        { time: 120, ce: 0.5, plasma: 0.6 }
                    ],
                    executionTime: 25.5,
                    memoryUsage: 2048,
                    dosageAdjustments: [
                        { time: 30, type: 'adjustment' }
                    ]
                }
            });
            
            // Set mock results and calculate metrics
            comparator.results = mockResults;
            comparator.calculateComparisonMetrics();
            
            const metrics = comparator.getMetrics();
            const hasMetrics = metrics.length > 0;
            const hasRequiredFields = metrics.every(m => 
                m.hasOwnProperty('executionTime') &&
                m.hasOwnProperty('memoryUsage') &&
                m.hasOwnProperty('maxEffectSiteConc') &&
                m.hasOwnProperty('finalEffectSiteConc')
            );
            
            const testResult = {
                testName: 'Metrics Calculation',
                passed: hasMetrics && hasRequiredFields,
                details: {
                    metricsCount: metrics.length,
                    hasRequiredFields: hasRequiredFields,
                    sampleMetric: metrics.length > 0 ? metrics[0] : null
                }
            };
            
            this.testResults.push(testResult);
            
            console.log(`✅ Metrics calculated for ${metrics.length} methods`);
            console.log(`Test passed: ${testResult.passed}`);
            
            return testResult;
            
        } catch (error) {
            const testResult = {
                testName: 'Metrics Calculation',
                passed: false,
                error: error.message
            };
            
            this.testResults.push(testResult);
            console.error('❌ Metrics calculation test failed:', error);
            return testResult;
        }
    }

    /**
     * Test accuracy comparison
     */
    testAccuracyComparison() {
        console.log('=== Testing Accuracy Comparison ===');
        
        try {
            const comparator = new CalculationComparator();
            
            // Mock results for accuracy comparison
            const fixedResult = {
                timeSeriesData: [
                    { time: 0, ce: 0.0 },
                    { time: 10, ce: 0.5 },
                    { time: 20, ce: 0.8 },
                    { time: 30, ce: 1.0 }
                ]
            };
            
            const adaptiveResult = {
                timeSeriesData: [
                    { time: 0, ce: 0.0 },
                    { time: 10, ce: 0.51 },
                    { time: 20, ce: 0.79 },
                    { time: 30, ce: 1.01 }
                ]
            };
            
            const accuracyMetrics = comparator.calculateAccuracyMetrics(adaptiveResult, fixedResult);
            
            const hasAccuracyMetrics = accuracyMetrics.hasOwnProperty('rmse') &&
                                     accuracyMetrics.hasOwnProperty('maxError') &&
                                     accuracyMetrics.hasOwnProperty('relativeError');
            
            const testResult = {
                testName: 'Accuracy Comparison',
                passed: hasAccuracyMetrics && accuracyMetrics.rmse >= 0,
                details: {
                    hasAccuracyMetrics: hasAccuracyMetrics,
                    rmse: accuracyMetrics.rmse,
                    maxError: accuracyMetrics.maxError,
                    relativeError: accuracyMetrics.relativeError
                }
            };
            
            this.testResults.push(testResult);
            
            console.log(`✅ Accuracy metrics: RMSE=${accuracyMetrics.rmse.toFixed(6)}, Max Error=${accuracyMetrics.maxError.toFixed(6)}`);
            console.log(`Test passed: ${testResult.passed}`);
            
            return testResult;
            
        } catch (error) {
            const testResult = {
                testName: 'Accuracy Comparison',
                passed: false,
                error: error.message
            };
            
            this.testResults.push(testResult);
            console.error('❌ Accuracy comparison test failed:', error);
            return testResult;
        }
    }

    /**
     * Run all comparison framework tests
     */
    async runAllTests() {
        console.log('===============================================');
        console.log('      COMPARISON FRAMEWORK TEST SUITE        ');
        console.log('===============================================');
        
        this.testResults = [];
        
        // Run all tests
        this.testCalculationComparatorInitialization();
        console.log('');
        await this.testComparisonExecution();
        console.log('');
        this.testCsvExport();
        console.log('');
        this.testMetricsCalculation();
        console.log('');
        this.testAccuracyComparison();
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
            console.log('✅ ALL TESTS PASSED - Comparison framework is working correctly');
        } else {
            console.log('❌ SOME TESTS FAILED - Please review implementation');
            
            // Show failed tests
            const failedTests = this.testResults.filter(r => !r.passed);
            failedTests.forEach(test => {
                console.log(`   - ${test.testName}: ${test.error || 'Unknown error'}`);
            });
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
    window.ComparisonFrameworkTests = ComparisonFrameworkTests;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ComparisonFrameworkTests };
}