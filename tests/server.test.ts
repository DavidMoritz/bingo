import { describe, expect, it, beforeEach } from 'vitest'
import { buildApp } from '../src/app'

const { resetStore, getPublicSets, createPhraseSetForTest } = buildApp()

describe('public phrase sets search', () => {
  beforeEach(() => {
    resetStore()
  })

  it('returns empty list when nothing is public', async () => {
    const items = getPublicSets('')
    expect(items).toEqual([])
  })

  it('finds public sets by title substring', async () => {
    createPhraseSetForTest({
      title: 'Test Card Alpha',
      phrases: ['one', 'two', 'three', 'four'],
      isPublic: true,
      freeSpace: true,
      ratingAverage: 0,
      ratingCount: 0,
      ratingTotal: 0,
      ownerProfileId: 'tester',
    })

    const results = getPublicSets('alpha')
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('Test Card Alpha')
  })

  it('returns only public sets and ignores private ones', async () => {
    // public
    createPhraseSetForTest({
      title: 'Public One',
      phrases: ['a', 'b', 'c', 'd'],
      isPublic: true,
      freeSpace: true,
      ratingAverage: 0,
      ratingCount: 0,
      ratingTotal: 0,
      code: 'PUBLIC1',
      ownerProfileId: 'tester',
    })
    // private
    createPhraseSetForTest({
      title: 'Private One',
      phrases: ['a', 'b', 'c', 'd'],
      isPublic: false,
      freeSpace: true,
      ratingAverage: 0,
      ratingCount: 0,
      ratingTotal: 0,
      code: 'PRIVATE1',
      ownerProfileId: 'tester',
    })

    const res = getPublicSets('')
    expect(res).toHaveLength(1)
    expect(res[0].title).toBe('Public One')
  })

  it('matches search against title, code, and phrases (case-insensitive)', () => {
    const created = createPhraseSetForTest({
      title: 'Zoo Adventure',
      phrases: ['penguin', 'giraffe', 'lion king', 'otter slide'],
      isPublic: true,
      freeSpace: true,
      ratingAverage: 4,
      ratingCount: 2,
      ratingTotal: 8,
      code: 'ZOO123',
      ownerProfileId: 'tester',
    })

    expect(getPublicSets('penguin')).toHaveLength(1)
    expect(getPublicSets('zoo')).toHaveLength(1)
    expect(getPublicSets('ZOO123')).toHaveLength(1)
    expect(getPublicSets('unknown')).toHaveLength(0)
    expect(getPublicSets('lion')).toHaveLength(1)
    expect(getPublicSets('gIrAfFe')[0].code).toBe(created.code)
  })

  it('sorts by rating average descending, then by recency', () => {
    const low = createPhraseSetForTest({
      title: 'Low Rated',
      phrases: ['a', 'b', 'c', 'd'],
      isPublic: true,
      freeSpace: true,
      ratingAverage: 2,
      ratingCount: 1,
      ratingTotal: 2,
      code: 'LOW',
      ownerProfileId: 'tester',
    })

    createPhraseSetForTest({
      title: 'High Rated',
      phrases: ['a', 'b', 'c', 'd'],
      isPublic: true,
      freeSpace: true,
      ratingAverage: 4.5,
      ratingCount: 2,
      ratingTotal: 9,
      code: 'HIGH',
      ownerProfileId: 'tester',
    })

    const results = getPublicSets('')
    expect(results[0].title).toBe('High Rated')
    expect(results[1].title).toBe('Low Rated')
    expect(results[1].code).toBe(low.code)
  })

  it('caps results to 30 items', () => {
    for (let i = 0; i < 35; i++) {
      createPhraseSetForTest({
        title: `Board ${i}`,
        phrases: ['p1', 'p2', 'p3', 'p4'],
        isPublic: true,
        freeSpace: true,
        ratingAverage: 0,
        ratingCount: 0,
        ratingTotal: 0,
        code: `CODE${i}`,
        ownerProfileId: 'tester',
      })
    }

    const results = getPublicSets('')
    expect(results.length).toBe(30)
  })
})
