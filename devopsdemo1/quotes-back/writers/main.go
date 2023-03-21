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
	"net/http"
	"github.com/gin-gonic/contrib/static"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

type myForm struct {
    Colors []string `form:"colors[]"`
}

  
  type Writer struct {
	ID    int    `json:"id" binding:"required"`
	Likes int    `json:"likes"`
	Writer  string `json:"Writer" binding:"required"`
	Color  string `json:"color" binding:"required"` 
}
  
  /** we'll create a list of Writer */
  var Writers = []Writer{
	Writer{1, 0, "Victor Hugo.", "#4285F4"},
	Writer{2, 0, "Balzac.", "#DB4437"},
	Writer{3, 0, "Danton.","#545454"},
  }

func main() {

	r := gin.Default()

	// Serve frontend static files
	r.Use(static.Serve("/", static.LocalFile("./views/public", true)))

	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "pong 100..%.",
		})
	})

	r.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "hey-writer",
		})
	})


	r.GET("/metrics", prometheusHandler())


	api := r.Group("/api")
	{
		api.GET("/writers", WritersHandler)
	}

	r.Run()
	//
}

func indexHandler(c *gin.Context) {
	c.HTML(200, "/public/index.html", nil)
}


func prometheusHandler() gin.HandlerFunc {
	h := promhttp.Handler()
	return func(c *gin.Context) {
		h.ServeHTTP(c.Writer, c.Request)
	}
}

func WritersHandler(c *gin.Context) {
	c.Header("Content-Type", "application/json")
	
	c.JSON(http.StatusOK, Writers)
}
  
  