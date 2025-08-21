-- Custom auth trigger for automatic profile creation
-- This trigger calls the handle_new_user function when a new user is created in auth.users

CREATE OR REPLACE TRIGGER "on_auth_user_created" 
    AFTER INSERT ON "auth"."users" 
    FOR EACH ROW 
    EXECUTE FUNCTION "public"."handle_new_user"();