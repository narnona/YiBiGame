import {
  LevelCreated as LevelCreatedEvent,
  LevelSolved as LevelSolvedEvent,
  YiBiGame,
  YiBiGame__getLevelResultLevelStruct
} from "../generated/YiBiGame/YiBiGame"
import { BigInt, Bytes } from "@graphprotocol/graph-ts"
import { Hint, Level, SolveRecord } from "../generated/schema"

function createLevelFromOnchain(id: string, onchain: YiBiGame__getLevelResultLevelStruct, txHash: Bytes): Level {
  const level = new Level(id)
  level.levelId = onchain.id
  level.name = onchain.name
  level.size = onchain.size
  level.creator = onchain.creator
  level.createdAt = onchain.createdAt
  level.completionCount = onchain.completionCount
  level.hintCount = onchain.hints.length
  level.txHash = txHash
  level.save()

  for (let i = 0; i < onchain.hints.length; i++) {
    const h = onchain.hints[i]
    const hintId = id.concat("-").concat(h.value.toString())
    const hint = new Hint(hintId)
    hint.level = id
    hint.x = h.coord.x
    hint.y = h.coord.y
    hint.value = h.value
    hint.save()
  }

  return level
}

function ensureLevelFromContract(levelId: BigInt, contract: YiBiGame, txHash: Bytes): Level | null {
  const id = levelId.toString()
  const existing = Level.load(id)
  if (existing != null) {
    return existing
  }

  const levelResult = contract.try_getLevel(levelId)
  if (levelResult.reverted) {
    return null
  }

  return createLevelFromOnchain(id, levelResult.value, txHash)
}

export function handleLevelCreated(event: LevelCreatedEvent): void {
  const id = event.params.levelId.toString()

  if (Level.load(id) != null) {
    return
  }

  const contract = YiBiGame.bind(event.address)
  const onchainLevel = contract.try_getLevel(event.params.levelId)
  if (onchainLevel.reverted) {
    const level = new Level(id)
    level.levelId = event.params.levelId
    level.creator = event.params.creator
    level.name = event.params.name
    level.size = event.params.size
    level.createdAt = event.block.timestamp
    level.hintCount = event.params.hintsCount.toI32()
    level.completionCount = BigInt.zero()
    level.txHash = event.transaction.hash
    level.save()
    return
  }

  createLevelFromOnchain(id, onchainLevel.value, event.transaction.hash)
}

export function handleLevelSolved(event: LevelSolvedEvent): void {
  const levelEntityId = event.params.levelId.toString()

  const contract = YiBiGame.bind(event.address)
  let level = Level.load(levelEntityId)
  if (level == null) {
    level = ensureLevelFromContract(event.params.levelId, contract, event.transaction.hash)
  }
  if (level == null) {
    return
  }

  const recordId = event.transaction.hash.concatI32(event.logIndex.toI32())
  const record = new SolveRecord(recordId)
  record.level = levelEntityId
  record.levelId = event.params.levelId
  record.solver = event.params.solver
  record.timestamp = event.block.timestamp
  record.pathLength = event.params.pathLength
  record.isFirstCompletion = event.params.isFirstCompletion
  record.txHash = event.transaction.hash
  record.save()

  if (event.params.isFirstCompletion) {
    level.completionCount = level.completionCount.plus(BigInt.fromI32(1))
    level.save()
  }
}
