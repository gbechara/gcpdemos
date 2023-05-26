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
	"net/http"
	"time"
	//	"os"
	"strconv"

	"github.com/gin-gonic/contrib/static"
	"github.com/gin-gonic/gin"
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
  var Citations = []Citation{
	Citation{1, 0, "Le talent sans génie est peu de chose. Le génie sans talent n’est rien !", "#4285F4"},
	Citation{2, 0, "On ne se baigne jamais deux fois dans le même fleuve.", "#DB4437"},
	Citation{3, 0, "Ose savoir ! v0.6  ", "#F4B400"},
	Citation{4, 0, "Le courage n'est pas l'absence de peur, mais la capacité de vaincre ce qui fait peur.", "#0F9D58"},
	Citation{5, 0, "Après le pain, l’éducation est le premier besoin d’un peuple.","#545454"},
  }

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
			"message": "hey-cors-v0.3",
		})
	})


	r.GET("/metrics", prometheusHandler())

    //r.LoadHTMLGlob("views/*")
    //r.GET("/", indexHandler)
    //r.POST("/", formHandler)

	api := r.Group("/api")
	{
		api.GET("/citations", CitationHandler)
		api.POST("/citations/like/:CitationID", LikeCitation)
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



func prometheusHandler() gin.HandlerFunc {
	h := promhttp.Handler()
	return func(c *gin.Context) {
		h.ServeHTTP(c.Writer, c.Request)
	}
}

// CitationHandler returns a list of Citations available (in memory)
func CitationHandler(c *gin.Context) {
	c.Header("Content-Type", "application/json")
	
	c.JSON(http.StatusOK, Citations)
  }
  
  func LikeCitation(c *gin.Context) {
	// Check Citation ID is valid
	if Citationid, err := strconv.Atoi(c.Param("CitationID")); err == nil {
	  // find Citation and increment likes
	  for i := 0; i < len(Citations); i++ {
		if Citations[i].ID == Citationid {
		  Citations[i].Likes = Citations[i].Likes + 1
		}
	  }
	  c.JSON(http.StatusOK, &Citations)
	} else {
	  // the Citations ID is invalid
	  c.AbortWithStatus(http.StatusNotFound)
	}
  }
