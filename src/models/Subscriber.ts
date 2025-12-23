import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISubscriber extends Document {
    email: string;
    subscribedAt: Date;
}

const SubscriberSchema: Schema = new Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    subscribedAt: {
        type: Date,
        default: Date.now,
    },
}, { collection: 'Subscribers' });

const Subscriber: Model<ISubscriber> = mongoose.models.Subscriber || mongoose.model<ISubscriber>('Subscriber', SubscriberSchema);

export default Subscriber;
