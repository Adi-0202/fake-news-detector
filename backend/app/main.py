from fastapi import FastAPI

app=FastAPI()

@app.get("/")
def health_check():
    return {"status":"online","message":"Fake news Detector API is running!"}