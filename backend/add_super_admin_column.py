from config import app, db
from sqlalchemy import text

def add_super_admin_column():
    with app.app_context():
        try:
            # Check if the column already exists
            check_sql = text("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_super_admin'")
            result = db.session.execute(check_sql).fetchone()
            
            if result:
                print("Column 'is_super_admin' already exists in users table.")
                return
            
            # Add the column if it doesn't exist
            alter_sql = text("ALTER TABLE users ADD COLUMN is_super_admin BOOLEAN DEFAULT FALSE")
            db.session.execute(alter_sql)
            db.session.commit()
            print("Successfully added 'is_super_admin' column to users table.")
            
            # Verify the column was added
            verify_sql = text("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_super_admin'")
            result = db.session.execute(verify_sql).fetchone()
            
            if result:
                print("Verification successful: Column 'is_super_admin' exists.")
            else:
                print("Verification failed: Column 'is_super_admin' was not created.")
                
        except Exception as e:
            db.session.rollback()
            print(f"Error adding column: {str(e)}")

if __name__ == "__main__":
    add_super_admin_column()