package main

import (
	"3d-backend/internal"
	"fmt"
	"github.com/jessevdk/go-flags"
	"log"
)

func main() {
	var opts struct {
		DB string `long:"db" env:"DB" default:"postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable&binary_parameters=yes"`
	}
	if _, err := flags.Parse(&opts); err != nil {
		log.Panicf("Failed parse flags: %v", err)
	}

	db, err := internal.NewPostgresDB(opts.DB)
	if err != nil {
		log.Fatalf("Failed to connect to the database: %v", err)
	}
	defer db.Close()

	user := internal.MustSelectAuthUser(db)
	fmt.Println(user)
}
