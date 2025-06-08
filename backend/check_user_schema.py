from config import app, db
from sqlalchemy import inspect, text

def check_user_schema():
    with app.app_context():
        # Get the inspector
        inspector = inspect(db.engine)
        
        # Check if the users table exists
        if 'users' in inspector.get_table_names():
            print("✓ Users table found")
            
            # Get columns in the users table
            columns = inspector.get_columns('users')
            column_names = [col['name'] for col in columns]
            print(f"Columns in users table: {', '.join(column_names)}")
            
            # Check if is_super_admin exists
            if 'is_super_admin' in column_names:
                print("✓ is_super_admin column exists")
            else:
                print("✗ is_super_admin column NOT found")
                print("\nAlternative admin columns that might exist:")
                admin_columns = [col for col in column_names if 'admin' in col.lower()]
                if admin_columns:
                    print(", ".join(admin_columns))
                else:
                    print("No admin-related columns found")
        else:
            print("✗ Users table NOT found")
            print("\nAvailable tables:")
            print(", ".join(inspector.get_table_names()))

if __name__ == "__main__":
    check_user_schema()