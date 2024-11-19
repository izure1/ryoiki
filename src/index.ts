/**
 * A callback function to execute during a lock operation.
 * @template T - The return type of the task.
 * @param lockId - The unique identifier for the lock.
 * @returns A promise resolving to the task's result.
 */
type TaskCallback<T> = (lockId: string) => Promise<T>
/**
 * Represents a range with a start and end.
 */
type RyoikiRange = [number, number]
/**
 * A map containing task units by their lock ID.
 */
type TaskUnits = Map<string, TaskUnit>

/**
 * Represents a unit of a task with a range and lifecycle methods.
 */
interface TaskUnit {
  id: string
  range: RyoikiRange
  condition: () => boolean
  alloc: () => Promise<void>
  free: () => void
}

/**
 * Ryoiki is a locking library for handling overlapping read/write operations
 * in a range-based manner.
 */
export class Ryoiki {
  protected readonly readings: TaskUnits
  protected readonly writings: TaskUnits
  protected readonly readQueue: TaskUnits
  protected readonly writeQueue: TaskUnits

  protected static async CatchError<T>(promise: Promise<T>): Promise<[undefined, T]|[Error]> {
    return await promise
      .then((v) => [undefined, v] as [undefined, T])
      .catch((err) => [err])
  }

  protected static IsRangeOverlap(a: RyoikiRange, b: RyoikiRange): boolean {
    const [start1, end1] = a
    const [start2, end2] = b
    if (end1 <= start2 || end2 <= start1) {
      return false
    }
    return true
  }

  protected static ERR_ALREADY_EXISTS(lockId: string): Error {
    return new Error(`The '${lockId}' task already existing in queue or running.`)
  }

  protected static ERR_NOT_EXISTS(lockId: string): Error {
    return new Error(`The '${lockId}' task not existing in task queue.`)
  }

  /**
   * Constructs a new instance of the Ryoiki class.
   */
  constructor() {
    this.readings = new Map()
    this.writings = new Map()
    this.readQueue = new Map()
    this.writeQueue = new Map()
  }

  /**
   * Creates a range based on a start value and length.
   * @param start - The starting value of the range.
   * @param length - The length of the range.
   * @returns A range tuple [start, start + length].
   */
  range(start: number, length: number): RyoikiRange {
    return [start, start+length]
  }

  protected rangeOverlapping(tasks: TaskUnits, range: RyoikiRange): boolean {
    return Array.from(tasks.values()).some((t) => Ryoiki.IsRangeOverlap(t.range, range))
  }

  protected isSameRange(a: RyoikiRange, b: RyoikiRange): boolean {
    const [a1, a2] = a
    const [b1, b2] = b
    return a1 === b1 && a2 === b2
  }

  protected fetchUnitAndRun(queue: TaskUnits, workspaces: TaskUnits) {
    for (const [id, unit] of queue) {
      if (!unit.condition()) {
        continue
      }
      this._alloc(queue, workspaces, id)
    }
  }

  private _createRandomId(): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2)
    return `${timestamp}${random}`
  }

  private _alloc(queue: TaskUnits, workspaces: TaskUnits, lockId: string): void {
    const unit = queue.get(lockId)
    if (!unit) {
      throw Ryoiki.ERR_NOT_EXISTS(lockId)
    }
    workspaces.set(lockId, unit)
    queue.delete(lockId)
    unit.alloc()
  }

  private _free(workspaces: TaskUnits, lockId: string): void {
    const unit = workspaces.get(lockId)
    if (!unit) {
      throw Ryoiki.ERR_NOT_EXISTS(lockId)
    }
    workspaces.delete(lockId)
    unit.free()
  }

  private _lock<T>(
    queue: TaskUnits,
    range: RyoikiRange,
    task: TaskCallback<T>,
    condition: TaskUnit['condition']
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = this._createRandomId()
      const alloc = async () => {
        const [err, v] = await Ryoiki.CatchError<T>(task(id))
        if (err) reject(err)
        else resolve(v)
      }
      const fetch = () => {
        this.fetchUnitAndRun(this.readQueue, this.readings)
        this.fetchUnitAndRun(this.writeQueue, this.writings)
      }
      queue.set(id, { id, range, condition, alloc, free: fetch })
      fetch()
    })
  }

  /**
   * Acquires a read lock for the entire range.
   * @template T - The return type of the task.
   * @param task - The task to execute within the lock.
   * The task receives the lock ID as an argument.
   * @returns A promise resolving to the result of the task execution.
   */
  readLock<T>(task: TaskCallback<T>): Promise<T>
  /**
   * Acquires a read lock for a specific range.
   * @template T - The return type of the task.
   * @param range - The range to lock, specified as a tuple [start, end].
   * @param task - The task to execute within the lock.
   * The task receives the lock ID as an argument.
   * @returns A promise resolving to the result of the task execution.
   */
  readLock<T>(range: RyoikiRange, task: TaskCallback<T>): Promise<T>
  /**
   * Internal implementation of the read lock. Handles both overloads.
   * @template T - The return type of the task.
   * @param arg0 - Either a range or a task callback.
   * If a range is provided, the task is the second argument.
   * @param arg1 - The task to execute, required if a range is provided.
   * @returns A promise resolving to the result of the task execution.
   */
  readLock<T>(arg0: RyoikiRange|TaskCallback<T>, arg1?: TaskCallback<T>): Promise<T> {
    let range: RyoikiRange
    let task: TaskCallback<T>
    if (arg1) {
      range = arg0 as RyoikiRange
      task = arg1
    }
    else {
      range = [-Infinity, Infinity]
      task = arg0 as TaskCallback<T>
    }
    return this._lock(
      this.readQueue,
      range,
      task,
      () => !this.rangeOverlapping(this.writings, range)
    )
  }
  
  /**
   * Acquires a write lock for the entire range.
   * @template T - The return type of the task.
   * @param task - The task to execute within the lock.
   * The task receives the lock ID as an argument.
   * @returns A promise resolving to the result of the task execution.
   */
  writeLock<T>(task: TaskCallback<T>): Promise<T>
  /**
   * Acquires a write lock for a specific range.
   * @template T - The return type of the task.
   * @param range - The range to lock, specified as a tuple [start, end].
   * @param task - The task to execute within the lock.
   * The task receives the lock ID as an argument.
   * @returns A promise resolving to the result of the task execution.
   */
  writeLock<T>(range: RyoikiRange, task: TaskCallback<T>): Promise<T>
  /**
   * Internal implementation of the write lock. Handles both overloads.
   * @template T - The return type of the task.
   * @param arg0 - Either a range or a task callback.
   * If a range is provided, the task is the second argument.
   * @param arg1 - The task to execute, required if a range is provided.
   * @returns A promise resolving to the result of the task execution.
   */
  writeLock<T>(arg0: RyoikiRange|TaskCallback<T>, arg1?: TaskCallback<T>): Promise<T> {
    let range: RyoikiRange
    let task: TaskCallback<T>
    if (arg1) {
      range = arg0 as RyoikiRange
      task = arg1
    }
    else {
      range = [-Infinity, Infinity]
      task = arg0 as TaskCallback<T>
    }
    return this._lock(
      this.writeQueue,
      range,
      task,
      () => {
        return (
          !this.rangeOverlapping(this.writings, range) &&
          !this.rangeOverlapping(this.readings, range)
        )
      }
    )
  }

  /**
   * Releases a read lock by its lock ID.
   * @param lockId - The unique identifier for the lock to release.
   */
  readUnlock(lockId: string): void {
    this._free(this.readings, lockId)
  }

  /**
   * Releases a write lock by its lock ID.
   * @param lockId - The unique identifier for the lock to release.
   */
  writeUnlock(lockId: string): void {
    this._free(this.writings, lockId)
  }
}
