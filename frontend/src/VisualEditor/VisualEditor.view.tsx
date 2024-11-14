import { FC } from "react"
import Editor from "../Editor";
import { TVisualEditorView } from "./VisualEditor.types";
import styles from "./VisualEditor.module.scss"

const VisualEditorView: FC<TVisualEditorView> = (props) => {
    const { isEditMode, isDrawMode, currentElement, draw, map } = props;

    return (
        <div className={styles.editor}>
            <Editor
                isEditMode={isEditMode}
                isDrawMode={isDrawMode}
                currentElement={currentElement}
                draw={draw}
                map={map}
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
                    <button className={styles.editor__controls__button} onClick={() => props.handleEditCurrentElement()}>Редактировать объект</button>
                    <input type="number" placeholder="Количество этажей"></input>
                    <input type="number" placeholder="Высота одного этажа"></input>
                </div>
            )}
        </div>
    );
}

export { VisualEditorView }