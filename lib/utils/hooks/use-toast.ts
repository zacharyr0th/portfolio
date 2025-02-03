'use client'

import * as React from 'react'
import type { ToastActionElement, ToastProps } from '@/app/components/ui/toast'

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 5000

type ToasterToast = ToastProps & {
    id: string
    title?: React.ReactNode
    description?: React.ReactNode
    action?: ToastActionElement
    createdAt: number
}

const actionTypes = {
    ADD_TOAST: 'ADD_TOAST',
    UPDATE_TOAST: 'UPDATE_TOAST',
    DISMISS_TOAST: 'DISMISS_TOAST',
    REMOVE_TOAST: 'REMOVE_TOAST',
} as const

type ActionType = typeof actionTypes
type Action =
    | { type: ActionType['ADD_TOAST']; toast: ToasterToast }
    | { type: ActionType['UPDATE_TOAST']; toast: Partial<ToasterToast> }
    | { type: ActionType['DISMISS_TOAST']; toastId?: ToasterToast['id'] }
    | { type: ActionType['REMOVE_TOAST']; toastId?: ToasterToast['id'] }

interface State {
    toasts: ToasterToast[]
}

// Use WeakMap to allow garbage collection of timeouts
const toastTimeouts = new WeakMap<ToasterToast, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toast: ToasterToast, dispatch: React.Dispatch<Action>) => {
    if (toastTimeouts.has(toast)) {
        return
    }

    const timeout = setTimeout(() => {
        toastTimeouts.delete(toast)
        dispatch({
            type: 'REMOVE_TOAST',
            toastId: toast.id,
        })
    }, TOAST_REMOVE_DELAY)

    toastTimeouts.set(toast, timeout)
}

const reducer = (state: State, action: Action): State => {
    switch (action.type) {
        case 'ADD_TOAST':
            return {
                ...state,
                toasts: [{ ...action.toast, createdAt: Date.now() }, ...state.toasts].slice(
                    0,
                    TOAST_LIMIT
                ),
            }

        case 'UPDATE_TOAST':
            return {
                ...state,
                toasts: state.toasts.map(t =>
                    t.id === action.toast.id ? { ...t, ...action.toast, createdAt: t.createdAt } : t
                ),
            }

        case 'DISMISS_TOAST': {
            return {
                ...state,
                toasts: state.toasts.map(t =>
                    t.id === action.toastId || action.toastId === undefined
                        ? { ...t, open: false }
                        : t
                ),
            }
        }

        case 'REMOVE_TOAST':
            if (action.toastId === undefined) {
                return { ...state, toasts: [] }
            }
            return {
                ...state,
                toasts: state.toasts.filter(t => t.id !== action.toastId),
            }

        default:
            return state
    }
}

const genId = (() => {
    let count = 0
    return () => (count = (count + 1) % Number.MAX_SAFE_INTEGER).toString()
})()

type Toast = Omit<ToasterToast, 'id'>

// Create a stable reference for listeners
const listeners = new Set<(state: State) => void>()
const memoryState: State = { toasts: [] }

function useToast() {
    const [state, dispatch] = React.useReducer(reducer, memoryState)

    const setState = React.useCallback((state: State) => {
        Object.assign(memoryState, state)
        listeners.forEach(listener => listener(state))
    }, [])

    const toast = React.useCallback(
        ({ ...props }: Toast) => {
            const id = genId()

            const update = (props: ToasterToast) =>
                dispatch({
                    type: 'UPDATE_TOAST',
                    toast: { ...props, id },
                })

            const dismiss = () => dispatch({ type: 'DISMISS_TOAST', toastId: id })

            dispatch({
                type: 'ADD_TOAST',
                toast: {
                    ...props,
                    id,
                    open: true,
                    onOpenChange: open => {
                        if (!open) dismiss()
                    },
                },
            })

            return {
                id,
                dismiss,
                update,
            }
        },
        [dispatch]
    )

    const cleanupToasts = React.useCallback(() => {
        const now = Date.now()
        state.toasts.forEach(toast => {
            if (now - toast.createdAt > TOAST_REMOVE_DELAY && toast.open) {
                dispatch({ type: 'DISMISS_TOAST', toastId: toast.id })
            }
        })
    }, [state.toasts, dispatch])

    React.useEffect(() => {
        listeners.add(setState)
        const cleanupInterval = setInterval(cleanupToasts, 1000)

        return () => {
            listeners.delete(setState)
            clearInterval(cleanupInterval)

            // Cleanup timeouts
            state.toasts.forEach(toast => {
                const timeout = toastTimeouts.get(toast)
                if (timeout) {
                    clearTimeout(timeout)
                    toastTimeouts.delete(toast)
                }
            })
        }
    }, [state.toasts, cleanupToasts, setState])

    const dismiss = React.useCallback(
        (toastId?: string) => dispatch({ type: 'DISMISS_TOAST', toastId }),
        [dispatch]
    )

    return {
        ...state,
        toast,
        dismiss,
    }
}

export { useToast }
