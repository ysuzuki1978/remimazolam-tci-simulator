/**
 * ValidationLogger - 自動ログ収集・証拠記録システム
 * 全バリデーション層からの情報を自動収集し、EvidenceChainに送信
 */

const EvidenceChain = require('./evidence-chain');
const fs = require('fs').promises;
const path = require('path');

class ValidationLogger {
    constructor() {
        this.evidenceChain = new EvidenceChain();
        this.sessionId = this.generateSessionId();
        this.startTime = new Date();
        this.metrics = {
            total_tests: 0,
            passed_tests: 0,
            failed_tests: 0,
            warnings: 0,
            errors: 0,
            layers_completed: new Set()
        };
        this.realTimeLog = [];
    }

    /**
     * セッションID生成
     */
    generateSessionId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2);
        return `SESSION-${timestamp}-${random}`;
    }

    /**
     * Layer 0: 前処理検証ログ
     */
    async logPreValidation(results) {
        const logEntry = {
            layer: 0,
            layer_name: 'Pre-Validation',
            timestamp: new Date().toISOString(),
            session_id: this.sessionId,
            results: {
                syntax_analysis: results.syntaxAnalysis,
                security_scan: results.securityScan,
                dependency_check: results.dependencyCheck,
                performance_baseline: results.performanceBaseline,
                code_quality_metrics: results.codeQualityMetrics
            },
            status: this.determineStatus(results),
            execution_time_ms: results.executionTime
        };

        // リアルタイムログに追加
        this.realTimeLog.push(logEntry);
        
        // メトリクス更新
        this.updateMetrics(logEntry);
        
        // 証拠チェーンに追加
        const evidence = this.evidenceChain.addEvidence(
            logEntry, 
            'PRE_VALIDATION', 
            0
        );

        // 詳細ログファイル出力
        await this.writeDetailedLog('pre_validation', logEntry);

        return evidence;
    }

    /**
     * Layer 1: 数値精度検証ログ
     */
    async logNumericalValidation(results) {
        const logEntry = {
            layer: 1,
            layer_name: 'Numerical Accuracy',
            timestamp: new Date().toISOString(),
            session_id: this.sessionId,
            results: {
                base_accuracy: results.accuracy,
                monte_carlo_summary: results.monteCarloResults ? {
                    total_tests: results.monteCarloResults.length,
                    passed_tests: results.monteCarloResults.filter(r => r.passed).length,
                    average_accuracy: this.calculateAverageAccuracy(results.monteCarloResults),
                    min_accuracy: Math.min(...results.monteCarloResults.map(r => r.accuracy)),
                    max_accuracy: Math.max(...results.monteCarloResults.map(r => r.accuracy))
                } : {
                    total_tests: 0,
                    passed_tests: 0,
                    average_accuracy: results.accuracy || 0,
                    min_accuracy: results.accuracy || 0,
                    max_accuracy: results.accuracy || 0
                },
                boundary_tests: results.boundaryTests || {},
                error_analysis: results.errorAnalysis || {},
                masui_comparison: results.masui_compliance || results.masuiComparison || 0
            },
            status: results.accuracy >= 0.9999 ? 'PASSED' : 'FAILED',
            confidence_score: results.confidenceScore || 0.95
        };

        this.realTimeLog.push(logEntry);
        this.updateMetrics(logEntry);

        const evidence = this.evidenceChain.addNumericalEvidence(results);
        await this.writeDetailedLog('numerical_validation', logEntry);

        return evidence;
    }

    /**
     * Layer 2: 薬理学的検証ログ
     */
    async logPharmacologicalValidation(results) {
        const logEntry = {
            layer: 2,
            layer_name: 'Pharmacological Compliance',
            timestamp: new Date().toISOString(),
            session_id: this.sessionId,
            results: {
                context7_integration: results.context7Results,
                pharmpy_validation: results.pharmpyResults,
                drug_interaction_check: results.drugInteractions,
                physiological_constraints: results.physiologicalConstraints,
                guideline_compliance: results.guidelineCompliance,
                clinical_parameter_ranges: results.clinicalRanges
            },
            status: this.determinePharmacologicalStatus(results),
            automation_level: 0.98,
            ai_confidence: results.aiConfidence || 0.96
        };

        this.realTimeLog.push(logEntry);
        this.updateMetrics(logEntry);

        const evidence = this.evidenceChain.addPharmacologicalEvidence(results);
        await this.writeDetailedLog('pharmacological_validation', logEntry);

        return evidence;
    }

    /**
     * Layer 3: 臨床適用性検証ログ
     */
    async logClinicalValidation(results) {
        const logEntry = {
            layer: 3,
            layer_name: 'Clinical Applicability',
            timestamp: new Date().toISOString(),
            session_id: this.sessionId,
            results: {
                scenario_tests: {
                    total_scenarios: results.scenarioTests.length,
                    passed_scenarios: results.scenarioTests.filter(s => s.passed).length,
                    edge_cases_handled: results.edgeCasesHandled,
                    safety_checks: results.safetyChecks
                },
                guideline_adherence: results.guidelineAdherence,
                usability_assessment: results.usabilityAssessment,
                risk_assessment: results.riskAssessment
            },
            status: this.determineClinicalStatus(results),
            automation_level: 0.95,
            clinical_safety_score: results.clinicalSafetyScore || 0.97
        };

        this.realTimeLog.push(logEntry);
        this.updateMetrics(logEntry);

        const evidence = this.evidenceChain.addEvidence(
            logEntry, 
            'CLINICAL_VALIDATION', 
            3
        );

        await this.writeDetailedLog('clinical_validation', logEntry);

        return evidence;
    }

    /**
     * Layer 4: AI合意検証ログ
     */
    async logConsensusValidation(results) {
        const logEntry = {
            layer: 4,
            layer_name: 'AI Consensus',
            timestamp: new Date().toISOString(),
            session_id: this.sessionId,
            results: {
                participating_ais: results.validators,
                individual_assessments: results.individualScores,
                consensus_algorithm: results.algorithm,
                agreement_metrics: {
                    overall_agreement: results.agreementLevel,
                    weighted_consensus: results.weightedConsensus,
                    confidence_intervals: results.confidenceIntervals
                },
                byzantine_fault_tolerance: results.byzantineTolerance,
                outlier_detection: results.outlierDetection
            },
            status: results.agreementLevel >= 0.90 ? 'CONSENSUS_REACHED' : 'CONSENSUS_PENDING',
            automation_level: 1.0,
            consensus_strength: results.agreementLevel
        };

        this.realTimeLog.push(logEntry);
        this.updateMetrics(logEntry);

        const evidence = this.evidenceChain.addConsensusEvidence(results);
        await this.writeDetailedLog('consensus_validation', logEntry);

        return evidence;
    }

    /**
     * Layer 5: 継続監視ログ
     */
    async logContinuousMonitoring(results) {
        const logEntry = {
            layer: 5,
            layer_name: 'Continuous Monitoring',
            timestamp: new Date().toISOString(),
            session_id: this.sessionId,
            results: {
                performance_drift: results.performanceDrift,
                usage_analytics: results.usagePatterns,
                anomaly_detection: results.anomalyDetection,
                auto_recalibration: results.autoRecalibration,
                stability_metrics: results.stabilityMetrics
            },
            status: this.determineMonitoringStatus(results),
            monitoring_interval: results.monitoringInterval || '24h',
            alert_threshold: results.alertThreshold || 0.05
        };

        this.realTimeLog.push(logEntry);
        this.updateMetrics(logEntry);

        const evidence = this.evidenceChain.addMonitoringEvidence(results);
        await this.writeDetailedLog('continuous_monitoring', logEntry);

        return evidence;
    }

    /**
     * エラー・例外ログ
     */
    async logError(layer, error, context = {}) {
        const errorEntry = {
            layer: layer,
            timestamp: new Date().toISOString(),
            session_id: this.sessionId,
            error_type: error.name || 'UnknownError',
            error_message: error.message,
            stack_trace: error.stack,
            context: context,
            severity: this.determineSeverity(error),
            recovery_action: this.suggestRecoveryAction(error)
        };

        this.realTimeLog.push(errorEntry);
        this.metrics.errors++;

        const evidence = this.evidenceChain.addEvidence(
            errorEntry, 
            'ERROR_LOG', 
            layer
        );

        await this.writeDetailedLog('errors', errorEntry);

        return evidence;
    }

    /**
     * 警告ログ
     */
    async logWarning(layer, warning, context = {}) {
        const warningEntry = {
            layer: layer,
            timestamp: new Date().toISOString(),
            session_id: this.sessionId,
            warning_type: warning.type,
            warning_message: warning.message,
            context: context,
            recommendation: warning.recommendation
        };

        this.realTimeLog.push(warningEntry);
        this.metrics.warnings++;

        const evidence = this.evidenceChain.addEvidence(
            warningEntry, 
            'WARNING_LOG', 
            layer
        );

        await this.writeDetailedLog('warnings', warningEntry);

        return evidence;
    }

    /**
     * 全体バリデーション完了ログ
     */
    async logValidationComplete() {
        const endTime = new Date();
        const duration = endTime - this.startTime;

        const completionEntry = {
            session_id: this.sessionId,
            start_time: this.startTime.toISOString(),
            end_time: endTime.toISOString(),
            total_duration_ms: duration,
            total_evidence_blocks: this.evidenceChain.chain.length,
            validation_metrics: this.metrics,
            layers_completed: Array.from(this.metrics.layers_completed),
            chain_integrity: this.evidenceChain.isChainValid(),
            overall_status: this.determineOverallStatus()
        };

        const evidence = this.evidenceChain.addEvidence(
            completionEntry, 
            'VALIDATION_COMPLETE', 
            null
        );

        await this.writeDetailedLog('validation_complete', completionEntry);

        return evidence;
    }

    /**
     * メトリクス更新
     */
    updateMetrics(logEntry) {
        this.metrics.total_tests++;
        
        if (logEntry.status === 'PASSED' || logEntry.status === 'CONSENSUS_REACHED') {
            this.metrics.passed_tests++;
        } else if (logEntry.status === 'FAILED') {
            this.metrics.failed_tests++;
        }

        if (logEntry.layer !== undefined) {
            this.metrics.layers_completed.add(logEntry.layer);
        }
    }

    /**
     * ステータス判定ヘルパー関数群
     */
    determineStatus(results) {
        if (results.errors && results.errors.length > 0) return 'FAILED';
        if (results.warnings && results.warnings.length > 0) return 'PASSED_WITH_WARNINGS';
        return 'PASSED';
    }

    determinePharmacologicalStatus(results) {
        const complianceScore = results.complianceScore || 0;
        if (complianceScore >= 0.95) return 'PASSED';
        if (complianceScore >= 0.85) return 'PASSED_WITH_WARNINGS';
        return 'FAILED';
    }

    determineClinicalStatus(results) {
        const safetyScore = results.clinicalSafetyScore || 0;
        if (safetyScore >= 0.95) return 'CLINICALLY_SAFE';
        if (safetyScore >= 0.85) return 'ACCEPTABLE_WITH_MONITORING';
        return 'REQUIRES_REVIEW';
    }

    determineMonitoringStatus(results) {
        if (results.anomalyDetection && results.anomalyDetection.length > 0) {
            return 'ANOMALIES_DETECTED';
        }
        return 'MONITORING_NORMAL';
    }

    determineOverallStatus() {
        const passRate = this.metrics.passed_tests / this.metrics.total_tests;
        if (passRate >= 0.95 && this.metrics.errors === 0) return 'VALIDATION_PASSED';
        if (passRate >= 0.85) return 'VALIDATION_PASSED_WITH_WARNINGS';
        return 'VALIDATION_FAILED';
    }

    /**
     * ユーティリティ関数
     */
    calculateAverageAccuracy(results) {
        if (!results || results.length === 0) return 0;
        const sum = results.reduce((acc, r) => acc + r.accuracy, 0);
        return sum / results.length;
    }

    determineSeverity(error) {
        if (error.name === 'ValidationError') return 'CRITICAL';
        if (error.name === 'TypeError') return 'HIGH';
        return 'MEDIUM';
    }

    suggestRecoveryAction(error) {
        const actions = {
            'ValidationError': 'Review input parameters and retry validation',
            'TypeError': 'Check data types and format',
            'NetworkError': 'Verify MCP server connectivity',
            'default': 'Contact system administrator'
        };
        return actions[error.name] || actions['default'];
    }

    /**
     * 詳細ログファイル出力
     */
    async writeDetailedLog(logType, logEntry) {
        const logDir = path.join(__dirname, 'detailed_logs', this.sessionId);
        
        try {
            await fs.mkdir(logDir, { recursive: true });
        } catch (error) {
            // ディレクトリが既に存在する場合は無視
        }

        const filename = `${logType}_${new Date().getTime()}.json`;
        const filepath = path.join(logDir, filename);
        
        await fs.writeFile(filepath, JSON.stringify(logEntry, null, 2));
    }

    /**
     * リアルタイムステータス取得
     */
    getRealTimeStatus() {
        return {
            session_id: this.sessionId,
            start_time: this.startTime.toISOString(),
            current_time: new Date().toISOString(),
            metrics: this.metrics,
            latest_logs: this.realTimeLog.slice(-10), // 最新10件
            chain_integrity: this.evidenceChain.isChainValid()
        };
    }

    /**
     * 証拠チェーンのエクスポート
     */
    exportEvidenceChain() {
        return this.evidenceChain.exportChain();
    }

    /**
     * セッションサマリー生成
     */
    generateSessionSummary() {
        return {
            session_info: {
                session_id: this.sessionId,
                start_time: this.startTime.toISOString(),
                duration_ms: new Date() - this.startTime
            },
            validation_metrics: this.metrics,
            evidence_statistics: this.evidenceChain.generateStatistics(),
            real_time_log_count: this.realTimeLog.length,
            chain_integrity: this.evidenceChain.isChainValid(),
            overall_status: this.determineOverallStatus()
        };
    }
}

module.exports = ValidationLogger;