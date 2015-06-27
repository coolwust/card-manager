.PHONY : test

test :
	@./node_modules/migrate/bin/migrate up 1>/dev/null && \
	./node_modules/mocha/bin/mocha --harmony --recursive \
	    test/connect.js test/session.js && \
	./node_modules/migrate/bin/migrate down 1>/dev/null

db-up :
	@rethinkdb --config-file config/db_start.conf

server-up :
	@node --harmony server.js
