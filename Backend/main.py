from fastapi import FastAPI #highly optimized framework designed to handle web requests incredibly fast
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import stat
import os
import shutil
from langchain_community.document_loaders.generic import GenericLoader
from langchain_community.document_loaders.parsers.txt import TextParser
from git import Repo
from dotenv import load_dotenv
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from git import Repo

# OPTION A: Local Ollama 
from langchain_ollama import OllamaEmbeddings, OllamaLLM
embedding_model = OllamaEmbeddings(model="nomic-embed-text")
llm_model = OllamaLLM(model="llama3.2:latest")

# OPTION B: Cloud OpenAI 
# from langchain_openai import OpenAIEmbeddings, ChatOpenAI
# load_dotenv() # Loads the OPENAI_API_KEY from your .env file
# embedding_model = OpenAIEmbeddings(model="text-embedding-3-small")
# llm_model = ChatOpenAI(model="gpt-4o-mini", temperature=0)

app = FastAPI() #activates the framework. app is the traffic cop that sits and listens for any incoming requests 

# Define the data structure expected from the React frontend
class RepoInput(BaseModel): 
    repo_url: str       # The input field must contain a string URL

class QueryInput(BaseModel):
    query: str

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
    return {"message": "Online and ready to process GitHub repositories!"}

@app.post("/api/process-repo") 
def process_repository(data: RepoInput):
    # Remove any accidental leading/trailing spaces from the incoming URL
    url = data.repo_url.strip()
    
    if not url.startswith("https://github.com/"):
        return {"status": "error", "message": "Invalid URL. Must be a GitHub link."}
    
    #Path where the repository will be cloned temporarily on the server
    local_path = "./Backend/temp_repo"  # or direct temp folder
    persist_directory = "./chroma_db" # Folder where Chroma will save the vectors
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
        print(f"📦 Loaded {len(docs)} files.")

        # Filter out test, build, and node_modules folders
        ignore_keywords = ["/test", "/tests", "test_", "_test", "node_modules", "/dist/", "/build/", "/.git/"]
        filtered_docs = [
            doc for doc in docs 
            if not any(kw in doc.metadata.get("source", "").lower().replace("\\", "/") for kw in ignore_keywords)
        ]
        print(f"📦 Kept {len(filtered_docs)} production files after filtering.")

        # We use a smaller chunk size for code so functions remain contained together
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000, 
            chunk_overlap=200)

        split_docs = text_splitter.split_documents(filtered_docs)
        print(f"✂️ Split into {len(split_docs)} unique code fragments.")

        # 3. Vectorize and save into local ChromaDB storage
        print("🧠 Generating embeddings and building vector index...")

        # Reset old ChromaDB vector store
        if os.path.exists(persist_directory):
            shutil.rmtree(persist_directory, onerror=remove_readonly)

        vector_db = Chroma.from_documents(
            documents=split_docs,
            embedding=embedding_model,
            persist_directory=persist_directory
        )

        # Clean up the folder to save space
        shutil.rmtree(local_path, onerror=remove_readonly)
        
        return {
            "status": "success",
            "message": f"Success! Indexed {len(split_docs)} code fragments into the knowledge base."
        }
        
    except Exception as e:
        # Ensure the temporary folder is deleted if a crash happens during download/parse
        if os.path.exists(local_path):
            shutil.rmtree(local_path, onerror=remove_readonly)
        print(f"❌ Error: {str(e)}")
        return {"status": "error", "message": f"Failed to process repository: {str(e)}"}
    
@app.post("/query")
def query_knowledge_base(data: QueryInput):
    query_text = data.query.strip()
    
    if not os.path.exists("./chroma_db"):
        return {"status": "error", "message": "Knowledge base is empty. Please process a repository first."}
        
    try:
        # Load the existing database index from disk
        db = Chroma(
            persist_directory="./chroma_db",
            embedding_function=embedding_model
        )
        
        #Perform similarity search
        results = db.similarity_search(query_text, k=3)
        
        # Format the retrieved snippets cleanly for display
        retrieved_code = []
        context_blocks = []
        for doc in results:
            source = doc.metadata.get("source", "Unknown")
            content = doc.page_content
            retrieved_code.append({"source": source, "content": content})
            context_blocks.append(f"--- File: {source} ---\n{content}")
            
        context_str = "\n\n".join(context_blocks)
        
        prompt = f"""You are an expert software engineer assistant.
        Answer the user's question using ONLY the context code snippets provided below.
        If the snippets do not contain enough information to answer, state clearly what is found in the codebase.

        Context Snippets:
        {context_str}
        User Question: {query_text}
        Answer:"""

        ai_response = llm_model.invoke(prompt)

        return {
            "status": "success",
            "answer": ai_response,
            "matches": retrieved_code
        }
        
    except Exception as e:
        return {"status": "error", "message": f"Query failed: {str(e)}"}