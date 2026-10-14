-- 5 Assigned roles per show
SELECT s.show_id,a.artist_name,es.role,COUNT(*) AS assigned FROM employee_shifts es JOIN shows s ON s.show_id=es.show_id JOIN artists a ON a.artist_id=s.artist_id GROUP BY s.show_id,a.artist_name,es.role;
