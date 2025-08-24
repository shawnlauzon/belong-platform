drop trigger if exists "trigger_generate_member_connection_code" on "public"."community_memberships";

drop policy "Public read access for comments" on "public"."comments";

drop policy "Allow lookup of active codes" on "public"."community_member_codes";

drop policy "Users can delete their own member codes" on "public"."community_member_codes";

drop policy "Users can insert their own member codes" on "public"."community_member_codes";

drop policy "Users can update their own member codes" on "public"."community_member_codes";

drop policy "Users can view their own member codes" on "public"."community_member_codes";

drop policy "Initiators can update connection requests" on "public"."connection_requests";

drop policy "Users can create connection requests" on "public"."connection_requests";

drop policy "Users can view their connection requests" on "public"."connection_requests";

drop policy "Public read access for resource_communities" on "public"."resource_communities";

drop policy "Public read access for resource_timeslots" on "public"."resource_timeslots";

drop policy "Public read access for resources" on "public"."resources";

drop policy "Public read access for shoutouts" on "public"."shoutouts";

drop policy "Public read access for trust_scores" on "public"."trust_scores";

drop policy "System can create connections" on "public"."user_connections";

drop policy "Users can view their connections" on "public"."user_connections";

revoke delete on table "public"."blocked_users" from "anon";

revoke insert on table "public"."blocked_users" from "anon";

revoke references on table "public"."blocked_users" from "anon";

revoke select on table "public"."blocked_users" from "anon";

revoke trigger on table "public"."blocked_users" from "anon";

revoke truncate on table "public"."blocked_users" from "anon";

revoke update on table "public"."blocked_users" from "anon";

revoke delete on table "public"."blocked_users" from "authenticated";

revoke insert on table "public"."blocked_users" from "authenticated";

revoke references on table "public"."blocked_users" from "authenticated";

revoke select on table "public"."blocked_users" from "authenticated";

revoke trigger on table "public"."blocked_users" from "authenticated";

revoke truncate on table "public"."blocked_users" from "authenticated";

revoke update on table "public"."blocked_users" from "authenticated";

revoke delete on table "public"."blocked_users" from "service_role";

revoke insert on table "public"."blocked_users" from "service_role";

revoke references on table "public"."blocked_users" from "service_role";

revoke select on table "public"."blocked_users" from "service_role";

revoke trigger on table "public"."blocked_users" from "service_role";

revoke truncate on table "public"."blocked_users" from "service_role";

revoke update on table "public"."blocked_users" from "service_role";

revoke delete on table "public"."comments" from "anon";

revoke insert on table "public"."comments" from "anon";

revoke references on table "public"."comments" from "anon";

revoke select on table "public"."comments" from "anon";

revoke trigger on table "public"."comments" from "anon";

revoke truncate on table "public"."comments" from "anon";

revoke update on table "public"."comments" from "anon";

revoke delete on table "public"."comments" from "authenticated";

revoke insert on table "public"."comments" from "authenticated";

revoke references on table "public"."comments" from "authenticated";

revoke select on table "public"."comments" from "authenticated";

revoke trigger on table "public"."comments" from "authenticated";

revoke truncate on table "public"."comments" from "authenticated";

revoke update on table "public"."comments" from "authenticated";

revoke delete on table "public"."comments" from "service_role";

revoke insert on table "public"."comments" from "service_role";

revoke references on table "public"."comments" from "service_role";

revoke select on table "public"."comments" from "service_role";

revoke trigger on table "public"."comments" from "service_role";

revoke truncate on table "public"."comments" from "service_role";

revoke update on table "public"."comments" from "service_role";

revoke delete on table "public"."communities" from "anon";

revoke insert on table "public"."communities" from "anon";

revoke references on table "public"."communities" from "anon";

revoke select on table "public"."communities" from "anon";

revoke trigger on table "public"."communities" from "anon";

revoke truncate on table "public"."communities" from "anon";

revoke update on table "public"."communities" from "anon";

revoke delete on table "public"."communities" from "authenticated";

revoke insert on table "public"."communities" from "authenticated";

revoke references on table "public"."communities" from "authenticated";

revoke select on table "public"."communities" from "authenticated";

revoke trigger on table "public"."communities" from "authenticated";

revoke truncate on table "public"."communities" from "authenticated";

revoke update on table "public"."communities" from "authenticated";

revoke delete on table "public"."communities" from "service_role";

revoke insert on table "public"."communities" from "service_role";

revoke references on table "public"."communities" from "service_role";

revoke select on table "public"."communities" from "service_role";

revoke trigger on table "public"."communities" from "service_role";

revoke truncate on table "public"."communities" from "service_role";

revoke update on table "public"."communities" from "service_role";

revoke delete on table "public"."community_member_codes" from "anon";

revoke insert on table "public"."community_member_codes" from "anon";

revoke references on table "public"."community_member_codes" from "anon";

revoke select on table "public"."community_member_codes" from "anon";

revoke trigger on table "public"."community_member_codes" from "anon";

revoke truncate on table "public"."community_member_codes" from "anon";

revoke update on table "public"."community_member_codes" from "anon";

revoke delete on table "public"."community_member_codes" from "authenticated";

revoke insert on table "public"."community_member_codes" from "authenticated";

revoke references on table "public"."community_member_codes" from "authenticated";

revoke select on table "public"."community_member_codes" from "authenticated";

revoke trigger on table "public"."community_member_codes" from "authenticated";

revoke truncate on table "public"."community_member_codes" from "authenticated";

revoke update on table "public"."community_member_codes" from "authenticated";

revoke delete on table "public"."community_member_codes" from "service_role";

revoke insert on table "public"."community_member_codes" from "service_role";

revoke references on table "public"."community_member_codes" from "service_role";

revoke select on table "public"."community_member_codes" from "service_role";

revoke trigger on table "public"."community_member_codes" from "service_role";

revoke truncate on table "public"."community_member_codes" from "service_role";

revoke update on table "public"."community_member_codes" from "service_role";

revoke delete on table "public"."community_memberships" from "anon";

revoke insert on table "public"."community_memberships" from "anon";

revoke references on table "public"."community_memberships" from "anon";

revoke select on table "public"."community_memberships" from "anon";

revoke trigger on table "public"."community_memberships" from "anon";

revoke truncate on table "public"."community_memberships" from "anon";

revoke update on table "public"."community_memberships" from "anon";

revoke delete on table "public"."community_memberships" from "authenticated";

revoke insert on table "public"."community_memberships" from "authenticated";

revoke references on table "public"."community_memberships" from "authenticated";

revoke select on table "public"."community_memberships" from "authenticated";

revoke trigger on table "public"."community_memberships" from "authenticated";

revoke truncate on table "public"."community_memberships" from "authenticated";

revoke update on table "public"."community_memberships" from "authenticated";

revoke delete on table "public"."community_memberships" from "service_role";

revoke insert on table "public"."community_memberships" from "service_role";

revoke references on table "public"."community_memberships" from "service_role";

revoke select on table "public"."community_memberships" from "service_role";

revoke trigger on table "public"."community_memberships" from "service_role";

revoke truncate on table "public"."community_memberships" from "service_role";

revoke update on table "public"."community_memberships" from "service_role";

revoke delete on table "public"."connection_requests" from "anon";

revoke insert on table "public"."connection_requests" from "anon";

revoke references on table "public"."connection_requests" from "anon";

revoke select on table "public"."connection_requests" from "anon";

revoke trigger on table "public"."connection_requests" from "anon";

revoke truncate on table "public"."connection_requests" from "anon";

revoke update on table "public"."connection_requests" from "anon";

revoke delete on table "public"."connection_requests" from "authenticated";

revoke insert on table "public"."connection_requests" from "authenticated";

revoke references on table "public"."connection_requests" from "authenticated";

revoke select on table "public"."connection_requests" from "authenticated";

revoke trigger on table "public"."connection_requests" from "authenticated";

revoke truncate on table "public"."connection_requests" from "authenticated";

revoke update on table "public"."connection_requests" from "authenticated";

revoke delete on table "public"."connection_requests" from "service_role";

revoke insert on table "public"."connection_requests" from "service_role";

revoke references on table "public"."connection_requests" from "service_role";

revoke select on table "public"."connection_requests" from "service_role";

revoke trigger on table "public"."connection_requests" from "service_role";

revoke truncate on table "public"."connection_requests" from "service_role";

revoke update on table "public"."connection_requests" from "service_role";

revoke delete on table "public"."conversation_participants" from "anon";

revoke insert on table "public"."conversation_participants" from "anon";

revoke references on table "public"."conversation_participants" from "anon";

revoke select on table "public"."conversation_participants" from "anon";

revoke trigger on table "public"."conversation_participants" from "anon";

revoke truncate on table "public"."conversation_participants" from "anon";

revoke update on table "public"."conversation_participants" from "anon";

revoke delete on table "public"."conversation_participants" from "authenticated";

revoke insert on table "public"."conversation_participants" from "authenticated";

revoke references on table "public"."conversation_participants" from "authenticated";

revoke select on table "public"."conversation_participants" from "authenticated";

revoke trigger on table "public"."conversation_participants" from "authenticated";

revoke truncate on table "public"."conversation_participants" from "authenticated";

revoke update on table "public"."conversation_participants" from "authenticated";

revoke delete on table "public"."conversation_participants" from "service_role";

revoke insert on table "public"."conversation_participants" from "service_role";

revoke references on table "public"."conversation_participants" from "service_role";

revoke select on table "public"."conversation_participants" from "service_role";

revoke trigger on table "public"."conversation_participants" from "service_role";

revoke truncate on table "public"."conversation_participants" from "service_role";

revoke update on table "public"."conversation_participants" from "service_role";

revoke delete on table "public"."conversations" from "anon";

revoke insert on table "public"."conversations" from "anon";

revoke references on table "public"."conversations" from "anon";

revoke select on table "public"."conversations" from "anon";

revoke trigger on table "public"."conversations" from "anon";

revoke truncate on table "public"."conversations" from "anon";

revoke update on table "public"."conversations" from "anon";

revoke delete on table "public"."conversations" from "authenticated";

revoke insert on table "public"."conversations" from "authenticated";

revoke references on table "public"."conversations" from "authenticated";

revoke select on table "public"."conversations" from "authenticated";

revoke trigger on table "public"."conversations" from "authenticated";

revoke truncate on table "public"."conversations" from "authenticated";

revoke update on table "public"."conversations" from "authenticated";

revoke delete on table "public"."conversations" from "service_role";

revoke insert on table "public"."conversations" from "service_role";

revoke references on table "public"."conversations" from "service_role";

revoke select on table "public"."conversations" from "service_role";

revoke trigger on table "public"."conversations" from "service_role";

revoke truncate on table "public"."conversations" from "service_role";

revoke update on table "public"."conversations" from "service_role";

revoke delete on table "public"."message_reports" from "anon";

revoke insert on table "public"."message_reports" from "anon";

revoke references on table "public"."message_reports" from "anon";

revoke select on table "public"."message_reports" from "anon";

revoke trigger on table "public"."message_reports" from "anon";

revoke truncate on table "public"."message_reports" from "anon";

revoke update on table "public"."message_reports" from "anon";

revoke delete on table "public"."message_reports" from "authenticated";

revoke insert on table "public"."message_reports" from "authenticated";

revoke references on table "public"."message_reports" from "authenticated";

revoke select on table "public"."message_reports" from "authenticated";

revoke trigger on table "public"."message_reports" from "authenticated";

revoke truncate on table "public"."message_reports" from "authenticated";

revoke update on table "public"."message_reports" from "authenticated";

revoke delete on table "public"."message_reports" from "service_role";

revoke insert on table "public"."message_reports" from "service_role";

revoke references on table "public"."message_reports" from "service_role";

revoke select on table "public"."message_reports" from "service_role";

revoke trigger on table "public"."message_reports" from "service_role";

revoke truncate on table "public"."message_reports" from "service_role";

revoke update on table "public"."message_reports" from "service_role";

revoke delete on table "public"."message_status" from "anon";

revoke insert on table "public"."message_status" from "anon";

revoke references on table "public"."message_status" from "anon";

revoke select on table "public"."message_status" from "anon";

revoke trigger on table "public"."message_status" from "anon";

revoke truncate on table "public"."message_status" from "anon";

revoke update on table "public"."message_status" from "anon";

revoke delete on table "public"."message_status" from "authenticated";

revoke insert on table "public"."message_status" from "authenticated";

revoke references on table "public"."message_status" from "authenticated";

revoke select on table "public"."message_status" from "authenticated";

revoke trigger on table "public"."message_status" from "authenticated";

revoke truncate on table "public"."message_status" from "authenticated";

revoke update on table "public"."message_status" from "authenticated";

revoke delete on table "public"."message_status" from "service_role";

revoke insert on table "public"."message_status" from "service_role";

revoke references on table "public"."message_status" from "service_role";

revoke select on table "public"."message_status" from "service_role";

revoke trigger on table "public"."message_status" from "service_role";

revoke truncate on table "public"."message_status" from "service_role";

revoke update on table "public"."message_status" from "service_role";

revoke delete on table "public"."messages" from "anon";

revoke insert on table "public"."messages" from "anon";

revoke references on table "public"."messages" from "anon";

revoke select on table "public"."messages" from "anon";

revoke trigger on table "public"."messages" from "anon";

revoke truncate on table "public"."messages" from "anon";

revoke update on table "public"."messages" from "anon";

revoke delete on table "public"."messages" from "authenticated";

revoke insert on table "public"."messages" from "authenticated";

revoke references on table "public"."messages" from "authenticated";

revoke select on table "public"."messages" from "authenticated";

revoke trigger on table "public"."messages" from "authenticated";

revoke truncate on table "public"."messages" from "authenticated";

revoke update on table "public"."messages" from "authenticated";

revoke delete on table "public"."messages" from "service_role";

revoke insert on table "public"."messages" from "service_role";

revoke references on table "public"."messages" from "service_role";

revoke select on table "public"."messages" from "service_role";

revoke trigger on table "public"."messages" from "service_role";

revoke truncate on table "public"."messages" from "service_role";

revoke update on table "public"."messages" from "service_role";

revoke delete on table "public"."notifications" from "anon";

revoke insert on table "public"."notifications" from "anon";

revoke references on table "public"."notifications" from "anon";

revoke select on table "public"."notifications" from "anon";

revoke trigger on table "public"."notifications" from "anon";

revoke truncate on table "public"."notifications" from "anon";

revoke update on table "public"."notifications" from "anon";

revoke delete on table "public"."notifications" from "authenticated";

revoke insert on table "public"."notifications" from "authenticated";

revoke references on table "public"."notifications" from "authenticated";

revoke select on table "public"."notifications" from "authenticated";

revoke trigger on table "public"."notifications" from "authenticated";

revoke truncate on table "public"."notifications" from "authenticated";

revoke update on table "public"."notifications" from "authenticated";

revoke delete on table "public"."notifications" from "service_role";

revoke insert on table "public"."notifications" from "service_role";

revoke references on table "public"."notifications" from "service_role";

revoke select on table "public"."notifications" from "service_role";

revoke trigger on table "public"."notifications" from "service_role";

revoke truncate on table "public"."notifications" from "service_role";

revoke update on table "public"."notifications" from "service_role";

revoke delete on table "public"."profiles" from "anon";

revoke insert on table "public"."profiles" from "anon";

revoke references on table "public"."profiles" from "anon";

revoke select on table "public"."profiles" from "anon";

revoke trigger on table "public"."profiles" from "anon";

revoke truncate on table "public"."profiles" from "anon";

revoke update on table "public"."profiles" from "anon";

revoke delete on table "public"."profiles" from "authenticated";

revoke insert on table "public"."profiles" from "authenticated";

revoke references on table "public"."profiles" from "authenticated";

revoke select on table "public"."profiles" from "authenticated";

revoke trigger on table "public"."profiles" from "authenticated";

revoke truncate on table "public"."profiles" from "authenticated";

revoke update on table "public"."profiles" from "authenticated";

revoke delete on table "public"."profiles" from "service_role";

revoke insert on table "public"."profiles" from "service_role";

revoke references on table "public"."profiles" from "service_role";

revoke select on table "public"."profiles" from "service_role";

revoke trigger on table "public"."profiles" from "service_role";

revoke truncate on table "public"."profiles" from "service_role";

revoke update on table "public"."profiles" from "service_role";

revoke delete on table "public"."resource_claims" from "anon";

revoke insert on table "public"."resource_claims" from "anon";

revoke references on table "public"."resource_claims" from "anon";

revoke select on table "public"."resource_claims" from "anon";

revoke trigger on table "public"."resource_claims" from "anon";

revoke truncate on table "public"."resource_claims" from "anon";

revoke update on table "public"."resource_claims" from "anon";

revoke delete on table "public"."resource_claims" from "authenticated";

revoke insert on table "public"."resource_claims" from "authenticated";

revoke references on table "public"."resource_claims" from "authenticated";

revoke select on table "public"."resource_claims" from "authenticated";

revoke trigger on table "public"."resource_claims" from "authenticated";

revoke truncate on table "public"."resource_claims" from "authenticated";

revoke update on table "public"."resource_claims" from "authenticated";

revoke delete on table "public"."resource_claims" from "service_role";

revoke insert on table "public"."resource_claims" from "service_role";

revoke references on table "public"."resource_claims" from "service_role";

revoke select on table "public"."resource_claims" from "service_role";

revoke trigger on table "public"."resource_claims" from "service_role";

revoke truncate on table "public"."resource_claims" from "service_role";

revoke update on table "public"."resource_claims" from "service_role";

revoke delete on table "public"."resource_communities" from "anon";

revoke insert on table "public"."resource_communities" from "anon";

revoke references on table "public"."resource_communities" from "anon";

revoke select on table "public"."resource_communities" from "anon";

revoke trigger on table "public"."resource_communities" from "anon";

revoke truncate on table "public"."resource_communities" from "anon";

revoke update on table "public"."resource_communities" from "anon";

revoke delete on table "public"."resource_communities" from "authenticated";

revoke insert on table "public"."resource_communities" from "authenticated";

revoke references on table "public"."resource_communities" from "authenticated";

revoke select on table "public"."resource_communities" from "authenticated";

revoke trigger on table "public"."resource_communities" from "authenticated";

revoke truncate on table "public"."resource_communities" from "authenticated";

revoke update on table "public"."resource_communities" from "authenticated";

revoke delete on table "public"."resource_communities" from "service_role";

revoke insert on table "public"."resource_communities" from "service_role";

revoke references on table "public"."resource_communities" from "service_role";

revoke select on table "public"."resource_communities" from "service_role";

revoke trigger on table "public"."resource_communities" from "service_role";

revoke truncate on table "public"."resource_communities" from "service_role";

revoke update on table "public"."resource_communities" from "service_role";

revoke delete on table "public"."resource_responses" from "anon";

revoke insert on table "public"."resource_responses" from "anon";

revoke references on table "public"."resource_responses" from "anon";

revoke select on table "public"."resource_responses" from "anon";

revoke trigger on table "public"."resource_responses" from "anon";

revoke truncate on table "public"."resource_responses" from "anon";

revoke update on table "public"."resource_responses" from "anon";

revoke delete on table "public"."resource_responses" from "authenticated";

revoke insert on table "public"."resource_responses" from "authenticated";

revoke references on table "public"."resource_responses" from "authenticated";

revoke select on table "public"."resource_responses" from "authenticated";

revoke trigger on table "public"."resource_responses" from "authenticated";

revoke truncate on table "public"."resource_responses" from "authenticated";

revoke update on table "public"."resource_responses" from "authenticated";

revoke delete on table "public"."resource_responses" from "service_role";

revoke insert on table "public"."resource_responses" from "service_role";

revoke references on table "public"."resource_responses" from "service_role";

revoke select on table "public"."resource_responses" from "service_role";

revoke trigger on table "public"."resource_responses" from "service_role";

revoke truncate on table "public"."resource_responses" from "service_role";

revoke update on table "public"."resource_responses" from "service_role";

revoke delete on table "public"."resource_timeslots" from "anon";

revoke insert on table "public"."resource_timeslots" from "anon";

revoke references on table "public"."resource_timeslots" from "anon";

revoke select on table "public"."resource_timeslots" from "anon";

revoke trigger on table "public"."resource_timeslots" from "anon";

revoke truncate on table "public"."resource_timeslots" from "anon";

revoke update on table "public"."resource_timeslots" from "anon";

revoke delete on table "public"."resource_timeslots" from "authenticated";

revoke insert on table "public"."resource_timeslots" from "authenticated";

revoke references on table "public"."resource_timeslots" from "authenticated";

revoke select on table "public"."resource_timeslots" from "authenticated";

revoke trigger on table "public"."resource_timeslots" from "authenticated";

revoke truncate on table "public"."resource_timeslots" from "authenticated";

revoke update on table "public"."resource_timeslots" from "authenticated";

revoke delete on table "public"."resource_timeslots" from "service_role";

revoke insert on table "public"."resource_timeslots" from "service_role";

revoke references on table "public"."resource_timeslots" from "service_role";

revoke select on table "public"."resource_timeslots" from "service_role";

revoke trigger on table "public"."resource_timeslots" from "service_role";

revoke truncate on table "public"."resource_timeslots" from "service_role";

revoke update on table "public"."resource_timeslots" from "service_role";

revoke delete on table "public"."resources" from "anon";

revoke insert on table "public"."resources" from "anon";

revoke references on table "public"."resources" from "anon";

revoke select on table "public"."resources" from "anon";

revoke trigger on table "public"."resources" from "anon";

revoke truncate on table "public"."resources" from "anon";

revoke update on table "public"."resources" from "anon";

revoke delete on table "public"."resources" from "authenticated";

revoke insert on table "public"."resources" from "authenticated";

revoke references on table "public"."resources" from "authenticated";

revoke select on table "public"."resources" from "authenticated";

revoke trigger on table "public"."resources" from "authenticated";

revoke truncate on table "public"."resources" from "authenticated";

revoke update on table "public"."resources" from "authenticated";

revoke delete on table "public"."resources" from "service_role";

revoke insert on table "public"."resources" from "service_role";

revoke references on table "public"."resources" from "service_role";

revoke select on table "public"."resources" from "service_role";

revoke trigger on table "public"."resources" from "service_role";

revoke truncate on table "public"."resources" from "service_role";

revoke update on table "public"."resources" from "service_role";

revoke delete on table "public"."shoutouts" from "anon";

revoke insert on table "public"."shoutouts" from "anon";

revoke references on table "public"."shoutouts" from "anon";

revoke select on table "public"."shoutouts" from "anon";

revoke trigger on table "public"."shoutouts" from "anon";

revoke truncate on table "public"."shoutouts" from "anon";

revoke update on table "public"."shoutouts" from "anon";

revoke delete on table "public"."shoutouts" from "authenticated";

revoke insert on table "public"."shoutouts" from "authenticated";

revoke references on table "public"."shoutouts" from "authenticated";

revoke select on table "public"."shoutouts" from "authenticated";

revoke trigger on table "public"."shoutouts" from "authenticated";

revoke truncate on table "public"."shoutouts" from "authenticated";

revoke update on table "public"."shoutouts" from "authenticated";

revoke delete on table "public"."shoutouts" from "service_role";

revoke insert on table "public"."shoutouts" from "service_role";

revoke references on table "public"."shoutouts" from "service_role";

revoke select on table "public"."shoutouts" from "service_role";

revoke trigger on table "public"."shoutouts" from "service_role";

revoke truncate on table "public"."shoutouts" from "service_role";

revoke update on table "public"."shoutouts" from "service_role";

revoke delete on table "public"."spatial_ref_sys" from "anon";

revoke insert on table "public"."spatial_ref_sys" from "anon";

revoke references on table "public"."spatial_ref_sys" from "anon";

revoke select on table "public"."spatial_ref_sys" from "anon";

revoke trigger on table "public"."spatial_ref_sys" from "anon";

revoke truncate on table "public"."spatial_ref_sys" from "anon";

revoke update on table "public"."spatial_ref_sys" from "anon";

revoke delete on table "public"."spatial_ref_sys" from "authenticated";

revoke insert on table "public"."spatial_ref_sys" from "authenticated";

revoke references on table "public"."spatial_ref_sys" from "authenticated";

revoke select on table "public"."spatial_ref_sys" from "authenticated";

revoke trigger on table "public"."spatial_ref_sys" from "authenticated";

revoke truncate on table "public"."spatial_ref_sys" from "authenticated";

revoke update on table "public"."spatial_ref_sys" from "authenticated";

revoke delete on table "public"."spatial_ref_sys" from "postgres";

revoke insert on table "public"."spatial_ref_sys" from "postgres";

revoke references on table "public"."spatial_ref_sys" from "postgres";

revoke select on table "public"."spatial_ref_sys" from "postgres";

revoke trigger on table "public"."spatial_ref_sys" from "postgres";

revoke truncate on table "public"."spatial_ref_sys" from "postgres";

revoke update on table "public"."spatial_ref_sys" from "postgres";

revoke delete on table "public"."spatial_ref_sys" from "service_role";

revoke insert on table "public"."spatial_ref_sys" from "service_role";

revoke references on table "public"."spatial_ref_sys" from "service_role";

revoke select on table "public"."spatial_ref_sys" from "service_role";

revoke trigger on table "public"."spatial_ref_sys" from "service_role";

revoke truncate on table "public"."spatial_ref_sys" from "service_role";

revoke update on table "public"."spatial_ref_sys" from "service_role";

revoke delete on table "public"."trust_score_logs" from "anon";

revoke insert on table "public"."trust_score_logs" from "anon";

revoke references on table "public"."trust_score_logs" from "anon";

revoke select on table "public"."trust_score_logs" from "anon";

revoke trigger on table "public"."trust_score_logs" from "anon";

revoke truncate on table "public"."trust_score_logs" from "anon";

revoke update on table "public"."trust_score_logs" from "anon";

revoke delete on table "public"."trust_score_logs" from "authenticated";

revoke insert on table "public"."trust_score_logs" from "authenticated";

revoke references on table "public"."trust_score_logs" from "authenticated";

revoke select on table "public"."trust_score_logs" from "authenticated";

revoke trigger on table "public"."trust_score_logs" from "authenticated";

revoke truncate on table "public"."trust_score_logs" from "authenticated";

revoke update on table "public"."trust_score_logs" from "authenticated";

revoke delete on table "public"."trust_score_logs" from "service_role";

revoke insert on table "public"."trust_score_logs" from "service_role";

revoke references on table "public"."trust_score_logs" from "service_role";

revoke select on table "public"."trust_score_logs" from "service_role";

revoke trigger on table "public"."trust_score_logs" from "service_role";

revoke truncate on table "public"."trust_score_logs" from "service_role";

revoke update on table "public"."trust_score_logs" from "service_role";

revoke delete on table "public"."trust_scores" from "anon";

revoke insert on table "public"."trust_scores" from "anon";

revoke references on table "public"."trust_scores" from "anon";

revoke select on table "public"."trust_scores" from "anon";

revoke trigger on table "public"."trust_scores" from "anon";

revoke truncate on table "public"."trust_scores" from "anon";

revoke update on table "public"."trust_scores" from "anon";

revoke delete on table "public"."trust_scores" from "authenticated";

revoke insert on table "public"."trust_scores" from "authenticated";

revoke references on table "public"."trust_scores" from "authenticated";

revoke select on table "public"."trust_scores" from "authenticated";

revoke trigger on table "public"."trust_scores" from "authenticated";

revoke truncate on table "public"."trust_scores" from "authenticated";

revoke update on table "public"."trust_scores" from "authenticated";

revoke delete on table "public"."trust_scores" from "service_role";

revoke insert on table "public"."trust_scores" from "service_role";

revoke references on table "public"."trust_scores" from "service_role";

revoke select on table "public"."trust_scores" from "service_role";

revoke trigger on table "public"."trust_scores" from "service_role";

revoke truncate on table "public"."trust_scores" from "service_role";

revoke update on table "public"."trust_scores" from "service_role";

revoke delete on table "public"."user_connections" from "anon";

revoke insert on table "public"."user_connections" from "anon";

revoke references on table "public"."user_connections" from "anon";

revoke select on table "public"."user_connections" from "anon";

revoke trigger on table "public"."user_connections" from "anon";

revoke truncate on table "public"."user_connections" from "anon";

revoke update on table "public"."user_connections" from "anon";

revoke delete on table "public"."user_connections" from "authenticated";

revoke insert on table "public"."user_connections" from "authenticated";

revoke references on table "public"."user_connections" from "authenticated";

revoke select on table "public"."user_connections" from "authenticated";

revoke trigger on table "public"."user_connections" from "authenticated";

revoke truncate on table "public"."user_connections" from "authenticated";

revoke update on table "public"."user_connections" from "authenticated";

revoke delete on table "public"."user_connections" from "service_role";

revoke insert on table "public"."user_connections" from "service_role";

revoke references on table "public"."user_connections" from "service_role";

revoke select on table "public"."user_connections" from "service_role";

revoke trigger on table "public"."user_connections" from "service_role";

revoke truncate on table "public"."user_connections" from "service_role";

revoke update on table "public"."user_connections" from "service_role";

alter table "public"."community_member_codes" drop constraint "community_member_codes_community_id_fkey";

alter table "public"."community_member_codes" drop constraint "community_member_codes_user_id_fkey";

alter table "public"."connection_requests" drop constraint "connection_requests_community_id_fkey";

alter table "public"."connection_requests" drop constraint "connection_requests_initiator_id_fkey";

alter table "public"."connection_requests" drop constraint "connection_requests_requester_id_fkey";

alter table "public"."connection_requests" drop constraint "unique_connection_request";

alter table "public"."user_connections" drop constraint "ordered_user_ids";

alter table "public"."user_connections" drop constraint "unique_user_connection";

alter table "public"."user_connections" drop constraint "user_connections_community_id_fkey";

alter table "public"."user_connections" drop constraint "user_connections_connection_request_id_fkey";

alter table "public"."user_connections" drop constraint "user_connections_user_a_id_fkey";

alter table "public"."user_connections" drop constraint "user_connections_user_b_id_fkey";

drop function if exists "public"."calculate_resource_expiration"(resource_type text, last_renewed_at timestamp with time zone);

drop function if exists "public"."cleanup_expired_connection_requests"();

drop function if exists "public"."create_user_connection"(request_id uuid);

drop function if exists "public"."generate_member_connection_code"();

drop function if exists "public"."get_resource_renewal_days"(resource_type text);

drop function if exists "public"."is_resource_active"(resource_type text, last_renewed_at timestamp with time zone);

drop function if exists "public"."is_resource_expired"(resource_type text, last_renewed_at timestamp with time zone);

drop function if exists "public"."regenerate_member_connection_code"(p_user_id uuid, p_community_id uuid);

alter table "public"."community_member_codes" drop constraint "community_member_codes_pkey";

alter table "public"."connection_requests" drop constraint "connection_requests_pkey";

alter table "public"."user_connections" drop constraint "user_connections_pkey";

drop index if exists "public"."community_member_codes_pkey";

drop index if exists "public"."connection_requests_pkey";

drop index if exists "public"."idx_community_member_codes_community";

drop index if exists "public"."idx_community_member_codes_user_community";

drop index if exists "public"."idx_connection_requests_community";

drop index if exists "public"."idx_connection_requests_expires_at";

drop index if exists "public"."idx_connection_requests_initiator";

drop index if exists "public"."idx_connection_requests_requester";

drop index if exists "public"."idx_connection_requests_status";

drop index if exists "public"."idx_user_connections_community";

drop index if exists "public"."idx_user_connections_user_a";

drop index if exists "public"."idx_user_connections_user_b";

drop index if exists "public"."unique_active_member_code_user_community";

drop index if exists "public"."unique_connection_request";

drop index if exists "public"."unique_user_connection";

drop index if exists "public"."user_connections_pkey";

drop table "public"."community_member_codes";

drop table "public"."connection_requests";

drop table "public"."user_connections";

drop type "public"."connection_request_status";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.check_comment_nesting_depth()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    -- Check if parent already has a parent (would make this 3rd level)
    IF EXISTS (
      SELECT 1 FROM comments 
      WHERE id = NEW.parent_id AND parent_id IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Comments can only be nested 2 levels deep';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_comment_nesting_level()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- If this comment has a parent_id, check if the parent already has a parent
    IF NEW.parent_id IS NOT NULL THEN
        -- Check if the parent comment already has a parent (which would make this a 3rd level)
        IF EXISTS (
            SELECT 1 FROM public.comments 
            WHERE id = NEW.parent_id AND parent_id IS NOT NULL
        ) THEN
            RAISE EXCEPTION 'Comments can only be nested 2 levels deep';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_resource_comment_count()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.resource_id IS NOT NULL AND NOT NEW.is_deleted THEN
    UPDATE resources SET comment_count = comment_count + 1 WHERE id = NEW.resource_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_deleted = false AND NEW.is_deleted = true AND NEW.resource_id IS NOT NULL THEN
      UPDATE resources SET comment_count = comment_count - 1 WHERE id = NEW.resource_id;
    ELSIF OLD.is_deleted = true AND NEW.is_deleted = false AND NEW.resource_id IS NOT NULL THEN
      UPDATE resources SET comment_count = comment_count + 1 WHERE id = NEW.resource_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.resource_id IS NOT NULL AND NOT OLD.is_deleted THEN
    UPDATE resources SET comment_count = comment_count - 1 WHERE id = OLD.resource_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_shoutout_comment_count()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.shoutout_id IS NOT NULL AND NOT NEW.is_deleted THEN
    UPDATE shoutouts SET comment_count = comment_count + 1 WHERE id = NEW.shoutout_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_deleted = false AND NEW.is_deleted = true AND NEW.shoutout_id IS NOT NULL THEN
      UPDATE shoutouts SET comment_count = comment_count - 1 WHERE id = NEW.shoutout_id;
    ELSIF OLD.is_deleted = true AND NEW.is_deleted = false AND NEW.shoutout_id IS NOT NULL THEN
      UPDATE shoutouts SET comment_count = comment_count + 1 WHERE id = NEW.shoutout_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.shoutout_id IS NOT NULL AND NOT OLD.is_deleted THEN
    UPDATE shoutouts SET comment_count = comment_count - 1 WHERE id = OLD.shoutout_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.auto_add_organizer_attendance()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  row_count INTEGER;
BEGIN
    -- Insert organizer as attendee with 'attending' status with proper conflict handling
    INSERT INTO gathering_responses (gathering_id, user_id, status)
    VALUES (NEW.id, NEW.organizer_id, 'attending')
    ON CONFLICT (gathering_id, user_id) 
    DO UPDATE SET status = 'attending', updated_at = now()
    WHERE gathering_responses.status != 'attending'; -- Only update if status changed
    
    -- Check if the insert/update actually happened
    GET DIAGNOSTICS row_count = ROW_COUNT;
    
    IF row_count > 0 THEN
      RAISE LOG 'Successfully added/updated organizer % attendance for gathering %', NEW.organizer_id, NEW.id;
    ELSE
      RAISE LOG 'Organizer % already attending gathering % with correct status', NEW.organizer_id, NEW.id;
    END IF;
    
    RETURN NEW;
EXCEPTION
  WHEN foreign_key_violation THEN
    RAISE WARNING 'Foreign key violation adding organizer % to gathering %: %', NEW.organizer_id, NEW.id, SQLERRM;
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING 'Unexpected error adding organizer % to gathering %: %', NEW.organizer_id, NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.auto_add_organizer_to_community_memberships()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  row_count INTEGER;
  profile_exists BOOLEAN := FALSE;
  user_exists BOOLEAN := FALSE;
BEGIN
  -- Enhanced logging for debugging
  RAISE LOG 'DEBUG: Auto-adding organizer % to community % memberships', NEW.organizer_id, NEW.id;
  
  -- Check if the user exists in auth.users
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = NEW.organizer_id) INTO user_exists;
  RAISE LOG 'DEBUG: User % exists in auth.users: %', NEW.organizer_id, user_exists;
  
  -- Check if the user has a profile
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = NEW.organizer_id) INTO profile_exists;
  RAISE LOG 'DEBUG: Profile exists for user %: %', NEW.organizer_id, profile_exists;
  
  -- Check if membership already exists
  PERFORM 1 FROM community_memberships 
  WHERE user_id = NEW.organizer_id AND community_id = NEW.id;
  
  IF FOUND THEN
    RAISE LOG 'DEBUG: Membership already exists for user % in community %', NEW.organizer_id, NEW.id;
    RETURN NEW;
  END IF;
  
  -- Try the insert with detailed error info
  RAISE LOG 'DEBUG: Attempting to insert membership for user % in community %', NEW.organizer_id, NEW.id;
  
  INSERT INTO community_memberships (
    user_id,
    community_id,
    created_at,
    updated_at
  )
  VALUES (
    NEW.organizer_id,
    NEW.id,
    now(),
    now()
  );
  
  -- Check if the insert succeeded
  GET DIAGNOSTICS row_count = ROW_COUNT;
  RAISE LOG 'DEBUG: Insert result - rows affected: %', row_count;
  
  IF row_count > 0 THEN
    RAISE LOG 'SUCCESS: Added organizer % to community % memberships', NEW.organizer_id, NEW.id;
  ELSE
    RAISE WARNING 'FAILED: No rows inserted for organizer % in community %', NEW.organizer_id, NEW.id;
  END IF;
  
  RETURN NEW;
  
EXCEPTION
  WHEN unique_violation THEN
    RAISE LOG 'DEBUG: Unique violation - organizer % already member of community %', NEW.organizer_id, NEW.id;
    RETURN NEW;
    
  WHEN foreign_key_violation THEN
    RAISE WARNING 'DEBUG: Foreign key violation for organizer % in community %: %. User exists: %, Profile exists: %', 
      NEW.organizer_id, NEW.id, SQLERRM, user_exists, profile_exists;
    RETURN NEW;
    
  WHEN OTHERS THEN
    RAISE WARNING 'DEBUG: Unexpected error for organizer % in community %: %. SQLSTATE: %', 
      NEW.organizer_id, NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.auto_add_organizer_to_event_attendances()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  row_count INTEGER;
BEGIN
  -- Log the attempt for debugging
  RAISE LOG 'Auto-adding organizer % to event % attendances', NEW.organizer_id, NEW.id;
  
  -- Insert the organizer as an attendee with "attending" status with proper conflict handling
  INSERT INTO event_attendances (
    user_id,
    event_id,
    status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.organizer_id,
    NEW.id,
    'attending',
    now(),
    now()
  )
  ON CONFLICT (user_id, event_id) 
  DO UPDATE SET 
    status = 'attending',
    updated_at = now()
  WHERE event_attendances.status != 'attending'; -- Only update if status changed
  
  -- Check if the insert/update actually happened
  GET DIAGNOSTICS row_count = ROW_COUNT;
  
  IF row_count > 0 THEN
    RAISE LOG 'Successfully added/updated organizer % attendance for event %', NEW.organizer_id, NEW.id;
  ELSE
    RAISE LOG 'Organizer % already attending event % with correct status', NEW.organizer_id, NEW.id;
  END IF;

  -- DO NOT manually update attendee_count - let the existing trigger handle it
  
  RETURN NEW;
  
EXCEPTION
  WHEN unique_violation THEN
    -- Handle duplicate key violations (shouldn't happen with ON CONFLICT, but just in case)
    RAISE LOG 'Organizer % already attending event % (unique violation)', NEW.organizer_id, NEW.id;
    RETURN NEW;
    
  WHEN foreign_key_violation THEN
    -- Handle foreign key constraint violations
    RAISE WARNING 'Foreign key violation adding organizer % to event %: %', NEW.organizer_id, NEW.id, SQLERRM;
    RETURN NEW;
    
  WHEN OTHERS THEN
    -- Handle any other errors
    RAISE WARNING 'Unexpected error adding organizer % to event %: %', NEW.organizer_id, NEW.id, SQLERRM;
    -- Still return NEW to allow event creation to proceed
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.auto_create_timeslot_claim()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  requires_approval boolean;
  resource_owner_id uuid;
  current_user_id uuid;
  claim_status resource_claim_status;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  
  -- Validate we have an authenticated user
  IF current_user_id IS NULL THEN
    RAISE WARNING 'TRIGGER: No authenticated user found when creating timeslot %', NEW.id;
    RETURN NEW;
  END IF;
  
  -- Get resource details
  SELECT r.requires_approval, r.owner_id 
  INTO requires_approval, resource_owner_id
  FROM resources r
  WHERE r.id = NEW.resource_id;
  
  -- Validate resource exists
  IF NOT FOUND THEN
    RAISE WARNING 'TRIGGER: Resource % not found when creating timeslot %', NEW.resource_id, NEW.id;
    RETURN NEW;
  END IF;
  
  -- Determine status based on approval requirement and ownership
  claim_status := CASE 
    WHEN NOT requires_approval OR current_user_id = resource_owner_id 
    THEN 'approved'::resource_claim_status
    ELSE 'pending'::resource_claim_status
  END;
  
  -- Create the claim - omit claimant_id to use default auth.uid()
  INSERT INTO resource_claims (
    timeslot_id,
    resource_id,
    status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.resource_id,
    claim_status,
    now(),
    now()
  );
  
  RAISE LOG 'TRIGGER: Successfully created claim for timeslot % with status %', NEW.id, claim_status;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.award_trust_points_for_community_creation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Use the centralized trust score update function
  PERFORM update_trust_score(
    NEW.organizer_id,
    NEW.id,
    'community_creation'::trust_score_action_type,
    NEW.id,
    1000,
    jsonb_build_object(
      'community_name', NEW.name,
      'community_type', NEW.type
    )
  );
  
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Handle any errors but don't fail community creation
    RAISE WARNING 'Error awarding trust points for community creation by user % for community %: %', 
      NEW.organizer_id, NEW.id, SQLERRM;
    return NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_community_area(community_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
AS $function$
DECLARE
  community_area numeric;
BEGIN
  SELECT ST_Area(ST_Buffer(center::geography, radius_km * 1000)) / 1000000 
  INTO community_area
  FROM communities 
  WHERE id = community_id;
  
  RETURN community_area;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_event_cancellation_penalty(p_timeslot_id uuid, p_cancelled_at timestamp with time zone DEFAULT now())
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_event_start TIMESTAMP WITH TIME ZONE;
  v_hours_before NUMERIC;
BEGIN
  -- Get the event start time
  SELECT start_time INTO v_event_start
  FROM resource_timeslots
  WHERE id = p_timeslot_id;

  IF v_event_start IS NULL THEN
    RETURN 0; -- No penalty if timeslot not found
  END IF;

  -- Calculate hours before event
  v_hours_before := EXTRACT(EPOCH FROM (v_event_start - p_cancelled_at)) / 3600;

  -- Return penalty based on timing
  IF v_hours_before > 24 THEN
    RETURN -5;  -- More than 24 hours before
  ELSIF v_hours_before >= 6 THEN
    RETURN -10; -- Between 6-24 hours before
  ELSIF v_hours_before >= 1 THEN
    RETURN -10; -- Between 1-6 hours before (same as 6-24h)
  ELSE
    RETURN -20; -- Less than 1 hour before
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_resource_expiration(resource_type resource_type, last_renewed_at timestamp with time zone)
 RETURNS timestamp with time zone
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT 
    CASE 
      WHEN public.get_resource_renewal_days(resource_type) IS NULL THEN NULL
      ELSE last_renewed_at + (public.get_resource_renewal_days(resource_type) || ' days')::interval
    END;
$function$
;

CREATE OR REPLACE FUNCTION public.communities_containing_point(lat numeric, lng numeric)
 RETURNS TABLE(id uuid, name text, level_name text, depth integer, member_count integer, area_km2 numeric, distance_km numeric)
 LANGUAGE plpgsql
AS $function$
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
    WHERE c.deleted_at IS NULL
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
    WHERE p.deleted_at IS NULL
  )
  SELECT ch.id, ch.name, ch.level_name, ch.depth, ch.member_count, ch.area_km2, ch.distance_km
  FROM community_hierarchy ch
  ORDER BY ch.depth, ch.area_km2 ASC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.decrement_comment_count()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF OLD.resource_id IS NOT NULL THEN
        UPDATE public.resources 
        SET comment_count = GREATEST(COALESCE(comment_count, 0) - 1, 0) 
        WHERE id = OLD.resource_id;
    ELSIF OLD.shoutout_id IS NOT NULL THEN
        UPDATE public.shoutouts 
        SET comment_count = GREATEST(COALESCE(comment_count, 0) - 1, 0) 
        WHERE id = OLD.shoutout_id;
    END IF;
    RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.estimate_population(lat numeric, lng numeric, radius_km numeric)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Placeholder: simple density estimate
  -- In real implementation, integrate with census/population data APIs
  RETURN ROUND((PI() * POWER(radius_km, 2)) * 100)::integer; -- ~100 people per km²
END;
$function$
;

CREATE OR REPLACE FUNCTION public.expires_at(resources)
 RETURNS timestamp with time zone
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT calculate_resource_expiration($1.type, $1.last_renewed_at);
$function$
;

CREATE OR REPLACE FUNCTION public.get_boundary_polygon(community_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_or_create_conversation(other_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  conv_id UUID;
  current_user_id UUID;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- Validate not messaging self
  IF current_user_id = other_user_id THEN
    RAISE EXCEPTION 'Cannot create conversation with yourself';
  END IF;
  
  -- Check if users share a community
  IF NOT users_share_community(current_user_id, other_user_id) THEN
    RAISE EXCEPTION 'Users must share a community to message';
  END IF;

  -- Check if blocked
  IF EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (blocker_id = current_user_id AND blocked_id = other_user_id)
    OR (blocker_id = other_user_id AND blocked_id = current_user_id)
  ) THEN
    RAISE EXCEPTION 'Cannot create conversation with blocked user';
  END IF;

  -- Check for existing conversation
  SELECT c.id INTO conv_id
  FROM conversations c
  WHERE EXISTS (
    SELECT 1 FROM conversation_participants cp1
    WHERE cp1.conversation_id = c.id AND cp1.user_id = current_user_id
  ) AND EXISTS (
    SELECT 1 FROM conversation_participants cp2
    WHERE cp2.conversation_id = c.id AND cp2.user_id = other_user_id
  );

  -- Create new conversation if none exists
  IF conv_id IS NULL THEN
    INSERT INTO conversations DEFAULT VALUES RETURNING id INTO conv_id;
    INSERT INTO conversation_participants (conversation_id, user_id) 
    VALUES 
      (conv_id, current_user_id),
      (conv_id, other_user_id);
  END IF;

  RETURN conv_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_resource_renewal_days(resource_type resource_type)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT CASE resource_type
    WHEN 'offer' THEN 30
    WHEN 'request' THEN 14
    WHEN 'event' THEN NULL  -- Events don't auto-expire
    ELSE 30  -- Default for unknown types
  END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_comment_soft_delete()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- If comment is being soft deleted (is_deleted changed from false to true)
    IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
        IF NEW.resource_id IS NOT NULL THEN
            UPDATE public.resources 
            SET comment_count = GREATEST(COALESCE(comment_count, 0) - 1, 0) 
            WHERE id = NEW.resource_id;
        ELSIF NEW.shoutout_id IS NOT NULL THEN
            UPDATE public.shoutouts 
            SET comment_count = GREATEST(COALESCE(comment_count, 0) - 1, 0) 
            WHERE id = NEW.shoutout_id;
        END IF;
    -- If comment is being restored (is_deleted changed from true to false)
    ELSIF OLD.is_deleted = true AND NEW.is_deleted = false THEN
        IF NEW.resource_id IS NOT NULL THEN
            UPDATE public.resources 
            SET comment_count = COALESCE(comment_count, 0) + 1 
            WHERE id = NEW.resource_id;
        ELSIF NEW.shoutout_id IS NOT NULL THEN
            UPDATE public.shoutouts 
            SET comment_count = COALESCE(comment_count, 0) + 1 
            WHERE id = NEW.shoutout_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  user_email text;
  user_meta jsonb;
BEGIN
  -- Get the email, handling potential null values
  user_email := COALESCE(NEW.email, '');
  
  -- Ensure user_metadata is never null
  user_meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  
  -- Log the attempt for debugging
  RAISE LOG 'Creating profile for user: % with email: % and metadata: %', NEW.id, user_email, user_meta;
  
  -- Insert the profile with error handling
  INSERT INTO public.profiles (
    id, 
    email, 
    user_metadata,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id, 
    user_email,
    user_meta,
    COALESCE(NEW.created_at, now()),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    user_metadata = EXCLUDED.user_metadata,
    updated_at = now();
  
  RAISE LOG 'Successfully created profile for user: %', NEW.id;
  RETURN NEW;
  
EXCEPTION
  WHEN unique_violation THEN
    -- Handle duplicate key violations (shouldn't happen with ON CONFLICT, but just in case)
    RAISE LOG 'Profile already exists for user: %', NEW.id;
    RETURN NEW;
    
  WHEN foreign_key_violation THEN
    -- Handle foreign key constraint violations
    RAISE WARNING 'Foreign key violation creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
    
  WHEN check_violation THEN
    -- Handle check constraint violations
    RAISE WARNING 'Check constraint violation creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
    
  WHEN not_null_violation THEN
    -- Handle not null constraint violations
    RAISE WARNING 'Not null violation creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
    
  WHEN OTHERS THEN
    -- Handle any other errors
    RAISE WARNING 'Unexpected error creating profile for user %: %', NEW.id, SQLERRM;
    -- Still return NEW to allow user creation to proceed
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_comment_count()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.resource_id IS NOT NULL THEN
        UPDATE public.resources 
        SET comment_count = COALESCE(comment_count, 0) + 1 
        WHERE id = NEW.resource_id;
    ELSIF NEW.shoutout_id IS NOT NULL THEN
        UPDATE public.shoutouts 
        SET comment_count = COALESCE(comment_count, 0) + 1 
        WHERE id = NEW.shoutout_id;
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_active(resources)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT is_resource_active($1.type, $1.last_renewed_at);
$function$
;

CREATE OR REPLACE FUNCTION public.is_community_member_of_resource(resource_uuid uuid, user_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM resource_communities rc
    JOIN community_memberships cm ON rc.community_id = cm.community_id
    WHERE rc.resource_id = resource_uuid 
    AND cm.user_id = user_uuid
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_resource_active(resource_type resource_type, last_renewed_at timestamp with time zone)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT NOT public.is_resource_expired(resource_type, last_renewed_at);
$function$
;

CREATE OR REPLACE FUNCTION public.is_resource_expired(resource_type resource_type, last_renewed_at timestamp with time zone)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT 
    CASE 
      WHEN public.get_resource_renewal_days(resource_type) IS NULL THEN false  -- Events never expire
      WHEN last_renewed_at IS NULL THEN false  -- Not yet renewed, not expired
      ELSE public.calculate_resource_expiration(resource_type, last_renewed_at) < now()
    END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_resource_owner(resource_uuid uuid, user_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM resources 
    WHERE id = resource_uuid 
    AND owner_id = user_uuid
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_messages_as_read(p_conversation_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  -- Update message status
  UPDATE message_status
  SET read_at = NOW()
  WHERE user_id = current_user_id
  AND read_at IS NULL
  AND message_id IN (
    SELECT id FROM messages 
    WHERE conversation_id = p_conversation_id
  );
  
  -- Reset unread count
  UPDATE conversation_participants
  SET 
    unread_count = 0,
    last_read_at = NOW()
  WHERE conversation_id = p_conversation_id
  AND user_id = current_user_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_new_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    sender_name TEXT;
    receiver_id UUID;
BEGIN
    -- Get sender's display name
    SELECT display_name INTO sender_name
    FROM public.profiles
    WHERE id = NEW.sender_id;

    -- Find the other participant in the conversation (receiver)
    SELECT user_id INTO receiver_id
    FROM public.conversation_participants
    WHERE conversation_id = NEW.conversation_id
      AND user_id != NEW.sender_id
    LIMIT 1;

    -- Create notification for the receiver
    IF receiver_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            content,
            data
        ) VALUES (
            receiver_id,
            'message',
            'New message from ' || COALESCE(sender_name, 'Someone'),
            CASE 
                WHEN LENGTH(NEW.content) > 50 
                THEN LEFT(NEW.content, 50) || '...'
                ELSE NEW.content
            END,
            jsonb_build_object(
                'conversation_id', NEW.conversation_id,
                'message_id', NEW.id,
                'sender_id', NEW.sender_id
            )
        );
    END IF;

    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.store_circular_boundary(community_id uuid, boundary_data jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.store_isochrone_boundary(community_id uuid, boundary_data jsonb, original_polygon geometry)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.trust_score_on_claim_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_resource RECORD;
  v_community_id UUID;
BEGIN
  -- Only process if status is 'pending' (for events)
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Get resource details
  SELECT r.type, r.owner_id, r.title 
  INTO v_resource
  FROM resources r
  JOIN resource_timeslots rt ON rt.resource_id = r.id
  WHERE rt.id = NEW.timeslot_id;

  -- Only process events (resources with type 'event')
  IF v_resource.type != 'event' THEN
    RETURN NEW;
  END IF;

  -- Award points for each community the resource is associated with
  FOR v_community_id IN
    SELECT rc.community_id 
    FROM resource_communities rc
    JOIN resource_timeslots rt ON rt.resource_id = rc.resource_id
    WHERE rt.id = NEW.timeslot_id
  LOOP
    PERFORM update_trust_score(
      NEW.user_id,
      v_community_id,
      'resource_claim'::trust_score_action_type, -- Cast text to enum
      NEW.id,
      5,
      jsonb_build_object(
        'trigger', 'resource_claim_insert',
        'resource_type', v_resource.type,
        'resource_title', v_resource.title,
        'status', NEW.status
      )
    );
  END LOOP;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trust_score_on_claim_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_resource RECORD;
  v_community_id UUID;
  v_points INTEGER;
  v_action_type TEXT;
  v_metadata JSONB;
BEGIN
  -- Get resource details
  SELECT r.type, r.owner_id, r.title 
  INTO v_resource
  FROM resources r
  JOIN resource_timeslots rt ON rt.resource_id = r.id
  WHERE rt.id = NEW.timeslot_id;

  -- Only process events (resources with type 'event')
  IF v_resource.type != 'event' THEN
    RETURN NEW;
  END IF;

  -- Determine action based on status change
  IF OLD.status = 'pending' AND NEW.status = 'confirmed' THEN
    v_action_type := 'resource_claim';
    v_points := 25;
    v_metadata := jsonb_build_object(
      'trigger', 'resource_claim_update',
      'resource_type', v_resource.type,
      'resource_title', v_resource.title,
      'old_status', OLD.status,
      'new_status', NEW.status
    );
  ELSIF OLD.status = 'confirmed' AND NEW.status = 'completed' THEN
    v_action_type := 'resource_completion';
    v_points := 50;
    v_metadata := jsonb_build_object(
      'trigger', 'resource_claim_update',
      'resource_type', v_resource.type,
      'resource_title', v_resource.title,
      'old_status', OLD.status,
      'new_status', NEW.status
    );
  ELSE
    -- No points awarded for other status changes
    RETURN NEW;
  END IF;

  -- Award points for each community the resource is associated with
  FOR v_community_id IN
    SELECT rc.community_id 
    FROM resource_communities rc
    JOIN resource_timeslots rt ON rt.resource_id = rc.resource_id
    WHERE rt.id = NEW.timeslot_id
  LOOP
    PERFORM update_trust_score(
      NEW.user_id,
      v_community_id,
      v_action_type::trust_score_action_type, -- Cast text to enum
      NEW.id,
      v_points,
      v_metadata
    );
  END LOOP;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trust_score_on_membership_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  PERFORM update_trust_score(
    NEW.user_id,
    NEW.community_id,
    'community_join'::trust_score_action_type,
    NEW.community_id,
    50,
    jsonb_build_object('trigger', 'community_membership_insert')
  );
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trust_score_on_resource_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_community_id UUID;
BEGIN
  -- Only process offers
  IF NEW.type != 'offer' THEN
    RETURN NEW;
  END IF;

  -- Award points for each community the resource is associated with
  FOR v_community_id IN
    SELECT community_id 
    FROM resource_communities 
    WHERE resource_id = NEW.id
  LOOP
    PERFORM update_trust_score(
      NEW.owner_id,
      v_community_id,
      'resource_offer'::trust_score_action_type,
      NEW.id,
      50,
      jsonb_build_object(
        'trigger', 'resource_insert',
        'resource_type', NEW.type,
        'resource_title', NEW.title
      )
    );
  END LOOP;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trust_score_on_shoutout_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Award points to receiver
  PERFORM update_trust_score(
    NEW.receiver_id,
    NEW.community_id,
    'shoutout_received'::trust_score_action_type,
    NEW.id,
    100,
    jsonb_build_object(
      'trigger', 'shoutout_insert',
      'role', 'receiver',
      'sender_id', NEW.sender_id
    )
  );

  -- Award points to sender  
  PERFORM update_trust_score(
    NEW.sender_id,
    NEW.community_id,
    'shoutout_sent'::trust_score_action_type,
    NEW.id,
    10,
    jsonb_build_object(
      'trigger', 'shoutout_insert',
      'role', 'sender',
      'receiver_id', NEW.receiver_id
    )
  );

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_community_member_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  target_community_id uuid;
  new_count integer;
BEGIN
  -- Determine which community_id to update based on the operation
  IF TG_OP = 'DELETE' THEN
    target_community_id := OLD.community_id;
  ELSE
    target_community_id := NEW.community_id;
  END IF;

  -- Count the actual number of members for this community
  SELECT COUNT(*)
  INTO new_count
  FROM community_memberships
  WHERE community_id = target_community_id;

  -- Update the member_count in the communities table
  UPDATE communities
  SET member_count = new_count,
      updated_at = now()
  WHERE id = target_community_id;

  -- Return the appropriate record based on operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Update conversation metadata
  UPDATE conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = CASE 
      WHEN NEW.is_deleted THEN '[Message deleted]'
      ELSE LEFT(NEW.content, 100)
    END,
    last_message_sender_id = NEW.sender_id,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  
  -- Increment unread count for other participant
  UPDATE conversation_participants
  SET unread_count = unread_count + 1
  WHERE conversation_id = NEW.conversation_id
  AND user_id != NEW.sender_id;
  
  -- Create message status for recipient
  INSERT INTO message_status (message_id, user_id)
  SELECT NEW.id, user_id
  FROM conversation_participants
  WHERE conversation_id = NEW.conversation_id
  AND user_id != NEW.sender_id;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_conversation_on_new_message()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Update the conversation's last_message_id and last_activity_at
    UPDATE conversations 
    SET 
        last_message_id = NEW.id,
        last_activity_at = NEW.created_at,
        updated_at = now()
    WHERE id = NEW.conversation_id;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_conversations_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_direct_messages_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_gathering_attendee_count()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    gathering_id_val UUID;
BEGIN
    -- Determine which gathering to update based on the operation
    IF TG_OP = 'DELETE' THEN
        gathering_id_val := OLD.gathering_id;
    ELSE
        gathering_id_val := NEW.gathering_id;
    END IF;
    
    -- Update the attendee count for the gathering
    UPDATE gatherings 
    SET attendee_count = (
        SELECT COUNT(*) 
        FROM gathering_responses 
        WHERE gathering_id = gathering_id_val 
        AND status = 'attending'
    )
    WHERE id = gathering_id_val;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_trust_score(p_user_id uuid, p_community_id uuid, p_action_type trust_score_action_type, p_action_id uuid, p_points_change integer, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  current_score INTEGER := 0;
  new_score INTEGER;
BEGIN
  -- Log the attempt for debugging
  RAISE LOG 'Updating trust score for user % in community % for action %', 
    p_user_id, p_community_id, p_action_type;

  -- Get current score for this user in this community
  SELECT COALESCE(score, 0) INTO current_score
  FROM trust_scores 
  WHERE user_id = p_user_id AND community_id = p_community_id;

  -- Calculate new score
  new_score := current_score + p_points_change;
  
  -- Ensure new score doesn't go below 0
  new_score := GREATEST(new_score, 0);

  -- Insert or update the trust score
  INSERT INTO trust_scores (
    user_id,
    community_id,
    score,
    last_calculated_at,
    created_at,
    updated_at
  )
  VALUES (
    p_user_id,
    p_community_id,
    new_score,
    now(),
    now(),
    now()
  )
  ON CONFLICT (user_id, community_id) 
  DO UPDATE SET
    score = new_score,
    last_calculated_at = now(),
    updated_at = now();

  -- Log the score change
  INSERT INTO trust_score_logs (
    user_id,
    community_id,
    action_type,
    action_id,
    points_change,
    score_before,
    score_after,
    metadata,
    created_at
  )
  VALUES (
    p_user_id,
    p_community_id,
    p_action_type,
    p_action_id,
    p_points_change,
    current_score,
    new_score,
    p_metadata,
    now()
  );

  RAISE LOG 'Updated trust score for user % in community % from % to % (+%)', 
    p_user_id, p_community_id, current_score, new_score, p_points_change;

EXCEPTION
  WHEN foreign_key_violation THEN
    -- Handle foreign key constraint violations gracefully
    RAISE WARNING 'Foreign key violation updating trust score for user % in community %: %', 
      p_user_id, p_community_id, SQLERRM;
      
  WHEN OTHERS THEN
    -- Handle any other errors
    RAISE WARNING 'Unexpected error updating trust score for user % in community %: %', 
      p_user_id, p_community_id, SQLERRM;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.user_is_conversation_participant(conv_id uuid, check_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conv_id AND user_id = check_user_id
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.users_share_community(user1_id uuid, user2_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM community_memberships cm1
    JOIN community_memberships cm2 ON cm1.community_id = cm2.community_id
    WHERE cm1.user_id = user1_id 
    AND cm2.user_id = user2_id
  );
END;
$function$
;


  create policy "Comments are viewable by community members"
  on "public"."comments"
  as permissive
  for select
  to authenticated
using (((NOT is_deleted) AND (((resource_id IS NOT NULL) AND is_community_member_of_resource(resource_id, auth.uid())) OR ((shoutout_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM (community_memberships cm
     JOIN shoutouts s ON ((s.community_id = cm.community_id)))
  WHERE ((s.id = comments.shoutout_id) AND (cm.user_id = auth.uid()))))))));



  create policy "public_can_view_resource_communities"
  on "public"."resource_communities"
  as permissive
  for select
  to public
using (true);



  create policy "public_can_view_resource_timeslots"
  on "public"."resource_timeslots"
  as permissive
  for select
  to public
using (true);



  create policy "owners_can_manage_resources"
  on "public"."resources"
  as permissive
  for all
  to public
using ((auth.uid() = owner_id));



  create policy "public_can_view_resources"
  on "public"."resources"
  as permissive
  for select
  to public
using (true);



  create policy "Allow public read access to shoutouts"
  on "public"."shoutouts"
  as permissive
  for select
  to public
using (true);



  create policy "public_can_view_trust_scores"
  on "public"."trust_scores"
  as permissive
  for select
  to public
using (true);



