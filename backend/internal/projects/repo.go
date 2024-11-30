package projects

import (
	"database/sql"
	"errors"
	"fmt"
	"github.com/jmoiron/sqlx"
)

type ProjectDetails struct {
	BuildingID            sql.NullInt64   `db:"building_id"`
	BuildingProjectID     sql.NullInt64   `db:"building_project_id"`
	BuildingCoordinates   sql.NullString  `db:"building_coordinates"`
	BuildingFloors        sql.NullInt64   `db:"building_floors"`
	BuildingFloorsHeight  sql.NullFloat64 `db:"building_floors_height"`
	PlaygroundID          sql.NullInt64   `db:"playground_id"`
	PlaygroundProjectID   sql.NullInt64   `db:"playground_project_id"`
	PlaygroundCoordinates sql.NullString  `db:"playground_coordinates"`
}

func GetProjectDetails(db *sqlx.DB, projectID int64) ([]ProjectDetails, error) {
	var details []ProjectDetails
	query := `
		SELECT 
			b.id AS building_id,
			b.project_id AS building_project_id,
			b.coordinates AS building_coordinates,
			b.floors AS building_floors,
			b.floors_height AS building_floors_height,
			p.id AS playground_id,
			p.project_id AS playground_project_id,
			p.coordinates AS playground_coordinates
		FROM 
			projects_project pr
		LEFT JOIN 
			projects_building b ON pr.id = b.project_id
		LEFT JOIN 
			projects_playground p ON pr.id = p.project_id
		WHERE 
			pr.id = $1;
	`
	err := db.Select(&details, query, projectID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("no details found for project %d", projectID)
		}
		return nil, err
	}
	return details, nil
}

func InsertProject(db *sqlx.DB, name string, userID int64) (int64, error) {
	tx, err := db.Beginx()
	if err != nil {
		return 0, fmt.Errorf("failed to start transaction: %w", err)
	}

	defer tx.Rollback()

	query := `
		INSERT INTO projects_project (name)
		VALUES ($1)
		RETURNING id;
	`

	var projectID int64
	err = tx.Get(&projectID, query, name)
	if err != nil {
		return 0, fmt.Errorf("failed to create project: %w", err)
	}

	relationshipQuery := `
		INSERT INTO projects_project_user (project_id, user_id)
		VALUES ($1, $2);
	`
	_, err = tx.Exec(relationshipQuery, projectID, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to associate user with project: %w", err)
	}

	err = tx.Commit()
	if err != nil {
		return 0, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return projectID, nil
}

func InsertBuilding(db *sqlx.DB, projectID int64, coordinates string) (int64, error) {
	query := `
		INSERT INTO projects_building (project_id, coordinates, floors, floors_height)
		VALUES ($1, $2, 1, 3)
		RETURNING id;
	`
	var buildingID int64
	err := db.Get(&buildingID, query, projectID, coordinates)
	if err != nil {
		return 0, err
	}
	return buildingID, nil
}

func InsertPlayground(db *sqlx.DB, projectID int64, coordinates string) (int64, error) {
	query := `
		INSERT INTO projects_playground (project_id, coordinates)
		VALUES ($1, $2)
		RETURNING id;
	`
	var playgroundID int64
	err := db.Get(&playgroundID, query, projectID, coordinates)
	if err != nil {
		return 0, err
	}
	return playgroundID, nil
}

func UpdateBuilding(db *sqlx.DB, buildingID int64, coordinates string, floors int64, floorsHeight float64) error {
	query := `
		UPDATE projects_building
		SET coordinates = $1, floors = $2, floors_height = $3
		WHERE id = $4;
	`

	_, err := db.Exec(query, coordinates, floors, floorsHeight, buildingID)
	if err != nil {
		return fmt.Errorf("failed to update building: %w", err)
	}

	return nil
}

func UpdatePlayground(db *sqlx.DB, playgroundID int64, coordinates string) error {
	query := `
		UPDATE projects_playground
		SET coordinates = $1
		WHERE id = $2;
	`

	_, err := db.Exec(query, coordinates, playgroundID)
	if err != nil {
		return fmt.Errorf("failed to update building: %w", err)
	}

	return nil
}
