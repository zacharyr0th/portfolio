import * as React from 'react'

import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    id?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, id, name, ...props }, ref) => {
        const uniqueId = React.useId()
        // Generate a unique id if none is provided, using name as a fallback
        const inputId = id || name || `input-${uniqueId}`
        
        return (
            <input
                type={type}
                id={inputId}
                name={name || inputId}
                className={cn(
                    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Input.displayName = 'Input'

export { Input }
