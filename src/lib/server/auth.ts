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
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_PASS;
  if (!user || !pass) {
    console.warn("GMAIL_USER/GMAIL_PASS not set — skipping email send");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `${process.env.GMAIL_FROM_NAME || "FinTrack"} <${user}>`,
    to,
    subject,
    html,
  });
}
