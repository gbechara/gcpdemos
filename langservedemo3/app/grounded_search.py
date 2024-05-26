from langchain.chains import RetrievalQA
from langchain.chains import RetrievalQAWithSourcesChain
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferMemory
from langchain.prompts import PromptTemplate
from langchain.prompts import ChatPromptTemplate

from langchain_google_vertexai import VertexAI
from langchain_google_community import VertexAISearchRetriever
from langchain_google_community import VertexAIMultiTurnSearchRetriever

from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain


# RAG prompt
#from langchain import hub
#prompt = hub.pull("rlm/rag-prompt", api_url="https://api.hub.langchain.com")

#rag_prompt= """
#{typescript_string}
#{{context}}
#{{question}}
#"""

#rag_prompt = rag_prompt.format(typescript_string="Rewrite the bullet points in a full text.")
#def set_rag_prompt():
 #   return PromptTemplate(template=rag_prompt, input_variables=['typescript_string', 'context', 'question'])
#qa_prompt = set_rag_prompt()

llm = VertexAI(model_name="gemini-1.5-flash-preview-0514")

retriever = VertexAISearchRetriever(
    project_id="gab-devops-1",
    location_id="global",
    data_store_id="my-datastore-1_1714069761495",
    get_extractive_answers=True,
    max_documents=10,
    max_extractive_segment_count=1,
    max_extractive_answer_count=5,
)

search_query = "What was Alphabet's Revenue in Q2 2023?"  # @param {type:"string"}

retrieval_qa = RetrievalQA.from_chain_type(
    llm=llm, chain_type="stuff", retriever=retriever
)

retrieval_qa.invoke(search_query)

print('line 55:')
print(retrieval_qa.invoke(search_query))

#retrieval_qa_chain = RetrievalQA.from_chain_type(
#    llm=llm, retriever=retriever, chain_type_kwargs={"prompt": prompt}
#)
basic_prompt = PromptTemplate(input_variables=["foo"], template="Context: {context} Question: {question} Answer:""")

retrieval_qa_chain = RetrievalQA.from_chain_type(
    llm=llm, chain_type='stuff', return_source_documents=True, retriever=retriever, chain_type_kwargs={"prompt": basic_prompt}
)

print('line 67:')
print(retrieval_qa_chain({"query": search_query }, return_only_outputs=True))

#chain =  conversational_retrieval
#chain = retrieval_qa_chain

# BaseRetrievalQA Deprecated using create_retrieval_chain 
# https://api.python.langchain.com/en/latest/chains/langchain.chains.retrieval_qa.base.RetrievalQA.html
system_prompt = (
    "Use the given context to answer the question. "
    "If you don't know the answer, say you don't know. "
    "Use three sentence maximum and keep the answer concise. "
    "Context: {context}"
)
prompt = ChatPromptTemplate.from_messages(
    [
        ("system", system_prompt),
        ("user", "{input}"),
    ]
)
question_answer_chain = create_stuff_documents_chain(llm, prompt)
chain = create_retrieval_chain(retriever, question_answer_chain)

print('line 90:')
print(chain.invoke({"input": search_query}))
