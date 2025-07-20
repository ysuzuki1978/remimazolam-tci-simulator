#!/usr/bin/env node

/**
 * Engine Comparison Test Script
 * 
 * Purpose: Compare calculation results across three engines under identical conditions
 * Conditions: 7mg bolus + 1.0mg/kg/hr continuous, 50-year-old 70kg patient
 */

// Import required modules
const { MasuiKe0Calculator } = require('./utils/masui-ke0-calculator.js');
const { Patient, DoseEvent, SexType, AsapsType } = require('./js/models.js');
const { InductionEngine } = require('./js/induction-engine.js');
const { AdvancedProtocolEngine } = require('./js/advanced-protocol-engine.js');
const { MonitoringEngine } = require('./js/monitoring-engine.js');

// Mock global performance object for Node.js environment
if (typeof performance === 'undefined') {
    global.performance = {
        now: () => Date.now()
    };
}

console.log('='.repeat(80));
console.log('ENGINE COMPARISON TEST - DEBUGGING INVESTIGATION');
console.log('='.repeat(80));
console.log('Conditions: 7mg bolus + 1.0mg/kg/hr continuous');
console.log('Patient: 50 years old, 70kg, 170cm, Male, ASA I-II');
console.log('Target: Find why MonitoringEngine shows ~2x higher concentration at t=2min');
console.log('='.repeat(80));

// Test conditions
const TEST_CONDITIONS = {
    age: 50,
    weight: 70,
    height: 170,
    sex: SexType.MALE,
    asaPS: AsapsType.CLASS_1_2,
    bolusDose: 7.0,     // mg
    continuousDose: 1.0  // mg/kg/hr
};

// Create test patient
const patient = new Patient(
    'TEST_PATIENT_001',
    TEST_CONDITIONS.age,
    TEST_CONDITIONS.weight,
    TEST_CONDITIONS.height,
    TEST_CONDITIONS.sex,
    TEST_CONDITIONS.asaPS
);

console.log(`\nPatient created: ${patient.id}`);
console.log(`  Age: ${patient.age} years`);
console.log(`  Weight: ${patient.weight} kg`);
console.log(`  Height: ${patient.height} cm`);
console.log(`  Sex: ${SexType.displayName(patient.sex)}`);
console.log(`  ASA-PS: ${AsapsType.displayName(patient.asaPS)}`);

async function testInductionEngine() {
    console.log('\n' + '='.repeat(60));
    console.log('[INDUCTION ENGINE TEST]');
    console.log('='.repeat(60));
    
    const engine = new InductionEngine();
    
    try {
        // Start simulation
        engine.start(patient, TEST_CONDITIONS.bolusDose, TEST_CONDITIONS.continuousDose);
        
        // Wait for approximately 2 minutes simulation time
        console.log('Running simulation for 2 minutes...');
        
        // Let the engine run for a bit to accumulate time
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 seconds real time
        
        // Get current state
        const state = engine.getState();
        console.log('\n[INDUCTION ENGINE RESULTS at simulation time ~2min]');
        console.log(`  Elapsed time: ${state.elapsedTimeString}`);
        console.log(`  RK4 Plasma concentration: ${state.rk4.plasmaConcentration.toFixed(6)} μg/mL`);
        console.log(`  RK4 Effect-site concentration: ${state.rk4.effectSiteConcentration.toFixed(6)} μg/mL`);
        console.log(`  Euler Plasma concentration: ${state.euler.plasmaConcentration.toFixed(6)} μg/mL`);
        console.log(`  Euler Effect-site concentration: ${state.euler.effectSiteConcentration.toFixed(6)} μg/mL`);
        
        engine.stop();
        
    } catch (error) {
        console.error('InductionEngine test failed:', error);
    }
}

async function testAdvancedProtocolEngine() {
    console.log('\n' + '='.repeat(60));
    console.log('[ADVANCED PROTOCOL ENGINE TEST]');
    console.log('='.repeat(60));
    
    const engine = new AdvancedProtocolEngine();
    
    try {
        // Set patient
        engine.setPatient(patient);
        
        // Optimize protocol (this will run the simulation internally)
        const targetCe = 1.0; // Target concentration
        const result = engine.optimizeBolusProtocol(targetCe, TEST_CONDITIONS.bolusDose);
        
        console.log('\n[ADVANCED PROTOCOL ENGINE RESULTS]');
        console.log(`  Optimal continuous rate: ${result.optimization.optimalRate.toFixed(3)} mg/kg/hr`);
        console.log(`  Predicted Ce at target time: ${result.optimization.predictedConcentration.toFixed(6)} μg/mL`);
        
        // Get 2-minute data point from time series if available
        const chartData = engine.getChartData();
        if (chartData && chartData.times) {
            const twoMinIndex = chartData.times.findIndex(t => Math.abs(t - 2.0) < 0.1);
            if (twoMinIndex >= 0) {
                console.log(`  Plasma concentration at t=2min: ${chartData.plasmaConcentrations[twoMinIndex].toFixed(6)} μg/mL`);
                console.log(`  Effect-site concentration at t=2min: ${chartData.effectSiteConcentrations[twoMinIndex].toFixed(6)} μg/mL`);
            }
        }
        
    } catch (error) {
        console.error('AdvancedProtocolEngine test failed:', error);
    }
}

async function testMonitoringEngine() {
    console.log('\n' + '='.repeat(60));
    console.log('[MONITORING ENGINE TEST]');
    console.log('='.repeat(60));
    
    const engine = new MonitoringEngine();
    
    try {
        // Set patient
        engine.setPatient(patient);
        
        // Add dose events
        const bolusEvent = new DoseEvent(0, TEST_CONDITIONS.bolusDose, 0);
        const continuousEvent = new DoseEvent(0, 0, TEST_CONDITIONS.continuousDose);
        
        engine.addDoseEvent(bolusEvent);
        engine.addDoseEvent(continuousEvent);
        
        console.log('Dose events added:');
        console.log(`  Bolus: ${bolusEvent.bolusMg}mg at t=0`);
        console.log(`  Continuous: ${continuousEvent.continuousMgKgHr}mg/kg/hr starting at t=0`);
        
        // Run simulation for 5 minutes
        const result = engine.runSimulation(5);
        
        console.log('\n[MONITORING ENGINE RESULTS]');
        console.log(`  Max plasma concentration: ${result.maxPlasmaConcentration.toFixed(6)} μg/mL`);
        console.log(`  Max effect-site concentration: ${result.maxEffectSiteConcentration.toFixed(6)} μg/mL`);
        
        // Find 2-minute time point
        const twoMinPoint = result.timePoints.find(tp => Math.abs(tp.timeInMinutes - 2) < 0.1);
        if (twoMinPoint) {
            console.log(`  Plasma concentration at t=2min: ${twoMinPoint.plasmaConcentration.toFixed(6)} μg/mL`);
            console.log(`  Effect-site concentration at t=2min: ${twoMinPoint.effectSiteConcentration.toFixed(6)} μg/mL`);
        } else {
            console.log('  No exact 2-minute time point found in results');
            // Show closest points
            const closestPoints = result.timePoints
                .filter(tp => tp.timeInMinutes >= 1.8 && tp.timeInMinutes <= 2.2)
                .sort((a, b) => Math.abs(a.timeInMinutes - 2) - Math.abs(b.timeInMinutes - 2));
            
            if (closestPoints.length > 0) {
                console.log('  Closest time points to t=2min:');
                closestPoints.slice(0, 3).forEach(tp => {
                    console.log(`    t=${tp.timeInMinutes}min: Plasma=${tp.plasmaConcentration.toFixed(6)}, Effect=${tp.effectSiteConcentration.toFixed(6)} μg/mL`);
                });
            }
        }
        
    } catch (error) {
        console.error('MonitoringEngine test failed:', error);
        console.error('Error stack:', error.stack);
    }
}

// Main test execution
async function runAllTests() {
    console.log('\nStarting engine comparison tests...\n');
    
    // Test each engine
    await testInductionEngine();
    await testAdvancedProtocolEngine();
    await testMonitoringEngine();
    
    console.log('\n' + '='.repeat(80));
    console.log('ENGINE COMPARISON TEST COMPLETED');
    console.log('='.repeat(80));
    console.log('Please review the debug logs above to identify differences in:');
    console.log('  1. V1 values between engines');
    console.log('  2. Bolus dose application methods');
    console.log('  3. Continuous infusion rate calculations');
    console.log('  4. PK parameter consistency');
    console.log('  5. Numerical integration implementations');
    console.log('='.repeat(80));
}

// Error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run the tests
runAllTests().catch(console.error);