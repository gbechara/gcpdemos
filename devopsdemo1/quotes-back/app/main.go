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
	/*	"encoding/json"
		"errors"
		"fmt"
		"log"*/
	"encoding/json"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
	"time"

	"os"
	//	"log"
	"strconv"

	"github.com/gin-gonic/contrib/static"
	"github.com/gin-gonic/gin"

	//   "github.com/go-resty/resty/v2"
	"github.com/itsjamie/gin-cors"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

type myForm struct {
    Colors []string `form:"colors[]"`
}

  
type Citation struct {
	ID    int    `json:"id" binding:"required"`
	Likes int    `json:"likes"`
	Citation  string `json:"citation" binding:"required"`
	Color  string `json:"color" binding:"required"` 
}
  
  /** we'll create a list of Citations */
type Citations = []Citation

  
type Writer struct {
	ID    int    `json:"id" binding:"required"`
	Likes int    `json:"likes"`
	Writer  string `json:"writer" binding:"required"`
	Color  string `json:"color" binding:"required"` 
}
  
  /** we'll create a list of Writers */
type Writers = []Writer



func main() {
/*	 http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "Hello World v0.74!")
	})
	http.HandleFunc("/failed", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprint(w, "Failed!")
	})
	http.Handle("/metrics", promhttp.Handler())

	log.Fatal(http.ListenAndServe(":8080", nil))
	*/

	r := gin.Default()

	// Serve frontend static files
	r.Use(static.Serve("/", static.LocalFile("./views/public", true)))

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


	r.GET("/metrics", prometheusHandler())

    //r.LoadHTMLGlob("views/*")
    //r.GET("/", indexHandler)
    //r.POST("/", formHandler)

	api := r.Group("/api")
	{
		api.GET("/citations", CitationsHandler)
		api.POST("/citations/like/:CitationID", LikeCitation)
		api.GET("/writers", WritersHandler)
		api.GET("/writers/insertwriter/:Writer/:Color", InsertWritersHandler)

	}

	r.Run()
	//
}

func indexHandler(c *gin.Context) {
//    c.HTML(200, "form.html", nil)
	c.HTML(200, "/public/index.html", nil)
}

func formHandler(c *gin.Context) {
    var fakeForm myForm
    c.Bind(&fakeForm)
    c.JSON(200, gin.H{"color": fakeForm.Colors})
}

func listQuotes() Citations {
	var quotesURL = os.Getenv("QUOTES_URL")
    var citations Citations
	//client := resty.New()
	/*engine := gin.New()
	engine.GET("http://quotes.dev.svc:8080/citations", func(context *gin.Context) {
		//uri:=URI{}
		// binding to URI
		if err:=context.BindUri(&citations);err!=nil{
		   context.AbortWithError(http.StatusBadRequest,err)
		   return
		}
		//fmt.Println(uri)
		context.JSON(http.StatusAccepted,&citations)
		log.Println(citations)
	 })
	 engine.Run("http://quotes-dev.dev.svc")*/
    ret , err := http.
//        Get("http://quotes-dev.dev.svc:8080/api/citations")
		Get(quotesURL)

    if err != nil {
        log.Println("QuoteApp: unable to connect Quote")
        return nil
    }
    defer ret.Body.Close()
    log.Printf("Quote App: list of quotes")
	body, err := ioutil.ReadAll(ret.Body)
	
	json.Unmarshal(body, &citations) 

	log.Println("QuoteApp: List of quotes",citations[len(citations)-1])
	
	return citations

}

func listWriters() Writers {
	var writersURL = os.Getenv("WRITERS_URL")
	var writers Writers
    ret , err := http.
    //    Get("http://writers-dev.dev.svc:8080/api/writers")
		Get(writersURL)

    if err != nil {
        log.Println("QuoteApp: unable to connect writers")
        return nil
    }
    defer ret.Body.Close()
    log.Printf("Quote App: list of writers")
	body, err := ioutil.ReadAll(ret.Body)
	
	json.Unmarshal(body, &writers) 

	log.Println("QuoteApp: List of writers",writers[len(writers)-1])
	
	return writers

}


func prometheusHandler() gin.HandlerFunc {
	h := promhttp.Handler()
	return func(c *gin.Context) {
		h.ServeHTTP(c.Writer, c.Request)
	}
}

// CitationHandler returns a list of Citations available (in memory)
func CitationsHandler(c *gin.Context) {
	c.Header("Content-Type", "application/json")
	c.JSON(http.StatusOK, listQuotes())
  }
  
  func LikeCitation(c *gin.Context) {
	// Check Citation ID is valid
	if Citationid, err := strconv.Atoi(c.Param("CitationID")); err == nil {
	  // find Citation and increment likes
	  citations := listQuotes();
	  for i := 0; i < len(citations); i++ {
		if citations[i].ID == Citationid {
			citations[i].Likes = citations[i].Likes + 1
		}
	  }
	  c.JSON(http.StatusOK, &c)
	} else {
	  // the Citations ID is invalid
	  c.AbortWithStatus(http.StatusNotFound)
	}
  }

  func WritersHandler(c *gin.Context) {
	c.Header("Content-Type", "application/json")
	c.JSON(http.StatusOK, listWriters())
  }

  func InsertWritersHandler(c *gin.Context) {
	c.Header("Content-Type", "application/json")
	var writersURL = os.Getenv("WRITERS_URL")
	
	var wr Writer =  Writer{1, 0, "DEFAULT", "#4285F4"}

   /* if err := c.ShouldBindJSON(&wr); err != nil {
        c.JSON(400, gin.H{"error": "Insert writer error"})
        return
    }*/

    wr.Writer = c.Params.ByName("Writer")    
	wr.Color = c.Params.ByName("Color")

	log.Printf("app: inserting new writer : "+ wr.Writer +","+wr.Color)

	ret , err := http.Get(writersURL+"/insertwriter/"+url.QueryEscape(wr.Writer+"/"+wr.Color))

    if err != nil {
        log.Println("QuoteApp: unable to connect writers")
    }
    defer ret.Body.Close()
    log.Printf("Quote App: list of writers")

    c.JSON(200,  gin.H{"app: writer inserted": wr.Writer +","+wr.Color})

  }
