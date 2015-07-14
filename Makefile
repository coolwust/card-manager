.PHONY : test

test :
	@echo '' && \
	./node_modules/migrate/bin/migrate up && \
	./node_modules/mocha/bin/mocha --harmony --recursive --timeout=15000 \
        test/lcards.js \
	    test/orders.js && \
	./node_modules/migrate/bin/migrate down && \
	echo ''

db-up :
	@rethinkdb --config-file config/db_start.conf

server-up :
	@node --harmony server.js

	    
# test/connect.js \
# test/session.js \
# test/lcards.js && \
