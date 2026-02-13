// Chat History Service - Manages AI conversation persistence
import { supabase } from './supabase';
import { ChatSession, ChatMessage } from '@/types/database';

/**
 * Create a new chat session
 */
export async function createChatSession(
  userId: string,
  firstMessage: string
): Promise<ChatSession | null> {
  // Generate title from first message (first 50 chars)
  const title = firstMessage.length > 50
    ? firstMessage.substring(0, 47) + '...'
    : firstMessage;

  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({
      user_id: userId,
      title,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating chat session:', error);
    return null;
  }

  return data as ChatSession;
}

/**
 * Get all chat sessions for a user
 */
export async function getChatSessions(userId: string): Promise<ChatSession[]> {
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching chat sessions:', error);
    return [];
  }

  return data as ChatSession[];
}

/**
 * Get messages for a chat session
 */
export async function getChatMessages(sessionId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching chat messages:', error);
    return [];
  }

  return data as ChatMessage[];
}

/**
 * Add a message to a chat session
 */
export async function addChatMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<ChatMessage | null> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      role,
      content,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding chat message:', error);
    return null;
  }

  // Update session's updated_at timestamp
  await supabase
    .from('chat_sessions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', sessionId);

  return data as ChatMessage;
}

/**
 * Update chat session title
 */
export async function updateSessionTitle(
  sessionId: string,
  title: string
): Promise<boolean> {
  const { error } = await supabase
    .from('chat_sessions')
    .update({ title })
    .eq('id', sessionId);

  if (error) {
    console.error('Error updating session title:', error);
    return false;
  }

  return true;
}

/**
 * Delete a chat session and its messages
 */
export async function deleteChatSession(sessionId: string): Promise<boolean> {
  // Delete messages first (due to foreign key)
  await supabase
    .from('chat_messages')
    .delete()
    .eq('session_id', sessionId);

  const { error } = await supabase
    .from('chat_sessions')
    .delete()
    .eq('id', sessionId);

  if (error) {
    console.error('Error deleting chat session:', error);
    return false;
  }

  return true;
}

/**
 * Get session with messages
 */
export async function getSessionWithMessages(
  sessionId: string
): Promise<{ session: ChatSession; messages: ChatMessage[] } | null> {
  const [sessionResult, messagesResult] = await Promise.all([
    supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .single(),
    supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true }),
  ]);

  if (sessionResult.error || !sessionResult.data) {
    console.error('Error fetching session:', sessionResult.error);
    return null;
  }

  return {
    session: sessionResult.data as ChatSession,
    messages: (messagesResult.data || []) as ChatMessage[],
  };
}
