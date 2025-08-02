/**
 * Masui Ke0 Model - Exact Implementation
 * 完全なMasui ke0計算モデル（指示に忠実な実装）
 * 
 * 実装内容:
 * 1. 数値解析による厳密解
 * 2. 重回帰モデルによる近似解
 * 3. 3次方程式ソルバー
 * 4. 数値的根探索
 */

// Masui 2022 model constants (theta values)
const MASUI_THETA = {
    1: 3.57,   // V1 coefficient
    2: 11.3,   // V2 coefficient  
    3: 27.2,   // V3 coefficient
    4: 1.03,   // CL coefficient
    5: 1.10,   // Q2 coefficient
    6: 0.401,  // Q3 coefficient
    7: 1.19,   // (not used in current model)
    8: 0.308,  // V3 age coefficient
    9: 0.146,  // CL sex coefficient
    10: -0.184, // CL ASA coefficient
    11: 0.0205  // (not used in current model)
};

// Fixed parameters
const STANDARD_WEIGHT = 67.3; // kg
const STANDARD_AGE = 54.0;     // years
const T_PEAK = 2.6;            // minutes (最大効果到達時間)

/**
 * 3次方程式の解を求める（Cardanoの公式使用）
 * x^3 + a2*x^2 + a1*x + a0 = 0
 */
class CubicSolver {
    static solve(a2, a1, a0) {
        // Depressed cubic transformation: t^3 + p*t + q = 0
        const p = a1 - (a2 * a2) / 3;
        const q = (2 * a2 * a2 * a2 - 9 * a2 * a1 + 27 * a0) / 27;
        
        // Discriminant
        const discriminant = Math.pow(q / 2, 2) + Math.pow(p / 3, 3);
        
        const roots = [];
        
        if (discriminant > 1e-10) {
            // One real root
            const sqrt_disc = Math.sqrt(discriminant);
            const u = Math.cbrt(-q / 2 + sqrt_disc);
            const v = Math.cbrt(-q / 2 - sqrt_disc);
            const t = u + v;
            const x = t - a2 / 3;
            roots.push(x);
        } else if (Math.abs(discriminant) < 1e-10) {
            // Two or three real roots (repeated)
            if (Math.abs(p) < 1e-10) {
                // Triple root
                const x = -a2 / 3;
                roots.push(x, x, x);
            } else {
                // Double root
                const t1 = 3 * q / p;
                const t2 = -3 * q / (2 * p);
                const x1 = t1 - a2 / 3;
                const x2 = t2 - a2 / 3;
                roots.push(x1, x2, x2);
            }
        } else {
            // Three distinct real roots
            const rho = Math.sqrt(-Math.pow(p / 3, 3));
            const theta = Math.acos(-q / (2 * rho));
            
            for (let k = 0; k < 3; k++) {
                const t = 2 * Math.cbrt(rho) * Math.cos((theta + 2 * Math.PI * k) / 3);
                const x = t - a2 / 3;
                roots.push(x);
            }
        }
        
        // Return only real roots, sorted by magnitude (descending)
        return roots
            .filter(root => typeof root === 'number' && isFinite(root))
            .map(root => Math.abs(root))
            .sort((a, b) => b - a);
    }
}

/**
 * 数値的根探索（ブレント法）- 高精度版
 */
class BrentSolver {
    static findRoot(func, a, b, tolerance = 1e-15, maxIterations = 200) {
        let fa = func(a);
        let fb = func(b);
        
        if (fa * fb > 0) {
            throw new Error('Function values at endpoints must have opposite signs');
        }
        
        if (Math.abs(fa) < Math.abs(fb)) {
            [a, b] = [b, a];
            [fa, fb] = [fb, fa];
        }
        
        let c = a;
        let fc = fa;
        let mflag = true;
        let d = 0;
        
        for (let iter = 0; iter < maxIterations; iter++) {
            // Enhanced convergence check (relative + absolute + function error)
            const relative_error = Math.abs((b - a) / Math.max(Math.abs(a), Math.abs(b)));
            const absolute_error = Math.abs(b - a);
            const function_error = Math.abs(fb);
            const tolerance_adaptive = tolerance * Math.max(1, Math.abs(b)) + tolerance;
            
            if (relative_error < tolerance && 
                absolute_error < tolerance_adaptive && 
                function_error < tolerance * 0.1) {
                console.log(`Brent method converged in ${iter + 1} iterations`);
                console.log(`Final precision: rel_err=${relative_error.toExponential(3)}, abs_err=${absolute_error.toExponential(3)}, func_err=${function_error.toExponential(3)}`);
                return b;
            }
            
            let s;
            
            if (fa !== fc && fb !== fc) {
                // Inverse quadratic interpolation
                s = a * fb * fc / ((fa - fb) * (fa - fc)) +
                    b * fa * fc / ((fb - fa) * (fb - fc)) +
                    c * fa * fb / ((fc - fa) * (fc - fb));
            } else {
                // Secant method
                s = b - fb * (b - a) / (fb - fa);
            }
            
            // Check if we should use bisection instead
            const condition1 = s < (3 * a + b) / 4 || s > b;
            const condition2 = mflag && Math.abs(s - b) >= Math.abs(b - c) / 2;
            const condition3 = !mflag && Math.abs(s - b) >= Math.abs(c - d) / 2;
            const condition4 = mflag && Math.abs(b - c) < tolerance_adaptive;
            const condition5 = !mflag && Math.abs(c - d) < tolerance_adaptive;
            
            if (condition1 || condition2 || condition3 || condition4 || condition5) {
                s = (a + b) / 2;
                mflag = true;
            } else {
                mflag = false;
            }
            
            const fs = func(s);
            
            // Check for NaN or Infinity
            if (!isFinite(fs)) {
                console.warn('Function evaluation returned non-finite value, using bisection');
                s = (a + b) / 2;
                mflag = true;
            }
            
            d = c;
            c = b;
            fc = fb;
            
            if (fa * fs < 0) {
                b = s;
                fb = fs;
            } else {
                a = s;
                fa = fs;
            }
            
            if (Math.abs(fa) < Math.abs(fb)) {
                [a, b] = [b, a];
                [fa, fb] = [fb, fa];
            }
        }
        
        console.warn(`Brent method did not converge in ${maxIterations} iterations`);
        return b;
    }

    /**
     * Fallback bisection method for robust convergence
     */
    static bisectionMethod(func, a, b, tolerance = 1e-10, maxIterations = 100) {
        let fa = func(a);
        let fb = func(b);
        
        if (fa * fb > 0) {
            throw new Error('Function values at endpoints must have opposite signs');
        }
        
        for (let iter = 0; iter < maxIterations; iter++) {
            const c = (a + b) / 2;
            const fc = func(c);
            
            if (Math.abs(fc) < tolerance || Math.abs(b - a) < tolerance) {
                console.log(`Bisection method converged in ${iter + 1} iterations`);
                return c;
            }
            
            if (fa * fc < 0) {
                b = c;
                fb = fc;
            } else {
                a = c;
                fa = fc;
            }
        }
        
        console.warn(`Bisection method did not converge in ${maxIterations} iterations`);
        return (a + b) / 2;
    }
}

/**
 * 完全なMasui Ke0計算クラス
 */
class MasuiKe0Calculator {
    /**
     * ステップ1: 患者個別のPKパラメータ計算
     */
    static calculatePKParameters(age, TBW, height, sex, ASAPS) {
        // 1.1 理想体重 (IBW)
        const IBW = 45.4 + 0.89 * (height - 152.4) + 4.5 * (1 - sex);
        
        // 1.2 調整体重 (ABW)
        const ABW = IBW + 0.4 * (TBW - IBW);
        
        // 1.3 分布容積 (L)
        const V1 = MASUI_THETA[1] * (ABW / STANDARD_WEIGHT);
        const V2 = MASUI_THETA[2] * (ABW / STANDARD_WEIGHT);
        const V3 = (MASUI_THETA[3] + MASUI_THETA[8] * (age - STANDARD_AGE)) * (ABW / STANDARD_WEIGHT);
        
        // 1.4 クリアランス (L/min)
        const CL = (MASUI_THETA[4] + MASUI_THETA[9] * sex + MASUI_THETA[10] * ASAPS) * 
                   Math.pow(ABW / STANDARD_WEIGHT, 0.75);
        const Q2 = MASUI_THETA[5] * Math.pow(ABW / STANDARD_WEIGHT, 0.75);
        const Q3 = MASUI_THETA[6] * Math.pow(ABW / STANDARD_WEIGHT, 0.75);
        
        return { IBW, ABW, V1, V2, V3, CL, Q2, Q3 };
    }
    
    /**
     * ステップ2: 速度定数の計算
     */
    static calculateRateConstants(pkParams) {
        const { V1, V2, V3, CL, Q2, Q3 } = pkParams;
        
        const k10 = CL / V1;
        const k12 = Q2 / V1;
        const k13 = Q3 / V1;
        const k21 = Q2 / V2;
        const k31 = Q3 / V3;
        
        return { k10, k12, k13, k21, k31 };
    }
    
    /**
     * ステップ3: 血漿中濃度式の係数と指数の計算
     */
    static calculatePlasmaCoefficients(rateConstants) {
        const { k10, k12, k13, k21, k31 } = rateConstants;
        
        // 3.1 3次方程式の係数
        const a2 = k10 + k12 + k13 + k21 + k31;
        const a1 = (k10 + k13) * k21 + (k10 + k12) * k31 + k21 * k31;
        const a0 = k10 * k21 * k31;
        
        // 3.2 3次方程式を解く
        const roots = CubicSolver.solve(a2, a1, a0);
        
        if (roots.length < 3) {
            throw new Error('Could not find three real roots for cubic equation');
        }
        
        // 3.3 大きい順にalpha, beta, gamma
        const [alpha, beta, gamma] = roots;
        
        // 3.4 係数A, B, Cの計算
        const A = ((k21 - alpha) * (k31 - alpha)) / ((beta - alpha) * (gamma - alpha));
        const B = ((k21 - beta) * (k31 - beta)) / ((alpha - beta) * (gamma - beta));
        const C = ((k21 - gamma) * (k31 - gamma)) / ((alpha - gamma) * (beta - gamma));
        
        return { alpha, beta, gamma, A, B, C };
    }
    
    /**
     * ステップ4A: 数値解析によるke0の算出（厳密解）- 高精度版
     */
    static calculateKe0Numerical(coefficients, t_peak = T_PEAK) {
        const { alpha, beta, gamma, A, B, C } = coefficients;
        
        // 数値安定性を考慮したf(ke0)関数の定義
        const f = (ke0) => {
            return this.evaluateKe0Function(ke0, { alpha, beta, gamma, A, B, C }, t_peak);
        };

        // f'(ke0)関数の定義（ニュートン法用）
        const f_prime = (ke0) => {
            return this.evaluateKe0FunctionDerivative(ke0, { alpha, beta, gamma, A, B, C }, t_peak);
        };

        // 改善された初期推定値の算出
        const initial_guess = this.getImprovedInitialGuess(coefficients, t_peak);
        
        // ニュートン法による初期値の改善
        const refined_guess = this.refineInitialGuess(initial_guess, f, f_prime);
        
        // 狭い探索区間の設定
        const search_width = 0.05;
        const search_a = Math.max(0.05, refined_guess - search_width);
        const search_b = Math.min(0.5, refined_guess + search_width);
        
        console.log(`Initial guess: ${initial_guess.toFixed(6)}`);
        console.log(`Refined guess: ${refined_guess.toFixed(6)}`);
        console.log(`Search interval: [${search_a.toFixed(6)}, ${search_b.toFixed(6)}]`);
        
        try {
            // 高精度Brent法による求解
            const ke0 = BrentSolver.findRoot(f, search_a, search_b, 1e-15, 200);
            
            // 結果の妥当性検証
            if (this.validateKe0(ke0)) {
                return ke0;
            } else {
                console.warn('Numerical ke0 validation failed, trying fallback methods');
                return this.fallbackKe0Calculation(coefficients, t_peak);
            }
        } catch (error) {
            console.warn('Primary numerical ke0 calculation failed:', error.message);
            return this.fallbackKe0Calculation(coefficients, t_peak);
        }
    }

    /**
     * 数値安定性を考慮したf(ke0)関数の評価
     */
    static evaluateKe0Function(ke0, coefficients, t_peak) {
        const { alpha, beta, gamma, A, B, C } = coefficients;
        const terms = [
            { lambda: alpha, coeff: A },
            { lambda: beta, coeff: B },
            { lambda: gamma, coeff: C }
        ];
        
        let result = 0;
        
        for (const term of terms) {
            const { lambda, coeff } = term;
            const delta = 1e-8;
            
            // 特異点の処理
            if (Math.abs(ke0 - lambda) < delta) {
                // テイラー展開による近似
                const taylor_term = -ke0 * coeff * (1 - lambda * t_peak) * Math.exp(-lambda * t_peak);
                result += taylor_term;
            } else {
                // 通常の計算だが、桁落ちを防ぐためexpm1を使用
                const exp_ke0 = Math.exp(-ke0 * t_peak);
                const exp_lambda = Math.exp(-lambda * t_peak);
                
                // h(ke0) = lambda * exp(-lambda * t) - ke0 * exp(-ke0 * t)
                // 桁落ち防止のため変形
                let h_ke0;
                if (Math.abs(lambda - ke0) < 0.01) {
                    // 近似式を使用
                    h_ke0 = (lambda - ke0) * exp_lambda + ke0 * exp_ke0 * Math.expm1((ke0 - lambda) * t_peak);
                } else {
                    h_ke0 = lambda * exp_lambda - ke0 * exp_ke0;
                }
                
                const g_ke0 = ke0 * coeff / (ke0 - lambda);
                result += g_ke0 * h_ke0;
            }
        }
        
        return result;
    }

    /**
     * f'(ke0)関数の評価（ニュートン法用）
     */
    static evaluateKe0FunctionDerivative(ke0, coefficients, t_peak) {
        const { alpha, beta, gamma, A, B, C } = coefficients;
        const terms = [
            { lambda: alpha, coeff: A },
            { lambda: beta, coeff: B },
            { lambda: gamma, coeff: C }
        ];
        
        let result = 0;
        
        for (const term of terms) {
            const { lambda, coeff } = term;
            const delta = 1e-8;
            
            if (Math.abs(ke0 - lambda) < delta) {
                // 特異点での導関数の近似
                const exp_lambda = Math.exp(-lambda * t_peak);
                const derivative_term = -coeff * (1 - lambda * t_peak) * exp_lambda - 
                                       ke0 * coeff * t_peak * exp_lambda;
                result += derivative_term;
            } else {
                // 通常の導関数計算
                const exp_ke0 = Math.exp(-ke0 * t_peak);
                const exp_lambda = Math.exp(-lambda * t_peak);
                
                const g_ke0 = ke0 * coeff / (ke0 - lambda);
                const g_prime_ke0 = -coeff * lambda / Math.pow(ke0 - lambda, 2);
                
                const h_ke0 = lambda * exp_lambda - ke0 * exp_ke0;
                const h_prime_ke0 = (ke0 * t_peak - 1) * exp_ke0;
                
                result += g_prime_ke0 * h_ke0 + g_ke0 * h_prime_ke0;
            }
        }
        
        return result;
    }

    /**
     * 改善された初期推定値の算出
     */
    static getImprovedInitialGuess(coefficients, t_peak) {
        const { alpha, beta, gamma, A, B, C } = coefficients;
        
        // 重み付き平均による基本推定値
        const weighted_avg = (A * alpha + B * beta + C * gamma) / (A + B + C);
        
        // T_peakに基づく補正
        const correction = Math.log(t_peak) / t_peak;
        const initial_estimate = weighted_avg * (1 + correction * 0.1);
        
        // 物理的制約内に収める
        return Math.max(0.05, Math.min(0.5, initial_estimate));
    }

    /**
     * ニュートン法による初期値の改善
     */
    static refineInitialGuess(initial_guess, f, f_prime, max_iterations = 3) {
        let x = initial_guess;
        
        for (let i = 0; i < max_iterations; i++) {
            const fx = f(x);
            const fpx = f_prime(x);
            
            if (Math.abs(fpx) < 1e-14) {
                console.warn('Newton refinement: derivative too small');
                break;
            }
            
            const delta = fx / fpx;
            x = x - delta;
            
            // 物理的制約を保持
            x = Math.max(0.05, Math.min(0.5, x));
            
            if (Math.abs(delta) < 1e-10) {
                console.log(`Newton refinement converged in ${i + 1} iterations`);
                break;
            }
        }
        
        return x;
    }

    /**
     * ke0の妥当性検証
     */
    static validateKe0(ke0) {
        return ke0 >= 0.05 && ke0 <= 0.5 && isFinite(ke0);
    }

    /**
     * フォールバック計算戦略
     */
    static fallbackKe0Calculation(coefficients, t_peak) {
        const { alpha, beta, gamma, A, B, C } = coefficients;
        
        // フォールバック1: 二分法による求解
        const f = (ke0) => this.evaluateKe0Function(ke0, coefficients, t_peak);
        
        try {
            console.log('Trying fallback method: Bisection');
            const ke0_bisection = BrentSolver.bisectionMethod(f, 0.15, 0.26, 1e-10, 100);
            
            if (this.validateKe0(ke0_bisection)) {
                console.log('Fallback bisection method succeeded');
                return ke0_bisection;
            }
        } catch (error) {
            console.warn('Bisection method failed:', error.message);
        }
        
        // フォールバック2: より広い区間での探索
        try {
            console.log('Trying fallback method: Wide interval search');
            const ke0_wide = BrentSolver.findRoot(f, 0.05, 0.5, 1e-10, 200);
            
            if (this.validateKe0(ke0_wide)) {
                console.log('Wide interval search succeeded');
                return ke0_wide;
            }
        } catch (error) {
            console.warn('Wide interval search failed:', error.message);
        }
        
        // 最終フォールバック: 回帰モデルの使用
        console.warn('All numerical methods failed, using regression model');
        return null;
    }
    
    /**
     * ステップ4B: 重回帰モデルによるke0の算出（近似解）
     */
    static calculateKe0Regression(age, TBW, height, sex, ASAPS) {
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
        
        // 4B.3 重回帰式によるke0計算 (CORRECTED: constant was -9.06, now -0.931)
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
        
        return ke0_approx;
    }
    
    /**
     * メインの計算関数
     */
    static calculateKe0Complete(age, TBW, height, sex, ASAPS) {
        const patientData = { age, weight: TBW, height, sex, asaPS: ASAPS };
        
        try {
            // Input validation with error logging
            const validationError = this.validateInputs(age, TBW, height, sex, ASAPS);
            if (validationError) {
                if (typeof MedicalErrorLog !== 'undefined') {
                    MedicalErrorLog.logValidationError(
                        ErrorSource.MASUI_KE0_CALCULATOR,
                        validationError,
                        patientData,
                        {
                            ageRange: '18-100 years',
                            weightRange: '30-200 kg',
                            heightRange: '120-220 cm'
                        }
                    );
                }
                throw new Error(validationError);
            }

            console.log('=== Masui Ke0 Complete Calculation ===');
            console.log(`Patient: age=${age}, TBW=${TBW}, height=${height}, sex=${sex}, ASAPS=${ASAPS}`);
            
            // ステップ1: PKパラメータ計算
            const pkParams = this.calculatePKParameters(age, TBW, height, sex, ASAPS);
            console.log('PK Parameters:', pkParams);
            
            // ステップ2: 速度定数計算
            const rateConstants = this.calculateRateConstants(pkParams);
            console.log('Rate Constants:', rateConstants);
            
            // ステップ3: 血漿濃度係数計算
            const coefficients = this.calculatePlasmaCoefficients(rateConstants);
            console.log('Plasma Coefficients:', coefficients);
            
            // ステップ4A: 数値解析による厳密解
            let ke0_numerical = null;
            try {
                ke0_numerical = this.calculateKe0Numerical(coefficients);
                console.log('Ke0 (Numerical):', ke0_numerical ? ke0_numerical.toFixed(5) : 'Failed');
                
                if (!ke0_numerical && typeof MedicalErrorLog !== 'undefined') {
                    MedicalErrorLog.logNumericalError(
                        ErrorSource.MASUI_KE0_CALCULATOR,
                        'Numerical ke0 calculation failed - using regression fallback',
                        {
                            name: 'Cubic equation solver',
                            parameters: coefficients,
                            precision: '1e-12'
                        },
                        { converged: false, reason: 'No valid roots found' }
                    );
                }
            } catch (numericalError) {
                if (typeof MedicalErrorLog !== 'undefined') {
                    MedicalErrorLog.logNumericalError(
                        ErrorSource.MASUI_KE0_CALCULATOR,
                        'Numerical ke0 calculation error: ' + numericalError.message,
                        {
                            name: 'Cubic equation solver',
                            parameters: coefficients
                        },
                        { error: numericalError.message }
                    );
                }
                console.warn('Numerical calculation failed, using regression method');
            }
            
            // ステップ4B: 重回帰モデルによる近似解
            const ke0_regression = this.calculateKe0Regression(age, TBW, height, sex, ASAPS);
            console.log('Ke0 (Regression):', ke0_regression.toFixed(5));
            
            // Safety check for ke0 values
            if (ke0_regression < 0.01 || ke0_regression > 1.0) {
                if (typeof MedicalErrorLog !== 'undefined') {
                    MedicalErrorLog.logSafetyError(
                        ErrorSource.MASUI_KE0_CALCULATOR,
                        'ke0 value outside safe range',
                        {
                            safeRange: '0.01 - 1.0 min⁻¹',
                            threshold: 'Clinical safety bounds'
                        },
                        {
                            ke0_regression: ke0_regression,
                            ke0_numerical: ke0_numerical
                        }
                    );
                }
            }
            
            return {
                pkParameters: pkParams,
                rateConstants: rateConstants,
                plasmaCoefficients: coefficients,
                ke0_numerical: ke0_numerical,
                ke0_regression: ke0_regression,
                success: true
            };
            
        } catch (error) {
            console.error('Ke0 calculation failed:', error);
            
            if (typeof MedicalErrorLog !== 'undefined') {
                MedicalErrorLog.logPKError(
                    ErrorSource.MASUI_KE0_CALCULATOR,
                    'Complete ke0 calculation failed: ' + error.message,
                    patientData,
                    {
                        calculationType: 'Complete ke0 calculation',
                        inputValidation: 'Failed'
                    },
                    error
                );
            }
            
            return {
                error: error.message,
                success: false
            };
        }
    }

    /**
     * Input validation for patient parameters
     */
    static validateInputs(age, TBW, height, sex, ASAPS) {
        if (age < 18 || age > 100) {
            return `Age must be between 18-100 years (provided: ${age})`;
        }
        if (TBW < 30 || TBW > 200) {
            return `Weight must be between 30-200 kg (provided: ${TBW})`;
        }
        if (height < 120 || height > 220) {
            return `Height must be between 120-220 cm (provided: ${height})`;
        }
        if (sex !== 0 && sex !== 1) {
            return `Sex must be 0 (male) or 1 (female) (provided: ${sex})`;
        }
        if (ASAPS !== 0 && ASAPS !== 1) {
            return `ASA-PS must be 0 (I-II) or 1 (III-IV) (provided: ${ASAPS})`;
        }
        return null;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.MasuiKe0Calculator = MasuiKe0Calculator;
    window.CubicSolver = CubicSolver;
    window.BrentSolver = BrentSolver;
    window.MASUI_THETA = MASUI_THETA;
    window.STANDARD_WEIGHT = STANDARD_WEIGHT;
    window.STANDARD_AGE = STANDARD_AGE;
    window.T_PEAK = T_PEAK;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        MasuiKe0Calculator, 
        CubicSolver, 
        BrentSolver, 
        MASUI_THETA, 
        STANDARD_WEIGHT, 
        STANDARD_AGE, 
        T_PEAK 
    };
}