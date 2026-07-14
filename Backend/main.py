from fastapi import FastAPI #highly optimized framework designed to handle web requests incredibly fast
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import stat
import os
import shutil
from langchain_community.document_loaders.generic import GenericLoader
from langchain_community.document_loaders.parsers.txt import TextParser
from git import Repo

app = FastAPI() #activates the framework. app is the traffic cop that sits and listens for any incoming requests 

# Define the data structure expected from the React frontend
class RepoInput(BaseModel): 
    repo_url: str       # The input field must contain a string URL

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

def remove_readonly(func, path, excinfo):
    os.chmod(path, stat.S_IWRITE)
    func(path)

@app.get("/")
def read_root():
    return {"message": "plj werk"}

@app.post("/api/process-repo")
def process_repository(data: RepoInput):
    # Remove any accidental leading/trailing spaces from the incoming URL
    url = data.repo_url.strip()
    
    if not url.startswith("https://github.com/"):
        return {"status": "error", "message": "Invalid URL. Must be a GitHub link."}
    
    #Path where the repository will be cloned temporarily on the server
    local_path = "./temp_repo"
    # Clear out the folder if it exists from an old run
    if os.path.exists(local_path):
        shutil.rmtree(local_path, onerror=remove_readonly)
        
    try:
        print(f"📥 Cloning repository: {url}...")
        #Trigger GitPython to download the codebase into our local path
        Repo.clone_from(url, local_path)
        
        # Configure LangChain's filesystem loader to target and extract specific code structures
        loader = GenericLoader.from_filesystem(
            local_path,
            glob="**/*",                                        # Recursively search all folders and subfolders
            suffixes=[".py", ".js", ".jsx", ".ts", ".tsx"],     # Filter for code files only
            parser=TextParser()                             # Smart parser to identify syntax blocks (classes/methods)
        )
        docs = loader.load()
        print(f"✅ Successfully loaded {len(docs)} code files!")
        
        # Clean up the folder to save space
        shutil.rmtree(local_path, onerror=remove_readonly)
        
        return {
            "status": "success",
            "message": f"Successfully parsed repository! Found {len(docs)} code files."
        }
        
    except Exception as e:
        # Ensure the temporary folder is deleted if a crash happens during download/parse
        if os.path.exists(local_path):
            shutil.rmtree(local_path)
        print(f"❌ Error: {str(e)}")
        return {"status": "error", "message": f"Failed to process repository: {str(e)}"}