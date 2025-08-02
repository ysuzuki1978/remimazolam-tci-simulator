/**
 * Test different transformations for Masui Ke0 regression model
 * Testing hypothesis that this is a log-linear model
 */

function testKe0Transformations() {
    console.log('=== Testing Ke0 Regression Transformations ===\n');
    
    // Test cases from debug analysis
    const testCases = [
        {
            description: "Standard patient (50y, 70kg, 170cm, male, ASA I-II)",
            age: 50, TBW: 70, height: 170, sex: 0, ASAPS: 0,
            regression_result: -7.934186,
            numerical_ke0: 0.22065,
            expected_ke0: 0.191
        },
        {
            description: "Masui paper reference (40y, 60kg, 160cm, male, ASA I-II)",
            age: 40, TBW: 60, height: 160, sex: 0, ASAPS: 0,
            regression_result: -7.942887,
            numerical_ke0: 0.22065, // Estimate
            expected_ke0: 0.191
        }
    ];
    
    testCases.forEach((testCase, index) => {
        console.log(`Test Case ${index + 1}: ${testCase.description}`);
        console.log(`Regression result: ${testCase.regression_result.toFixed(6)}`);
        console.log(`Numerical ke0: ${testCase.numerical_ke0.toFixed(6)}`);
        console.log(`Expected ke0: ${testCase.expected_ke0.toFixed(6)}`);
        console.log('');
        
        // Test different transformations
        const transformations = {
            'Direct (current)': testCase.regression_result,
            'Exponential': Math.exp(testCase.regression_result),
            'Exponential + offset': Math.exp(testCase.regression_result + 10),
            'Exponential + 15.4': Math.exp(testCase.regression_result + 15.4),
            'Exponential + 16': Math.exp(testCase.regression_result + 16),
            'Negative exponential': Math.exp(-testCase.regression_result),
            'Inverse': 1 / Math.abs(testCase.regression_result),
            'Square root of abs': Math.sqrt(Math.abs(testCase.regression_result)),
            'Add constant (+9.25)': testCase.regression_result + 9.25,
            'Sign flip + offset': -testCase.regression_result - 7.7,
            'Log transform attempt': Math.log(Math.abs(testCase.regression_result) / 40)
        };
        
        console.log('Transformation attempts:');
        Object.entries(transformations).forEach(([name, result]) => {
            const error = Math.abs(result - testCase.expected_ke0);
            const error_percent = (error / testCase.expected_ke0) * 100;
            
            const status = error_percent < 10 ? '✅' : error_percent < 50 ? '⚠️' : '❌';
            console.log(`  ${status} ${name}: ${result.toFixed(6)} (error: ${error_percent.toFixed(1)}%)`);
        });
        
        console.log('\n' + '-'.repeat(60) + '\n');
    });
    
    // Additional investigation: Check if there's a pattern in the literature
    console.log('=== Literature Analysis ===');
    console.log('From Masui & Hagihira 2022 paper:');
    console.log('- Model predicts ke0 in min⁻¹ units');
    console.log('- Expected range: 0.15-0.26 min⁻¹');
    console.log('- Our numerical result: 0.22065 min⁻¹ (within range ✅)');
    console.log('- Regression result: -7.93 (clearly wrong ❌)');
    console.log('');
    console.log('Hypothesis: The regression model is likely:');
    console.log('1. Log-linear: ln(ke0) = regression_result');
    console.log('2. Missing a scaling constant');
    console.log('3. Has a sign error in the constant term');
    console.log('');
    
    // Test the most promising transformation
    const best_transformation = (regression_result) => Math.exp(regression_result + 15.4);
    
    console.log('Testing best transformation: exp(regression_result + 15.4)');
    testCases.forEach((testCase, index) => {
        const transformed = best_transformation(testCase.regression_result);
        const error = Math.abs(transformed - testCase.expected_ke0);
        const error_percent = (error / testCase.expected_ke0) * 100;
        console.log(`Case ${index + 1}: ${transformed.toFixed(6)} (error: ${error_percent.toFixed(1)}%)`);
    });
}

// Run the analysis
testKe0Transformations();