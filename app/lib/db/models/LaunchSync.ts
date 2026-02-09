// lib/db/models/LaunchSync.ts
import mongoose, { Schema, Model } from 'mongoose';

const launchSyncSchema = new Schema({
  syncId: { 
    type: String, 
    required: true, 
    unique: true,
    default: 'GLOBAL_LAUNCH_SYNC'
  },
  lastUpdated: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

export interface ILaunchSync extends mongoose.Document {
  syncId: string;
  lastUpdated: Date;
}

const LaunchSync: Model<ILaunchSync> = 
  mongoose.models.LaunchSync || 
  mongoose.model<ILaunchSync>('LaunchSync', launchSyncSchema);

export default LaunchSync;