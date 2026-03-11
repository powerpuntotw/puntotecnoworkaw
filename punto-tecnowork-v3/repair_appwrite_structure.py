import sys
import warnings
from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.services.storage import Storage

warnings.simplefilter('ignore')

# Use the API Key found in the local repo
API_KEY = 'standard_cb9cd72c318679496dbb5fdfcd6ae17e60933f60c8f485f833f2e93108053e15c11c51cb3d7ccb27325db3234239787bf9a30deb6fa5d3c55a553b1373302f313bc9e43d5489c8bb29c0a076e54eb4cec0ea016c4113d0f17b3786c528a46114eba8bd150ab477b6accea228a3270e55ed2a992540bbd30e5f000a75bc0919f9'
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
    print("--- Iniciando Reparación Estructural ---")
    
    # 1. Bucket branding
    try:
        print("Verificando Bucket 'branding'...")
        storage.create_bucket('branding', 'Branding (Logos)', permissions=['read("any")', 'create("any")', 'update("any")', 'delete("any")'])
        print("✅ Bucket 'branding' creado con permisos públicos.")
    except Exception as e:
        print(f"ℹ️ Bucket 'branding': {e}")

    # 2. Coleccion system_config
    try:
        print("Verificando Colección 'system_config'...")
        databases.create_collection(DATABASE_ID, 'system_config', 'Configuración del Sistema', permissions=['read("any")', 'create("any")', 'update("any")', 'delete("any")'])
        print("✅ Colección 'system_config' creada con permisos públicos.")
        
        print("Añadiendo atributos a 'system_config'...")
        databases.create_string_attribute(DATABASE_ID, 'system_config', 'type', 50, True)
        databases.create_string_attribute(DATABASE_ID, 'system_config', 'data', 5000, True)
        print("✅ Atributos 'type' y 'data' creados.")
    except Exception as e:
        print(f"ℹ️ Colección 'system_config': {e}")

    # 3. Bucket orders_files (asegurar)
    try:
        print("Verificando Bucket 'orders_files'...")
        storage.create_bucket('orders_files', 'Archivos de Impresion', permissions=['read("any")', 'create("any")', 'update("any")', 'delete("any")'])
        print("✅ Bucket 'orders_files' asegurado.")
    except Exception as e:
        print(f"ℹ️ Bucket 'orders_files': {e}")

    print("--- Reparación Finalizada ---")

if __name__ == "__main__":
    repair()
