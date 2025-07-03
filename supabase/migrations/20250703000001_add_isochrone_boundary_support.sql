/*
  # Add Isochrone Boundary Support to Communities

  This migration adds comprehensive boundary support for communities, enabling
  both traditional circular boundaries and advanced isochrone boundaries.

  ## New Columns:
  1. boundary (JSONB) - Stores complete boundary metadata including polygon data
  2. boundary_geometry (geometry) - Simplified polygon for fast spatial queries
  3. boundary_geometry_detailed (geometry) - Original detailed polygon for UI display

  ## Features:
  - JSONB storage for flexible boundary types (circular, isochrone)
  - Polygon simplification for performance optimization
  - Spatial indexes for efficient queries
  - Data validation constraints
  - Backward compatibility with existing center/radius_km columns

  ## Boundary Types:
  - Circular: {"type": "circular", "center": [lng, lat], "radius_km": 5.0}
  - Isochrone: {"type": "isochrone", "center": [lng, lat], "travelMode": "walking", 
               "minutes": 15, "polygon": {...}, "area": 12.5}
*/

-- Add boundary configuration and geometry columns
ALTER TABLE communities 
  ADD COLUMN boundary JSONB DEFAULT NULL,
  ADD COLUMN boundary_geometry geometry(Polygon, 4326) DEFAULT NULL,
  ADD COLUMN boundary_geometry_detailed geometry(Polygon, 4326) DEFAULT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS communities_boundary_idx ON communities USING gin(boundary);
CREATE INDEX IF NOT EXISTS communities_boundary_geometry_idx ON communities USING gist(boundary_geometry);
CREATE INDEX IF NOT EXISTS communities_boundary_geometry_detailed_idx ON communities USING gist(boundary_geometry_detailed);

-- Add constraint to validate boundary data structure
ALTER TABLE communities ADD CONSTRAINT boundary_data_valid 
  CHECK (
    boundary IS NULL OR (
      boundary ? 'type' AND
      (
        (boundary->>'type' = 'circular' AND 
         boundary ? 'center' AND 
         boundary ? 'radius_km') OR
        (boundary->>'type' = 'isochrone' AND 
         boundary ? 'center' AND 
         boundary ? 'travelMode' AND 
         boundary ? 'minutes' AND 
         boundary ? 'polygon' AND 
         boundary ? 'area')
      )
    )
  );

-- Ensure geometry columns are consistent with boundary type
ALTER TABLE communities ADD CONSTRAINT boundary_geometry_consistency
  CHECK (
    (boundary IS NULL AND boundary_geometry IS NULL AND boundary_geometry_detailed IS NULL) OR
    (boundary IS NOT NULL AND 
     ((boundary->>'type' = 'circular' AND boundary_geometry IS NULL AND boundary_geometry_detailed IS NULL) OR
      (boundary->>'type' = 'isochrone' AND boundary_geometry IS NOT NULL AND boundary_geometry_detailed IS NOT NULL)))
  );

-- Add constraint for valid travel modes
ALTER TABLE communities ADD CONSTRAINT boundary_travel_mode_valid
  CHECK (
    boundary IS NULL OR
    boundary->>'type' != 'isochrone' OR
    boundary->>'travelMode' IN ('walking', 'cycling', 'driving')
  );

-- Add constraint for valid time ranges
ALTER TABLE communities ADD CONSTRAINT boundary_minutes_valid
  CHECK (
    boundary IS NULL OR
    boundary->>'type' != 'isochrone' OR
    ((boundary->>'minutes')::integer > 0 AND (boundary->>'minutes')::integer <= 60)
  );

-- Function to store isochrone boundary with automatic polygon simplification
CREATE OR REPLACE FUNCTION store_isochrone_boundary(
  community_id UUID,
  boundary_data JSONB,
  original_polygon geometry
) RETURNS void AS $$
BEGIN
  -- Validate input
  IF boundary_data->>'type' != 'isochrone' THEN
    RAISE EXCEPTION 'Function only supports isochrone boundaries';
  END IF;
  
  IF original_polygon IS NULL THEN
    RAISE EXCEPTION 'Original polygon cannot be null for isochrone boundary';
  END IF;

  -- Update community with boundary data and geometries
  UPDATE communities SET
    boundary = boundary_data,
    boundary_geometry_detailed = original_polygon,
    boundary_geometry = ST_SimplifyPreserveTopology(original_polygon, 0.0001) -- ~10m tolerance
  WHERE id = community_id;
  
  -- Verify update succeeded
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Community with id % not found', community_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to store circular boundary
CREATE OR REPLACE FUNCTION store_circular_boundary(
  community_id UUID,
  boundary_data JSONB
) RETURNS void AS $$
BEGIN
  -- Validate input
  IF boundary_data->>'type' != 'circular' THEN
    RAISE EXCEPTION 'Function only supports circular boundaries';
  END IF;

  -- Update community with boundary data (no geometry columns for circular)
  UPDATE communities SET
    boundary = boundary_data,
    boundary_geometry = NULL,
    boundary_geometry_detailed = NULL
  WHERE id = community_id;
  
  -- Verify update succeeded
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Community with id % not found', community_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Update communities_containing_point function to support isochrone boundaries
CREATE OR REPLACE FUNCTION communities_containing_point(lat NUMERIC, lng NUMERIC)
RETURNS TABLE (
  id UUID,
  name TEXT,
  level_name TEXT,
  depth INTEGER,
  member_count INTEGER,
  area_km2 NUMERIC,
  distance_km NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE community_hierarchy AS (
    -- Base case: communities that contain the point
    SELECT 
      c.id,
      c.name,
      c.level as level_name,
      0 as depth,
      c.member_count,
      CASE 
        -- Isochrone boundary
        WHEN c.boundary_geometry IS NOT NULL THEN 
          ST_Area(c.boundary_geometry::geography) / 1000000.0
        -- Circular boundary (new format)
        WHEN c.boundary IS NOT NULL AND c.boundary->>'type' = 'circular' THEN
          PI() * POWER((c.boundary->>'radius_km')::numeric, 2)
        -- Legacy circular boundary
        WHEN c.radius_km IS NOT NULL THEN
          PI() * POWER(c.radius_km, 2)
        ELSE 0
      END as area_km2,
      CASE 
        -- Isochrone boundary - distance to centroid
        WHEN c.boundary_geometry IS NOT NULL THEN 
          ST_Distance(ST_Centroid(c.boundary_geometry)::geography, ST_Point(lng, lat)::geography) / 1000.0
        -- Circular boundary (new format)
        WHEN c.boundary IS NOT NULL AND c.boundary->>'type' = 'circular' THEN
          ST_Distance(
            ST_Point((c.boundary->'center'->0)::numeric, (c.boundary->'center'->1)::numeric)::geography,
            ST_Point(lng, lat)::geography
          ) / 1000.0
        -- Legacy circular boundary
        WHEN c.center IS NOT NULL THEN
          ST_Distance(c.center::geography, ST_Point(lng, lat)::geography) / 1000.0
        ELSE 0
      END as distance_km,
      c.parent_id
    FROM communities c
    WHERE c.is_active = true
      AND (
        -- Point is within isochrone boundary
        (c.boundary_geometry IS NOT NULL AND ST_Contains(c.boundary_geometry, ST_Point(lng, lat))) OR
        -- Point is within circular boundary (new format)
        (c.boundary IS NOT NULL AND c.boundary->>'type' = 'circular' AND 
         ST_DWithin(
           ST_Point((c.boundary->'center'->0)::numeric, (c.boundary->'center'->1)::numeric)::geography,
           ST_Point(lng, lat)::geography,
           (c.boundary->>'radius_km')::numeric * 1000
         )) OR
        -- Point is within legacy circular boundary
        (c.boundary IS NULL AND c.center IS NOT NULL AND c.radius_km IS NOT NULL AND
         ST_DWithin(c.center::geography, ST_Point(lng, lat)::geography, c.radius_km * 1000))
      )
    
    UNION ALL
    
    -- Recursive case: parent communities
    SELECT 
      p.id,
      p.name,
      p.level as level_name,
      ch.depth + 1,
      p.member_count,
      CASE 
        -- Isochrone boundary
        WHEN p.boundary_geometry IS NOT NULL THEN 
          ST_Area(p.boundary_geometry::geography) / 1000000.0
        -- Circular boundary (new format)
        WHEN p.boundary IS NOT NULL AND p.boundary->>'type' = 'circular' THEN
          PI() * POWER((p.boundary->>'radius_km')::numeric, 2)
        -- Legacy circular boundary
        WHEN p.radius_km IS NOT NULL THEN
          PI() * POWER(p.radius_km, 2)
        ELSE 0
      END as area_km2,
      CASE 
        -- Isochrone boundary - distance to centroid
        WHEN p.boundary_geometry IS NOT NULL THEN 
          ST_Distance(ST_Centroid(p.boundary_geometry)::geography, ST_Point(lng, lat)::geography) / 1000.0
        -- Circular boundary (new format)
        WHEN p.boundary IS NOT NULL AND p.boundary->>'type' = 'circular' THEN
          ST_Distance(
            ST_Point((p.boundary->'center'->0)::numeric, (p.boundary->'center'->1)::numeric)::geography,
            ST_Point(lng, lat)::geography
          ) / 1000.0
        -- Legacy circular boundary
        WHEN p.center IS NOT NULL THEN
          ST_Distance(p.center::geography, ST_Point(lng, lat)::geography) / 1000.0
        ELSE 0
      END as distance_km,
      p.parent_id
    FROM communities p
    INNER JOIN community_hierarchy ch ON p.id = ch.parent_id
    WHERE p.is_active = true
  )
  SELECT ch.id, ch.name, ch.level_name, ch.depth, ch.member_count, ch.area_km2, ch.distance_km
  FROM community_hierarchy ch
  ORDER BY ch.depth, ch.area_km2 ASC;
END;
$$ LANGUAGE plpgsql;

-- Create helper function to get boundary polygon for display
CREATE OR REPLACE FUNCTION get_boundary_polygon(community_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT 
    CASE 
      WHEN boundary->>'type' = 'isochrone' THEN boundary->'polygon'
      WHEN boundary->>'type' = 'circular' THEN 
        ST_AsGeoJSON(
          ST_Buffer(
            ST_Point((boundary->'center'->0)::numeric, (boundary->'center'->1)::numeric)::geography,
            (boundary->>'radius_km')::numeric * 1000
          )::geometry
        )::jsonb
      WHEN boundary IS NULL AND center IS NOT NULL AND radius_km IS NOT NULL THEN
        ST_AsGeoJSON(ST_Buffer(center::geography, radius_km * 1000)::geometry)::jsonb
      ELSE NULL
    END
  INTO result
  FROM communities 
  WHERE id = community_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;