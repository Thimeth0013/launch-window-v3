// lib/db/models/StreamSync.ts
import mongoose, { Schema, Model } from 'mongoose';

const streamSyncSchema = new Schema({
  launchId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  lastChecked: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

export interface IStreamSync extends mongoose.Document {
  launchId: string;
  lastChecked: Date;
}

const StreamSync: Model<IStreamSync> = 
  mongoose.models.StreamSync || 
  mongoose.model<IStreamSync>('StreamSync', streamSyncSchema);

export default StreamSync;