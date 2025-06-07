import { Community, Event, Member, MeetupSpot, Resource, Thanks } from './mockApi';

// Mock Communities - Updated 4-layer hierarchy
export const mockCommunities: Community[] = [
  // Level 1: Worldwide (root)
  {
    id: 'worldwide',
    name: 'Worldwide',
    level: 'global',
    parent_id: null,
    member_count: 125000,
    description: 'Global neighborhood'
  },
  
  // Level 2: Countries
  {
    id: 'us',
    name: 'United States',
    level: 'country',
    parent_id: 'worldwide',
    member_count: 45000,
    description: 'Coast to coast community'
  },
  {
    id: 'england',
    name: 'England',
    level: 'country',
    parent_id: 'worldwide',
    member_count: 8500,
    description: 'English communities'
  },
  
  // Level 3: Cities
  {
    id: 'austin',
    name: 'Austin',
    level: 'city',
    parent_id: 'us',
    center: { lat: 30.2672, lng: -97.7431 },
    radius_km: 25,
    member_count: 1240,
    description: 'Keep Austin helping'
  },
  {
    id: 'guildford',
    name: 'Guildford',
    level: 'city',
    parent_id: 'england',
    center: { lat: 51.2362, lng: -0.5704 },
    radius_km: 15,
    member_count: 320,
    description: 'Guildford community'
  },
  
  // Level 4: Neighborhoods
  {
    id: 'south-austin',
    name: 'South Austin',
    level: 'neighborhood',
    parent_id: 'austin',
    center: { lat: 30.2500, lng: -97.7500 },
    radius_km: 8,
    member_count: 145,
    description: 'South Austin neighbors helping neighbors'
  }
];

// Mock Members
export const mockMembers: Member[] = [
  {
    id: '123e4567-e89b-12d3-a456-426614174005',
    name: 'Sarah Chen',
    avatar_url: 'https://randomuser.me/api/portraits/women/1.jpg',
    trust_score: 8.5,
    location: { lat: 30.2510, lng: -97.7517 },
    community_tenure_months: 14,
    thanks_received: 23,
    resources_shared: 15
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174006',
    name: 'Miguel Rodriguez',
    avatar_url: 'https://randomuser.me/api/portraits/men/2.jpg',
    trust_score: 7.2,
    location: { lat: 30.2480, lng: -97.7520 },
    community_tenure_months: 8,
    thanks_received: 12,
    resources_shared: 9
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174007',
    name: 'Aisha Johnson',
    avatar_url: 'https://randomuser.me/api/portraits/women/3.jpg',
    trust_score: 9.1,
    location: { lat: 30.2580, lng: -97.7490 },
    community_tenure_months: 22,
    thanks_received: 35,
    resources_shared: 28
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174008',
    name: 'David Park',
    avatar_url: 'https://randomuser.me/api/portraits/men/4.jpg',
    trust_score: 6.8,
    location: { lat: 30.2530, lng: -97.7560 },
    community_tenure_months: 4,
    thanks_received: 7,
    resources_shared: 5
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174009',
    name: 'Emma Wilson',
    avatar_url: 'https://randomuser.me/api/portraits/women/5.jpg',
    trust_score: 8.0,
    location: { lat: 30.2610, lng: -97.7530 },
    community_tenure_months: 11,
    thanks_received: 19,
    resources_shared: 13
  }
];

// Mock Resources
export const mockResources: Resource[] = [
  {
    id: '123e4567-e89b-12d3-a456-426614174010',
    creator_id: '123e4567-e89b-12d3-a456-426614174005',
    owner: mockMembers[0],
    type: 'offer',
    category: 'tools',
    title: 'Pressure Washer',
    description: 'Electric pressure washer, great for cleaning patios and driveways. Available weekends. 1600 PSI, works great!',
    image_urls: ['https://images.pexels.com/photos/8230106/pexels-photo-8230106.jpeg'],
    location: { lat: 30.2510, lng: -97.7517 },
    pickup_instructions: 'Available for pickup from my garage. Text me when you arrive.',
    parking_info: 'Driveway available, or street parking is fine',
    meetup_flexibility: 'home_only',
    availability: 'Weekends only',
    is_active: true,
    times_helped: 8,
    created_at: '2024-02-15T14:30:00Z'
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174011',
    creator_id: '123e4567-e89b-12d3-a456-426614174007',
    owner: mockMembers[2],
    type: 'offer',
    category: 'skills',
    title: 'Help with Basic Car Maintenance',
    description: 'I\'m a mechanic and can help with oil changes, tire rotations, and basic car troubleshooting.',
    image_urls: ['https://images.pexels.com/photos/4489732/pexels-photo-4489732.jpeg'],
    location: { lat: 30.2580, lng: -97.7490 },
    pickup_instructions: 'We can meet at your place or mine. I have basic tools.',
    parking_info: 'Plenty of street parking available',
    meetup_flexibility: 'public_meetup_ok',
    availability: 'Evenings and weekends',
    is_active: true,
    times_helped: 15,
    created_at: '2024-02-18T09:15:00Z'
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174012',
    creator_id: '123e4567-e89b-12d3-a456-426614174009',
    owner: mockMembers[4],
    type: 'offer',
    category: 'food',
    title: 'Homemade Sourdough Bread',
    description: 'I bake fresh sourdough twice a week and always have extra to share. Just let me know a day in advance.',
    image_urls: ['https://images.pexels.com/photos/1397293/pexels-photo-1397293.jpeg'],
    location: { lat: 30.2610, lng: -97.7530 },
    pickup_instructions: 'Porch pickup available, or I can meet at the Mueller Farmers Market on Sundays.',
    parking_info: 'Street parking in front of blue house',
    meetup_flexibility: 'delivery_possible',
    availability: 'Tuesdays and Fridays, bread is ready by 4pm',
    is_active: true,
    times_helped: 22,
    created_at: '2024-02-20T16:45:00Z'
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174013',
    creator_id: '123e4567-e89b-12d3-a456-426614174006',
    owner: mockMembers[1],
    type: 'request',
    category: 'supplies',
    title: 'Need Moving Boxes',
    description: 'Moving next weekend and looking for sturdy boxes. Can pick up anytime this week.',
    image_urls: [],
    location: { lat: 30.2480, lng: -97.7520 },
    pickup_instructions: 'Can pick up from your location',
    parking_info: '',
    meetup_flexibility: 'public_meetup_ok',
    availability: 'Flexible this week',
    is_active: true,
    times_helped: 0,
    created_at: '2024-03-01T10:20:00Z'
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174014',
    creator_id: '123e4567-e89b-12d3-a456-426614174008',
    owner: mockMembers[3],
    type: 'offer',
    category: 'tools',
    title: 'Ladder and Basic Tools',
    description: 'I have a 12ft ladder, drill, and various hand tools available to borrow. Perfect for small home projects.',
    image_urls: ['https://images.pexels.com/photos/1409221/pexels-photo-1409221.jpeg'],
    location: { lat: 30.2530, lng: -97.7560 },
    pickup_instructions: 'Garage pickup, can help load into your vehicle if needed.',
    parking_info: 'Driveway available',
    meetup_flexibility: 'home_only',
    availability: 'Most weekdays after 5pm',
    is_active: true,
    times_helped: 4,
    created_at: '2024-02-25T13:10:00Z'
  }
];

// Mock Thanks
export const mockThanks: Thanks[] = [
  {
    id: '123e4567-e89b-12d3-a456-426614174015',
    from_member_id: '123e4567-e89b-12d3-a456-426614174006',
    from_member: mockMembers[1],
    to_member_id: '123e4567-e89b-12d3-a456-426614174005',
    to_member: mockMembers[0],
    resource_id: '123e4567-e89b-12d3-a456-426614174010',
    resource: mockResources[0],
    message: 'The pressure washer worked perfectly! I was able to clean my entire patio and it looks brand new.',
    image_urls: ['https://images.pexels.com/photos/4439908/pexels-photo-4439908.jpeg'],
    impact_description: 'Saved me at least $150 on hiring a professional cleaner.',
    created_at: '2024-02-17T18:30:00Z'
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174016',
    from_member_id: '123e4567-e89b-12d3-a456-426614174008',
    from_member: mockMembers[3],
    to_member_id: '123e4567-e89b-12d3-a456-426614174007',
    to_member: mockMembers[2],
    resource_id: '123e4567-e89b-12d3-a456-426614174011',
    resource: mockResources[1],
    message: 'Aisha taught me how to change my oil and check other fluids. Great teacher and super helpful!',
    image_urls: ['https://images.pexels.com/photos/3807329/pexels-photo-3807329.jpeg'],
    impact_description: 'Now I can do basic maintenance myself and save money every few months.',
    created_at: '2024-02-22T12:15:00Z'
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174017',
    from_member_id: '123e4567-e89b-12d3-a456-426614174005',
    from_member: mockMembers[0],
    to_member_id: '123e4567-e89b-12d3-a456-426614174009',
    to_member: mockMembers[4],
    resource_id: '123e4567-e89b-12d3-a456-426614174012',
    resource: mockResources[2],
    message: 'Emma\'s sourdough bread is amazing! My family devoured it in one sitting.',
    image_urls: ['https://images.pexels.com/photos/1775043/pexels-photo-1775043.jpeg'],
    impact_description: 'Made our Sunday dinner extra special and reminded me how much better homemade bread tastes.',
    created_at: '2024-02-23T19:45:00Z'
  }
];

// Popular Austin meetup spots for resource exchange
export const mockMeetupSpots: MeetupSpot[] = [
  { name: 'Central Market (North Lamar)', lat: 30.3119, lng: -97.7425, type: 'grocery' },
  { name: 'HEB (Hancock Center)', lat: 30.3006, lng: -97.7309, type: 'grocery' },
  { name: 'Whole Foods (Domain)', lat: 30.4022, lng: -97.7472, type: 'grocery' },
  { name: 'Starbucks (South Lamar)', lat: 30.2590, lng: -97.7563, type: 'coffee' },
  { name: 'Home Depot (I-35)', lat: 30.2621, lng: -97.7157, type: 'hardware' }
];

// Mock Events - Updated community IDs
export const mockEvents: Event[] = [
  {
    id: '123e4567-e89b-12d3-a456-426614174018',
    community_id: 'south-austin',
    title: 'South Austin Tool Share',
    date: '2025-02-15T18:00:00',
    location: 'Zilker Park Pavilion',
    parking: 'Free lot available',
    attendee_count: 12,
    description: 'Monthly tool swap and maintenance workshop'
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174019',
    community_id: 'south-austin',
    title: 'Neighborhood BBQ Potluck',
    date: '2025-02-20T17:30:00',
    location: 'Mueller Lake Park',
    parking: 'Street parking on Simond Ave',
    attendee_count: 28,
    description: 'Bring a dish to share and meet your neighbors'
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174020',
    community_id: 'austin',
    title: 'Austin Seed Swap',
    date: '2025-02-28T10:00:00',
    location: 'Sustainable Food Center',
    parking: 'Parking garage next door',
    attendee_count: 45,
    description: 'Exchange seeds and gardening knowledge with fellow gardeners'
  }
];