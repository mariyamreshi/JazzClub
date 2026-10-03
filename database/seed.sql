-- Fictional shows. Re-running the seed skips matching rows and preserves existing data.
INSERT INTO shows (show_date, artist, genre, start_time)
SELECT '2026-10-16', 'The Araya Quartet', 'Contemporary Jazz', '20:30:00'
WHERE NOT EXISTS (
  SELECT 1 FROM shows WHERE show_date = '2026-10-16' AND artist = 'The Araya Quartet'
    AND genre = 'Contemporary Jazz' AND start_time = '20:30:00'
);

INSERT INTO shows (show_date, artist, genre, start_time)
SELECT '2026-10-17', 'Midnight Blue Trio', 'Bebop & Standards', '21:00:00'
WHERE NOT EXISTS (
  SELECT 1 FROM shows WHERE show_date = '2026-10-17' AND artist = 'Midnight Blue Trio'
    AND genre = 'Bebop & Standards' AND start_time = '21:00:00'
);

INSERT INTO shows (show_date, artist, genre, start_time)
SELECT '2026-10-18', 'Nina & The Brass', 'Soul Jazz', '20:00:00'
WHERE NOT EXISTS (
  SELECT 1 FROM shows WHERE show_date = '2026-10-18' AND artist = 'Nina & The Brass'
    AND genre = 'Soul Jazz' AND start_time = '20:00:00'
);

INSERT INTO shows (show_date, artist, genre, start_time)
SELECT '2026-10-23', 'Chiang Mai Swing Collective', 'Swing', '20:30:00'
WHERE NOT EXISTS (
  SELECT 1 FROM shows WHERE show_date = '2026-10-23' AND artist = 'Chiang Mai Swing Collective'
    AND genre = 'Swing' AND start_time = '20:30:00'
);

INSERT INTO shows (show_date, artist, genre, start_time)
SELECT '2026-10-24', 'Riverfront Jazz Ensemble', 'Latin Jazz', '21:00:00'
WHERE NOT EXISTS (
  SELECT 1 FROM shows WHERE show_date = '2026-10-24' AND artist = 'Riverfront Jazz Ensemble'
    AND genre = 'Latin Jazz' AND start_time = '21:00:00'
);
