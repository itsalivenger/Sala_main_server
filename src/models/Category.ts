import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICategory extends Document {
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const CategorySchema: Schema = new Schema(
    {
        name: { type: String, required: true, unique: true, index: true },
        slug: { type: String, unique: true, index: true },
        description: { type: String },
        icon: { type: String }, // Can be a Lucide icon name or URL
        isActive: { type: Boolean, default: true, index: true },
    },
    {
        timestamps: true,
        collection: 'Categories',
    }
);

// Pre-save hook to generate slug if not provided or name changes
CategorySchema.pre<ICategory>('save', function (this: ICategory, next: any) {
    if (this.isModified('name')) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^\w ]+/g, '')
            .replace(/ +/g, '-');
    }
    next();
});

const Category: Model<ICategory> = mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);

export default Category;
