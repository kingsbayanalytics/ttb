export interface User {
  _id: string;
  username: string;
  email: string;
  isAdmin: boolean;
  token?: string;
  createdAt?: string;
  updatedAt?: string;
} 