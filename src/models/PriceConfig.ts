import mongoose, { Schema, Document } from 'mongoose';

export interface IPriceConfig extends Document {
  breakfast: number;
  lunch: number;
  dinner: number;
  createdAt: Date;
  updatedAt: Date;
}

const PriceConfigSchema: Schema = new Schema(
  {
    breakfast: { type: Number, required: true, default: 300 },
    lunch: { type: Number, required: true, default: 350 },
    dinner: { type: Number, required: true, default: 400 },
  },
  { timestamps: true }
);

export default mongoose.models.PriceConfig || mongoose.model<IPriceConfig>('PriceConfig', PriceConfigSchema);
