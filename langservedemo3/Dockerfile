FROM python:3.11-slim

RUN pip install poetry==1.6.1

# Install dependencies.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN poetry config virtualenvs.create false

WORKDIR /code

#ENV HOST 0.0.0.0

COPY ./pyproject.toml ./README.md ./poetry.lock* ./

COPY ./package[s] ./packages

RUN poetry install  --no-interaction --no-ansi --no-root
#RUN poetry install --with vertexaisearch

COPY ./app ./app

RUN poetry install --no-interaction --no-ansi

EXPOSE 8080

CMD exec uvicorn app.server:app --host 0.0.0.0 --port 8080
