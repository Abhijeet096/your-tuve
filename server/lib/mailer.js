import nodemailer from "nodemailer";

let transporterPromise;

const fromaddress = () => process.env.MAIL_FROM || process.env.SMTP_USER || "noreply@yourtube.local";

const getTransporter = async () => {
  if (transporterPromise) return transporterPromise;

  if (process.env.SMTP_HOST) {
    transporterPromise = Promise.resolve(
      nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
      })
    );
  } else {
    transporterPromise = nodemailer.createTestAccount().then((testAccount) =>
      nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      })
    );
  }
  return transporterPromise;
};

const deliver = async ({ fromname, to, subject, html }) => {
  if (process.env.BREVO_API_KEY) {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: fromname, email: fromaddress() },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`Brevo ${response.status}: ${data.message || "send failed"}`);
    }
    return { messageId: data.messageId, previewUrl: null };
  }

  const transporter = await getTransporter();
  const info = await transporter.sendMail({
    from: `"${fromname}" <${fromaddress()}>`,
    to,
    subject,
    html,
  });
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) console.log("Email preview:", previewUrl);
  return { messageId: info.messageId, previewUrl: previewUrl || null };
};

export const sendInvoiceEmail = async ({ to, plan, amount, paymentId, orderId, validtill }) => {
  const rupees = (amount / 100).toFixed(2);

  return deliver({
    fromname: "YourTube Billing",
    to,
    subject: `Your YourTube ${plan} plan is active`,
    html: `
      <h2>Payment successful</h2>
      <p>Thanks for upgrading to the <b>${plan}</b> plan.</p>
      <table cellpadding="6">
        <tr><td>Plan</td><td>${plan}</td></tr>
        <tr><td>Amount</td><td>₹${rupees}</td></tr>
        <tr><td>Payment ID</td><td>${paymentId}</td></tr>
        <tr><td>Order ID</td><td>${orderId}</td></tr>
        <tr><td>Date</td><td>${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</td></tr>
        ${
          validtill
            ? `<tr><td>Valid till</td><td>${new Date(validtill).toLocaleDateString("en-IN", {
                timeZone: "Asia/Kolkata",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}</td></tr>`
            : ""
        }
      </table>
      <p>Your new plan benefits are active immediately.</p>
    `,
  });
};

export const sendOtpEmail = async ({ to, otp, city, state, device }) => {
  const where = [city, state].filter(Boolean).join(", ") || "an unknown location";

  return deliver({
    fromname: "YourTube Security",
    to,
    subject: `${otp} is your YourTube verification code`,
    html: `
      <h2>New sign-in detected</h2>
      <p>Someone is signing in to your YourTube account from <b>${where}</b>${
        device ? ` on <b>${device}</b>` : ""
      }.</p>
      <p>Your verification code is:</p>
      <p style="font-size:28px;letter-spacing:6px;font-weight:bold">${otp}</p>
      <p>The code expires in 5 minutes. If this wasn't you, ignore this email.</p>
    `,
  });
};
