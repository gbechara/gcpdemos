from langchain.chains import RetrievalQA
from langchain.chains import RetrievalQAWithSourcesChain
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferMemory
from langchain.prompts import PromptTemplate
from langchain.prompts import ChatPromptTemplate
from langchain.agents import AgentExecutor

from langchain_google_vertexai import ChatVertexAI
from langchain.agents import AgentExecutor
from langchain.agents.format_scratchpad.tools import format_to_tool_messages
from langchain.agents.output_parsers.tools import ToolsAgentOutputParser
from langchain.tools.base import StructuredTool
from langchain_core import prompts



from langchain_google_vertexai import VertexAI
from langchain_google_community import VertexAISearchRetriever
from langchain_google_community import VertexAIMultiTurnSearchRetriever

import vertexai

from vertexai.preview import reasoning_engines

from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain import agents


# Notebook here: 
# https://github.com/GoogleCloudPlatform/generative-ai/blob/main/gemini/reasoning-engine/intro_reasoning_engine.ipynb
# Examples here:
# https://cloud.google.com/vertex-ai/generative-ai/docs/reasoning-engine/customize
# https://cloud.google.com/vertex-ai/generative-ai/docs/reference/python/latest/vertexai.preview.reasoning_engines.LangchainAgent
# https://www.googlecloudcommunity.com/gc/Community-Blogs/Building-and-Deploying-AI-Agents-with-LangChain-on-Vertex-AI/ba-p/748929

#llm = VertexAI(model_name="gemini-1.5-flash-preview-0514", model_kwargs=model_kwargs)
#model = model_builder(model_name="gemini-1.5-flash-preview-0514", model_kwargs=model_kwargs)

llm = ChatVertexAI(model_name="gemini-1.5-pro-001")

def search_documents(query:str):
    """Searches a vector database for snippets in relevant documents"""
    from langchain_google_community import VertexAISearchRetriever
    retriever = VertexAISearchRetriever(
        project_id="gab-devops-1",
        location_id="global",
        data_store_id="my-datastore-1_1714069761495",
        max_documents=100,
    )
    result = str(retriever.invoke(query))
    return result


def get_exchange_rate(
    currency_from: str = "USD",
    currency_to: str = "EUR",
    currency_date: str = "latest",
):
    """Retrieves the exchange rate between two currencies on a specified date."""
    import requests

    response = requests.get(
        f"https://api.frankfurter.app/{currency_date}",
        params={"from": currency_from, "to": currency_to},
    )
    return response.json()


print(get_exchange_rate(currency_from="USD", currency_to="SEK"))

agent = reasoning_engines.LangchainAgent(
    model="gemini-1.5-pro-001",
    tools=[search_documents,get_exchange_rate],
    agent_executor_kwargs={"return_intermediate_steps": True},
)

print("agent")
print(agent.query(input="What's the exchange rate from US dollars to Swedish currency today?"))

vertexai.init(project="gab-devops-1", location="us-central1", staging_bucket="gs://gab-devops-1vertex_staging_bucket")

#remote_agent = reasoning_engines.ReasoningEngine.create(
#    agent,
#    requirements=[
#        "google-cloud-aiplatform[langchain,reasoningengine]",
#        "langchain-google-vertexai",
#        "cloudpickle==3.0.0",
#        "pydantic==2.7.4",
#        "requests",
#    ],
#)

#remote_agent = reasoning_engines.ReasoningEngine.create(
#    agent,
#    requirements=[
#        "google-cloud-aiplatform==1.51.0",
#        "langchain==0.1.20",
#        "langchain-google-vertexai==1.0.3",
#        "cloudpickle==2.2.1",
#        "pydantic==2.7.1",
#        "langchain_google_community",
#        "google-cloud-discoveryengine",
#        "google-cloud-bigquery",
#        "requests",
#        "pandas",
#    ],
#)

# pip install --upgrade --quiet google-cloud-aiplatform==1.51.0 langchain==0.1.20 langchain-google-vertexai==1.0.3 cloudpickle==3.0.0 pydantic==2.7.1 requests
remote_agent = reasoning_engines.ReasoningEngine.create(
    reasoning_engines.LangchainAgent(
        model="gemini-1.5-pro-001",
        tools=[search_documents,get_exchange_rate],
        agent_executor_kwargs={"return_intermediate_steps": True},
        ),
    requirements=[
        "google-cloud-aiplatform==1.51.0",
        "langchain==0.1.20",
        "langchain-google-vertexai==1.0.3",
        "cloudpickle==3.0.0",
        "pydantic==2.7.1",
        "google-cloud-discoveryengine",
        "requests",
        "fastapi>=0.1",
        "uvicorn>=0.27",
        "langchain_google_community",
        "langserve",
        "sse_starlette",
        "poetry",
    ],
    sys_version="3.10",
)






remote_agent_path = remote_agent.resource_name
remote_agent = reasoning_engines.ReasoningEngine(remote_agent_path)

print("remote_agent")
print(remote_agent.query(input="What's the exchange rate from US dollars to Swedish currency today?"))
