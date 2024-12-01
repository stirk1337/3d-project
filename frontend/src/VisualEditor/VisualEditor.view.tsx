import { FC } from "react"
import Editor from "../Editor";
import { TVisualEditorView } from "./VisualEditor.types";
import styles from "./VisualEditor.module.scss"

const VisualEditorView: FC<TVisualEditorView> = (props) => {
    const { isEditMode, isDrawMode, currentElement, draw, map, scene, floorsCount, floorsHeight, currentSquare, babylonObjectsData } = props;

    return (
        <div className={styles.editor}>
            <Editor
                isEditMode={isEditMode}
                isDrawMode={isDrawMode}
                babylonObjectsData={babylonObjectsData}
                currentElement={currentElement}
                scene={scene}
                draw={draw}
                map={map}
                handleBabylonObjectsDataChange={props.handleBabylonObjectsDataChange}
                handleScene={props.handleScene}
                handleMap={props.handleMap}
                handleMaterial={props.handleMaterial}
                handleDraw={props.handleDraw}
                handleCurrentElement={props.handleCurrentElement}
            />
            <div className={styles.editor__controls}>
                <button className={styles.editor__controls__button} onClick={props.handleEditMode}>{isEditMode ? "Выключить редактирование" : "Включить редактирование"}</button>
                <button className={styles.editor__controls__button} onClick={props.handleDrawMode}>{isDrawMode ? "Выключить рисования полигона" : "Включить рисования полигона"}</button>
            </div>
            {currentElement && (
                <div className={styles.editor__current_controls}>
                    <button className={styles.editor__controls__button} onClick={() => props.clearCurrentElement()}>Закончить редактирование</button>
                    <button className={styles.editor__controls__button} onClick={() => props.handleEditCurrentElement()}>Редактировать объект</button>
                    <label htmlFor="floorsCount">Количество этажей</label>
                    <input id="floorsCount" type="number" onChange={props.handleFloorsCount} value={floorsCount}></input>
                    <label htmlFor="floorsHeight">Высота этажа</label>
                    <input id="floorsHeight" type="number" placeholder="Высота одного этажа" onChange={props.handleFloorsHeight} value={floorsHeight}></input>
                    <p>Площадь: {currentSquare}</p>
                </div>
            )}
        </div>
    );
}

export { VisualEditorView }