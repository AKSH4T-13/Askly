import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

print("API key loaded =", api_key is not None)

client = genai.Client(api_key=api_key)

response = client.models.generate_content(
    model="gemini-3.7-flash",
    contents="Say hello in one sentence."
)

print(response.text)