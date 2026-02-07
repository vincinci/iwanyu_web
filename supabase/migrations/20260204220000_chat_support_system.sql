-- Chat Support System Tables
-- Real-time chat between customers and support agents

-- Chat conversations/threads
CREATE TABLE IF NOT EXISTS public.support_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name text,
  customer_email text,
  agent_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'active', 'resolved', 'closed')),
  subject text,
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  last_message_at timestamptz DEFAULT now(),
  unread_count integer DEFAULT 0
);
-- Chat messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.support_chats(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('customer', 'agent', 'system')),
  sender_name text,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_support_chats_customer ON public.support_chats(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_chats_agent ON public.support_chats(agent_id);
CREATE INDEX IF NOT EXISTS idx_support_chats_status ON public.support_chats(status);
CREATE INDEX IF NOT EXISTS idx_support_chats_updated ON public.support_chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat ON public.chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON public.chat_messages(created_at DESC);
-- Enable Row Level Security
ALTER TABLE public.support_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
-- RLS Policies for support_chats
CREATE POLICY "Customers can view their own chats"
  ON public.support_chats FOR SELECT
  USING (auth.uid() = customer_id);
CREATE POLICY "Customers can create chats"
  ON public.support_chats FOR INSERT
  WITH CHECK (auth.uid() = customer_id OR customer_id IS NULL);
CREATE POLICY "Agents can view all chats"
  ON public.support_chats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin')
    )
  );
CREATE POLICY "Agents can update chats"
  ON public.support_chats FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin')
    )
  );
-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in their chats"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.support_chats
      WHERE id = chat_messages.chat_id
      AND (customer_id = auth.uid() OR agent_id = auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin')
    )
  );
CREATE POLICY "Users can send messages to their chats"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_chats
      WHERE id = chat_messages.chat_id
      AND (customer_id = auth.uid() OR agent_id = auth.uid() OR customer_id IS NULL)
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin')
    )
  );
-- Function to update chat timestamp on new message
CREATE OR REPLACE FUNCTION update_chat_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.support_chats
  SET 
    last_message_at = NEW.created_at,
    updated_at = NEW.created_at,
    unread_count = CASE 
      WHEN NEW.sender_type = 'customer' THEN unread_count + 1
      ELSE unread_count
    END
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Trigger for updating chat on new message
DROP TRIGGER IF EXISTS on_chat_message_insert ON public.chat_messages;
CREATE TRIGGER on_chat_message_insert
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_on_message();
-- Enable realtime for chat tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
-- Grant permissions
GRANT ALL ON public.support_chats TO authenticated;
GRANT ALL ON public.chat_messages TO authenticated;
GRANT ALL ON public.support_chats TO anon;
GRANT ALL ON public.chat_messages TO anon;
DO $$
BEGIN
  RAISE NOTICE 'Chat support system tables created successfully';
END $$;
