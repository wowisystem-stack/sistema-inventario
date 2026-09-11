import sys
import os
sys.path.append(os.path.dirname(__file__))

from database import SessionLocal
from models import User, RoleEnum

db = SessionLocal()
users = db.query(User).filter(User.full_name.like('%Felipe%')).all()

if users:
    for user in users:
        print(f"Updating {user.full_name} from {user.role.value} to encargado")
        user.role = RoleEnum.ENCARGADO
    db.commit()
    print("Done")
else:
    print("No user named Felipe found")
db.close()
