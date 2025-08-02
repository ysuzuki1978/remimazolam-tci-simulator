/**
 * Error Display and Debugging Interface
 * Remimazolam TCI TIVA V1.0.0
 * 
 * Provides user interface for viewing and managing medical calculation errors
 */

class ErrorDisplayInterface {
    constructor() {
        this.isVisible = false;
        this.errorContainer = null;
        this.setupInterface();
        this.setupErrorListener();
    }

    setupInterface() {
        // Create error display container
        this.errorContainer = document.createElement('div');
        this.errorContainer.id = 'errorDisplayContainer';
        this.errorContainer.className = 'error-display-container hidden';
        
        this.errorContainer.innerHTML = `
            <div class="error-display-header">
                <h3>🔍 Error Diagnostics</h3>
                <div class="error-controls">
                    <button id="clearErrorsBtn" class="btn btn-secondary">Clear All</button>
                    <button id="exportErrorsBtn" class="btn btn-secondary">Export</button>
                    <button id="closeErrorsBtn" class="btn btn-secondary">×</button>
                </div>
            </div>
            <div class="error-display-content">
                <div class="error-filters">
                    <select id="severityFilter">
                        <option value="">All Severities</option>
                        <option value="CRITICAL">Critical</option>
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                        <option value="INFO">Info</option>
                    </select>
                    <select id="categoryFilter">
                        <option value="">All Categories</option>
                        <option value="PHARMACOKINETIC">Pharmacokinetic</option>
                        <option value="VALIDATION">Validation</option>
                        <option value="NUMERICAL">Numerical</option>
                        <option value="PROTOCOL">Protocol</option>
                        <option value="SYSTEM">System</option>
                        <option value="SAFETY">Safety</option>
                    </select>
                </div>
                <div class="error-statistics" id="errorStatistics"></div>
                <div class="error-list" id="errorList"></div>
            </div>
        `;

        // Add to document
        document.body.appendChild(this.errorContainer);
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Add CSS styles
        this.addStyles();
    }

    setupEventListeners() {
        document.getElementById('clearErrorsBtn').addEventListener('click', () => {
            this.clearErrors();
        });

        document.getElementById('exportErrorsBtn').addEventListener('click', () => {
            this.exportErrors();
        });

        document.getElementById('closeErrorsBtn').addEventListener('click', () => {
            this.hide();
        });

        document.getElementById('severityFilter').addEventListener('change', () => {
            this.refreshDisplay();
        });

        document.getElementById('categoryFilter').addEventListener('change', () => {
            this.refreshDisplay();
        });
    }

    setupErrorListener() {
        if (typeof MedicalErrorLog !== 'undefined') {
            MedicalErrorLog.addListener((errorReport) => {
                this.updateErrorCount();
                if (this.isVisible) {
                    this.refreshDisplay();
                }
            });
        }
    }

    show() {
        this.isVisible = true;
        this.errorContainer.classList.remove('hidden');
        this.refreshDisplay();
    }

    hide() {
        this.isVisible = false;
        this.errorContainer.classList.add('hidden');
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    refreshDisplay() {
        if (typeof MedicalErrorLog === 'undefined') {
            document.getElementById('errorList').innerHTML = '<p>Error logging system not available</p>';
            return;
        }

        const severityFilter = document.getElementById('severityFilter').value;
        const categoryFilter = document.getElementById('categoryFilter').value;

        const criteria = {};
        if (severityFilter) criteria.severity = severityFilter;
        if (categoryFilter) criteria.category = categoryFilter;

        const errors = MedicalErrorLog.getErrors(criteria);
        const statistics = MedicalErrorLog.getStatistics();

        this.displayStatistics(statistics);
        this.displayErrors(errors);
    }

    displayStatistics(statistics) {
        const statsContainer = document.getElementById('errorStatistics');
        
        const criticalCount = statistics.bySeverity.CRITICAL || 0;
        const highCount = statistics.bySeverity.HIGH || 0;
        const totalCount = statistics.totalErrors || 0;

        statsContainer.innerHTML = `
            <div class="stats-grid">
                <div class="stat-item ${criticalCount > 0 ? 'critical' : ''}">
                    <span class="stat-label">Critical</span>
                    <span class="stat-value">${criticalCount}</span>
                </div>
                <div class="stat-item ${highCount > 0 ? 'high' : ''}">
                    <span class="stat-label">High</span>
                    <span class="stat-value">${highCount}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Total</span>
                    <span class="stat-value">${totalCount}</span>
                </div>
            </div>
        `;
    }

    displayErrors(errors) {
        const errorList = document.getElementById('errorList');
        
        if (errors.length === 0) {
            errorList.innerHTML = '<p class="no-errors">No errors found</p>';
            return;
        }

        const errorHTML = errors.map(error => this.formatError(error)).join('');
        errorList.innerHTML = errorHTML;
    }

    formatError(error) {
        const severityClass = error.severity.toLowerCase();
        const timestamp = new Date(error.timestamp).toLocaleString('ja-JP');
        
        return `
            <div class="error-item ${severityClass}">
                <div class="error-header">
                    <span class="error-severity">${error.severity}</span>
                    <span class="error-category">${error.category}</span>
                    <span class="error-source">${error.source}</span>
                    <span class="error-timestamp">${timestamp}</span>
                </div>
                <div class="error-message">${error.message}</div>
                ${this.formatMedicalContext(error.medicalContext)}
                ${this.formatTechnicalDetails(error.technicalDetails)}
                <div class="error-status">
                    ${error.resolved ? '✅ Resolved' : '🔄 Active'}
                    ${error.fallbackApplied ? '⚠️ Fallback Applied' : ''}
                </div>
            </div>
        `;
    }

    formatMedicalContext(context) {
        if (!context || Object.keys(context).length === 0) return '';
        
        return `
            <div class="medical-context">
                <strong>Medical Context:</strong>
                <ul>
                    ${Object.entries(context).map(([key, value]) => 
                        `<li><strong>${key}:</strong> ${this.formatValue(value)}</li>`
                    ).join('')}
                </ul>
            </div>
        `;
    }

    formatTechnicalDetails(details) {
        if (!details || Object.keys(details).length === 0) return '';
        
        return `
            <details class="technical-details">
                <summary>Technical Details</summary>
                <ul>
                    ${Object.entries(details).map(([key, value]) => 
                        `<li><strong>${key}:</strong> ${this.formatValue(value)}</li>`
                    ).join('')}
                </ul>
            </details>
        `;
    }

    formatValue(value) {
        if (typeof value === 'object') {
            return `<pre>${JSON.stringify(value, null, 2)}</pre>`;
        }
        return String(value);
    }

    clearErrors() {
        if (typeof MedicalErrorLog !== 'undefined') {
            MedicalErrorLog.clearErrors();
            this.refreshDisplay();
        }
    }

    exportErrors() {
        if (typeof MedicalErrorLog === 'undefined') return;
        
        const exportData = MedicalErrorLog.exportErrors('json');
        const blob = new Blob([exportData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `remimazolam-errors-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    updateErrorCount() {
        // Update error indicator in main UI if exists
        const errorIndicator = document.getElementById('errorIndicator');
        if (errorIndicator && typeof MedicalErrorLog !== 'undefined') {
            const stats = MedicalErrorLog.getStatistics();
            const totalErrors = stats.totalErrors;
            const criticalErrors = stats.bySeverity.CRITICAL || 0;
            
            if (totalErrors > 0) {
                errorIndicator.textContent = totalErrors;
                errorIndicator.className = criticalErrors > 0 ? 'error-indicator critical' : 'error-indicator';
                errorIndicator.style.display = 'block';
            } else {
                errorIndicator.style.display = 'none';
            }
        }
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .error-display-container {
                position: fixed;
                top: 10px;
                right: 10px;
                width: 600px;
                max-height: 80vh;
                background: white;
                border: 1px solid #ccc;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 10000;
                overflow: hidden;
            }

            .error-display-container.hidden {
                display: none;
            }

            .error-display-header {
                background: #f5f5f5;
                padding: 12px;
                border-bottom: 1px solid #ddd;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .error-display-header h3 {
                margin: 0;
                font-size: 16px;
            }

            .error-controls {
                display: flex;
                gap: 8px;
            }

            .error-controls button,
            .btn {
                padding: 4px 8px;
                font-size: 12px;
                border: 1px solid #ccc;
                border-radius: 4px;
                background: #f8f9fa;
                cursor: pointer;
                color: #333;
            }
            
            .error-controls button:hover,
            .btn:hover {
                background: #e9ecef;
                border-color: #adb5bd;
            }
            
            .btn-secondary {
                background: #6c757d;
                color: white;
                border-color: #6c757d;
            }
            
            .btn-secondary:hover {
                background: #5a6268;
                border-color: #545b62;
            }

            .error-display-content {
                max-height: 70vh;
                overflow-y: auto;
                padding: 12px;
            }

            .error-filters {
                display: flex;
                gap: 12px;
                margin-bottom: 12px;
            }

            .error-filters select {
                padding: 4px 8px;
                border: 1px solid #ccc;
                border-radius: 4px;
            }

            .stats-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 8px;
                margin-bottom: 12px;
            }

            .stat-item {
                text-align: center;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: #f9f9f9;
            }

            .stat-item.critical {
                background: #ffebee;
                border-color: #f44336;
            }

            .stat-item.high {
                background: #fff3e0;
                border-color: #ff9800;
            }

            .stat-label {
                display: block;
                font-size: 11px;
                color: #666;
            }

            .stat-value {
                display: block;
                font-size: 18px;
                font-weight: bold;
            }

            .error-item {
                margin-bottom: 12px;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: #fafafa;
            }

            .error-item.critical {
                border-color: #f44336;
                background: #ffebee;
            }

            .error-item.high {
                border-color: #ff9800;
                background: #fff3e0;
            }

            .error-item.medium {
                border-color: #ff5722;
                background: #fafafa;
            }

            .error-header {
                display: flex;
                gap: 8px;
                align-items: center;
                margin-bottom: 4px;
                font-size: 11px;
            }

            .error-severity {
                background: #2196f3;
                color: white;
                padding: 2px 6px;
                border-radius: 3px;
                font-weight: bold;
            }

            .error-category {
                background: #4caf50;
                color: white;
                padding: 2px 6px;
                border-radius: 3px;
            }

            .error-source {
                background: #9c27b0;
                color: white;
                padding: 2px 6px;
                border-radius: 3px;
            }

            .error-timestamp {
                margin-left: auto;
                color: #666;
            }

            .error-message {
                font-weight: bold;
                margin-bottom: 8px;
            }

            .medical-context {
                margin-bottom: 8px;
                font-size: 12px;
            }

            .medical-context ul {
                margin: 4px 0;
                padding-left: 16px;
            }

            .technical-details {
                font-size: 11px;
                margin-bottom: 8px;
            }

            .technical-details ul {
                margin: 4px 0;
                padding-left: 16px;
            }

            .technical-details pre {
                font-size: 10px;
                background: #f5f5f5;
                padding: 4px;
                border-radius: 2px;
                margin: 2px 0;
            }

            .error-status {
                font-size: 11px;
                color: #666;
            }

            .no-errors {
                text-align: center;
                color: #666;
                font-style: italic;
            }

            .error-indicator {
                position: fixed;
                top: 10px;
                right: 10px;
                background: #ff9800;
                color: white;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: bold;
                cursor: pointer;
                z-index: 9999;
            }

            .error-indicator.critical {
                background: #f44336;
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize error display interface
let errorDisplayInterface = null;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        errorDisplayInterface = new ErrorDisplayInterface();
        window.errorDisplayInterface = errorDisplayInterface; // Update global reference
    });
} else {
    errorDisplayInterface = new ErrorDisplayInterface();
    window.errorDisplayInterface = errorDisplayInterface;
}

// Export for global access
window.ErrorDisplayInterface = ErrorDisplayInterface;