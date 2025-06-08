from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship

db = SQLAlchemy()

class FacilityModel(db.Model):
    __tablename__ = 'facilities'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    address = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Use consistent relationship definition
    users = db.relationship("UserModel", backref="facility")
    # Use backref only in one place (not both backref and back_populates)
    subscription = db.relationship("SubscriptionModel", backref="facility", uselist=False)

class UserModel(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'))
    
    # Remove redundant relationship since we're using backref
    # facility = relationship("FacilityModel", back_populates="users")

class SubscriptionModel(db.Model):
    __tablename__ = 'subscriptions'
    
    id = db.Column(db.Integer, primary_key=True)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False, unique=True)
    plan_name = db.Column(db.String(50), nullable=False)
    start_date = db.Column(db.DateTime, nullable=False)
    end_date = db.Column(db.DateTime, nullable=False)
    max_users = db.Column(db.Integer, nullable=False)
    max_racks = db.Column(db.Integer, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    payment_id = db.Column(db.String(255))
    
    # Remove this line as we're using backref from FacilityModel
    # facility = relationship("FacilityModel", back_populates="subscription")
    
    subscription_tiers = db.relationship(
        "SubscriptionTierModel",
        backref="subscription",
        order_by="SubscriptionTierModel.tier_order",
        cascade="all, delete-orphan"
    )

class SubscriptionTierModel(db.Model):
    __tablename__ = 'subscription_tiers'
    
    id = db.Column(db.Integer, primary_key=True)
    subscription_id = db.Column(db.Integer, db.ForeignKey('subscriptions.id'), nullable=False)
    plan_name = db.Column(db.String(50), nullable=False)
    start_date = db.Column(db.DateTime, nullable=False)
    end_date = db.Column(db.DateTime, nullable=False)
    tier_order = db.Column(db.Integer, nullable=False)