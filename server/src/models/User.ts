import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

/**
 * User Schema
 * Represents a user in the database
 */
export interface IUser {
  username: string;
  email: string;
  password?: string;
  entraOid?: string;
  isAdmin: boolean;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: function (this: IUser) {
        return !this.entraOid;
      },
      minlength: 6
    },
    entraOid: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },
    isAdmin: {
      type: Boolean,
      required: true,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);

export default User;
