IDLC=/usr/lib/firefox/xpidl
INC=/usr/share/idl/mozilla/
XPTS=MozRepl.xpt

all: $(XPTS)

%.xpt: %.idl
	$(IDLC) -m typelib -w -v -I $(INC) -e $(@) $(<)

.PHONY: all