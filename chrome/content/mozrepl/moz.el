;;; moz.el --- Lets current buffer interact with inferior mozilla.

;; Copyright (C) 2006 by Massimiliano Mirra
;;
;; This program is free software; you can redistribute it and/or modify
;; it under the terms of the GNU General Public License as published by
;; the Free Software Foundation; either version 2 of the License, or
;; (at your option) any later version.
;;
;; This program is distributed in the hope that it will be useful,
;; but WITHOUT ANY WARRANTY; without even the implied warranty of
;; MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
;; GNU General Public License for more details.
;;
;; You should have received a copy of the GNU General Public License
;; along with this program; if not, write to the Free Software
;; Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301 USA
;;
;; Author: Massimiliano Mirra, <bard [at] hyperstruct [dot] net>

;;; Code:

(require 'comint)

(define-minor-mode moz-minor-mode
  "Toggle Mozilla mode.
With no argument, this command toggles the mode.
Non-null prefix argument turns on the mode.
Null prefix argument turns off the mode.

When Mozilla mode is enabled, some commands become available to
send current code area (as understood by c-mark-function) or
region or buffer to an inferior mozilla process (which will be
started as needed)."
  nil
  " Moz"
  '(("\C-c\C-c" . moz-send-defun)
    ("\C-c\C-r" . moz-send-region)
    ("\C-c\C-l" . moz-save-buffer-and-send)))

(defalias 'run-mozilla 'inferior-moz-switch-to-mozilla)

(defun moz-send (string)
  "Send a string for evaluation to the inferior Mozilla process."
  (comint-send-string (inferior-moz-process) string)
  (comint-send-string moz-input-terminator)
  (display-buffer (process-buffer (inferior-moz-process))))

(defvar moz-temporary-file nil)

(defvar moz-input-terminator "\n--end-remote-input\n")

(defun moz-temporary-file ()
  (if (and moz-temporary-file
           (file-readable-p moz-temporary-file))
      moz-temporary-file
    (setq moz-temporary-file (make-temp-file "emacs-mozrepl"))))

(defun moz-send-region (start end)
  (interactive "r")
  (let ((file (moz-temporary-file)))
    (write-region start end file)
    (comint-send-string (inferior-moz-process)
                        (concat "repl.load('file://localhost/"
                                file
                                "')" 
                                moz-input-terminator)))
  (display-buffer (process-buffer (inferior-moz-process))))

(defun moz-send-defun ()
  (interactive)
  (save-excursion
    (c-mark-function)
    (moz-send-region (point) (mark))))

(defun moz-save-buffer-and-send ()
  (interactive)
  (save-buffer)
  (comint-send-string (inferior-moz-process)
                      (concat  "repl.load('file://localhost/"
                               (buffer-file-name)
                               "')"
                               moz-input-terminator))
  (display-buffer (process-buffer (inferior-moz-process))))

;;; Inferior Mode

(defvar inferior-moz-buffer nil
  "The buffer in which the inferior process is running.")

(define-derived-mode inferior-moz-mode comint-mode "Inf-Mozilla"
  "Major mode for interacting with a Mozilla browser."
  :syntax-table js-mode-syntax-table)

(defun inferior-moz-switch-to-mozilla ()
  "Show the inferior mozilla buffer.  Start the process if
needed."
  (interactive)
  (pop-to-buffer (process-buffer (inferior-moz-process))))

(defun inferior-moz-process ()
  "Return inferior mozilla process.  Start it if necessary."
  (or (if (buffer-live-p inferior-moz-buffer)
          (get-buffer-process inferior-moz-buffer))
      (progn
        (inferior-moz-start-process)
        (inferior-moz-process))))

(defun inferior-moz-start-process ()
  "Start an inferior mozilla process.
It runs the hook `inferior-moz-hook' after starting the process
and setting up the inferior-mozilla buffer."
  (interactive)
  (setq inferior-moz-buffer
        (apply 'make-comint "Moz" '("localhost" . 4242) nil nil))
  (with-current-buffer inferior-moz-buffer
    (inferior-moz-mode)
    (run-hooks 'inferior-moz-hook)))

(provide 'moz)

;;; moz.el ends here