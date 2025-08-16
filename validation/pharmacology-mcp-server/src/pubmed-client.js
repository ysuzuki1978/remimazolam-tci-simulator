/**
 * PubMed Client for Literature Search
 * 
 * Provides access to PubMed database for drug literature validation
 */

import axios from 'axios';
import xml2js from 'xml2js';

export class PubMedClient {
  constructor() {
    this.baseURL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
    this.email = 'ai-validation@example.com'; // Required for NCBI API
    this.tool = 'pharmacology-mcp-server';
    this.retmax = 20; // Default max results
  }

  /**
   * Search PubMed for articles
   */
  async search(query, maxResults = 10, dateRange = '2015:2024') {
    try {
      // Step 1: Search for article IDs
      const searchUrl = `${this.baseURL}/esearch.fcgi`;
      const searchParams = {
        db: 'pubmed',
        term: query,
        retmax: maxResults,
        datetype: 'pdat',
        mindate: dateRange.split(':')[0],
        maxdate: dateRange.split(':')[1],
        email: this.email,
        tool: this.tool
      };

      const searchResponse = await axios.get(searchUrl, { params: searchParams });
      const searchResults = await this.parseXML(searchResponse.data);
      
      if (!searchResults.eSearchResult || !searchResults.eSearchResult.IdList) {
        return [];
      }

      const pmids = searchResults.eSearchResult.IdList[0].Id || [];
      
      if (pmids.length === 0) {
        return [];
      }

      // Step 2: Fetch article details
      const articles = await this.fetchArticleDetails(pmids);
      
      // Step 3: Calculate relevance scores
      return articles.map(article => ({
        ...article,
        relevanceScore: this.calculateRelevanceScore(article, query)
      }));

    } catch (error) {
      console.error('PubMed search failed:', error);
      throw new Error(`PubMed search failed: ${error.message}`);
    }
  }

  /**
   * Fetch detailed information for articles
   */
  async fetchArticleDetails(pmids) {
    try {
      const fetchUrl = `${this.baseURL}/efetch.fcgi`;
      const fetchParams = {
        db: 'pubmed',
        id: pmids.join(','),
        retmode: 'xml',
        email: this.email,
        tool: this.tool
      };

      const fetchResponse = await axios.get(fetchUrl, { params: fetchParams });
      const fetchResults = await this.parseXML(fetchResponse.data);
      
      if (!fetchResults.PubmedArticleSet || !fetchResults.PubmedArticleSet.PubmedArticle) {
        return [];
      }

      const articles = Array.isArray(fetchResults.PubmedArticleSet.PubmedArticle) 
        ? fetchResults.PubmedArticleSet.PubmedArticle
        : [fetchResults.PubmedArticleSet.PubmedArticle];

      return articles.map(article => this.parseArticle(article));

    } catch (error) {
      console.error('Failed to fetch article details:', error);
      throw new Error(`Failed to fetch article details: ${error.message}`);
    }
  }

  /**
   * Parse individual article data
   */
  parseArticle(article) {
    try {
      const medlineCitation = article.MedlineCitation[0];
      const pmid = medlineCitation.PMID[0]._;
      
      // Title
      const title = medlineCitation.Article[0].ArticleTitle[0];
      
      // Authors
      const authorList = medlineCitation.Article[0].AuthorList;
      const authors = authorList ? authorList[0].Author.map(author => {
        const lastName = author.LastName ? author.LastName[0] : '';
        const foreName = author.ForeName ? author.ForeName[0] : '';
        return `${lastName}, ${foreName}`.trim();
      }) : [];

      // Journal
      const journal = medlineCitation.Article[0].Journal[0];
      const journalTitle = journal.Title ? journal.Title[0] : '';
      const journalAbbrev = journal.ISOAbbreviation ? journal.ISOAbbreviation[0] : '';
      
      // Publication date
      const pubDate = journal.JournalIssue[0].PubDate[0];
      const year = pubDate.Year ? pubDate.Year[0] : '';
      const month = pubDate.Month ? pubDate.Month[0] : '';
      const day = pubDate.Day ? pubDate.Day[0] : '';
      
      // Abstract
      const abstractData = medlineCitation.Article[0].Abstract;
      const abstract = abstractData && abstractData[0].AbstractText 
        ? this.parseAbstract(abstractData[0].AbstractText)
        : '';

      // Keywords
      const keywordList = medlineCitation.KeywordList;
      const keywords = keywordList ? keywordList[0].Keyword.map(kw => kw._) : [];

      return {
        pmid: pmid,
        title: title,
        authors: authors,
        journal: {
          title: journalTitle,
          abbreviation: journalAbbrev
        },
        publicationDate: {
          year: year,
          month: month,
          day: day,
          formatted: `${year}${month ? '-' + month : ''}${day ? '-' + day : ''}`
        },
        abstract: abstract,
        keywords: keywords,
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
      };

    } catch (error) {
      console.error('Error parsing article:', error);
      return {
        pmid: 'unknown',
        title: 'Parsing error',
        authors: [],
        journal: { title: '', abbreviation: '' },
        publicationDate: { year: '', month: '', day: '', formatted: '' },
        abstract: '',
        keywords: [],
        url: ''
      };
    }
  }

  /**
   * Parse abstract text (can be structured or simple)
   */
  parseAbstract(abstractText) {
    try {
      if (Array.isArray(abstractText)) {
        return abstractText.map(section => {
          if (typeof section === 'string') {
            return section;
          } else if (section.$ && section.$.Label) {
            return `${section.$.Label}: ${section._}`;
          } else {
            return section._ || section;
          }
        }).join(' ');
      } else {
        return abstractText._ || abstractText;
      }
    } catch (error) {
      return 'Abstract parsing error';
    }
  }

  /**
   * Calculate relevance score based on query terms
   */
  calculateRelevanceScore(article, query) {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const searchText = `${article.title} ${article.abstract} ${article.keywords.join(' ')}`.toLowerCase();
    
    let score = 0;
    queryTerms.forEach(term => {
      if (searchText.includes(term)) {
        score += 1;
      }
    });
    
    // Boost score for recent articles
    const currentYear = new Date().getFullYear();
    const articleYear = parseInt(article.publicationDate.year) || 0;
    if (articleYear >= currentYear - 2) score += 0.5; // Recent articles
    if (articleYear >= currentYear - 5) score += 0.25; // Somewhat recent
    
    // Normalize score
    return Math.min(1.0, score / queryTerms.length);
  }

  /**
   * Parse XML response
   */
  async parseXML(xmlData) {
    const parser = new xml2js.Parser({
      explicitArray: true,
      charkey: '_',
      attrkey: '$'
    });
    
    return new Promise((resolve, reject) => {
      parser.parseString(xmlData, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Search for specific drug parameters in literature
   */
  async searchDrugParameters(drugName, parameterType = 'pharmacokinetics') {
    const query = `${drugName} ${parameterType} parameters clearance volume distribution`;
    return await this.search(query, 15, '2010:2024');
  }

  /**
   * Search for clinical studies
   */
  async searchClinicalStudies(drugName, indication = 'anesthesia') {
    const query = `${drugName} clinical trial ${indication} safety efficacy`;
    return await this.search(query, 20, '2015:2024');
  }

  /**
   * Search for safety information
   */
  async searchSafetyData(drugName) {
    const query = `${drugName} safety adverse effects contraindications warnings`;
    return await this.search(query, 10, '2015:2024');
  }
}