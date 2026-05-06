import { AlertTriangle, Users } from 'lucide-react'

export function ChangeAssignmentModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Change Assignment</h3>
            <p className="text-sm text-gray-500">Re-assign vehicle or driver</p>
          </div>
        </div>
        
        <div className="py-6 flex items-center justify-center text-gray-400 border-2 border-dashed rounded-xl mt-4 h-32">
          <p>Assignment change form will go here</p>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
            Confirm Change
          </button>
        </div>
      </div>
    </div>
  )
}
