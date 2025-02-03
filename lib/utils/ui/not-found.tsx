import { memo } from 'react'

const NotFound = memo(() => {
    return (
        <div
            className="flex flex-col items-center justify-center min-h-screen p-4 touch-manipulation"
            role="alert"
            aria-labelledby="not-found-title"
        >
            <h1 id="not-found-title" className="text-5xl sm:text-6xl font-bold mb-4">
                404
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground text-center px-4">
                Page not found
            </p>
        </div>
    )
})

NotFound.displayName = 'NotFound'
export default NotFound
