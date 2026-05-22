import mongoose, { Schema, Model } from 'mongoose';

const sampleSchema = new Schema(
  {
    t: { type: Date, required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    z: { type: Number, required: true },
    lat: { type: Number },
    lon: { type: Number },
    radial: { type: Number },
  },
  { _id: false }
);

const satellitePositionsSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    coordinateSystem: { type: String, default: 'GEO' },
    windowStart: { type: Date, required: true },
    windowEnd: { type: Date, required: true },
    samples: { type: [sampleSchema], default: [] },
    lastFetched: { type: Date, default: Date.now },
    lastError: { type: String, default: null },
  },
  { timestamps: true }
);

export interface ISatelliteSample {
  t: Date;
  x: number;
  y: number;
  z: number;
  lat?: number;
  lon?: number;
  radial?: number;
}

export interface ISatellitePositions extends mongoose.Document {
  id: string;
  name: string;
  coordinateSystem: string;
  windowStart: Date;
  windowEnd: Date;
  samples: ISatelliteSample[];
  lastFetched: Date;
  lastError: string | null;
}

const SatellitePositions: Model<ISatellitePositions> =
  mongoose.models.SatellitePositions ||
  mongoose.model<ISatellitePositions>('SatellitePositions', satellitePositionsSchema);

export default SatellitePositions;
