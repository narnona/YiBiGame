import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { BigInt, Address } from "@graphprotocol/graph-ts"
import { LevelCreated } from "../generated/schema"
import { LevelCreated as LevelCreatedEvent } from "../generated/YiBiGame/YiBiGame"
import { handleLevelCreated } from "../src/yibi-game"
import { createLevelCreatedEvent } from "./yi-bi-game-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#tests-structure

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let levelId = BigInt.fromI32(234)
    let creator = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let name = "Example string value"
    let size = 123
    let hintsCount = BigInt.fromI32(234)
    let newLevelCreatedEvent = createLevelCreatedEvent(
      levelId,
      creator,
      name,
      size,
      hintsCount
    )
    handleLevelCreated(newLevelCreatedEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#write-a-unit-test

  test("LevelCreated created and stored", () => {
    assert.entityCount("LevelCreated", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "LevelCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "levelId",
      "234"
    )
    assert.fieldEquals(
      "LevelCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "creator",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "LevelCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "name",
      "Example string value"
    )
    assert.fieldEquals(
      "LevelCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "size",
      "123"
    )
    assert.fieldEquals(
      "LevelCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "hintsCount",
      "234"
    )

    // More assert options:
    // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#asserts
  })
})
