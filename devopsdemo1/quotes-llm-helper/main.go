//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"context"
	"net/http"
	"time"
	"bytes"
	httpGoogle "google.golang.org/api/transport/http"
	"io"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/gin-gonic/gin"
	"github.com/itsjamie/gin-cors"
	"github.com/gin-gonic/contrib/static"
	 "cloud.google.com/go/vertexai/genai"
)

// JSON request from the Palm API
type Content struct {
	Content string `json:"content"`
}

type Message struct {
	Author string `json:"author"`
	Content string `json:"content"`
}

type Instances struct {
	Examples []Example `json:"examples"`
	Messages []Message `json:"messages"`
	Prompt string `json:"prompt"`
}

type InstancesTextBison struct {
	Prompt string `json:"prompt"`
}

type Example  struct {
	Input Input `json:"input"`
	Output Output `json:"output"`
}

type Input struct {
	Content string `json:"content"`
} 

type Output struct {
	Content string `json:"content"`
}

var defaultExamples = []Example { 
	Example{ 
		Input {"Who is this quote from : Le talent sans genie est peu de chose. Le génie sans talent n'est rien !"},
		Output {"The quote  is form the wonderful and extraordinary Paul Valéry"},
	},
	Example{ 
		Input {"Who is this quote from : on ne se baigne jamais deux fois dans le meme fleuve."},
		Output {"The quote  is form the wonderful and extraordinary Heraclite d'Ephèse"},
	},
}
type Parameters struct {
	Temperature     float64 `json:"temperature"`
	MaxOutputTokens int     `json:"maxOutputTokens"`
	TopP            float64 `json:"topP"`
	TopK            int     `json:"topK"`
}


type PalmRequestChatBison struct {
	Instances  []Instances   `json:"instances"`
	Parameters *Parameters `json:"parameters"`
}

type PalmRequestTextBison struct {
	InstancesTextBison  []InstancesTextBison   `json:"instances"`
	Parameters *Parameters `json:"parameters"`
}

/*type PalmRequest struct {
	Instances  []Content   `json:"instances"`
	Parameters *Parameters `json:"parameters"`
}*/

type Candidates  struct {
	Content string `json:"content"`
	Author string `json:"author"`
}

// JSON response from the Palm API
type PalmResponseChatBison struct {
	Predictions []struct {
		Candidates []Candidates  `json:"candidates"`
		SafetyAttributes []struct {
			Categories []string  `json:"categories"`
			Blocked    bool      `json:"blocked"`
			Scores     []float64 `json:"scores"`
		} `json:"safetyAttributes"`
		CitationMetadata []struct {
			Citations []any `json:"citations"`
		} `json:"citationMetadata"`
		Content string `json:"content"`
	} `json:"predictions"`
}

type PalmResponseTextBison struct {
	Predictions []struct {
		SafetyAttributes struct {
			Categories []string  `json:"categories"`
			Scores     []float64 `json:"scores"`
			Blocked    bool      `json:"blocked"`
			} `json:"safetyAttributes"`
		Content string `json:"content"`
		CitationMetadata struct {
			Citations []any `json:"citations"`
		} `json:"citationMetadata"`
	} `json:"predictions"`
}


var defaultParameters = &Parameters{
	Temperature:     0.2,
	MaxOutputTokens: 256,
	TopP:            0.8,
	TopK:            40,
}

type SafetySetting struct {
	Category     	string `json:"category"`
	Threshold 		string  `json:"threshold"`
}


var defaultSafetySettings = []SafetySetting {
//    SafetySetting{"HARM_CATEGORY_DANGEROUS", "BLOCK_LOW_AND_ABOVE",},
    SafetySetting{"HARM_CATEGORY_UNSPECIFIED", "BLOCK_NONE",},
}

type PalmClient struct {
	client  *http.Client
	palmUrl string
}

func main() {

	r := gin.Default()

	//	r.Use(static.Serve("/", static.LocalFile("./views/public", true)))

	// Serve frontend static files
	r.Use(static.Serve("/", static.LocalFile("./views/public", true)))

	r.NoRoute(func(c *gin.Context) {
		c.File("./views/public/index.html")
	})

	r.GET("/metrics", prometheusHandler())
	r.Use(cors.Middleware(cors.Config{
		Origins:        "*",
		Methods:        "GET, PUT, POST, DELETE",
		RequestHeaders: "Origin, Authorization, Content-Type",
		ExposedHeaders: "",
		MaxAge: 50 * time.Second,
		Credentials: false,
		ValidateHeaders: false,
	}))

	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "pong 100..%.",
		})
	})

	api := r.Group("/api")
	{
		api.GET("/llm-helper/:Prompt", LLMHelperHandler)
		api.GET("/llm-helper-text-bison/:Prompt", LLMTextBisonHelperHandler)
		api.GET("/llm-helper-chat-bison/:Prompt", LLMChatBisonHelperHandler)
		api.GET("/llm-helper-gemini/:Prompt", LLMGeminiHelperHandler)
	}

	r.Run()
	
}

func prometheusHandler() gin.HandlerFunc {
	h := promhttp.Handler()
	return func(c *gin.Context) {
		h.ServeHTTP(c.Writer, c.Request)
	}
}

func LLMHelperHandler(c *gin.Context) {
	c.Header("Content-Type", "application/json")
	prompt := c.Params.ByName("Prompt")
	pr := callLLMChatBison(prompt, c)
	if (pr.Predictions[0].Candidates[0].Content == "The quote  is form the wonderful and extraordinary" || pr.Predictions[0].Candidates[0].Content == "The quote  is form the wonderful and extraordinary "){
		pr2 := callLLMTextBison(prompt, c)
		c.JSON(http.StatusOK, pr2)
	} else {
		c.JSON(http.StatusOK, pr)
	}
}

func LLMChatBisonHelperHandler(c *gin.Context) {
	c.Header("Content-Type", "application/json")
	prompt := c.Params.ByName("Prompt")
	pr := callLLMChatBison(prompt, c)
	c.JSON(http.StatusOK, pr)
}

func LLMTextBisonHelperHandler(c *gin.Context) {
	c.Header("Content-Type", "application/json")
	prompt := c.Params.ByName("Prompt")
	pr := callLLMTextBison(prompt, c)
	c.JSON(http.StatusOK, pr)
}

func LLMGeminiHelperHandler(c *gin.Context) {
	c.Header("Content-Type", "application/json")
	prompt := c.Params.ByName("Prompt")
	pr := callLLMGemini(prompt, c)
	c.JSON(http.StatusOK, pr)
}

func callLLMChatBison(prompt string, c *gin.Context) PalmResponseChatBison {

	region := "us-central1"
	//modelName := "chat-bison"
	modelName := "chat-bison@001"
	projectId := "gab-devops-1"

	palmClient := NewClient(region, projectId, modelName, c)

	// Use the default parameters
	response, err := palmClient.CallPalmApiChatBison(prompt, nil)

	if err != nil {
		fmt.Printf("error during the API call: %s\n", err)
		return *response
		//return *&response.Predictions[len(response.Predictions)-1].Content
	}

	// You can use your own parameters if you prefer
	/*
		myParameters := &palm_client.Parameters{
			Temperature:     0.2,
			MaxOutputTokens: 256,
			TopP:            0.8,
			TopK:            40,
		}

		response, err := palmClient.CallPalmApiChatBison(prompt, myParameters)
	*/

	fmt.Printf("The response in callLLMChatBison is \n%s\n\n", response)

	fmt.Printf("The initial prompt is \n%s\n\n", prompt)
	fmt.Printf("The generated answer is \n%s\n", response.Predictions[0].Candidates[0].Content)

	return *response
}

func callLLMTextBison(prompt string, c *gin.Context) PalmResponseTextBison {  
	
	region := "us-central1"
	//modelName := "text-bison"
	modelName := "text-bison@001"
	projectId := "gab-devops-1"
	
	palmClient := NewClient(region, projectId, modelName, c)
	response, err := palmClient.CallPalmApiTextBison(prompt, nil)
	if err != nil {
		fmt.Printf("error during the API call: %s\n", err)
		return *response
	}
	
	return *response
}

func callLLMGemini(prompttxt string, c *gin.Context) *genai.GenerateContentResponse {  
	
	location := "us-central1"
//	modelName := "gemini-1.5-flash-001"
	modelName := "gemini-1.5-pro-001"
	projectId := "gab-devops-1"

	fmt.Printf("The requestJson in callLLMGemini is \n%s\n\n", prompttxt)

	ctx := context.Background()
        client, err := genai.NewClient(ctx, projectId, location)
        if err != nil {
                fmt.Errorf("error creating client: %w", err)
        }
        gemini := client.GenerativeModel(modelName)
		gemini.ResponseMIMEType = "application/json"
		/*gemini.ResponseSchema = &genai.Schema{
			Type:  genai.TypeArray,
			Items: &genai.Schema{Type: genai.TypeString},
		}*/
		gemini.SystemInstruction = &genai.Content{
			Parts: []genai.Part{genai.Text("Do not use mardown formatting in your response." +
			"Only use unformatted plain text. Find the author of the quote." +
			"Use the history examples to answer the question as required." +
			"Anwser in French based on the following prompt: ")},
		}

		//https://github.com/google/generative-ai-go/blob/main/genai/example_test.go

		cs := gemini.StartChat()
		cs.History = []*genai.Content{
				{Parts: []genai.Part{
					genai.Text("Who is this quote from : Le talent sans genie est peu de chose. Le génie sans talent n'est rien !"),
				},
				Role: "user",
			},
				{Parts: []genai.Part{
					genai.Text("The quote  is form the wonderful and extraordinary Paul Valéry"),
				},
				Role: "model",
			},
			{
				Parts: []genai.Part{
					genai.Text("Who is this quote from : on ne se baigne jamais deux fois dans le meme fleuve."),
				},
				Role: "user",
			},
			
				{Parts: []genai.Part{
					genai.Text("The quote  is form the wonderful and extraordinary Heraclite d'Ephèse"),
				},
				Role: "model",
			},
		}

        //prompt := genai.Text(prompttxt)
        //resp, err := gemini.GenerateContent(ctx, prompt)

		resp, err := cs.SendMessage(ctx, genai.Text("Who is this quote from : "+prompttxt))

        if err != nil {
                fmt.Errorf("error generating content: %w", err)
        }
        // See the JSON response in
        // https://pkg.go.dev/cloud.google.com/go/vertexai/genai#GenerateContentResponse.
        //rb, err := json.MarshalIndent(resp, "", "  ")
        //if err != nil {
        //        fmt.Errorf("json.MarshalIndent: %w", err)
        //}
        //fmt.Fprintln(c.Writer, string(rb))

		//fmt.Printf("The rb response in callLLMGemini is \n%s\n\n", rb)
		fmt.Printf("The resp response in callLLMGemini is \n%s\n\n", resp)

		return resp
	
}

func NewClient(region string, projectId string, modelName string, c *gin.Context) *PalmClient {
	var err error
	p := &PalmClient{}
	ctx := context.Background()
	//ctx := c
	p.client, _, err = httpGoogle.NewClient(ctx)
	if err != nil {
		panic("impossible to find a credential")
	}
	p.palmUrl = p.createPalmURL(region, projectId, modelName)
	return p
}

func (p *PalmClient) createPalmURL(region string, projectId string, modelName string) string {
	//return fmt.Sprintf("https://%s-aiplatform.googleapis.com/v1/projects/%s/locations/%s/publishers/google/models/%s:predict -d", region, projectId, region, modelName)
	//return "https://us-central1-aiplatform.googleapis.com/v1/projects/gab-devops-1/locations/us-central1/publishers/google/models/chat-bison:predict -d"
	//return "https://us-central1-aiplatform.googleapis.com/v1/projects/gab-devops-1/locations/us-central1/publishers/google/models/chat-bison:predict"
	return fmt.Sprintf("https://%s-aiplatform.googleapis.com/v1/projects/%s/locations/%s/publishers/google/models/%s:predict", region, projectId, region, modelName)
}


func (p *PalmClient) CallPalmApiChatBison(prompt string, parameters *Parameters) (response *PalmResponseChatBison, err error) {

	//Create the client if not exist
	if p.client == nil {
		ctx := context.Background()
		p.client, _, err = httpGoogle.NewClient(ctx)
		if err != nil {
			panic("impossible to find a credential")
		}
	}

	// Use default parameter by default
	request := PalmRequestChatBison{Parameters: defaultParameters }
	if parameters != nil {
		request = PalmRequestChatBison{Parameters: parameters}
	}

	var messages = []Message{}
	var theprompt = ""

	messages = append(messages, Message{ "user","Who is this quote from : "+prompt})
	request.Instances = append(request.Instances, Instances{defaultExamples, messages, theprompt})
	

	// Managed JSON, should never fail, ignore the err.
	requestJson, _ := json.Marshal(request)

	fmt.Printf("The palmUrl is \n%s\n\n", p.palmUrl)
	fmt.Printf("The requestJson in CallPalmApiChatBison is \n%s\n\n", requestJson)

	//Call API
	rawResponse, err := p.client.Post(p.palmUrl, "application/json", bytes.NewReader(requestJson))
	if err != nil {
		errorMessage := fmt.Sprintf("api call with error %s\n", err)
		fmt.Println(errorMessage)
		err = errors.New(errorMessage)
		return
	}

	if rawResponse.StatusCode == 200 {
		respBody, err := io.ReadAll(rawResponse.Body)
		if err != nil {
			errorMessage := fmt.Sprintf("read body with error %s\n", err)
			fmt.Println(errorMessage)
			err = errors.New(errorMessage)
			return nil, err
		}
		defer rawResponse.Body.Close()

		response = &PalmResponseChatBison{}
		err = json.Unmarshal(respBody, response)
		if err != nil {
			errorMessage := fmt.Sprintf("json response parse with error %s\n", err)
			fmt.Println(errorMessage)
			err = errors.New(errorMessage)
			return nil, err
		}
	} else {
		errorMessage := fmt.Sprintf("API call with error %s\n", rawResponse.Status)
		fmt.Println(errorMessage)
		fmt.Println(rawResponse)
		err = errors.New(errorMessage)
		return nil, err
	}
	return
}

func (p *PalmClient) CallPalmApiTextBison(prompt string, parameters *Parameters) (response *PalmResponseTextBison, err error) {
	//Create the client if not exist
	if p.client == nil {
		ctx := context.Background()
		p.client, _, err = httpGoogle.NewClient(ctx)
		if err != nil {
			panic("impossible to find a credential")
		}
	}

	// Use default parameter by default
	//request := PalmRequest{Parameters: defaultParameters, SafetySettings: defaultSafetySettings }
	request := PalmRequestTextBison{Parameters: defaultParameters }

	var theprompt = prompt
	request.InstancesTextBison = append(request.InstancesTextBison, InstancesTextBison{theprompt})
	
	// Managed JSON, should never fail, ignore the err.
	requestJson, _ := json.Marshal(request)

	fmt.Printf("The palmUrl is \n%s\n\n", p.palmUrl)
	fmt.Printf("The requestJson in CallPalmApiTextBison is \n%s\n\n", requestJson)

	//Call API
	rawResponse, err := p.client.Post(p.palmUrl, "application/json", bytes.NewReader(requestJson))
	if err != nil {
		errorMessage := fmt.Sprintf("api call with error %s\n", err)
		fmt.Println(errorMessage)
		err = errors.New(errorMessage)
		return
	}

	if rawResponse.StatusCode == 200 {
		respBody, err := io.ReadAll(rawResponse.Body)
		if err != nil {
			errorMessage := fmt.Sprintf("read body with error %s\n", err)
			fmt.Println(errorMessage)
			err = errors.New(errorMessage)
			return nil, err
		}
		defer rawResponse.Body.Close()

		response = &PalmResponseTextBison{}
		err = json.Unmarshal(respBody, response)
		if err != nil {
			errorMessage := fmt.Sprintf("json response parse with error %s\n", err)
			fmt.Println(errorMessage)
			err = errors.New(errorMessage)
			return nil, err
		}
	} else {
		errorMessage := fmt.Sprintf("API call with error %s\n", rawResponse.Status)
		fmt.Println(errorMessage)
		fmt.Println(rawResponse)
		err = errors.New(errorMessage)
		return nil, err
	}
	return
}
