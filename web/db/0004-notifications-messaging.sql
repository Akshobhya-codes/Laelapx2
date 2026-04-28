-- Notifications + in-platform messaging.

-- ─── NOTIFICATIONS ─────────────────────────────────────────────────────
-- One row per "X happened that user Y should know about". Bell icon reads
-- recent rows for the current user; counts unread by `read_at IS NULL`.
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,                    -- recipient (Stack Auth user id)
  kind TEXT NOT NULL,                       -- 'view' | 'save' | 'connect_requested' | 'connect_accepted' | 'connect_declined' | 'message_received'
  payload JSONB NOT NULL DEFAULT '{}'::jsonb, -- contextual: { startupSlug, fundName, fromName, fromUserId, message, ... }
  href TEXT,                                -- where the click navigates
  read_at TIMESTAMPTZ,                      -- NULL = unread
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user
  ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON notifications(user_id) WHERE read_at IS NULL;

-- ─── CONVERSATIONS ─────────────────────────────────────────────────────
-- One conversation per (submission, investor) pair. Auto-created when a
-- founder accepts a connect request. The submission owner (founder) always
-- holds founder_user_id; the requesting investor holds investor_user_id.
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  founder_user_id TEXT NOT NULL,
  investor_user_id TEXT NOT NULL,
  connect_id UUID REFERENCES connect_requests(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(submission_id, investor_user_id)
);

CREATE INDEX IF NOT EXISTS idx_convos_founder
  ON conversations(founder_user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_convos_investor
  ON conversations(investor_user_id, last_message_at DESC);

-- ─── MESSAGES ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  read_by_recipient BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_convo
  ON messages(conversation_id, sent_at ASC);
