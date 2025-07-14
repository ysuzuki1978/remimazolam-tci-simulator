// Data Models and Constants for Remimazolam TCI TIVA V1.0.0
// Data Model Definitions for Integrated Application

// Enums
const SexType = {
    MALE: 0,
    FEMALE: 1,
    
    displayName(value) {
        return value === this.MALE ? "Male" : "Female";
    }
};

const AsapsType = {
    CLASS_1_2: 0,
    CLASS_3_4: 1,
    
    displayName(value) {
        return value === this.CLASS_1_2 ? "ASA I-II" : "ASA III-IV";
    }
};

// Constants from Masui 2022 Model
const MasuiModelConstants = {
    theta1: 3.57,
    theta2: 11.3,
    theta3: 27.2,
    theta4: 1.03,
    theta5: 1.10,
    theta6: 0.401,
    theta8: 0.308,
    theta9: 0.146,
    theta10: -0.184,
    
    standardWeight: 67.3,
    standardAge: 54.0,
    tPeak: 2.6,
    
    ibwConstant: 45.4,
    ibwHeightCoefficient: 0.89,
    ibwHeightOffset: 152.4,
    ibwGenderCoefficient: 4.5,
    abwCoefficient: 0.4
};

// Validation Limits
const ValidationLimits = {
    Patient: {
        minimumAge: 18,
        maximumAge: 100,
        minimumWeight: 30.0,
        maximumWeight: 200.0,
        minimumHeight: 120.0,
        maximumHeight: 220.0,
        minimumBMI: 12.0,
        maximumBMI: 50.0
    },
    
    Dosing: {
        minimumTime: 0,
        maximumTime: 1440,
        minimumBolus: 0.0,
        maximumBolus: 100.0,
        minimumContinuous: 0.0,
        maximumContinuous: 20.0,
        minimumTargetConcentration: 0.1,
        maximumTargetConcentration: 3.0
    },
    
    Induction: {
        minimumBolusRange: 1.0,
        maximumBolusRange: 15.0,
        minimumContinuousRange: 0.0,
        maximumContinuousRange: 6.0
    }
};

// Patient Class
class Patient {
    constructor(id, age, weight, height, sex, asaPS, anesthesiaStartTime = null) {
        this.id = id;
        this.age = age;
        this.weight = weight;
        this.height = height;
        this.sex = sex;
        this.asaPS = asaPS;
        this.anesthesiaStartTime = anesthesiaStartTime || new Date();
    }
    
    get bmi() {
        return this.weight / Math.pow(this.height / 100, 2);
    }
    
    get idealBodyWeight() {
        return MasuiModelConstants.ibwConstant + 
               MasuiModelConstants.ibwHeightCoefficient * (this.height - MasuiModelConstants.ibwHeightOffset) + 
               MasuiModelConstants.ibwGenderCoefficient * (1 - this.sex);
    }
    
    get adjustedBodyWeight() {
        const ibw = this.idealBodyWeight;
        return ibw + MasuiModelConstants.abwCoefficient * (this.weight - ibw);
    }
    
    minutesToClockTime(minutesFromStart) {
        return new Date(this.anesthesiaStartTime.getTime() + minutesFromStart * 60000);
    }
    
    clockTimeToMinutes(clockTime) {
        let minutesDiff = (clockTime.getTime() - this.anesthesiaStartTime.getTime()) / 60000;
        return minutesDiff;
    }
    
    get formattedStartTime() {
        return this.anesthesiaStartTime.toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }
    
    validate() {
        const errors = [];
        
        if (!this.id || this.id.trim().length === 0) {
            errors.push("Patient ID has not been entered");
        }
        
        if (this.age < ValidationLimits.Patient.minimumAge || this.age > ValidationLimits.Patient.maximumAge) {
            errors.push("Age must be between 18 and 100 years");
        }
        
        if (this.weight < ValidationLimits.Patient.minimumWeight || this.weight > ValidationLimits.Patient.maximumWeight) {
            errors.push("Weight must be between 30kg and 200kg");
        }
        
        if (this.height < ValidationLimits.Patient.minimumHeight || this.height > ValidationLimits.Patient.maximumHeight) {
            errors.push("Height must be between 120cm and 220cm");
        }
        
        if (this.bmi < ValidationLimits.Patient.minimumBMI || this.bmi > ValidationLimits.Patient.maximumBMI) {
            errors.push(`BMI is at an extreme value (calculated value: ${this.bmi.toFixed(1)})`);
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}

// Dose Event Class
class DoseEvent {
    constructor(timeInMinutes, bolusMg, continuousMgKgHr) {
        this.timeInMinutes = timeInMinutes;
        this.bolusMg = bolusMg;
        this.continuousMgKgHr = continuousMgKgHr;
    }
    
    continuousRateMgMin(patient) {
        return (this.continuousMgKgHr * patient.weight) / 60.0;
    }
    
    formattedClockTime(patient) {
        const clockTime = patient.minutesToClockTime(this.timeInMinutes);
        return clockTime.toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }
    
    validate() {
        const errors = [];
        
        if (this.bolusMg < ValidationLimits.Dosing.minimumBolus || this.bolusMg > ValidationLimits.Dosing.maximumBolus) {
            errors.push("Bolus dose must be between 0mg and 100mg");
        }
        
        if (this.continuousMgKgHr < ValidationLimits.Dosing.minimumContinuous || this.continuousMgKgHr > ValidationLimits.Dosing.maximumContinuous) {
            errors.push("Continuous infusion rate must be between 0mg/kg/hr and 20mg/kg/hr");
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}

// PK Parameters Class
class PKParameters {
    constructor(v1, v2, v3, cl, q2, q3, ke0) {
        this.v1 = v1;
        this.v2 = v2;
        this.v3 = v3;
        this.cl = cl;
        this.q2 = q2;
        this.q3 = q3;
        this.ke0 = ke0;
    }
    
    get k10() {
        return this.cl / this.v1;
    }
    
    get k12() {
        return this.q2 / this.v1;
    }
    
    get k21() {
        return this.q2 / this.v2;
    }
    
    get k13() {
        return this.q3 / this.v1;
    }
    
    get k31() {
        return this.q3 / this.v3;
    }
}

// System State Class
class SystemState {
    constructor(a1 = 0.0, a2 = 0.0, a3 = 0.0, ce = 0.0) {
        this.a1 = a1;
        this.a2 = a2;
        this.a3 = a3;
        this.ce = ce;
    }
    
    toVector() {
        return [this.a1, this.a2, this.a3, this.ce];
    }
    
    static fromVector(vector) {
        return new SystemState(vector[0], vector[1], vector[2], vector[3]);
    }
}

// Time Point Class
class TimePoint {
    constructor(timeInMinutes, doseEvent, plasmaConcentration, effectSiteConcentration) {
        this.timeInMinutes = timeInMinutes;
        this.doseEvent = doseEvent;
        this.plasmaConcentration = plasmaConcentration;
        this.effectSiteConcentration = effectSiteConcentration;
    }
    
    get plasmaConcentrationString() {
        return this.plasmaConcentration.toFixed(3);
    }
    
    get effectSiteConcentrationString() {
        return this.effectSiteConcentration.toFixed(3);
    }
    
    formattedClockTime(patient) {
        const clockTime = patient.minutesToClockTime(this.timeInMinutes);
        return clockTime.toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }
}

// Simulation Result Class
class SimulationResult {
    constructor(timePoints, patient = null, doseEvents = null, calculationMethod = "V1.0.0 Integrated Engine", 
                calculatedAt = null, plasmaConcentrations = [], effectSiteConcentrations = [], timeVector = []) {
        this.timePoints = timePoints;
        this.patient = patient;
        this.doseEvents = doseEvents;
        this.calculationMethod = calculationMethod;
        this.calculatedAt = calculatedAt || new Date();
        this.plasmaConcentrations = plasmaConcentrations;
        this.effectSiteConcentrations = effectSiteConcentrations;
        this.timeVector = timeVector;
    }
    
    get maxPlasmaConcentration() {
        if (this.plasmaConcentrations.length > 0) {
            return Math.max(...this.plasmaConcentrations);
        }
        return Math.max(...this.timePoints.map(tp => tp.plasmaConcentration));
    }
    
    get maxEffectSiteConcentration() {
        if (this.effectSiteConcentrations.length > 0) {
            return Math.max(...this.effectSiteConcentrations);
        }
        return Math.max(...this.timePoints.map(tp => tp.effectSiteConcentration));
    }
    
    get simulationDurationMinutes() {
        return this.timePoints.length > 0 ? this.timePoints[this.timePoints.length - 1].timeInMinutes : 0;
    }
    
    toCSV() {
        const csvLines = [];
        
        if (this.patient) {
            const patientInfo = `Patient ID:${this.patient.id},Age:${this.patient.age} years,Weight:${this.patient.weight}kg,Height:${this.patient.height}cm,Sex:${SexType.displayName(this.patient.sex)},ASA-PS:${AsapsType.displayName(this.patient.asaPS)},Start Time:${this.patient.formattedStartTime}`;
            csvLines.push(patientInfo);
            
            csvLines.push("Time,Predicted Plasma Concentration(µg/mL),Predicted Effect-site Concentration(µg/mL)");
            
            for (const tp of this.timePoints) {
                const clockTime = tp.formattedClockTime(this.patient);
                const line = `${clockTime},${tp.plasmaConcentration.toFixed(3)},${tp.effectSiteConcentration.toFixed(3)}`;
                csvLines.push(line);
            }
        } else {
            csvLines.push("Time(min),Predicted Plasma Concentration(µg/mL),Predicted Effect-site Concentration(µg/mL)");
            
            for (const tp of this.timePoints) {
                const line = `${tp.timeInMinutes},${tp.plasmaConcentration.toFixed(3)},${tp.effectSiteConcentration.toFixed(3)}`;
                csvLines.push(line);
            }
        }
        
        return csvLines.join("\n");
    }
}

// Induction Snapshot Class (for App 1)
class InductionSnapshot {
    constructor(timestamp, plasmaConcentration, effectSiteConcentration, elapsedTime, dose) {
        this.timestamp = timestamp;
        this.plasmaConcentration = plasmaConcentration;
        this.effectSiteConcentration = effectSiteConcentration;
        this.elapsedTime = elapsedTime;
        this.dose = dose;
    }
    
    get formattedTime() {
        const hours = Math.floor(this.elapsedTime / 3600);
        const minutes = Math.floor((this.elapsedTime % 3600) / 60);
        const seconds = Math.floor(this.elapsedTime % 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

// Protocol Optimization Result Class (for App 2)
class ProtocolResult {
    constructor(optimalRate, predictedConcentration, protocolSchedule, targetConcentration, timeToTarget) {
        this.optimalRate = optimalRate;
        this.predictedConcentration = predictedConcentration;
        this.protocolSchedule = protocolSchedule;
        this.targetConcentration = targetConcentration;
        this.timeToTarget = timeToTarget;
    }
}

// Global Application State
class AppState {
    constructor() {
        this.patient = null;
        this.isInductionRunning = false;
        this.inductionStartTime = null;
        this.inductionSnapshots = [];
        this.currentInductionState = null;
        this.protocolResult = null;
        this.monitoringEvents = [];
        this.simulationResult = null;
    }
    
    reset() {
        this.patient = null;
        this.isInductionRunning = false;
        this.inductionStartTime = null;
        this.inductionSnapshots = [];
        this.currentInductionState = null;
        this.protocolResult = null;
        this.monitoringEvents = [];
        this.simulationResult = null;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.SexType = SexType;
    window.AsapsType = AsapsType;
    window.MasuiModelConstants = MasuiModelConstants;
    window.ValidationLimits = ValidationLimits;
    window.Patient = Patient;
    window.DoseEvent = DoseEvent;
    window.PKParameters = PKParameters;
    window.SystemState = SystemState;
    window.TimePoint = TimePoint;
    window.SimulationResult = SimulationResult;
    window.InductionSnapshot = InductionSnapshot;
    window.ProtocolResult = ProtocolResult;
    window.AppState = AppState;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SexType,
        AsapsType, 
        MasuiModelConstants,
        ValidationLimits,
        Patient,
        DoseEvent,
        PKParameters,
        SystemState,
        TimePoint,
        SimulationResult,
        InductionSnapshot,
        ProtocolResult,
        AppState
    };
}