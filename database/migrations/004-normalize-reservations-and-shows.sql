-- Normalize existing reservation and show data to match the ERD.
-- Existing primary-key values are preserved.

CREATE TABLE IF NOT EXISTS customers (
  customer_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(25) NOT NULL,
  address VARCHAR(255) NULL,
  membership_status VARCHAR(30) NOT NULL DEFAULT 'non-member',
  PRIMARY KEY (customer_id),
  UNIQUE KEY customers_phone_unique (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS club_tables (
  table_id VARCHAR(10) NOT NULL,
  capacity SMALLINT UNSIGNED NOT NULL,
  zone VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'available',
  PRIMARY KEY (table_id),
  CONSTRAINT club_tables_capacity_positive CHECK (capacity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO club_tables (table_id, capacity, zone, status) VALUES
  ('F01', 8, 'Front Stage', 'available'),
  ('F02', 8, 'Front Stage', 'available'),
  ('F03', 8, 'Front Stage', 'available'),
  ('F04', 8, 'Front Stage', 'available'),
  ('M01', 8, 'Main Floor', 'available'),
  ('M02', 8, 'Main Floor', 'available'),
  ('M03', 8, 'Main Floor', 'available'),
  ('VIP-1', 12, 'VIP Lounge', 'available'),
  ('VIP-2', 12, 'VIP Lounge', 'available'),
  ('B01', 1, 'Bar Counter', 'available'),
  ('B02', 1, 'Bar Counter', 'available'),
  ('B03', 1, 'Bar Counter', 'available'),
  ('B04', 1, 'Bar Counter', 'available')
ON DUPLICATE KEY UPDATE capacity = VALUES(capacity), zone = VALUES(zone);

INSERT INTO customers (name, phone, address, membership_status)
SELECT MAX(guest_name), phone_number, NULL, 'non-member'
FROM reservations
GROUP BY phone_number
ON DUPLICATE KEY UPDATE name = VALUES(name);

CREATE TABLE reservations_erd (
  reservation_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id INT UNSIGNED NOT NULL,
  table_id VARCHAR(10) NOT NULL,
  date_time DATETIME NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
  PRIMARY KEY (reservation_id),
  UNIQUE KEY reservations_table_datetime_unique (table_id, date_time),
  KEY reservations_customer (customer_id),
  CONSTRAINT reservations_erd_customer_fk FOREIGN KEY (customer_id)
    REFERENCES customers (customer_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT reservations_erd_table_fk FOREIGN KEY (table_id)
    REFERENCES club_tables (table_id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO reservations_erd (reservation_id, customer_id, table_id, date_time, status)
SELECT r.id, c.customer_id, t.table_id, TIMESTAMP(r.`date`, r.`time`), 'confirmed'
FROM reservations r
LEFT JOIN customers c ON c.phone = r.phone_number
LEFT JOIN club_tables t ON t.table_id = r.table_number AND t.zone = r.zone;

RENAME TABLE reservations TO reservations_before_erd,
             reservations_erd TO reservations;

ALTER TABLE reservations
  DROP FOREIGN KEY reservations_erd_customer_fk,
  DROP FOREIGN KEY reservations_erd_table_fk,
  ADD CONSTRAINT reservations_customer_fk FOREIGN KEY (customer_id)
    REFERENCES customers (customer_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD CONSTRAINT reservations_table_fk FOREIGN KEY (table_id)
    REFERENCES club_tables (table_id) ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS artists (
  artist_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  artist_name VARCHAR(150) NOT NULL,
  artist_type VARCHAR(50) NOT NULL DEFAULT 'guest',
  genre VARCHAR(100) NOT NULL,
  PRIMARY KEY (artist_id),
  UNIQUE KEY artists_name_unique (artist_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO artists (artist_name, artist_type, genre)
SELECT artist, 'guest', MAX(genre)
FROM shows
GROUP BY artist
ON DUPLICATE KEY UPDATE genre = VALUES(genre);

CREATE TABLE shows_erd (
  show_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  artist_id INT UNSIGNED NOT NULL,
  performance_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  PRIMARY KEY (show_id),
  KEY shows_schedule (performance_date, start_time),
  KEY shows_artist (artist_id),
  CONSTRAINT shows_erd_artist_fk FOREIGN KEY (artist_id)
    REFERENCES artists (artist_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT shows_erd_time_order CHECK (end_time > start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO shows_erd (show_id, artist_id, performance_date, start_time, end_time)
SELECT s.show_id, a.artist_id, s.show_date, s.start_time,
       ADDTIME(s.start_time, '02:00:00')
FROM shows s
LEFT JOIN artists a ON a.artist_name = s.artist;

RENAME TABLE shows TO shows_before_erd,
             shows_erd TO shows;

ALTER TABLE shows
  DROP FOREIGN KEY shows_erd_artist_fk,
  ADD CONSTRAINT shows_artist_fk FOREIGN KEY (artist_id)
    REFERENCES artists (artist_id) ON UPDATE CASCADE ON DELETE RESTRICT;

DROP TABLE reservations_before_erd;
DROP TABLE shows_before_erd;
