ALTER TABLE reservations
  ADD UNIQUE KEY reservations_date_table_unique (`date`, table_number);
