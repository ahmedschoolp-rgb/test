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

  return {
    name: (data as any)?.name || '',
    role: ((data as any)?.role as 'teacher' | 'student') || 'teacher',
    avatar_url: (data as any)?.avatar_url,
  };
}
