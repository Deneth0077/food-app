import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemSetting extends Document {
  key: string;
  mealPricesManagement: boolean;
  menuManagement: boolean;
  orderCancellation: boolean;
  cancellationWindowMinutes: number;
  mealOrdering: boolean;
  selfCollection: boolean;
  reportsExport: boolean;
  employeeDirectory: boolean;
  liveOrderManagement: boolean;
  manualEmployeeOrder: boolean;
  manualOrderAdminUsername?: string;
  manualOrderAdminPin?: string;
  maintenanceMessage: string;
  breakfastCutoffTime: string;
  lunchCutoffTime: string;
  dinnerCutoffTime: string;
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
    cancellationWindowMinutes: { type: Number, default: 60 },
    mealOrdering: { type: Boolean, default: true },
    selfCollection: { type: Boolean, default: true },
    reportsExport: { type: Boolean, default: true },
    employeeDirectory: { type: Boolean, default: true },
    liveOrderManagement: { type: Boolean, default: true },
    manualEmployeeOrder: { type: Boolean, default: true },
    manualOrderAdminUsername: { type: String, default: 'ORDERADMIN' },
    manualOrderAdminPin: { type: String, required: false },
    maintenanceMessage: { 
      type: String, 
      default: 'This service is temporarily deactivated' 
    },
    breakfastCutoffTime: { type: String, default: '22:00' },
    lunchCutoffTime: { type: String, default: '10:00' },
    dinnerCutoffTime: { type: String, default: '17:00' },
    updatedBy: { type: String, required: false },
  },
  { timestamps: true }
);

export default mongoose.models.SystemSetting || mongoose.model<ISystemSetting>('SystemSetting', SystemSettingSchema);
