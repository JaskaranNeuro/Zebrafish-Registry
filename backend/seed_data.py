from config import db, app
from models_db import RackModel, TankModel, TankSizeEnum, SubdivisionModel, GenderEnum

def seed_database():
    with app.app_context():
        # Clear existing data
        db.session.query(SubdivisionModel).delete()
        db.session.query(TankModel).delete()
        db.session.query(RackModel).delete()
        
        # Create a test rack
        test_rack = RackModel(
            lab_id="lab_a",
            name="Test Rack 1",
            rows=4,
            columns=6
        )
        db.session.add(test_rack)
        db.session.flush()

        # Create a large tank spanning A1-A2
        large_tank = TankModel(
            rack_id=test_rack.id,
            position="A1-A2",
            size=TankSizeEnum.LARGE
        )
        db.session.add(large_tank)
        db.session.flush()

        # Add subdivisions to the tank
        male_subdivision = SubdivisionModel(
            tank_id=large_tank.id,
            gender=GenderEnum.MALE,
            count=10
        )
        female_subdivision = SubdivisionModel(
            tank_id=large_tank.id,
            gender=GenderEnum.FEMALE,
            count=8
        )
        
        db.session.add(male_subdivision)
        db.session.add(female_subdivision)
        db.session.commit()

        print("Test data added successfully!")

if __name__ == "__main__":
    seed_database()