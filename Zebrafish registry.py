from typing import List, Dict, Literal, Optional
from datetime import datetime
import uuid
from backend.cors_fix import add_cors
from backend.rate_limiter import configure_rate_limiter
from backend.register_blueprints import register_all_blueprints

# Custom types
GenderType = Literal["male", "female", "larvae"]
TankSizeType = Literal["small", "regular", "large"]
PositionType = str | List[str]  # e.g., "A1" or ["A1", "A2"]

class Subdivision:
    def __init__(self, gender: GenderType, count: int):
        self.id: str = str(uuid.uuid4())
        self.gender: GenderType = gender
        self.count: int = count
        self.created_at: datetime = datetime.now()
        self.updated_at: datetime = datetime.now()

class Tank:
    def __init__(self, position: PositionType, size: TankSizeType):
        self.id: str = str(uuid.uuid4())
        self.position: PositionType = position
        self.size: TankSizeType = size
        self.subdivisions: List[Subdivision] = []
        self.created_at: datetime = datetime.now()
        self.updated_at: datetime = datetime.now()

    def add_subdivision(self, gender: GenderType, count: int) -> None:
        subdivision = Subdivision(gender, count)
        self.subdivisions.append(subdivision)
        self.updated_at = datetime.now()

    def get_total_fish(self) -> int:
        return sum(sub.count for sub in self.subdivisions)

class Rack:
    def __init__(self, name: str, rows: int, columns: int, lab_id: str):
        self.id: str = str(uuid.uuid4())
        self.name: str = name
        self.rows: int = rows
        self.columns: int = columns
        self.lab_id: str = lab_id
        self.tanks: Dict[str, Tank] = {}  # position -> Tank mapping
        self.created_at: datetime = datetime.now()
        self.updated_at: datetime = datetime.now()

    def add_tank(self, position: PositionType, size: TankSizeType) -> bool:
        # Validate position before adding tank
        if self._is_position_valid(position):
            tank = Tank(position, size)
            if isinstance(position, list):
                for pos in position:
                    self.tanks[pos] = tank
            else:
                self.tanks[position] = tank
            self.updated_at = datetime.now()
            return True
        return False

    def _is_position_valid(self, position: PositionType) -> bool:
        # Check if position is within rack bounds and not occupied
        positions = [position] if isinstance(position, str) else position
        
        for pos in positions:
            row = pos[0]
            col = int(pos[1:])
            
            if (ord(row) - ord('A') >= self.rows or 
                col > self.columns or 
                pos in self.tanks):
                return False
        return True

def create_example_rack() -> Rack:
    # Create example rack with a large tank
    rack = Rack(name="Lab A Rack 1", rows=4, columns=6, lab_id="lab_a")
    
    # Add a large tank spanning A1-A2
    rack.add_tank(["A1", "A2"], "large")
    
    # Get the tank and add subdivisions
    tank = rack.tanks["A1"]
    tank.add_subdivision("male", 10)
    tank.add_subdivision("female", 8)
    
    return rack

if __name__ == "__main__":
    from flask import Flask

    app = Flask(__name__)
    add_cors(app)  # Add this line
    configure_rate_limiter(app)  # Add limiter after CORS setup
    register_all_blueprints()

    # Example usage
    example_rack = create_example_rack()
    print(f"Created rack: {example_rack.name}")
    print(f"Total tanks: {len(example_rack.tanks)}")
    print(f"Fish in A1-A2: {example_rack.tanks['A1'].get_total_fish()}")