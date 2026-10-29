import { NextResponse } from "next/server";

const RESEND_API_KEY =
  process.env.RESEND_API_KEY || "re_SjzX4Cov_HVTF31QYqhFAFtvt4nWj8efU";
const NOTIFICATION_EMAIL =
  process.env.CONTACT_NOTIFICATION_EMAIL || "neyamat7.ullah@gmail.com";
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "Fairu Fashion Concierge <onboarding@resend.dev>";
const BACKEND_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function escapeHtml(str: string): string {
  return str.replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[m] || m
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, topic, subject, message, website } = body;

    // 1. Honeypot check (anti-bot)
    if (website && String(website).trim().length > 0) {
      return NextResponse.json({
        success: true,
        message: "Your message has been received.",
      });
    }

    // 2. Validation
    if (!name || String(name).trim().length < 2) {
      return NextResponse.json(
        { error: "Please provide your full name (minimum 2 characters)." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(String(email).trim())) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    if (!message || String(message).trim().length < 10) {
      return NextResponse.json(
        { error: "Your message should be at least 10 characters long." },
        { status: 400 }
      );
    }

    const safeName = String(name).trim();
    const safeEmail = String(email).trim();
    const safePhone = phone ? String(phone).trim() : "Not provided";
    const safeTopic = topic ? String(topic).trim() : "General Inquiry";
    const safeSubject = subject ? String(subject).trim() : "Website Contact Message";
    const safeMessage = String(message).trim();

    // 3. Send email via Resend API
    const hasDistinctTopic = safeTopic && safeTopic !== safeSubject && safeTopic !== "General Inquiry";
    const emailSubject = hasDistinctTopic
      ? `[Fairu Contact] [${safeTopic}] ${safeSubject}`
      : `[Fairu Contact] ${safeSubject}`;
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${escapeHtml(emailSubject)}</title>
        </head>
        <body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9f6f3; color: #2e2825;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #ebd8de; box-shadow: 0 4px 20px rgba(158, 89, 107, 0.08);">
            <!-- Header Banner -->
            <tr>
              <td style="padding: 28px 32px; background: linear-gradient(135deg, #2E2825 0%, #4A3A3F 100%); text-align: left; border-bottom: 3px solid #9E596B;">
                <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #E8B4C0;">
                  FAIRU FASHION CONCIERGE
                </p>
                <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff;">
                  New Customer Inquiry
                </h1>
              </td>
            </tr>

            <!-- Content Area -->
            <tr>
              <td style="padding: 32px;">
                <!-- Customer Details Card -->
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FCF8F9; border: 1px solid #F2DEE4; border-radius: 8px; margin-bottom: 24px;">
                  <tr>
                    <td style="padding: 16px 20px;">
                      <table width="100%" cellpadding="4" cellspacing="0">
                        <tr>
                          <td width="110" style="font-size: 12px; font-weight: 700; color: #9E596B; text-transform: uppercase; letter-spacing: 0.5px;">Customer:</td>
                          <td style="font-size: 14px; font-weight: 600; color: #2E2825;">${escapeHtml(safeName)}</td>
                        </tr>
                        <tr>
                          <td style="font-size: 12px; font-weight: 700; color: #9E596B; text-transform: uppercase; letter-spacing: 0.5px;">Email:</td>
                          <td style="font-size: 14px; color: #2E2825;"><a href="mailto:${escapeHtml(safeEmail)}" style="color: #9E596B; text-decoration: underline;">${escapeHtml(safeEmail)}</a></td>
                        </tr>
                        <tr>
                          <td style="font-size: 12px; font-weight: 700; color: #9E596B; text-transform: uppercase; letter-spacing: 0.5px;">Phone / WA:</td>
                          <td style="font-size: 14px; color: #2E2825;">
                            ${phone ? `<a href="https://wa.me/${safePhone.replace(/[^\d]/g, "")}" style="color: #2E2825; text-decoration: none; font-weight: 600;">${escapeHtml(safePhone)} (Click to WhatsApp)</a>` : "Not provided"}
                          </td>
                        </tr>
                        <tr>
                          <td style="font-size: 12px; font-weight: 700; color: #9E596B; text-transform: uppercase; letter-spacing: 0.5px;">Topic:</td>
                          <td style="font-size: 13px; font-weight: 600; color: #9E596B;">
                            <span style="display: inline-block; background-color: #F8E6EB; padding: 3px 10px; border-radius: 999px; font-size: 12px;">${escapeHtml(safeTopic)}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="font-size: 12px; font-weight: 700; color: #9E596B; text-transform: uppercase; letter-spacing: 0.5px;">Subject:</td>
                          <td style="font-size: 14px; font-weight: 600; color: #2E2825;">${escapeHtml(safeSubject)}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- Message Box -->
                <p style="margin: 0 0 8px; font-size: 12px; font-weight: 700; color: #4A423D; text-transform: uppercase; letter-spacing: 1px;">
                  Message Content:
                </p>
                <div style="background-color: #ffffff; border: 1px solid #ebd8de; border-left: 4px solid #9E596B; border-radius: 6px; padding: 18px 20px; font-size: 14px; line-height: 1.6; color: #2E2825; white-space: pre-wrap; margin-bottom: 28px;">
${escapeHtml(safeMessage)}
                </div>

                <!-- Action Button -->
                <div style="text-align: center; margin-bottom: 12px;">
                  <a href="mailto:${escapeHtml(safeEmail)}?subject=${encodeURIComponent("Re: " + safeSubject)}" style="display: inline-block; background-color: #9E596B; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 8px;">
                    Reply to ${escapeHtml(safeName)}
                  </a>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color: #FAF6F7; border-top: 1px solid #ebd8de; padding: 16px 32px; text-align: center; font-size: 12px; color: #8A7B76;">
                Received on ${new Date().toLocaleString("en-BD", { timeZone: "Asia/Dhaka" })} · Fairu Fashion Storefront
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [NOTIFICATION_EMAIL],
        reply_to: `${safeName} <${safeEmail}>`,
        subject: emailSubject,
        html: emailHtml,
        text: `Customer: ${safeName}\nEmail: ${safeEmail}\nPhone: ${safePhone}\nTopic: ${safeTopic}\nSubject: ${safeSubject}\n\nMessage:\n${safeMessage}`,
      }),
    });

    if (!resendResponse.ok) {
      const errText = await resendResponse.text();
      console.error("Resend API delivery error:", resendResponse.status, errText);
    }

    // 4. Also forward to NestJS backend database asynchronously
    try {
      await fetch(`${BACKEND_API_URL}/customer/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: safeName,
          email: safeEmail,
          phone: safePhone !== "Not provided" ? safePhone : undefined,
          subject: hasDistinctTopic ? `[${safeTopic}] ${safeSubject}` : safeSubject,
          message: safeMessage,
        }),
      });
    } catch (backendErr) {
      // Non-blocking: Even if backend was sleeping, email was processed via Resend
      console.warn("Backend contact message sync error:", backendErr);
    }

    return NextResponse.json({
      success: true,
      message: "Thank you! Your message has reached our team. We will get back to you shortly.",
    });
  } catch (error) {
    console.error("Contact API handler error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again or message us on WhatsApp." },
      { status: 500 }
    );
  }
}

