import { User } from '../types';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'trike_connect_user';

// Convert Supabase user to our User type
const mapSupabaseUserToUser = (supabaseUser: any, metadata?: any): User => {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name: metadata?.name || supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
    role: metadata?.role || supabaseUser.user_metadata?.role,
    isVerified: supabaseUser.email_confirmed_at !== null,
    licenseNumber: metadata?.license_number || metadata?.licenseNumber || supabaseUser.user_metadata?.licenseNumber,
    phoneNumber: metadata?.phone_number || metadata?.phoneNumber || supabaseUser.user_metadata?.phoneNumber,
    kycData: metadata?.kyc_data || metadata?.kycData || supabaseUser.user_metadata?.kycData,
  };
};

export const sendMagicLink = async (email: string): Promise<void> => {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to send magic link');
    }
  } catch (error: any) {
    console.error('Error sending magic link:', error);
    throw error;
  }
};

export const verifyMagicLink = async (): Promise<User | null> => {
  try {
    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      throw new Error(sessionError.message || 'Failed to get session');
    }

    if (!session || !session.user) {
      return null;
    }

    // Get user metadata from Supabase (profiles table is optional)
    let profileData = null;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      profileData = data;
    } catch (error) {
      // Profiles table might not exist yet, that's okay
      console.log('Profiles table not found or error fetching profile, using user metadata only');
    }

    const user = mapSupabaseUserToUser(session.user, profileData);
    
    // Store in localStorage for backward compatibility
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    
    return user;
  } catch (error: any) {
    console.error('Error verifying magic link:', error);
    throw error;
  }
};

export const updateUserProfile = async (updates: Partial<User>): Promise<User | null> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;

  try {
    // Update Supabase user metadata
    const { data: { user }, error: updateError } = await supabase.auth.updateUser({
      data: {
        role: updates.role,
        licenseNumber: updates.licenseNumber,
        phoneNumber: updates.phoneNumber,
        kycData: updates.kycData,
        name: updates.name,
      },
    });

    if (updateError) {
      throw updateError;
    }

    // Also update profiles table if it exists (optional)
    if (user) {
      try {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email,
            role: updates.role,
            license_number: updates.licenseNumber,
            phone_number: updates.phoneNumber,
            kyc_data: updates.kycData,
            name: updates.name || user.user_metadata?.name,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'id'
          });

        if (profileError) {
          console.warn('Error updating profile table (table may not exist yet):', profileError);
          // Continue anyway as user metadata was updated
        }
      } catch (error) {
        // Profiles table might not exist yet, that's okay
        console.log('Profiles table not found, skipping profile update');
      }
    }

    const updatedUser = { ...currentUser, ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
    
    return updatedUser;
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  if (typeof window === 'undefined') return null;

  try {
    // First try to get from Supabase session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session && session.user) {
      let profileData = null;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        profileData = data;
      } catch (error) {
        // Profiles table might not exist yet, that's okay
        console.log('Profiles table not found or error fetching profile, using user metadata only');
      }

      const user = mapSupabaseUserToUser(session.user, profileData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      return user;
    }

    // Fallback to localStorage for backward compatibility
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Error getting current user:', error);
    // Fallback to localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  }
};

export const logout = async (): Promise<void> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error logging out:', error);
  } finally {
    localStorage.removeItem(STORAGE_KEY);
  }
};