'use client'

import * as React from 'react'
import { Dot } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InputOTPProps extends React.InputHTMLAttributes<HTMLInputElement> {
    maxLength?: number
    containerClassName?: string
}

const InputOTP = React.forwardRef<HTMLInputElement, InputOTPProps>(
    ({ className, containerClassName, maxLength = 6, ...props }, ref) => {
        const [value, setValue] = React.useState('')
        const inputRef = React.useRef<HTMLInputElement>(null)

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const newValue = e.target.value.replace(/[^0-9]/g, '').slice(0, maxLength)
            setValue(newValue)
            props.onChange?.(e)
        }

        return (
            <div
                className={cn(
                    'flex items-center gap-2 has-[:disabled]:opacity-50',
                    containerClassName
                )}
                onClick={() => inputRef.current?.focus()}
            >
                <input
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={maxLength}
                    className="sr-only"
                    value={value}
                    onChange={handleChange}
                    {...props}
                />
                <InputOTPGroup>
                    {Array.from({ length: maxLength }).map((_, i) => (
                        <InputOTPSlot key={i} char={value[i]} isActive={value.length === i} />
                    ))}
                </InputOTPGroup>
            </div>
        )
    }
)
InputOTP.displayName = 'InputOTP'

const InputOTPGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn('flex items-center gap-2', className)} {...props} />
    )
)
InputOTPGroup.displayName = 'InputOTPGroup'

interface InputOTPSlotProps extends React.HTMLAttributes<HTMLDivElement> {
    char?: string
    isActive?: boolean
}

const InputOTPSlot = React.forwardRef<HTMLDivElement, InputOTPSlotProps>(
    ({ className, char, isActive, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    'relative flex h-10 w-10 items-center justify-center border-y border-r border-input text-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md',
                    isActive && 'z-10 ring-2 ring-ring ring-offset-background',
                    className
                )}
                {...props}
            >
                {char}
                {isActive && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="h-4 w-px animate-caret-blink bg-foreground duration-1000" />
                    </div>
                )}
            </div>
        )
    }
)
InputOTPSlot.displayName = 'InputOTPSlot'

const InputOTPSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ ...props }, ref) => (
        <div ref={ref} role="separator" {...props}>
            <Dot />
        </div>
    )
)
InputOTPSeparator.displayName = 'InputOTPSeparator'

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator }
