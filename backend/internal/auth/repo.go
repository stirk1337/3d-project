package auth

import (
	"database/sql"
	"errors"
	"fmt"
	"github.com/jmoiron/sqlx"
)

type User struct {
	ID       int64  `db:"id"`
	Username string `db:"username"`
	Password string `db:"password"`
}

func GetUserHashByUsername(db *sqlx.DB, username string) (User, error) {
	var usr User
	err := db.Get(&usr, `SELECT id, password FROM auth_user WHERE username = $1`, username)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return usr, fmt.Errorf("user not found")
		}
		return usr, err
	}
	return usr, nil
}
