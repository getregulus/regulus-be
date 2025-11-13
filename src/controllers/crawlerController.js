const logger = require('@utils/logger');
const { createResponse } = require('@utils/responseHandler');
const crawlerService = require('@services/crawlerService');
const { organizationContext } = require('@middleware/organization');

/**
 * Trigger crawler for organization/jurisdiction
 * POST /crawlers/trigger
 */
exports.triggerCrawl = async (req) => {
  const { organization, body, requestId } = req;
  const { jurisdiction } = body;

  if (!jurisdiction) {
    const err = new Error('jurisdiction is required');
    err.status = 400;
    throw err;
  }

  try {
    logger.info({
      message: 'Triggering crawler',
      organizationId: organization.id,
      jurisdiction,
      requestId,
    });

    // Forward to orchestrator
    const result = await crawlerService.triggerCrawl(organization.id, jurisdiction);

    return createResponse(true, result);
  } catch (error) {
    logger.error({
      message: 'Error triggering crawler',
      organizationId: organization.id,
      jurisdiction,
      requestId,
      error: error.message,
    });
    throw error;
  }
};

