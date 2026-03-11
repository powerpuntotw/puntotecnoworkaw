import sys
import warnings
from appwrite.client import Client
from appwrite.services.databases import Databases

warnings.simplefilter('ignore')

API_KEY = 'standard_6655b4758f6786529a0611f2537bd0b9190a1ea8cb72e3bbacaa4db5ebb329ed508906e45914a97593c54249b5544fa0fa063ff5def690b8811a109638fbfc170c91fefd453a1557238bb338c6d488f0993e6b7051e2c6890f0ca73877a92282a39f16b0c164f6bf4ffeff133f689e62e421d6ba98d5bde58e424dc39e0215e4'
ENDPOINT = 'https://appwrite.tecnowork.mywire.org/v1'
PROJECT_ID = '69aed0bd000df45ebd3a'
DATABASE_ID = 'main_db'

client = Client()
client.set_endpoint(ENDPOINT)
client.set_project(PROJECT_ID)
client.set_key(API_KEY)

databases = Databases(client)

def add_phone():
    try:
        print("Añadiendo atributo 'phone' a la colección 'users'...")
        databases.create_string_attribute(DATABASE_ID, 'users', 'phone', 20, False) # matches user request: name, phone, mail
        print("✅ Atributo 'phone' creado (opcional inicialmente).")
    except Exception as e:
        print(f"ℹ️ Atributo 'phone': {e}")

if __name__ == "__main__":
    add_phone()
