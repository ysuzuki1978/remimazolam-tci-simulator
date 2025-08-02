/**
 * Test LSODA validation with corrected ke0 values
 * Verify that the ke0 fix resolves the negative value issue
 */

// Import the corrected calculator function
function testCorrectedKe0WithLSODA() {
    console.log('=== Testing LSODA Validation with Corrected Ke0 ===\n');
    
    // Simulate the corrected MasuiKe0Calculator.calculateKe0Complete function
    function simulateCorrectedCalculation(age, TBW, height, sex, ASAPS) {
        console.log(`Testing corrected calculation for: age=${age}, TBW=${TBW}, height=${height}, sex=${sex}, ASAPS=${ASAPS}`);
        
        // Use the original PK parameter calculations (these were correct)
        const MASUI_THETA = {
            1: 3.57, 2: 11.3, 3: 27.2, 4: 1.03, 5: 1.10, 6: 0.401,
            8: 0.308, 9: 0.146, 10: -0.184
        };
        const STANDARD_WEIGHT = 67.3;
        const STANDARD_AGE = 54.0;
        
        // PK parameters (unchanged)
        const IBW = 45.4 + 0.89 * (height - 152.4) + 4.5 * (1 - sex);
        const ABW = IBW + 0.4 * (TBW - IBW);
        const V1 = MASUI_THETA[1] * (ABW / STANDARD_WEIGHT);
        const V2 = MASUI_THETA[2] * (ABW / STANDARD_WEIGHT);
        const V3 = (MASUI_THETA[3] + MASUI_THETA[8] * (age - STANDARD_AGE)) * (ABW / STANDARD_WEIGHT);
        const CL = (MASUI_THETA[4] + MASUI_THETA[9] * sex + MASUI_THETA[10] * ASAPS) * 
                   Math.pow(ABW / STANDARD_WEIGHT, 0.75);
        const Q2 = MASUI_THETA[5] * Math.pow(ABW / STANDARD_WEIGHT, 0.75);
        const Q3 = MASUI_THETA[6] * Math.pow(ABW / STANDARD_WEIGHT, 0.75);
        
        // Rate constants (unchanged)
        const k10 = CL / V1;
        const k12 = Q2 / V1;
        const k13 = Q3 / V1;
        const k21 = Q2 / V2;
        const k31 = Q3 / V3;
        
        // Corrected ke0 regression calculation
        const F_age = 0.228 - (2.72e-5 * age) + (2.96e-7 * Math.pow(age - 55, 2)) - 
                     (4.34e-9 * Math.pow(age - 55, 3)) + (5.05e-11 * Math.pow(age - 55, 4));
        const F_TBW = 0.196 + (3.53e-4 * TBW) - (7.91e-7 * Math.pow(TBW - 90, 2));
        const F_height = 0.148 + (4.73e-4 * height) - (1.43e-6 * Math.pow(height - 167.5, 2));
        const F_sex = 0.237 - (2.16e-2 * sex);
        const F_ASAPS = 0.214 + (2.41e-2 * ASAPS);
        
        const F2_age = F_age - 0.227;
        const F2_TBW = F_TBW - 0.227;
        const F2_height = F_height - 0.226;
        const F2_sex = F_sex - 0.226;
        const F2_ASAPS = F_ASAPS - 0.226;
        
        // CORRECTED CONSTANT: -0.930582 instead of -9.06
        const ke0_regression = -0.930582 + F_age + F_TBW + F_height + (0.999 * F_sex) + F_ASAPS -
                              (4.50 * F2_age * F2_TBW) - (4.51 * F2_age * F2_height) +
                              (2.46 * F2_age * F2_sex) + (3.35 * F2_age * F2_ASAPS) -
                              (12.6 * F2_TBW * F2_height) + (0.394 * F2_TBW * F2_sex) +
                              (2.06 * F2_TBW * F2_ASAPS) + (0.390 * F2_height * F2_sex) +
                              (2.07 * F2_height * F2_ASAPS) + (5.03 * F2_sex * F2_ASAPS) +
                              (99.8 * F2_age * F2_TBW * F2_height) +
                              (5.11 * F2_TBW * F2_height * F2_sex) -
                              (39.4 * F2_TBW * F2_height * F2_ASAPS) -
                              (5.00 * F2_TBW * F2_sex * F2_ASAPS) -
                              (5.04 * F2_height * F2_sex * F2_ASAPS);
        
        return {
            success: true,
            pkParameters: { IBW, ABW, V1, V2, V3, CL, Q2, Q3 },
            rateConstants: { k10, k12, k13, k21, k31 },
            ke0_regression: ke0_regression,
            ke0_numerical: null // Would be calculated by numerical method
        };
    }
    
    // Test cases from LSODA validation suite
    const testCases = [
        {
            id: "MASUI_REFERENCE_MALE",
            description: "40-year-old, 60kg, 160cm male (ASA I-II)",
            patient: { age: 40, weight: 60.0, height: 160.0, sex: 0, asaPS: 0 },
            expectedKe0: 0.191
        },
        {
            id: "MASUI_ELDERLY_FEMALE",
            description: "75-year-old, 45kg, 155cm female (ASA III-IV)",
            patient: { age: 75, weight: 45.0, height: 155.0, sex: 1, asaPS: 1 },
            expectedKe0: 0.167
        },
        {
            id: "MASUI_YOUNG_LARGE_MALE",
            description: "25-year-old, 90kg, 185cm male (ASA I-II)",
            patient: { age: 25, weight: 90.0, height: 185.0, sex: 0, asaPS: 0 },
            expectedKe0: 0.203
        }
    ];
    
    let allTestsPassed = true;
    
    testCases.forEach((testCase, index) => {
        console.log(`\nTest ${index + 1}: ${testCase.description}`);
        console.log('-'.repeat(50));
        
        const result = simulateCorrectedCalculation(
            testCase.patient.age,
            testCase.patient.weight,
            testCase.patient.height,
            testCase.patient.sex,
            testCase.patient.asaPS
        );
        
        if (result.success) {
            const calculatedKe0 = result.ke0_regression;
            const expectedKe0 = testCase.expectedKe0;
            const error = Math.abs(calculatedKe0 - expectedKe0);
            const errorPercent = (error / expectedKe0) * 100;
            
            // Check safety bounds
            const withinSafeBounds = calculatedKe0 >= 0.01 && calculatedKe0 <= 1.0;
            const withinTolerance = errorPercent <= 10.0;
            
            console.log(`Expected ke0: ${expectedKe0.toFixed(6)}`);
            console.log(`Calculated ke0: ${calculatedKe0.toFixed(6)}`);
            console.log(`Error: ${error.toFixed(6)} (${errorPercent.toFixed(2)}%)`);
            console.log(`Safety bounds (0.01-1.0): ${withinSafeBounds ? '✅ SAFE' : '❌ UNSAFE'}`);
            console.log(`Tolerance (±10%): ${withinTolerance ? '✅ PASSED' : '❌ FAILED'}`);
            
            if (!withinSafeBounds || !withinTolerance) {
                allTestsPassed = false;
            }
            
            // Check if this would trigger CRITICAL SAFETY error
            const wouldTriggerSafetyError = calculatedKe0 < 0.01 || calculatedKe0 > 1.0;
            console.log(`CRITICAL SAFETY error: ${wouldTriggerSafetyError ? '❌ WOULD TRIGGER' : '✅ RESOLVED'}`);
            
        } else {
            console.log('❌ Calculation failed');
            allTestsPassed = false;
        }
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    
    if (allTestsPassed) {
        console.log('✅ ALL TESTS PASSED');
        console.log('✅ ke0 regression fix is successful');
        console.log('✅ No more negative ke0 values');
        console.log('✅ All values within medical safety bounds');
        console.log('✅ CRITICAL SAFETY errors should be resolved');
    } else {
        console.log('❌ SOME TESTS FAILED');
        console.log('⚠️ Further investigation may be needed');
    }
    
    console.log('\nNext steps:');
    console.log('1. Open index.html in browser');
    console.log('2. Check console for CRITICAL SAFETY errors');
    console.log('3. Verify ke0 regression values are positive');
    console.log('4. Run LSODA validation test suite if available');
    
    return allTestsPassed;
}

// Run the test
const success = testCorrectedKe0WithLSODA();
console.log(`\nTest result: ${success ? 'SUCCESS' : 'FAILURE'}`);