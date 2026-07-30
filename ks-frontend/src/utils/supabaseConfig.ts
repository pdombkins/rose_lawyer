// Supabase Configuration Utility
// Provides safe configuration checks and debugging info

// Post-merge (30 Jul 2026) K&S runs on the Rose Supabase project.
const EXPECTED_PROJECT_ID = "vmdswdlkaxlklgvsvuqi";
const EXPECTED_URL_PATTERN = /^https:\/\/vmdswdlkaxlklgvsvuqi\.supabase\.co$/;

export interface SupabaseConfigCheck {
  isValid: boolean;
  url: string;
  urlPrefix: string;
  anonKeyPrefix: string;
  projectId: string | null;
  warnings: string[];
}

export function checkSupabaseConfig(): SupabaseConfigCheck {
  const url = import.meta.env.VITE_SUPABASE_URL ?? "https://vmdswdlkaxlklgvsvuqi.supabase.co";
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
  
  const warnings: string[] = [];
  let isValid = true;

  // Extract project ID from URL
  const projectIdMatch = url.match(/https:\/\/(.+?)\.supabase\.co/);
  const projectId = projectIdMatch ? projectIdMatch[1] : null;

  // Validate URL format
  if (!EXPECTED_URL_PATTERN.test(url)) {
    warnings.push(`URL format unexpected: ${url}`);
    isValid = false;
  }

  // Validate project ID consistency
  if (projectId !== EXPECTED_PROJECT_ID) {
    warnings.push(`Project ID mismatch. Expected: ${EXPECTED_PROJECT_ID}, Got: ${projectId}`);
    isValid = false;
  }

  // Validate anon key format (JWT should start with 'eyJ')
  if (!anonKey.startsWith('eyJ')) {
    warnings.push('Anon key does not appear to be a valid JWT');
    isValid = false;
  }

  // Extract project reference from JWT payload (safely)
  try {
    const payload = JSON.parse(atob(anonKey.split('.')[1]));
    if (payload.ref !== EXPECTED_PROJECT_ID) {
      warnings.push(`JWT project ref mismatch. Expected: ${EXPECTED_PROJECT_ID}, Got: ${payload.ref}`);
      isValid = false;
    }
  } catch (e) {
    warnings.push('Could not decode JWT payload');
    isValid = false;
  }

  return {
    isValid,
    url,
    urlPrefix: url.substring(0, 32) + '...',
    anonKeyPrefix: anonKey.substring(0, 32) + '...',
    projectId,
    warnings
  };
}

export function logSupabaseConfig(): void {
  const config = checkSupabaseConfig();
  
  console.group('🔧 Supabase Configuration Check');
  console.log('Status:', config.isValid ? '✅ Valid' : '❌ Invalid');
  console.log('URL Prefix:', config.urlPrefix);
  console.log('Key Prefix:', config.anonKeyPrefix);
  console.log('Project ID:', config.projectId);
  
  if (config.warnings.length > 0) {
    console.warn('⚠️ Warnings:');
    config.warnings.forEach(warning => console.warn(`  • ${warning}`));
  }
  
  console.groupEnd();
}