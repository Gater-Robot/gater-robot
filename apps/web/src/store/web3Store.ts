/**
 * Web3 Global State Store
 *
 * Zustand store for managing Web3 state across the app.
 * Tracks native currency price and target network.
 */

import { create } from 'zustand'
import { supportedChains, type ChainWithIcon } from '@/config/chains'

interface Web3State {
  /**
   * Native currency price in USD
   */
  nativeCurrency: {
    price: number
    isFetching: boolean
  }

  /**
   * Currently selected target network
   */
  targetNetwork: ChainWithIcon

  /**
   * Set native currency price
   */
  setNativeCurrencyPrice: (price: number) => void

  /**
   * Set fetching state for native currency
   */
  setIsNativeCurrencyFetching: (isFetching: boolean) => void

  /**
   * Set target network
   */
  setTargetNetwork: (network: ChainWithIcon) => void
}

/**
 * Web3 state store
 */
export const useWeb3Store = create<Web3State>((set) => ({
  nativeCurrency: {
    price: 0,
    isFetching: true,
  },

  targetNetwork: supportedChains[0],

  setNativeCurrencyPrice: (price) =>
    set((state) => ({
      nativeCurrency: { ...state.nativeCurrency, price },
    })),

  setIsNativeCurrencyFetching: (isFetching) =>
    set((state) => ({
      nativeCurrency: { ...state.nativeCurrency, isFetching },
    })),

  setTargetNetwork: (network) =>
    set({ targetNetwork: network }),
}))
