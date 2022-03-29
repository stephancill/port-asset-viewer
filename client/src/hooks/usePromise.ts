import { useEffect, useState } from "react"

// https://lukstei.com/2019-10-27-doing-asynchronous-calls-using-react-hooks/
export default function usePromise<T>(f: () => Promise<T>, deps: any[]): [T | undefined, any, boolean] {
  const [result, setResult] = useState<T | undefined>()
  const [error, setError] = useState()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let subscribed = true
    setIsLoading(true)

    f().then(
      r => {
        if (subscribed) {
          setIsLoading(false)
          setResult(r)
        }
      },
      e => {
        if (subscribed) {
          setIsLoading(false)
          setError(e)
        }
      }
    )

    return function cleanup() {
      subscribed = false
    }
  }, deps || [])

  return [result, error, isLoading]
}