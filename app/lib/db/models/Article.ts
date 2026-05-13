import mongoose, { Schema, Model } from 'mongoose';

const SocialsSchema = new Schema({
  x: String,
  youtube: String,
  instagram: String,
  linkedin: String,
  mastodon: String,
  bluesky: String,
}, { _id: false });

const AuthorSchema = new Schema({
  name: String,
  socials: SocialsSchema,
}, { _id: false });

const LinkedLaunchSchema = new Schema({
  launch_id: String,
  provider: String,
}, { _id: false });

const LinkedEventSchema = new Schema({
  event_id: Number,
  provider: String,
}, { _id: false });

const ArticleSchema = new Schema({
  id: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  authors: [AuthorSchema],
  url: String,
  image_url: String,
  news_site: { type: String, index: true },
  summary: String,
  published_at: { type: Date, required: true, index: true },
  updated_at: Date,
  featured: { type: Boolean, default: false },
  launches: [LinkedLaunchSchema],
  events: [LinkedEventSchema],
}, {
  timestamps: true,
});

export interface IArticle extends mongoose.Document {
  id: number;
  title: string;
  authors?: Array<{
    name?: string;
    socials?: {
      x?: string;
      youtube?: string;
      instagram?: string;
      linkedin?: string;
      mastodon?: string;
      bluesky?: string;
    };
  }>;
  url?: string;
  image_url?: string;
  news_site?: string;
  summary?: string;
  published_at: Date;
  updated_at?: Date;
  featured?: boolean;
  launches?: Array<{ launch_id?: string; provider?: string }>;
  events?: Array<{ event_id?: number; provider?: string }>;
  createdAt?: Date;
  updatedAt?: Date;
}

const Article: Model<IArticle> =
  mongoose.models.Article || mongoose.model<IArticle>('Article', ArticleSchema);

export default Article;
