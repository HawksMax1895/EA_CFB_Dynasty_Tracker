import sqlite3
import os

def remove_old_columns():
    """Remove redshirted and current_year columns from players table"""
    
    db_path = 'instance/dynasty.db'
    
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
        print("Removing old columns from players table...")
        
        # Get the current table structure
        cursor.execute("PRAGMA table_info(players)")
        columns = cursor.fetchall()
        
        # Create new table without the old columns
        new_columns = []
        for col in columns:
            if col[1] not in ['redshirted', 'current_year']:
                new_columns.append(f"{col[1]} {col[2]}")
        
        # Create new table
        create_sql = f"""
        CREATE TABLE players_new (
            {', '.join(new_columns)}
        )
        """
        cursor.execute(create_sql)
        
        # Copy data to new table
        select_columns = [col[1] for col in columns if col[1] not in ['redshirted', 'current_year']]
        select_sql = f"SELECT {', '.join(select_columns)} FROM players"
        cursor.execute(select_sql)
        
        insert_sql = f"INSERT INTO players_new ({', '.join(select_columns)}) VALUES ({', '.join(['?' for _ in select_columns])})"
        cursor.executemany(insert_sql, cursor.fetchall())
        
        # Drop old table and rename new table
        cursor.execute("DROP TABLE players")
        cursor.execute("ALTER TABLE players_new RENAME TO players")
        
        # Commit changes
        conn.commit()
        print("✅ Successfully removed old columns from players table")
        
        # Verify the change
        cursor.execute("PRAGMA table_info(players)")
        remaining_columns = [column[1] for column in cursor.fetchall()]
        print(f"Remaining columns in players table: {remaining_columns}")
        
    except Exception as e:
        print(f"❌ Error removing old columns: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    remove_old_columns() 