import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuditLog extends Document {
    action: string;
    module: 'CATALOG' | 'ORDER' | 'ADMIN' | 'CLIENT' | 'LIVREUR' | 'SETTINGS';
    details: string;
    performedBy: mongoose.Types.ObjectId;
    performedByName: string;
    entityId?: mongoose.Types.ObjectId; // ID of the product, order, etc.
    timestamp: Date;
}

const AuditLogSchema: Schema = new Schema(
    {
        action: { type: String, required: true },
        module: {
            type: String,
            enum: ['CATALOG', 'ORDER', 'ADMIN', 'CLIENT', 'LIVREUR', 'SETTINGS'],
            required: true,
            index: true
        },
        details: { type: String, required: true },
        performedBy: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
        performedByName: { type: String, required: true },
        entityId: { type: Schema.Types.ObjectId, index: true },
    },
    {
        timestamps: { createdAt: 'timestamp', updatedAt: false },
        collection: 'AuditLogs',
    }
);

AuditLogSchema.index({ timestamp: -1 });

const AuditLog: Model<IAuditLog> = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export default AuditLog;
