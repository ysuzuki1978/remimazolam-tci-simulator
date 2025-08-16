/**
 * EvidenceChain - 改ざん防止機能付き証拠収集システム
 * 医療ソフトウェア検証の完全な証拠チェーンを提供
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class EvidenceChain {
    constructor() {
        this.chain = [];
        this.pendingEvidence = [];
        this.validationId = this.generateValidationId();
        this.init();
    }

    /**
     * 初期化 - ジェネシスブロック作成
     */
    init() {
        const genesisBlock = this.createGenesisBlock();
        this.chain.push(genesisBlock);
    }

    /**
     * ジェネシスブロック作成
     */
    createGenesisBlock() {
        const timestamp = new Date().toISOString();
        const genesisData = {
            type: 'GENESIS',
            validation_id: this.validationId,
            system_info: {
                node_version: process.version,
                platform: process.platform,
                arch: process.arch,
                timestamp: timestamp
            },
            validation_scope: 'PK/PD Medical Simulation Software',
            ai_validators: ['Sequential', 'Context7', 'Claude-Code']
        };

        return {
            index: 0,
            timestamp: timestamp,
            data: genesisData,
            previous_hash: '0',
            hash: this.calculateHash(JSON.stringify(genesisData) + '0' + timestamp),
            nonce: 0,
            evidence_type: 'GENESIS'
        };
    }

    /**
     * 証拠を追加
     * @param {Object} evidenceData - 証拠データ
     * @param {string} evidenceType - 証拠タイプ
     * @param {number} layer - バリデーション層
     */
    addEvidence(evidenceData, evidenceType, layer = null) {
        const timestamp = new Date().toISOString();
        const previousBlock = this.getLatestBlock();
        
        const evidence = {
            index: this.chain.length,
            timestamp: timestamp,
            data: {
                ...evidenceData,
                layer: layer,
                evidence_id: this.generateEvidenceId(),
                validation_id: this.validationId
            },
            previous_hash: previousBlock.hash,
            hash: null,
            nonce: 0,
            evidence_type: evidenceType
        };

        // ハッシュ計算
        evidence.hash = this.calculateHash(
            JSON.stringify(evidence.data) + 
            evidence.previous_hash + 
            evidence.timestamp
        );

        // 改ざん検証
        if (this.isValidBlock(evidence, previousBlock)) {
            this.chain.push(evidence);
            this.logEvidence(evidence);
            return evidence;
        } else {
            throw new Error('Invalid evidence block - integrity check failed');
        }
    }

    /**
     * 数値精度検証の証拠を追加
     */
    addNumericalEvidence(testResults) {
        const evidenceData = {
            test_type: 'numerical_accuracy',
            base_accuracy: testResults.accuracy,
            monte_carlo_tests: testResults.monteCarloResults,
            boundary_tests: testResults.boundaryTests,
            error_analysis: testResults.errorAnalysis,
            masui_parameters: testResults.masuiComparison,
            timestamp: new Date().toISOString()
        };

        return this.addEvidence(evidenceData, 'NUMERICAL_VALIDATION', 1);
    }

    /**
     * 薬理学的検証の証拠を追加
     */
    addPharmacologicalEvidence(validationResults) {
        const evidenceData = {
            test_type: 'pharmacological_compliance',
            context7_validation: validationResults.context7Results,
            drug_interactions: validationResults.drugInteractions,
            physiological_constraints: validationResults.physiologicalConstraints,
            guideline_compliance: validationResults.guidelineCompliance,
            pharmpy_verification: validationResults.pharmpyResults
        };

        return this.addEvidence(evidenceData, 'PHARMACOLOGICAL_VALIDATION', 2);
    }

    /**
     * AI合意検証の証拠を追加
     */
    addConsensusEvidence(consensusResults) {
        const evidenceData = {
            test_type: 'ai_consensus',
            participating_ais: consensusResults.validators,
            individual_scores: consensusResults.individualScores,
            consensus_algorithm: consensusResults.algorithm,
            agreement_level: consensusResults.agreementLevel,
            confidence_metrics: consensusResults.confidenceMetrics,
            byzantine_tolerance: consensusResults.byzantineTolerance
        };

        return this.addEvidence(evidenceData, 'CONSENSUS_VALIDATION', 4);
    }

    /**
     * 継続監視の証拠を追加
     */
    addMonitoringEvidence(monitoringData) {
        const evidenceData = {
            test_type: 'continuous_monitoring',
            performance_drift: monitoringData.performanceDrift,
            usage_patterns: monitoringData.usagePatterns,
            anomaly_detection: monitoringData.anomalyDetection,
            auto_recalibration: monitoringData.autoRecalibration
        };

        return this.addEvidence(evidenceData, 'MONITORING_DATA', 5);
    }

    /**
     * ブロックの有効性検証
     */
    isValidBlock(newBlock, previousBlock) {
        // 前ブロックハッシュの整合性確認
        if (newBlock.previous_hash !== previousBlock.hash) {
            return false;
        }

        // ハッシュの整合性確認
        const calculatedHash = this.calculateHash(
            JSON.stringify(newBlock.data) + 
            newBlock.previous_hash + 
            newBlock.timestamp
        );

        return calculatedHash === newBlock.hash;
    }

    /**
     * チェーン全体の整合性検証
     */
    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            if (!this.isValidBlock(currentBlock, previousBlock)) {
                return false;
            }
        }
        return true;
    }

    /**
     * ハッシュ計算
     */
    calculateHash(data) {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * 最新ブロック取得
     */
    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    /**
     * バリデーションID生成
     */
    generateValidationId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2);
        return `VAL-${timestamp}-${random}`;
    }

    /**
     * 証拠ID生成
     */
    generateEvidenceId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2);
        return `EVD-${timestamp}-${random}`;
    }

    /**
     * 証拠をファイルに記録
     */
    async logEvidence(evidence) {
        const logDir = path.join(__dirname, 'evidence_logs');
        
        // ディレクトリ作成
        try {
            await fs.mkdir(logDir, { recursive: true });
        } catch (error) {
            // ディレクトリが既に存在する場合は無視
        }

        // 証拠ファイル保存
        const evidenceFile = path.join(logDir, `evidence_${evidence.data.evidence_id}.json`);
        await fs.writeFile(evidenceFile, JSON.stringify(evidence, null, 2));

        // チェーン全体のバックアップ
        const chainFile = path.join(logDir, `validation_chain_${this.validationId}.json`);
        await fs.writeFile(chainFile, JSON.stringify(this.chain, null, 2));
    }

    /**
     * 証拠チェーンのエクスポート
     */
    exportChain() {
        return {
            validation_id: this.validationId,
            chain_length: this.chain.length,
            is_valid: this.isChainValid(),
            genesis_timestamp: this.chain[0].timestamp,
            latest_timestamp: this.getLatestBlock().timestamp,
            evidence_chain: this.chain
        };
    }

    /**
     * 証拠の検索
     */
    findEvidence(criteria) {
        return this.chain.filter(block => {
            if (criteria.evidenceType && block.evidence_type !== criteria.evidenceType) {
                return false;
            }
            if (criteria.layer && block.data.layer !== criteria.layer) {
                return false;
            }
            if (criteria.timestampAfter && new Date(block.timestamp) < new Date(criteria.timestampAfter)) {
                return false;
            }
            return true;
        });
    }

    /**
     * 統計サマリー生成
     */
    generateStatistics() {
        const evidenceTypes = {};
        const layerCounts = {};
        
        this.chain.forEach(block => {
            // 証拠タイプカウント
            evidenceTypes[block.evidence_type] = (evidenceTypes[block.evidence_type] || 0) + 1;
            
            // 層別カウント
            if (block.data.layer !== undefined) {
                layerCounts[block.data.layer] = (layerCounts[block.data.layer] || 0) + 1;
            }
        });

        return {
            total_evidence_blocks: this.chain.length,
            evidence_types: evidenceTypes,
            layer_distribution: layerCounts,
            chain_integrity: this.isChainValid(),
            validation_duration: this.calculateValidationDuration()
        };
    }

    /**
     * バリデーション期間計算
     */
    calculateValidationDuration() {
        if (this.chain.length < 2) return 0;
        
        const start = new Date(this.chain[0].timestamp);
        const end = new Date(this.getLatestBlock().timestamp);
        return end - start; // ミリ秒
    }
}

module.exports = EvidenceChain;