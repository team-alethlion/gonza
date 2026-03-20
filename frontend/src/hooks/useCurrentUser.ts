import { useAuth } from '@/components/auth/AuthProvider';

export const useCurrentUser = () => {
  const { user } = useAuth();
  return { userId: user?.id };
};