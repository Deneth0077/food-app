import mongoose, { Schema, Document } from 'mongoose';

export interface IMenuItem {
  name: string;
  category?: string; // e.g. 'Main', 'Curry', 'Side', 'Dessert', 'Beverage'
  dietary?: 'VEG' | 'NON_VEG' | 'ALL';
}

export interface IMealPlan {
  title?: string;
  description?: string;
  items: IMenuItem[];
  isAvailable: boolean;
}

export interface IMenu extends Document {
  date: string; // YYYY-MM-DD
  breakfast: IMealPlan;
  lunch: IMealPlan;
  dinner: IMealPlan;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MenuItemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, default: 'General' },
    dietary: { 
      type: String, 
      enum: ['VEG', 'NON_VEG', 'ALL'], 
      default: 'ALL' 
    },
  },
  { _id: false }
);

const MealPlanSchema = new Schema(
  {
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    items: { type: [MenuItemSchema], default: [] },
    isAvailable: { type: Boolean, default: true },
  },
  { _id: false }
);

const MenuSchema: Schema = new Schema(
  {
    date: { type: String, required: true, unique: true, index: true }, // Format: YYYY-MM-DD
    breakfast: { type: MealPlanSchema, default: () => ({ title: '', description: '', items: [], isAvailable: true }) },
    lunch: { type: MealPlanSchema, default: () => ({ title: '', description: '', items: [], isAvailable: true }) },
    dinner: { type: MealPlanSchema, default: () => ({ title: '', description: '', items: [], isAvailable: true }) },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.models.Menu || mongoose.model<IMenu>('Menu', MenuSchema);
