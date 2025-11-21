import { createContext, useContext } from 'react'

type UserContextValue = {
  displayName: string
  email: string
  profileId: string
}

const UserContext = createContext<UserContextValue>({
  displayName: '',
  email: '',
  profileId: '',
})

export const UserProvider = UserContext.Provider

export function useUserInfo() {
  return useContext(UserContext)
}
