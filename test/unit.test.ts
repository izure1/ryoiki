import { Ryoiki } from 'ryoiki'

function delay(interval: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, interval))
}

function create(samples: number = 10) {
  const ryoiki = new Ryoiki()
  const sample = new Array(samples).fill(0).map((_, i) => i)
  const read = async (start: number, end: number, delayInterval: number = 100) => {
    await delay(delayInterval)
    return sample.slice(start, end)
  }
  const write = async (start: number, data: number[], delayInterval: number = 100) => {
    await delay(delayInterval)
    const end = Math.min(sample.length, start+data.length)
    const count = sample.length-end
    const chunk = data.slice(0, count)
    return sample.splice(start, chunk.length, ...chunk)
  }
  return {
    ryoiki,
    sample,
    read,
    write,
  }
}

describe('Ryoiki', () => {
  test('another range', async () => {
    const { ryoiki, sample, read, write } = create(10)

    let lockA: string
    const a = ryoiki.readLock(ryoiki.range(0, 2), async (_lockId) => {
      lockA = _lockId
      return read(0, 2)
    }).finally(() => ryoiki.readUnlock(lockA))

    let lockB: string
    const b = ryoiki.readLock(ryoiki.range(2, 2), async (_lockId) => {
      lockB = _lockId
      return read(2, 4)
    }).finally(() => ryoiki.readUnlock(lockB))

    await Promise.all([
      expect(a).resolves.toEqual([0, 1]),
      expect(b).resolves.toEqual([2, 3]),
    ])

    let lockC: string
    const c = ryoiki.writeLock(ryoiki.range(0, 2), async (_lockId) => {
      lockC = _lockId
      await write(0, [1, 2])
      return sample.slice(0, 2)
    }).finally(() => ryoiki.writeUnlock(lockC))

    let lockD: string
    const d = ryoiki.writeLock(ryoiki.range(2, 2), async (_lockId) => {
      lockD = _lockId
      await write(2, [3, 4])
      return sample.slice(2, 4)
    }).finally(() => ryoiki.writeUnlock(lockD))

    await Promise.all([
      expect(c).resolves.toEqual([1, 2]),
      expect(d).resolves.toEqual([3, 4]),
    ])
  })

  test('overlapping range', async () => {
    const { ryoiki, sample, read, write } = create(10)

    let lockA: string
    const a = ryoiki.readLock(ryoiki.range(0, 2), async (_lockId) => {
      lockA = _lockId
      return read(0, 2)
    }).finally(() => ryoiki.readUnlock(lockA))

    let lockB: string
    const b = ryoiki.readLock(ryoiki.range(1, 2), async (_lockId) => {
      lockB = _lockId
      return read(1, 3)
    }).finally(() => ryoiki.readUnlock(lockB))

    await Promise.all([
      expect(a).resolves.toEqual([0, 1]),
      expect(b).resolves.toEqual([1, 2]),
    ])

    let lockC: string
    const c = ryoiki.writeLock(ryoiki.range(0, 2), async (_lockId) => {
      lockC = _lockId
      await write(0, [1, 2])
      return sample.slice(0, 2)
    }).finally(() => ryoiki.writeUnlock(lockC))

    let lockD: string
    const d = ryoiki.writeLock(ryoiki.range(1, 2), async (_lockId) => {
      lockD = _lockId
      await write(1, [3, 4])
      return sample.slice(1, 3)
    }).finally(() => ryoiki.writeUnlock(lockD))

    await Promise.all([
      expect(c).resolves.toEqual([1, 2]),
      expect(d).resolves.toEqual([3, 4]),
    ])
  })

  test('read-write order', async () => {
    const { ryoiki, sample, read, write } = create(10)

    let lockA: string
    const a = ryoiki.readLock(ryoiki.range(0, 2), async (_lockId) => {
      lockA = _lockId
      return read(0, 2)
    }).finally(() => ryoiki.readUnlock(lockA))

    let lockB: string
    const b = ryoiki.readLock(ryoiki.range(1, 2), async (_lockId) => {
      lockB = _lockId
      return read(1, 3)
    }).finally(() => ryoiki.readUnlock(lockB))

    let lockC: string
    const c = ryoiki.writeLock(ryoiki.range(0, 2), async (_lockId) => {
      lockC = _lockId
      await write(0, [1, 2])
      return sample.slice(0, 2)
    }).finally(() => ryoiki.writeUnlock(lockC))

    let lockD: string
    const d = ryoiki.writeLock(ryoiki.range(1, 2), async (_lockId) => {
      lockD = _lockId
      await write(1, [3, 4])
      return sample.slice(1, 3)
    }).finally(() => ryoiki.writeUnlock(lockD))

    await Promise.all([
      expect(a).resolves.toEqual([0, 1]),
      expect(b).resolves.toEqual([1, 2]),
      expect(c).resolves.toEqual([1, 2]),
      expect(d).resolves.toEqual([3, 4]),
    ])
  })

  test('read-write complex order', async () => {
    const { ryoiki, sample, read, write } = create(10)

    // order: read-A, write-D, write-C, read-B
    // expect order: read-A, read-B, write-D, write-C

    let lockA: string
    const a = ryoiki.readLock(ryoiki.range(0, 2), async (_lockId) => {
      lockA = _lockId
      return read(0, 2)
    }).finally(() => ryoiki.readUnlock(lockA))

    let lockD: string
    const d = ryoiki.writeLock(ryoiki.range(1, 2), async (_lockId) => {
      lockD = _lockId
      await write(1, [3, 4])
      return sample.slice(1, 3)
    }).finally(() => ryoiki.writeUnlock(lockD))

    let lockC: string
    const c = ryoiki.writeLock(ryoiki.range(0, 2), async (_lockId) => {
      lockC = _lockId
      await write(0, [1, 2])
      return sample.slice(0, 2)
    }).finally(() => ryoiki.writeUnlock(lockC))

    let lockB: string
    const b = ryoiki.readLock(ryoiki.range(1, 2), async (_lockId) => {
      lockB = _lockId
      return read(1, 3)
    }).finally(() => ryoiki.readUnlock(lockB))

    await Promise.all([
      expect(a).resolves.toEqual([0, 1]),
      expect(d).resolves.toEqual([3, 4]),
      expect(c).resolves.toEqual([1, 2]),
      expect(b).resolves.toEqual([1, 2]),
    ])
  })
})
