import { Button } from '@auction/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@auction/components/ui/dialog'

/**
 * Exit confirmation used by create/wizard pages before navigating away —
 * same pattern as the vendor bidding-room exit confirm.
 */
export function ExitConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Leave this page?',
  description = 'Your unsaved changes will be lost.',
  confirmLabel = 'Leave',
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  description?: string
  confirmLabel?: string
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Stay</Button>
          <Button variant="destructive" onClick={onConfirm}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
