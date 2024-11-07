package main

import (
	"3d-backend/internal"
	"3d-backend/internal/auth"
	"github.com/gin-gonic/gin"
	"github.com/jessevdk/go-flags"
	"log"
	"net/http"
)

func main() {
	var opts struct {
		DB string `long:"db" env:"DB" default:"postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable&binary_parameters=yes"`
	}
	if _, err := flags.Parse(&opts); err != nil {
		log.Panicf("Failed parse flags: %v", err)
	}
	log.Print("xd")
	db, err := internal.NewPostgresDB(opts.DB)
	if err != nil {
		log.Fatalf("Failed to connect to the database: %v", err)
	}
	defer db.Close()

	r := gin.Default()
	r.Use(internal.DBMiddleware(db))

	r.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "pong",
		})
	})

	r.POST("/sign-in", auth.SignIn)

	protected := r.Group("/protected")
	protected.Use(auth.AuthMiddleware())
	{
		protected.GET("/profile", auth.UserProfile)
	}

	log.Println("Listen on 0.0.0.0:8080")
	if err := r.Run("0.0.0.0:8080"); err != nil {
		log.Panic(err)
	}

}
