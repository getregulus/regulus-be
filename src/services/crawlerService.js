const axios = require('axios');
const logger = require('@utils/logger');

/**
 * HTTP client to communicate with orchestrator
 */
class CrawlerService {
  constructor() {
    this.orchestratorUrl = process.env.ORCHESTRATOR_URL || 'http://localhost:3001';
    this.apiKey = process.env.ORCHESTRATOR_API_KEY || process.env.WEBHOOK_SECRET;
  }

  /**
   * Trigger crawl for organization/jurisdiction
   * @param {number} organizationId - Organization ID
   * @param {string} jurisdiction - Jurisdiction identifier
   * @returns {Promise<object>} - Crawl result with crawlId
   */
  async triggerCrawl(organizationId, jurisdiction) {
    try {
      const response = await axios.post(
        `${this.orchestratorUrl}/api/crawl`,
        {
          organizationId,
          jurisdiction,
        },
        {
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 10000, // 10 second timeout for trigger
        }
      );

      logger.info({
        message: 'Crawl triggered successfully',
        organizationId,
        jurisdiction,
        crawlId: response.data.data?.crawlId,
      });

      return response.data.data;
    } catch (error) {
      logger.error({
        message: 'Error triggering crawl',
        organizationId,
        jurisdiction,
        error: error.message,
      });
      throw new Error(`Failed to trigger crawl: ${error.message}`);
    }
  }

  /**
   * Get crawl status
   * @param {string} crawlId - Crawl ID
   * @returns {Promise<object>} - Crawl status
   */
  async getCrawlStatus(crawlId) {
    try {
      const response = await axios.get(`${this.orchestratorUrl}/api/crawls/${crawlId}`, {
        headers: {
          'X-API-Key': this.apiKey,
        },
        timeout: 5000,
      });

      return response.data.data;
    } catch (error) {
      logger.error({
        message: 'Error getting crawl status',
        crawlId,
        error: error.message,
      });
      throw new Error(`Failed to get crawl status: ${error.message}`);
    }
  }
}

module.exports = new CrawlerService();

