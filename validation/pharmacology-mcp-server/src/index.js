#!/usr/bin/env node

/**
 * Pharmacology MCP Server
 * 
 * Provides pharmacological validation services for medical applications
 * Features:
 * - PubMed literature search and validation
 * - Drug parameter verification
 * - Pharmacological principle checking
 * - Clinical guideline compliance
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError 
} from '@modelcontextprotocol/sdk/types.js';
import { PharmacologyDatabase } from './pharmacology-database.js';
import { PubMedClient } from './pubmed-client.js';
import { DrugValidator } from './drug-validator.js';

class PharmacologyMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'pharmacology-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.pharmacologyDB = new PharmacologyDatabase();
    this.pubmedClient = new PubMedClient();
    this.drugValidator = new DrugValidator();
    
    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'validate_drug_parameters',
            description: 'Validate pharmacokinetic parameters against literature',
            inputSchema: {
              type: 'object',
              properties: {
                drug_name: {
                  type: 'string',
                  description: 'Name of the drug (e.g., remimazolam, propofol)'
                },
                parameters: {
                  type: 'object',
                  description: 'PK/PD parameters to validate',
                  properties: {
                    clearance: { type: 'number' },
                    volume_distribution: { type: 'number' },
                    elimination_half_life: { type: 'number' },
                    ke0: { type: 'number' }
                  }
                },
                patient_population: {
                  type: 'string',
                  description: 'Target patient population (adult, pediatric, elderly)',
                  default: 'adult'
                }
              },
              required: ['drug_name', 'parameters']
            }
          },
          {
            name: 'search_pubmed_literature',
            description: 'Search PubMed for drug-related literature',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query for PubMed'
                },
                max_results: {
                  type: 'number',
                  description: 'Maximum number of results to return',
                  default: 10
                },
                publication_years: {
                  type: 'string',
                  description: 'Publication year range (e.g., "2020:2024")',
                  default: '2015:2024'
                }
              },
              required: ['query']
            }
          },
          {
            name: 'check_pharmacological_principles',
            description: 'Verify compliance with basic pharmacological principles',
            inputSchema: {
              type: 'object',
              properties: {
                drug_class: {
                  type: 'string',
                  description: 'Drug classification (e.g., benzodiazepine, propofol)'
                },
                parameters: {
                  type: 'object',
                  description: 'Parameters to check'
                },
                clinical_context: {
                  type: 'string',
                  description: 'Clinical context (anesthesia, sedation, etc.)'
                }
              },
              required: ['drug_class', 'parameters']
            }
          },
          {
            name: 'get_clinical_guidelines',
            description: 'Retrieve relevant clinical guidelines',
            inputSchema: {
              type: 'object',
              properties: {
                specialty: {
                  type: 'string',
                  description: 'Medical specialty (anesthesiology, critical_care, etc.)'
                },
                topic: {
                  type: 'string',
                  description: 'Specific topic or procedure'
                },
                organization: {
                  type: 'string',
                  description: 'Guideline organization (ASA, ESA, etc.)',
                  default: 'all'
                }
              },
              required: ['specialty', 'topic']
            }
          },
          {
            name: 'validate_dosing_protocol',
            description: 'Validate dosing protocols against safety standards',
            inputSchema: {
              type: 'object',
              properties: {
                drug_name: { type: 'string' },
                dosing_regimen: {
                  type: 'object',
                  properties: {
                    loading_dose: { type: 'number' },
                    maintenance_dose: { type: 'number' },
                    dose_units: { type: 'string' }
                  }
                },
                patient_characteristics: {
                  type: 'object',
                  properties: {
                    age: { type: 'number' },
                    weight: { type: 'number' },
                    comorbidities: { type: 'array', items: { type: 'string' } }
                  }
                }
              },
              required: ['drug_name', 'dosing_regimen']
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'validate_drug_parameters':
            return await this.validateDrugParameters(args);
          
          case 'search_pubmed_literature':
            return await this.searchPubMedLiterature(args);
          
          case 'check_pharmacological_principles':
            return await this.checkPharmacologicalPrinciples(args);
          
          case 'get_clinical_guidelines':
            return await this.getClinicalGuidelines(args);
          
          case 'validate_dosing_protocol':
            return await this.validateDosingProtocol(args);
          
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });
  }

  /**
   * Validate drug parameters against literature
   */
  async validateDrugParameters(args) {
    const { drug_name, parameters, patient_population = 'adult' } = args;
    
    try {
      // Search for relevant literature
      const literatureQuery = `${drug_name} pharmacokinetics ${patient_population}`;
      const literature = await this.pubmedClient.search(literatureQuery, 20);
      
      // Get reference parameters from database
      const referenceParams = await this.pharmacologyDB.getDrugParameters(drug_name, patient_population);
      
      // Validate parameters
      const validation = await this.drugValidator.validateParameters(
        parameters, 
        referenceParams, 
        literature
      );
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              validation_result: {
                drug: drug_name,
                population: patient_population,
                overall_compliance: validation.overallCompliance,
                parameter_validation: validation.parameterValidation,
                literature_support: validation.literatureSupport,
                recommendations: validation.recommendations,
                confidence_score: validation.confidenceScore,
                validation_timestamp: new Date().toISOString()
              }
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Parameter validation failed',
              message: error.message,
              drug: drug_name
            }, null, 2)
          }
        ]
      };
    }
  }

  /**
   * Search PubMed literature
   */
  async searchPubMedLiterature(args) {
    const { query, max_results = 10, publication_years = '2015:2024' } = args;
    
    try {
      const results = await this.pubmedClient.search(query, max_results, publication_years);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              search_results: {
                query: query,
                total_results: results.length,
                publication_range: publication_years,
                articles: results.map(article => ({
                  pmid: article.pmid,
                  title: article.title,
                  authors: article.authors,
                  journal: article.journal,
                  publication_date: article.publicationDate,
                  abstract: article.abstract,
                  relevance_score: article.relevanceScore
                })),
                search_timestamp: new Date().toISOString()
              }
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Literature search failed',
              message: error.message,
              query: query
            }, null, 2)
          }
        ]
      };
    }
  }

  /**
   * Check pharmacological principles
   */
  async checkPharmacologicalPrinciples(args) {
    const { drug_class, parameters, clinical_context } = args;
    
    try {
      const principleCheck = await this.drugValidator.checkPharmacologicalPrinciples(
        drug_class, 
        parameters, 
        clinical_context
      );
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              principle_validation: {
                drug_class: drug_class,
                clinical_context: clinical_context,
                compliance_score: principleCheck.complianceScore,
                principle_checks: principleCheck.checks,
                violations: principleCheck.violations,
                recommendations: principleCheck.recommendations,
                validation_timestamp: new Date().toISOString()
              }
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Principle validation failed',
              message: error.message,
              drug_class: drug_class
            }, null, 2)
          }
        ]
      };
    }
  }

  /**
   * Get clinical guidelines
   */
  async getClinicalGuidelines(args) {
    const { specialty, topic, organization = 'all' } = args;
    
    try {
      const guidelines = await this.pharmacologyDB.getClinicalGuidelines(
        specialty, 
        topic, 
        organization
      );
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              clinical_guidelines: {
                specialty: specialty,
                topic: topic,
                organization: organization,
                guidelines: guidelines.map(guideline => ({
                  title: guideline.title,
                  organization: guideline.organization,
                  publication_year: guideline.year,
                  recommendations: guideline.recommendations,
                  evidence_level: guideline.evidenceLevel,
                  url: guideline.url
                })),
                retrieval_timestamp: new Date().toISOString()
              }
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Guideline retrieval failed',
              message: error.message,
              specialty: specialty,
              topic: topic
            }, null, 2)
          }
        ]
      };
    }
  }

  /**
   * Validate dosing protocol
   */
  async validateDosingProtocol(args) {
    const { drug_name, dosing_regimen, patient_characteristics } = args;
    
    try {
      const dosingValidation = await this.drugValidator.validateDosingProtocol(
        drug_name,
        dosing_regimen,
        patient_characteristics
      );
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              dosing_validation: {
                drug: drug_name,
                regimen: dosing_regimen,
                patient: patient_characteristics,
                safety_score: dosingValidation.safetyScore,
                efficacy_score: dosingValidation.efficacyScore,
                recommendations: dosingValidation.recommendations,
                warnings: dosingValidation.warnings,
                dose_adjustments: dosingValidation.adjustments,
                validation_timestamp: new Date().toISOString()
              }
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Dosing validation failed',
              message: error.message,
              drug: drug_name
            }, null, 2)
          }
        ]
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Pharmacology MCP Server running on stdio');
  }
}

// Start the server
const server = new PharmacologyMCPServer();
server.run().catch(console.error);