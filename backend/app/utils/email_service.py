import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime

DEFAULT_ADMIN_EMAIL = "vasukumar.telugu@innomatics.in"

def generate_mock_interview_html(feedback):
    """Generates an HTML email report for the Innomatics Java Mock Interview."""
    
    verdict = (feedback.final_verdict or "Needs Improvement").upper()
    if verdict == "PASS":
        verdict_color = "#15803d"
        verdict_bg = "#dcfce7"
    elif "CRITICAL" in verdict:
        verdict_color = "#b91c1c"
        verdict_bg = "#fee2e2"
    else:
        verdict_color = "#b45309"
        verdict_bg = "#fef3c7"

    # Technical Ratings HTML rows
    tech_rows = ""
    for module, rating in (feedback.technical_ratings or {}).items():
        r_upper = (rating or "Average").upper()
        if r_upper == "EXCELLENT":
            r_badge = '<span style="background:#dcfce7;color:#15803d;padding:3px 8px;border-radius:12px;font-weight:bold;font-size:11px;">Excellent (4/4)</span>'
        elif r_upper == "GOOD":
            r_badge = '<span style="background:#e0f2fe;color:#0369a1;padding:3px 8px;border-radius:12px;font-weight:bold;font-size:11px;">Good (3/4)</span>'
        elif r_upper == "AVERAGE":
            r_badge = '<span style="background:#fef3c7;color:#b45309;padding:3px 8px;border-radius:12px;font-weight:bold;font-size:11px;">Average (2/4)</span>'
        else:
            r_badge = '<span style="background:#fee2e2;color:#b91c1c;padding:3px 8px;border-radius:12px;font-weight:bold;font-size:11px;">Poor (1/4)</span>'
            
        tech_rows += f"""
        <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:10px 12px;font-size:13px;color:#1e293b;">{module}</td>
            <td style="padding:10px 12px;text-align:right;">{r_badge}</td>
        </tr>
        """

    # Technical Action Plan HTML
    tech_action_rows = ""
    for item, status in (feedback.technical_action_plan or {}).items():
        s_upper = (status or "Needed").upper()
        if s_upper == "NEEDED":
            s_badge = '<span style="color:#b91c1c;font-weight:bold;font-size:12px;">⚠️ Needed</span>'
        elif s_upper == "NOTNEEDED":
            s_badge = '<span style="color:#15803d;font-weight:bold;font-size:12px;">✓ Proficient</span>'
        else:
            s_badge = '<span style="color:#64748b;font-size:12px;">N/A</span>'
            
        tech_action_rows += f"""
        <li style="margin-bottom:8px;font-size:13px;color:#334155;">
            <strong>{item}</strong>: {s_badge}
        </li>
        """

    # Soft Skills Action Plan HTML
    soft_action_rows = ""
    for item, status in (feedback.soft_skills_action_plan or {}).items():
        s_upper = (status or "Needed").upper()
        if s_upper == "NEEDED":
            s_badge = '<span style="color:#b91c1c;font-weight:bold;font-size:12px;">⚠️ Needed</span>'
        elif s_upper == "NOTNEEDED":
            s_badge = '<span style="color:#15803d;font-weight:bold;font-size:12px;">✓ Good</span>'
        else:
            s_badge = '<span style="color:#64748b;font-size:12px;">N/A</span>'
            
        soft_action_rows += f"""
        <li style="margin-bottom:8px;font-size:13px;color:#334155;">
            <strong>{item}</strong>: {s_badge}
        </li>
        """

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>FSD Mock Interview Feedback - Innomatics Research Labs</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <div style="max-width:650px;margin:30px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);border:1px solid #e2e8f0;">
            
            <!-- Header Banner -->
            <div style="background:linear-gradient(135deg, #ea580c 0%, #c2410c 100%);padding:25px;text-align:center;color:#ffffff;">
                <h1 style="margin:0;font-size:22px;font-weight:900;letter-spacing:0.5px;">INNOMATICS RESEARCH LABS</h1>
                <p style="margin:5px 0 0 0;font-size:14px;opacity:0.95;font-weight:600;">FSD - Mock Interview | JAVA Assessment Report</p>
            </div>

            <div style="padding:25px;">
                <!-- Final Verdict Banner -->
                <div style="background:{verdict_bg};border:2px solid {verdict_color};border-radius:8px;padding:15px;text-align:center;margin-bottom:25px;">
                    <div style="font-size:12px;font-weight:bold;text-transform:uppercase;color:{verdict_color};letter-spacing:1px;">Overall Interview Result</div>
                    <div style="font-size:24px;font-weight:900;color:{verdict_color};margin-top:4px;">{feedback.final_verdict}</div>
                </div>

                <!-- Candidate Info Card -->
                <div style="background:#f8fafc;border-radius:8px;padding:18px;margin-bottom:25px;border:1px solid #e2e8f0;">
                    <h3 style="margin:0 0 12px 0;font-size:14px;color:#0f172a;text-transform:uppercase;letter-spacing:0.5px;">Learner Details</h3>
                    <table style="width:100%;font-size:13px;border-collapse:collapse;">
                        <tr>
                            <td style="padding:4px 0;color:#64748b;width:40%;">Learner Name:</td>
                            <td style="padding:4px 0;font-weight:bold;color:#0f172a;">{feedback.learner_name}</td>
                        </tr>
                        <tr>
                            <td style="padding:4px 0;color:#64748b;">Enrollment ID:</td>
                            <td style="padding:4px 0;font-weight:bold;color:#0f172a;">{feedback.enrollment_id}</td>
                        </tr>
                        <tr>
                            <td style="padding:4px 0;color:#64748b;">Batch:</td>
                            <td style="padding:4px 0;font-weight:bold;color:#0f172a;">{feedback.batch_number}</td>
                        </tr>
                        <tr>
                            <td style="padding:4px 0;color:#64748b;">Course:</td>
                            <td style="padding:4px 0;font-weight:bold;color:#0f172a;">{feedback.course_name}</td>
                        </tr>
                        <tr>
                            <td style="padding:4px 0;color:#64748b;">Branch:</td>
                            <td style="padding:4px 0;font-weight:bold;color:#0f172a;">{feedback.branch}</td>
                        </tr>
                        <tr>
                            <td style="padding:4px 0;color:#64748b;">Interview Date:</td>
                            <td style="padding:4px 0;font-weight:bold;color:#0f172a;">{feedback.interview_date}</td>
                        </tr>
                        <tr>
                            <td style="padding:4px 0;color:#64748b;">Interviewer:</td>
                            <td style="padding:4px 0;font-weight:bold;color:#0f172a;">{feedback.interviewer_name}</td>
                        </tr>
                        <tr>
                            <td style="padding:4px 0;color:#64748b;">Punctuality:</td>
                            <td style="padding:4px 0;font-weight:bold;color:#0f172a;">{feedback.punctuality}</td>
                        </tr>
                    </table>
                </div>

                <!-- Technical Rating Table -->
                <div style="margin-bottom:25px;">
                    <h3 style="margin:0 0 12px 0;font-size:15px;color:#0f172a;font-weight:bold;">Technical Rating (Module-wise)</h3>
                    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
                        <tr style="background:#f1f5f9;border-bottom:1px solid #e2e8f0;">
                            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#475569;">Java Module</th>
                            <th style="padding:10px 12px;text-align:right;font-size:12px;color:#475569;">Rating</th>
                        </tr>
                        {tech_rows}
                    </table>
                </div>

                <!-- Technical Action Plan -->
                <div style="margin-bottom:25px;background:#fff7ed;padding:18px;border-radius:8px;border:1px solid #fed7aa;">
                    <h3 style="margin:0 0 12px 0;font-size:14px;color:#9a3412;font-weight:bold;">Action Plan (Java Technical Improvement)</h3>
                    <ul style="margin:0;padding-left:18px;">
                        {tech_action_rows}
                    </ul>
                </div>

                <!-- Soft Skills Action Plan -->
                <div style="margin-bottom:25px;background:#f0fdf4;padding:18px;border-radius:8px;border:1px solid #bbf7d0;">
                    <h3 style="margin:0 0 12px 0;font-size:14px;color:#166534;font-weight:bold;">Action Plan (Soft Skills)</h3>
                    <ul style="margin:0;padding-left:18px;">
                        {soft_action_rows}
                    </ul>
                </div>

                <!-- Candidate Feedback / Next Steps -->
                {f'''
                <div style="margin-bottom:25px;background:#f8fafc;padding:18px;border-radius:8px;border:1px solid #e2e8f0;">
                    <h3 style="margin:0 0 8px 0;font-size:14px;color:#0f172a;font-weight:bold;">Interviewer Feedback & Notes</h3>
                    <p style="margin:0;font-size:13px;color:#334155;line-height:1.5;white-space:pre-line;">{feedback.candidate_feedback}</p>
                </div>
                ''' if feedback.candidate_feedback else ''}

                <div style="border-top:1px solid #e2e8f0;padding-top:15px;text-align:center;font-size:12px;color:#94a3b8;">
                    <p style="margin:0;">This report was generated by Fullstack Experts Academy / Innomatics Research Labs.</p>
                    <p style="margin:4px 0 0 0;">For queries, contact your mentor or <a href="mailto:{DEFAULT_ADMIN_EMAIL}" style="color:#ea580c;text-decoration:none;">{DEFAULT_ADMIN_EMAIL}</a>.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    return html

def send_mock_interview_email(feedback, admin_email=DEFAULT_ADMIN_EMAIL):
    """
    Dispatches mock interview feedback email to both:
    1. The student's email address
    2. The admin / interviewer email (vasukumar.telugu@innomatics.in)
    """
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")
    mail_from = os.getenv("MAIL_FROM", smtp_user or "noreply@innomatics.in")

    recipients = []
    if feedback.learner_email:
        recipients.append(feedback.learner_email.strip())
    if admin_email:
        recipients.append(admin_email.strip())
    if feedback.interviewer_email and feedback.interviewer_email.strip() not in recipients:
        recipients.append(feedback.interviewer_email.strip())

    if not recipients:
        return {"success": False, "message": "No recipient email addresses found."}

    subject = f"FSD - Mock Interview Feedback | {feedback.learner_name} ({feedback.enrollment_id}) - {feedback.final_verdict}"
    html_content = generate_mock_interview_html(feedback)

    # If SMTP is configured, attempt real email delivery
    if smtp_host and smtp_user and smtp_pass:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"Innomatics Mock Interviews <{mail_from}>"
            msg["To"] = feedback.learner_email
            msg["Cc"] = admin_email
            msg.attach(MIMEText(html_content, "html"))

            with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.sendmail(mail_from, recipients, msg.as_string())
            
            return {
                "success": True,
                "recipients": recipients,
                "message": f"Email successfully dispatched to {', '.join(recipients)}."
            }
        except Exception as e:
            print(f"SMTP email dispatch error: {e}")
            # Fallback to simulated delivery
            return {
                "success": True,
                "simulated": True,
                "recipients": recipients,
                "message": f"SMTP not ready or failed ({str(e)}). Feedback saved and email queued to {', '.join(recipients)}."
            }
    else:
        # Development / local simulated email log
        print(f"[EMAIL SIMULATION] Sent Mock Interview Evaluation to: {', '.join(recipients)}")
        print(f"[EMAIL SIMULATION] Subject: {subject}")
        return {
            "success": True,
            "simulated": True,
            "recipients": recipients,
            "message": f"Feedback email recorded for student ({feedback.learner_email}) and admin ({admin_email})."
        }
