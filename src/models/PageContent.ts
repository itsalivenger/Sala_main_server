import mongoose, { Schema, Document, Model } from 'mongoose';

const ContentSchema = new Schema({
    title: { type: String, default: "" },
    subtitle: { type: String, default: "" },
    description: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    src: { type: String, default: "" },
    buttonText: { type: String, default: "" },
    extra: { type: Map, of: String, default: {} }
}, { _id: false });

const PageContentSchema = new Schema({
    page: {
        type: String,
        required: true,
        unique: true,
    },
    sections: {
        type: Map,
        of: new Schema({
            fr: ContentSchema,
            en: ContentSchema,
            ar: ContentSchema,
        }, { _id: false })
    }
}, {
    timestamps: true,
    collection: 'PageContents'
});

const PageContent: Model<any> = mongoose.models.PageContent || mongoose.model("PageContent", PageContentSchema);

export default PageContent;
