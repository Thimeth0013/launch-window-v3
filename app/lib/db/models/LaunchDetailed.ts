import mongoose, { Schema, Model } from 'mongoose';

// Separate collection for the heavy per-launch detailed payload. Populated on
// demand the first time a user opens a launch's detail page (see
// fetchLaunchDetailed in launchService). Kept apart from the Launch list
// collection so the hourly manifest sync only deals with light list-mode rows.
//
// `strict: false` lets us land the upstream detailed payload at the document
// top level without mirroring the entire Space Devs schema. Indexes on id and
// slug let us look up by either side cheaply.
const LaunchDetailedSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    slug: { type: String, index: true },
    date: { type: Date, index: true },
    lastFetchedAt: { type: Date, default: Date.now },
  },
  {
    strict: false,
    timestamps: true,
  }
);

export interface ILaunchDetailed extends mongoose.Document {
  id: string;
  slug?: string;
  date?: Date;
  lastFetchedAt?: Date;
  // All other fields land here courtesy of strict:false
  [key: string]: any;
}

const LaunchDetailed: Model<ILaunchDetailed> =
  mongoose.models.LaunchDetailed ||
  mongoose.model<ILaunchDetailed>('LaunchDetailed', LaunchDetailedSchema);

export default LaunchDetailed;
