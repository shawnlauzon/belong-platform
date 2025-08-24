import { useSupabase } from '../../../shared/hooks';
import { sendMessage } from '../api';
import { SendMessageInput, Message } from '../types';

export function useSendMessage() {
  const client = useSupabase();

  const mutate = async (input: SendMessageInput): Promise<Message> => {
    return sendMessage(client, input);
  };

  return { mutate };
}