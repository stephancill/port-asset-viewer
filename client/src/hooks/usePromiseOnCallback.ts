import { useEffect, useState } from "react"

// https://lukstei.com/2019-10-27-doing-asynchronous-calls-using-react-hooks/
export default function usePromiseOnCallBack<T>(f: () => Promise<T>): [T | undefined, any, boolean, () => void] {
  const [result, setResult] = useState<T>()
  const [error, setError] = useState()
  const [isLoading, setIsLoading] = useState(false)
  const [counter, setCounter] = useState(0)

  useEffect(() => {
    let subscribed = true

    if (counter > 0) {
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
    }

    return function cleanup() {
      subscribed = false
    }
  }, [counter])

  function triggerEffect() {
    setCounter(counter => counter + 1)
  }

  return [result, error, isLoading, triggerEffect]
}