import nodemailer from 'nodemailer';

const DEFAULT_CONTACT_EMAIL = 'belivestack1316@gmail.com';

const formatText = (value) => (typeof value === 'string' ? value : value == null ? '' : String(value));

export const sendInquiryEmail = async (enquiry) => {
  const to = process.env.CONTACT_EMAIL || DEFAULT_CONTACT_EMAIL;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    console.warn(`Enquiry email was not sent because SMTP is not configured. Intended recipient: ${to}`);
    return { sent: false, reason: 'smtp-not-configured' };
  }

  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT || (smtpHost === 'smtp.gmail.com' ? 465 : 587));
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: process.env.SMTP_SECURE === undefined ? smtpPort === 465 : process.env.SMTP_SECURE === 'true',
    auth: { user: smtpUser, pass: smtpPass },
  });
  const from = process.env.MAIL_FROM || smtpUser;

  const projectTitle = formatText(enquiry.projectTitle || enquiry.project_title || 'New project enquiry');
  const fullName = formatText(enquiry.fullName || enquiry.full_name || 'Customer');
  const email = formatText(enquiry.email || '');
  const phone = formatText(enquiry.phone || '');
  const college = formatText(enquiry.college || '');
  const course = formatText(enquiry.course || '');
  const category = formatText(enquiry.category || '');
  const technologies = formatText(enquiry.technologies || '');
  const features = formatText(enquiry.features || enquiry.required_features || '');
  const deadline = formatText(enquiry.deadline || enquiry.project_deadline || '');
  const budgetRange = formatText(enquiry.budgetRange || enquiry.budget_range || 'Not sure yet');
  const additionalRequirements = formatText(enquiry.additionalRequirements || enquiry.additional_requirements || '');

  const text = [
    'New BELIEVE STACK enquiry',
    '',
    `Name: ${fullName}`,
    `Email: ${email}`,
    `Phone: ${phone}`,
    `College: ${college}`,
    `Course: ${course}`,
    `Category: ${category}`,
    `Project Title: ${projectTitle}`,
    `Technologies: ${technologies}`,
    `Required Features: ${features}`,
    `Deadline: ${deadline}`,
    `Budget Range: ${budgetRange}`,
    `Additional Requirements: ${additionalRequirements}`,
    '',
    'This enquiry was submitted through the BELIEVE STACK contact form.',
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
      <h2 style="margin-bottom: 12px;">New BELIEVE STACK enquiry</h2>
      <p><strong>Name:</strong> ${fullName}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      <p><strong>College:</strong> ${college}</p>
      <p><strong>Course:</strong> ${course}</p>
      <p><strong>Category:</strong> ${category}</p>
      <p><strong>Project Title:</strong> ${projectTitle}</p>
      <p><strong>Technologies:</strong> ${technologies}</p>
      <p><strong>Required Features:</strong> ${features}</p>
      <p><strong>Deadline:</strong> ${deadline}</p>
      <p><strong>Budget Range:</strong> ${budgetRange}</p>
      <p><strong>Additional Requirements:</strong> ${additionalRequirements}</p>
    </div>
  `;

  const delivery = await transporter.sendMail({
    from,
    to,
    replyTo: email || from,
    subject: `New enquiry: ${projectTitle}`,
    text,
    html,
  });

  if (!delivery.accepted?.includes(to)) {
    throw new Error(`SMTP did not accept the enquiry notification for ${to}.`);
  }

  return { sent: true, recipient: to, messageId: delivery.messageId };
};
