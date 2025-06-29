import React, { useEffect, useState } from 'react'
import { useEvents } from '@belongnetwork/platform'

function EventsPage() {
  const events = useEvents()
  const [eventsList, setEventsList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchEvents() {
      try {
        const data = await events.list()
        setEventsList(data || [])
      } catch (err: any) {
        setError(err.message || 'Failed to fetch events')
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [events])

  return (
    <div>
      <h2>Events</h2>
      
      {loading && <p data-testid="loading">Loading events...</p>}
      
      {error && (
        <div data-testid="error" style={{ color: 'red' }}>
          Error: {error}
        </div>
      )}
      
      {!loading && !error && (
        <div data-testid="events-list">
          <p>Total events: {eventsList.length}</p>
          
          {eventsList.length === 0 ? (
            <p>No events found</p>
          ) : (
            <ul>
              {eventsList.map((event) => (
                <li key={event.id} data-testid={`event-${event.id}`}>
                  <strong>{event.title}</strong>
                  {event.description && <p>{event.description}</p>}
                  {event.starts_at && <small>Starts: {new Date(event.starts_at).toLocaleString()}</small>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default EventsPage