/**
 * Structured Error Logging System for Medical Calculations
 * Remimazolam TCI TIVA V1.3.0
 * 
 * Provides comprehensive error tracking, categorization, and reporting
 * for medical calculation engines with contextual information.
 */

// Error severity levels
const ErrorSeverity = {
    CRITICAL: 'CRITICAL',    // System failure, calculation impossible
    HIGH: 'HIGH',           // Calculation error, fallback required
    MEDIUM: 'MEDIUM',       // Validation warning, may affect accuracy
    LOW: 'LOW',             // Minor issue, informational
    INFO: 'INFO'            // Diagnostic information
};

// Error categories for medical calculations
const ErrorCategory = {
    PHARMACOKINETIC: 'PHARMACOKINETIC',     // PK model calculation errors
    VALIDATION: 'VALIDATION',               // Input/parameter validation
    NUMERICAL: 'NUMERICAL',                 // Numerical integration/solver issues
    PROTOCOL: 'PROTOCOL',                   // TCI protocol generation errors
    SYSTEM: 'SYSTEM',                       // System/infrastructure errors
    SAFETY: 'SAFETY'                        // Medical safety threshold violations
};

// Error sources within the application
const ErrorSource = {
    MASUI_KE0_CALCULATOR: 'MasuiKe0Calculator',
    PROTOCOL_ENGINE: 'ProtocolEngine',
    ADVANCED_PROTOCOL_ENGINE: 'AdvancedProtocolEngine',
    ENHANCED_PROTOCOL_ENGINE: 'EnhancedProtocolEngine',
    INDUCTION_ENGINE: 'InductionEngine',
    MONITORING_ENGINE: 'MonitoringEngine',
    LSODA_SOLVER: 'LSODASolver',
    VHAC_ALGORITHM: 'VHACAlgorithm',
    PATIENT_MODEL: 'PatientModel',
    MAIN_CONTROLLER: 'MainController'
};

/**
 * Structured error report for medical calculations
 */
class MedicalErrorReport {
    constructor(
        severity, 
        category, 
        source, 
        message, 
        medicalContext = {},
        technicalDetails = {},
        timestamp = new Date()
    ) {
        this.id = this.generateErrorId();
        this.timestamp = timestamp;
        this.severity = severity;
        this.category = category;
        this.source = source;
        this.message = message;
        this.medicalContext = medicalContext;
        this.technicalDetails = technicalDetails;
        this.resolved = false;
        this.fallbackApplied = false;
    }

    generateErrorId() {
        return `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get formatted error report for display
     */
    getFormattedReport() {
        return {
            id: this.id,
            timestamp: this.timestamp.toISOString(),
            severity: this.severity,
            category: this.category,
            source: this.source,
            message: this.message,
            medicalContext: this.medicalContext,
            technicalDetails: this.technicalDetails,
            resolved: this.resolved,
            fallbackApplied: this.fallbackApplied
        };
    }

    /**
     * Mark error as resolved
     */
    markResolved(resolution = null) {
        this.resolved = true;
        if (resolution) {
            this.technicalDetails.resolution = resolution;
        }
    }

    /**
     * Mark fallback as applied
     */
    markFallbackApplied(fallbackMethod = null) {
        this.fallbackApplied = true;
        if (fallbackMethod) {
            this.technicalDetails.fallbackMethod = fallbackMethod;
        }
    }
}

/**
 * Medical calculation error logger with structured reporting
 */
class MedicalErrorLogger {
    constructor() {
        this.errors = [];
        this.maxErrors = 1000; // Limit memory usage
        this.listeners = [];
        this.isEnabled = true;
        this.debugMode = false;
        
        // Initialize error statistics
        this.statistics = {
            totalErrors: 0,
            bySeverity: Object.fromEntries(Object.values(ErrorSeverity).map(s => [s, 0])),
            byCategory: Object.fromEntries(Object.values(ErrorCategory).map(c => [c, 0])),
            bySource: Object.fromEntries(Object.values(ErrorSource).map(s => [s, 0]))
        };
    }

    /**
     * Log a medical calculation error
     */
    logError(severity, category, source, message, medicalContext = {}, technicalDetails = {}) {
        if (!this.isEnabled) return null;

        // Create error report
        const errorReport = new MedicalErrorReport(
            severity, 
            category, 
            source, 
            message, 
            medicalContext, 
            technicalDetails
        );

        // Add to error list
        this.errors.push(errorReport);
        
        // Maintain size limit
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }

        // Update statistics
        this.updateStatistics(errorReport);

        // Notify listeners
        this.notifyListeners(errorReport);

        // Console output based on severity
        this.logToConsole(errorReport);

        return errorReport;
    }

    /**
     * Log pharmacokinetic calculation error
     */
    logPKError(source, message, patientData = {}, calculationData = {}, originalError = null) {
        const medicalContext = {
            patientId: patientData.id || 'Unknown',
            age: patientData.age,
            weight: patientData.weight,
            height: patientData.height,
            sex: patientData.sex,
            asaPS: patientData.asaPS
        };

        const technicalDetails = {
            calculationData,
            originalError: originalError ? originalError.message : null,
            stack: originalError ? originalError.stack : null
        };

        return this.logError(
            ErrorSeverity.HIGH,
            ErrorCategory.PHARMACOKINETIC,
            source,
            message,
            medicalContext,
            technicalDetails
        );
    }

    /**
     * Log validation error
     */
    logValidationError(source, message, invalidValues = {}, validationRules = {}) {
        const medicalContext = {
            invalidValues,
            validationRules
        };

        return this.logError(
            ErrorSeverity.MEDIUM,
            ErrorCategory.VALIDATION,
            source,
            message,
            medicalContext
        );
    }

    /**
     * Log numerical calculation error
     */
    logNumericalError(source, message, algorithmData = {}, convergenceInfo = {}) {
        const technicalDetails = {
            algorithm: algorithmData.name || 'Unknown',
            parameters: algorithmData.parameters || {},
            convergenceInfo,
            numericalPrecision: algorithmData.precision || 'Unknown'
        };

        const errorReport = this.logError(
            ErrorSeverity.HIGH,
            ErrorCategory.NUMERICAL,
            source,
            message,
            {},
            technicalDetails
        );
        
        // Set resolved and fallback status from convergence info
        if (convergenceInfo.resolved === true) {
            errorReport.markResolved('Fallback method applied successfully');
        }
        if (algorithmData.fallbackApplied === true) {
            errorReport.markFallbackApplied(algorithmData.algorithm || 'RK4');
        }
        
        return errorReport;
    }

    /**
     * Log safety threshold violation
     */
    logSafetyError(source, message, thresholdData = {}, currentValues = {}) {
        const medicalContext = {
            thresholdViolation: thresholdData,
            currentValues,
            safetyImplications: 'Immediate review required'
        };

        return this.logError(
            ErrorSeverity.CRITICAL,
            ErrorCategory.SAFETY,
            source,
            message,
            medicalContext
        );
    }

    /**
     * Get errors by criteria
     */
    getErrors(criteria = {}) {
        let filteredErrors = [...this.errors];

        if (criteria.severity) {
            filteredErrors = filteredErrors.filter(e => e.severity === criteria.severity);
        }
        if (criteria.category) {
            filteredErrors = filteredErrors.filter(e => e.category === criteria.category);
        }
        if (criteria.source) {
            filteredErrors = filteredErrors.filter(e => e.source === criteria.source);
        }
        if (criteria.since) {
            filteredErrors = filteredErrors.filter(e => e.timestamp >= criteria.since);
        }
        if (criteria.unresolved) {
            filteredErrors = filteredErrors.filter(e => !e.resolved);
        }

        return filteredErrors.map(e => e.getFormattedReport());
    }

    /**
     * Get error statistics
     */
    getStatistics() {
        return {
            ...this.statistics,
            recentErrors: this.errors.slice(-10).map(e => ({
                id: e.id,
                timestamp: e.timestamp,
                severity: e.severity,
                category: e.category,
                source: e.source,
                message: e.message
            }))
        };
    }

    /**
     * Clear all errors
     */
    clearErrors() {
        this.errors = [];
        this.statistics = {
            totalErrors: 0,
            bySeverity: Object.fromEntries(Object.values(ErrorSeverity).map(s => [s, 0])),
            byCategory: Object.fromEntries(Object.values(ErrorCategory).map(c => [c, 0])),
            bySource: Object.fromEntries(Object.values(ErrorSource).map(s => [s, 0]))
        };
    }

    /**
     * Export errors for debugging
     */
    exportErrors(format = 'json') {
        const exportData = {
            exportTimestamp: new Date().toISOString(),
            totalErrors: this.errors.length,
            errors: this.errors.map(e => e.getFormattedReport()),
            statistics: this.statistics
        };

        if (format === 'json') {
            return JSON.stringify(exportData, null, 2);
        } else if (format === 'csv') {
            return this.exportToCsv(exportData.errors);
        }
        
        return exportData;
    }

    /**
     * Add error listener
     */
    addListener(callback) {
        this.listeners.push(callback);
    }

    /**
     * Remove error listener
     */
    removeListener(callback) {
        const index = this.listeners.indexOf(callback);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    /**
     * Enable/disable error logging
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
    }

    /**
     * Enable/disable debug mode
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }

    // Private methods

    updateStatistics(errorReport) {
        this.statistics.totalErrors++;
        this.statistics.bySeverity[errorReport.severity]++;
        this.statistics.byCategory[errorReport.category]++;
        this.statistics.bySource[errorReport.source]++;
    }

    notifyListeners(errorReport) {
        this.listeners.forEach(callback => {
            try {
                callback(errorReport);
            } catch (error) {
                console.error('Error in error listener:', error);
            }
        });
    }

    logToConsole(errorReport) {
        const prefix = `[${errorReport.severity}] ${errorReport.category} - ${errorReport.source}:`;
        
        switch (errorReport.severity) {
            case ErrorSeverity.CRITICAL:
                console.error(prefix, errorReport.message, errorReport);
                break;
            case ErrorSeverity.HIGH:
                console.error(prefix, errorReport.message);
                break;
            case ErrorSeverity.MEDIUM:
                console.warn(prefix, errorReport.message);
                break;
            case ErrorSeverity.LOW:
                if (this.debugMode) console.log(prefix, errorReport.message);
                break;
            case ErrorSeverity.INFO:
                if (this.debugMode) console.info(prefix, errorReport.message);
                break;
        }
    }

    exportToCsv(errors) {
        if (errors.length === 0) return '';
        
        const headers = Object.keys(errors[0]).join(',');
        const rows = errors.map(error => 
            Object.values(error).map(value => 
                typeof value === 'object' ? JSON.stringify(value) : value
            ).join(',')
        );
        
        return [headers, ...rows].join('\n');
    }
}

// Global error logger instance
const MedicalErrorLog = new MedicalErrorLogger();

// Export for use in other modules
window.MedicalErrorLogger = MedicalErrorLogger;
window.MedicalErrorReport = MedicalErrorReport;
window.MedicalErrorLog = MedicalErrorLog;
window.ErrorSeverity = ErrorSeverity;
window.ErrorCategory = ErrorCategory;
window.ErrorSource = ErrorSource;