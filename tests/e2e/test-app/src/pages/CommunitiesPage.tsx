import React, { useEffect, useState } from 'react'
import { useCommunities } from '@belongnetwork/platform'

function CommunitiesPage() {
  const communities = useCommunities()
  const [communitiesList, setCommunitiesList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchCommunities() {
      try {
        const data = await communities.list()
        setCommunitiesList(data || [])
      } catch (err: any) {
        setError(err.message || 'Failed to fetch communities')
      } finally {
        setLoading(false)
      }
    }

    fetchCommunities()
  }, [communities])

  return (
    <div>
      <h2>Communities</h2>
      
      {loading && <p data-testid="loading">Loading communities...</p>}
      
      {error && (
        <div data-testid="error" style={{ color: 'red' }}>
          Error: {error}
        </div>
      )}
      
      {!loading && !error && (
        <div data-testid="communities-list">
          <p>Total communities: {communitiesList.length}</p>
          
          {communitiesList.length === 0 ? (
            <p>No communities found</p>
          ) : (
            <ul>
              {communitiesList.map((community) => (
                <li key={community.id} data-testid={`community-${community.id}`}>
                  <strong>{community.name}</strong>
                  {community.description && <p>{community.description}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default CommunitiesPage