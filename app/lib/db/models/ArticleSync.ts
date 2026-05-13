import mongoose, { Schema, Model } from 'mongoose';

const articleSyncSchema = new Schema({
  syncId: {
    type: String,
    required: true,
    unique: true,
    default: 'GLOBAL_ARTICLE_SYNC',
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

export interface IArticleSync extends mongoose.Document {
  syncId: string;
  lastUpdated: Date;
}

const ArticleSync: Model<IArticleSync> =
  mongoose.models.ArticleSync ||
  mongoose.model<IArticleSync>('ArticleSync', articleSyncSchema);

export default ArticleSync;
