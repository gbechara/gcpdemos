from langchain.chains import RetrievalQA
from langchain.chains import RetrievalQAWithSourcesChain
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferMemory
from langchain.prompts import PromptTemplate
from langchain.prompts import ChatPromptTemplate

from langchain_google_vertexai import VertexAI
from langchain_google_community import VertexAIMultiTurnSearchRetriever

from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain

llm = VertexAI(model_name="gemini-1.5-flash-preview-0514")

multi_turn_retriever = VertexAIMultiTurnSearchRetriever(
    project_id="gab-devops-1",
    location_id="global",
    data_store_id="my-datastore-1_1714069761495",
    max_documents=10,
    max_extractive_segment_count=1,
    max_extractive_answer_count=5,
)

memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)
conversational_retrieval = ConversationalRetrievalChain.from_llm(
    llm=llm, retriever=multi_turn_retriever, memory=memory
)

chain =  conversational_retrieval
