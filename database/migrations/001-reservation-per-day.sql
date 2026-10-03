-- One table can be reserved once per day, regardless of arrival time.
ALTER TABLE reservations
  ADD UNIQUE KEY reservations_date_table_unique (`date`, table_number);
