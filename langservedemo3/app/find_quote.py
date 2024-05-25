from langchain.prompts import PromptTemplate
from langchain.prompts import FewShotPromptTemplate

from langchain.prompts import ChatPromptTemplate
from langchain.prompts import FewShotChatMessagePromptTemplate

#from langchain_google_vertexai import ChatVertexAI
from langchain_google_vertexai import VertexAI

examples = [
    {
      "question": "Who is this quote from : Le talent sans genie est peu de chose. Le génie sans talent n'est rien !",
      "answer": "The quote  is form the wonderful and extraordinary Paul Valéry",
    },
    {
      "question": "Who is this quote from : on ne se baigne jamais deux fois dans le meme fleuve.",
      "answer": "The quote  is form the wonderful and extraordinary Heraclite d'Ephèse",
    },
]

#example_prompt = PromptTemplate(
#    input_variables=["question", "answer"], template="Question: {question}\n{answer}"
#)

example_prompt = ChatPromptTemplate.from_messages(
    [
        ("human", "{question}"),
        ("ai", "{answer}"),
    ]
)

#_prompt = FewShotPromptTemplate(
#    examples=examples,
#    example_prompt=example_prompt,
#    suffix="Question: {input}",
#    input_variables=["input"],
#)

few_shot_prompt = FewShotChatMessagePromptTemplate(
    example_prompt=example_prompt,
    examples=examples,
)

_prompt = ChatPromptTemplate.from_messages(
    [
 #       ("system", "You are a wondrous wizard of math."),
        few_shot_prompt,
        ("human", "{input}"),
    ]
)
#_model = ChatVertexAI()
#_model = VertexAI(model_name="text-bison")
_model = VertexAI(model_name="gemini-pro")

chain = _prompt | _model

#chain.invoke({"user_input": "on ne se baigne jamais deux fois dans le meme fleuve"})

