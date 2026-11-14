// lib/db/models/StreamSync.ts
import mongoose, { Schema, Model } from 'mongoose';

const streamSyncSchema = new Schema({
  launchId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  lastUpdated: { 
    type: Date, 
    default: Date.now 
  },
  streams: [{
    streamId: String,
    url: String,
    title: String,
    channelName: String,
    thumbnailUrl: String,
    scheduledStartTime: Date,
    platform: String,
    isLive: Boolean,
    matchScore: Number,
    lastUpdated: Date
  }]
}, {
  timestamps: true
});

export interface IStream {
  streamId: string;
  url: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  scheduledStartTime: Date;
  platform: string;
  isLive?: boolean;
  matchScore: number;
  lastUpdated: Date;
}

export interface IStreamSync extends mongoose.Document {
  launchId: string;
  lastUpdated: Date;
  streams: IStream[];
}

const StreamSync: Model<IStreamSync> = 
  mongoose.models.StreamSync || 
  mongoose.model<IStreamSync>('StreamSync', streamSyncSchema);

export default StreamSync;