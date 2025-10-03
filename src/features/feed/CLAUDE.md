# Feed

Aggregated activity feed of resources, events, and shoutouts.

## Purpose

The feed feature provides:
- Unified view of community activity
- Aggregation of multiple content types
- Cursor-based pagination
- Community-scoped content

## Key Entities

### FeedItem

Individual item in the feed.

**Key Fields:**
- `id` - Item ID
- `type` - `'resource'` | `'event'` | `'shoutout'`

**Notes:**
- Lightweight reference to actual entity
- Full details fetched separately
- Type discriminates content

### Feed

Collection of feed items with pagination.

**Key Fields:**
- `items` - Array of FeedItem
- `hasMore` - Whether more items exist
- `nextCursor` - Cursor for next page (optional)

**Notes:**
- Cursor-based pagination
- Efficient for large feeds
- Stateless pagination

## Core Concepts

### Content Types

Feed aggregates three types of content:
- **Resources** - Offers and requests
- **Events** - Community events
- **Shoutouts** - Appreciation posts

### Feed Composition

Items appear in feed based on:
- Community membership
- Content visibility rules
- Chronological order (newest first)
- Active status

### Pagination

Uses cursor-based pagination:
- More efficient than offset
- Consistent results during updates
- Handles concurrent modifications

### Content Fetching

Feed items are references:
- FeedItem has type and ID
- Full content fetched by type
- Allows lazy loading
- Reduces initial payload

## API Reference

### Hooks
- `useFeed(communityId, cursor?)` - Get feed for community with optional cursor

### Key Functions
- `fetchFeed(supabase, communityId, cursor?)` - Fetch feed items

## Important Patterns

### Fetching Feed

```typescript
const { data: feed } = useFeed(communityId);

console.log(`${feed.items.length} items`);
console.log(`Has more: ${feed.hasMore}`);
```

### Pagination

```typescript
const [cursor, setCursor] = useState<string>();

const { data: feed } = useFeed(communityId, cursor);

function loadMore() {
  if (feed?.hasMore && feed?.nextCursor) {
    setCursor(feed.nextCursor);
  }
}
```

### Rendering Feed Items

```typescript
function FeedList({ communityId }: Props) {
  const { data: feed } = useFeed(communityId);

  return (
    <div>
      {feed?.items.map(item => (
        <FeedItemCard key={item.id} item={item} />
      ))}
      {feed?.hasMore && <LoadMoreButton />}
    </div>
  );
}
```

### Type Discrimination

```typescript
function FeedItemCard({ item }: { item: FeedItem }) {
  switch (item.type) {
    case 'resource':
      return <ResourceCard resourceId={item.id} />;
    case 'event':
      return <EventCard eventId={item.id} />;
    case 'shoutout':
      return <ShoutoutCard shoutoutId={item.id} />;
  }
}
```

### Fetching Full Content

```typescript
function ResourceCard({ resourceId }: { resourceId: string }) {
  const { data: resource } = useResource(resourceId);

  if (!resource) return <Skeleton />;

  return <ResourceDisplay resource={resource} />;
}
```

### Infinite Scroll

```typescript
function InfiniteFeed({ communityId }: Props) {
  const [allItems, setAllItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string>();

  const { data: feed } = useFeed(communityId, cursor);

  useEffect(() => {
    if (feed) {
      setAllItems(prev => [...prev, ...feed.items]);
    }
  }, [feed]);

  return (
    <InfiniteScroll
      items={allItems}
      hasMore={feed?.hasMore}
      onLoadMore={() => setCursor(feed?.nextCursor)}
    />
  );
}
```