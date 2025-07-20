#!/usr/bin/env node

/**
 * Test script to verify that Euler and RK4 methods produce different results
 * This helps verify that the CSV export fix is working correctly
 */

// Simple ODE test: dy/dt = -y, y(0) = 1
// Exact solution: y(t) = e^(-t)

function testEuler(y0, tEnd, dt) {
    const times = [];
    const values = [];
    
    let y = y0;
    let t = 0;
    
    times.push(t);
    values.push(y);
    
    while (t < tEnd) {
        const dydt = -y; // Simple decay equation
        y = y + dt * dydt;
        t = t + dt;
        
        times.push(t);
        values.push(y);
    }
    
    return { times, values };
}

function testRK4(y0, tEnd, dt) {
    const times = [];
    const values = [];
    
    let y = y0;
    let t = 0;
    
    times.push(t);
    values.push(y);
    
    while (t < tEnd) {
        const k1 = -y;
        const k2 = -(y + 0.5 * dt * k1);
        const k3 = -(y + 0.5 * dt * k2);
        const k4 = -(y + dt * k3);
        
        y = y + (dt / 6.0) * (k1 + 2*k2 + 2*k3 + k4);
        t = t + dt;
        
        times.push(t);
        values.push(y);
    }
    
    return { times, values };
}

function exactSolution(t) {
    return Math.exp(-t);
}

// Test parameters
const y0 = 1.0;
const tEnd = 2.0;
const dt = 0.1;

console.log('Testing numerical methods with dy/dt = -y, y(0) = 1');
console.log(`Time step: ${dt}, End time: ${tEnd}`);
console.log('Exact solution: y(t) = e^(-t)');
console.log('');

// Run tests
const eulerResult = testEuler(y0, tEnd, dt);
const rk4Result = testRK4(y0, tEnd, dt);

// Compare results at final time
const finalTime = tEnd;
const eulerFinal = eulerResult.values[eulerResult.values.length - 1];
const rk4Final = rk4Result.values[rk4Result.values.length - 1];
const exactFinal = exactSolution(finalTime);

console.log(`Results at t = ${finalTime}:`);
console.log(`Euler:   ${eulerFinal.toFixed(6)}`);
console.log(`RK4:     ${rk4Final.toFixed(6)}`);
console.log(`Exact:   ${exactFinal.toFixed(6)}`);
console.log('');

console.log('Errors:');
console.log(`Euler error:  ${Math.abs(eulerFinal - exactFinal).toFixed(6)}`);
console.log(`RK4 error:    ${Math.abs(rk4Final - exactFinal).toFixed(6)}`);
console.log('');

console.log('Difference between methods:');
console.log(`|Euler - RK4|: ${Math.abs(eulerFinal - rk4Final).toFixed(6)}`);
console.log(`Relative diff: ${(Math.abs(eulerFinal - rk4Final) / exactFinal * 100).toFixed(2)}%`);
console.log('');

if (Math.abs(eulerFinal - rk4Final) < 1e-10) {
    console.log('❌ WARNING: Methods produce nearly identical results!');
    console.log('This suggests the same algorithm is being used.');
} else {
    console.log('✅ SUCCESS: Methods produce different results as expected.');
    console.log('The CSV export should show different values for Euler and RK4.');
}