import sqlite3
import os

def migrate_player_fields():
    """Migrate redshirted and current_year fields from Player to PlayerSeason table"""
    
    # Database path
    db_path = 'instance/dynasty.db'
    
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if the migration has already been done
        cursor.execute("PRAGMA table_info(player_seasons)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'redshirted' in columns and 'current_year' in columns:
            print("Migration already completed. Fields already exist in player_seasons table.")
            return
        
        # Add new columns to player_seasons table
        print("Adding redshirted and current_year columns to player_seasons table...")
        cursor.execute("ALTER TABLE player_seasons ADD COLUMN redshirted BOOLEAN DEFAULT FALSE")
        cursor.execute("ALTER TABLE player_seasons ADD COLUMN current_year VARCHAR(8)")
        
        # Copy data from players table to player_seasons table
        print("Copying data from players table to player_seasons table...")
        cursor.execute("""
            UPDATE player_seasons 
            SET redshirted = (
                SELECT redshirted 
                FROM players 
                WHERE players.player_id = player_seasons.player_id
            ),
            current_year = (
                SELECT current_year 
                FROM players 
                WHERE players.player_id = player_seasons.player_id
            )
        """)
        
        # Update player_class to use current_year if player_class is NULL
        print("Updating player_class to use current_year where NULL...")
        cursor.execute("""
            UPDATE player_seasons 
            SET player_class = current_year 
            WHERE player_class IS NULL AND current_year IS NOT NULL
        """)
        
        # Commit the changes
        conn.commit()
        print("Migration completed successfully!")
        
        # Verify the migration
        cursor.execute("SELECT COUNT(*) FROM player_seasons WHERE redshirted IS NOT NULL OR current_year IS NOT NULL")
        count = cursor.fetchone()[0]
        print(f"Updated {count} player_seasons records with redshirted/current_year data")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_player_fields() 