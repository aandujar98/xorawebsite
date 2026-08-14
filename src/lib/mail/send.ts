import { AppError } from "@/lib/errors";
import { getMailConfig } from "@/lib/env";

export type OutboundMail = {
  to: string;
  subject: string;
  text: string;
};

export type MailSender = (message: OutboundMail) => Promise<void>;

let testSender: MailSender | null = null;

export function setMailSenderForTests(sender: MailSender | null) {
  testSender = sender;
}

export function isMailConfigured(): boolean {
  return Boolean(testSender) || getMailConfig() !== null;
}

async function sendWithResend(
  apiKey: string,
  from: string,
  message: OutboundMail,
): Promise<void> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [message.to],
      subject: message.subject,
      text: message.text,
    }),
  });

  if (!response.ok) {
    let details = "";
    try {
      details = await response.text();
    } catch {
      details = "";
    }
    const lowered = details.toLowerCase();
    console.warn("[recovery] resend rejected", { status: response.status });
    if (
      lowered.includes("testing emails") ||
      lowered.includes("verify a domain") ||
      lowered.includes("domain is not verified") ||
      lowered.includes("only send testing")
    ) {
      throw new AppError("MAIL_TEST_MODE");
    }
    throw new Error("RESEND_FAILED");
  }

  console.warn("[recovery] resend accepted", { status: response.status });
}

async function sendWithSmtp(
  config: NonNullable<ReturnType<typeof getMailConfig>>,
  message: OutboundMail,
): Promise<void> {
  const nodemailer = await import("nodemailer");
  const createTransport =
    nodemailer.createTransport ?? nodemailer.default.createTransport;
  const transporter = createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth:
      config.smtpUser && config.smtpPassword
        ? { user: config.smtpUser, pass: config.smtpPassword }
        : undefined,
  });

  await transporter.sendMail({
    from: config.from,
    to: message.to,
    subject: message.subject,
    text: message.text,
  });
}

export async function sendMail(message: OutboundMail): Promise<void> {
  if (testSender) {
    await testSender(message);
    return;
  }

  const config = getMailConfig();
  if (!config) {
    throw new Error("MAIL_NOT_CONFIGURED");
  }

  if (config.resendApiKey) {
    await sendWithResend(config.resendApiKey, config.from, message);
    return;
  }

  await sendWithSmtp(config, message);
}
