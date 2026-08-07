export type AccountTokenMessage = {
  email: string;
  displayName: string;
  token: string;
  expiresAt: Date;
};

export type AccountTokenDelivery = {
  sendEmailVerification(message: AccountTokenMessage): Promise<void>;
  sendPasswordReset(message: AccountTokenMessage): Promise<void>;
};

class WebhookAccountTokenDelivery implements AccountTokenDelivery {
  constructor(
    private readonly url: string,
    private readonly bearerToken: string | null,
  ) {}

  async sendEmailVerification(message: AccountTokenMessage): Promise<void> {
    await this.send('email_verification', message);
  }

  async sendPasswordReset(message: AccountTokenMessage): Promise<void> {
    await this.send('password_reset', message);
  }

  private async send(
    template: 'email_verification' | 'password_reset',
    message: AccountTokenMessage,
  ): Promise<void> {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (this.bearerToken) headers.authorization = `Bearer ${this.bearerToken}`;

    const response = await fetch(this.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        template,
        recipient: message.email,
        displayName: message.displayName,
        token: message.token,
        expiresAt: message.expiresAt.toISOString(),
      }),
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      throw new Error(`Account token delivery failed with HTTP ${response.status}.`);
    }
  }
}

export function createAccountTokenDeliveryFromEnv(): AccountTokenDelivery | null {
  const rawUrl = process.env.AUTH_EMAIL_WEBHOOK_URL?.trim();
  if (!rawUrl) return null;

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') return null;

  const secret = process.env.AUTH_EMAIL_WEBHOOK_BEARER_TOKEN?.trim() || null;
  return new WebhookAccountTokenDelivery(parsed.toString(), secret);
}
