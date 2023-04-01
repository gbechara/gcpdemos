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
//	"context"
	"database/sql"
	"fmt"
	"log"
//	"net"
	"net/http"
	"os"

	"github.com/gin-gonic/contrib/static"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"

	"cloud.google.com/go/cloudsqlconn"
	"cloud.google.com/go/cloudsqlconn/postgres/pgxv4"
//	"github.com/jackc/pgx/v4"
//	"github.com/jackc/pgx/v4/stdlib"
)

var dbPool *sql.DB

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

	db, cleanup := getDB()
	dbPool = db
	defer cleanup()

//	getWriters := `SELECT * FROM writers`

log.Println("getting connection ")


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
	
 
	rows, err := dbPool.Query("SELECT * FROM writers")
	if err != nil {
		log.Fatalf("DB.Query: %v", err)
	}
	log.Println("get rows ")

	defer rows.Close()


	for rows.Next() {
		var id int
		var likes int
		var writer string
		var color string
		err := rows.Scan(&id, &likes, &writer, &color)
		if err != nil {
		  log.Fatalf("Rows.Scan: %v", err)
		}
		log.Println("appending rows ")

		Writers = append(Writers, Writer{ID: id, Likes: likes, Writer: writer, Color: color})
	}


	c.JSON(http.StatusOK, Writers)
}
  
// getDB creates a connection to the database
// based on environment variables.
func getDB() (*sql.DB, func() error) {

	
  dsn := fmt.Sprintf("host=%s user=%s dbname=%s sslmode=disable", os.Getenv("INSTANCE_CONNECTION_NAME"), os.Getenv("DB_IAM_USER"), os.Getenv("DB_NAME"))
//  dsn := fmt.Sprintf("user=%s dbname=%s sslmode=disable", os.Getenv("DB_IAM_USER"), os.Getenv("DB_NAME"))

/*config, err := pgxv.ParseConfig(dsn)
  if err != nil {
	return nil, err
}*/



  log.Println("instance: ", os.Getenv("INSTANCE_CONNECTION_NAME"))
  log.Println("dsn: ", dsn)  

  var opts []cloudsqlconn.Option
 // if usePrivate != "" {
//		  opts = append(opts, cloudsqlconn.WithDefaultDialOptions(cloudsqlconn.WithPrivateIP()))
//  }
opts = append(opts, cloudsqlconn.WithIAMAuthN())

cleanup, err := pgxv4.RegisterDriver("cloudsql-postgres", opts...)
if err != nil {
  log.Fatalf("Error on pgx4.RegisterDriver: %v", err)
}


  /*d, err := cloudsqlconn.NewDialer(context.Background(), opts...)
        if err != nil {
                return nil, err
        }

        // Use the Cloud SQL connector to handle connecting to the instance.
        // This approach does *NOT* require the Cloud SQL proxy.
        config.DialFunc = func(ctx context.Context, network, instance string) (net.Conn, error) {
			return d.Dial(ctx, os.Getenv("INSTANCE_CONNECTION_NAME"))
	}
	dbURI := stdlib.RegisterConnConfig(config)*/
 

	//dbPool, err := sql.Open("cloudsql-postgres", dbURI)

	dbPool, err := sql.Open("cloudsql-postgres", dsn)

  if err != nil {
    log.Fatalf("Error on sql.Open: %v", err)
  }


  dropWriters := `DROP TABLE IF EXISTS writers;`
  _, err = dbPool.Exec(dropWriters)

  createWriters := `CREATE TABLE IF NOT EXISTS writers (
    id SERIAL PRIMARY KEY,
    likes INT,
	writer VARCHAR (50),
	color VARCHAR (50)
  );`

  _, err = dbPool.Exec(createWriters)
  if err != nil {
    log.Fatalf("unable to create table: %s", err)
  }

  newWriter := `INSERT INTO writers(likes,writer, color) VALUES  (0,'Un auteur','#4285F4');`

  _, err = dbPool.Exec(newWriter)
  if err != nil {
    log.Fatalf("unable to create newWriter: %s", err)
  }

  return dbPool, cleanup
}