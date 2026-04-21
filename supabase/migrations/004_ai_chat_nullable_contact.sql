-- Migration 004: Allow ai_conversations without a contact (general mode)
ALTER TABLE public.ai_conversations
  ALTER COLUMN contact_id DROP NOT NULL;

-- Update the index to cover null contact_id rows too (already works, just document intent)
-- Sessions with contact_id IS NULL represent general "Preparar" mode conversations
