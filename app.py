from flask import Flask  # type: ignore
from extensions import db, cors
import os
from routes.seasons import seasons_bp
from routes.teams import teams_bp
from routes.players import players_bp
from routes.games import games_bp
from routes.awards import awards_bp
from routes.dashboard import dashboard_bp
from routes.recruiting import recruiting_bp
from routes.transfer import transfer_bp
from routes.career import career_bp
from routes.playoff import playoff_bp
from routes.promotion import promotion_bp
from routes.draft import draft_bp
from routes.rankings import rankings_bp
from routes.honors import honors_bp
from routes.conferences import conferences_bp
from routes.season_actions import season_actions_bp
# Initialize Flask app
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///dynasty.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)
cors.init_app(app)
# Register blueprints
app.register_blueprint(seasons_bp, url_prefix='/api')
app.register_blueprint(teams_bp, url_prefix='/api')
app.register_blueprint(players_bp, url_prefix='/api')
app.register_blueprint(games_bp, url_prefix='/api')
app.register_blueprint(awards_bp, url_prefix='/api')
app.register_blueprint(dashboard_bp, url_prefix='/api')
app.register_blueprint(recruiting_bp, url_prefix='/api')
app.register_blueprint(transfer_bp, url_prefix='/api')
app.register_blueprint(career_bp, url_prefix='/api')
app.register_blueprint(playoff_bp, url_prefix='/api')
app.register_blueprint(promotion_bp, url_prefix='/api')
app.register_blueprint(draft_bp, url_prefix='/api')
app.register_blueprint(rankings_bp, url_prefix='/api')
app.register_blueprint(honors_bp, url_prefix='/api')
app.register_blueprint(conferences_bp, url_prefix='/api')
app.register_blueprint(season_actions_bp, url_prefix='/api')
'''print("Registered routes:")
for rule in app.url_map.iter_rules():
    print(rule)'''


# Serve React frontend (placeholder)
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    static_folder = os.path.join(app.root_path, 'static')
    if path != '' and os.path.exists(os.path.join(static_folder, path)):
        return app.send_static_file(path)
    else:
        return app.send_static_file('index.html')


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5001)
