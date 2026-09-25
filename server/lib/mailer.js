import nodemailer from "nodemailer";

let transporterPromise;

const sender = (name) => `"${name}" <${process.env.SMTP_USER || "noreply@yourtube.local"}>`;

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

export const sendInvoiceEmail = async ({ to, plan, amount, paymentId, orderId }) => {
  const transporter = await getTransporter();
  const rupees = (amount / 100).toFixed(2);

  const info = await transporter.sendMail({
    from: sender("YourTube Billing"),
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
        <tr><td>Date</td><td>${new Date().toLocaleString()}</td></tr>
      </table>
      <p>Your new plan benefits are active immediately.</p>
    `,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) console.log("Invoice email preview:", previewUrl);
  return { messageId: info.messageId, previewUrl: previewUrl || null };
};

export const sendOtpEmail = async ({ to, otp, city, state, device }) => {
  const transporter = await getTransporter();
  const where = [city, state].filter(Boolean).join(", ") || "an unknown location";

  const info = await transporter.sendMail({
    from: sender("YourTube Security"),
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

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) console.log("OTP email preview:", previewUrl);
  return { messageId: info.messageId, previewUrl: previewUrl || null };
};
