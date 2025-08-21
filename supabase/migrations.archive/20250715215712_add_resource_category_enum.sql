-- Create the resource_category enum
CREATE TYPE resource_category AS ENUM ('tools', 'skills', 'food', 'supplies', 'other');

-- Drop the existing check constraint
ALTER TABLE resources DROP CONSTRAINT IF EXISTS resources_category_check;

-- Convert the category column to use the enum
ALTER TABLE resources 
ALTER COLUMN category TYPE resource_category USING category::resource_category;