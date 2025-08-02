/**
 * Debug Analysis for Masui Ke0 Regression Model
 * Investigating negative ke0 calculation issue
 */

function debugKe0Regression(age, TBW, height, sex, ASAPS) {
    console.log('=== Debugging Ke0 Regression Calculation ===');
    console.log(`Input: age=${age}, TBW=${TBW}, height=${height}, sex=${sex}, ASAPS=${ASAPS}`);
    
    // Step 1: Calculate F() auxiliary functions
    console.log('\n--- Step 1: F() Functions ---');
    
    const F_age = 0.228 - (2.72e-5 * age) + (2.96e-7 * Math.pow(age - 55, 2)) - 
                 (4.34e-9 * Math.pow(age - 55, 3)) + (5.05e-11 * Math.pow(age - 55, 4));
    console.log(`F_age = 0.228 - (2.72e-5 * ${age}) + (2.96e-7 * ${age-55}²) - (4.34e-9 * ${age-55}³) + (5.05e-11 * ${age-55}⁴)`);
    console.log(`F_age = ${F_age.toFixed(6)}`);
    
    const F_TBW = 0.196 + (3.53e-4 * TBW) - (7.91e-7 * Math.pow(TBW - 90, 2));
    console.log(`F_TBW = 0.196 + (3.53e-4 * ${TBW}) - (7.91e-7 * ${TBW-90}²)`);
    console.log(`F_TBW = ${F_TBW.toFixed(6)}`);
    
    const F_height = 0.148 + (4.73e-4 * height) - (1.43e-6 * Math.pow(height - 167.5, 2));
    console.log(`F_height = 0.148 + (4.73e-4 * ${height}) - (1.43e-6 * ${height-167.5}²)`);
    console.log(`F_height = ${F_height.toFixed(6)}`);
    
    const F_sex = 0.237 - (2.16e-2 * sex);
    console.log(`F_sex = 0.237 - (2.16e-2 * ${sex}) = ${F_sex.toFixed(6)}`);
    
    const F_ASAPS = 0.214 + (2.41e-2 * ASAPS);
    console.log(`F_ASAPS = 0.214 + (2.41e-2 * ${ASAPS}) = ${F_ASAPS.toFixed(6)}`);
    
    // Step 2: Calculate F2() normalized functions
    console.log('\n--- Step 2: F2() Normalized Functions ---');
    
    const F2_age = F_age - 0.227;
    const F2_TBW = F_TBW - 0.227;
    const F2_height = F_height - 0.226;
    const F2_sex = F_sex - 0.226;
    const F2_ASAPS = F_ASAPS - 0.226;
    
    console.log(`F2_age = ${F_age.toFixed(6)} - 0.227 = ${F2_age.toFixed(6)}`);
    console.log(`F2_TBW = ${F_TBW.toFixed(6)} - 0.227 = ${F2_TBW.toFixed(6)}`);
    console.log(`F2_height = ${F_height.toFixed(6)} - 0.226 = ${F2_height.toFixed(6)}`);
    console.log(`F2_sex = ${F_sex.toFixed(6)} - 0.226 = ${F2_sex.toFixed(6)}`);
    console.log(`F2_ASAPS = ${F_ASAPS.toFixed(6)} - 0.226 = ${F2_ASAPS.toFixed(6)}`);
    
    // Step 3: Calculate main terms
    console.log('\n--- Step 3: Main Regression Terms ---');
    
    const mainTerms = {
        constant: -9.06,
        F_age: F_age,
        F_TBW: F_TBW,
        F_height: F_height,
        F_sex_coeff: 0.999 * F_sex,
        F_ASAPS: F_ASAPS
    };
    
    console.log(`Constant: ${mainTerms.constant}`);
    console.log(`F_age: ${mainTerms.F_age.toFixed(6)}`);
    console.log(`F_TBW: ${mainTerms.F_TBW.toFixed(6)}`);
    console.log(`F_height: ${mainTerms.F_height.toFixed(6)}`);
    console.log(`0.999 * F_sex: ${mainTerms.F_sex_coeff.toFixed(6)}`);
    console.log(`F_ASAPS: ${mainTerms.F_ASAPS.toFixed(6)}`);
    
    const mainSum = mainTerms.constant + mainTerms.F_age + mainTerms.F_TBW + 
                   mainTerms.F_height + mainTerms.F_sex_coeff + mainTerms.F_ASAPS;
    console.log(`Sum of main terms: ${mainSum.toFixed(6)}`);
    
    // Step 4: Calculate interaction terms
    console.log('\n--- Step 4: Interaction Terms ---');
    
    const interactions = {
        term1: -4.50 * F2_age * F2_TBW,
        term2: -4.51 * F2_age * F2_height,
        term3: 2.46 * F2_age * F2_sex,
        term4: 3.35 * F2_age * F2_ASAPS,
        term5: -12.6 * F2_TBW * F2_height,
        term6: 0.394 * F2_TBW * F2_sex,
        term7: 2.06 * F2_TBW * F2_ASAPS,
        term8: 0.390 * F2_height * F2_sex,
        term9: 2.07 * F2_height * F2_ASAPS,
        term10: 5.03 * F2_sex * F2_ASAPS,
        term11: 99.8 * F2_age * F2_TBW * F2_height,
        term12: 5.11 * F2_TBW * F2_height * F2_sex,
        term13: -39.4 * F2_TBW * F2_height * F2_ASAPS,
        term14: -5.00 * F2_TBW * F2_sex * F2_ASAPS,
        term15: -5.04 * F2_height * F2_sex * F2_ASAPS
    };
    
    Object.entries(interactions).forEach(([name, value]) => {
        console.log(`${name}: ${value.toFixed(6)}`);
    });
    
    const interactionSum = Object.values(interactions).reduce((sum, val) => sum + val, 0);
    console.log(`Sum of interaction terms: ${interactionSum.toFixed(6)}`);
    
    // Step 5: Calculate final ke0
    console.log('\n--- Step 5: Final Calculation ---');
    
    const ke0_calculated = mainSum + interactionSum;
    console.log(`Final ke0 = ${mainSum.toFixed(6)} + ${interactionSum.toFixed(6)} = ${ke0_calculated.toFixed(6)}`);
    
    // Check expected value
    const expected_ke0 = 0.191; // From Masui paper for similar patient
    const error = Math.abs(ke0_calculated - expected_ke0);
    const error_percent = (error / expected_ke0) * 100;
    
    console.log(`\nExpected ke0: ${expected_ke0}`);
    console.log(`Calculated ke0: ${ke0_calculated.toFixed(6)}`);
    console.log(`Error: ${error.toFixed(6)} (${error_percent.toFixed(2)}%)`);
    
    if (ke0_calculated < 0) {
        console.log('\n⚠️ PROBLEM: Negative ke0 value detected!');
        console.log('Most likely causes:');
        console.log('1. Incorrect coefficient signs in regression equation');
        console.log('2. Wrong normalization constants for F2() functions');
        console.log('3. Unit conversion issues in input parameters');
        
        // Check which terms are contributing most to the negative result
        const allTerms = [...Object.values(mainTerms), ...Object.values(interactions)];
        const negativeTerms = allTerms.filter(t => t < 0);
        const negativeSum = negativeTerms.reduce((sum, t) => sum + t, 0);
        const positiveTerms = allTerms.filter(t => t > 0);
        const positiveSum = positiveTerms.reduce((sum, t) => sum + t, 0);
        
        console.log(`Negative terms sum: ${negativeSum.toFixed(6)}`);
        console.log(`Positive terms sum: ${positiveSum.toFixed(6)}`);
        console.log(`Net result: ${(positiveSum + negativeSum).toFixed(6)}`);
    }
    
    return {
        F_functions: { F_age, F_TBW, F_height, F_sex, F_ASAPS },
        F2_functions: { F2_age, F2_TBW, F2_height, F2_sex, F2_ASAPS },
        mainTerms,
        interactions,
        mainSum,
        interactionSum,
        ke0_calculated,
        expected_ke0,
        error,
        error_percent
    };
}

// Test with the standard patient from console log
console.log('Testing with standard patient (50y, 70kg, 170cm, male, ASA I-II):');
const result = debugKe0Regression(50, 70, 170, 0, 0);

// Also test with Masui paper reference case
console.log('\n\nTesting with Masui paper reference case (40y, 60kg, 160cm, male, ASA I-II):');
const paperResult = debugKe0Regression(40, 60, 160, 0, 0);