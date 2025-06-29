#!/usr/bin/env python3
"""
Migration script to add the Recruit table
"""
from app import app
from extensions import db
from routes.recruiting import Recruit

def migrate():
    with app.app_context():
        # Create the recruits table
        db.create_all()
        print("Recruit table created successfully!")

if __name__ == "__main__":
    migrate() 