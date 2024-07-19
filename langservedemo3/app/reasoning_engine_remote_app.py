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

import json

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


# Notebook here: 
# https://github.com/GoogleCloudPlatform/generative-ai/blob/main/gemini/reasoning-engine/intro_reasoning_engine.ipynb
# Examples here:
# https://cloud.google.com/vertex-ai/generative-ai/docs/reasoning-engine/customize
# https://cloud.google.com/vertex-ai/generative-ai/docs/reference/python/latest/vertexai.preview.reasoning_engines.LangchainAgent
# https://www.googlecloudcommunity.com/gc/Community-Blogs/Building-and-Deploying-AI-Agents-with-LangChain-on-Vertex-AI/ba-p/748929
# https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/reasoning-engine 

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
        max_documents=10,
    )
    result = str(retriever.invoke(query))
    return result

def search_internal_documents(query:str) -> str:
    """Search for documents in a Vertex AI Search data store that contain content from Alphabet's revenue. 
    Users can ask questions about Alphabet's revenue.

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
        max_documents=10,
    )
    #retrieval_qa = RetrievalQA.from_chain_type(
    #    llm=llm, chain_type="stuff", retriever=retriever
    #)
    #result = retrieval_qa.invoke(question)
    #result = str(retriever.get_relevant_documents(query))
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




class LangchainApp:
    def __init__(self, project: str, location: str) -> None:
        self.project_id = project
        self.location = location

#    def set_up(self) -> None:
#        from langchain_core.prompts import ChatPromptTemplate
#        from langchain_google_vertexai import ChatVertexAI
#
#        system = (
#            "You are a helpful assistant that answers questions "
#            "about Alphabet and currency conversion."
#        )
#        human = "{text}"
#        prompt = ChatPromptTemplate.from_messages(
#            [("system", system), ("human", human)]
#        )
#        chat = ChatVertexAI(project=self.project_id, location=self.location)
#        self.chain = prompt | chat

    def set_up(self):
        from typing import List, Union

        from langchain.agents import AgentExecutor  # type: ignore
        from langchain.agents.format_scratchpad import (
            format_to_openai_function_messages,
        )
        from langchain.chains import LLMMathChain  # type: ignore
        from langchain.tools.base import StructuredTool

        from langchain_core.agents import (
            AgentAction,
            AgentActionMessageLog,
            AgentFinish,
        )
        from langchain_core.output_parsers import BaseOutputParser
        from langchain_core.outputs import ChatGeneration, Generation
        from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

        import langchain_google_vertexai

        #vertexai.init(project=self.project_id, location=self.location,)

        class _TestOutputParser(BaseOutputParser):
            def parse_result(
                self, result: List[Generation], *, partial: bool = False
            ) -> Union[AgentAction, AgentFinish]:
                if not isinstance(result[0], ChatGeneration):
                    raise ValueError(
                        "This output parser only works on ChatGeneration output"
                    )
                message = result[0].message
                function_call = message.additional_kwargs.get("function_call", {})
                if function_call:
                    function_name = function_call["name"]
                    tool_input = function_call.get("arguments", {})
                    tool_input = json.loads(tool_input)

                    content_msg = (
                        f"responded: {message.content}\n" if message.content else "\n"
                    )
                    log_msg = f"\nInvoking: `{function_name}` with `{tool_input}`\n{content_msg}\n"
                    return AgentActionMessageLog(
                        tool=function_name,
                        tool_input=tool_input,
                        log=log_msg,
                        message_log=[message],
                    )

                return AgentFinish(
                    return_values={"output": message.content}, log=str(message.content)
                )

            def parse(self, text: str) -> Union[AgentAction, AgentFinish]:
                raise ValueError("Can only parse messages")

        tools = [
            StructuredTool.from_function(search_documents),
            StructuredTool.from_function(search_internal_documents),
            StructuredTool.from_function(get_exchange_rate),
        ]
        prompt = ChatPromptTemplate.from_messages(
            [
                ("user", "{input}"),
                MessagesPlaceholder(variable_name="agent_scratchpad"),
            ]
        )
        llm = langchain_google_vertexai.chat_models.ChatVertexAI(
            #model_name="gemini-1.5-pro",
            model_name="gemini-1.5-flash",
            temperature=0.3,
        )

        agent = (
            {  # type: ignore
                "input": lambda x: x["input"],
                "agent_scratchpad": lambda x: format_to_openai_function_messages(
                    x["intermediate_steps"]
                ),
            }
            | prompt
            | llm.bind(functions=tools)
            | _TestOutputParser()
        )
        self.agent_executor = AgentExecutor(agent=agent, 
            tools=tools, 
            verbose=True, 
            tool_config=ToolConfig(
            function_calling_config=ToolConfig.FunctionCallingConfig(
                # ANY mode forces the model to predict a function call
                mode=ToolConfig.FunctionCallingConfig.Mode.ANY,
                # Allowed functions to call when the mode is ANY. If empty, any one of
                # the provided functions are called.
                #allowed_function_names=["get_current_weather"],
            )),
            return_intermediate_steps=True,
        )

    def query(self, query: str):
        return self.agent_executor.invoke({"input": query})


#print(get_exchange_rate(currency_from="USD", currency_to="SEK"))
#print(search_internal_documents("What was Alphabet's Revenue in Q2 2023?"))

#agent = reasoning_engines.LangchainAgent(
#    model="gemini-1.5-pro",
#    tools=[search_internal_documents, get_exchange_rate],
    #agent_executor_kwargs={"return_intermediate_steps": True},
#)

#print("agent call today:")
#print(agent.query(input="What's the exchange rate from US dollars to Swedish currency today?"))
#print(agent.query(input="What was Alphabet's Revenue in Q2 2023?"))

vertexai.init(project="gab-devops-1", location="us-central1", staging_bucket="gs://gab-devops-1vertex_staging_bucket")

print("initialize and call app:")
app = LangchainApp(project="gab-devops-1", location="us-central1")
app.set_up()


from langchain.globals import set_debug
#from langchain.globals import set_verbose

set_debug(True)
#set_verbose(True)


print("call app:")
print(app.query(query="What's the exchange rate from US dollars to Swedish currency today?"))
print(app.query(query="What was Alphabet's Revenue in Q2 2023?"))
print(app.query(query="Search in vertex ai document store for Alphabet's Revenue in Q2 2023?"))


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
    LangchainApp(project="gab-devops-1", location="us-central1"),
    #reasoning_engines.LangchainAgent(
    #    model="gemini-1.5-pro",
    #    tools=[search_internal_documents,get_exchange_rate],
        #agent_executor_kwargs={"return_intermediate_steps": True},
    #    ),
    #agent,
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
print(remote_agent.query(query="What's the exchange rate from US dollars to Swedish currency today?"))
print(remote_agent.query(query="What was Alphabet's Revenue in Q2 2023?"))
print(remote_agent.query(query="Search in vertex ai document store for Alphabet's Revenue in Q2 2023?"))
