-- 10 Revenue by payment method
SELECT payment_method,COUNT(*) AS payments,SUM(amount) AS revenue FROM payments GROUP BY payment_method ORDER BY revenue DESC;
