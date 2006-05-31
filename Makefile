NAME=$(shell basename $(shell pwd))
VERSION=$(shell darcs changes | grep '^  tagged ' | sed 's/  tagged //' | head -1)
BUILD=$(shell date +%Y%m%d%H)
FILE=$(NAME)-$(VERSION).$(BUILD).xpi
EXTID=$(NAME)@hyperstruct.net

dist: xpi
	mv $(FILE) web/download
	cd web/download && ln -sf $(FILE) $(NAME).xpi

xpi: $(FILE)

install.rdf:
	sed -e 's|<em:version></em:version>|<em:version>$(VERSION).$(BUILD)</em:version>|' \
		-e 's|<em:id></em:id>|<em:id>$(EXTID)</em:id>|' \
		install.rdf.template >install.rdf

$(FILE): install.rdf
	rm -rf dist
	mkdir dist dist/chrome
	cd chrome && zip -y -r ../dist/chrome/$(NAME).jar .
	sed -e 's|chrome/|jar:chrome/$(NAME).jar!/|g' chrome.manifest >dist/chrome.manifest
	sed -e 's|<em:version></em:version>|<em:version>$(VERSION).$(BUILD)</em:version>|' \
		install.rdf.template >dist/install.rdf
	cp -a defaults install.rdf dist
	cd dist && zip -r ../$(FILE) *
	rm -rf dist

clean:
	rm -rf dist *.xpi 

.PHONY: dist clean upload install.rdf