import sys
import warnings
from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.services.storage import Storage
from appwrite.permission import Permission
from appwrite.role import Role

warnings.simplefilter('ignore')

# NEW API KEY PROVIDED BY USER
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

def repair():
    print("--- Iniciando Creación de Infraestructura con Nueva API Key ---")
    
    # Permissions for public access (read) and user management
    perms = [
        Permission.read(Role.any()),
        Permission.create(Role.any()),
        Permission.update(Role.any()),
        Permission.delete(Role.any()),
    ]

    # 1. Bucket branding
    try:
        print("Creando Bucket 'branding'...")
        storage.create_bucket('branding', 'Branding (Logos)', permissions=perms, file_security=False)
        print("✅ Bucket 'branding' creado.")
    except Exception as e:
        print(f"ℹ️ Bucket 'branding': {e}")

    # 2. Coleccion system_config
    try:
        print("Creando Colección 'system_config'...")
        databases.create_collection(DATABASE_ID, 'system_config', 'Configuración del Sistema', permissions=perms)
        print("✅ Colección 'system_config' creada.")
        
        print("Añadiendo atributos...")
        databases.create_string_attribute(DATABASE_ID, 'system_config', 'type', 50, True)
        databases.create_string_attribute(DATABASE_ID, 'system_config', 'data', 15000, True)
        print("✅ Atributos creados.")
    except Exception as e:
        print(f"ℹ️ Colección 'system_config': {e}")

    # 3. Bucket orders_files
    try:
        print("Asegurando Bucket 'orders_files'...")
        storage.create_bucket('orders_files', 'Archivos de Impresion', permissions=perms, file_security=False)
        print("✅ Bucket 'orders_files' listo.")
    except Exception as e:
        print(f"ℹ️ Bucket 'orders_files': {e}")

    print("--- Proceso Completado ---")

if __name__ == "__main__":
    repair()
