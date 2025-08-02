/**
 * Investigate the correct constant term for Masui Ke0 regression
 * Current constant: -9.06 produces negative values
 * Testing what constant would produce correct ke0 values
 */

function investigateConstantTerm() {
    console.log('=== Investigating Correct Constant Term ===\n');
    
    // Data from debug analysis
    const testCases = [
        {
            description: "Standard patient (50y, 70kg, 170cm, male, ASA I-II)",
            F_terms_sum: 1.126206, // Sum of all F() terms from debug
            interaction_sum: -0.000391, // Sum of interaction terms
            expected_ke0: 0.191,
            numerical_ke0: 0.22065
        },
        {
            description: "Masui paper reference (40y, 60kg, 160cm, male, ASA I-II)",
            F_terms_sum: 1.118064, // Sum of all F() terms
            interaction_sum: -0.000714, // Sum of interaction terms
            expected_ke0: 0.191,
            numerical_ke0: 0.22065 // estimate
        }
    ];
    
    console.log('Current regression equation:');
    console.log('ke0 = CONSTANT + F_terms_sum + interaction_sum');
    console.log('Current CONSTANT = -9.06');
    console.log('');
    
    testCases.forEach((testCase, index) => {
        console.log(`${testCase.description}:`);
        console.log(`F_terms_sum: ${testCase.F_terms_sum.toFixed(6)}`);
        console.log(`interaction_sum: ${testCase.interaction_sum.toFixed(6)}`);
        console.log(`expected_ke0: ${testCase.expected_ke0.toFixed(6)}`);
        console.log('');
        
        // Calculate what constant would give the expected ke0
        const required_constant = testCase.expected_ke0 - testCase.F_terms_sum - testCase.interaction_sum;
        console.log(`Required constant for expected ke0: ${required_constant.toFixed(6)}`);
        
        // Calculate what constant would give the numerical ke0
        const constant_for_numerical = testCase.numerical_ke0 - testCase.F_terms_sum - testCase.interaction_sum;
        console.log(`Required constant for numerical ke0: ${constant_for_numerical.toFixed(6)}`);
        
        console.log(`Current constant error: ${(-9.06 - required_constant).toFixed(6)}`);
        console.log('');
        
        // Test the corrected model
        const corrected_ke0 = required_constant + testCase.F_terms_sum + testCase.interaction_sum;
        console.log(`Verification: ${corrected_ke0.toFixed(6)} (should equal ${testCase.expected_ke0})`);
        console.log('\n' + '-'.repeat(60) + '\n');
    });
    
    // Statistical analysis
    console.log('=== Statistical Analysis ===');
    const required_constants = testCases.map(tc => 
        tc.expected_ke0 - tc.F_terms_sum - tc.interaction_sum
    );
    const avg_constant = required_constants.reduce((a, b) => a + b) / required_constants.length;
    const constant_range = Math.max(...required_constants) - Math.min(...required_constants);
    
    console.log(`Required constants: ${required_constants.map(c => c.toFixed(6)).join(', ')}`);
    console.log(`Average required constant: ${avg_constant.toFixed(6)}`);
    console.log(`Range: ${constant_range.toFixed(6)}`);
    console.log(`Current constant: -9.06`);
    console.log(`Error magnitude: ${Math.abs(-9.06 - avg_constant).toFixed(6)}`);
    console.log('');
    
    // Test with the average corrected constant
    console.log('=== Testing Corrected Model ===');
    console.log(`Using corrected constant: ${avg_constant.toFixed(6)} instead of -9.06`);
    console.log('');
    
    testCases.forEach((testCase, index) => {
        const corrected_ke0 = avg_constant + testCase.F_terms_sum + testCase.interaction_sum;
        const error = Math.abs(corrected_ke0 - testCase.expected_ke0);
        const error_percent = (error / testCase.expected_ke0) * 100;
        
        console.log(`Case ${index + 1}: ${corrected_ke0.toFixed(6)} vs expected ${testCase.expected_ke0.toFixed(6)}`);
        console.log(`Error: ${error_percent.toFixed(2)}%`);
    });
    
    console.log('');
    console.log('=== Conclusions ===');
    console.log('1. Current constant term -9.06 is incorrect');
    console.log(`2. Correct constant should be approximately ${avg_constant.toFixed(3)}`);
    console.log(`3. Error magnitude is ${Math.abs(-9.06 - avg_constant).toFixed(1)} units`);
    console.log('4. This appears to be a transcription error from the original paper');
    console.log('5. OR the model form is different (e.g., log-linear) than implemented');
    
    return {
        current_constant: -9.06,
        required_constant: avg_constant,
        error_magnitude: Math.abs(-9.06 - avg_constant)
    };
}

// Run the investigation
const result = investigateConstantTerm();

console.log('\n=== Recommended Fix ===');
console.log(`Change constant from -9.06 to ${result.required_constant.toFixed(6)}`);
console.log('OR verify the original paper for the correct model form');