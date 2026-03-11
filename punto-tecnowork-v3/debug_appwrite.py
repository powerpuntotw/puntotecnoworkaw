from appwrite.client import Client
from appwrite.services.databases import Databases

project_id = '67cc4b7a00188989505f'
endpoint = 'https://cloud.appwrite.io/v1'
api_key = '6655b4758f6786529a0611f2537bd0b9190a1ea8cb72e3bbacaa4db5ebb329ed508906e45914a97593c54249b5544fa0fa063ff5def690b8811a109638fbfc170c91fefd453a1557238bb338c6d488f0993e6b7051e2c6890f0ca73877a92282a39f16b0c164f6bf4ffeff133f689e62e421d6ba98d5bde58e424dc39e0215e4'

client = Client()
client.set_endpoint(endpoint)
client.set_project(project_id)
client.set_key(api_key)

databases = Databases(client)

try:
    dbs = databases.list()
    print("Databases found:")
    for db in dbs['databases']:
        print(f"- {db['name']} (ID: {db['$id']})")
except Exception as e:
    print(f"Error: {e}")
