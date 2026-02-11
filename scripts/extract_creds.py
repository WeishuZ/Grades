from dotenv import load_dotenv
import os
import json

load_dotenv('/home/wes/GradeView/.env')
creds = os.getenv('SERVICE_ACCOUNT_CREDENTIALS')
if creds:
    try:
        data = json.loads(creds)
        with open('/home/wes/GradeView/secrets/google-credentials.json', 'w') as f:
            json.dump(data, f, indent=2)
        print("Successfully wrote credentials.")
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}")
        # It might be that the string in .env is literally '{"..."}' including the quotes if not parsed correctly?
        # But python-dotenv should handle '...' wrapping.
else:
    print("SERVICE_ACCOUNT_CREDENTIALS not found.")
