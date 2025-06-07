-- Insert statements for David, Aisha, Miguel, and Sarah
-- These users should already exist in auth.users with emails: david@example.com, aisha@example.com, miguel@example.com, sarah@example.com

-- First, let's get the user IDs (you'll need to replace these with actual UUIDs from your auth.users table)
-- You can get these by running: SELECT id, email FROM auth.users WHERE email IN ('david@example.com', 'aisha@example.com', 'miguel@example.com', 'sarah@example.com');

-- For this example, I'll use placeholder UUIDs - replace these with the actual user IDs from your database
DO $$
DECLARE
  david_id uuid := '11111111-1111-1111-1111-111111111111';  -- Replace with actual David's user ID
  aisha_id uuid := '22222222-2222-2222-2222-222222222222';  -- Replace with actual Aisha's user ID
  miguel_id uuid := '33333333-3333-3333-3333-333333333333'; -- Replace with actual Miguel's user ID
  sarah_id uuid := '44444444-4444-4444-4444-444444444444';  -- Replace with actual Sarah's user ID
BEGIN
  -- Update profiles with user metadata
  UPDATE profiles SET
    user_metadata = jsonb_build_object(
      'first_name', 'David',
      'last_name', 'Park',
      'full_name', 'David Park',
      'avatar_url', 'https://randomuser.me/api/portraits/men/4.jpg',
      'location', jsonb_build_object('lat', 30.2530, 'lng', -97.7560)
    ),
    updated_at = now()
  WHERE id = david_id;

  UPDATE profiles SET
    user_metadata = jsonb_build_object(
      'first_name', 'Aisha',
      'last_name', 'Johnson',
      'full_name', 'Aisha Johnson',
      'avatar_url', 'https://randomuser.me/api/portraits/women/3.jpg',
      'location', jsonb_build_object('lat', 30.2580, 'lng', -97.7490)
    ),
    updated_at = now()
  WHERE id = aisha_id;

  UPDATE profiles SET
    user_metadata = jsonb_build_object(
      'first_name', 'Miguel',
      'last_name', 'Rodriguez',
      'full_name', 'Miguel Rodriguez',
      'avatar_url', 'https://randomuser.me/api/portraits/men/2.jpg',
      'location', jsonb_build_object('lat', 30.2480, 'lng', -97.7520)
    ),
    updated_at = now()
  WHERE id = miguel_id;

  UPDATE profiles SET
    user_metadata = jsonb_build_object(
      'first_name', 'Sarah',
      'last_name', 'Chen',
      'full_name', 'Sarah Chen',
      'avatar_url', 'https://randomuser.me/api/portraits/women/1.jpg',
      'location', jsonb_build_object('lat', 30.2510, 'lng', -97.7517)
    ),
    updated_at = now()
  WHERE id = sarah_id;

  -- Insert resources for Sarah
  INSERT INTO resources (
    creator_id,
    type,
    category,
    title,
    description,
    image_urls,
    location,
    pickup_instructions,
    parking_info,
    meetup_flexibility,
    availability,
    is_active,
    times_helped,
    created_at
  ) VALUES 
  (
    sarah_id,
    'offer',
    'tools',
    'Pressure Washer',
    'Electric pressure washer, great for cleaning patios and driveways. Available weekends. 1600 PSI, works great!',
    ARRAY['https://images.pexels.com/photos/8230106/pexels-photo-8230106.jpeg'],
    ST_SetSRID(ST_MakePoint(-97.7517, 30.2510), 4326),
    'Available for pickup from my garage. Text me when you arrive.',
    'Driveway available, or street parking is fine',
    'home_only',
    'Weekends only',
    true,
    8,
    '2024-02-15T14:30:00Z'
  ),
  (
    sarah_id,
    'offer',
    'food',
    'Homemade Sourdough Bread',
    'I bake fresh sourdough twice a week and always have extra to share. Just let me know a day in advance.',
    ARRAY['https://images.pexels.com/photos/1397293/pexels-photo-1397293.jpeg'],
    ST_SetSRID(ST_MakePoint(-97.7530, 30.2610), 4326),
    'Porch pickup available, or I can meet at the Mueller Farmers Market on Sundays.',
    'Street parking in front of blue house',
    'delivery_possible',
    'Tuesdays and Fridays, bread is ready by 4pm',
    true,
    22,
    '2024-02-20T16:45:00Z'
  );

  -- Insert resources for Aisha
  INSERT INTO resources (
    creator_id,
    type,
    category,
    title,
    description,
    image_urls,
    location,
    pickup_instructions,
    parking_info,
    meetup_flexibility,
    availability,
    is_active,
    times_helped,
    created_at
  ) VALUES (
    aisha_id,
    'offer',
    'skills',
    'Help with Basic Car Maintenance',
    'I''m a mechanic and can help with oil changes, tire rotations, and basic car troubleshooting.',
    ARRAY['https://images.pexels.com/photos/4489732/pexels-photo-4489732.jpeg'],
    ST_SetSRID(ST_MakePoint(-97.7490, 30.2580), 4326),
    'We can meet at your place or mine. I have basic tools.',
    'Plenty of street parking available',
    'public_meetup_ok',
    'Evenings and weekends',
    true,
    15,
    '2024-02-18T09:15:00Z'
  );

  -- Insert resources for Miguel
  INSERT INTO resources (
    creator_id,
    type,
    category,
    title,
    description,
    image_urls,
    location,
    pickup_instructions,
    parking_info,
    meetup_flexibility,
    availability,
    is_active,
    times_helped,
    created_at
  ) VALUES (
    miguel_id,
    'request',
    'supplies',
    'Need Moving Boxes',
    'Moving next weekend and looking for sturdy boxes. Can pick up anytime this week.',
    ARRAY[]::text[],
    ST_SetSRID(ST_MakePoint(-97.7520, 30.2480), 4326),
    'Can pick up from your location',
    '',
    'public_meetup_ok',
    'Flexible this week',
    true,
    0,
    '2024-03-01T10:20:00Z'
  );

  -- Insert resources for David
  INSERT INTO resources (
    creator_id,
    type,
    category,
    title,
    description,
    image_urls,
    location,
    pickup_instructions,
    parking_info,
    meetup_flexibility,
    availability,
    is_active,
    times_helped,
    created_at
  ) VALUES (
    david_id,
    'offer',
    'tools',
    'Ladder and Basic Tools',
    'I have a 12ft ladder, drill, and various hand tools available to borrow. Perfect for small home projects.',
    ARRAY['https://images.pexels.com/photos/1409221/pexels-photo-1409221.jpeg'],
    ST_SetSRID(ST_MakePoint(-97.7560, 30.2530), 4326),
    'Garage pickup, can help load into your vehicle if needed.',
    'Driveway available',
    'home_only',
    'Most weekdays after 5pm',
    true,
    4,
    '2024-02-25T13:10:00Z'
  );

END $$;