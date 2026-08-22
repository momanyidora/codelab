import { createFlagHistory, findFlagHistory } from "../repositories/flag-history.repostory.js";


export async function recordFlagHistory(
    flagId: number,
    actor: string,
    action: string,
    before: unknown,
    after: unknown,
    environment?: string
){
    return createFlagHistory(
        flagId,
        actor,
        action,
        before,
        after,
        environment
    )
}

export async function getFlagHistory(flagKey: string) {
    return findFlagHistory(flagKey)
    
}