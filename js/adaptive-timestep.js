/**
 * Adaptive Time Step Controller for Pharmacokinetic Simulations
 * Implements event-driven adaptive time stepping with high precision at critical events
 * 
 * Features:
 * - Event-driven time step control
 * - Step-doubling error estimation
 * - Pharmacokinetic-specific event detection
 * - Memory optimization through interpolation
 */

class AdaptiveTimeStepController {
    constructor(settings = {}) {
        // Time step bounds
        this.minStep = settings.minStep || 0.001;    // 0.06 seconds
        this.maxStep = settings.maxStep || 1.0;      // 1 minute
        this.defaultStep = settings.defaultStep || 0.1; // 6 seconds
        
        // Error tolerances
        this.tolerances = {
            concentration: settings.concentrationTolerance || 0.001,  // 0.1% relative error
            rate_of_change: settings.rateOfChangeTolerance || 0.01,   // 1%/min
            absolute: settings.absoluteTolerance || 1e-6              // Absolute error floor
        };
        
        // Safety factor for step size adjustment
        this.safetyFactor = settings.safetyFactor || 0.9;
        
        // Event detection parameters
        this.eventDetection = {
            bolusPreRefinement: 5,      // seconds before bolus
            bolusPostDuration: 30,      // seconds of high precision after bolus
            infusionChangePreRefinement: 2,  // seconds before rate change
            infusionChangePostDuration: 10,  // seconds of high precision after change
            awakeningThreshold: 1.2,    // multiplier for awakening detection
            awakeningPrecision: 0.01    // time step during awakening approach
        };
        
        // Clinical importance thresholds
        this.clinicalThresholds = {
            sedationTarget: 3.0,        // μg/mL
            awakeningTarget: 1.5,       // μg/mL
            criticalRange: 0.5          // μg/mL range for high precision
        };
        
        // Performance tracking
        this.stats = {
            totalSteps: 0,
            acceptedSteps: 0,
            rejectedSteps: 0,
            eventCount: 0,
            interpolationCount: 0
        };
        
        // Current state
        this.currentEvents = [];
        this.lastEventTime = -Infinity;
        this.inEventWindow = false;
    }

    /**
     * Initialize with event list
     */
    initialize(events) {
        this.currentEvents = [...events].sort((a, b) => a.time - b.time);
        this.stats = {
            totalSteps: 0,
            acceptedSteps: 0,
            rejectedSteps: 0,
            eventCount: 0,
            interpolationCount: 0
        };
        console.log(`Adaptive time step controller initialized with ${this.currentEvents.length} events`);
    }

    /**
     * Determine optimal time step based on current state and events
     */
    determineOptimalTimeStep(currentTime, state, nextEventTime = null) {
        // 1. Check event proximity
        const eventProximity = this.checkEventProximity(currentTime, nextEventTime);
        
        // 2. Calculate concentration change rate
        const changeRate = this.calculateChangeRate(state);
        
        // 3. Assess clinical importance
        const clinicalImportance = this.assessClinicalImportance(state);
        
        // 4. Compute optimal time step
        const optimalStep = this.computeTimeStep(eventProximity, changeRate, clinicalImportance);
        
        return Math.max(this.minStep, Math.min(optimalStep, this.maxStep));
    }

    /**
     * Check proximity to events and adjust time step accordingly
     */
    checkEventProximity(currentTime, nextEventTime) {
        if (nextEventTime === null) {
            return { nearEvent: false, timeToEvent: Infinity, eventType: null };
        }
        
        const timeToEvent = nextEventTime - currentTime;
        
        // Determine event type and required precision
        const upcomingEvent = this.currentEvents.find(e => e.time === nextEventTime);
        const eventType = upcomingEvent ? upcomingEvent.type : 'unknown';
        
        let requiredStep = this.defaultStep;
        let nearEvent = false;
        
        switch (eventType) {
            case 'bolus':
                if (timeToEvent <= this.eventDetection.bolusPreRefinement / 60) {
                    requiredStep = 0.001;
                    nearEvent = true;
                }
                break;
            case 'infusion_rate_change':
                if (timeToEvent <= this.eventDetection.infusionChangePreRefinement / 60) {
                    requiredStep = 0.01;
                    nearEvent = true;
                }
                break;
            case 'infusion_stop':
                if (timeToEvent <= this.eventDetection.infusionChangePreRefinement / 60) {
                    requiredStep = 0.01;
                    nearEvent = true;
                }
                break;
        }
        
        // Don't overshoot the event
        if (timeToEvent > 0) {
            requiredStep = Math.min(requiredStep, timeToEvent);
        }
        
        return { nearEvent, timeToEvent, eventType, requiredStep };
    }

    /**
     * Calculate concentration change rate
     */
    calculateChangeRate(state) {
        const { plasmaConc, effectSiteConc, ke0 } = state;
        
        // Calculate dCe/dt
        const dCedt = Math.abs(ke0 * (plasmaConc - effectSiteConc));
        
        // Calculate relative change rate
        const relativeChangeRate = dCedt / Math.max(effectSiteConc, 0.1);
        
        return {
            absoluteChangeRate: dCedt,
            relativeChangeRate: relativeChangeRate,
            isRapidChange: relativeChangeRate > 0.1  // 10% change per minute
        };
    }

    /**
     * Assess clinical importance of current state
     */
    assessClinicalImportance(state) {
        const { effectSiteConc } = state;
        
        let importance = 'normal';
        let precisionMultiplier = 1.0;
        
        // Check proximity to clinical thresholds
        const distanceToSedation = Math.abs(effectSiteConc - this.clinicalThresholds.sedationTarget);
        const distanceToAwakening = Math.abs(effectSiteConc - this.clinicalThresholds.awakeningTarget);
        
        if (distanceToSedation < this.clinicalThresholds.criticalRange) {
            importance = 'critical_sedation';
            precisionMultiplier = 0.1;
        } else if (distanceToAwakening < this.clinicalThresholds.criticalRange) {
            importance = 'critical_awakening';
            precisionMultiplier = 0.1;
        } else if (effectSiteConc < this.clinicalThresholds.awakeningTarget * this.eventDetection.awakeningThreshold) {
            importance = 'approaching_awakening';
            precisionMultiplier = 0.5;
        }
        
        return { importance, precisionMultiplier };
    }

    /**
     * Compute time step based on all factors
     */
    computeTimeStep(eventProximity, changeRate, clinicalImportance) {
        let timeStep = this.defaultStep;
        
        // Apply event proximity constraints
        if (eventProximity.nearEvent) {
            timeStep = Math.min(timeStep, eventProximity.requiredStep);
        }
        
        // Apply change rate constraints
        if (changeRate.isRapidChange) {
            const changeBasedStep = this.tolerances.concentration / changeRate.relativeChangeRate;
            timeStep = Math.min(timeStep, changeBasedStep);
        }
        
        // Apply clinical importance constraints
        timeStep *= clinicalImportance.precisionMultiplier;
        
        return timeStep;
    }

    /**
     * Estimate local truncation error using step-doubling method
     */
    estimateError(currentState, timeStep, updateFunction) {
        this.stats.totalSteps++;
        
        // Single step
        const state1 = updateFunction(currentState, timeStep);
        
        // Double step (two half-steps)
        const halfStep = timeStep / 2;
        const stateHalf = updateFunction(currentState, halfStep);
        const state2 = updateFunction(stateHalf, halfStep);
        
        // Calculate error for each state variable
        const errors = [];
        const stateVars = ['plasmaConc', 'effectSiteConc', 'a1', 'a2', 'a3'];
        
        for (const variable of stateVars) {
            if (state1[variable] !== undefined && state2[variable] !== undefined) {
                const val1 = state1[variable];
                const val2 = state2[variable];
                const scale = Math.abs(val1) + Math.abs(val2) + this.tolerances.absolute;
                const error = Math.abs(val1 - val2) / scale;
                errors.push(error);
            }
        }
        
        // Return maximum relative error
        const maxError = Math.max(...errors) / 15; // RK4 error correction factor
        
        return {
            error: maxError,
            preferredState: state2, // Higher precision result
            success: maxError <= this.tolerances.concentration
        };
    }

    /**
     * Adjust time step based on error estimation
     */
    adjustTimeStep(currentStep, error) {
        const tolerance = this.tolerances.concentration;
        const order = 4; // RK4 order
        
        // Calculate new step size
        const ratio = Math.pow(tolerance / (error + 1e-15), 1 / (order + 1));
        const newStep = currentStep * this.safetyFactor * ratio;
        
        // Apply bounds
        return Math.max(this.minStep, Math.min(newStep, this.maxStep));
    }

    /**
     * Check if step should be accepted
     */
    shouldAcceptStep(error) {
        const accept = error <= this.tolerances.concentration;
        
        if (accept) {
            this.stats.acceptedSteps++;
        } else {
            this.stats.rejectedSteps++;
        }
        
        return accept;
    }

    /**
     * Interpolate state at specific time point
     */
    interpolateState(t1, state1, t2, state2, targetTime) {
        this.stats.interpolationCount++;
        
        if (targetTime === t1) return state1;
        if (targetTime === t2) return state2;
        
        const alpha = (targetTime - t1) / (t2 - t1);
        const interpolatedState = {};
        
        // Linear interpolation for all numeric properties
        for (const key in state1) {
            if (typeof state1[key] === 'number' && typeof state2[key] === 'number') {
                interpolatedState[key] = state1[key] + alpha * (state2[key] - state1[key]);
            } else {
                interpolatedState[key] = state1[key];
            }
        }
        
        return interpolatedState;
    }

    /**
     * Process events at specific time
     */
    processEvents(currentTime, currentState, events) {
        let processedState = { ...currentState };
        let eventsProcessed = 0;
        
        for (const event of events) {
            if (Math.abs(event.time - currentTime) < 1e-10) {
                switch (event.type) {
                    case 'bolus':
                        // Add bolus dose to central compartment
                        processedState.a1 += event.dose;
                        processedState.plasmaConc = processedState.a1 / event.V1;
                        eventsProcessed++;
                        console.log(`Processed bolus: ${event.dose} mg at ${currentTime.toFixed(3)} min`);
                        break;
                    
                    case 'infusion_rate_change':
                        // Infusion rate change will be handled by the engine
                        eventsProcessed++;
                        console.log(`Processed infusion rate change: ${event.newRate} mg/kg/hr at ${currentTime.toFixed(3)} min`);
                        break;
                    
                    case 'infusion_stop':
                        eventsProcessed++;
                        console.log(`Processed infusion stop at ${currentTime.toFixed(3)} min`);
                        break;
                }
            }
        }
        
        this.stats.eventCount += eventsProcessed;
        
        return {
            state: processedState,
            eventsProcessed: eventsProcessed
        };
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        const acceptanceRate = this.stats.totalSteps > 0 ? 
            (this.stats.acceptedSteps / this.stats.totalSteps) * 100 : 0;
        
        return {
            ...this.stats,
            acceptanceRate: acceptanceRate,
            efficiencyRatio: this.stats.acceptedSteps > 0 ? 
                this.stats.acceptedSteps / (this.stats.acceptedSteps + this.stats.rejectedSteps) : 0
        };
    }

    /**
     * Reset controller state
     */
    reset() {
        this.currentEvents = [];
        this.lastEventTime = -Infinity;
        this.inEventWindow = false;
        this.stats = {
            totalSteps: 0,
            acceptedSteps: 0,
            rejectedSteps: 0,
            eventCount: 0,
            interpolationCount: 0
        };
    }
}

/**
 * Adaptive Time Step Solver for Pharmacokinetic Simulations
 */
class AdaptiveTimeStepSolver {
    constructor(controller) {
        this.controller = controller;
        this.outputInterval = 0.1; // Default output interval in minutes
    }

    /**
     * Solve pharmacokinetic system with adaptive time stepping
     */
    solve(initialState, events, duration, updateFunction, outputInterval = null) {
        this.outputInterval = outputInterval || this.outputInterval;
        
        // Initialize controller
        this.controller.initialize(events);
        
        let currentTime = 0;
        let currentState = { ...initialState };
        let timeStep = this.controller.defaultStep;
        
        const results = [];
        const eventQueue = [...events];
        let nextOutputTime = 0;
        
        // Add initial state
        results.push({
            time: currentTime,
            state: { ...currentState },
            timeStep: timeStep
        });
        
        while (currentTime < duration) {
            // Find next event
            const nextEvent = eventQueue.find(e => e.time > currentTime);
            const nextEventTime = nextEvent ? nextEvent.time : null;
            
            // Determine optimal time step
            const proposedStep = this.controller.determineOptimalTimeStep(
                currentTime, 
                currentState, 
                nextEventTime
            );
            
            timeStep = Math.min(proposedStep, duration - currentTime);
            
            // Don't overshoot events
            if (nextEventTime && currentTime + timeStep > nextEventTime) {
                timeStep = nextEventTime - currentTime;
            }
            
            // Adaptive step with error control
            let stepAccepted = false;
            let attempts = 0;
            const maxAttempts = 10;
            
            while (!stepAccepted && attempts < maxAttempts) {
                attempts++;
                
                // Estimate error
                const errorEstimate = this.controller.estimateError(
                    currentState, 
                    timeStep, 
                    updateFunction
                );
                
                // Check if step should be accepted
                stepAccepted = this.controller.shouldAcceptStep(errorEstimate.error);
                
                if (stepAccepted) {
                    // Accept step
                    currentTime += timeStep;
                    currentState = errorEstimate.preferredState;
                    
                    // Process events at current time
                    const eventsAtCurrentTime = events.filter(e => 
                        Math.abs(e.time - currentTime) < 1e-10
                    );
                    
                    if (eventsAtCurrentTime.length > 0) {
                        const eventResult = this.controller.processEvents(
                            currentTime, 
                            currentState, 
                            eventsAtCurrentTime
                        );
                        currentState = eventResult.state;
                    }
                    
                    // Adjust time step for next iteration
                    timeStep = this.controller.adjustTimeStep(timeStep, errorEstimate.error);
                    
                } else {
                    // Reject step and try smaller step
                    timeStep = this.controller.adjustTimeStep(timeStep, errorEstimate.error);
                    
                    if (timeStep < this.controller.minStep) {
                        console.warn(`Time step below minimum at t=${currentTime.toFixed(6)}`);
                        break;
                    }
                }
            }
            
            if (attempts >= maxAttempts) {
                console.error(`Maximum attempts reached at t=${currentTime.toFixed(6)}`);
                break;
            }
            
            // Store results at output intervals
            while (nextOutputTime <= currentTime && nextOutputTime <= duration) {
                if (nextOutputTime === currentTime) {
                    results.push({
                        time: nextOutputTime,
                        state: { ...currentState },
                        timeStep: timeStep
                    });
                } else {
                    // Interpolate state at output time
                    const prevResult = results[results.length - 1];
                    const interpolatedState = this.controller.interpolateState(
                        prevResult.time,
                        prevResult.state,
                        currentTime,
                        currentState,
                        nextOutputTime
                    );
                    
                    results.push({
                        time: nextOutputTime,
                        state: interpolatedState,
                        timeStep: timeStep,
                        interpolated: true
                    });
                }
                
                nextOutputTime += this.outputInterval;
            }
        }
        
        return {
            results: results,
            stats: this.controller.getPerformanceStats()
        };
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.AdaptiveTimeStepController = AdaptiveTimeStepController;
    window.AdaptiveTimeStepSolver = AdaptiveTimeStepSolver;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        AdaptiveTimeStepController, 
        AdaptiveTimeStepSolver 
    };
}