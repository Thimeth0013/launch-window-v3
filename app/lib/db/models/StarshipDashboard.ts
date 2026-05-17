import mongoose, { Schema, Model } from 'mongoose';

// Singleton cache for the /2.3.0/dashboard/starship/ payload. The whole
// upstream object lands at the document top level via strict:false so the
// service doesn't have to mirror the entire schema (which is large and
// nested). A single doc is keyed by `dashboardId: 'CURRENT_STARSHIP'`,
// mirroring the Apod model's pattern.
const StarshipDashboardSchema = new Schema(
  {
    dashboardId: {
      type: String,
      required: true,
      unique: true,
      default: 'CURRENT_STARSHIP',
    },
    lastFetchedAt: { type: Date, default: Date.now },
  },
  {
    strict: false,
    timestamps: true,
  }
);

export interface IStarshipDashboard extends mongoose.Document {
  dashboardId: string;
  lastFetchedAt?: Date;
  // Upstream payload fields land here via strict:false
  [key: string]: any;
}

const StarshipDashboard: Model<IStarshipDashboard> =
  mongoose.models.StarshipDashboard ||
  mongoose.model<IStarshipDashboard>('StarshipDashboard', StarshipDashboardSchema);

export default StarshipDashboard;
