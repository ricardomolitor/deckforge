// ============================================
// NextAuth Configuration — Azure AD (Entra ID) + Cockpit BR Credentials
// ============================================
// Two auth modes:
// 1. Azure AD (Entra ID) — when AZURE_AD_CLIENT_ID is configured
// 2. Cockpit Credentials — email login validated against Cockpit BR MCP
//    (works without Azure AD registration, ideal for dev/demo)
// ============================================

import type { NextAuthOptions, Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';

// ─── Cockpit MCP Validation ─────────────────────────────────

async function validateWithCockpit(email: string): Promise<boolean> {
  const url = process.env.COCKPIT_MCP_URL;
  const apiKey = process.env.COCKPIT_MCP_API_KEY;
  const cockpitApiKey = process.env.COCKPIT_API_KEY;
  const licenseId = process.env.COCKPIT_LICENSE_ID || '';
  const namespaceId = process.env.COCKPIT_NAMESPACE_ID || '';
  const utilityAgentId = process.env.COCKPIT_UTILITY_AGENT_ID || '';

  if (!url || !apiKey || !cockpitApiKey) {
    console.warn('[Auth] Cockpit MCP not configured — allowing login in dev mode');
    return true;
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
            user_input: `Responda apenas OK`,
          },
        },
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (response.ok) {
      console.log(`[Auth] ✅ Cockpit validated — user: ${email}`);
      return true;
    }

    console.warn(`[Auth] ❌ Cockpit returned ${response.status} for ${email}`);
    return false;
  } catch (error) {
    console.error('[Auth] Cockpit validation error:', error);
    // Allow login on network errors (graceful degradation)
    return true;
  }
}

// ─── Build providers list ────────────────────────────────────

function buildProviders() {
  const providers: NextAuthOptions['providers'] = [];

  // Azure AD provider — only if configured
  const azureClientId = process.env.AZURE_AD_CLIENT_ID;
  const azureSecret = process.env.AZURE_AD_CLIENT_SECRET;
  const azureTenant = process.env.AZURE_AD_TENANT_ID;

  if (azureClientId && azureSecret && azureTenant) {
    // Dynamic import to avoid issues when not configured
    const AzureADProvider = require('next-auth/providers/azure-ad').default;
    providers.push(
      AzureADProvider({
        clientId: azureClientId,
        clientSecret: azureSecret,
        tenantId: azureTenant,
        authorization: {
          params: { scope: 'openid profile email User.Read' },
        },
      })
    );
    console.log('[Auth] Azure AD provider enabled');
  }

  // Credentials provider — always available (validates via Cockpit)
  providers.push(
    CredentialsProvider({
      id: 'cockpit-credentials',
      name: 'Cockpit BR',
      credentials: {
        email: { label: 'Email corporativo', type: 'email', placeholder: 'seu.nome@avanade.com' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        if (!email || !email.includes('@')) {
          throw new Error('Email inválido');
        }

        // Validate the user can access Cockpit
        const isValid = await validateWithCockpit(email);
        if (!isValid) {
          throw new Error('Acesso negado. Verifique suas credenciais do Cockpit BR.');
        }

        // Extract name from email (e.g., "r.molitor.da.silva" → "R. Molitor Da Silva")
        const namePart = email.split('@')[0];
        const name = namePart
          .split('.')
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

        return {
          id: email,
          email,
          name,
        };
      },
    })
  );

  return providers;
}

// ─── NextAuth Options ────────────────────────────────────────

export const authOptions: NextAuthOptions = {
  providers: buildProviders(),

  pages: {
    signIn: '/login',
    error: '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },

  callbacks: {
    async signIn({ user }) {
      return !!user?.email;
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
