package internal

import (
	"database/sql"
	"github.com/jmoiron/sqlx"
	log "github.com/sirupsen/logrus"
)

type AuthUser struct {
	ID       int64  `db:"id"`
	Password string `db:"password"`
	Username string `db:"username"`
}

func MustSelectAuthUser(db *sqlx.DB) AuthUser {
	var user []AuthUser
	err := db.Select(&user, `SELECT id, password, username FROM auth_user ORDER BY random() LIMIT 1;`)
	if err != nil && err != sql.ErrNoRows {
		log.Fatal(err)
	}
	log.Info(user[0].Username)
	return user[0]
}
