import { FC } from "react"
import Editor from "../Editor";
import { TVisualEditorView } from "./VisualEditor.types";
import styles from "./VisualEditor.module.scss"

const VisualEditorView: FC<TVisualEditorView> = (props) => {
    const { isEditMode, isDrawMode, currentElement, draw, map, scene, floorsCount, floorsHeight } = props;

    return (
        <div className={styles.editor}>
            <Editor
                isEditMode={isEditMode}
                isDrawMode={isDrawMode}
                currentElement={currentElement}
                scene={scene}
                draw={draw}
                map={map}
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
                    <input type="number" placeholder="Количество этажей" onChange={props.handleFloorsCount} value={floorsCount}></input>
                    <input type="number" placeholder="Высота одного этажа" onChange={props.handleFloorsHeight} value={floorsHeight}></input>
                </div>
            )}
        </div>
    );
}

export { VisualEditorView }