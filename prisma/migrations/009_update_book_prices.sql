-- 009: Update harga buku yang masih 0 sesuai judul buku
UPDATE `Book` SET `price` = 95000  WHERE `title` = 'Learning JavaScript'           AND `price` = 0;
UPDATE `Book` SET `price` = 110000 WHERE `title` = 'Eloquent JavaScript'           AND `price` = 0;
UPDATE `Book` SET `price` = 120000 WHERE `title` = 'React Up and Running'          AND `price` = 0;
UPDATE `Book` SET `price` = 105000 WHERE `title` = 'PHP and MySQL Web Development' AND `price` = 0;
UPDATE `Book` SET `price` = 150000 WHERE `title` = "The Animator's Survival Kit"   AND `price` = 0;
UPDATE `Book` SET `price` = 85000  WHERE `title` = 'SQL in 10 Minutes'             AND `price` = 0;
