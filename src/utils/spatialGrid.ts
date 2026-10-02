export interface SpatialItem {
  id: number
  x: number
  y: number
  radius: number
}

export class SpatialGrid<T extends SpatialItem> {
  private cellSize: number
  private grid: Map<number, T[]> = new Map()

  constructor(cellSize = 60) {
    this.cellSize = cellSize
  }

  public setCellSize(size: number) {
    this.cellSize = Math.max(10, size)
  }

  private hash(gx: number, gy: number): number {
    // 32-bit integer spatial hash
    return ((gx * 73856093) ^ (gy * 19349663)) | 0
  }

  public clear(): void {
    this.grid.clear()
  }

  public insert(item: T): void {
    const minGx = Math.floor((item.x - item.radius) / this.cellSize)
    const maxGx = Math.floor((item.x + item.radius) / this.cellSize)
    const minGy = Math.floor((item.y - item.radius) / this.cellSize)
    const maxGy = Math.floor((item.y + item.radius) / this.cellSize)

    for (let gx = minGx; gx <= maxGx; gx++) {
      for (let gy = minGy; gy <= maxGy; gy++) {
        const key = this.hash(gx, gy)
        let cell = this.grid.get(key)
        if (!cell) {
          cell = []
          this.grid.set(key, cell)
        }
        cell.push(item)
      }
    }
  }

  public query(x: number, y: number, radius: number): T[] {
    const minGx = Math.floor((x - radius) / this.cellSize)
    const maxGx = Math.floor((x + radius) / this.cellSize)
    const minGy = Math.floor((y - radius) / this.cellSize)
    const maxGy = Math.floor((y + radius) / this.cellSize)

    const results: T[] = []
    const seen = new Set<number>()

    for (let gx = minGx; gx <= maxGx; gx++) {
      for (let gy = minGy; gy <= maxGy; gy++) {
        const key = this.hash(gx, gy)
        const cell = this.grid.get(key)
        if (cell) {
          for (let i = 0; i < cell.length; i++) {
            const item = cell[i]
            if (!seen.has(item.id)) {
              seen.add(item.id)
              results.push(item)
            }
          }
        }
      }
    }

    return results
  }
}
