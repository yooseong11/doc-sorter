### 가상환경 실행

```
python3 -m venv .venv
source .venv/bin/activate
```

### 서버 실행
```
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```