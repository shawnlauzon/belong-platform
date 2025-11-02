-- Fix notification edge function calls to use Vault instead of database settings
-- This follows Supabase's best practice as documented in:
-- https://supabase.com/docs/guides/ai/automatic-embeddings

-- Create utility function to retrieve project URL from Vault
create or replace function get_project_url()
returns text
language plpgsql
security definer
stable
as $$
declare
  secret_value text;
begin
  -- Retrieve the project URL from Vault
  select decrypted_secret into secret_value
  from vault.decrypted_secrets
  where name = 'project_url';

  if secret_value is null then
    raise exception 'project_url not found in Vault. Run: select vault.create_secret(''https://your-project.supabase.co'', ''project_url'');';
  end if;

  return secret_value;
end;
$$;

-- Create utility function to retrieve anon key from Vault
create or replace function get_anon_key()
returns text
language plpgsql
security definer
stable
as $$
declare
  secret_value text;
begin
  -- Retrieve the anon key from Vault
  select decrypted_secret into secret_value
  from vault.decrypted_secrets
  where name = 'anon_key';

  if secret_value is null then
    raise exception 'anon_key not found in Vault. Run: select vault.create_secret(''your-anon-key'', ''anon_key'');';
  end if;

  return secret_value;
end;
$$;

-- Update send_email_notification_async to use Vault
create or replace function send_email_notification_async(
  p_user_id uuid,
  p_notification_id uuid,
  p_action action_type,
  p_title text,
  p_body text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
as $$
begin
  -- Check if should send email
  if not should_send_email(p_user_id, p_action) then
    return;
  end if;

  -- Call Edge Function via pg_net (non-blocking)
  perform net.http_post(
    url := get_project_url() || '/functions/v1/send-email-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || get_anon_key()
    ),
    body := jsonb_build_object(
      'user_id', p_user_id,
      'notification_id', p_notification_id,
      'type', p_action,
      'title', p_title,
      'body', p_body,
      'metadata', p_metadata
    )
  );
exception
  when others then
    -- Log error but don't fail the transaction
    raise warning 'Failed to send email notification: %', sqlerrm;
end;
$$;

-- Update send_push_notification_async to use Vault
create or replace function send_push_notification_async(
  p_user_id uuid,
  p_notification_id uuid,
  p_action action_type,
  p_title text,
  p_body text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
as $$
begin
  -- Check if should send push
  if not should_send_push(p_user_id, p_action) then
    return;
  end if;

  -- Call Edge Function via pg_net (non-blocking)
  perform net.http_post(
    url := get_project_url() || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || get_anon_key()
    ),
    body := jsonb_build_object(
      'user_id', p_user_id,
      'notification_id', p_notification_id,
      'action', p_action,
      'title', p_title,
      'body', p_body,
      'metadata', p_metadata
    )
  );
exception
  when others then
    -- Log error but don't fail the transaction
    raise warning 'Failed to send push notification: %', sqlerrm;
end;
$$;
