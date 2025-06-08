// New file: backend/schema.py
import graphene
from graphene_sqlalchemy import SQLAlchemyObjectType
from models_db import RackModel, TankModel, SubdivisionModel

class Subdivision(SQLAlchemyObjectType):
    class Meta:
        model = SubdivisionModel

class Tank(SQLAlchemyObjectType):
    class Meta:
        model = TankModel
    subdivisions = graphene.List(Subdivision)

class Rack(SQLAlchemyObjectType):
    class Meta:
        model = RackModel
    tanks = graphene.List(Tank)

class Query(graphene.ObjectType):
    racks = graphene.List(Rack)
    tank = graphene.Field(Tank, id=graphene.Int())