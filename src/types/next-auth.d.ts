import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      tenantId: string;
      role: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    tenantId?: string;
    role?: string;
  }
}
