import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

/**
 * Shared Auth.js config — no Credentials provider and no database imports.
 * Safe to use from the Next.js proxy (request boundary).
 */
export const authConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "read:user user:email repo",
        },
      },
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isProtected =
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/projects") ||
        pathname.startsWith("/settings");
      if (isProtected) return !!auth;
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.sub = user.id;
      }
      if (account) {
        token.authProvider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      if (session.user && token.authProvider) {
        session.user.authProvider = token.authProvider as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
