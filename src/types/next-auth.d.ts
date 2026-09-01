import "next-auth";

declare module "next-auth" {
  interface User {
    username?: string | null;
    role?: string;
  }
  interface Session {
    user: {
      id: string;
      username?: string | null;
      role?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role?: string;
  }
}