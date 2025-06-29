#!/usr/bin/env python3
"""
Migration script to add the Transfer table
"""
from app import app
from extensions import db
from routes.transfer import Transfer

def migrate():
    with app.app_context():
        # Create the transfers table
        db.create_all()
        print("Transfer table created successfully!")

def migrate_transfers():
    with app.app_context():
        # Add recruit_stars column to transfers table
        with db.engine.connect() as conn:
            conn.execute(db.text("ALTER TABLE transfers ADD COLUMN recruit_stars INTEGER"))
            conn.commit()
        print("Added recruit_stars column to transfers table")

if __name__ == "__main__":
    migrate()
    migrate_transfers() 