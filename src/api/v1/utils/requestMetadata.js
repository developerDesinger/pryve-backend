/**
 * Extract request metadata for logging purposes
 * @param {Object} req - Express request object
 * @returns {Object} Request metadata object
 */
function extractRequestMetadata(req) {
  // Extract IP address (handles proxies and load balancers)
  let ipAddress = req.ip || 
                  req.connection?.remoteAddress || 
                  req.socket?.remoteAddress ||
                  (req.headers['x-forwarded-for'] 
                    ? req.headers['x-forwarded-for'].split(',')[0].trim() 
                    : null) ||
                  req.headers['x-real-ip'] ||
                  'unknown';

  // Extract user agent
  const userAgent = req.headers['user-agent'] || 'unknown';

  return {
    ipAddress,
    userAgent,
  };
}

module.exports = {
  extractRequestMetadata,
};

