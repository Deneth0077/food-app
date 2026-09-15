import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemSetting extends Document {
  key: string;
  mealPricesManagement: boolean;
  menuManagement: boolean;
  orderCancellation: boolean;
  mealOrdering: boolean;
  selfCollection: boolean;
  reportsExport: boolean;
  employeeDirectory: boolean;
  maintenanceMessage: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SystemSettingSchema: Schema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: 'GLOBAL_SETTINGS' },
    // mealPricesManagement is false by default as explicitly requested by user
    mealPricesManagement: { type: Boolean, default: false },
    menuManagement: { type: Boolean, default: true },
    orderCancellation: { type: Boolean, default: true },
    mealOrdering: { type: Boolean, default: true },
    selfCollection: { type: Boolean, default: true },
    reportsExport: { type: Boolean, default: true },
    employeeDirectory: { type: Boolean, default: true },
    maintenanceMessage: { 
      type: String, 
      default: 'This service is temporarily deactivated' 
    },
    updatedBy: { type: String, required: false },
  },
  { timestamps: true }
);

export default mongoose.models.SystemSetting || mongoose.model<ISystemSetting>('SystemSetting', SystemSettingSchema);
