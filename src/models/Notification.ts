import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  employeeName: string;
  employeeNo: string;
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER';
  mealOption?: 'VEGETARIAN' | 'MEAT';
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
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
