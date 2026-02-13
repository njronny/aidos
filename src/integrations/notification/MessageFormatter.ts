import {
  UnifiedMessage,
  EmailPayload,
  DingTalkPayload,
  SlackPayload,
  NotificationPriority,
} from '../../core/notifier/types';

/**
 * Message Formatter - Converts UnifiedMessage to channel-specific formats
 */
export class MessageFormatter {
  /**
   * Format message for Email
   */
  formatForEmail(message: UnifiedMessage): EmailPayload {
    const priorityLabel = this.getPriorityLabel(message.priority);
    const priorityColor = this.getPriorityColor(message.priority);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${priorityColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
    .footer { margin-top: 20px; font-size: 12px; color: #666; text-align: center; }
    .priority { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">${this.escapeHtml(message.title)}</h2>
    </div>
    <div class="content">
      <span class="priority" style="background: ${priorityColor};">${priorityLabel}</span>
      <p>${this.formatContent(message.content)}</p>
      ${message.metadata ? this.renderMetadata(message.metadata) : ''}
    </div>
    <div class="footer">
      <p>AIDOS Notification - ${message.timestamp.toLocaleString()}</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    const text = `[${priorityLabel}] ${message.title}\n\n${message.content}\n\nSent at: ${message.timestamp.toLocaleString()}`;

    return {
      to: '', // Will be set by EmailService when sending
      subject: `[${priorityLabel}] ${message.title}`,
      html,
      text,
    };
  }

  /**
   * Format message for DingTalk
   */
  formatForDingTalk(message: UnifiedMessage): DingTalkPayload {
    const priorityEmoji = this.getPriorityEmoji(message.priority);
    const content = `${priorityEmoji} **${message.title}**\n\n${message.content}\n\n---\n*Type:* ${message.type} | *Time:* ${message.timestamp.toLocaleString()}`;

    return {
      msgtype: 'markdown',
      markdown: {
        title: message.title,
        text: content,
      },
    };
  }

  /**
   * Format message for Slack
   */
  formatForSlack(message: UnifiedMessage): SlackPayload {
    const priorityColor = this.getPriorityHexColor(message.priority);
    const priorityEmoji = this.getPriorityEmoji(message.priority);

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${priorityEmoji} ${message.title}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: message.content,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `*Type:* ${message.type} | *Priority:* ${message.priority} | *Time:* ${message.timestamp.toLocaleString()}`,
          },
        ],
      },
    ];

    return {
      text: `${priorityEmoji} ${message.title}: ${message.content}`,
      blocks,
      attachments: [
        {
          color: priorityColor,
          footer: 'AIDOS Notification',
          ts: Math.floor(message.timestamp.getTime() / 1000),
        },
      ],
    };
  }

  /**
   * Get priority label
   */
  private getPriorityLabel(priority: NotificationPriority): string {
    switch (priority) {
      case 'urgent':
        return 'URGENT';
      case 'high':
        return 'HIGH';
      case 'normal':
        return 'NORMAL';
      case 'low':
        return 'LOW';
      default:
        return 'NORMAL';
    }
  }

  /**
   * Get priority color for email
   */
  private getPriorityColor(priority: NotificationPriority): string {
    switch (priority) {
      case 'urgent':
        return '#dc3545';
      case 'high':
        return '#fd7e14';
      case 'normal':
        return '#ffc107';
      case 'low':
        return '#28a745';
      default:
        return '#6c757d';
    }
  }

  /**
   * Get priority hex color for Slack
   */
  private getPriorityHexColor(priority: NotificationPriority): string {
    switch (priority) {
      case 'urgent':
        return '#dc3545';
      case 'high':
        return '#fd7e14';
      case 'normal':
        return '#ffc107';
      case 'low':
        return '#28a745';
      default:
        return '#6c757d';
    }
  }

  /**
   * Get priority emoji
   */
  private getPriorityEmoji(priority: NotificationPriority): string {
    switch (priority) {
      case 'urgent':
        return '🔴';
      case 'high':
        return '🟠';
      case 'normal':
        return '🟡';
      case 'low':
        return '🟢';
      default:
        return '⚪';
    }
  }

  /**
   * Escape HTML characters
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Format content (convert newlines to br)
   */
  private formatContent(content: string): string {
    return this.escapeHtml(content).replace(/\n/g, '<br>');
  }

  /**
   * Render metadata as HTML
   */
  private renderMetadata(metadata: Record<string, unknown>): string {
    const rows = Object.entries(metadata)
      .map(([key, value]) => `<tr><td><strong>${this.escapeHtml(key)}:</strong></td><td>${this.escapeHtml(String(value))}</td></tr>`)
      .join('');

    return rows ? `<table style="width: 100%; margin-top: 10px; border-collapse: collapse;">${rows}</table>` : '';
  }
}

export default MessageFormatter;
