export function calculateBasePolygonArea(coordinates: { x: number, y: number }[]): number {
    if (coordinates.length < 3) {
        throw new Error("Полигон должен содержать как минимум три точки");
    }

    let area = 0;

    for (let i = 0; i < coordinates.length; i++) {
        const { x: x1, y: y1 } = coordinates[i];
        const { x: x2, y: y2 } = coordinates[(i + 1) % coordinates.length];

        area += x1 * y2 - y1 * x2;
    }

    return Math.abs(area / 2);
}