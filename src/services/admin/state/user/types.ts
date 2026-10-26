import type { Query } from "@comwit/state";

import type { User } from "@/services/admin/api/user";
export type { User } from "@/services/admin/api/user";

export type UserState = {
  me: Query<User | null>;
  isLoading: boolean;
};

export type UserActions = {
  signIn(args: { email: string; password: string }): Promise<void>;
  changePassword(args: {
    currentPassword: string;
    newPassword: string;
  }): Promise<void>;
  signOut(): Promise<void>;
};
