import test from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
import { sendInquiryEmail } from '../src/utils/mailer.js';

test('sendInquiryEmail uses runtime SMTP settings and the configured recipient', async (t) => {
  const environment = ['CONTACT_EMAIL', 'MAIL_FROM', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASS'];
  const previousEnvironment = Object.fromEntries(environment.map((key) => [key, process.env[key]]));
  t.after(() => {
    for (const key of environment) {
      if (previousEnvironment[key] === undefined) delete process.env[key];
      else process.env[key] = previousEnvironment[key];
    }
  });

  Object.assign(process.env, {
    CONTACT_EMAIL: 'enquiries@example.com',
    MAIL_FROM: 'verified-sender@example.com',
    SMTP_HOST: 'smtp.example.com',
    SMTP_PORT: '587',
    SMTP_SECURE: 'false',
    SMTP_USER: 'smtp-user@example.com',
    SMTP_PASS: 'test-password',
  });

  const message = {
    projectTitle: 'Test project',
    fullName: 'Test Customer',
    email: 'customer@example.com',
  };
  const sendMail = t.mock.fn(async (mail) => ({
    accepted: [mail.to],
    messageId: 'test-message-id',
  }));
  const createTransport = t.mock.method(nodemailer, 'createTransport', (config) => {
    assert.equal(config.host, 'smtp.example.com');
    assert.equal(config.port, 587);
    assert.equal(config.secure, false);
    assert.deepEqual(config.auth, { user: 'smtp-user@example.com', pass: 'test-password' });
    return { sendMail };
  });

  const result = await sendInquiryEmail(message);

  assert.equal(createTransport.mock.callCount(), 1);
  assert.equal(sendMail.mock.calls[0].arguments[0].to, 'enquiries@example.com');
  assert.equal(sendMail.mock.calls[0].arguments[0].from, 'verified-sender@example.com');
  assert.equal(result.sent, true);
  assert.equal(result.recipient, 'enquiries@example.com');
  assert.equal(result.messageId, 'test-message-id');
});
