import React, { useEffect, useState } from 'react'
import { useResources } from '@belongnetwork/platform'

function ResourcesPage() {
  const resources = useResources()
  const [resourcesList, setResourcesList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchResources() {
      try {
        const data = await resources.list()
        setResourcesList(data || [])
      } catch (err: any) {
        setError(err.message || 'Failed to fetch resources')
      } finally {
        setLoading(false)
      }
    }

    fetchResources()
  }, [resources])

  return (
    <div>
      <h2>Resources</h2>
      
      {loading && <p data-testid="loading">Loading resources...</p>}
      
      {error && (
        <div data-testid="error" style={{ color: 'red' }}>
          Error: {error}
        </div>
      )}
      
      {!loading && !error && (
        <div data-testid="resources-list">
          <p>Total resources: {resourcesList.length}</p>
          
          {resourcesList.length === 0 ? (
            <p>No resources found</p>
          ) : (
            <ul>
              {resourcesList.map((resource) => (
                <li key={resource.id} data-testid={`resource-${resource.id}`}>
                  <strong>{resource.title}</strong>
                  {resource.description && <p>{resource.description}</p>}
                  {resource.category && <small>Category: {resource.category}</small>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default ResourcesPage