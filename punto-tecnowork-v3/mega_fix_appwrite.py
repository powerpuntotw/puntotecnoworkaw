import os
import warnings
from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.services.storage import Storage
from appwrite.permission import Permission
from appwrite.role import Role

warnings.simplefilter('ignore')

# Config from .env.local / final_repair.py
API_KEY = 'standard_6655b4758f6786529a0611f2537bd0b9190a1ea8cb72e3bbacaa4db5ebb329ed508906e45914a97593c54249b5544fa0fa063ff5def690b8811a109638fbfc170c91fefd453a1557238bb338c6d488f0993e6b7051e2c6890f0ca73877a92282a39f16b0c164f6bf4ffeff133f689e62e421d6ba98d5bde58e424dc39e0215e4'
ENDPOINT = 'https://appwrite.tecnowork.mywire.org/v1'
PROJECT_ID = '69aed0bd000df45ebd3a'
DATABASE_ID = 'main_db'

client = Client()
client.set_endpoint(ENDPOINT)
client.set_project(PROJECT_ID)
client.set_key(API_KEY)

databases = Databases(client)
storage = Storage(client)

# Permissions for all (standard for this project development phase)
perms = [
    Permission.read(Role.any()),
    Permission.create(Role.any()),
    Permission.update(Role.any()),
    Permission.delete(Role.any()),
]

def create_attr_if_not_exists(coll, key, type, size=255, required=False, default=None, array=False):
    try:
        if type == 'string':
            databases.create_string_attribute(DATABASE_ID, coll, key, size, required, default, array)
        elif type == 'int':
            databases.create_integer_attribute(DATABASE_ID, coll, key, required, 0, 1000000, default, array)
        elif type == 'bool':
            databases.create_boolean_attribute(DATABASE_ID, coll, key, required, default, array)
        elif type == 'float':
            databases.create_float_attribute(DATABASE_ID, coll, key, required, 0.0, 1000000.0, default, array)
        print(f"  [+] Atributo '{key}' en '{coll}' creado.")
    except Exception as e:
        if 'already' in str(e).lower():
            print(f"  [.] Atributo '{key}' ya existe.")
        else:
            print(f"  [!] Error en '{key}': {e}")

def run_setup():
    print("--- MEGA REPARACIÓN DE INFRAESTRUCTURA PUNTO TECNOWORK V3 ---")
    
    collections = {
        'users': [
            ('full_name', 'string', 255, False),
            ('email', 'string', 255, True),
            ('phone', 'string', 50, False),
            ('points', 'int', None, False, 0),
            ('user_type', 'string', 20, False, 'client'),
            ('tier', 'string', 20, False, 'Bronze'),
            ('auth_id', 'string', 100, False),
            ('is_active', 'bool', None, False, True),
            ('last_sync', 'string', 100, False)
        ],
        'rewards': [
            ('name', 'string', 255, True),
            ('category', 'string', 100, False),
            ('description', 'string', 5000, False),
            ('points_required', 'int', None, True),
            ('stock', 'int', None, False, 0),
            ('is_visible', 'bool', None, False, True),
            ('image_id', 'string', 100, False),
            ('is_active', 'bool', None, False, True)
        ],
        'redeems': [
            ('client_id', 'string', 100, True),
            ('client_name', 'string', 255, False),
            ('reward_id', 'string', 100, True),
            ('reward_name', 'string', 255, False),
            ('points_cost', 'int', None, True),
            ('status', 'string', 50, False, 'pendiente'),
            ('code', 'string', 50, False)
        ],
        'points_history': [
            ('client_id', 'string', 100, True),
            ('type', 'string', 20, True),
            ('amount', 'int', None, True),
            ('reason', 'string', 1000, False)
        ],
        'tickets': [
            ('client_id', 'string', 100, True),
            ('client_name', 'string', 255, False),
            ('subject', 'string', 1000, True),
            ('status', 'string', 50, False, 'open')
        ],
        'messages': [
            ('ticket_id', 'string', 100, True),
            ('sender_id', 'string', 100, True),
            ('sender_name', 'string', 255, False),
            ('content', 'string', 10000, True),
            ('role', 'string', 50, False, 'client')
        ],
        'orders': [
            ('client_id', 'string', 100, True),
            ('location_id', 'string', 100, True),
            ('unit_price', 'float', None, False, 0.0),
            ('total_price', 'float', None, False, 0.0),
            ('copies', 'int', None, False, 1),
            ('status', 'string', 50, False, 'pendiente'),
            ('order_number', 'string', 100, False),
            ('color_mode', 'string', 20, False, 'bw'),
            ('points_earned', 'int', None, False, 0)
        ],
        'printing_locations': [
            ('name', 'string', 255, True),
            ('address', 'string', 1000, True),
            ('phone', 'string', 50, False),
            ('email', 'string', 255, False),
            ('status', 'string', 20, False, 'activo'),
            ('is_open', 'bool', None, False, True),
            ('has_color_printing', 'bool', None, False, True),
            ('has_fotoya', 'bool', None, False, False),
            ('allow_custom_prices', 'bool', None, False, False),
            ('manager_id', 'string', 100, False),
            ('is_active', 'bool', None, False, True)
        ],
        'system_config': [
            ('type', 'string', 100, True),
            ('data', 'string', 15000, False)
        ],
        'audit_logs': [
            ('admin_name', 'string', 255, True),
            ('action', 'string', 100, True),
            ('description', 'string', 10000, False)
        ]
    }

    buckets = ['branding', 'orders_files', 'rewards', 'orders']

    # 1. Database
    try:
        databases.get(DATABASE_ID)
        print(f"[*] Base de datos '{DATABASE_ID}' detectada.")
    except:
        print(f"[+] Creando base de datos '{DATABASE_ID}'...")
        databases.create(DATABASE_ID, 'Punto Tecnowork DB')

    # 2. Collections
    for coll_id, attrs in collections.items():
        try:
            databases.get_collection(DATABASE_ID, coll_id)
            print(f"[*] Colección '{coll_id}' ya existe.")
        except:
            print(f"[+] Creando colección '{coll_id}'...")
            databases.create_collection(DATABASE_ID, coll_id, coll_id, permissions=perms)
        
        for attr in attrs:
            create_attr_if_not_exists(coll_id, *attr)

    # 3. Storage
    for buck_id in buckets:
        try:
            storage.get_bucket(buck_id)
            print(f"[*] Bucket '{buck_id}' ya existe.")
        except:
            print(f"[+] Creando bucket '{buck_id}'...")
            storage.create_bucket(buck_id, buck_id, permissions=perms, file_security=False)

    print("\n--- INFRAESTRUCTURA SINCRONIZADA ---")

if __name__ == "__main__":
    run_setup()
