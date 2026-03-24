// ============================================
// NextAuth Configuration — Azure AD (Entra ID) + Cockpit BR validation
// ============================================

import type { NextAuthOptions, Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import AzureADProvider from 'next-auth/providers/azure-ad';

// ─── Cockpit MCP Validation ─────────────────────────────────

async function validateWithCockpit(email: string, accessToken: string): Promise<boolean> {
  const url = process.env.COCKPIT_MCP_URL;
  const apiKey = process.env.COCKPIT_MCP_API_KEY;
  const cockpitApiKey = process.env.COCKPIT_API_KEY;
  const licenseId = process.env.COCKPIT_LICENSE_ID || '';
  const namespaceId = process.env.COCKPIT_NAMESPACE_ID || '';
  const utilityAgentId = process.env.COCKPIT_UTILITY_AGENT_ID || '';

  if (!url || !apiKey || !cockpitApiKey) {
    console.warn('[Auth] Cockpit MCP not configured — skipping validation');
    return true; // Allow login if Cockpit is not configured (dev mode)
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-api-key': apiKey,
        'x-cockpit-api-key': cockpitApiKey,
        'x-cockpit-license-id': licenseId,
        'x-cockpit-namespace-id': namespaceId,
        'x-cockpit-utility-agent-id': utilityAgentId,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: `auth-validate-${Date.now()}`,
        method: 'tools/call',
        params: {
          name: 'execute_agent',
          arguments: {
            user_input: `Validar acesso do usuário ${email} ao DeckForge. Responda apenas: AUTHORIZED`,
          },
        },
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (response.ok) {
      console.log(`[Auth] Cockpit validated user: ${email}`);
      return true;
    }

    console.warn(`[Auth] Cockpit returned ${response.status} for ${email}`);
    return false;
  } catch (error) {
    console.error('[Auth] Cockpit validation error:', error);
    // In case of network error, allow login (graceful degradation)
    return true;
  }
}

// ─── NextAuth Options ────────────────────────────────────────

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID || '',
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET || '',
      tenantId: process.env.AZURE_AD_TENANT_ID || '',
      authorization: {
        params: {
          scope: 'openid profile email User.Read',
        },
      },
    }),
  ],

  pages: {
    signIn: '/login',
    error: '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },

  callbacks: {
    async signIn({ user, account }) {
      if (!user?.email) return false;

      // Validate with Cockpit MCP
      const isValid = await validateWithCockpit(
        user.email,
        account?.access_token || ''
      );

      return isValid;
    },

    async jwt({ token, user, account }): Promise<JWT> {
      if (user) {
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
      }
      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;
      }
      return token;
    },

    async session({ session, token }): Promise<Session> {
      if (session.user) {
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.image = token.picture as string;
      }
      return session;
    },
  },

  debug: process.env.NODE_ENV === 'development',
};
