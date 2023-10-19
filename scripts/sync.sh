#!/bin/bash

rootfolder=`dirname $0`/..

rsync -avr $rootfolder/src dev@eocis.org:/home/dev/services/data-client
rsync -avr $rootfolder/static dev@eocis.org:/home/dev/services/data-client
rsync -avr $rootfolder/templates dev@eocis.org:/home/dev/services/data-client
rsync -av $rootfolder/setup.cfg dev@eocis.org:/home/dev/services/data-client
rsync -av $rootfolder/pyproject.toml dev@eocis.org:/home/dev/services/data-client

