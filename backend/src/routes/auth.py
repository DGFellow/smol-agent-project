# backend/src/routes/auth.py
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional, Tuple

from flask import Blueprint, jsonify, request, current_app, g

from src.database.user import User
from src.middleware.auth import (
    generate_token,
    decode_token,
    check_rate_limit,
)
from src.utils.email_service import (
    send_verification_email,
    send_2fa_code,
    send_password_reset_email,
)
from src.utils.sms_service import send_sms_code

# Exported blueprint. Register in app.py like:
# app.register_blueprint(auth_bp, url_prefix="/api/auth")
auth_bp = Blueprint("auth", __name__)

# -------------------------------------------------------------------
# Helpers
# -------------------------------------------------------------------

def _json() -> Dict[str, Any]:
    """Safe JSON body parsing."""
    return request.get_json(silent=True) or {}

def _get_db():
    """
    Obtain a DB handle. Supports either g.db or current_app.config["DB"].
    Your app.py should set one of those at startup.
    """
    if hasattr(g, "db") and g.db is not None:
        return g.db
    return current_app.config.get("DB")

def _require_auth() -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Reads Bearer token and decodes it.
    Returns (payload, error_message).
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None, "No token provided"
    token = auth_header.split(" ", 1)[1].strip()
    payload = decode_token(token)
    if not payload:
        return None, "Invalid token"
    return payload, None

def _log(msg: str):
    try:
        current_app.logger.info(msg)
    except Exception:
        pass

# -------------------------------------------------------------------
# Field Validation Endpoints
# -------------------------------------------------------------------

@auth_bp.route("/check-username", methods=["POST"])
def check_username():
    """
    Body: { "username": "..." }
    Returns: { "available": bool, "message"?: str }
    """
    data = _json()
    username = (data.get("username") or "").strip()
    if not username:
        return jsonify({"available": False, "message": "Username is required"}), 400

    db = _get_db()
    user_model = User(db)

    is_valid, message = user_model.validate_username(username)
    if not is_valid:
        return jsonify({"available": False, "message": message}), 200

    exists = user_model.username_exists(username)
    _log(f"[check-username] username={username!r} exists={exists}")
    return jsonify(
        {
            "available": not exists,
            "message": "Username already taken" if exists else "Username is available",
        }
    ), 200


@auth_bp.route("/check-email", methods=["POST"])
def check_email():
    """
    Body: { "email": "..." }
    Returns: { "available": bool, "message"?: str }
    """
    data = _json()
    email = (data.get("email") or "").strip().lower()
    if not email:
        return jsonify({"available": False, "message": "Email is required"}), 400

    db = _get_db()
    user_model = User(db)

    is_valid, message = user_model.validate_email(email)
    if not is_valid:
        return jsonify({"available": False, "message": message}), 200

    exists = user_model.email_exists(email)
    _log(f"[check-email] email={email!r} exists={exists}")
    return jsonify(
        {
            "available": not exists,
            "message": "Email already registered" if exists else "Email is available",
        }
    ), 200

# -------------------------------------------------------------------
# Registration / Login
# -------------------------------------------------------------------

@auth_bp.route("/register", methods=["POST"])
def register():
    """
    Body:
      {
        username, email, password, password_confirm,
        first_name?, last_name?, birthdate? (YYYY-MM-DD), phone_number?
      }
    """
    data = _json()

    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    password_confirm = data.get("password_confirm") or ""
    first_name = (data.get("first_name") or "").strip() or None
    last_name = (data.get("last_name") or "").strip() or None
    birthdate = (data.get("birthdate") or "").strip() or None
    phone_number = (data.get("phone_number") or "").strip() or None

    client_ip = request.remote_addr or "unknown"
    if not check_rate_limit(f"register:{client_ip}", max_attempts=3, window=3600):
        return jsonify({"error": "Too many registration attempts. Please try again later."}), 429

    try:
        db = _get_db()
        user_model = User(db)

        ok, msg = user_model.validate_username(username)
        if not ok:
            return jsonify({"error": msg}), 400

        ok, msg = user_model.validate_email(email)
        if not ok:
            return jsonify({"error": msg}), 400

        ok, msg = user_model.validate_password(password)
        if not ok:
            return jsonify({"error": msg}), 400

        if password != password_confirm:
            return jsonify({"error": "Passwords do not match"}), 400

        if user_model.username_exists(username):
            return jsonify({"error": "Username already exists"}), 409

        if user_model.email_exists(email):
            return jsonify({"error": "Email already registered"}), 409

        if phone_number:
            ok, msg = user_model.validate_phone(phone_number)
            if not ok:
                return jsonify({"error": msg}), 400

        if birthdate:
            try:
                datetime.strptime(birthdate, "%Y-%m-%d")
            except ValueError:
                return jsonify({"error": "Invalid birthdate format. Use YYYY-MM-DD"}), 400

        # Create user
        user = user_model.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            birthdate=birthdate,
            phone_number=phone_number,
        )

        # Create + send email verification (best-effort)
        try:
            verification_token = user_model.create_email_verification_token(user["id"])
            send_verification_email(email, username, verification_token)
        except Exception as e:
            _log(f"[register] verification email failed: {e}")

        token = generate_token(user["id"], user["username"])

        return jsonify(
            {
                "message": "Registration successful! Please check your email to verify your account.",
                "token": token,
                "user": {
                    "id": user["id"],
                    "username": user["username"],
                    "email": user["email"],
                    "first_name": user.get("first_name"),
                    "last_name": user.get("last_name"),
                    "email_verified": user.get("email_verified"),
                },
            }
        ), 201

    except Exception as e:
        _log(f"[register] error: {e}")
        return jsonify({"error": "Registration failed. Please try again."}), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    """
    Body: { username, password, two_factor_code? }
    """
    data = _json()
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    two_factor_code = (data.get("two_factor_code") or "").strip()

    client_ip = request.remote_addr or "unknown"
    if not check_rate_limit(f"login:{client_ip}", max_attempts=5, window=300):
        return jsonify({"error": "Too many login attempts. Please try again later."}), 429

    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    try:
        db = _get_db()
        user_model = User(db)

        if not user_model.verify_password(username, password):
            return jsonify({"error": "Invalid credentials"}), 401

        user = user_model.get_by_username(username)
        if not user:
            return jsonify({"error": "Invalid credentials"}), 401

        if user.get("account_status") and user["account_status"] != "active":
            return jsonify({"error": "Account is suspended or inactive"}), 403

        # 2FA flow
        if user.get("two_factor_enabled"):
            if not two_factor_code:
                code = user_model.create_2fa_code(user["id"])
                if user.get("two_factor_method") == "sms" and user.get("phone_number"):
                    send_sms_code(user["phone_number"], code)
                    method = "sms"
                else:
                    send_2fa_code(user["email"], code)
                    method = "email"

                return jsonify(
                    {
                        "requires_2fa": True,
                        "method": method,
                        "message": "Verification code sent. Please check your phone/email.",
                    }
                ), 200

            if not user_model.verify_2fa_code(user["id"], two_factor_code):
                return jsonify({"error": "Invalid or expired verification code"}), 401

        user_model.update_last_login(user["id"])
        token = generate_token(user["id"], user["username"])

        return jsonify(
            {
                "message": "Login successful",
                "token": token,
                "user": {
                    "id": user["id"],
                    "username": user["username"],
                    "email": user["email"],
                    "first_name": user.get("first_name"),
                    "last_name": user.get("last_name"),
                    "email_verified": user.get("email_verified"),
                    "two_factor_enabled": user.get("two_factor_enabled"),
                },
            }
        ), 200

    except Exception as e:
        _log(f"[login] error: {e}")
        return jsonify({"error": "Login failed. Please try again."}), 500


@auth_bp.route("/verify", methods=["GET"])
def verify_token_route():
    """
    Header: Authorization: Bearer <token>
    Returns: { valid: bool, user: {...} } or 401
    """
    payload, err = _require_auth()
    if err:
        return jsonify({"error": err}), 401
    return jsonify(
        {
            "valid": True,
            "user": {
                "id": payload["user_id"],
                "username": payload["username"],
            },
        }
    ), 200

# -------------------------------------------------------------------
# Email verification + password reset
# -------------------------------------------------------------------

@auth_bp.route("/verify-email/<token>", methods=["GET"])
def verify_email(token: str):
    db = _get_db()
    user_model = User(db)
    try:
        if user_model.verify_email_token(token):
            return jsonify({"message": "Email verified successfully! You can now use all features."}), 200
        return jsonify({"error": "Invalid or expired verification token"}), 400
    except Exception as e:
        _log(f"[verify-email] error: {e}")
        return jsonify({"error": "Verification failed"}), 500


@auth_bp.route("/resend-verification", methods=["POST"])
def resend_verification():
    payload, err = _require_auth()
    if err:
        return jsonify({"error": err}), 401

    db = _get_db()
    user_model = User(db)
    try:
        user = user_model.get_by_id(payload["user_id"])
        if not user:
            return jsonify({"error": "User not found"}), 404

        if user.get("email_verified"):
            return jsonify({"message": "Email already verified"}), 200

        if not check_rate_limit(f'verify:{user["id"]}', max_attempts=3, window=3600):
            return jsonify({"error": "Too many verification attempts. Please try again later."}), 429

        token = user_model.create_email_verification_token(user["id"])
        send_verification_email(user["email"], user["username"], token)
        return jsonify({"message": "Verification email sent! Please check your inbox."}), 200
    except Exception as e:
        _log(f"[resend-verification] error: {e}")
        return jsonify({"error": "Failed to resend verification email"}), 500


@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = _json()
    email = (data.get("email") or "").strip().lower()
    if not email:
        return jsonify({"error": "Email is required"}), 400

    if not check_rate_limit(f"reset:{email}", max_attempts=3, window=3600):
        return jsonify({"error": "Too many reset attempts. Please try again later."}), 429

    db = _get_db()
    user_model = User(db)
    try:
        user = user_model.get_by_email(email)
        if user:
            token = user_model.create_password_reset_token(user["id"])
            send_password_reset_email(email, user["username"], token)
        # Always succeed to prevent enumeration
        return jsonify({"message": "If that email exists, a password reset link has been sent."}), 200
    except Exception as e:
        _log(f"[forgot-password] error: {e}")
        return jsonify({"error": "Password reset request failed"}), 500


@auth_bp.route("/reset-password/<token>", methods=["POST"])
def reset_password(token: str):
    data = _json()
    password = data.get("password") or ""
    password_confirm = data.get("password_confirm") or ""

    if password != password_confirm:
        return jsonify({"error": "Passwords do not match"}), 400

    db = _get_db()
    user_model = User(db)
    try:
        ok, msg = user_model.validate_password(password)
        if not ok:
            return jsonify({"error": msg}), 400

        user_id = user_model.verify_password_reset_token(token)
        if not user_id:
            return jsonify({"error": "Invalid or expired reset token"}), 400

        user_model.update_password(user_id, password)
        return jsonify({"message": "Password reset successful! You can now login with your new password."}), 200
    except Exception as e:
        _log(f"[reset-password] error: {e}")
        return jsonify({"error": "Password reset failed"}), 500

# -------------------------------------------------------------------
# Two-factor
# -------------------------------------------------------------------

@auth_bp.route("/2fa/enable", methods=["POST"])
def enable_2fa():
    payload, err = _require_auth()
    if err:
        return jsonify({"error": err}), 401

    data = _json()
    method = data.get("method", "sms")
    phone_number = (data.get("phone_number") or "").strip() or None

    if method not in ("sms", "email"):
        return jsonify({"error": "Invalid 2FA method"}), 400

    db = _get_db()
    user_model = User(db)
    try:
        user = user_model.get_by_id(payload["user_id"])
        if not user:
            return jsonify({"error": "User not found"}), 404

        if method == "sms":
            if not phone_number:
                phone_number = user.get("phone_number")
                if not phone_number:
                    return jsonify({"error": "Phone number required for SMS 2FA"}), 400
            else:
                ok, msg = user_model.validate_phone(phone_number)
                if not ok:
                    return jsonify({"error": msg}), 400
                user_model.update_profile(user["id"], phone_number=phone_number)

        user_model.enable_2fa(user["id"], method)
        return jsonify({"message": f"Two-factor authentication enabled via {method}"}), 200
    except Exception as e:
        _log(f"[2fa/enable] error: {e}")
        return jsonify({"error": "Failed to enable 2FA"}), 500


@auth_bp.route("/2fa/disable", methods=["POST"])
def disable_2fa():
    payload, err = _require_auth()
    if err:
        return jsonify({"error": err}), 401

    db = _get_db()
    user_model = User(db)
    try:
        user_model.disable_2fa(payload["user_id"])
        return jsonify({"message": "Two-factor authentication disabled"}), 200
    except Exception as e:
        _log(f"[2fa/disable] error: {e}")
        return jsonify({"error": "Failed to disable 2FA"}), 500
