import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from langserve import add_routes
# from vertexai_chuck_norris.chain import chain as vertexai_chuck_norris_chain
from app.find_quote import chain as find_quote_chain
from app.grounded_conversation import chain as grounded_search_chain
from app.grounded_search import retriever as retriever

from app.reasoning_engine import agent_executor as agent_executor
from typing import Any
from langchain.pydantic_v1 import BaseModel



# add current dir as first entry of path
sys.path.append(str(Path.cwd()))

# Create the FastAPI app

app = FastAPI()


@app.get("/")
async def redirect_root_to_docs():
    return RedirectResponse("/docs")



add_routes(app, find_quote_chain, path="/findquote")
add_routes(app, retriever, path="/groundedsearch")
add_routes(app, grounded_search_chain, path="/groundedconversation")

# https://github.com/langchain-ai/langserve/blob/main/examples/agent/server.py
# We need to add these input/output schemas because the current AgentExecutor
# is lacking in schemas.
class Input(BaseModel):
    input: str
class Output(BaseModel):
    output: Any
add_routes(app, agent_executor.with_types(input_type=Input, output_type=Output).with_config(
        {"run_name": "agent"}), path="/reasoningengine")


# https://github.com/langchain-ai/langchain/blob/master/templates/vertexai-chuck-norris/vertexai_chuck_norris/chain.py
# add_routes(app, vertexai_chuck_norris_chain, path="/vertexai-chuck-norris")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8080)


