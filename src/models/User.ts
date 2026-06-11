import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  fullName: string;
  employeeNo: string;
  phoneNumber: string;
  password?: string;
  role: 'ADMIN' | 'EMPLOYEE' | 'CANTEEN';
  isActive: boolean;
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
      enum: ['ADMIN', 'EMPLOYEE', 'CANTEEN'], 
      default: 'EMPLOYEE' 
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
