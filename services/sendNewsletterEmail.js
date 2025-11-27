import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();


const ENV_DOMAINS = {
  prod: "https://gotravelx.com",
  stg: "https://stg.gotravelx.com",
  qa: "https://qa.gotravelx.com",
  dev: "https://dev.gotravelx.com",
  local: "http://localhost:3001",
};

const sendNewsletterEmail = async (email, env = "prod") => {

  // ---- 1️⃣ Detect correct domain based on environment ----
  const baseUrl = ENV_DOMAINS[env] || ENV_DOMAINS.prod;
   
  // ---- 2️⃣ Build unsubscribe URL ----
  const unsubscribeUrl = `${baseUrl}/unsubscribe-mail?email=${encodeURIComponent(
    email
  )}`;

  // ---- 3️⃣ Configure Mail Transport ----
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSCODE,
    },
  });

  // ---- 4️⃣ HTML Email Template ----
  const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Track Your Flight - GoTravelX</title>
      </head>
      <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f0f4f8;">
        <table role="presentation" style="width:100%;border-collapse:collapse;">
          <tr>
            <td align="center" style="padding:40px 20px;">
              <table role="presentation" style="max-width:600px;width:100%;background:white;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
                
                <tr>
                  <td style="padding:40px 30px 20px;text-align:center;">
                    <h1 style="margin:0;color:#1e40af;font-size:32px;font-weight:700;">
                      ✈️ GoTravelX
                    </h1>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 30px 30px;">
                    <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.5;">
                      Hello Traveler,
                    </p>
                    <p style="margin:0 0 24px;color:#374151;font-size:16px;line-height:1.5;">
                      Track your flights in real-time with GoTravelX! Get instant updates on departures, arrivals, delays, and gate changes.
                    </p>

                    <table role="presentation" style="width:100%;">
                      <tr>
                        <td align="center" style="padding:20px 0;">
                          <a href="${baseUrl}"
                             style="display:inline-block;background:#1e40af;color:#ffffff;padding:14px 40px;border-radius:50px;text-decoration:none;font-weight:600;font-size:16px;">
                            Track Flight Now
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:30px;border-top:1px solid #e5e7eb;text-align:center;">
                    <p style="margin:0 0 8px;color:#6b7280;font-size:12px;">
                      You are receiving this email because you subscribed to GoTravelX updates.
                    </p>

                    <p style="margin:0;color:#6b7280;font-size:12px;">
                      <a href="${unsubscribeUrl}" style="color:#1e40af;text-decoration:underline;">
                        Unsubscribe
                      </a>
                    </p>
                  </td>
                </tr>

              </table>

              <p style="margin:20px 0 0;color:#6b7280;font-size:12px;text-align:center;">
                © ${new Date().getFullYear()} GoTravelX. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  // ---- 5️⃣ Plain text fallback ----
  const textTemplate = `
GoTravelX - Track Your Flight in Real-Time

Hello Traveler,

Track your flights in real-time with GoTravelX.

Unsubscribe: ${unsubscribeUrl}

© ${new Date().getFullYear()} GoTravelX. All rights reserved.
  `.trim();

  // ---- 6️⃣ Mail Options ----
  const mailOptions = {
    from: `"GoTravelX" <${process.env.SMTP_EMAIL}>`,
    to: email,
    subject: "✈️ Track Your Flight in Real-Time with GoTravelX",
    html: htmlTemplate,
    text: textTemplate,
  };

  // ---- 7️⃣ Send Email ----
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Newsletter sent to ${email}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[EMAIL] Failed to send newsletter to ${email}:`, error.message);
    throw error;
  }
};

export default sendNewsletterEmail;
