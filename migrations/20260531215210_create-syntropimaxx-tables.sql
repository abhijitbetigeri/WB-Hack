CREATE TABLE IF NOT EXISTS content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  content_url TEXT NOT NULL,
  creator_handle TEXT,
  tigris_key TEXT NOT NULL,
  vibe_blueprint JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id UUID REFERENCES content_items(id),
  raw_text TEXT NOT NULL,
  humane_score FLOAT,
  principle_scores JSONB,
  signal_level TEXT CHECK (signal_level IN ('high', 'low')),
  prompt_chips JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
