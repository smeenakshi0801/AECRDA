from fastapi import FastAPI #highly optimized framework designed to handle web requests incredibly fast
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI() #activates the framework. app is the traffic cop that sits and listens for any incoming requests 

class ProjectData(BaseModel):  #acts like a data filter. it ensures that the data coming from the frontend is in the correct format and structure. It also provides automatic validation and error handling for incoming data.
    user_input: str

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
    return {"message": "Test"}

@app.post("/api/send")
def handle_project_data(data: ProjectData):
    # This prints inside your VS Code Python terminal logs
    print(f"🔥 Successfully received data from frontend: {data.user_input}") 
    # This is what gets packaged and sent back to React
    return {
        "status": "success", 
        "echo": f"Backend received: {data.user_input}"
    }