"""
EyeGuard Email Scheduler
Runs every minute, checks each user's reminder_time, and sends emails at the right time.
This means if a user sets 2:00 PM, they get emailed at 2:00 PM — not stuck at 9 AM.
"""

import os
import smtplib
import logging
from datetime import date, datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)


def send_high_risk_alert(to_email: str, user_name: str, risk_level: str, recommendations=None) -> bool:
    """Send an immediate high-risk alert email to the user. Returns True on success."""
    smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    smtp_user = os.environ.get("SMTP_USER", "")
    smtp_pass = os.environ.get("SMTP_PASS", "")

    if not smtp_user or not smtp_pass:
        logger.warning("[Email] SMTP credentials not configured — skipping high-risk alert.")
        return False

    try:
        is_critical = risk_level == "Critical"
        color = "#dc2626" if is_critical else "#ea580c"
        bg_color = "#fef2f2" if is_critical else "#fff7ed"
        border_color = "#fecaca" if is_critical else "#fed7aa"

        recommendation_html = ""
        if recommendations:
            items = recommendations[:3]
            recommendation_html = (
                "<p style='color:#475569;font-weight:600;margin-top:16px;'>Recommended actions:</p>"
                "<ul style='color:#475569;'>"
                + "".join(f"<li>{item}</li>" for item in items)
                + "</ul>"
            )

        html = f"""
        <html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <div style="background:#f97316;padding:24px;border-radius:12px 12px 0 0;">
            <h1 style="color:white;margin:0;font-size:24px;">👁 EyeGuard</h1>
            <p style="color:#fed7aa;margin:4px 0 0;">Eye Health Risk Alert</p>
          </div>
          <div style="background:#f8fafc;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;">
            <p style="color:#1e293b;font-size:16px;">Hi {user_name},</p>
            <div style="background:{bg_color};border:1px solid {border_color};border-radius:8px;padding:16px;margin:16px 0;">
              <p style="color:{color};font-weight:700;font-size:18px;margin:0;">
                ⚠ {risk_level} Risk Level Detected
              </p>
              <p style="color:#475569;margin:8px 0 0;">
                Your latest eye health assessment shows a <strong>{risk_level}</strong> risk level.
                Please take action to protect your eye health.
              </p>
            </div>
            <p style="color:#475569;">
              Early action can prevent long-term damage. Please review your screen habits
              and follow the recommendations below.
            </p>
            {recommendation_html}
            <a href="http://localhost:3000/dashboard"
               style="display:inline-block;background:#f97316;color:white;padding:12px 24px;
                      border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">
              View My Dashboard
            </a>
            <p style="color:#94a3b8;font-size:12px;margin-top:24px;">
              You're receiving this because you enabled email notifications in EyeGuard Settings.<br>
              To unsubscribe, go to <strong>Settings → Notification Settings</strong> and disable Email Notifications.
            </p>
          </div>
        </body></html>
        """

        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"EyeGuard — {risk_level} Eye Health Risk Alert ⚠"
        msg["From"] = f"EyeGuard <{smtp_user}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, to_email, msg.as_string())

        logger.info(f"[Email] High-risk alert ({risk_level}) sent to {to_email}")
        return True

    except Exception as e:
        logger.error(f"[Email] Failed to send high-risk alert to {to_email}: {e}")
        return False


def send_email(to_email: str, user_name: str, risk_level: str = "", recommendations=None) -> bool:
    """Send a single reminder email. Returns True on success."""
    smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    smtp_user = os.environ.get("SMTP_USER", "")
    smtp_pass = os.environ.get("SMTP_PASS", "")

    if not smtp_user or not smtp_pass:
        logger.warning("[Email] SMTP credentials not configured — skipping.")
        return False

    try:
        risk_note = (
            f"Your last recorded risk level was <strong>{risk_level}</strong>. "
            if risk_level else ""
        )
        recommendation_html = ""
        if recommendations:
            items = recommendations[:3]
            recommendation_html = "<p style='color:#475569;font-weight:600;'>Recommended next steps:</p><ul style='color:#475569;'>" + "".join(
                f"<li>{item}</li>" for item in items
            ) + "</ul>"

        html = f"""
        <html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <div style="background:#4f46e5;padding:24px;border-radius:12px 12px 0 0;">
            <h1 style="color:white;margin:0;font-size:24px;">EyeGuard</h1>
            <p style="color:#c7d2fe;margin:4px 0 0;">Daily Eye Health Reminder</p>
          </div>
          <div style="background:#f8fafc;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;">
            <p style="color:#1e293b;font-size:16px;">Hi {user_name},</p>
            <p style="color:#475569;">Don't forget to log your daily eye health data today!</p>
            <p style="color:#475569;">{risk_note}Regular logging helps the AI model give you more accurate predictions and personalized recommendations.</p>
            {recommendation_html}
            <a href="http://localhost:3000/daily-log"
               style="display:inline-block;background:#4f46e5;color:white;padding:12px 24px;
                      border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">
              Log Today's Data
            </a>
            <p style="color:#94a3b8;font-size:12px;margin-top:24px;">
              You're receiving this because you enabled daily reminders in EyeGuard Settings.<br>
              To unsubscribe, go to <strong>Settings &rarr; Notification Settings</strong> and
              disable Daily Reminder Emails.
            </p>
          </div>
        </body></html>
        """

        msg = MIMEMultipart("alternative")
        msg["Subject"] = "EyeGuard — Daily Eye Health Reminder"
        msg["From"] = f"EyeGuard <{smtp_user}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, to_email, msg.as_string())

        logger.info(f"[Email] Reminder sent to {to_email}")
        return True

    except Exception as e:
        logger.error(f"[Email] Failed to send to {to_email}: {e}")
        return False


def check_and_send_reminders():
    """
    Runs every minute. For each user with daily reminders enabled,
    checks if the current HH:MM matches their reminder_time.
    If yes and they haven't logged today, sends them an email.
    """
    try:
        from supabase import create_client

        supabase_url = os.environ.get("SUPABASE_URL", "")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

        if not supabase_url or not supabase_key:
            return

        client = create_client(supabase_url, supabase_key)
        today = date.today().isoformat()
        now = datetime.now()
        current_hhmm = f"{now.hour:02d}:{now.minute:02d}"

        # Fetch users with daily reminders enabled
        settings_res = client.from_("user_settings") \
            .select("user_id, reminder_time, enable_daily_reminders, enable_email_notifications") \
            .eq("enable_daily_reminders", True) \
            .eq("enable_email_notifications", True) \
            .execute()

        users = settings_res.data or []
        if not users:
            return

        # Filter to users whose reminder_time matches current HH:MM
        # reminder_time is stored as "HH:MM:SS" or "HH:MM" in Supabase
        due_users = []
        for u in users:
            rt = (u.get("reminder_time") or "09:00")[:5]  # take first 5 chars = "HH:MM"
            if rt == current_hhmm:
                due_users.append(u)

        if not due_users:
            return

        logger.info(f"[Email Scheduler] {len(due_users)} user(s) due for reminder at {current_hhmm}")

        user_ids = [u["user_id"] for u in due_users]

        # Find users who already logged today — skip them
        logs_res = client.from_("daily_logs") \
            .select("user_id") \
            .eq("date", today) \
            .in_("user_id", user_ids) \
            .execute()

        already_logged = {row["user_id"] for row in (logs_res.data or [])}

        sent = 0
        for user_setting in due_users:
            uid = user_setting["user_id"]

            if uid in already_logged:
                logger.info(f"[Email Scheduler] User {uid} already logged today — skipping.")
                continue

            # Use the authenticated registration email, not a copied log field.
            email = None
            try:
                auth_user = client.auth.admin.get_user_by_id(uid)
                email = getattr(getattr(auth_user, "user", None), "email", None)
            except Exception as auth_error:
                logger.warning(f"[Email Scheduler] Could not load auth email for {uid}: {auth_error}")

            if not email:
                logger.warning(f"[Email Scheduler] No email found for user {uid} — skipping.")
                continue

            # Get name from user_profiles
            name = email.split("@")[0]
            profile_res = client.from_("user_profiles") \
                .select("first_name") \
                .eq("user_id", uid) \
                .limit(1) \
                .execute()
            if profile_res.data and profile_res.data[0].get("first_name"):
                name = profile_res.data[0]["first_name"]

            # Get latest risk level
            pred_res = client.from_("predictions") \
                .select("risk_level") \
                .eq("user_id", uid) \
                .order("created_at", desc=True) \
                .limit(1) \
                .execute()

            risk_labels = ["Low", "Moderate", "High", "Critical"]
            risk_level = ""
            if pred_res.data:
                rl = pred_res.data[0].get("risk_level")
                if rl is not None and 0 <= int(rl) <= 3:
                    risk_level = risk_labels[int(rl)]

            recommendations = []
            latest_log_res = client.from_("predictions") \
                .select("recommendations") \
                .eq("user_id", uid) \
                .order("created_at", desc=True) \
                .limit(1) \
                .execute()
            if latest_log_res.data:
                raw_recommendations = latest_log_res.data[0].get("recommendations") or []
                for recommendation in raw_recommendations:
                    if isinstance(recommendation, dict) and recommendation.get("title"):
                        recommendations.append(recommendation["title"])
                    elif isinstance(recommendation, str):
                        recommendations.append(recommendation)

            if send_email(email, name, risk_level, recommendations):
                sent += 1

        if sent:
            logger.info(f"[Email Scheduler] Sent {sent} reminder(s) at {current_hhmm}.")

    except Exception as e:
        logger.error(f"[Email Scheduler] Error: {e}")


def start_scheduler():
    """
    Start the APScheduler background scheduler.
    Checks every minute — each user gets emailed at their own reminder_time.
    """
    scheduler = BackgroundScheduler(daemon=True)
    scheduler.add_job(
        check_and_send_reminders,
        trigger=IntervalTrigger(minutes=1),
        id="daily_email_reminders",
        name="Per-user Daily Eye Health Email Reminders",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("[Email Scheduler] Started — checking every minute for due reminders.")
    return scheduler
