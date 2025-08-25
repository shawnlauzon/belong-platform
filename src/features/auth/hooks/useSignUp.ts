import { useMutation, useQueryClient } from '@tanstack/react-query';
import { signUp } from '../api';
import { useSupabase } from '@/shared';
import { logger } from '@/shared';

/**
 * Hook for signing up a new user.
 * 
 * Provides a mutation function for creating new user accounts.
 * Automatically invalidates auth cache on successful sign up.
 * 
 * @returns Sign up mutation function
 * 
 * @example
 * ```tsx
 * function SignUpForm() {
 *   const signUp = useSignUp();
 *   const [formData, setFormData] = useState({
 *     email: '',
 *     password: '',
 *     firstName: '',
 *     lastName: '',
 *     connectionCode: '' // Optional invitation code
 *   });
 *   
 *   const handleSubmit = async (e) => {
 *     e.preventDefault();
 *     try {
 *       await signUp(formData);
 *       // User is now signed up, signed in, and auto-joined to community if invitation code provided
 *     } catch (error) {
 *       console.error('Sign up failed:', error);
 *     }
 *   };
 *   
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <input 
 *         value={formData.email} 
 *         onChange={(e) => setFormData({...formData, email: e.target.value})} 
 *       />
 *       <input 
 *         type="password" 
 *         value={formData.password} 
 *         onChange={(e) => setFormData({...formData, password: e.target.value})} 
 *       />
 *       <input 
 *         value={formData.firstName} 
 *         onChange={(e) => setFormData({...formData, firstName: e.target.value})} 
 *       />
 *       <input 
 *         value={formData.lastName} 
 *         onChange={(e) => setFormData({...formData, lastName: e.target.value})} 
 *       />
 *       <button type="submit">Sign Up</button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useSignUp() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  const mutation = useMutation({
    mutationFn: ({
      email,
      password,
      firstName,
      lastName,
      connectionCode,
    }: {
      email: string;
      password: string;
      firstName: string;
      lastName?: string;
      connectionCode?: string;
    }) => signUp(supabase, email, password, firstName, lastName, connectionCode),
    onSuccess: (account) => {
      logger.info('🔐 API: User signed up successfully', {
        userId: account.id,
      });

      // Invalidate auth state to refetch with new session
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      queryClient.invalidateQueries({ queryKey: ['user', account.id] });
    },
    onError: (error) => {
      logger.error('🔐 API: Failed to sign up', { error });
    },
  });

  return mutation;
}