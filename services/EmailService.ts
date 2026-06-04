interface SendEmailOptions {
  to: { email: string; name?: string };
  subject: string;
  text: string;
  html: string;
}

const SENDER_NAME = "The Cave Bank";
const SENDER_EMAIL = "hello@bank.housecave.org";

const sendEmail = async ({ to, subject, text, html }: SendEmailOptions) => {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.EMAIL_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
      to: [to],
      subject,
      textContent: text,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message);
  }
};

export const sendOTP = async (email: string, name: string, code: string) => {
  return sendEmail({
    to: { email },
    subject: "Your verification code",
    text: `
  Hi ${name},

  Welcome! Your verification code is: ${code}

  It expires in 10 minutes.

  If this wasn’t you, you can safely ignore this email.

  — The Cave Bank Team
      `,
    html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
          <div style="max-width: 480px; margin: 40px auto; padding: 24px; border: 1px solid #eee; border-radius: 10px;">
            
            <p>Hi ${name},</p>
            <p>Welcome! Your verification code is:</p>

            <div style="
              font-size: 34px;
              font-weight: bold;
              letter-spacing: 6px;
              margin: 28px 0;
              text-align: center;
            ">
              ${code}
            </div>

            <p>It expires in 10 minutes.</p>

            <p style="font-size: 13px; color: #666; margin-top: 24px;">
              If this wasn’t you, you can safely ignore this email.
            </p>

            <p style="margin-top: 32px;">
              — The Cave Bank Team
            </p>

          </div>
        </div>
      `,
  });
};

export const sendPasswordResetOTP = async (
  email: string,
  name: string,
  code: string,
) => {
  return sendEmail({
    to: { email },
    subject: "Reset your PIN",
    text: `
  Hi ${name},

  We received a request to reset your Cave Bank PIN.

  Your reset code is: ${code}

  It expires in 10 minutes.

  If you didn't request this, you can safely ignore this email — your PIN has not been changed.

  — The Cave Bank Team
      `,
    html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
          <div style="max-width: 480px; margin: 40px auto; padding: 24px; border: 1px solid #eee; border-radius: 10px;">

            <p>Hi ${name},</p>
            <p>We received a request to reset your Cave Bank PIN. Use the code below:</p>

            <div style="
              font-size: 34px;
              font-weight: bold;
              letter-spacing: 6px;
              margin: 28px 0;
              text-align: center;
            ">
              ${code}
            </div>

            <p>It expires in 10 minutes.</p>

            <p style="font-size: 13px; color: #666; margin-top: 24px;">
              If you didn't request a PIN reset, you can safely ignore this email — your PIN has not been changed.
            </p>

            <p style="margin-top: 32px;">
              — The Cave Bank Team
            </p>

          </div>
        </div>
      `,
  });
};
