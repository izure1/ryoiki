# Ryoiki

[![](https://data.jsdelivr.com/v1/package/npm/ryoiki/badge)](https://www.jsdelivr.com/package/npm/ryoiki)
![Node.js workflow](https://github.com/izure1/ryoiki/actions/workflows/node.js.yml/badge.svg)

`Ryoiki` is a JavaScript library that provides read/write locks based on specific ranges.  
This library helps maintain consistency and stability by controlling concurrent access to data.

## 📦 Installation

```bash
npm install ryoiki
```

or

```typescript
import { Ryoiki } from 'https://cdn.jsdelivr.net/npm/ryoiki@1/+esm'
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

### Key Concepts

#### 1. **Default Lock Range**

- If the first parameter of `readLock` or `writeLock` is omitted, it defaults to `[-Infinity, Infinity]`.

- Example:

  ```typescript
  let lockId: string
  await ryoiki.readLock(async (_lockId) => {
    lockId = _lockId
    console.log('Read lock applied to the entire range')
  }).finally(() => ryoiki.readUnlock(lockId))
  ```

#### 2. **Lock Waiting Behavior**

- **Read Lock**:
  - Can execute immediately if overlapping with other read locks.
  - Waits if overlapping with a write lock.
- **Write Lock**:
  - Waits if overlapping with other read or write locks.

#### 3. **Timeout Behavior**

- Both `readLock` and `writeLock` now support an optional `timeout` parameter.
- **Timeout**: The lock request will wait for the specified time in milliseconds before throwing an error if the lock cannot be acquired.
  - Defaults to `Infinity`, meaning it will wait indefinitely unless otherwise specified.
  - If the lock cannot be acquired within the given `timeout` period, a timeout error is thrown.

#### 4. **Unlocking**

- Always use `finally` to release locks, even if an error occurs in the callback.
- Correct Usage:

  ```typescript
  let lockId: string
  await ryoiki.writeLock([0, 10], async (_lockId) => {
    lockId = _lockId
    throw new Error('Exception occurred')
  }).finally(() => ryoiki.writeUnlock(lockId)) // Always unlock
  ```

#### 5. **Locks, Deadlocks, and Caution**

- **`readLock`** and **`writeLock`** are used to manage access to data by locking specific ranges.  
  - A **read lock** allows multiple readers but waits if a write lock exists.
  - A **write lock** prevents both read and write locks in the same range, ensuring exclusive access.

- **Deadlock** occurs when two or more processes are unable to proceed because each is waiting for the other to release a lock.  
  In the context of `Ryoiki`, this could happen if:
  - A `readLock` is waiting for a `writeLock` to release, and the `writeLock` is waiting for a `readLock` to release.
  
  To prevent deadlocks:
  - Ensure that locks are always released as soon as they are no longer needed.
  - Use `timeout` to avoid waiting indefinitely.

- For a deeper understanding of these concepts, you can refer to these Wikipedia articles:
  - [Read-Write Lock](https://en.wikipedia.org/wiki/Readers%E2%80%93writer_lock)
  - [Deadlock](https://en.wikipedia.org/wiki/Deadlock)

## 📖 API

### `readLock(range?: [number, number], callback: (lockId: string) => Promise<T>, timeout?: number): Promise<T>`

- **Description**: Requests a read lock for the specified range.
- **Parameters**:
  - `range`: Range to lock as `[start, end]`. Defaults to `[-Infinity, Infinity]`.
  - `callback`: Async function executed after lock is acquired.
    - `lockId`: Unique ID for the current lock.
  - `timeout`: Optional timeout in milliseconds. If the lock cannot be acquired within the specified time, the operation will throw a timeout error.
    - Defaults to `Infinity` (wait indefinitely).
- **Returns**: The result of the callback function.

### `writeLock(range?: [number, number], callback: (lockId: string) => Promise<T>, timeout?: number): Promise<T>`

- **Description**: Requests a write lock for the specified range.
- **Parameters**:
  - `range`: Range to lock as `[start, end]`. Defaults to `[-Infinity, Infinity]`.
  - `callback`: Async function executed after lock is acquired.
    - `lockId`: Unique ID for the current lock.
  - `timeout`: Optional timeout in milliseconds. If the lock cannot be acquired within the specified time, the operation will throw a timeout error.
    - Defaults to `Infinity` (wait indefinitely).
- **Returns**: The result of the callback function.

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

### Read and Write Operations with Timeout

```typescript
const ryoiki = new Ryoiki()

let lockId: string

// Read Lock with timeout
await ryoiki.readLock([0, 10], async (_lockId) => {
  lockId = _lockId
  console.log('Reading from range [0, 10]')
}, 1000).finally(() => ryoiki.readUnlock(lockId)) // Always unlock

// Write Lock with timeout
await ryoiki.writeLock([5, 15], async (_lockId) => {
  lockId = _lockId
  console.log('Writing to range [5, 15]')
}, 1000).finally(() => ryoiki.writeUnlock(lockId)) // Always unlock
```

## 📜 License

MIT License. Feel free to use and contribute! 🙌
