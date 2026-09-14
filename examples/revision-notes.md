# Small revision note: COUNT and missing values

A table contains score values 10, 20, and NULL. COUNT(*) counts every row, including a row whose score is NULL, so its result is 3. COUNT(score) counts only non-NULL scores, so its result is 2. AVG(score) ignores NULL values and computes (10 + 20) / 2 = 15. NULL means missing or unknown information; it is not the number zero.

A WHERE clause keeps only rows whose condition is TRUE. A comparison between NULL and an ordinary value produces UNKNOWN. To include missing scores explicitly, use score IS NULL. These notes do not establish any student's exam schedule or personal grade.
