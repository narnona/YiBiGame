import {
  LevelCreated as LevelCreatedEvent,
  LevelSolved as LevelSolvedEvent
} from "../generated/YiBiGame/YiBiGame"
import { LevelCreated, LevelSolved } from "../generated/schema"

export function handleLevelCreated(event: LevelCreatedEvent): void {
  let entity = new LevelCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.levelId = event.params.levelId
  entity.creator = event.params.creator
  entity.name = event.params.name
  entity.size = event.params.size
  entity.hintsCount = event.params.hintsCount

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleLevelSolved(event: LevelSolvedEvent): void {
  let entity = new LevelSolved(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.levelId = event.params.levelId
  entity.solver = event.params.solver
  entity.pathLength = event.params.pathLength
  entity.isFirstCompletion = event.params.isFirstCompletion

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
