import mongoose, { Schema, Document } from 'mongoose';

export interface IOrder extends Document {
  userId: mongoose.Types.ObjectId;
  employeeName: string;
  employeeNo: string;
  phoneNumber: string;
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER';
  mealOption?: 'VEGETARIAN' | 'MEAT';
  notes?: string;
  status: 'ORDERED' | 'COLLECTED' | 'CANCELLED';
  requestDate: string; // YYYY-MM-DD format
  requestedAt: Date;
  collectedAt?: Date;
  cancelledAt?: Date;
  cancelledBy?: 'EMPLOYEE' | 'ADMIN';
  department?: 'CWIT' | 'ECT' | 'SAGT' | 'CICT';
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
      enum: ['ORDERED', 'COLLECTED', 'CANCELLED'], 
      default: 'ORDERED' 
    },
    requestDate: { type: String, required: true }, // e.g. "2026-06-11"
    requestedAt: { type: Date, default: Date.now },
    collectedAt: { type: Date },
    cancelledAt: { type: Date },
    cancelledBy: { type: String, enum: ['EMPLOYEE', 'ADMIN'] },
    department: { 
      type: String, 
      enum: ['CWIT', 'ECT', 'SAGT', 'CICT'], 
      required: false 
    },
  },
  { timestamps: true }
);

// Compounded index: An employee can request only one meal of each type per day
OrderSchema.index({ userId: 1, requestDate: 1, mealType: 1 }, { unique: true });

// Clear cached model in development to support hot-reloading schema enum updates
if (process.env.NODE_ENV !== 'production' && mongoose.models.Order) {
  delete mongoose.models.Order;
}

export default mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);
