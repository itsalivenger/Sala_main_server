import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVehicleModel extends Document {
    name: string;
    type: 'moto' | 'petite_vehicule' | 'grande_vehicule';
    createdAt: Date;
    updatedAt: Date;
}

const VehicleModelSchema: Schema = new Schema(
    {
        name: {
            type: String,
            required: [true, 'Please provide a vehicle model name'],
            trim: true,
            unique: true,
        },
        type: {
            type: String,
            required: [true, 'Please provide a vehicle type'],
            enum: ['moto', 'petite_vehicule', 'grande_vehicule'],
        },
    },
    {
        timestamps: true,
        collection: 'VehicleModels',
    }
);

const VehicleModel: Model<IVehicleModel> = mongoose.models.VehicleModel || mongoose.model<IVehicleModel>('VehicleModel', VehicleModelSchema);

export default VehicleModel;
