import sqlite3
import os

def test_migration():
    """Test that the migration worked correctly"""
    
    db_path = 'instance/dynasty.db'
    
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check that the new columns exist in player_seasons
        cursor.execute("PRAGMA table_info(player_seasons)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'redshirted' not in columns or 'current_year' not in columns:
            print("❌ Migration failed: New columns not found in player_seasons table")
            return False
        
        print("✅ New columns found in player_seasons table")
        
        # Check that the old columns are removed from players
        cursor.execute("PRAGMA table_info(players)")
        player_columns = [column[1] for column in cursor.fetchall()]
        
        if 'redshirted' in player_columns or 'current_year' in player_columns:
            print("❌ Migration incomplete: Old columns still exist in players table")
            return False
        
        print("✅ Old columns removed from players table")
        
        # Check that data was migrated correctly
        cursor.execute("SELECT COUNT(*) FROM player_seasons WHERE redshirted IS NOT NULL OR current_year IS NOT NULL")
        count = cursor.fetchone()[0]
        
        if count == 0:
            print("❌ No data found in migrated columns")
            return False
        
        print(f"✅ Found {count} player_seasons records with migrated data")
        
        # Show some sample data
        cursor.execute("""
            SELECT ps.player_id, ps.current_year, ps.redshirted, ps.player_class, p.name
            FROM player_seasons ps
            JOIN players p ON ps.player_id = p.player_id
            LIMIT 5
        """)
        
        print("\nSample migrated data:")
        for row in cursor.fetchall():
            print(f"  Player {row[4]} (ID: {row[0]}): Class={row[3]}, Current Year={row[1]}, Redshirted={row[2]}")
        
        print("\n✅ Migration test passed!")
        return True
        
    except Exception as e:
        print(f"❌ Error during test: {e}")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    test_migration() 