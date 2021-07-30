import { SchemaType, FormatType } from '@reactory/client-core/models/schema';

const schema = {
    title: "Organisation",
    type: "object",
    required: ["code", "name", "logo"],
    properties: {
        id: {
            type: SchemaType.String,
            title: "Organisation Id"
        },
        code: {
            type: SchemaType.String,
            title: "Short Code"
        },
        name: {
            type: SchemaType.String,
            title: "Organisation Name",
            maxLength: 255
        },
        logo: {
            type: SchemaType.String,
            title: "Organisation Logo"
        },
        legacyId: {
            type: SchemaType.Integer,
            title: "Legacy Id",
            readonly: true
        },
        createdAt: {
            type: SchemaType.Date,
            title: "Created At",
            format: FormatType.DateTime
        },
        updatedAt: {
            type: SchemaType.Date,
            title: "Updated At",
            format: FormatType.DateTime
        }
    }
};

const Form = [
    "id",
    { key: "name", placeHolder: "Please provide a name for the organization" },
    { key: "logo", placeHolder: "Please provide a logo for the organization" }
];