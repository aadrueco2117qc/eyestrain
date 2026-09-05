"""
EyeGuard Flask Application
Main entry point for the backend API
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
import os
import threading
from datetime import timedelta

# Initialize extensions
db = SQLAlchemy()
jwt = JWTManager()

# Global ML models
ml_predictor = None
predictor_manager = None

# Track how many new logs have arrived since last retrain
_new_logs_since_retrain = 0
RETRAIN_EVERY_N_LOGS = int(os.environ.get("RETRAIN_EVERY_N_LOGS", "10"))


def _retrain_in_background(app):
    """Run model retraining in a background thread so the API stays responsive."""
    global ml_predictor, _new_logs_since_retrain
    with app.app_context():
        try:
            from ml.storage import get_predictor_manager
            from ml.training import train_production_models

            print("[ML] Background retrain started...")
            trainer, results = train_production_models()
            new_predictor = predictor_manager.create_new_predictor(trainer)
            ml_predictor = new_predictor
            _new_logs_since_retrain = 0
            print(f"[ML] Background retrain complete. Results: {results}")
        except Exception as e:
            print(f"[ML] Background retrain failed: {e}")


def trigger_retrain_if_needed(app):
    """Increment counter and kick off background retrain when threshold is reached."""
    global _new_logs_since_retrain
    _new_logs_since_retrain += 1
    if _new_logs_since_retrain >= RETRAIN_EVERY_N_LOGS:
        t = threading.Thread(target=_retrain_in_background, args=(app,), daemon=True)
        t.start()


def create_app(config_name='development'):
    """Application factory function"""
    global ml_predictor, predictor_manager

    app = Flask(__name__)

    # Load configuration
    if config_name == 'production':
        from config import ProductionConfig
        app.config.from_object(ProductionConfig)
    else:
        from config import DevelopmentConfig
        app.config.from_object(DevelopmentConfig)

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)

    # Enable CORS
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Register blueprints
    register_blueprints(app)

    # ── Email endpoints ───────────────────────────────────────────────────────

    @app.route('/api/email/send-reminder', methods=['POST'])
    def send_reminder_email():
        data = request.get_json() or {}
        to_email = data.get("email", "")
        name = data.get("name", "there")
        risk_level = data.get("riskLevel", "")

        if not to_email:
            return jsonify({"success": False, "error": "email is required"}), 400

        from email_scheduler import send_email
        ok = send_email(to_email, name, risk_level)
        if ok:
            return jsonify({"success": True})
        return jsonify({"success": False, "error": "SMTP not configured or send failed"}), 500

    @app.route('/api/email/send-alert', methods=['POST'])
    def send_alert_email():
        """
        Called by Next.js predict-supabase route when risk is High or Critical
        and the user has enable_email_notifications = true.
        """
        provided_key = request.headers.get("X-Retrain-Key", "")
        expected_key = app.config.get("RETRAIN_API_KEY", "")
        if expected_key and provided_key != expected_key:
            return jsonify({"success": False, "error": "Unauthorized"}), 401

        data = request.get_json() or {}
        to_email = data.get("email", "")
        name = data.get("name", "there")
        risk_level = data.get("riskLevel", "")
        recommendations = data.get("recommendations", [])

        if not to_email:
            return jsonify({"success": False, "error": "email is required"}), 400

        if risk_level not in ("High", "Critical"):
            return jsonify({"success": False, "error": "Only High/Critical alerts are sent"}), 400

        from email_scheduler import send_high_risk_alert
        ok = send_high_risk_alert(to_email, name, risk_level, recommendations)
        if ok:
            return jsonify({"success": True})
        return jsonify({"success": False, "error": "SMTP not configured or send failed"}), 500

    # ── ML endpoints ─────────────────────────────────────────────────────────
    @app.route('/api/ml/notify-new-log', methods=['POST'])
    def notify_new_log():
        trigger_retrain_if_needed(app)
        return jsonify({"success": True})

    @app.route('/api/ml/retrain', methods=['POST'])
    def retrain_models():
        expected_key = app.config.get("RETRAIN_API_KEY", "")
        provided_key = request.headers.get("X-Retrain-Key", "")
        if expected_key and provided_key != expected_key:
            return jsonify({"success": False, "message": "Unauthorized"}), 401
        t = threading.Thread(target=_retrain_in_background, args=(app,), daemon=True)
        t.start()
        return jsonify({"success": True, "message": "Retrain started in background."})

    @app.route('/api/ml/status', methods=['GET'])
    def ml_status():
        from ml.supabase_loader import count_training_rows
        row_count = count_training_rows()
        return jsonify({
            "model_loaded": ml_predictor is not None,
            "supabase_rows": row_count,
            "new_logs_since_retrain": _new_logs_since_retrain,
            "retrain_threshold": RETRAIN_EVERY_N_LOGS,
        })
    # ─────────────────────────────────────────────────────────────────────────

    # Create database tables and initialize ML models
    with app.app_context():
        db.create_all()
        try:
            from ml.storage import get_predictor_manager
            from ml.training import train_production_models

            predictor_manager = get_predictor_manager('backend/ml/models')
            ml_predictor = predictor_manager.get_predictor()

            if ml_predictor is None:
                print("[ML] No saved models found. Training from Supabase data...")
                trainer, results = train_production_models()
                ml_predictor = predictor_manager.create_new_predictor(trainer)
                print(f"[ML] Initial training complete. Results: {results}")
            else:
                print("[ML] Loaded existing ML models from disk")
                t = threading.Thread(target=_retrain_in_background, args=(app,), daemon=True)
                t.start()
        except Exception as e:
            print(f"[ML] Error initializing ML models: {e}")
            ml_predictor = None

    # Error handlers
    register_error_handlers(app)

    return app


def register_blueprints(app):
    """Register all API blueprints"""
    from routes.auth import auth_bp
    from routes.users import users_bp
    from routes.logs import logs_bp
    from routes.predictions import predictions_bp
    from routes.analytics import analytics_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(logs_bp, url_prefix='/api/logs')
    app.register_blueprint(predictions_bp, url_prefix='/api/predictions')
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')


def register_error_handlers(app):
    """Register error handlers"""
    @app.errorhandler(400)
    def bad_request(error):
        return {'success': False, 'message': 'Bad request', 'error': str(error)}, 400

    @app.errorhandler(401)
    def unauthorized(error):
        return {'success': False, 'message': 'Unauthorized', 'error': str(error)}, 401

    @app.errorhandler(404)
    def not_found(error):
        return {'success': False, 'message': 'Resource not found', 'error': str(error)}, 404

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return {'success': False, 'message': 'Internal server error', 'error': str(error)}, 500


if __name__ == '__main__':
    app = create_app('development')
    app.run(debug=True, host='0.0.0.0', port=5000)
