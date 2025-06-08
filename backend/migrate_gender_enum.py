from config import db, app
from sqlalchemy import text

def migrate_database():
    with app.app_context():
        try:
            with db.engine.connect() as conn:
                # First temporarily alter the column to remove the enum constraint
                conn.execute(text('ALTER TABLE subdivisions ALTER COLUMN gender TYPE VARCHAR(50)'))
                
                # Now we can convert the values since they're strings
                conn.execute(text('UPDATE subdivisions SET gender = UPPER(gender)'))
                
                # Update the enum type
                conn.execute(text("DROP TYPE IF EXISTS genderenum CASCADE"))
                conn.execute(text("CREATE TYPE genderenum AS ENUM ('MALE', 'FEMALE', 'LARVAE', 'JUVENILE')"))
                
                # Alter the column back to use the updated enum
                conn.execute(text('ALTER TABLE subdivisions ALTER COLUMN gender TYPE genderenum USING gender::genderenum'))
                
                conn.commit()
            print("Gender enum updated successfully!")
        except Exception as e:
            print(f"Error during migration: {e}")

if __name__ == "__main__":
    migrate_database()