"""Groq connectivity smoke check; never prints credentials."""
import asyncio
from backend.main import complete

if __name__ == '__main__':
    print(asyncio.run(complete([{'role':'user','content':'Say hello in one short sentence.'}])))
