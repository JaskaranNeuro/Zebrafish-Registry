from config import app, db
from sqlalchemy import text

def create_notifications_table():
    with app.app_context():
        try:
            print("Creating notifications table...")
            
            db.session.execute(text("""
                CREATE TABLE IF NOT EXISTS notifications (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    sender_id INTEGER REFERENCES users(id),
                    facility_id INTEGER REFERENCES facilities(id),
                    message VARCHAR(500) NOT NULL,
                    category VARCHAR(50) NOT NULL,
                    reference_id INTEGER,
                    is_read BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            
            db.session.commit()
            print("Successfully created notifications table.")
            
        except Exception as e:
            db.session.rollback()
            print(f"Error creating notifications table: {str(e)}")

if __name__ == "__main__":
    create_notifications_table()