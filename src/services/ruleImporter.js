const prisma = require('@utils/prisma');
const logger = require('@utils/logger');
const crypto = require('crypto');

/**
 * Rule importer service
 * Transforms crawler results into draft rules with duplicate detection
 */
class RuleImporter {
  /**
   * Import rules from crawler envelope
   * @param {number} organizationId - Organization ID
   * @param {object} envelope - CrawlerEnvelope with rules
   * @returns {Promise<object>} - Import result
   */
  async importRules(organizationId, envelope) {
    const { jurisdiction, rules, pluginVersion, crawlId, crawlStartedAt } = envelope;
    const imported = [];
    const skipped = [];
    const archived = [];

    try {
      logger.info({
        message: 'Importing rules from crawler',
        organizationId,
        jurisdiction,
        rulesCount: rules.length,
        crawlId,
      });

      for (const ruleData of rules) {
        try {
          // Calculate rule hash
          const ruleHash = this.calculateRuleHash(ruleData, jurisdiction);

          // Check for existing rule with same hash
          const existingRule = await prisma.rule.findFirst({
            where: {
              organizationId,
              ruleHash,
            },
          });

          if (existingRule) {
            // Check if rule content has changed
            const hasChanged = this.hasRuleChanged(existingRule, ruleData);

            if (!hasChanged) {
              // Rule unchanged, skip
              skipped.push({
                ruleId: existingRule.id,
                ruleName: ruleData.rule_name,
                reason: 'unchanged',
              });
              continue;
            } else {
              // Rule changed, archive old and create new
              await prisma.rule.update({
                where: { id: existingRule.id },
                data: { status: 'ARCHIVED' },
              });

              archived.push({
                oldRuleId: existingRule.id,
                ruleName: ruleData.rule_name,
              });
            }
          }

          // Create new draft rule
          const newRule = await prisma.rule.create({
            data: {
              rule_name: ruleData.rule_name,
              field: ruleData.field,
              operator: ruleData.operator,
              value: ruleData.value,
              organizationId,
              status: 'DRAFT',
              source: 'crawler',
              sourceUrl: ruleData.sourceUrl || null,
              jurisdiction,
              crawledAt: crawlStartedAt ? new Date(crawlStartedAt) : new Date(),
              ruleHash,
              metadata: {
                pluginVersion,
                crawlId,
                pipelineVersion: new Date().toISOString().split('T')[0], // YYYY-MM-DD
              },
            },
          });

          imported.push({
            ruleId: newRule.id,
            ruleName: ruleData.rule_name,
          });
        } catch (error) {
          logger.error({
            message: 'Error importing rule',
            organizationId,
            ruleName: ruleData.rule_name,
            error: error.message,
          });
          // Continue with other rules
        }
      }

      logger.info({
        message: 'Rules import completed',
        organizationId,
        jurisdiction,
        imported: imported.length,
        skipped: skipped.length,
        archived: archived.length,
      });

      return {
        imported: imported.length,
        skipped: skipped.length,
        archived: archived.length,
        details: {
          imported,
          skipped,
          archived,
        },
      };
    } catch (error) {
      logger.error({
        message: 'Error importing rules',
        organizationId,
        jurisdiction,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Calculate SHA256 hash for rule duplicate detection
   * @param {object} ruleData - Rule data
   * @param {string} jurisdiction - Jurisdiction identifier
   * @returns {string} - SHA256 hash
   */
  calculateRuleHash(ruleData, jurisdiction) {
    const hashInput = [
      ruleData.rule_name,
      ruleData.field,
      ruleData.operator,
      ruleData.value,
      jurisdiction,
    ].join('|');

    return crypto.createHash('sha256').update(hashInput).digest('hex');
  }

  /**
   * Check if rule content has changed
   * @param {object} existingRule - Existing rule from database
   * @param {object} newRuleData - New rule data from crawler
   * @returns {boolean} - True if rule has changed
   */
  hasRuleChanged(existingRule, newRuleData) {
    return (
      existingRule.rule_name !== newRuleData.rule_name ||
      existingRule.field !== newRuleData.field ||
      existingRule.operator !== newRuleData.operator ||
      existingRule.value !== newRuleData.value
    );
  }
}

module.exports = new RuleImporter();

