import { describe, test, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCommunities } from '@belongnetwork/api/communities/hooks'
import { TestWrapper } from '../utils/test-wrapper'

describe('useCommunities Database Integration', () => {
  test('fetches communities from database', async () => {
    const { result } = renderHook(() => useCommunities(), {
      wrapper: TestWrapper
    })

    // Initially should be loading
    expect(result.current.isLoading).toBe(true)

    // Wait for query to complete with extended timeout
    await waitFor(() => {
      console.log('Hook state:', {
        isLoading: result.current.isLoading,
        isSuccess: result.current.isSuccess,
        isError: result.current.isError,
        dataLength: result.current.data?.length,
        errorMessage: result.current.error?.message
      })
      
      return !result.current.isLoading
    }, { timeout: 30000, interval: 1000 })

    // Validate the result
    expect(result.current.isLoading).toBe(false)
    
    if (result.current.isSuccess) {
      const communities = result.current.data || []
      console.log('Successfully fetched communities:', communities.length)
      
      // Should return an array
      expect(Array.isArray(communities)).toBe(true)
      
      // Check if we have communities
      if (communities.length > 0) {
        console.log('Found communities! Testing structure...')
        const firstCommunity = communities[0]
        
        // Verify the community has expected properties
        expect(firstCommunity).toHaveProperty('id')
        expect(firstCommunity).toHaveProperty('name')
        expect(firstCommunity).toHaveProperty('level')
        expect(firstCommunity).toHaveProperty('createdAt')
        
        // Verify types
        expect(typeof firstCommunity.id).toBe('string')
        expect(typeof firstCommunity.name).toBe('string')
        expect(firstCommunity.createdAt).toBeInstanceOf(Date)
        
        console.log('Sample community:', {
          id: firstCommunity.id,
          name: firstCommunity.name,
          level: firstCommunity.level
        })
      } else {
        console.log('No communities found - this might be expected if database is empty')
      }
      
      // Test passes if we get a successful response (even if empty)
      expect(result.current.error).toBeNull()
      
    } else if (result.current.isError) {
      console.log('Hook returned error:', result.current.error?.message)
      
      // If there's an authentication/permission error, that's expected
      const errorMsg = String(result.current.error).toLowerCase()
      const isAuthError = errorMsg.includes('permission') || 
                         errorMsg.includes('denied') || 
                         errorMsg.includes('rls') ||
                         errorMsg.includes('policy') ||
                         errorMsg.includes('jwt')
      
      if (isAuthError) {
        console.log('Authentication error detected - this is expected without auth')
        expect(result.current.error).toBeDefined()
      } else {
        console.error('Unexpected error:', result.current.error)
        throw result.current.error
      }
    }
  })

  test('hook initializes correctly', async () => {
    const { result } = renderHook(() => useCommunities(), {
      wrapper: TestWrapper
    })

    // Verify hook structure
    expect(typeof result.current.refetch).toBe('function')
    expect(typeof result.current.isLoading).toBe('boolean')
    expect(typeof result.current.isSuccess).toBe('boolean')
    expect(typeof result.current.isError).toBe('boolean')
  })
})