export interface VestingParameters {
    // Will be defined later if needed
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
export const getTxFromUserClaim = (userClaim: UserClaim) => ({
    validUntil: Math.floor(Date.now() / 1000) + 300, // 5 minutes
    messages: [
        {
            address: userClaim.claim_message.address,
            amount: userClaim.claim_message.amount,
            payload: userClaim.claim_message.payload,
            stateInit: userClaim.claim_message.state_init,
        },
    ],
});

// Response interfaces
export interface AirdropClaimSuccess {
    success: true;
    info: UserClaimInfo;
    claim: UserClaim;
}

export interface AirdropClaimError {
    success: false;
    info?: UserClaimInfo;
    error: {
        code: string;
        message: string;
    };
}

export type AirdropClaimResponse = AirdropClaimSuccess | AirdropClaimError;

// Mapping of HTTP status codes to error identifiers
const statusCodeMapping: Record<number, string> = {
    404: 'not_found',
    425: 'too_early',
    409: 'already_claimed',
    423: 'locked',
    429: 'blockchain_overload'
};

/**
 * Processes API response and converts it to a structured AirdropClaimResponse
 * @param response - The HTTP response from the API
 * @param data - The parsed JSON data from the response
 * @returns A structured response object with success/error status and claim data
 */
const handleApiResponse = (
    response: Response,
    data: any
): AirdropClaimResponse => {
    // Successful response with claim data
    if (response.status === 200) {
        return {
            success: true,
            info: data,
            claim: data
        };
    }

    // All other responses contain UserClaimInfo but are considered errors
    const errorCode = statusCodeMapping[response.status] || 'unknown_error';
    let errorMessage = 'Unknown error occurred';

    switch (response.status) {
        case 425:
            errorMessage = 'The nearest vesting date has not arrived yet';
            break;
        case 409:
            errorMessage = 'All Jettons have already been claimed';
            break;
        case 423:
            errorMessage = 'Airdrop is locked by admin';
            break;
        case 429:
            errorMessage = 'Blockchain is currently overloaded';
            break;
        case 404:
            errorMessage = 'Airdrop not found or not processed yet';
            break;
    }

    return {
        success: false,
        info: data,
        error: {
            code: errorCode,
            message: errorMessage
        }
    };
};

/**
 * Fetches airdrop claim data for a specific address
 * Uses v2 API and handles an extended set of response statuses
 * 
 * @param airdropId - The unique identifier for the airdrop
 * @param connectedAddress - The wallet address to check for claims
 * @param testnet - Whether to use testnet or mainnet API (default: false)
 * @returns Promise resolving to a structured response with claim data or error
 */
export const fetchAirdropClaim = (
    airdropId: string,
    connectedAddress: string,
    testnet: boolean = false
): Promise<AirdropClaimResponse> => {
    const baseUrl = `${testnet ? 'testnet' : 'mainnet'}-airdrop.tonapi.io`;
    const url = `https://${baseUrl}/v2/airdrop/claim/${connectedAddress}?id=${airdropId}`;

    return fetch(url)
        .then((response) =>
            response.json().then((data) => ({ response, data }))
        )
        .then(({ response, data }) => {
            return handleApiResponse(response, data);
        })
        .catch(() => ({
            success: false,
            error: {
                code: 'network_error',
                message: 'Network error. Please try again later.',
            },
        }));
};
