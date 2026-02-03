import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEnquiry extends Document {
    name: string;
    email: string;
    question: string;
    status: 'pending' | 'resolved';
    createdAt: Date;
    updatedAt: Date;
}

const EnquirySchema: Schema = new Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true },
        question: { type: String, required: true },
        status: {
            type: String,
            enum: ['pending', 'resolved'],
            default: 'pending',
            index: true
        }
    },
    { timestamps: true, collection: 'Enquiries' }
);

const Enquiry: Model<IEnquiry> = mongoose.models.Enquiry || mongoose.model<IEnquiry>('Enquiry', EnquirySchema);

export default Enquiry;
