import { action } from "@comwit/state";
import type { UserActions } from "../types";
import { user } from "../model";
import { appAuth } from "@/lib/auth-client/app";

type UserAuthActions = Pick<UserActions, "signIn" | "signUp" | "signOut">;

export const userAuthActions = action<UserAuthActions>(({ state }) => {
  class UserAuthActions {
    private model = state(user);

    async signIn({
      email,
      password,
    }: {
      email: string;
      password: string;
    }): Promise<void> {
      this.model.isLoading = true;

      try {
        const { error } = await appAuth.signIn.email({
          email,
          password,
        });

        if (error) {
          throw new Error(error.message);
        }

        // 세션 쿠키가 설정되었으므로 service home으로 이동해 서버에서 user를 다시 가져옴
        window.location.href = "/";
      } finally {
        this.model.isLoading = false;
      }
    }

    async signUp({
      email,
      name,
      password,
    }: {
      email: string;
      name: string;
      password: string;
    }): Promise<void> {
      this.model.isLoading = true;

      try {
        const { error } = await appAuth.signUp.email({
          email,
          name,
          password,
        });

        if (error) {
          throw new Error(error.message);
        }

        window.location.href = "/";
      } finally {
        this.model.isLoading = false;
      }
    }

    async signOut(): Promise<void> {
      this.model.isLoading = true;

      try {
        const { error } = await appAuth.signOut();
        if (error) throw new Error(error.message);
        this.model.me.set(null);
        window.location.href = "/";
      } finally {
        this.model.isLoading = false;
      }
    }
  }

  return new UserAuthActions();
});
