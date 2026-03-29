import { newMockEvent } from "matchstick-as"
import { ethereum, BigInt, Address } from "@graphprotocol/graph-ts"
import { LevelCreated, LevelSolved } from "../generated/YiBiGame/YiBiGame"

export function createLevelCreatedEvent(
  levelId: BigInt,
  creator: Address,
  name: string,
  size: i32,
  hintsCount: BigInt
): LevelCreated {
  let levelCreatedEvent = changetype<LevelCreated>(newMockEvent())

  levelCreatedEvent.parameters = new Array()

  levelCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "levelId",
      ethereum.Value.fromUnsignedBigInt(levelId)
    )
  )
  levelCreatedEvent.parameters.push(
    new ethereum.EventParam("creator", ethereum.Value.fromAddress(creator))
  )
  levelCreatedEvent.parameters.push(
    new ethereum.EventParam("name", ethereum.Value.fromString(name))
  )
  levelCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "size",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(size))
    )
  )
  levelCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "hintsCount",
      ethereum.Value.fromUnsignedBigInt(hintsCount)
    )
  )

  return levelCreatedEvent
}

export function createLevelSolvedEvent(
  levelId: BigInt,
  solver: Address,
  pathLength: BigInt,
  isFirstCompletion: boolean
): LevelSolved {
  let levelSolvedEvent = changetype<LevelSolved>(newMockEvent())

  levelSolvedEvent.parameters = new Array()

  levelSolvedEvent.parameters.push(
    new ethereum.EventParam(
      "levelId",
      ethereum.Value.fromUnsignedBigInt(levelId)
    )
  )
  levelSolvedEvent.parameters.push(
    new ethereum.EventParam("solver", ethereum.Value.fromAddress(solver))
  )
  levelSolvedEvent.parameters.push(
    new ethereum.EventParam(
      "pathLength",
      ethereum.Value.fromUnsignedBigInt(pathLength)
    )
  )
  levelSolvedEvent.parameters.push(
    new ethereum.EventParam(
      "isFirstCompletion",
      ethereum.Value.fromBoolean(isFirstCompletion)
    )
  )

  return levelSolvedEvent
}
