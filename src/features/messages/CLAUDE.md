# Real-Time 1x1 Messaging Implementation

## Overview

This document outlines the implementation of a secure, real-time 1x1 messaging system for the Belong Network Platform. The system uses Supabase Realtime with server-side encryption for the web platform, with a clear migration path to client-side end-to-end encryption for future mobile applications.

Channel: `user:{userId}:notifications` - 'new_conversation' event with the conversation object
Channel: `conversation:{conversationId}:messages` - all messages for a conversation
