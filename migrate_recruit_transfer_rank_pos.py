#!/usr/bin/env python3
"""
Migration script to add recruit_rank_pos to recruits and transfers tables
"""
from app import app
from extensions import db

from sqlalchemy import text

def migrate():
    with app.app_context():
        # Add recruit_rank_pos to recruits
        db.session.execute(text('ALTER TABLE recruits ADD COLUMN recruit_rank_pos INTEGER'))
        # Add recruit_rank_pos to transfers
        db.session.execute(text('ALTER TABLE transfers ADD COLUMN recruit_rank_pos INTEGER'))
        db.session.commit()
        print("Added recruit_rank_pos to recruits and transfers tables!")

if __name__ == "__main__":
    migrate() 