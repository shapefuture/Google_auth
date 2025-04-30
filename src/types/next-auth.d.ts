import "next-auth";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    accessToken?: string;
    expiresAt?: number;
    refreshToken?: string;
    hasExistingProject?: boolean; // Flag to indicate if user already has a project
    user?: {
      id?: string;
      name?: string;
      email?: string;
      image?: string;
    };
    error?: string;
  }

  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  }
}