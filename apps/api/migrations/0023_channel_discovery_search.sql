CREATE INDEX channels_public_search_idx
  ON channels
  USING gin (
    to_tsvector(
      'simple',
      coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(category, '')
    )
  );

CREATE INDEX channels_public_cursor_idx
  ON channels (created_at DESC, id DESC)
  WHERE status = 'active' AND visibility = 'public';
