package main

import (
	_ "3d-backend/docs"
	"3d-backend/internal"
	"3d-backend/internal/auth"
	"3d-backend/internal/projects"
	"github.com/gin-gonic/gin"
	"github.com/jessevdk/go-flags"
	"github.com/swaggo/files"
	"github.com/swaggo/gin-swagger"
	"log"
)

func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

// @title           3d-backend API
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @BasePath /
func main() {
	var opts struct {
		DB string `long:"db" env:"DB_DSN" default:"postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable&binary_parameters=yes"`
	}
	if _, err := flags.Parse(&opts); err != nil {
		log.Panicf("Failed parse flags: %v", err)
	}

	db, err := internal.NewPostgresDB(opts.DB)
	if err != nil {
		log.Fatalf("Failed to connect to the database: %v", err)
	}
	defer db.Close()

	r := gin.Default()
	r.Use(CORSMiddleware())
	r.Use(internal.DBMiddleware(db))

	r.POST("/sign-in", auth.SignIn)

	protected := r.Group("/protected")
	protected.Use(auth.AuthMiddleware())
	{
		protected.GET("/user", auth.UserProfile)
	}

	project := r.Group("/project")
	{
		project.GET("/project-details", projects.GetProject)
		project.POST("/create-project", projects.CreateProject)
		project.POST("/create-building", projects.CreateBuilding)
		project.POST("/create-playground", projects.CreatePlayground)
		project.POST("/update-building", projects.PatchBuilding)
		project.POST("/update-playground", projects.PatchPlayground)
	}

	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	log.Println("Listen on 0.0.0.0:8080")
	if err := r.Run("0.0.0.0:8080"); err != nil {
		log.Panic(err)
	}

}
