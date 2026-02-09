// lib/db/models/Launch.ts
import mongoose, { Schema, Model } from 'mongoose';

// Reusable sub-schemas
const ImageSchema = new Schema({
  id: Number,
  name: String,
  image_url: String,
  thumbnail_url: String,
  credit: String,
  license: {
    id: Number,
    name: String,
    priority: Number,
    link: String
  },
  single_use: Boolean,
  variants: [{
    id: Number,
    type: {
      id: Number,
      name: String
    },
    image_url: String
  }]
}, { _id: false });

const CountrySchema = new Schema({
  id: Number,
  name: String,
  alpha_2_code: String,
  alpha_3_code: String,
  nationality_name: String,
  nationality_name_composed: String
}, { _id: false });

const AgencySchema = new Schema({
  response_mode: String,
  id: Number,
  url: String,
  name: String,
  abbrev: String,
  type: {
    id: Number,
    name: String
  },
  featured: Boolean,
  country: [CountrySchema],
  description: String,
  administrator: String,
  founding_year: Number,
  launchers: String,
  spacecraft: String,
  parent: String,
  image: ImageSchema,
  logo: ImageSchema,
  social_logo: ImageSchema,
  total_launch_count: Number,
  consecutive_successful_launches: Number,
  successful_launches: Number,
  failed_launches: Number,
  pending_launches: Number,
  info_url: String,
  wiki_url: String
}, { _id: false });

const MissionSchema = new Schema({
  id: Number,
  name: String,
  type: String,
  description: String,
  image: ImageSchema,
  orbit: {
    id: Number,
    name: String,
    abbrev: String,
    celestial_body: {
      response_mode: String,
      id: Number,
      name: String
    }
  },
  agencies: [AgencySchema]
}, { _id: false });

const LocationSchema = new Schema({
  response_mode: String,
  id: Number,
  url: String,
  name: String,
  active: Boolean,
  country: CountrySchema,
  description: String,
  image: ImageSchema,
  map_image: String,
  longitude: Number,
  latitude: Number,
  timezone_name: String,
  total_launch_count: Number,
  total_landing_count: Number
}, { _id: false });

const PadSchema = new Schema({
  id: Number,
  url: String,
  active: Boolean,
  agencies: [AgencySchema],
  name: String,
  image: ImageSchema,
  description: String,
  info_url: String,
  wiki_url: String,
  map_url: String,
  latitude: Number,
  longitude: Number,
  country: CountrySchema,
  map_image: String,
  total_launch_count: Number,
  orbital_launch_attempt_count: Number,
  location: LocationSchema
}, { _id: false });

const RocketConfigurationSchema = new Schema({
  response_mode: String,
  id: Number,
  url: String,
  name: String,
  families: [{
    response_mode: String,
    id: Number,
    name: String
  }],
  full_name: String,
  variant: String,
  active: Boolean,
  manufacturer: AgencySchema,
  image: ImageSchema,
  description: String
}, { _id: false });

const RocketSchema = new Schema({
  id: Number,
  configuration: RocketConfigurationSchema,
  launcher_stage: [Schema.Types.Mixed],
  spacecraft_stage: [Schema.Types.Mixed],
  payloads: [Schema.Types.Mixed]
}, { _id: false });

const VidUrlSchema = new Schema({
  priority: Number,
  source: String,
  publisher: String,
  title: String,
  description: String,
  url: String,
  type: {
    id: Number,
    name: String
  },
  live: Boolean
}, { _id: false });

const UpdateSchema = new Schema({
  id: Number,
  profile_image: String,
  comment: String,
  info_url: String,
  created_by: String,
  created_on: Date
}, { _id: false });

// Main Launch Schema
const LaunchSchema = new Schema({
  // Core fields
  id: { type: String, required: true, unique: true },
  url: String,
  name: { type: String, required: true },
  response_mode: String,
  slug: String,
  launch_designator: String,
  
  // Status and timing
  status: {
    id: Number,
    name: String,
    abbrev: String,
    description: String
  },
  last_updated: Date,
  net: Date,
  date: { type: Date, required: true, index: true },
  net_precision: {
    id: Number,
    name: String,
    abbrev: String,
    description: String
  },
  window_end: Date,
  window_start: Date,
  
  // Media
  image: ImageSchema,
  infographic: String,
  
  // Launch details
  probability: Number,
  weather_concerns: String,
  failreason: String,
  hashtag: String,
  
  // Service provider
  launch_service_provider: AgencySchema,
  
  // Hardware
  rocket: RocketSchema,
  
  // Mission
  mission: MissionSchema,
  
  // Location
  pad: PadSchema,
  
  // Webcast
  webcast_live: { type: Boolean, default: false },
  
  // Programs
  program: [Schema.Types.Mixed],
  
  // Statistics
  orbital_launch_attempt_count: Number,
  location_launch_attempt_count: Number,
  pad_launch_attempt_count: Number,
  agency_launch_attempt_count: Number,
  orbital_launch_attempt_count_year: Number,
  location_launch_attempt_count_year: Number,
  pad_launch_attempt_count_year: Number,
  agency_launch_attempt_count_year: Number,
  
  // Additional info
  flightclub_url: String,
  updates: [UpdateSchema],
  info_urls: [Schema.Types.Mixed],
  vid_urls: [VidUrlSchema],
  timeline: [Schema.Types.Mixed],
  mission_patches: [Schema.Types.Mixed],
  
  // Legacy field
  provider: String
}, {
  timestamps: true
});

// Indexes
LaunchSchema.index({ 'status.name': 1 });
LaunchSchema.index({ provider: 1 });

// Interface for TypeScript
export interface ILaunch extends mongoose.Document {
  id: string;
  name: string;
  date: Date;
  status: {
    id: number;
    name: string;
    abbrev: string;
    description: string;
  };
  launch_service_provider?: any;
  rocket?: any;
  mission?: any;
  pad?: any;
  image?: any;
  webcast_live: boolean;
  provider: string;
}

// Export model
const Launch: Model<ILaunch> = mongoose.models.Launch || mongoose.model<ILaunch>('Launch', LaunchSchema);
export default Launch;