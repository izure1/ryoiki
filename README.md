# Ryoiki

`Ryoiki` is a JavaScript library that provides read/write locks based on specific ranges.  
This library helps maintain consistency and stability by controlling concurrent access to data.

## 📦 Installation

```bash
npm install ryoiki
```

## 🚀 Usage

### Basic Example

```typescript
import { Ryoiki } from 'ryoiki'

const ryoiki = new Ryoiki()

let lockId: string; // Store lock ID externally
await ryoiki.readLock([0, 10], async (_lockId) => {
  lockId = _lockId
  console.log('Reading from range [0, 10]')
}).finally(() => ryoiki.readUnlock(lockId)) // Always unlock
```

## Key Concepts

### 1. **Default Lock Range**

- If the first parameter of `readLock` or `writeLock` is omitted, it defaults to `[-Infinity, Infinity]`.

- Example:

  ```typescript
  let lockId: string
  await ryoiki.readLock(async (_lockId) => {
    lockId = _lockId
    console.log('Read lock applied to the entire range')
  }).finally(() => ryoiki.readUnlock(lockId))
  ```

### 2. **Lock Waiting Behavior**

- **Read Lock**:
  - Can execute immediately if overlapping with other read locks.
  - Waits if overlapping with a write lock.
- **Write Lock**:
  - Waits if overlapping with other read or write locks.

### 3. **Unlocking**

- Always use `finally` to release locks, even if an error occurs in the callback.
- Correct Usage:

  ```typescript
  let lockId: string
  await ryoiki.writeLock([0, 10], async (_lockId) => {
    lockId = _lockId
    throw new Error('Exception occurred')
  }).finally(() => ryoiki.writeUnlock(lockId)) // Always unlock
  ```

## 📖 API

### `readLock(range?: [number, number], callback: (lockId: string) => Promise<T>): Promise<T>`

- **Description**: Requests a read lock for the specified range.
- **Parameters**:
  - `range`: Range to lock as `[start, end]`. Defaults to `[-Infinity, Infinity]`.
  - `callback`: Async function executed after lock is acquired.
    - `lockId`: Unique ID for the current lock.
- **Returns**: The result of the callback function.

### `writeLock(range?: [number, number], callback: (lockId: string) => Promise<T>): Promise<T>`

- **Description**: Requests a write lock for the specified range.
- **Notes**: Default behavior is the same as `readLock`.

### `readUnlock(lockId: string): void`

- **Description**: Releases a read lock.

### `writeUnlock(lockId: string): void`

- **Description**: Releases a write lock.

### `range(start: number, length: number): [number, number]`

- **Description**: Creates a tuple `[start, start + length]` based on the given start and length.
- **Usage Example**:

  ```typescript
  const r = ryoiki.range(0, 10) // [0, 10]
  const s = ryoiki.range(5, 10) // [5, 15]
  ```

## 🌟 Examples

### Read and Write Operations

```typescript
const ryoiki = new Ryoiki()

let lockId: string

// Read Lock
await ryoiki.readLock([0, 10], async (_lockId) => {
  lockId = _lockId
  console.log('Reading from range [0, 10]')
}).finally(() => ryoiki.readUnlock(lockId))

// Write Lock
await ryoiki.writeLock([5, 15], async (_lockId) => {
  lockId = _lockId
  console.log('Writing to range [5, 15]')
}).finally(() => ryoiki.writeUnlock(lockId))
```

## 📜 License

MIT License. Feel free to use and contribute! 🙌
