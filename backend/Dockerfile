FROM python:3.10-slim

WORKDIR /app

# Install system dependencies needed for compiling psycopg2 and running OpenCV headlessly
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all backend source code
COPY . /app/backend

# Set the pythonpath to search from /app to resolve imports correctly
ENV PYTHONPATH=/app

EXPOSE 8000

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
