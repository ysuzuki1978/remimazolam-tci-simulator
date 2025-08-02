/**
 * Validate the corrected Masui Ke0 regression model
 * Testing with the corrected constant: -0.930582 instead of -9.06
 */

// Copy the corrected calculation function
function calculateKe0RegressionCorrected(age, TBW, height, sex, ASAPS) {
    console.log(`Testing corrected regression for: age=${age}, TBW=${TBW}, height=${height}, sex=${sex}, ASAPS=${ASAPS}`);
    
    // 4B.1 補助関数F(x)の計算
    const F_age = 0.228 - (2.72e-5 * age) + (2.96e-7 * Math.pow(age - 55, 2)) - 
                 (4.34e-9 * Math.pow(age - 55, 3)) + (5.05e-11 * Math.pow(age - 55, 4));
    const F_TBW = 0.196 + (3.53e-4 * TBW) - (7.91e-7 * Math.pow(TBW - 90, 2));
    const F_height = 0.148 + (4.73e-4 * height) - (1.43e-6 * Math.pow(height - 167.5, 2));
    const F_sex = 0.237 - (2.16e-2 * sex);
    const F_ASAPS = 0.214 + (2.41e-2 * ASAPS);
    
    // 4B.2 補助変数F2(x)の計算
    const F2_age = F_age - 0.227;
    const F2_TBW = F_TBW - 0.227;
    const F2_height = F_height - 0.226;
    const F2_sex = F_sex - 0.226;
    const F2_ASAPS = F_ASAPS - 0.226;
    
    // 4B.3 重回帰式によるke0計算 (CORRECTED CONSTANT)
    const ke0_approx = -0.930582 + F_age + F_TBW + F_height + (0.999 * F_sex) + F_ASAPS -
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
    
    console.log(`  Corrected ke0_regression: ${ke0_approx.toFixed(6)}`);
    return ke0_approx;
}

function validateKe0Fix() {
    console.log('=== Validating Corrected Ke0 Regression Model ===\n');
    
    const testCases = [
        {
            description: "Standard patient (50y, 70kg, 170cm, male, ASA I-II)",
            age: 50, TBW: 70, height: 170, sex: 0, ASAPS: 0,
            expected_ke0: 0.191,
            numerical_ke0: 0.22065
        },
        {
            description: "Masui paper reference (40y, 60kg, 160cm, male, ASA I-II)",
            age: 40, TBW: 60, height: 160, sex: 0, ASAPS: 0,
            expected_ke0: 0.191,
            numerical_ke0: 0.22065
        },
        {
            description: "Young large male (25y, 90kg, 185cm, male, ASA I-II)",
            age: 25, TBW: 90, height: 185, sex: 0, ASAPS: 0,
            expected_ke0: 0.203, // From LSODA validation test
            numerical_ke0: 0.203
        },
        {
            description: "Elderly female (75y, 45kg, 155cm, female, ASA III-IV)",
            age: 75, TBW: 45, height: 155, sex: 1, ASAPS: 1,
            expected_ke0: 0.167, // From LSODA validation test
            numerical_ke0: 0.167
        }
    ];
    
    console.log('Testing corrected regression model...\n');
    
    let allPassed = true;
    
    testCases.forEach((testCase, index) => {
        console.log(`Test ${index + 1}: ${testCase.description}`);
        
        const corrected_ke0 = calculateKe0RegressionCorrected(
            testCase.age, testCase.TBW, testCase.height, testCase.sex, testCase.ASAPS
        );
        
        const error = Math.abs(corrected_ke0 - testCase.expected_ke0);
        const error_percent = (error / testCase.expected_ke0) * 100;
        
        // Check if within acceptable medical tolerance (±10%)
        const passed = error_percent <= 10.0;
        const status = passed ? '✅ PASSED' : '❌ FAILED';
        
        console.log(`  Expected: ${testCase.expected_ke0.toFixed(6)}`);
        console.log(`  Calculated: ${corrected_ke0.toFixed(6)}`);
        console.log(`  Error: ${error.toFixed(6)} (${error_percent.toFixed(2)}%)`);
        console.log(`  Status: ${status}`);
        
        // Check safety bounds (ke0 should be 0.01-1.0 min⁻¹)
        const withinSafeBounds = corrected_ke0 >= 0.01 && corrected_ke0 <= 1.0;
        const safetyStatus = withinSafeBounds ? '✅ SAFE' : '❌ UNSAFE';
        console.log(`  Safety bounds (0.01-1.0): ${safetyStatus}`);
        
        if (!passed || !withinSafeBounds) {
            allPassed = false;
        }
        
        console.log('\n' + '-'.repeat(50) + '\n');
    });
    
    // Summary
    console.log('=== Validation Summary ===');
    const passedCount = testCases.filter((tc, index) => {
        const corrected_ke0 = calculateKe0RegressionCorrected(tc.age, tc.TBW, tc.height, tc.sex, tc.ASAPS);
        const error_percent = (Math.abs(corrected_ke0 - tc.expected_ke0) / tc.expected_ke0) * 100;
        return error_percent <= 10.0 && corrected_ke0 >= 0.01 && corrected_ke0 <= 1.0;
    }).length;
    
    console.log(`Passed: ${passedCount}/${testCases.length} tests`);
    console.log(`Success rate: ${(passedCount / testCases.length * 100).toFixed(1)}%`);
    console.log(`Overall status: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    if (allPassed) {
        console.log('\n🎉 Ke0 regression fix is successful!');
        console.log('The corrected constant (-0.930582) produces medically valid ke0 values.');
        console.log('All values are within ±10% error tolerance and safety bounds.');
    } else {
        console.log('\n⚠️ Some tests failed. Further investigation needed.');
    }
    
    return allPassed;
}

// Run validation
const success = validateKe0Fix();