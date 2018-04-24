import { SchemaType, FormatType } from '../../models/schema';

const schema = {
    title: "Organization",
    type: "object",
    required: ["code", "name", "logo"],
    properties: {
        id: {
            type: SchemaType.String,
            title: "Organization Id"
        },
        code: {
            type: SchemaType.String,
            title: "Short Code"
        },
        name: {
            type: SchemaType.String,
            title: "Organization Name",
            maxLength: 255
        },
        logo: {
            type: SchemaType.String,
            title: "Organization Logo"
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