import React from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function ConfirmDialog({
  open,
  title = "Confirm",
  message,
  body,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  confirmVariant = "primary", // primary | danger
  loading = false,
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onCancel}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="text-base sm:text-lg font-bold text-gray-900">{title}</h3>
              {message ? (
                <p className="mt-1 text-sm text-gray-600">{message}</p>
              ) : null}
              {body ? <div className="mt-3">{body}</div> : null}
            </div>

            <div className="px-5 py-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold transition disabled:opacity-50"
                onClick={onCancel}
                disabled={loading}
              >
                {cancelText}
              </button>

              <button
                type="button"
                className={
                  confirmVariant === "danger"
                    ? "px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition disabled:opacity-50"
                    : "px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold transition disabled:opacity-50"
                }
                onClick={onConfirm}
                disabled={loading}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
