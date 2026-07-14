from fastapi import FastAPI #highly optimized framework designed to handle web requests incredibly fast
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI() #activates the framework. app is the traffic cop that sits and listens for any incoming requests 

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,          # Allows only your React app to connect
    allow_credentials=True,
    allow_methods=["*"],            # Allows all actions (GET, POST, etc.)
    allow_headers=["*"],            # Allows all types of data headers
)

@app.get("/")
def read_root():
    return {"message": "SRMIST AECRDA Backend is running!"}