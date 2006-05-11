;;; inf-moz.el --- Interaction with an inferior remote Mozilla process.

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

;; This file is NOT part of GNU Emacs.

;;; Commentary

;; The following is almost completely ripped from cc-mode.el.  Only
;; some variation at the end to fix indentation.

;;; Code:

(require 'cc-mode)
(require 'cc-langs)
(require 'cc-bytecomp)

(defvar js-mode-syntax-table nil
  "Syntax table used in js-mode buffers.")
(or js-mode-syntax-table
    (setq js-mode-syntax-table
          (funcall (c-lang-const c-make-mode-syntax-table java))))

(defvar js-mode-abbrev-table nil
  "Abbreviation table used in js-mode buffers.")
(c-define-abbrev-table 'js-mode-abbrev-table
  '(("else" "else" c-electric-continued-statement 0)
    ("while" "while" c-electric-continued-statement 0)
    ("catch" "catch" c-electric-continued-statement 0)
    ("finally" "finally" c-electric-continued-statement 0)))

(defvar js-mode-map nil
  "Keymap used in js-mode buffers.")
(if js-mode-map
    nil
  (setq js-mode-map (c-make-inherited-keymap))
  ;; add bindings which are only usefus for Javascript
  )

(defun js-mode ()
  "Major mode for editing Javascript code.

To submit a problem report, enter `\\[c-submit-bug-report]' from a
java-mode buffer.  This automatically sets up a mail buffer with
version information already added.  You just need to add a description
of the problem, including a reproducible test case, and send the
message.

To see what version of CC Mode you are running, enter `\\[c-version]'.

The hook `c-mode-common-hook' is run with no args at mode
initialization, then `js-mode-hook'.

Key bindings:
\\{js-mode-map}"
  (interactive)
  (kill-all-local-variables)
  (c-initialize-cc-mode t)
  (set-syntax-table js-mode-syntax-table)
  (setq major-mode 'js-mode
        mode-name "Javascript"
        local-abbrev-table js-mode-abbrev-table
        abbrev-mode t)
  (use-local-map js-mode-map)
  (c-init-language-vars-for 'java-mode)
  (c-common-init 'java-mode)
  (easy-menu-add c-java-menu)
  (cc-imenu-init cc-imenu-java-generic-expression)
  (c-run-mode-hooks 'c-mode-common-hook 'js-mode-hook)
  (c-update-modeline)

  (c-set-offset 'label 0)

  ;; Taken from Xemacs's javascript-mode.el
;  (set (make-local-variable 'c-opt-lambda-key) "function")
;  (c-set-offset 'inlambda 0)

  ;; XXX Study indentation engine and Do Things Right Here Please (tm)
  (setq c-special-indent-hook
        (lambda ()
          (if (and (assq 'arglist-cont-nonempty c-syntactic-context)
                   (assq 'statement-block-intro c-syntactic-context)
                   (assq 'statement-cont c-syntactic-context))
              (c-shift-line-indentation -8))))
  )


(cc-provide 'js-mode)

;;; js-mode ends here