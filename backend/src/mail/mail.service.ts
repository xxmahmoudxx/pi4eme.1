import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'smtp-relay.brevo.com',
    port: Number(process.env.MAIL_PORT) || 587,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  async sendVerificationEmail(email: string, token: string) {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
    const verifyUrl = `${backendUrl}/auth/verify-email?token=${token}`;

    const info = await this.transporter.sendMail({
      from: `"BI Platform" <${process.env.MAIL_FROM || 'noreply@biplatform.com'}>`,
      to: email,
      subject: 'Verify your email',
      html: `
  <h2>Welcome to BI Platform!</h2>
  <p>Click the button below to verify your email:</p>
  <a href="${verifyUrl}" style="
    background-color: #4f46e5;
    color: white;
    padding: 12px 24px;
    border-radius: 6px;
    text-decoration: none;
    font-weight: bold;
  ">Verify Email</a>
  <p>This link expires in 24 hours.</p>
`,
    });

    console.log('Email sent:', info.messageId);
  }
}