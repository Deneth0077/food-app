import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  employeeName: string;
  employeeNo: string;
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER';
  mealOption?: 'VEGETARIAN' | 'MEAT';
  type?: 'ORDER_PLACED' | 'ORDER_CANCELLED' | 'PRICE_CHANGED' | 'SYSTEM_ANNOUNCEMENT';
  notes?: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    employeeName: { type: String, required: true },
    employeeNo: { type: String, required: true },
    mealType: { type: String, enum: ['BREAKFAST', 'LUNCH', 'DINNER'], required: true },
    mealOption: { type: String, enum: ['VEGETARIAN', 'MEAT'], required: false },
    type: {
      type: String,
      enum: ['ORDER_PLACED', 'ORDER_CANCELLED', 'PRICE_CHANGED', 'SYSTEM_ANNOUNCEMENT'],
      default: 'ORDER_PLACED',
    },
    notes: { type: String, required: false },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Auto-expire notifications older than 2 days (48 hours = 172800 seconds)
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 172800 });

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
