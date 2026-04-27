-- Create an FTS5 index for keyword search over chunk content.
-- We store the chunk's string `id` as an UNINDEXED column and use the SQLite `rowid`
-- for fast joins back to the `Chunk` table.

CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts
USING fts5(chunkId UNINDEXED, content);

-- Keep the FTS table in sync on insert/update/delete.
CREATE TRIGGER IF NOT EXISTS chunks_fts_ai AFTER INSERT ON "Chunk" BEGIN
  INSERT INTO chunks_fts(rowid, chunkId, content)
  VALUES (new.rowid, new.id, new.content);
END;

CREATE TRIGGER IF NOT EXISTS chunks_fts_ad AFTER DELETE ON "Chunk" BEGIN
  INSERT INTO chunks_fts(chunks_fts, rowid, chunkId, content)
  VALUES('delete', old.rowid, old.id, old.content);
END;

CREATE TRIGGER IF NOT EXISTS chunks_fts_au AFTER UPDATE OF content ON "Chunk" BEGIN
  INSERT INTO chunks_fts(chunks_fts, rowid, chunkId, content)
  VALUES('delete', old.rowid, old.id, old.content);
  INSERT INTO chunks_fts(rowid, chunkId, content)
  VALUES (new.rowid, new.id, new.content);
END;

