import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  fullName: string;
  employeeNo: string;
  phoneNumber: string;
  password?: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'EMPLOYEE' | 'CANTEEN' | 'CASHIER';
  isActive: boolean;
  department?: 'CWIT' | 'ECT' | 'SAGT' | 'CICT';
  deptChangeCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    fullName: { type: String, required: true },
    employeeNo: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true },
    password: { type: String, required: true },
    role: { 
      type: String, 
      enum: ['SUPERADMIN', 'ADMIN', 'EMPLOYEE', 'CANTEEN', 'CASHIER'], 
      default: 'EMPLOYEE' 
    },
    isActive: { type: Boolean, default: true },
    department: { 
      type: String, 
      enum: ['CWIT', 'ECT', 'SAGT', 'CICT'], 
      required: false 
    },
    deptChangeCount: { 
      type: Number, 
      default: 0 
    },
  },
  { timestamps: true }
);

// Clear cached model in development to support hot-reloading schema enum updates
if (process.env.NODE_ENV !== 'production' && mongoose.models.User) {
  delete mongoose.models.User;
}

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
