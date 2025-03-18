export interface VestingParameters {
    unlocks_list: UnlockData[];
}

export interface UnlockData {
    /** Unlock unixutime */
    unlock_time: number;
    /**
     * The percentage rounded to the second decimal place multiplied by 100.
     * Example: 25.15% -> 2515
     * @minimum 0
     * @maximum 10000
     */
    fraction: number;
}

export interface UserClaimInfo {
    /** Jetton master contract in user-friendly form
     * @example "kQABcHP_oXkYNCx3HHKd4rxL371RRl-O6IwgwqYZ7IT6Ha-u"
     */
    jetton: string;
    /** Jetton amount available for claim now
     * @example "597968399"
     */
    available_jetton_amount: string;
    /** Total Jetton amount for airdrop
     * @example "597968399"
     */
    total_jetton_amount: string;
    /** Already claimed Jetton amount
     * @example "597968399"
     */
    claimed_jetton_amount: string;
    /** Optional vesting parameters if applicable */
    vesting_parameters?: VestingParameters;
}

export interface UserClaim extends UserClaimInfo {
    /** Message to be sent to claim tokens */
    claim_message: InternalMessage;
}

export interface InternalMessage {
    /**
     * Message sending mode
     * @format int32
     * @example 3
     */
    mode: number;
    /**
     * Destination address in user-friendly form with bounce flag
     * @example "kQABcHP_oXkYNCx3HHKd4rxL371RRl-O6IwgwqYZ7IT6Ha-u"
     */
    address: string;
    /** Message state init (base64 format) */
    state_init?: string;
    /** Message payload (base64 format) */
    payload: string;
    /**
     * TON attached amount
     * @example "597968399"
     */
    amount: string;
}

/**
 * Creates a transaction object from a UserClaim
 * @param userClaim - The claim data containing message details
 * @returns A transaction object with a 5-minute validity period
 */
export const getTxFromUserClaim = (message: InternalMessage) => ({
    validUntil: Math.floor(Date.now() / 1000) + 5 * 60, // 5 minutes
    messages: [
        {
            address: message.address,
            amount: message.amount,
            payload: message.payload,
            stateInit: message.state_init,
        },
    ],
});

// Response interfaces
export interface AirdropClaimSuccess {
    success: true;
    info: UserClaimInfo;
    claim: InternalMessage;
}

export interface AirdropClaimError {
    success: false;
    info?: UserClaimInfo;
    errorCode: number;
}

export type AirdropClaimResponse = AirdropClaimSuccess | AirdropClaimError;
