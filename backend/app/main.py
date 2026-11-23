from fastapi import FastAPI

app = FastAPI()

@app.get("/health")
def check_health():
    return {
        "status" : "ok"
    }


@app.post("/api/classify")
def classify():
    return {"category": "미분류", "quote": ""}
