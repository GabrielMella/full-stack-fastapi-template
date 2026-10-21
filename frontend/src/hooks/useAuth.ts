import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"

import {
  type Body_login_login_access_token as AccessToken,
  LoginService,
  type UserPublic,
  type UserRegister,
  UsersService,
} from "@/client"
import { handleError } from "@/utils"
import useCustomToast from "./useCustomToast"

// Checks a non-HttpOnly presence cookie set by the server on login.
// The actual JWT lives in an HttpOnly cookie and is never readable from JS.
const isLoggedIn = () => {
  return document.cookie.split(";").some((c) => c.trim().startsWith("session="))
}

const useAuth = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showErrorToast } = useCustomToast()

  const { data: user } = useQuery<UserPublic | null, Error>({
    queryKey: ["currentUser"],
    queryFn: async () => (await UsersService.readUserMe()).data,
    enabled: isLoggedIn(),
  })

  const signUpMutation = useMutation({
    mutationFn: (data: UserRegister) =>
      UsersService.registerUser({ body: data }),
    onSuccess: () => {
      navigate({ to: "/login" })
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })

  const login = async (data: AccessToken) => {
    // The server sets an HttpOnly cookie; nothing is stored in the browser.
    await LoginService.loginAccessToken({ body: data })
  }

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: () => {
      navigate({ to: "/" })
    },
    onError: handleError.bind(showErrorToast),
  })

  const logout = async () => {
    // Ask the server to clear the HttpOnly cookie.  Use a plain fetch so
    // this works before the generated client is regenerated to include the
    // new /logout route.
    const apiBase = import.meta.env.VITE_API_URL ?? ""
    await fetch(`${apiBase}/api/v1/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {})
    queryClient.clear()
    navigate({ to: "/login" })
  }

  return {
    signUpMutation,
    loginMutation,
    logout,
    user,
  }
}

export { isLoggedIn }
export default useAuth
