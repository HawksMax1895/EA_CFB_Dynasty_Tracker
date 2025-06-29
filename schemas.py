from marshmallow import Schema, fields

class CreateSeasonSchema(Schema):
    year = fields.Integer()

class CreateTeamSchema(Schema):
    name = fields.String(required=True)
    abbreviation = fields.String()
    logo_url = fields.String()
