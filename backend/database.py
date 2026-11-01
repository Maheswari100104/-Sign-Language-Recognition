
import os
import pymysql

DB_HOST = "localhost"
DB_PORT = 3306
DB_NAME = "dsignora_db"
DB_USER = os.getenv("DSIGNORA_DB_USER", "root")
DB_PASSWORD = os.getenv("DSIGNORA_DB_PASSWORD", "")


def get_connection():
    return pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False,
    )


def initialize_database():
    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    full_name VARCHAR(120) NOT NULL,
                    email VARCHAR(255) NOT NULL UNIQUE,
                    password_hash VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS translation_history (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    original_text TEXT NOT NULL,
                    corrected_text TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id)
                        REFERENCES users(id)
                        ON DELETE CASCADE
                ) ENGINE=InnoDB
            """)

        connection.commit()
        print("DSignora AI database tables created successfully.")

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


if __name__ == "__main__":
    initialize_database()
