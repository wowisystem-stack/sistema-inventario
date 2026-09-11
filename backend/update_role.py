import sqlite3

conn = sqlite3.connect('inventory.db')
cursor = conn.cursor()

# Get Felipe
cursor.execute("SELECT id, full_name, role FROM users WHERE full_name LIKE '%Felipe%'")
users = cursor.fetchall()
print("Found users:", users)

if users:
    for user in users:
        print(f"Updating user {user[1]} (id: {user[0]}) from {user[2]} to 'encargado'")
        cursor.execute("UPDATE users SET role = 'encargado' WHERE id = ?", (user[0],))
    conn.commit()
    print("Update successful.")
else:
    print("No user named Felipe found.")

conn.close()
