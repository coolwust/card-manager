.PHONY : test

test :
	@./node_modules/migrate/bin/migrate up 1>/dev/null && \
	./node_modules/mocha/bin/mocha --harmony --recursive --timeout=15000 \
	    test/orders.js && \
	./node_modules/migrate/bin/migrate down 1>/dev/null

db-up :
	@rethinkdb --config-file config/db_start.conf

server-up :
	@node --harmony server.js

	    
# test/connect.js \
# test/session.js \
# test/lcards.js && \
