import { useCallback, useRef, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";

export function useConfirmDialog() {
  const [state, setState] = useState({
    open: false,
    title: "Confirm",
    message: "",
    body: null,
    confirmText: "Confirm",
    cancelText: "Cancel",
    confirmVariant: "primary",
    loading: false,
  });

  const resolverRef = useRef(null);

  const confirm = useCallback((options = {}) => {
    const {
      title = "Confirm",
      message = "",
      body = null,
      confirmText = "Confirm",
      cancelText = "Cancel",
      confirmVariant = "primary",
    } = options;

    setState({
      open: true,
      title,
      message,
      body,
      confirmText,
      cancelText,
      confirmVariant,
      loading: false,
    });

    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const close = useCallback((result) => {
    setState((s) => ({ ...s, open: false, loading: false }));
    const resolve = resolverRef.current;
    resolverRef.current = null;
    resolve?.(result);
  }, []);

  const ConfirmDialogElement = (
    <ConfirmDialog
      open={state.open}
      title={state.title}
      message={state.message}
      body={state.body}
      confirmText={state.confirmText}
      cancelText={state.cancelText}
      confirmVariant={state.confirmVariant}
      loading={state.loading}
      onCancel={() => close(false)}
      onConfirm={() => close(true)}
    />
  );

  return { confirm, ConfirmDialogElement };
}
