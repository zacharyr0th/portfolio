import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: 'sm' | 'md' | 'lg'
    variant?: 'default' | 'overlay'
    text?: string
}

const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
}

export function Loading({
    size = 'md',
    variant = 'default',
    text,
    className,
    ...props
}: LoadingProps) {
    const content = (
        <>
            <Loader2 className={cn('animate-spin', sizeClasses[size])} />
            {text && <span className="ml-2 text-sm text-muted-foreground">{text}</span>}
        </>
    )

    if (variant === 'overlay') {
        return (
            <div
                className={cn(
                    'fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm',
                    className
                )}
                {...props}
            >
                <div className="flex items-center">{content}</div>
            </div>
        )
    }

    return (
        <div className={cn('flex items-center justify-center p-4', className)} {...props}>
            {content}
        </div>
    )
}

export function LoadingOverlay(props: Omit<LoadingProps, 'variant'>) {
    return <Loading variant="overlay" {...props} />
}
