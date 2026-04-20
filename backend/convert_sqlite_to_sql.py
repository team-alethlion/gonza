import sqlite3
import re

def convert_for_postgres(sqlite_file, output_sql_file):
    conn = sqlite3.connect(sqlite_file)
    with open(output_sql_file, 'w') as f:
        f.write("DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;\n")
        f.write("BEGIN;\n")
        
        for line in conn.iterdump():
            if line.startswith('BEGIN TRANSACTION') or line.startswith('COMMIT'):
                continue
            if 'sqlite_sequence' in line:
                continue

            # 1. Fix Datetime
            line = line.replace('datetime', 'timestamp')

            # 2. Remove JSON_VALID check
            # We also strip trailing spaces to help with comma cleanup
            line = re.sub(r'CHECK\s*\(\s*\(?JSON_VALID\(.*?\)\)?.*?\)', '', line, flags=re.IGNORECASE).strip()

            # 3. Fix Serial / Auto-increment
            line = line.replace('PRIMARY KEY AUTOINCREMENT', 'PRIMARY KEY')
            line = re.sub(r'INTEGER\s+PRIMARY\s+KEY', 'SERIAL PRIMARY KEY', line, flags=re.IGNORECASE)

            # 4. FIX THE COMMA ERROR
            # If we deleted a CHECK at the end of a line, we might have ", )"
            # This regex looks for a comma followed by optional space and a closing parenthesis
            line = re.sub(r',\s*\)', ' )', line)
            
            # If the CHECK was in the middle, we might have ", ,"
            line = line.replace(', ,', ',')
                
            f.write(line + '\n')
            
        f.write("COMMIT;\n")
    conn.close()
    print("Conversion complete. Fixed trailing commas and JSON syntax.")

convert_for_postgres('db.sqlite3', '../backup/converted_data.sql')