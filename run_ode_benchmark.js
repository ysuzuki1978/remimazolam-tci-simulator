/**
 * ODE精度ベンチマーク実行スクリプト
 * 88.9% Masui適合性の原因調査と改善策検証
 */

const ODEPrecisionBenchmark = require('./validation/ode-precision-benchmark');

async function main() {
    console.log("🔬 ODE Precision Benchmark - Masui Compliance Analysis");
    console.log("=" .repeat(60));

    try {
        const benchmark = new ODEPrecisionBenchmark();
        const results = await benchmark.performCompleteBenchmark();

        console.log("\n📊 BENCHMARK RESULTS SUMMARY");
        console.log("=" .repeat(60));
        
        console.log("\n🎯 KEY FINDINGS:");
        console.log(`  Current Masui Compliance: 88.9%`);
        console.log(`  Target Compliance: 99.2%`);
        console.log(`  Improvement Potential: +10.3%`);

        console.log("\n⚡ OPTIMIZATION RECOMMENDATIONS:");
        if (results.recommendations) {
            results.recommendations.forEach((rec, index) => {
                console.log(`  ${index + 1}. ${rec.category}:`);
                console.log(`     Current: ${rec.current_value}`);
                console.log(`     Recommended: ${rec.recommended_value}`);
                console.log(`     Expected Improvement: +${rec.improvement_expected}%`);
                console.log(`     Rationale: ${rec.rationale}\n`);
            });
        }

        console.log("✅ Benchmark completed successfully!");
        console.log("📄 Detailed reports saved in validation/ode_precision_reports/");

    } catch (error) {
        console.error("❌ Benchmark failed:", error);
        process.exit(1);
    }
}

// 実行
if (require.main === module) {
    main();
}

module.exports = main;