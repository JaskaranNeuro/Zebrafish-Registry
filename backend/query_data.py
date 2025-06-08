from config import db, app
from models_db import RackModel, TankModel, SubdivisionModel

def query_data():
    with app.app_context():
        # Query all racks
        racks = RackModel.query.all()
        for rack in racks:
            print(f"\nRack: {rack.name}")
            print(f"Lab ID: {rack.lab_id}")
            print(f"Dimensions: {rack.rows}x{rack.columns}")
            
            # Query associated tanks
            for tank in rack.tanks:
                print(f"\tTank Position: {tank.position}")
                print(f"\tTank Size: {tank.size.value}")
                
                # Query subdivisions in tank
                for subdivision in tank.subdivisions:
                    print(f"\t\tSubdivision - Gender: {subdivision.gender.value}")
                    print(f"\t\tFish Count: {subdivision.count}")

if __name__ == "__main__":
    query_data()