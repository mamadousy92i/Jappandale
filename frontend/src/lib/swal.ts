import Swal from "sweetalert2"

const confirmClasses = {
  popup: "jpd-swal-popup",
  title: "jpd-swal-title",
  htmlContainer: "jpd-swal-text",
  confirmButton: "jpd-swal-confirm",
  cancelButton: "jpd-swal-cancel",
  actions: "jpd-swal-actions",
  icon: "jpd-swal-icon",
}

const toastMixin = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 4200,
  timerProgressBar: true,
  buttonsStyling: false,
  didOpen: (toastEl) => {
    toastEl.addEventListener("mouseenter", Swal.stopTimer)
    toastEl.addEventListener("mouseleave", Swal.resumeTimer)
  },
})

/**
 * Boîte de confirmation modale, thème Jappandale. Remplace l'ancien ConfirmDialog maison.
 * `run` s'exécute après confirmation ; la boîte reste ouverte (bouton en chargement)
 * jusqu'à ce qu'elle se termine, puis se referme.
 */
export async function confirmAction({
  title,
  description,
  confirmLabel,
  danger = false,
  run,
}: {
  title: string
  description: string
  confirmLabel: string
  danger?: boolean
  run: () => Promise<void>
}): Promise<void> {
  await Swal.fire({
    title,
    html: description,
    icon: danger ? "warning" : "question",
    showCancelButton: true,
    confirmButtonText: confirmLabel,
    cancelButtonText: "Annuler",
    focusCancel: true,
    reverseButtons: true,
    buttonsStyling: false,
    showLoaderOnConfirm: true,
    allowOutsideClick: () => !Swal.isLoading(),
    preConfirm: async () => {
      await run()
    },
    customClass: {
      ...confirmClasses,
      confirmButton: danger ? "jpd-swal-confirm jpd-swal-confirm--danger" : "jpd-swal-confirm",
    },
  })
}

/** Notification de succès, en toast discret (haut droite, se referme seule). */
export function notifySuccess(message: string) {
  void toastMixin.fire({
    icon: "success",
    title: message,
    customClass: { popup: "jpd-swal-toast jpd-swal-toast--success" },
  })
}

/** Notification d'erreur, en toast discret (haut droite, se referme seule). */
export function notifyError(message: string) {
  void toastMixin.fire({
    icon: "error",
    title: message,
    customClass: { popup: "jpd-swal-toast jpd-swal-toast--error" },
  })
}
