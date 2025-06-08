from config import db
from datetime import datetime
import enum
from enum import Enum
from sqlalchemy.dialects.postgresql import ARRAY

class GenderEnum(enum.Enum):
    MALE = "male"
    FEMALE = "female"
    LARVAE = "larvae"
    JUVENILE = "juvenile"  # Add this line

class TankSizeEnum(enum.Enum):
    SMALL = "small"
    REGULAR = "regular"
    LARGE = "large"

class UserRole(enum.Enum):
    ADMIN = "admin"
    RESEARCHER = "researcher"
    FACILITY_MANAGER = "facility_manager"  # Missing role
    GUEST = "guest"
    USER = 'user'

class RackModel(db.Model):
    __tablename__ = 'racks'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    lab_id = db.Column(db.String(50), nullable=False)
    rows = db.Column(db.Integer, nullable=False)
    columns = db.Column(db.Integer, nullable=False)
    row_configs = db.Column(db.JSON, default={})  # Store custom row configurations
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    tanks = db.relationship('TankModel', backref='rack', lazy=True)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=True)

class TankModel(db.Model):
    __tablename__ = 'tanks'
    id = db.Column(db.Integer, primary_key=True)
    rack_id = db.Column(db.Integer, db.ForeignKey('racks.id'), nullable=False)
    position = db.Column(db.String(50), nullable=False)
    size = db.Column(db.Enum(TankSizeEnum), nullable=False)  # Fix typo here
    line = db.Column(db.String(100))
    dob = db.Column(db.Date)
    color = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    subdivisions = db.relationship('SubdivisionModel', backref='tank', lazy=True)

class SubdivisionModel(db.Model):
    __tablename__ = 'subdivisions'
    id = db.Column(db.Integer, primary_key=True)
    tank_id = db.Column(db.Integer, db.ForeignKey('tanks.id'), nullable=False)
    gender = db.Column(db.Enum(GenderEnum), nullable=False)
    count = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class UserModel(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    role = db.Column(db.Enum(UserRole), nullable=False)
    is_super_admin = db.Column(db.Boolean, default=False)
    
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=True)  # Keep only one
    
    created_users = db.relationship('UserModel', 
                                   backref=db.backref('creator', remote_side=[id]),
                                   foreign_keys='UserModel.created_by')
    
    # Add this relationship (uncomment it):
    # facility = db.relationship('FacilityModel', back_populates='users')
    
    @property
    def is_super_admin(self):
        return self.is_super_admin

class BreedingProfileModel(db.Model):
    __tablename__ = 'breeding_profiles'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    plans = db.relationship('BreedingPlanModel', backref='profile', lazy=True)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=True)

class BreedingPlanModel(db.Model):
    __tablename__ = 'breeding_plans'
    id = db.Column(db.Integer, primary_key=True)
    profile_id = db.Column(db.Integer, db.ForeignKey('breeding_profiles.id'), nullable=False)
    breeding_date = db.Column(db.Date, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    crosses = db.relationship('CrossModel', backref='plan', lazy=True)

class CrossModel(db.Model):
    __tablename__ = 'crosses'
    id = db.Column(db.Integer, primary_key=True)
    plan_id = db.Column(db.Integer, db.ForeignKey('breeding_plans.id'), nullable=False)
    tank1_id = db.Column(db.Integer, db.ForeignKey('tanks.id'))
    tank2_id = db.Column(db.Integer, db.ForeignKey('tanks.id'))
    tank1_males = db.Column(db.Integer, default=0)
    tank1_females = db.Column(db.Integer, default=0)
    tank2_males = db.Column(db.Integer, default=0)
    tank2_females = db.Column(db.Integer, default=0)
    breeding_result = db.Column(db.Boolean, nullable=True)  # Add this field

class TankPositionHistoryModel(db.Model):
    __tablename__ = 'tank_position_history'
    
    id = db.Column(db.Integer, primary_key=True)
    tank_id = db.Column(db.Integer, db.ForeignKey('tanks.id'), nullable=False)
    position = db.Column(db.String(50), nullable=False)
    rack_id = db.Column(db.Integer, db.ForeignKey('racks.id'), nullable=False)
    start_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    end_date = db.Column(db.DateTime, nullable=True)
    
    tank = db.relationship('TankModel', backref='position_history')
    rack = db.relationship('RackModel')

class BreedingCalendarModel(db.Model):
    __tablename__ = 'breeding_calendar'
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False)
    username = db.Column(db.String(255), nullable=False)
    request_type = db.Column(db.String(50), nullable=False)
    fish_age = db.Column(db.String(50))
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=True)  # Add this line

# Add to models_db.py
class ClinicalCaseModel(db.Model):
    __tablename__ = 'clinical_cases'
    id = db.Column(db.Integer, primary_key=True)
    tank_id = db.Column(db.Integer, db.ForeignKey('tanks.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    symptoms = db.Column(ARRAY(db.String))
    fish_count = db.Column(db.Integer, nullable=False)
    report_date = db.Column(db.Date, nullable=False)
    note = db.Column(db.Text)
    status = db.Column(db.String(20), default='Open')
    closure_reason = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    tank = db.relationship('TankModel', backref='clinical_cases')
    reporter = db.relationship('UserModel', foreign_keys=[user_id])
    notes = db.relationship('ClinicalNoteModel', back_populates='case', cascade='all, delete-orphan')
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=True)

class ClinicalNoteModel(db.Model):
    __tablename__ = 'clinical_notes'
    id = db.Column(db.Integer, primary_key=True)
    case_id = db.Column(db.Integer, db.ForeignKey('clinical_cases.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Define the relationship to the case
    case = db.relationship('ClinicalCaseModel', back_populates='notes')
    user = db.relationship('UserModel')

# Add after your other models
class SubscriptionModel(db.Model):
    __tablename__ = 'subscriptions'
    id = db.Column(db.Integer, primary_key=True)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    plan_name = db.Column(db.String(50), nullable=False)
    start_date = db.Column(db.DateTime, nullable=False)
    end_date = db.Column(db.DateTime, nullable=False)
    max_users = db.Column(db.Integer, nullable=False)
    max_racks = db.Column(db.Integer, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    payment_id = db.Column(db.String(255))
    
    # Add these columns
    original_plan_name = db.Column(db.String(50), nullable=True)
    original_plan_end_date = db.Column(db.DateTime, nullable=True)
    auto_renew = db.Column(db.Boolean, default=True)  # New column for auto-renewal
    renewal_period = db.Column(db.String(50), default='1_month')  # Store the renewal period
    payment_method_id = db.Column(db.String(255), nullable=True)  # Store payment method for auto-renewal
    
    facility = db.relationship('FacilityModel', back_populates='subscription')
    subscription_tiers = db.relationship(
        'SubscriptionTierModel',
        backref='subscription',
        order_by='SubscriptionTierModel.tier_order',
        cascade='all, delete-orphan'
    )

class SubscriptionTierModel(db.Model):
    __tablename__ = 'subscription_tiers'
    id = db.Column(db.Integer, primary_key=True)
    subscription_id = db.Column(db.Integer, db.ForeignKey('subscriptions.id'), nullable=False)
    plan_name = db.Column(db.String(50), nullable=False)
    start_date = db.Column(db.DateTime, nullable=False)
    end_date = db.Column(db.DateTime, nullable=False)
    tier_order = db.Column(db.Integer, nullable=False)

# Add this to your models_db.py file

class FacilityModel(db.Model):
    __tablename__ = 'facilities'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    organization_name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Make sure we're using back_populates consistently
    users = db.relationship('UserModel', backref='facility')
    subscription = db.relationship('SubscriptionModel', back_populates='facility', uselist=False)

# Add this to your models_db.py file

class NotificationModel(db.Model):
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))  # User to notify
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'))  # User who took action
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'))
    message = db.Column(db.String(500), nullable=False)
    category = db.Column(db.String(50), nullable=False)  # e.g., 'case_opened', 'note_added'
    reference_id = db.Column(db.Integer)  # e.g., case_id
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('UserModel', foreign_keys=[user_id])
    sender = db.relationship('UserModel', foreign_keys=[sender_id])
    facility = db.relationship('FacilityModel')