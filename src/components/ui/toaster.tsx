import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  const getIcon = (variant?: string) => {
    switch (variant) {
      case "destructive":
        return <AlertCircle className="h-6 w-6 flex-shrink-0 animate-pulse" strokeWidth={2.5} />
      case "success":
        return <CheckCircle2 className="h-6 w-6 flex-shrink-0" strokeWidth={2.5} />
      case "warning":
        return <AlertTriangle className="h-6 w-6 flex-shrink-0 animate-pulse" strokeWidth={2.5} />
      default:
        return <Info className="h-6 w-6 flex-shrink-0" strokeWidth={2.5} />
    }
  }

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        return (
          <Toast key={id} variant={variant as any} {...props}>
            <div className="flex items-start gap-3 flex-1">
              <div className="mt-0.5">
                {getIcon(variant as string)}
              </div>
              <div className="grid gap-1.5 flex-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}

