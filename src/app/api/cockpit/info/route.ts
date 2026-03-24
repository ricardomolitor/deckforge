// ============================================
// Cockpit Info API — Returns license/namespace metadata (no secrets)
// ============================================

import { NextResponse } from 'next/server';

// Map of known license IDs to display names
// Add more as needed, or fetch from Cockpit API in the future
const LICENSE_NAMES: Record<string, string> = {
  'f38a8745-eb5d-4953-82aa-c909ce6a724c': 'Avanade Demo',
};

const NAMESPACE_NAMES: Record<string, string> = {
  '192f46a2-f232-43e1-b933-6e1acafb7625': 'Advisory',
};

export async function GET() {
  const licenseId = process.env.COCKPIT_LICENSE_ID || '';
  const namespaceId = process.env.COCKPIT_NAMESPACE_ID || '';

  return NextResponse.json({
    configured: !!(process.env.COCKPIT_MCP_URL && process.env.COCKPIT_MCP_API_KEY),
    license: {
      id: licenseId ? `${licenseId.substring(0, 8)}...` : '',
      name: LICENSE_NAMES[licenseId] || 'Cockpit BR',
    },
    namespace: {
      id: namespaceId ? `${namespaceId.substring(0, 8)}...` : '',
      name: NAMESPACE_NAMES[namespaceId] || 'Default',
    },
  });
}
