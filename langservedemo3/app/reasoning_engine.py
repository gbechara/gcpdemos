from langchain.chains import RetrievalQA
from langchain.chains import RetrievalQAWithSourcesChain
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferMemory
from langchain.prompts import PromptTemplate
from langchain.prompts import ChatPromptTemplate
from langchain.agents import AgentExecutor, create_tool_calling_agent




#from langchain.agents import tool
#from langchain.agents import Tool
from langchain.pydantic_v1 import BaseModel, Field
from langchain.tools import BaseTool, StructuredTool, tool
from langchain.agents.output_parsers import ReActSingleInputOutputParser
from langchain_core.prompts import MessagesPlaceholder



from langchain_google_vertexai import ChatVertexAI
from langchain.agents import AgentExecutor
from langchain.agents.format_scratchpad.tools import format_to_tool_messages
from langchain.agents.format_scratchpad import format_log_to_str
from langchain.agents.output_parsers.tools import ToolsAgentOutputParser
from langchain.tools.base import StructuredTool
from langchain_core import prompts



from langchain_google_vertexai import VertexAI
from langchain_google_community import VertexAISearchRetriever
from langchain_google_community import VertexAIMultiTurnSearchRetriever

import vertexai

from vertexai.preview import reasoning_engines
from vertexai.preview.generative_models import (
    FunctionDeclaration,
    GenerativeModel,
    Tool,
    ToolConfig,
)


from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain import agents
from langchain import hub
from langchain.tools.render import render_text_description

# Notebook here: 
# https://github.com/GoogleCloudPlatform/generative-ai/blob/main/gemini/reasoning-engine/intro_reasoning_engine.ipynb
# Examples here:
# https://cloud.google.com/vertex-ai/generative-ai/docs/reasoning-engine/customize
# https://cloud.google.com/vertex-ai/generative-ai/docs/reference/python/latest/vertexai.preview.reasoning_engines.LangchainAgent
# https://www.googlecloudcommunity.com/gc/Community-Blogs/Building-and-Deploying-AI-Agents-with-LangChain-on-Vertex-AI/ba-p/748929

#llm = VertexAI(model_name="gemini-1.5-flash-preview-0514", model_kwargs=model_kwargs)
#model = model_builder(model_name="gemini-1.5-flash-preview-0514", model_kwargs=model_kwargs)

llm = ChatVertexAI(model_name="gemini-1.5-pro")

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

def search_internal_documents(query:str)->str:
    """Search for documents in a Vertex AI Search data store that contains
    content from the Google Store website. Users can ask questions about 
    Alphabet's Revenue.
    
    Args:
        query (str): A document search query to help answer the user's question.

    Returns:
        str: Results of the Vertex AI Search operation.
    """
    from langchain_google_community import VertexAISearchRetriever
    retriever = VertexAISearchRetriever(
        project_id="gab-devops-1",
        location_id="global",
        data_store_id="my-datastore-1_1714069761495",
        max_documents=100,
    )
    #retrieval_qa = RetrievalQA.from_chain_type(
    #    llm=llm, chain_type="stuff", retriever=retriever
    #)
    #result = retrieval_qa.invoke(question)
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
    model="gemini-1.5-pro",
    tools=[search_internal_documents,search_documents,get_exchange_rate],
    #tools=[search_documents,get_exchange_rate],
    #tools=[search_internal_documents],
    agent_executor_kwargs={"return_intermediate_steps": True},
)

#print("agent call converter :")
#print(agent.query(input="What's the exchange rate from US dollars to Swedish currency today?"))
#print("agent call qa on search :")
#print(agent.query(input="What was Alphabet's Revenue in Q2 2023?"))


prompt = {
            "input": lambda x: x["input"],
            "agent_scratchpad": (
                lambda x: format_to_tool_messages(x["intermediate_steps"])
            ),
        } | prompts.ChatPromptTemplate.from_messages([
            ("user", "{input}"),
            prompts.MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])

#tools=[search_documents, get_exchange_rate]
tools=[search_internal_documents, get_exchange_rate]
#tools = [
#    Tool.from_function(
#        func=search_internal_documents,
#        name="Search in vertex ai document store",
#        description="Search in vertex ai document store.",
#    ),
#]

agent_executor = agents.AgentExecutor(
    agent=prompt | llm.bind_tools(tools=tools) | ToolsAgentOutputParser(),
    tools=[StructuredTool.from_function(tool) for tool in tools], 
    verbose=True,
    tool_config=ToolConfig(
        function_calling_config=ToolConfig.FunctionCallingConfig(
            # ANY mode forces the model to predict a function call
            mode=ToolConfig.FunctionCallingConfig.Mode.ANY,
            # Allowed functions to call when the mode is ANY. If empty, any one of
            # the provided functions are called.
            #allowed_function_names=["get_current_weather"],
    )))

list(agent_executor.stream({"input": "what is the value of 1000 euros in gbp?"}))  
list(agent_executor.stream({"input": "What was Alphabet's Revenue in Q2 2023?"})) 