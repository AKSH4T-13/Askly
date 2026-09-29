from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os

from langchain_community.document_loaders import WebBaseLoader
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_key = os.getenv("GEMINI_API_KEY")

print("API key loaded =", api_key is not None)
print("API key starts with =", api_key[:6] if api_key else None)

model = ChatGoogleGenerativeAI(
    model="gemini-3.6-flash",
    google_api_key=api_key
)

prompt = PromptTemplate(
    template="""
    Answer the user's question based only on the webpage content.

    Webpage content:
    {text}

    User question:
    {question}
    """,
    input_variables=["text", "question"]
)

parser = StrOutputParser()

chain = prompt | model | parser


class PageRequest(BaseModel):
    url: str
    question: str


@app.post("/ask")
def ask_page(request: PageRequest):

    loader = WebBaseLoader(request.url)

    docs = loader.load()

    page_text = docs[0].page_content

    answer = chain.invoke({
        "text": page_text,
        "question": request.question
    })

    return {
        "answer": answer
    }