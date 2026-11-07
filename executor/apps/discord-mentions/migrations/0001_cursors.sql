-- The newest message the poll has seen in each watched channel.
CREATE TABLE cursors (
  channel_id TEXT PRIMARY KEY NOT NULL,
  last_message_id TEXT NOT NULL
);
