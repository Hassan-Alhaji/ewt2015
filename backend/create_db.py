import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def try_connect_and_create():
    passwords = ['', 'postgres', 'admin', '123456']
    conn = None
    success_pw = None
    
    for pw in passwords:
        try:
            print(f"Trying connection to PostgreSQL with password: '{pw}'...")
            conn = psycopg2.connect(
                dbname='postgres',
                user='postgres',
                password=pw,
                host='localhost',
                port='5432'
            )
            success_pw = pw
            print("Successfully connected!")
            break
        except Exception as e:
            print(f"Failed with password '{pw}': {e}")
            
    if conn is None:
        print("Could not connect to PostgreSQL with any default credentials.")
        return False, None
        
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT 1 FROM pg_database WHERE datname='ewt_db'")
        exists = cursor.fetchone()
        if not exists:
            cursor.execute("CREATE DATABASE ewt_db")
            print("Database 'ewt_db' created successfully.")
        else:
            print("Database 'ewt_db' already exists.")
        return True, success_pw
    except Exception as e:
        print(f"Error creating database: {e}")
        return False, None
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    success, pw = try_connect_and_create()
    if success:
        with open('c:\\Users\\al3re\\OneDrive\\Documents\\Python\\EWT2015\\backend\\.db_pw', 'w') as f:
            f.write(pw)
        print(f"Saved successful password to .db_pw")
    else:
        print("Failed to setup PostgreSQL database. Fallback to SQLite will be used.")
