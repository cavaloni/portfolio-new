"use client";

import { useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useLoginModal } from "@/contexts/login-modal-context";
import { LoginPanel } from "./login-panel";

export function LoginModal() {
  const { isOpen, close } = useLoginModal();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? close() : null)}>
      <DialogContent>
        <LoginPanel onSuccess={close} />
      </DialogContent>
    </Dialog>
  );
}
