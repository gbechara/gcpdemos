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
)

// JSON request from the Palm API
type Content struct {
	Content string `json:"content"`
}

type Parameters struct {
	SafetySettings  []SafetySetting `json:"safetySettings"`
	Temperature     float64 `json:"temperature"`
	MaxOutputTokens int     `json:"maxOutputTokens"`
	TopP            float64 `json:"topP"`
	TopK            int     `json:"topK"`
}


type PalmRequest struct {
	Instances  []Content   `json:"instances"`
//	SafetySettings []SafetySetting `json:"safetySettings"`
	Parameters *Parameters `json:"parameters"`
}

/*type PalmRequest struct {
	Instances  []Content   `json:"instances"`
	Parameters *Parameters `json:"parameters"`
}*/


// JSON response from the Palm API
type PalmResponse struct {
	Predictions []struct {
		SafetyAttributes struct {
			Categories []string  `json:"categories"`
			Blocked    bool      `json:"blocked"`
			Scores     []float64 `json:"scores"`
		} `json:"safetyAttributes"`
		CitationMetadata struct {
			Citations []any `json:"citations"`
		} `json:"citationMetadata"`
		Content string `json:"content"`
	} `json:"predictions"`
}

var defaultParameters = &Parameters{
	SafetySettings: defaultSafetySettings,
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

	r.Use(static.Serve("/", static.LocalFile("./views/public", true)))

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

	r.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "hey-cors-v0.4",
		})
	})


	api := r.Group("/api")
	{
		api.GET("/llm-helper/:Prompt", LLMHelperHandler)

	}

	
	r.Run()

	//
}

func prometheusHandler() gin.HandlerFunc {
	h := promhttp.Handler()
	return func(c *gin.Context) {
		h.ServeHTTP(c.Writer, c.Request)
	}
}

// CitationHandler returns a list of Citations available (in memory)
func LLMHelperHandler(c *gin.Context) {
	c.Header("Content-Type", "application/json")
	prompt := c.Params.ByName("Prompt")
	c.JSON(http.StatusOK, callLLM(prompt, c))
  }
  
 func callLLM(prompt string, c *gin.Context) PalmResponse {
 //func callLLM(prompt string, c *gin.Context) string {

	region := "us-central1"
	modelName := "text-bison@001"
	projectId := "gab-devops-1"

	palmClient := NewClient(region, projectId, modelName, c)

	// Use the default parameters
	response, err := palmClient.CallPalmApi(prompt, nil)

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

		response, err := palmClient.CallPalmApi(prompt, myParameters)
	*/

	fmt.Printf("The initial prompt is \n%s\n\n", prompt)
	fmt.Printf("The generated answer is \n%s\n", response.Predictions[0].Content)
	return *response
	//return *&response.Predictions[len(response.Predictions)-1].Content
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
	return fmt.Sprintf("https://%s-aiplatform.googleapis.com/v1/projects/%s/locations/%s/publishers/google/models/%s:predict", region, projectId, region, modelName)
}
func (p *PalmClient) CallPalmApi(prompt string, parameters *Parameters) (response *PalmResponse, err error) {
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
	request := PalmRequest{Parameters: defaultParameters }
	if parameters != nil {
		request = PalmRequest{Parameters: parameters}
	    //request = PalmRequest{Parameters: parameters, SafetySettings: defaultSafetySettings}
	}

	request.Instances = append(request.Instances, Content{prompt})

	// Managed JSON, should never fail, ignore the err.
	requestJson, _ := json.Marshal(request)

	fmt.Printf("The requestJson is \n%s\n\n", requestJson)

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

		response = &PalmResponse{}
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
		err = errors.New(errorMessage)
		return nil, err
	}
	return
}
