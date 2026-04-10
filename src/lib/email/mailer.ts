import nodemailer from "nodemailer";

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

/**
 * Erstellt einen Nodemailer-Transport basierend auf den Umgebungsvariablen.
 * SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM müssen gesetzt sein.
 */
function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP nicht konfiguriert. SMTP_HOST, SMTP_USER und SMTP_PASS müssen gesetzt sein.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export interface SendResult {
  messageId: string;
}

export async function sendMail(options: MailOptions): Promise<SendResult> {
  const transport = createTransport();
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;

  const info = await transport.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    attachments: options.attachments,
  });

  return { messageId: info.messageId };
}
