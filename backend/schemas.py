from marshmallow import Schema, fields, validate, ValidationError

# User schemas
class LoginSchema(Schema):
    username = fields.Str(required=True, validate=validate.Length(min=3, max=50))
    password = fields.Str(required=True, validate=validate.Length(min=6))

class UserCreateSchema(Schema):
    username = fields.Str(required=True, validate=validate.Length(min=3, max=50))
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=6))
    role = fields.Str(validate=validate.OneOf(['admin', 'researcher', 'facility_manager', 'user']))

# Rack schemas
class RackCreateSchema(Schema):
    name = fields.Str(required=True)
    lab_id = fields.Str()
    rows = fields.Int(validate=validate.Range(min=1, max=26))
    columns = fields.Int(validate=validate.Range(min=1, max=50))

# Validation decorator
def validate_with_schema(schema_class):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            schema = schema_class()
            try:
                # Get data based on request method
                if request.method == 'GET':
                    data = request.args.to_dict()
                else:
                    json_data = request.get_json(silent=True)
                    data = json_data if json_data else {}
                
                # Validate data against schema
                validated_data = schema.load(data)
                
                # Pass validated data to the route
                kwargs['validated_data'] = validated_data
                return f(*args, **kwargs)
                
            except ValidationError as err:
                return jsonify({"message": "Validation error", "errors": err.messages}), 400
                
        return decorated_function
    return decorator