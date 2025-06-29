# College Football Dynasty Tracker Backend

This is the Flask backend for the College Football Dynasty Tracker. It provides a RESTful API for managing seasons, teams, players, games, awards, and more.

## Features
- Track seasons, teams, conferences, players, games, awards, and stats
- RESTful API for integration with a React frontend
- SQLite database (easy to switch to PostgreSQL)
- Modular Flask blueprints for each resource
- Input validation with Marshmallow

## Setup Instructions

### 1. Create a virtual environment (optional but recommended)
```
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install dependencies
```
pip install -r requirements.txt
```

### 3. Initialize the database
In a Python shell:
```
from app import db
from models import *
db.create_all()
```

### 4. Run the Flask server
```
python app.py
```

The API will be available at `http://localhost:5000/api/`.

## Project Structure
```
.
├── app.py           # Main Flask app and blueprint registration
├── models.py        # SQLAlchemy models
├── routes/          # Blueprints for API endpoints
│   ├── seasons.py
│   ├── teams.py
│   ├── players.py
│   ├── games.py
│   ├── awards.py
│   └── season_actions.py
├── requirements.txt # Python dependencies
└── README.md        # This file
```

## Notes
- The backend is designed for local use (e.g., on a Raspberry Pi)
- No authentication is implemented (all endpoints are open)
- Data entry is manual via the frontend
- Additional actions like player progression are handled in a separate blueprint
