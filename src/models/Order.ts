import mongoose, { Schema, Document } from 'mongoose';

export interface IOrder extends Document {
  userId: mongoose.Types.ObjectId;
  employeeName: string;
  employeeNo: string;
  phoneNumber: string;
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER';
  mealOption?: 'VEGETARIAN' | 'MEAT';
  notes?: string;
  status: 'ORDERED' | 'COLLECTED';
  requestDate: string; // YYYY-MM-DD format
  requestedAt: Date;
  collectedAt?: Date;
  department?: 'CWIT' | 'ECT' | 'SAGT';
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    employeeName: { type: String, required: true },
    employeeNo: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    mealType: { 
      type: String, 
      enum: ['BREAKFAST', 'LUNCH', 'DINNER'], 
      required: true 
    },
    mealOption: {
      type: String,
      enum: ['VEGETARIAN', 'MEAT'],
      required: false
    },
    notes: {
      type: String,
      required: false
    },
    status: { 
      type: String, 
      enum: ['ORDERED', 'COLLECTED'], 
      default: 'ORDERED' 
    },
    requestDate: { type: String, required: true }, // e.g. "2026-06-11"
    requestedAt: { type: Date, default: Date.now },
    collectedAt: { type: Date },
    department: {
      type: String,
      enum: ['CWIT', 'ECT', 'SAGT'],
      required: false
    },
  },
  { timestamps: true }
);

// Compounded index: An employee can request only one meal of each type per day
OrderSchema.index({ userId: 1, requestDate: 1, mealType: 1 }, { unique: true });

export default mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);
