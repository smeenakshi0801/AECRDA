from fastapi import FastAPI #highly optimized framework designed to handle web requests incredibly fast

app = FastAPI() #activates the framework. app is the traffic cop that sits and listens for any incoming requests  

@app.get("/") 
def read_root():
    return {"status": "Hello Varushini", "project": "Hee Hee"}