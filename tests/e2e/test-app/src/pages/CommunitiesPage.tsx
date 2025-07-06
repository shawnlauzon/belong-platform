import { useEffect, useState } from 'react'
import { useCommunities, useAuth } from '@belongnetwork/platform'

function CommunitiesPage() {
  const communities = useCommunities()
  const { currentUser } = useAuth()
  const [communitiesList, setCommunitiesList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    level: 'neighborhood',
    timeZone: 'America/New_York'
  })

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) {
      setError('You must be logged in to create a community')
      return
    }

    try {
      setError('')
      const newCommunity = await communities.create({
        ...formData,
        organizerId: currentUser.id,
        parentId: null,
        hierarchyPath: [{ level: 'global', name: 'Global' }],
        memberCount: 0
      })
      
      // Refresh the list
      const data = await communities.list()
      setCommunitiesList(data || [])
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        level: 'neighborhood',
        timeZone: 'America/New_York'
      })
      setIsCreating(false)
    } catch (err: any) {
      setError(err.message || 'Failed to create community')
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId) return

    try {
      setError('')
      await communities.update(editingId, {
        name: formData.name,
        description: formData.description
      })
      
      // Refresh the list
      const data = await communities.list()
      setCommunitiesList(data || [])
      
      // Reset form
      setEditingId(null)
      setFormData({
        name: '',
        description: '',
        level: 'neighborhood',
        timeZone: 'America/New_York'
      })
    } catch (err: any) {
      setError(err.message || 'Failed to update community')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this community?')) {
      return
    }

    try {
      setError('')
      await communities.delete(id)
      
      // Refresh the list
      const data = await communities.list()
      setCommunitiesList(data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to delete community')
    }
  }

  const handleJoin = async (communityId: string) => {
    try {
      setError('')
      await communities.join(communityId)
      
      // Refresh the list to update membership status
      const data = await communities.list()
      setCommunitiesList(data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to join community')
    }
  }

  const handleLeave = async (communityId: string) => {
    try {
      setError('')
      await communities.leave(communityId)
      
      // Refresh the list to update membership status
      const data = await communities.list()
      setCommunitiesList(data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to leave community')
    }
  }

  const startEdit = (community: any) => {
    setEditingId(community.id)
    setFormData({
      name: community.name,
      description: community.description || '',
      level: community.level,
      timeZone: community.timeZone
    })
  }

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
        <>
          {/* Create/Edit Form */}
          {(isCreating || editingId) && (
            <form 
              data-testid="community-form"
              onSubmit={editingId ? handleUpdate : handleCreate}
              style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '20px' }}
            >
              <h3>{editingId ? 'Edit Community' : 'Create New Community'}</h3>
              
              <div>
                <label>
                  Name:
                  <input
                    type="text"
                    data-testid="community-name-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </label>
              </div>
              
              <div>
                <label>
                  Description:
                  <textarea
                    data-testid="community-description-input"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </label>
              </div>
              
              <button type="submit" data-testid="community-submit-button">
                {editingId ? 'Update' : 'Create'}
              </button>
              
              <button
                type="button"
                data-testid="community-cancel-button"
                onClick={() => {
                  setIsCreating(false)
                  setEditingId(null)
                  setFormData({
                    name: '',
                    description: '',
                    level: 'neighborhood',
                    timeZone: 'America/New_York'
                  })
                }}
              >
                Cancel
              </button>
            </form>
          )}
          
          {/* Create Button */}
          {!isCreating && !editingId && currentUser && (
            <button
              data-testid="create-community-button"
              onClick={() => setIsCreating(true)}
            >
              Create Community
            </button>
          )}
          
          {/* Communities List */}
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
                    
                    {currentUser && (
                      <div style={{ marginTop: '10px' }}>
                        {/* Membership Actions */}
                        <button
                          data-testid={`join-${community.id}`}
                          onClick={() => handleJoin(community.id)}
                          style={{ marginRight: '10px' }}
                        >
                          Join Community
                        </button>
                        <button
                          data-testid={`leave-${community.id}`}
                          onClick={() => handleLeave(community.id)}
                        >
                          Leave Community
                        </button>
                        
                        {/* CRUD Actions for organizers */}
                        {community.organizerId === currentUser.id && (
                          <>
                            <button
                              data-testid={`edit-${community.id}`}
                              onClick={() => startEdit(community)}
                              style={{ marginLeft: '10px' }}
                            >
                              Edit
                            </button>
                            <button
                              data-testid={`delete-${community.id}`}
                              onClick={() => handleDelete(community.id)}
                              style={{ marginLeft: '10px' }}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default CommunitiesPage