import { useMutation } from '@tanstack/react-query';
import { useSupabase } from '../../../shared/hooks';
import { reportMessage } from '../api';
import { ReportMessageInput } from '../types';

export function useReportMessage() {
  const client = useSupabase();

  return useMutation({
    mutationFn: (input: ReportMessageInput) => reportMessage(client, input),
  });
}