import bcrypt from "bcryptjs";
import jwt, { SignOptions, Secret } from "jsonwebtoken";
import nodemailer from "nodemailer";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export function hashPassword(password: string) {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password: string, hash: string) {
  return bcrypt.compareSync(password, hash);
}

export function signToken(payload: Record<string, any>) {
  const secret: Secret = JWT_SECRET as Secret;
  const opts: SignOptions = {
    expiresIn: JWT_EXPIRES_IN as unknown as SignOptions["expiresIn"],
  };
  return jwt.sign(payload as string | object | Buffer, secret, opts);
}

export function verifyToken(token: string) {
  try {
    const secret: Secret = JWT_SECRET as Secret;
    return jwt.verify(token, secret);
  } catch (e) {
    return null;
  }
}

export async function sendEmail(to: string, subject: string, html: string) {
  // Support generic SMTP via env vars for production (SendGrid/Postmark/etc.)
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 465;
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_PASS;

  if (!smtpUser || !smtpPass) {
    console.warn("SMTP_USER/SMTP_PASS not set — skipping email send");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for other ports
    auth: { user: smtpUser, pass: smtpPass },
  });

  const from = `${process.env.GMAIL_FROM_NAME || "FinTrack"} <${smtpUser}>`;
  const text = html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      text: text || subject,
      html,
    });
  } catch (err) {
    console.error("sendEmail error:", err);
    throw err;
  }
}
