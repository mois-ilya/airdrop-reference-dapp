import { UserClaimInfo, UnlockData } from '../App';
import { toDecimals } from './decimals';

export type VestingStatus = 'pending' | 'claimable' | 'claimed';

// Расширенный интерфейс для готовых к рендерингу данных
export interface VestingRenderItem {
    key: number;
    date: string;
    statusText: string;
    status: VestingStatus;
    percentage: string;
    amount: string;
    isLastItem: boolean;
}

interface VestingItemInfo {
    unlockDate: Date;
    isPast: boolean;
    unlockAmount: bigint;
    formattedAmount: string;
    status: VestingStatus;
}

/**
 * Calculates the amount of tokens that will be unlocked for a specific vesting period
 */
export const calculateUnlockAmount = (
    totalAmount: string,
    fraction: number
): bigint => {
    return (BigInt(totalAmount) * BigInt(fraction)) / BigInt(10000);
};

/**
 * Calculates the sum of all unlocks before a specific index
 */
export const calculatePreviousUnlocksAmount = (
    unlocksList: UnlockData[],
    totalAmount: string,
    index: number
): bigint => {
    return (
        unlocksList
            .slice(0, index)
            .reduce(
                (sum, prevUnlock) =>
                    sum + calculateUnlockAmount(totalAmount, prevUnlock.fraction),
                BigInt(0)
            ) || BigInt(0)
    );
};

/**
 * Determines the status of a vesting period
 */
export const determineVestingStatus = (
    isPast: boolean,
    previousUnlocksAmount: bigint,
    unlockAmount: bigint,
    claimedAmount: bigint
): VestingStatus => {
    if (!isPast) {
        return 'pending';
    }

    // If this unlock and all previous ones have been claimed
    if (previousUnlocksAmount + unlockAmount <= claimedAmount) {
        return 'claimed';
    } 
    // If some portion has been claimed
    else if (previousUnlocksAmount < claimedAmount) {
        return 'claimed';
    } 
    // Unlocked but not claimed
    else {
        return 'claimable';
    }
};

/**
 * Processes a user's vesting parameters and returns detailed information
 * for each vesting period
 */
export const processVestingSchedule = (
    userClaimInfo: UserClaimInfo,
    decimals: number = 9
): VestingItemInfo[] => {
    if (!userClaimInfo.vesting_parameters?.unlocks_list) {
        return [];
    }

    const claimedAmount = BigInt(userClaimInfo.claimed_jetton_amount);
    
    return userClaimInfo.vesting_parameters.unlocks_list.map((unlock, index) => {
        const unlockDate = new Date(unlock.unlock_time * 1000);
        const isPast = unlockDate < new Date();
        
        const unlockAmount = calculateUnlockAmount(
            userClaimInfo.total_jetton_amount,
            unlock.fraction
        );
        
        const previousUnlocksAmount = calculatePreviousUnlocksAmount(
            userClaimInfo.vesting_parameters?.unlocks_list || [],
            userClaimInfo.total_jetton_amount,
            index
        );
        
        const status = determineVestingStatus(
            isPast,
            previousUnlocksAmount,
            unlockAmount,
            claimedAmount
        );
        
        return {
            unlockDate,
            isPast,
            unlockAmount,
            formattedAmount: toDecimals(unlockAmount, decimals),
            status
        };
    });
};

/**
 * Расширенная функция для подготовки всех данных для рендеринга
 */
export const prepareVestingRenderData = (
    userClaimInfo: UserClaimInfo,
    decimals: number = 9,
    jettonSymbol?: string
): VestingRenderItem[] => {
    if (!userClaimInfo.vesting_parameters?.unlocks_list) {
        return [];
    }

    const unlocksList = userClaimInfo.vesting_parameters.unlocks_list;
    
    return processVestingSchedule(userClaimInfo, decimals).map((item, index) => {
        // Готовим данные для отображения
        const statusText = 
            item.status === 'pending' ? 'Pending' :
            item.status === 'claimable' ? 'Ready to claim' : 'Claimed';
        
        // Форматируем процент
        const percentage = `${(unlocksList[index].fraction / 100).toFixed(2)}%`;
        
        // Форматируем сумму с символом токена
        const amount = `${item.formattedAmount}${jettonSymbol ? ' ' + jettonSymbol : ''}`;
        
        // Форматируем дату с учетом локали пользователя
        const date = formatDate(item.unlockDate);
        
        // Определяем, является ли элемент последним
        const isLastItem = index === unlocksList.length - 1;
        
        return {
            key: index,
            date,
            statusText,
            status: item.status,
            percentage,
            amount,
            isLastItem
        };
    });
};

/**
 * Вычисляет дату следующего доступного клейма, если таковой имеется
 */
export const getNextClaimDate = (
    userClaimInfo: UserClaimInfo
): Date | null => {
    if (!userClaimInfo.vesting_parameters?.unlocks_list) {
        return null;
    }

    const now = new Date();
    const nextUnlock = userClaimInfo.vesting_parameters.unlocks_list
        .find(unlock => {
            const unlockDate = new Date(unlock.unlock_time * 1000);
            return unlockDate > now;
        });

    return nextUnlock ? new Date(nextUnlock.unlock_time * 1000) : null;
};

/**
 * Получает локаль пользователя из настроек браузера
 */
export const getUserLocale = (): string => {
  // Пытаемся получить локаль из navigator
  const browserLocale = 
    navigator.languages && navigator.languages.length 
      ? navigator.languages[0] 
      : navigator.language || 'en-US';
  
  return browserLocale;
};

/**
 * Форматирует дату и время с учетом локали пользователя
 */
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat(getUserLocale(), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  }).format(date);
};

/**
 * Форматирует дату и время с учетом локали пользователя
 */
export const formatDateWithTime = (date: Date): string => {
  return new Intl.DateTimeFormat(getUserLocale(), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}; 