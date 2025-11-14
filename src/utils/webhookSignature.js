const crypto = require('crypto');
const logger = require('@utils/logger');

/**
 * Generate HMAC-SHA256 signature for webhook payload
 * @param {object} payload - Payload to sign
 * @param {string} secret - Secret key for signing
 * @returns {string} - Hex-encoded signature
 */
function generateWebhookSignature(payload, secret) {
  if (!secret) {
    throw new Error('Webhook secret is required for signature generation');
  }

  const payloadString = typeof payload === 'string' 
    ? payload 
    : JSON.stringify(payload);
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payloadString)
    .digest('hex');

  return signature;
}

/**
 * Verify webhook signature
 * @param {object|string} payload - Payload to verify
 * @param {string} signature - Signature to verify against
 * @param {string} secret - Secret key for verification
 * @returns {boolean} - True if signature is valid
 */
function verifyWebhookSignature(payload, signature, secret) {
  if (!secret || !signature) {
    logger.warn({
      message: 'Missing secret or signature for webhook verification',
      hasSecret: !!secret,
      hasSignature: !!signature,
    });
    return false;
  }

  try {
    const expectedSignature = generateWebhookSignature(payload, secret);
    
    // Use timing-safe comparison to prevent timing attacks
    if (signature.length !== expectedSignature.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    logger.error({
      message: 'Error verifying webhook signature',
      error: error.message,
    });
    return false;
  }
}

/**
 * Extract signature from request headers
 * Supports multiple header formats:
 * - X-Webhook-Signature (hex)
 * - X-Webhook-Signature-256 (hex with sha256 prefix)
 * @param {object} headers - Request headers
 * @returns {string|null} - Signature or null if not found
 */
function extractSignatureFromHeaders(headers) {
  // Try X-Webhook-Signature first
  if (headers['x-webhook-signature']) {
    const sig = headers['x-webhook-signature'];
    // Handle format: sha256=hexsignature or just hexsignature
    return sig.includes('=') ? sig.split('=')[1] : sig;
  }

  // Try X-Webhook-Signature-256
  if (headers['x-webhook-signature-256']) {
    const sig = headers['x-webhook-signature-256'];
    return sig.includes('=') ? sig.split('=')[1] : sig;
  }

  return null;
}

module.exports = {
  generateWebhookSignature,
  verifyWebhookSignature,
  extractSignatureFromHeaders,
};

