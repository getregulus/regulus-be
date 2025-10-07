const nodemailer = require("nodemailer");
const logger = require("@utils/logger");

/**
 * Email Service
 * Handles sending emails (invitations, notifications, etc.)
 */

// Create reusable transporter
let transporter;

const initializeTransporter = () => {
  if (transporter) return transporter;

  // Configure based on environment variables
  const emailConfig = {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  };

  // For development/testing without real SMTP
  if (process.env.NODE_ENV === "development" && !process.env.SMTP_USER) {
    logger.warn({
      message: "Email service running in test mode (no real emails will be sent)",
    });
    // Create test account if no SMTP credentials
    return null;
  }

  transporter = nodemailer.createTransport(emailConfig);

  // Verify connection configuration
  transporter.verify((error, success) => {
    if (error) {
      logger.error({
        message: "Email service initialization failed",
        error: error.message,
      });
    } else {
      logger.info({
        message: "Email service ready",
      });
    }
  });

  return transporter;
};

/**
 * Send organization invitation email
 * @param {Object} params - Email parameters
 * @param {string} params.to - Recipient email
 * @param {string} params.organizationName - Organization name
 * @param {string} params.inviterName - Name of person sending invitation
 * @param {string} params.role - Role in organization
 * @param {string} params.token - Invitation token
 * @returns {Promise<Object>} Result of sending email
 */
const sendInvitationEmail = async ({
  to,
  organizationName,
  inviterName,
  role,
  token,
}) => {
  try {
    const transport = initializeTransporter();

    // In development mode without SMTP, just log
    if (!transport) {
      logger.info({
        message: "Would send invitation email (test mode)",
        to,
        organizationName,
        inviterName,
        role,
        token,
      });
      return {
        success: true,
        message: "Test mode - email logged but not sent",
      };
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const acceptUrl = `${frontendUrl}/accept-invitation?token=${token}`;

    const mailOptions = {
      from: `${process.env.SMTP_FROM_NAME || "Regulus"} <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to,
      subject: `Invitation to join ${organizationName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #FFF;
              color: #000;
              padding: 20px;
              text-align: center;
              border-bottom: 1px solid #E6E6E6;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background-color: #63b3ed;
              color: #000;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Organization Invitation</h1>
            </div>
            <div class="content">
              <p>Hi,</p>
              <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> as a <strong>${role}</strong>.</p>
              <p>Click the button below to accept the invitation:</p>
              <center>
                <a href="${acceptUrl}" class="button">Accept Invitation</a>
              </center>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #4A90E2;">${acceptUrl}</p>
              <p><strong>Note:</strong> This invitation will expire in 7 days.</p>
            </div>
            <div class="footer">
              <p>If you didn't expect this invitation, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        You've been invited to join ${organizationName}

        ${inviterName} has invited you to join ${organizationName} as a ${role}.

        Accept this invitation by visiting:
        ${acceptUrl}

        This invitation will expire in 7 days.

        If you didn't expect this invitation, you can safely ignore this email.
      `,
    };

    const info = await transport.sendMail(mailOptions);

    logger.info({
      message: "Invitation email sent successfully",
      to,
      organizationName,
      messageId: info.messageId,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    logger.error({
      message: "Failed to send invitation email",
      to,
      organizationName,
      error: error.message,
    });
    throw error;
  }
};

module.exports = {
  sendInvitationEmail,
};

