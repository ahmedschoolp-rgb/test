import insforge from './insforge';

/**
 * Reads name + role from our profiles table (source of truth).
 * Falls back to email prefix if no profile found.
 */
export async function getUserProfile(userId: string): Promise<{ name: string; role: 'teacher' | 'student'; avatar_url?: string }> {
  const { data } = await insforge.database
    .from('profiles')
    .select('name, role, avatar_url')
    .eq('id', userId)
    .single();

  const profile = data as any;
  return {
    name:       profile?.name       || '',
    role:       profile?.role       || null,
    avatar_url: profile?.avatar_url || null,
  };
}
