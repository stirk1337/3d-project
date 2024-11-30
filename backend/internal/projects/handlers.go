package projects

import (
	"encoding/json"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"net/http"
	"strconv"
)

type Playground struct {
	ID          int64        `db:"id" json:"id"`
	ProjectID   int64        `db:"project_id" json:"project_id"`
	Coordinates []Coordinate `db:"coordinates" json:"coordinates"`
}

type Building struct {
	ID           int64        `db:"id" json:"id"`
	ProjectID    int64        `db:"project_id" json:"project_id"`
	Coordinates  []Coordinate `db:"coordinates" json:"coordinates"`
	Floors       int          `db:"floors" json:"floors"`
	FloorsHeight float64      `db:"floors_height" json:"floors_height"`
}

type projectDetailsResponse struct {
	Buildings  []Building  `json:"buildings"`
	Playground *Playground `json:"playground,omitempty"`
}

type createProjectInput struct {
	Name string `json:"name"`
}

type createProjectResponse struct {
	ProjectID int64 `json:"project_id"`
}

type Coordinate struct {
	X int `json:"x"`
	Y int `json:"y"`
}

type createBuildingInput struct {
	ProjectID   int64        `json:"project_id"`
	Coordinates []Coordinate `json:"coordinates"`
}

type createBuildingResponse struct {
	BuildingID int64 `json:"building_id"`
}

type createPlaygroundInput struct {
	ProjectID   int64        `json:"project_id"`
	Coordinates []Coordinate `json:"coordinates"`
}

type createPlaygroundResponse struct {
	PlaygroundID int64 `json:"playground_id"`
}

type updateBuildingInput struct {
	BuildingID   int64        `json:"building_id" binding:"required"`
	Coordinates  []Coordinate `json:"coordinates" binding:"required"`
	Floors       int64        `json:"floors" binding:"required"`
	FloorsHeight float64      `json:"floors_height" binding:"required"`
}

type updatePlaygroundInput struct {
	PlaygroundID int64        `json:"playground_id" binding:"required"`
	Coordinates  []Coordinate `json:"coordinates" binding:"required"`
}

// GetProject godoc
// @Summary Получение информации о проекте
// @Tags project
// @Accept json
// @Produce json
// @Param project_id query int true "Project ID"
// @Success 200 {object} projectDetailsResponse "Project Details"
// @Router /project/project-details [get]
func GetProject(c *gin.Context) {
	projectIDParam := c.Query("project_id")
	projectID, err := strconv.ParseInt(projectIDParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get project id"})
		return
	}
	db := c.MustGet("db").(*sqlx.DB)

	projectDetails, err := GetProjectDetails(db, projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get project details"})
		return
	}

	var buildings []Building
	var playground *Playground

	for _, row := range projectDetails {
		if row.BuildingID.Valid {
			var coord []Coordinate
			err := json.Unmarshal([]byte(row.BuildingCoordinates.String), &coord)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Error unmarshalling coordinates"})
				return
			}
			buildings = append(buildings, Building{
				ID:           row.BuildingID.Int64,
				Coordinates:  coord,
				Floors:       int(row.BuildingFloors.Int64),
				FloorsHeight: row.BuildingFloorsHeight.Float64,
			})
		}

		if row.PlaygroundID.Valid && playground == nil {
			var coord []Coordinate
			err := json.Unmarshal([]byte(row.PlaygroundCoordinates.String), &coord)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Error unmarshalling coordinates"})
				return
			}
			playground = &Playground{
				ID:          row.PlaygroundID.Int64,
				Coordinates: coord,
			}
		}
	}

	response := projectDetailsResponse{
		Buildings:  buildings,
		Playground: playground,
	}

	c.JSON(http.StatusOK, response)
}

// CreateProject godoc
// @Summary Создание проекта
// @Tags project
// @Accept json
// @Produce json
// @Param input body createProjectInput true "Project information"
// @Success 200 {object} createProjectResponse "Project Details"
// @Router /project/create-project [post]
func CreateProject(c *gin.Context) {
	var input createProjectInput
	db := c.MustGet("db").(*sqlx.DB)

	if err := c.BindJSON(&input); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid input"})
		return
	}

	projectID, err := InsertProject(db, input.Name, 1)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed create object"})
		return
	}

	c.JSON(http.StatusOK, createProjectResponse{
		ProjectID: projectID,
	})
}

// CreateBuilding godoc
// @Summary Создание здания
// @Tags project
// @Accept json
// @Produce json
// @Param input body createBuildingInput true "Building information"
// @Success 200 {object} createBuildingResponse "Building Details"
// @Router /project/create-building [post]
func CreateBuilding(c *gin.Context) {
	var input createBuildingInput
	db := c.MustGet("db").(*sqlx.DB)

	if err := c.BindJSON(&input); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid input"})
		return
	}

	coordinatesJSON, err := json.Marshal(input.Coordinates)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse coordinates"})
		return
	}

	buildingID, err := InsertBuilding(db, input.ProjectID, string(coordinatesJSON))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed create building"})
		return
	}

	c.JSON(http.StatusOK, createBuildingResponse{
		BuildingID: buildingID,
	})
}

// CreatePlayground godoc
// @Summary Создание плошадки
// @Tags project
// @Accept json
// @Produce json
// @Param input body createBuildingInput true "Playground information"
// @Success 200 {object} createBuildingResponse
// @Router /project/create-playground [post]
func CreatePlayground(c *gin.Context) {
	var input createPlaygroundInput
	db := c.MustGet("db").(*sqlx.DB)

	if err := c.BindJSON(&input); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid input"})
		return
	}

	coordinatesJSON, err := json.Marshal(input.Coordinates)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse coordinates"})
		return
	}

	playgroundID, err := InsertPlayground(db, input.ProjectID, string(coordinatesJSON))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed create playground"})
		return
	}

	c.JSON(http.StatusOK, createPlaygroundResponse{
		PlaygroundID: playgroundID,
	})
}

// PatchBuilding godoc
// @Summary Обновление здания
// @Tags project
// @Accept json
// @Produce json
// @Param input body updateBuildingInput true "Building information"
// @Router /project/update-building [patch]
func PatchBuilding(c *gin.Context) {
	var input updateBuildingInput
	db := c.MustGet("db").(*sqlx.DB)

	if err := c.BindJSON(&input); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid input"})
		return
	}

	coordinatesJSON, err := json.Marshal(input.Coordinates)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse coordinates"})
		return
	}

	err = UpdateBuilding(db, input.BuildingID, string(coordinatesJSON), input.Floors, input.FloorsHeight)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed update building"})
		return
	}

	c.JSON(http.StatusOK, "ok")
}

// PatchPlayground godoc
// @Summary Обновление площадки
// @Tags project
// @Accept json
// @Produce json
// @Param input body updatePlaygroundInput true "Playground information"
// @Router /project/update-playground [patch]
func PatchPlayground(c *gin.Context) {
	var input updatePlaygroundInput
	db := c.MustGet("db").(*sqlx.DB)

	if err := c.BindJSON(&input); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid input"})
		return
	}

	coordinatesJSON, err := json.Marshal(input.Coordinates)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse coordinates"})
		return
	}

	err = UpdatePlayground(db, input.PlaygroundID, string(coordinatesJSON))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed update playground"})
		return
	}

	c.JSON(http.StatusOK, "ok")
}
